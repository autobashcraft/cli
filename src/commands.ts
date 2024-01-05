export interface ConfigType {
  asciinema: {
    speed: number;
    cols: number;
    rows: number;
    typingPause: number;
    promptPause: number;
    timeout: number;
    keepAsciinemaFile: boolean;
  };
  withDocker: boolean;
  debug: boolean;
  basePath?: string;
  spawnWaitTime: number;
}

/**
 * Represents a command to execute a script.
 * @param type The type of the command, always 'exec' for this variant.
 * @param content The script or command to be executed.
 * @param args Additional arguments for the exec command.
 */
interface ExecCommand {
    type: 'exec';
    content: string;
    args: {
        // Include any args specific to the exec command
        // Example: scriptPath: The path to the script to be executed.
    };
}

/**
 * Represents a command to create a file or resource.
 * @param type The type of the command, always 'create' for this variant.
 * @param content The content to be written to the file.
 * @param args Arguments for the create command.
 */
interface CreateCommand {
    type: 'create';
    content?: string;
    args: {
        path: string; // The path where the file/resource should be created.
    };
}

/**
 * Represents a command to spawn a background process.
 * @param type The type of the command, always 'spawn' for this variant.
 * @param args Arguments for the spawn command.
 */
interface SpawnCommand {
    type: 'spawn';
    args: {
        command: string; // The command to be executed as a background process.
    };
}

/**
 * Represents a command to perform a web browsing action.
 * @param type The type of the command, always 'browse' for this variant.
 * @param args Arguments for the browse command.
 */
interface BrowseCommand {
    type: 'browse';
    args: {
        url: string; // The URL to be browsed.
    };
}

/**
 * Represents a command to configure settings.
 * @param type The type of the command, always 'config' for this variant.
 * @param args Arguments for the config command, matching the ConfigType structure.
 */
interface ConfigCommand {
    type: 'config';
    args: Partial<ConfigType>; // Configuration settings to be applied.
}

/**
 * Represents a command to take a snapshot of the current state.
 * @param type The type of the command, always 'snapshot' for this variant.
 * @param args Arguments for the snapshot command.
 */
interface SnapshotCommand {
    type: 'snapshot';
    args: {
        name: string; // The name for the snapshot.
    };
}

/**
 * Represents a command to initialize a process or environment.
 * @param type The type of the command, always 'init' for this variant.
 * @param args Arguments for the init command.
 */
interface InitCommand {
    type: 'init';
    args: {
        baseImage?: string; // Optional base image for initialization.
    };
}

// Union type for Command
export type Command = ExecCommand | CreateCommand | SpawnCommand | BrowseCommand | ConfigCommand | SnapshotCommand | InitCommand;

// ParsedCommands interface
export interface ParsedCommands {
    commands: Command[];
}