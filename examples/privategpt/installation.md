# The content of this file is copied from https://github.com/imartinez/privateGPT/blob/main/fern/docs/pages/installation/installation.mdx and modified to fit the needs of this example.

## Installation and Settings

### Base requirements to run PrivateGPT

* Git clone PrivateGPT repository, and navigate to it:

<!--@abc: exec() -->
```bash
  git clone https://github.com/imartinez/privateGPT
  cd privateGPT
```
<img src="./assets/privategpt_0.gif"/>

* Install Python `3.11` (*if you do not have it already*). Ideally through a python version manager like `pyenv`.
  Earlier python versions are not supported.
    * osx/linux: [pyenv](https://github.com/pyenv/pyenv)
    * windows: [pyenv-win](https://github.com/pyenv-win/pyenv-win)

<!--@abc: config({"basePath":"privateGPT","asciinema":{"timeout":2000}}) -->
<!--@abc: exec() -->
```bash
pyenv install 3.11
pyenv local 3.11
```
<img src="./assets/privategpt_2.gif"/>

* Install [Poetry](https://python-poetry.org/docs/#installing-with-the-official-installer) for dependency management:

* Have a valid C++ compiler like gcc. See [Troubleshooting: C++ Compiler](#troubleshooting-c-compiler) for more details.

* Install `make` for scripts:
    * osx: (Using homebrew): `brew install make`
    * windows: (Using chocolatey) `choco install make`

### Install dependencies

Install the dependencies:

<!--@abc: exec() -->
```bash
poetry install --with ui
```
<img src="./assets/privategpt_3.gif"/>

Verify everything is working by running `make run` (or `poetry run python -m private_gpt`) and navigate to
http://localhost:8001. You should see a [Gradio UI](https://gradio.app/) **configured with a mock LLM** that will
echo back the input. Below we'll see how to configure a real LLM.

### Settings

<Callout intent="info">
The default settings of PrivateGPT should work out-of-the-box for a 100% local setup. **However**, as is, it runs exclusively on your CPU.
Skip this section if you just want to test PrivateGPT locally, and come back later to learn about more configuration options (and have better performances).
</Callout>

<br />

### Local LLM requirements

Install extra dependencies for local execution:

<!--@abc: exec() -->
```bash
poetry install --with local
```
<img src="./assets/privategpt_4.gif"/>

For PrivateGPT to run fully locally GPU acceleration is required
(CPU execution is possible, but very slow), however,
typical Macbook laptops or window desktops with mid-range GPUs lack VRAM to run
even the smallest LLMs. For that reason
**local execution is only supported for models compatible with [llama.cpp](https://github.com/ggerganov/llama.cpp)**

These two models are known to work well:

* https://huggingface.co/TheBloke/Llama-2-7B-chat-GGUF
* https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF (recommended)

To ease the installation process, use the `setup` script that will download both
the embedding and the LLM model and place them in the correct location (under `models` folder):

<!--@abc: exec() -->
```bash
poetry run python scripts/setup
```
<img src="./assets/privategpt_5.gif"/>

<!--@abc: snapshot({"name":"private-gpt"}) -->

If you are ok with CPU execution, you can skip the rest of this section.

As stated before, llama.cpp is required and in
particular [llama-cpp-python](https://github.com/abetlen/llama-cpp-python)
is used.

> It's highly encouraged that you fully read llama-cpp and llama-cpp-python documentation relevant to your platform.
> Running into installation issues is very likely, and you'll need to troubleshoot them yourself.

#### Customizing low level parameters

Currently, not all the parameters of `llama.cpp` and `llama-cpp-python` are available at PrivateGPT's `settings.yaml` file.
In case you need to customize parameters such as the number of layers loaded into the GPU, you might change
these at the `llm_component.py` file under the `private_gpt/components/llm/llm_component.py`.

##### Available LLM config options

The `llm` section of the settings allows for the following configurations:

- `mode`: how to run your llm
- `max_new_tokens`: this lets you configure the number of new tokens the LLM will generate and add to the context window (by default Llama.cpp uses `256`)

Example:

```yaml
llm:
  mode: local
  max_new_tokens: 256
```

If you are getting an out of memory error, you might also try a smaller model or stick to the proposed
recommended models, instead of custom tuning the parameters.

#### OSX GPU support

You will need to build [llama.cpp](https://github.com/ggerganov/llama.cpp) with metal support.

To do that, you need to install `llama.cpp` python's binding `llama-cpp-python` through pip, with the compilation flag
that activate `METAL`: you have to pass `-DLLAMA_METAL=on` to the CMake command tha `pip` runs for you (see below).

In other words, one should simply run:
```bash
CMAKE_ARGS="-DLLAMA_METAL=on" pip install --force-reinstall --no-cache-dir llama-cpp-python
```

The above command will force the re-installation of `llama-cpp-python` with `METAL` support by compiling
`llama.cpp` locally with your `METAL` libraries (shipped by default with your macOS).

More information is available in the documentation of the libraries themselves:
* [llama-cpp-python](https://github.com/abetlen/llama-cpp-python#installation-with-hardware-acceleration)
* [llama-cpp-python's documentation](https://llama-cpp-python.readthedocs.io/en/latest/#installation-with-hardware-acceleration)
* [llama.cpp](https://github.com/ggerganov/llama.cpp#build)

#### Windows NVIDIA GPU support

Windows GPU support is done through CUDA.
Follow the instructions on the original [llama.cpp](https://github.com/ggerganov/llama.cpp) repo to install the required
dependencies.

Some tips to get it working with an NVIDIA card and CUDA (Tested on Windows 10 with CUDA 11.5 RTX 3070):

* Install latest VS2022 (and build tools) https://visualstudio.microsoft.com/vs/community/
* Install CUDA toolkit https://developer.nvidia.com/cuda-downloads
* Verify your installation is correct by running `nvcc --version` and `nvidia-smi`, ensure your CUDA version is up to
  date and your GPU is detected.
* [Optional] Install CMake to troubleshoot building issues by compiling llama.cpp directly https://cmake.org/download/

If you have all required dependencies properly configured running the
following powershell command should succeed.

```powershell
$env:CMAKE_ARGS='-DLLAMA_CUBLAS=on'; poetry run pip install --force-reinstall --no-cache-dir llama-cpp-python
```

If your installation was correct, you should see a message similar to the following next
time you start the server `BLAS = 1`.

```console
llama_new_context_with_model: total VRAM used: 4857.93 MB (model: 4095.05 MB, context: 762.87 MB)
AVX = 1 | AVX2 = 1 | AVX512 = 0 | AVX512_VBMI = 0 | AVX512_VNNI = 0 | FMA = 1 | NEON = 0 | ARM_FMA = 0 | F16C = 1 | FP16_VA = 0 | WASM_SIMD = 0 | BLAS = 1 | SSE3 = 1 | SSSE3 = 0 | VSX = 0 |
```

Note that llama.cpp offloads matrix calculations to the GPU but the performance is
still hit heavily due to latency between CPU and GPU communication. You might need to tweak
batch sizes and other parameters to get the best performance for your particular system.

#### Linux NVIDIA GPU support and Windows-WSL

Linux GPU support is done through CUDA.
Follow the instructions on the original [llama.cpp](https://github.com/ggerganov/llama.cpp) repo to install the required
external
dependencies.

Some tips:

* Make sure you have an up-to-date C++ compiler
* Install CUDA toolkit https://developer.nvidia.com/cuda-downloads
* Verify your installation is correct by running `nvcc --version` and `nvidia-smi`, ensure your CUDA version is up to
  date and your GPU is detected.

After that running the following command in the repository will install llama.cpp with GPU support:

```bash
CMAKE_ARGS='-DLLAMA_CUBLAS=on' poetry run pip install --force-reinstall --no-cache-dir llama-cpp-python
```

If your installation was correct, you should see a message similar to the following next
time you start the server `BLAS = 1`.

```
llama_new_context_with_model: total VRAM used: 4857.93 MB (model: 4095.05 MB, context: 762.87 MB)
AVX = 1 | AVX2 = 1 | AVX512 = 0 | AVX512_VBMI = 0 | AVX512_VNNI = 0 | FMA = 1 | NEON = 0 | ARM_FMA = 0 | F16C = 1 | FP16_VA = 0 | WASM_SIMD = 0 | BLAS = 1 | SSE3 = 1 | SSSE3 = 0 | VSX = 0 |
```

### Known issues and Troubleshooting

Execution of LLMs locally still has a lot of sharp edges, specially when running on non Linux platforms.
You might encounter several issues:

* Performance: RAM or VRAM usage is very high, your computer might experience slowdowns or even crashes.
* GPU Virtualization on Windows and OSX: Simply not possible with docker desktop, you have to run the server directly on
  the host.
* Building errors: Some of PrivateGPT dependencies need to build native code, and they might fail on some platforms.
  Most likely you are missing some dev tools in your machine (updated C++ compiler, CUDA is not on PATH, etc.).
  If you encounter any of these issues, please open an issue and we'll try to help.

One of the first reflex to adopt is: get more information.
If, during your installation, something does not go as planned, retry in *verbose* mode, and see what goes wrong.

For example, when installing packages with `pip install`, you can add the option `-vvv` to show the details of the installation.

#### Troubleshooting: C++ Compiler

If you encounter an error while building a wheel during the `pip install` process, you may need to install a C++
compiler on your computer.

**For Windows 10/11**

To install a C++ compiler on Windows 10/11, follow these steps:

1. Install Visual Studio 2022.
2. Make sure the following components are selected:
    * Universal Windows Platform development
    * C++ CMake tools for Windows
3. Download the MinGW installer from the [MinGW website](https://sourceforge.net/projects/mingw/).
4. Run the installer and select the `gcc` component.

**For OSX**

1. Check if you have a C++ compiler installed, `Xcode` should have done it for you. To install Xcode, go to the App
   Store and search for Xcode and install it. **Or** you can install the command line tools by running `xcode-select --install`.
2. If not, you can install clang or gcc with homebrew `brew install gcc`

#### Troubleshooting: Mac Running Intel

When running a Mac with Intel hardware (not M1), you may run into _clang: error: the clang compiler does not support '
-march=native'_ during pip install.

If so set your archflags during pip install. eg: _ARCHFLAGS="-arch x86_64" pip3 install -r requirements.txt_