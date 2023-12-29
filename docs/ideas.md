# AutoBashCraft Improvement Ideas


## Control Over Output Resolution (exec: ☑ [using cols & rows], browse: ☐)
- **Description**: Enable users to set the resolution for screencasts.
- **Implementation**: Add a resolution setting in the configuration. Modify the screencast capturing process to support different resolutions.
- **API Proposal**: `config({resolution: [number, number]})`: config to set the width & height of the screencast.
- **Example Usage**: `<!--@abc: config({"resolution": [1920, 1080]}) -->`


## Leave Artifacts for Further Use ☐
- **Description**: Save artifacts like logs or temporary files for manual use or in other AutoBashCraft markdown files.
- **Implementation**: Implement a feature to store selected artifacts in a designated directory, making them accessible for further processing or reference.
- **API Proposal**: `preserveArtifacts(artifactList)`: Specify artifacts to preserve.
- **Example Usage**: `<!--@abc: preserveArtifacts({"files":["/var/log", "./sample.mbtiles"]) -->`



## Full Puppeteer Control for the Browse Command ☐
- **Description**: Enhance the 'browse' command with capabilities like clicking elements or interacting with the webpage.
- **Implementation**: Implement a new config option for the browse command to provide scriptable control over web pages. This way users can script website interactions.


## Inject JavaScript for Browse Command ☐
- **Description**: Allow users to inject custom JavaScript into pages opened with the browse command.
- **Implementation**: Implement a feature where users can define JavaScript code which will be executed on the web page when the browse command runs.
- **API Proposal**: `browse({"injectJs": string})`: Inject custom JavaScript into the webpage.
- **Example Usage**: `<!--@abc: browse({"injectJs": "var testvar = 'test';"}) -->`


## Control Time for Browse Command ☐
- **Description**: Set a specific duration for how long a webpage should be open during the browse command.
- **Implementation**: Include a time parameter for the browse command, allowing the user to specify how long the page should be displayed or interacted with.
- **API Proposal**: `browse({"duration": number})`: Set the duration for the browse command.
- **Example Usage**: `<!--@abc: browse({"duration":5, "url":"https://google.com"}) -->`

## Docker Compose Support ☐
- **Description**: Improve Docker Compose support to demonstrate multi-container Docker applications.
- **Implementation**: Probably achieved by installing docker compose ni the runtime container image and by solving "Persist Docker Containers Throughout Markdown Processing".

## Clean up the mess in src/executeCommands.ts ☐

## Keeping Track of Processes in Runtime Containers ☐
- **Description**: Implement a feature to monitor and manage all processes started within a runtime container. This enhancement aims to eliminate the need for an execution timeout, thereby addressing the issue of potential zombie processes. Currently all commands in a bash codeblock are executed with a 30 seconds timeout. The timeout can be safely removed after this feature is implemented.
- **Technical Approach**: 
  - a mechanism to track process ids before initializing a runtime
  - This feature ensures that all processes are stopped when a runtime is terminated

## Refactoring `executeCommands` Function with Docker Driver ☐
- **Description**: Redesign the `executeCommands` function to leverage a Docker driver. This change involves creating two new TypeScript files, `drivers/dockerDriver.ts` and `drivers/dockerRuntime.ts`. The `dockerRuntime.ts` would define a class where each instance represents an AutoBashCraft runtime, and `dockerDriver.ts` manages the instantiation of Docker runtimes, passing commands to them, and shutting them down gracefully. All docker related commands will be moved to the dockerDriver and dockerRuntime implementing a AutoBashCraft adapter pattern that will create the possibility to attach different runtimes in the future e.g.: "host", "SSH", "AWS", "google", "azure".
- **Technical Approach**: 
  - `dockerDriver.ts`: This module acts as the interface between AutoBashCraft and Docker, handling the execution of commands within Docker containers. It should implement a AutoBashCraft runtime driver adapter patter that may be used by other drivers in the future.
  - `dockerRuntime.ts`: This class represents a Docker runtime environment for AutoBashCraft. Each instance encapsulates a Docker container, providing methods to execute commands, manage container state, and ensure clean shutdowns.

# done ☑

## Control Over Speed ☑
- **Description**: Allow users to adjust the playback speed of screencasts.
- **Implementation**: Introduce a speed parameter in the AutoBashCraft configuration. Use video editing tools to adjust the speed of the output screencast.
- **API Proposal**: `config({"speed": number})`: Function to set the playback speed. `speed` is a float where 1.0 is normal speed.
- **Example Usage**: `<!--@abc: config({"speed": 1.5}) -->`

## Persist Docker Containers Throughout Markdown Processing ☑
- **Description**: This feature enables AutoBashCraft to maintain Docker containers across different code blocks within the same markdown file, allowing for a more seamless and integrated scripting experience. The containers initiated in one code block will remain active and accessible in subsequent code blocks. This persistence eliminates the need to repeatedly start and stop containers, thereby saving time and resources. It also allows for more complex scenarios where services need to remain active, like databases or web servers, which can be interacted with in later stages of the markdown file.

- **Implementation**: Implement a mechanism to maintain Docker containers across different code blocks within a single markdown file. This change would allow subsequent code blocks to interact with the same container environment, enhancing continuity and reducing the need for redundant setup steps.

## Change Runtime Docker Image ☑
- **Description**: Provide an option to select different Docker images as the runtime environment.
- **Implementation**: Allow users to specify a Docker image in the configuration file. The tool will then pull and use this image to execute bash commands.
- **API Proposal**: `resetRuntime(imageName)`: Specify a Docker image to use.
- **Example Usage**: `<!--@abc: resetRuntime({"baseImage": "ubuntu:latest"}) -->`

## Save Current Runtime as Docker Image ☑
- **Description**: Option to save the state of the Docker container as a new Docker image after execution.
- **Implementation**: After executing the bash commands, provide an option to commit the container state as a new Docker image, preserving the environment setup.
- **API Proposal**: `saveRuntime({"name": string})`: Save the state of the Docker container as a new image.
- **Example Usage**: `<!--@abc: saveRuntime({"name": "initialized_mc_app"}) -->`