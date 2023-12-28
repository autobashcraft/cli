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
    resolution: [number, number];
    typingPause: number;
    promptPause: number;
  };
  withDocker: boolean;
}

// default config
const defaultConfig: ConfigType = {
  asciinema: {
    speed: 2,
    cols: 100,
    rows: 20,
    resolution: [120, 30],
    typingPause: 0.001,
    promptPause: 1,
  },
  withDocker: false,
}
let config: ConfigType = {...defaultConfig};

// invoke userInfo() method
const userInfo = os.userInfo();

// get gid property
// from the userInfo object
let gid = userInfo.gid;
const uid = userInfo.uid;

const hostRecordingPath = "/tmp/autobashcraft/recordings";
const hostWorkspacePath = "/tmp/autobashcraft/workspace";
const containerWorkspacePath = hostWorkspacePath;

const initializeRuntime = async () => {

  let containerId;
  let dockerSockVolume = "";
  if (config.withDocker) {
    dockerSockVolume = "-v /var/run/docker.sock:/var/run/docker.sock:z";
    gid = "$(getent group docker | cut -d: -f3)";
  }
  const containerStartCmd = `docker run ${dockerSockVolume} --group-add docker --group-add sudo --network host -dit --rm --user ${uid}:${gid} -v ${hostRecordingPath}:${hostRecordingPath} -v ${hostWorkspacePath}:${containerWorkspacePath} cioddi/autobashcraft:latest`;
  const startResult = await execProm(containerStartCmd);
  containerId = startResult.stdout.trim();

  const cleanupWorkspace = await execProm(
    `docker exec -u root ${containerId} bash -c 'rm -rf ${containerWorkspacePath}/* && rm -rf /tmp/autobashcraft/recordings/* && chown  ${uid}:${gid} /tmp/autobashcraft -R && chmod 777 -R ${containerWorkspacePath} && ls -alh ${containerWorkspacePath}/'`
  );

  return containerId;
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
  let containerId = await initializeRuntime();
  try {
    //console.log(cleanupWorkspace);

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

          //castFilename = Date.now() + ".mp4";
          castFilename = filename + "_" + commandIndex + ".mp4";
          // Step 2: Run Headless Browser Script Inside the Container
          const browserScript = `/scripts/puppeteer_script.js`; // This should be a script that runs Puppeteer and records the session
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
          config = { ...config, ...command.args, asciinema: { ...config.asciinema, ...command.args.asciinema } };
          console.log("Config updated", config);
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

    return {};
  } catch (error) {
    console.error("Error executing commands:", error);
    throw error;
  } finally {
    if (containerId) {
      // Stop and remove the Docker container
      const containerStopCmd = `docker stop ${containerId}`;
      await execProm(containerStopCmd);
    }
  }
}
