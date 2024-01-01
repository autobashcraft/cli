
<!--@abc: init({"baseImage":"private-gpt-ingested"}) -->
<!--@abc: config({"basePath":"privateGPT","asciinema":{"timeout":100}}) -->
<!--@abc: spawn({"command":"poetry run python -m private_gpt"}) -->

<!--@abc: exec() -->
```bash
pip install openai-cli
echo "I have a computer problem, which employee would be best suited to help me based on the skillset?" | OPENAI_API_TOKEN=notoken OPENAI_API_URL=http://localhost:8001/v1/completions openai complete -
```