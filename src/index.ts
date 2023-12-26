import * as fs from "fs";
import { parseMarkdown } from "./markdownParser";
import { executeCommands } from "./executeCommands";

// Get the filename from the first command-line argument
const filename = process.argv[2];

if (!filename) {
  console.error("Please provide a filename as an argument.");
  process.exit(1);
}

const main = async () => {
  const markdownContent = fs.readFileSync(filename, "utf8");
  const parsedCommands = parseMarkdown(markdownContent);

  let path = filename.split("/");
  let filenameWithoutPath = path[path.length - 1];
  path[path.length - 1] = "assets";
  executeCommands(
    parsedCommands,
    filenameWithoutPath.replace(".md", ""),
    path.join("/")
  );
  console.log(parsedCommands);
};

main().catch((err) => console.error(err));
