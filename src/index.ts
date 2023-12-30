#!/usr/bin/env node

import * as fs from "fs";
import * as readline from "readline";
import { parseMarkdown } from "./markdownParser";
import { executeCommands } from "./executeCommands";
import { Command, ParsedCommands } from "./commands";

const checkForDocker = (parsedCommands: ParsedCommands): boolean => {
  return parsedCommands.commands.some((command:Command) => {
    const argsContainDocker = JSON.stringify(command.args).includes("docker");
    const contentContainsDocker = (command.content || "").includes("docker");
    return argsContainDocker || contentContainsDocker;
  });
};

// Get the filename from the first command-line argument
const filename = process.argv[2];

if (!filename) {
  console.error("Please provide a filename as an argument.");
  process.exit(1);
}

const main = async () => {
  console.log("starting autobashcraft");
  const markdownContent = fs.readFileSync(filename, "utf8");
  console.log("Parsing document " + filename);
  const parsedCommands = parseMarkdown(markdownContent);
  let path = filename.split("/");
  let filenameWithoutPath = path[path.length - 1];
  path[path.length - 1] = "assets";

  if (checkForDocker(parsedCommands)) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('This script contains Docker commands, which can be dangerous. Do you want to continue? (yes/no) ', (answer) => {
      if (answer.toLowerCase() === 'yes') {
        executeCommands(
        {
          parsedCommands,
          filename: filenameWithoutPath.replace(".md", ""),
          assetPath: path.join("/"),
          withDocker: true,
      });
      } else {
        console.log('Execution aborted by the user.');
        process.exit(0);
      }
      rl.close();
    });
  } else {
        executeCommands(
        {
          parsedCommands,
          filename: filenameWithoutPath.replace(".md", ""),
          assetPath: path.join("/"),
          withDocker: false,
      });
  }
};

main().catch((err) => console.error(err));