export interface Command {
    type: string;
    content?: string;
    args?: any;
}

export interface ParsedCommands {
    commands: Command[];
}