import { Lexer, Token, Tokens } from "marked";
import { Command, ParsedCommands } from "./commands";

export const parseMarkdown = (markdown: string): ParsedCommands => {
  const lexer = new Lexer();
  const tokens = lexer.lex(markdown);
  const commands: Command[] = [];
  let currentCommandType: string | null = null;

  tokens.forEach((token: Token, index: number) => {
    if (token.type === "html") {
      const execMatch = token.text.match(/<!--@abc: ([a-zA-Z]+)\((.*?)\) -->/);
      if (execMatch && execMatch.length > 2) {
        const commandType = execMatch[1];
        const commandArgs = execMatch[2];
        currentCommandType = commandType;

        if (commandType !== "exec") {
          try {
            const args = JSON.parse(`${commandArgs}`);
            commands.push({ type: commandType, args });
          } catch (e) {
            console.error(`Error parsing arguments for ${commandType}:`, e);
          }
        }
      }
    } else if (token.type === "code") {
        console.log('token',currentCommandType,  token);
      if (currentCommandType === "exec") {
            commands.push({ type: "exec", content: token.text });
      } else if (["create", "update"].includes("" + currentCommandType)) {
        const argsMatch = (tokens[index - 1] as Tokens.HTML).text.match(
          /<!--@abc: [a-zA-Z]+\((.*?)\) -->/
        );
        if (argsMatch) {
          const args = JSON.parse(`${argsMatch[1]}`);
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
