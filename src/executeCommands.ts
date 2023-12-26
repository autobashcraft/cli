import { ParsedCommands } from "./commands";
const { exec } = require("child_process");
const util = require("util");
const fs = require("fs");
const writeFile = util.promisify(fs.writeFile);
const appendFile = util.promisify(fs.appendFile);
const execProm = util.promisify(exec);
const os = require("os");

// invoke userInfo() method
const userInfo = os.userInfo();

// get gid property
// from the userInfo object
const gid = userInfo.gid;
const uid = userInfo.uid;

const hostRecordingPath = "/tmp/autobashcraft/recordings";
const hostWorkspacePath = "/tmp/autobashcraft/workspace";
// Function to execute a sequence of commands inside a new Docker container
export async function executeCommands(
  parsedCommands: ParsedCommands,
  filename: string,
  assetPath: string
) {
  let containerId;
  try {
    // Start a new Docker container and get its ID
    const containerStartCmd = `docker run -dit --rm --user ${uid}:${gid} -v ${hostRecordingPath}:${hostRecordingPath} -v ${hostWorkspacePath}:/app autobashcraft/bash-runtime`;
    const startResult = await execProm(containerStartCmd);
    containerId = startResult.stdout.trim();
    console.log(
      await execProm(
        `docker exec -u root ${containerId} bash -c 'rm -rf /app/* && rm -rf /tmp/autobashcraft/recordings/* && chown  ${uid}:${gid} /tmp/autobashcraft -R && chmod 777 -R /app && ls -alh /app/'`
      )
    );
    console.log(
      await execProm(
        `docker exec -u $(id -u):$(id -g) ${containerId} bash -c 'ls -alh /app/'`
      )
    );
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
          const execCommandCmd = `docker exec --user $(id -u):$(id -g) ${containerId} bash -c 'echo "${commands}" > /app/script && chmod +x /app/script && cat /app/script'`;
          console.log("script /app/script created with contents:", commands);
          const result = await execProm(execCommandCmd);
          // execute the script using a custom version of asciinema-rec_script
          const execScriptCmd = `docker exec --user $(id -u):$(id -g) ${containerId} bash -c 'asciinema-rec_script /app/script && ls -al /app && cp /app/script.cast ${hostRecordingPath}/${castFilename}.cast && rm /app/script.cast'`;
          const result2 = await execProm(execScriptCmd);
          console.log(result2.stdout);
          console.log(result2.stderr);
          console.log(
            await execProm(
              `docker run --user $(id -u):$(id -g) --rm -v ${hostRecordingPath}:/data asciinema2/asciicast2gif -s 2 -t monokai /data/${castFilename}.cast /data/${castFilename}.gif`
            )
          );
          console.log(
            await execProm(
              `docker exec --user $(id -u):$(id -g) ${containerId} bash -c 'rm ${hostRecordingPath}/${castFilename}.cast'`
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
          if (command.args.service_command) {
            // Step 1: Start the Background Process and Capture PID
            let res = await execProm(
              `docker exec --user $(id -u):$(id -g)  ${containerId} bash -c '${command.args.service_command} & echo $!'`
            );
            pid = res.stdout.split("\n")[0].trim();
            console.log(`Server started with PID: ${pid}`, res);
          }

          //castFilename = Date.now() + ".mp4";
          castFilename = filename + "_" + commandIndex + ".mp4";
          // Step 2: Run Headless Browser Script Inside the Container
          const browserScript = `/scripts/puppeteer_script.js`; // This should be a script that runs Puppeteer and records the session
          console.log(
            await execProm(
              `docker exec -u root ${containerId} bash -c 'node ${browserScript} ${command.args.url} /tmp/autobashcraft/recordings/${castFilename} && chown ${uid}:${gid} /tmp/autobashcraft/recordings/${castFilename} && chmod 777 /tmp/autobashcraft/recordings/${castFilename} && ffmpeg -i /tmp/autobashcraft/recordings/${castFilename} -vf "fps=10,scale=640:-1:flags=lanczos" -c:v gif -f gif /tmp/autobashcraft/recordings/${castFilename.replace('.mp4','')}.gif'`
            )
          );

          if (command.args.service_command) {
            // Step 3: Stop the Background Process
            await execProm(
              `docker exec --user $(id -u):$(id -g) ${containerId} kill ${pid}`
            );
            console.log(`Server process ${pid} terminated`);
          }

          break;
        // Add cases for other command types like 'browse', 'create', etc.
        default:
          console.log(`Unknown command type: ${command.type}`);
      }
      commandIndex++;
    }

    //console.log(await execProm(`docker exec ${containerId} asciicast2gif -s 2 -t solarized-dark /tmp/recordings/output.cast /tmp/recordings/test.gif`))
    //const execCommandCmdTest = `docker exec ${containerId} cat ${hostRecordingPath}/${castFilename}`;
    //const resultTest = await execProm(execCommandCmdTest);
    //console.log(resultTest)

    // Optionally, handle recordings and conversions here
    await execProm(`mkdir -p ${assetPath}`);
    await execProm(`cp -r ${hostRecordingPath}/* ${assetPath}`);

    // Return the path to the recording
    return {}; // or converted video file
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
