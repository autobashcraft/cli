import * as fs from 'fs';
import { parseMarkdown } from './markdownParser';
import { executeCommands } from './executeCommands';

const main = async () => {
    const markdownContent = fs.readFileSync('README.md', 'utf8');
    const parsedCommands = parseMarkdown(markdownContent);

    executeCommands(parsedCommands);
    console.log(parsedCommands);
};

main().catch(err => console.error(err));