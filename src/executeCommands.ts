import { ParsedCommands } from "./commands";
const { exec } = require("child_process");
const util = require("util");
const fs = require("fs");
const writeFile = util.promisify(fs.writeFile);
const removeFile = util.promisify(fs.rm);
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
    timeout: number;
  };
  withDocker: boolean;
  debug: boolean;
  basePath?: string;
  spawnWaitTime: number;
}

const hostTmpPath = "/tmp/autobashcraft";
const recordingPath = "/tmp/autobashcraft/recordings";
const workspacePath = "/tmp/autobashcraft/workspace";

// default config
const defaultConfig: ConfigType = {
  asciinema: {
    speed: 1,
    cols: 80,
    rows: 15,
    typingPause: 0.01,
    promptPause: 1,
    timeout: 30,
  },
  withDocker: false,
  debug: false,
  basePath: workspacePath,
  spawnWaitTime: 20,
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

const createHostTmpPath = async () => {
  await execProm(
    `docker run -v /tmp:/_tmp -u root  bash -c 'mkdir -p /_tmp/autobashcraft && chown ${uid}:${gid} /_tmp/autobashcraft -R'`
  );
};

const cleanupRecordings = async (containerId: string) => {
  await execProm(
    `docker exec -u root ${containerId} bash -c 'rm -rf ${recordingPath}/*'`
  );
};

const stopContainer = async (id: string) => {
  try {
    log(await execProm(`docker stop ${id} || true && docker rm ${id} || true`));
  } catch (err) {
    log(err);
  }
};

const getPrivilegedOption = () => {
  if (config.withDocker) {
    return "--privileged";
  }
  return "";
};

const writeFileToWorkspace = async ({
  filename,
  content,
  containerId,
}: {
  filename: string;
  content: string;
  containerId: string;
}) => {
  let tmpPath = filename.split("/");
  const filepath = tmpPath.slice(0, tmpPath.length - 1).join("/");
  filename = filename[0] === "/" ? filename : `${workspacePath}/${filename}`;
  const tmpFilename = `${hostTmpPath}/${Math.random()}.tmp`;
  console.log("Writing file to workspace:", (`${filepath}`))
  await execProm(
    `docker exec -u root ${containerId} bash -c 'mkdir -p ${filepath} && chown runuser:${gid} ${workspacePath} -R'`
  );
  await writeFile(tmpFilename, content);
  await execProm(`docker cp ${tmpFilename} ${containerId}:${filename}`);
  await removeFile(tmpFilename);
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

  // start the runtime container
  const containerStartCmd = `docker run ${dockerSockVolume} --group-add docker --group-add sudo --network host \
  -dit --rm --user runuser:${gid} \
  -v ${recordingPath} \
  ${baseImage}`;
  const startResult = await execProm(containerStartCmd);
  containerId = startResult.stdout.trim();

  await execProm(
    `docker exec -u root ${containerId} bash -c 'mkdir -p ${workspacePath} && mkdir -p ${recordingPath} && chown  runuser:${gid} /tmp/autobashcraft -R'`
  );

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
      `docker exec --user runuser:${gid} ${containerId} bash -c 'kill ${pid}'`
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

const copyRecordings = async ({
  assetPath,
  containerId,
}: {
  assetPath: string;
  containerId: string;
}) => {
  await execProm(`mkdir -p ${assetPath}`);
  await execProm(
    `docker exec ${containerId} sh -c '[ "$(ls -A ${recordingPath})" ] && echo "Not empty" || echo "Empty"'`
  )
    .then(async (result: any) => {
      const output = result.stdout.trim();
      if (output === "Not empty") {
        // Use docker cp to copy files from recordingPath to assetPath
        await execProm(
          `docker cp ${containerId}:${recordingPath}/. ${assetPath}`
        );
      } else {
        console.log("Recording path is empty.");
      }
    })
    .catch((error: any) => {
      console.error("Error checking directory:", error.message);
    });
};

const getBasePath = () => {
  if (config.basePath !== workspacePath) {
    return workspacePath + "/" + config.basePath;
  }
  return workspacePath;
};

function sleep(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

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
  createHostTmpPath();
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
          let commands = `#!/bin/bash\n:cd ${getBasePath()}\n`;
          commands += `${command.content}` + "\n:sleep 4\n";
          log(
            await writeFileToWorkspace({
              filename: workspacePath + "/script",
              content: commands,
              containerId,
            })
          );
          const execCommandCmd = `docker exec --user root ${containerId} bash -c 'chmod +x ${workspacePath}/script && cat ${workspacePath}/script'`;
          log(await execProm(execCommandCmd));
          console.log(
            "script /app/script created with contents:",
            "\n" + commands
          );

          // execute the script using a custom version of asciinema-rec_script
          castFilename = filename + "_" + commandIndex;
          const execResults = await execProm(
            `docker exec -t --user runuser:${gid} ${getPrivilegedOption()} ${containerId} bash -c '\
            stty rows ${config.asciinema.rows} cols ${config.asciinema.cols} &&\
            TYPING_PAUSE=${config.asciinema.typingPause} \
            PROMPT_PAUSE=${config.asciinema.promptPause} \
            TIMEOUT=${config.asciinema.timeout} \
            asciinema-rec_script ${workspacePath}/script &&\
            ls -al ${workspacePath} &&\
            cp ${workspacePath}/script.cast ${recordingPath}/${castFilename}.cast &&\
            rm ${workspacePath}/script.cast'`,
            { maxBuffer: 1024 * 1024 * 10 }
          );
          log(execResults.stdout);
          log(execResults.stderr);
          // copy cast as tmp file to host
          const castTmpFilename = `${Math.random()}.tmp`;
          await execProm(
            `docker cp ${containerId}:${recordingPath}/${castFilename}.cast ${hostTmpPath}/${castTmpFilename}`
          );
          // create a gif of the recorded asciinema cast (better switch to agg)
          log(
            await execProm(
              `docker run -u ${uid}:${gid} --rm -v ${hostTmpPath}:/data:rw asciinema2/asciicast2gif \
              -s ${config.asciinema.speed} \
              -t monokai /data/${castTmpFilename} \
              /data/${castTmpFilename}.gif`
            )
          );
          // copy gif back to runtime recording path
          await execProm(
            `docker cp ${hostTmpPath}/${castTmpFilename}.gif ${containerId}:${recordingPath}/${castFilename}.gif`
          );
          //await execProm("rm " + hostTmpPath + "/" + castTmpFilename + "*");

          // remove the asciinema .cast file (maybe we should use it)
          if (!config.debug) {
            log(
              await execProm(
                `docker exec --user runuser:${gid} ${containerId} bash -c 'rm ${recordingPath}/${castFilename}.cast && ls -al ${recordingPath}'`
              )
            );
          }
          break;
        case "create":
          log(
            await writeFileToWorkspace({
              filename: workspacePath + "/" + command.args.path,
              content: command.content || "",
              containerId,
            })
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
              `docker exec --workdir ${getBasePath()} --user runuser:${gid} ${containerId} bash -c '&>/dev/null ${service_command} echo $!'`
            );
            pid = res.stdout.split("\n")[0].trim();
            backgroundProcesses.push(pid);
            console.log(`Process spawned with PID: ${pid}`);
            console.log(
              `Wait ${config.spawnWaitTime} seconds for the process to start`
            );
            await sleep(config.spawnWaitTime * 1000);
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
              `docker exec -u root ${containerId} bash -c '\
              node ${browserScript} ${
                command.args.url
              } ${recordingPath}/${castFilename} &&\
              chown runuser:${gid} ${recordingPath}/${castFilename} &&\
              chmod 666 ${recordingPath}/${castFilename} &&\
              ffmpeg -i ${recordingPath}/${castFilename} \
              -vf "fps=10,scale=1024:768:flags=lanczos" \
              -c:v gif -f gif ${recordingPath}/${castFilename.replace(
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
            withDocker: config.withDocker, // prevent overwriting withDocker using config command
          };
          console.log("Config updated", config);
          break;
        case "snapshot":
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
          } else {
            console.log("No 'name' prop passed to the snapshot command");
          }
          break;
        case "init":
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
      await copyRecordings({ assetPath, containerId });
    }

    // Stop and remove any new containers that were created
    await stopBackgroundProcesses({ containerId });
    await stopNewContainers(initialContainers);

    return {};
  } catch (error) {
    console.error("Error executing commands:", error);
    throw error;
  } finally {
    if (containerId) {
      await execProm(`docker stop ${containerId} || true`);
    }

    console.log("");
    console.log("============");
    console.log("=== done ===");
    console.log("============");
    console.log("");
  }
}
