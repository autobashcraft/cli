## Command Types in Autobashcraft

### Overview

Autobashcraft processes commands embedded within Markdown documents. These commands are written as HTML comments with the prefix `@abc:`, allowing users to define operations such as script execution and environment configuration within a Markdown file. This document provides details on the various command types supported by Autobashcraft, their structures, and their intended uses.

The Autobashcraft parser, scans Markdown documents to extract and interpret these commands. This process results in a structured representation of the commands, integrating them with the documentation or instructional content.

### Command Structure

Commands in Autobashcraft follow a specific syntax within the Markdown content:

```markdown
<!--@abc: commandType(parameters) -->
```

- **`commandType`**: Identifies the operation to be performed.
- **`parameters`**: A JSON object containing arguments and options relevant to the command type.

### Command Types

Autobashcraft supports different command types for various operations:

1. **Exec Command (`exec`)**
   - Executes bash commands contained in the following code block.
   - This will generate an asciinema screencast of the execution.

2. **Create Command (`create`)**
   - Creates files or resources.

3. **Config Command (`config`)**
   - Changes settings and preferences for the execution environment and autobashcraft.
   - The `withDocker` option can't be changed from within a markdown file. It is set as cli parameter or interactevely when the user runs the autobashcraft cli.

4. **Browse Command (`browse`)**
   - Open a URL in a web browser.
   - This will generate a puppeteer screencast of the browsing session.

5. **Init Command (`init`)**
   - Initializes a new runtime environment.

6. **Snapshot Command (`snapshot`)**
   - Takes a snapshot of the current state of the runtime environment.

7. **Spawn Command (`spawn`)**
   - Starts background process.

### Parsing Process

The Autobashcraft parser uses the Lexer component from the `marked` library to tokenize the Markdown content. It identifies and extracts the command structures and parses each command type based on its specific requirements.
