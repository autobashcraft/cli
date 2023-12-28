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
}

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
  debug: true,
};
let config: ConfigType = { ...defaultConfig };

// invoke userInfo() method
const userInfo = os.userInfo();

// get gid property
// from the userInfo object
let gid = userInfo.gid;
const uid = userInfo.uid;

const hostRecordingPath = "/tmp/autobashcraft/recordings";
const hostWorkspacePath = "/tmp/autobashcraft/workspace";
const containerWorkspacePath = hostWorkspacePath;

const cleanupRecordings = async (containerId: string) => {
  await execProm(
    `docker exec -u root ${containerId} bash -c 'rm -rf ${hostRecordingPath}/*'`
  );
};

const stopContainer = async (id:string) => {

  // Check if the container exists
  const checkContainer = await execProm(
    `docker ps -a -q -f id=^/${id}$`
  );

  if (checkContainer.stdout.trim()) {
    // If the container exists, stop and remove it
    console.log(
      await execProm(
        `docker stop ${id} && docker rm ${id}`
      )
    );
  } else {
    console.log(`Container ${id} does not exist.`);
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
    console.log(
      await execProm(
        `docker stop ${checkContainer.stdout.trim()} || true && docker rm ${checkContainer.stdout.trim()} || true`
      )
    );
  } else {
    console.log(`Container ${containerName} does not exist.`);
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

  console.log(
    await execProm(
      `docker run --user ${uid}:${gid} --rm -dit --name abc-tmp-container -v ${hostWorkspacePath}:/tmp_workspace:rw ${baseImage}`
    )
  );

  console.log(
    await execProm(
      `docker exec --user ${uid}:${gid} abc-tmp-container bash -c 'rm -rf /tmp_workspace/* && cp -r ${containerWorkspacePath}/. /tmp_workspace && ls -al /tmp_workspace'`
    )
  );

 console.log(
 await execProm(
      `ls -al ${hostWorkspacePath}`
    )
 )
  await stopTmpContainer();

  // start the runtime container
  const containerStartCmd = `docker run ${dockerSockVolume} --group-add docker --group-add sudo --network host -dit --rm --user ${uid}:${gid} -v ${hostRecordingPath}:${hostRecordingPath} -v ${hostWorkspacePath}:${containerWorkspacePath} ${baseImage}`;
  const startResult = await execProm(containerStartCmd);
  containerId = startResult.stdout.trim();
 console.log(
 await execProm(
      `docker exec -u root ${containerId} bash -c 'ls -al ${hostWorkspacePath}'`
    )
 )

   await execProm(
    `docker exec -u root ${containerId} bash -c 'chown  ${uid}:${gid} /tmp/autobashcraft -R'`
  );
  //console.log(cleanupWorkspace);

  return containerId;
};

async function getRunningContainers(): Promise<string[]> {
  const { stdout } = await execProm("docker ps -q");
  return stdout
    .trim()
    .split("\n")
    .filter((line: string) => line.length > 0);
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
      switch (command.type) {
        case "exec":
          console.log("Executing Bash");
          //castFilename = Date.now() + ".cast";
          castFilename = filename + "_" + commandIndex;
          let commands = "#!/bin/bash\n\n";
          commands += `${command.content}\n`;
          // create the script inside the container
          const execCommandCmd = `docker exec --user ${uid}:${gid} ${containerId} bash -c 'echo "${commands}" > ${containerWorkspacePath}/script && chmod +x ${containerWorkspacePath}/script && cat ${containerWorkspacePath}/script'`;
          console.log("script /app/script created with contents:", commands);
          const result = await execProm(execCommandCmd);
          // execute the script using a custom version of asciinema-rec_script
          const execScriptCmd = `docker exec -t --user ${uid}:${gid} --privileged ${containerId} bash -c 'stty rows ${config.asciinema.rows} cols ${config.asciinema.cols} && TYPING_PAUSE=0.01 asciinema-rec_script ${containerWorkspacePath}/script && ls -al ${containerWorkspacePath} && cp ${containerWorkspacePath}/script.cast ${hostRecordingPath}/${castFilename}.cast && rm ${containerWorkspacePath}/script.cast'`;
          const result2 = await execProm(execScriptCmd);
          console.log(result2.stdout);
          console.log(result2.stderr);
          console.log(
            await execProm(
              `docker run --user ${uid}:${gid} --rm -v ${hostRecordingPath}:/data asciinema2/asciicast2gif -s ${config.asciinema.speed} -t monokai /data/${castFilename}.cast /data/${castFilename}.gif`
            )
          );
          console.log(
            await execProm(
              `docker exec --user ${uid}:${gid} ${containerId} bash -c 'rm ${hostRecordingPath}/${castFilename}.cast'`
            )
          );
          break;
        case "create":
          await writeFile(
            hostWorkspacePath + "/" + command.args.path,
            command.content
          );
          console.log("File operation successful");
          break;
        case "browse":
          console.log(command);

          let pid;
          let service_container_started = false;
          if (command.args.service_command) {
            // Step 1: Start the Background Process and Capture PID
            let service_command = command.args.service_command;
            if (service_command.includes("docker run")) {
              service_command = service_command.replace(
                "docker run ",
                "docker run -d --name autobashcraft-service-container --rm "
              );
              service_container_started = true;
            }
            if (service_container_started) {
              let res = await execProm(
                `docker exec --user ${uid}:${gid}  ${containerId} bash -c '${service_command}'`
              );
              console.log(`Service container started`);
            } else {
              let res = await execProm(
                `docker exec --user ${uid}:${gid}  ${containerId} bash -c '${service_command} & echo $!'`
              );
              pid = res.stdout.split("\n")[0].trim();
              console.log(`Server started with PID: ${pid}`, res);
            }
          }

          castFilename = filename + "_" + commandIndex + ".mp4";

          // Step 2: Run Headless Browser Script Inside the Container
          const browserScript = `/scripts/puppeteer_script.js`;
          console.log("start recording");
          console.log(
            await execProm(
              `docker exec -u root ${containerId} bash -c 'node ${browserScript} ${
                command.args.url
              } /tmp/autobashcraft/recordings/${castFilename} && chown ${uid}:${gid} /tmp/autobashcraft/recordings/${castFilename} && chmod 777 /tmp/autobashcraft/recordings/${castFilename} && ffmpeg -i /tmp/autobashcraft/recordings/${castFilename} -vf "fps=10,scale=640:-1:flags=lanczos" -c:v gif -f gif /tmp/autobashcraft/recordings/${castFilename.replace(
                ".mp4",
                ""
              )}.gif'`
            )
          );

          if (command.args.service_command) {
            // Step 3: Stop the Background Process
            if (service_container_started) {
              await execProm(`docker stop autobashcraft-service-container`);
              console.log(
                `Service container "autobashcraft-service-container" terminated`
              );
            } else {
              await execProm(
                `docker exec --user ${uid}:${gid} ${containerId} kill ${pid}`
              );
              console.log(`Server process ${pid} terminated`);
            }
          }

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
          console.log(
            "save runtime state to docker container as: ",
            command.args.name
          );
          if (command.args?.name) {
            // save docker container state as image
            console.log(
              await execProm(
                `docker commit ${containerId} ${command.args.name}`
              )
            );

            // start a new container with that image
            await stopTmpContainer();
            console.log(
              await execProm(
                `docker run --name abc-tmp-container ${command.args.name}`
              )
            );

            console.log(
              await execProm(
                `docker cp ${containerWorkspacePath}/. abc-tmp-container:${containerWorkspacePath}`
              )
            );

            // save the image again including workspace state
            console.log(
              await execProm(
                `docker commit abc-tmp-container ${command.args.name}`
              )
            );
            console.log(await execProm(`docker stop abc-tmp-container`));
          } else {
            console.log("No 'name' prop passed to the saveRuntime command");
          }
          break;
        case "resetRuntime":
          if (containerId) {
            await execProm(`docker stop ${containerId}`);
          }
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
          console.log(command);
      }
      commandIndex++;
    }

    await execProm(`mkdir -p ${assetPath}`);
    await execProm(`if [ "$(ls -A ${hostRecordingPath})" ]; then
       cp -r ${hostRecordingPath}/* ${assetPath}
    fi`);

    // Stop and remove any new containers that were created
    await stopNewContainers(initialContainers);

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
