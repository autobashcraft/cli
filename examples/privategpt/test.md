
<!--@abc: init({"baseImage":"private-gpt-ingested"}) -->
<!--@abc: config({"basePath":"privateGPT","asciinema":{"timeout":100}}) -->
<!--@abc: spawn({"command":"poetry run python -m private_gpt"}) -->

<!--@abc: create({"path":"privateGPT/cli_client/client.py"}) -->
```python
import requests

class CompletionClient:
    TIMEOUT = 600

    def __init__(self, session: requests.Session, api_url: str) -> None:
        self._headers = {}
        self._session = session
        self._api_url = api_url

    def generate_response(self, prompt: str, model: str) -> str:
        response = self._session.post(
            self._api_url,
            headers=self._headers,
            json={
                "prompt": prompt,
                "use_context": True
            },
            timeout=self.TIMEOUT,
        )
        response.raise_for_status()
        print(response.json())
        return response.json()["choices"][0]["message"]["content"].strip()


def build_completion_client(api_url: str) -> CompletionClient:
    return CompletionClient(session=requests.Session(), api_url=api_url)
```

<!--@abc: create({"path":"privateGPT/cli_client/cli.py"}) -->
```python
import io
import os

import click

from client import build_completion_client


@click.group()
def cli():
    pass


@cli.command()
@click.argument("source", type=click.File("rt", encoding="utf-8"))
@click.option("-t", "--token", default="", help="OpenAI API token")
@click.option(
    "-m", "--model", default="text-davinci-003", help="OpenAI model option. (i.e. code-davinci-002)"
)
def complete(source: io.TextIOWrapper, token: str, model: str) -> None:
    """Return OpenAI completion for a prompt from SOURCE."""
    client = build_completion_client(api_url=get_api_url())
    prompt = source.read()
    result = client.generate_response(prompt, model)
    click.echo(result)


@cli.command()
@click.option(
    "-m", "--model", default="text-davinci-003", help="OpenAI model option. (i.e. code-davinci-002)"
)
def repl(token: str, model: str) -> None:
    """Start interactive shell session for OpenAI completion API."""
    client = build_completion_client(api_url=get_api_url())
    while True:
        print(client.generate_response(input("Prompt: "), model))
        print()


def get_api_url() -> str:
    return os.environ.get("OPENAI_API_URL", "https://api.openai.com/v1/completions")


if __name__ == "__main__":
    cli()
```

<!--@abc: exec() -->
```bash
pip install openai-cli click
ls -al
echo "I have a computer problem, which employee would be best suited to help me based on the skillset?" | OPENAI_API_TOKEN=notoken OPENAI_API_URL=http://localhost:8001/v1/completions python cli_client/cli.py complete -
```

Reasponse

```
Based on the information provided in the context, the employees with IT-related skills might be able to help you with your computer problem. Here are some options:

1. John Doe (HR) - skills: communication, teamwork
2. Jane Smith (IT) - skills: programming, problem-solving
3. Alice Johnson (Marketing) - skills: marketing, social media
4. Bob Miller (Finance) - skills: accounting, financial analysis
5. Eva Brown (IT) - skills: networking, cybersecurity
6. Mike Wilson (Operations) - skills: logistics, supply chain management
7. Grace Turner (HR) - skills: recruitment, employee relations
8. Daniel Carter (Marketing) - skills: content creation, branding
9. Olivia White (Finance) - skills: financial planning, investment analysis
10. Ryan Adams (IT) - skills: software development, database management

Given that you have a computer problem, I would suggest considering the employees with IT-related skills, such as John Doe, Jane Smith, Eva Brown, and Ryan Adams. Among them, Ryan Adams has specific skills related to software development and database management, which might be particularly relevant to your issue. However, it's essential to note that this is just a suggestion based on the information provided, and other factors, such as availability and workload, should also be considered when selecting an employee for assistance.
```