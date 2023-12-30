import { ParsedCommands } from "./commands";
const { exec } = require("child_process");
const util = require("util");
const fs = require("fs");
const writeFile = util.promisify(fs.writeFile);
const appendFile = util.promisify(fs.appendFile);
const execProm = util.promisify(exec);
const os = require("os");

export interface ConfigType {
  asciinema: {
    speed: number;
    cols: number;
    rows: number;
    typingPause: number;
    promptPause: number;
  };
  withDocker: boolean;
  debug: boolean;
  basePath?: string;
}

const hostRecordingPath = "/tmp/autobashcraft/recordings";
const workspacePath = "/tmp/autobashcraft/workspace";

// default config
const defaultConfig: ConfigType = {
  asciinema: {
    speed: 2,
    cols: 100,
    rows: 20,
    typingPause: 0.001,
    promptPause: 1,
  },
  withDocker: false,
  debug: false,
  basePath: workspacePath,
};
let config: ConfigType = { ...defaultConfig };

// invoke userInfo() method
const userInfo = os.userInfo();

// get gid property
// from the userInfo object
let gid = userInfo.gid;
const uid = userInfo.uid;

const log = (_obj: any, _obj_2?: any) => {
  if (config.debug) {
    if (_obj_2) {
      console.log(_obj, _obj_2);
    } else {
      console.log(_obj);
    }
  }
};

const cleanupRecordings = async (containerId: string) => {
  await execProm(
    `docker exec -u root ${containerId} bash -c 'rm -rf ${hostRecordingPath}/*'`
  );
};

const stopContainer = async (id: string) => {
  // Check if the container exists
  const checkContainer = await execProm(`docker ps -a -q -f id=^/${id}$`);

  if (checkContainer.stdout.trim()) {
    // If the container exists, stop and remove it
    log(await execProm(`docker stop ${id} && docker rm ${id}`));
  } else {
    log(`Container ${id} does not exist.`);
  }
};
const stopTmpContainer = async () => {
  const containerName = "abc-tmp-container";

  // Check if the container exists
  const checkContainer = await execProm(
    `docker ps -a -q -f name=^/${containerName}$`
  );

  if (checkContainer.stdout.trim()) {
    // If the container exists, stop and remove it
    log(
      await execProm(
        `docker stop ${checkContainer.stdout.trim()} || true && docker rm ${checkContainer.stdout.trim()} || true`
      )
    );
  } else {
    log(`Container ${containerName} does not exist.`);
  }
};
const initializeRuntime = async (options: { baseImage?: string }) => {
  let baseImage = "cioddi/autobashcraft:latest";
  if (options?.baseImage) {
    baseImage = options.baseImage;
  }
  let containerId;
  let dockerSockVolume = "";
  if (config.withDocker) {
    dockerSockVolume = "-v /var/run/docker.sock:/var/run/docker.sock:z";
    gid = "$(getent group docker | cut -d: -f3)";
  }
  // restore container state
  await stopTmpContainer();

  log(
    await execProm(
      `docker run --user ${uid}:${gid} --rm -dit --name abc-tmp-container -v ${workspacePath}:/tmp_workspace:rw ${baseImage}`
    )
  );

  log(
    await execProm(
      `docker exec --user ${uid}:${gid} abc-tmp-container bash -c 'rm -rf /tmp_workspace/* && cp -r ${workspacePath}/. /tmp_workspace && ls -al /tmp_workspace'`
    )
  );

  log(await execProm(`ls -al ${workspacePath}`));
  await stopTmpContainer();

  // start the runtime container
  const containerStartCmd = `docker run ${dockerSockVolume} --group-add docker --group-add sudo --network host -dit --rm --user ${uid}:${gid} -v ${hostRecordingPath}:${hostRecordingPath} -v ${workspacePath}:${workspacePath} ${baseImage}`;
  const startResult = await execProm(containerStartCmd);
  containerId = startResult.stdout.trim();
  log(
    await execProm(
      `docker exec -u root ${containerId} bash -c 'ls -al ${workspacePath}'`
    )
  );

  await execProm(
    `docker exec -u root ${containerId} bash -c 'chown  ${uid}:${gid} /tmp/autobashcraft -R'`
  );
  //log(cleanupWorkspace);

  return containerId;
};

async function getRunningContainers(): Promise<string[]> {
  const { stdout } = await execProm("docker ps -q");
  return stdout
    .trim()
    .split("\n")
    .filter((line: string) => line.length > 0);
}

const backgroundProcesses: string[] = [];

async function stopBackgroundProcesses({
  containerId,
}: {
  containerId: string;
}) {
  for (const pid of backgroundProcesses) {
    console.log(`Stopping background process: ${pid}`);
    await execProm(
      `docker exec --user ${uid}:${gid} ${containerId} bash -c 'kill ${pid}'`
    );
  }
}

async function stopNewContainers(
  initialContainers: string[]
): Promise<string[]> {
  const finalContainers = await getRunningContainers();

  const newContainers = finalContainers.filter(
    (container) => !initialContainers.includes(container)
  );

  for (const container of newContainers) {
    console.log(`Stopping new container: ${container}`);
    await stopContainer(container);
  }
  return newContainers;
}

const copyRecordings = async ({ assetPath }: { assetPath: string }) => {
  await execProm(`mkdir -p ${assetPath}`);
  await execProm(`if [ "$(ls -A ${hostRecordingPath})" ]; then
     cp -r ${hostRecordingPath}/* ${assetPath}
  fi`);
};

const getBasePath = () => {
  if (config.basePath !== workspacePath) {
    return workspacePath + "/" + config.basePath;
  }
  return workspacePath;
};

// Function to execute parsedCommands inside a new Docker container
export async function executeCommands({
  parsedCommands,
  filename,
  assetPath,
  withDocker,
}: {
  parsedCommands: ParsedCommands;
  filename: string;
  assetPath: string;
  withDocker: boolean;
}) {
  config.withDocker = withDocker;
  let containerId = await initializeRuntime({});
  await cleanupRecordings(containerId);
  try {
    // get a list of running containers
    const initialContainers = await getRunningContainers();

    let castFilename = "";
    let commandIndex = 0;
    for (const command of parsedCommands.commands) {
      console.log("");
      console.log("====================================");
      console.log(commandIndex + ": " + command.type);
      console.log("====================================");
      switch (command.type) {
        case "exec":
          // create bash script with the codeblock contents in the container
          let commands = `#!/bin/bash\n\n:cd ${getBasePath()}\n\n`;
          commands += `${command.content}`;
          const execCommandCmd = `docker exec --user ${uid}:${gid} ${containerId} bash -c 'echo "${commands}" > ${workspacePath}/script && chmod +x ${workspacePath}/script && cat ${workspacePath}/script'`;
          log(await execProm(execCommandCmd));
          console.log(
            "script /app/script created with contents:",
            "\n" + commands
          );

          // execute the script using a custom version of asciinema-rec_script
          castFilename = filename + "_" + commandIndex;
          const execResults = await execProm(
            `docker exec -t --user ${uid}:${gid} --privileged ${containerId} bash -c 'stty rows ${config.asciinema.rows} cols ${config.asciinema.cols} && TYPING_PAUSE=${config.asciinema.typingPause} && PROMPT_PAUSE=${config.asciinema.promptPause} && asciinema-rec_script ${workspacePath}/script && ls -al ${workspacePath} && cp ${workspacePath}/script.cast ${hostRecordingPath}/${castFilename}.cast && rm ${workspacePath}/script.cast'`
          );
          log(execResults.stdout);
          log(execResults.stderr);
          // create a gif of the recorded asciinema cast (better switch to agg)
          log(
            await execProm(
              `docker run --user ${uid}:${gid} --rm -v ${hostRecordingPath}:/data asciinema2/asciicast2gif -s ${config.asciinema.speed} -t monokai /data/${castFilename}.cast /data/${castFilename}.gif`
            )
          );
          // remove the asciinema .cast file (maybe we should use it)
          log(
            await execProm(
              `docker exec --user ${uid}:${gid} ${containerId} bash -c 'rm ${hostRecordingPath}/${castFilename}.cast'`
            )
          );
          break;
        case "create":
          log(
            await writeFile(
              workspacePath + "/" + command.args.path,
              command.content
            )
          );
          console.log("File operation successful");
          break;
        case "spawn":
          let pid;
          if (command.args.command) {
            // start the background process and capture process ID
            let service_command = command.args.command;
            if (!service_command.trim().endsWith("&")) {
              service_command += " &";
            }

            let res = await execProm(
              `docker exec --workdir ${getBasePath()} --user ${uid}:${gid}  ${containerId} bash -c '${service_command} echo $!'`
            );
            pid = res.stdout.split("\n")[0].trim();
            backgroundProcesses.push(pid);
            console.log(`Process spawned with PID: ${pid}`);
            log(res);
          }
          console.log("File operation successful");
          break;
        case "browse":
          log(command);

          castFilename = filename + "_" + commandIndex + ".mp4";

          const browserScript = `/scripts/puppeteer_script.js`;
          // create browser recording using the script referenced by browserScript.js
          log(
            await execProm(
              `docker exec -u root ${containerId} bash -c 'node ${browserScript} ${
                command.args.url
              } /tmp/autobashcraft/recordings/${castFilename} && chown ${uid}:${gid} /tmp/autobashcraft/recordings/${castFilename} && chmod 777 /tmp/autobashcraft/recordings/${castFilename} && ffmpeg -i /tmp/autobashcraft/recordings/${castFilename} -vf "fps=10,scale=640:-1:flags=lanczos" -c:v gif -f gif /tmp/autobashcraft/recordings/${castFilename.replace(
                ".mp4",
                ""
              )}.gif'`
            )
          );

          break;
        case "config":
          config = {
            ...config,
            ...command.args,
            asciinema: { ...config.asciinema, ...command.args.asciinema },
          };
          console.log("Config updated", config);
          break;
        case "saveRuntime":
          await stopBackgroundProcesses({ containerId });
          console.log(
            "save runtime state to docker container as: ",
            command.args.name
          );
          if (command.args?.name) {
            // save docker container state as image
            log(
              await execProm(
                `docker commit ${containerId} ${command.args.name}`
              )
            );

            // start a new container with that image
            await stopTmpContainer();
            log(
              await execProm(
                `docker run --name abc-tmp-container ${command.args.name}`
              )
            );

            // copy contents of workspacePath to the containers workspace path (without the mounted volume so it will persist on docker commit)
            log(
              await execProm(
                `docker cp ${workspacePath}/. abc-tmp-container:${workspacePath}`
              )
            );

            // save the image again including workspace state
            log(
              await execProm(
                `docker commit abc-tmp-container ${command.args.name}`
              )
            );
            // stop tmp container
            log(await execProm(`docker stop abc-tmp-container`));
          } else {
            console.log("No 'name' prop passed to the saveRuntime command");
          }
          break;
        case "resetRuntime":
          if (containerId) {
            await execProm(`docker stop ${containerId}`);
          }
          // initialize a new runtime using the passed or default baseImage
          containerId = await initializeRuntime({
            baseImage: command.args.baseImage,
          });

          console.log(
            "New runtime container initializes - ",
            command.args.baseImage
          );
          break;
        default:
          console.log(`Unknown command type: ${command.type}`);
          log(command);
      }
      commandIndex++;
      await copyRecordings({ assetPath });
    }

    // Stop and remove any new containers that were created
    await stopNewContainers(initialContainers);
    await stopBackgroundProcesses({ containerId });

    return {};
  } catch (error) {
    console.error("Error executing commands:", error);
    throw error;
  } finally {
    if (containerId) {
      await execProm(`docker stop ${containerId}`);
    }
  }
}
