import { Lexer, Token, Tokens } from "marked";
import { Command, ParsedCommands } from "./commands";

const codeblockCommands = ["exec", "create", "update"];
const commands = ["config", "browse", "resetRuntime", "saveRuntime"];
export const parseMarkdown = (markdown: string): ParsedCommands => {
  const lexer = new Lexer();
  const tokens = lexer.lex(markdown);
  const commands: Command[] = [];
  let currentCommandType: string | null = null;

  tokens.forEach((token: Token, index: number) => {
    if (token.type === "html") {
      const execMatch = token.text.match(/<!--@abc: ([a-zA-Z]+)\((.*?)\) -->/);
      //console.log("execMatch", execMatch);
      if (execMatch && execMatch.length > 2) {
        const commandType = execMatch[1];
        let commandArgs = execMatch[2];
        currentCommandType = commandType;

        if (codeblockCommands.indexOf(commandType) === -1) {
          try {
            const args = JSON.parse(`${commandArgs}`);
            commands.push({ type: commandType, args });
          } catch (e) {
            console.error(`Error parsing arguments for ${commandType}:`, e);
          }
        }
      }
    } else if (token.type === "code") {
      //console.log("token", currentCommandType, token);
      if (codeblockCommands.includes("" + currentCommandType)) {
        const argsMatch = (tokens[index - 1] as Tokens.HTML).text.match(
          /<!--@abc: [a-zA-Z]+\((.*?)\) -->/
        );
        if (argsMatch) {
          const args = argsMatch[1] ? JSON.parse(`${argsMatch[1]}`) : {};
          commands.push({
            type: "" + currentCommandType,
            content: token.text,
            args,
          });
        }
      }
      currentCommandType = null;
    }
  });

  return { commands };
};
