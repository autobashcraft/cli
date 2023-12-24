import { ParsedCommands } from "./commands";
const { exec } = require("child_process");
const util = require("util");
const execProm = util.promisify(exec);

const hostRecordingPath = "/tmp/autobashcraft/recordings";
const hostWorkspacePath = "/tmp/autobashcraft/workspace";
// Function to execute a sequence of commands inside a new Docker container
export async function executeCommands(
  parsedCommands: ParsedCommands
) {
  let containerId;
  try {
    // Start a new Docker container and get its ID
    const containerStartCmd = `docker run -dit --rm -v ${hostRecordingPath}:${hostRecordingPath} -v ${hostWorkspacePath}:/app autobashcraft/bash-runtime`;
    const startResult = await execProm(containerStartCmd);
    containerId = startResult.stdout.trim();
    console.log(await execProm(`docker exec ${containerId} ls -alh /app/`))
    console.log(await execProm(`docker exec ${containerId} bash -c 'rm -rf /app/*'`))
    console.log(await execProm(`docker exec ${containerId} bash -c 'ls -alh /app/'`))

    console.log("Executing Bash");
    for (const command of parsedCommands.commands) {
      switch (command.type) {
        case "exec":
          const castFilename = Date.now() + ".cast";
          let commands = "#!/bin/bash\n\n";
          commands += `${command.content}\n`;
          // create the script inside the container
          const execCommandCmd = `docker exec ${containerId} bash -c 'echo "${commands}" > /app/script && chmod +x /app/script && cat /app/script'`;
          console.log('script /app/script created with contents:', commands);
          const result = await execProm(execCommandCmd);
          // execute the script using a custom version of asciinema-rec_script
          const execScriptCmd = `docker exec ${containerId} bash -c 'asciinema-rec_script /app/script && ls -al /app && cp /app/script.cast ${hostRecordingPath}/${castFilename} && rm /app/script.cast'`;
          const result2 = await execProm(execScriptCmd);
          console.log(result2.stdout);
          console.log(result2.stderr);
          console.log(await execProm(`docker run --rm -v ${hostRecordingPath}:/data asciinema2/asciicast2gif -s 2 -t monokai /data/${castFilename} /data/${castFilename}.gif`))
          break;
        // Add cases for other command types like 'browse', 'create', etc.
        default:
          console.log(`Unknown command type: ${command.type}`);
      }
    }

    //console.log(await execProm(`docker exec ${containerId} asciicast2gif -s 2 -t solarized-dark /tmp/recordings/output.cast /tmp/recordings/test.gif`))
    //const execCommandCmdTest = `docker exec ${containerId} cat ${hostRecordingPath}/${castFilename}`;
    //const resultTest = await execProm(execCommandCmdTest);
    //console.log(resultTest)

    // Optionally, handle recordings and conversions here

    // Return the path to the recording
    return `${hostRecordingPath}/output.cast`; // or converted video file
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
