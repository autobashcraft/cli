
<!--@abc: init({"baseImage":"private-gpt-ingested"}) -->
<!--@abc: config({"basePath":"privateGPT","asciinema":{"timeout":100}}) -->
<!--@abc: spawn({"command":"poetry run python -m private_gpt"}) -->

## Trying out the private GPT service

Create a simple (mostly openAI API compliant) python client for the private GPT service we just created.
The code is taken from https://github.com/peterdemin/openai-cli and reduced to the bare minimum.

<!--@abc: create({"path":"privateGPT/client/client.py"}) -->
```python
# path: client/client.py
import requests

class CompletionClient:
    TIMEOUT = 600

    def __init__(self, session: requests.Session, api_url: str) -> None:
        self._session = session
        self._api_url = api_url

    def generate_response(self, prompt: str) -> str:
        response = self._session.post(
            self._api_url,
            headers={},
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

<!--@abc: create({"path":"privateGPT/client/cli.py"}) -->
```python
# path: client/cli.py
import io
import os

import click

from client import build_completion_client


@click.group()
def cli():
    pass


@cli.command()
@click.argument("source", type=click.File("rt", encoding="utf-8"))
def complete(source: io.TextIOWrapper) -> None:
    """Return OpenAI completion for a prompt from SOURCE."""
    client = build_completion_client(api_url=get_api_url())
    prompt = source.read()
    result = client.generate_response(prompt)
    click.echo(result)

def get_api_url() -> str:
    return os.environ.get("OPENAI_API_URL", "https://api.openai.com/v1/completions")


if __name__ == "__main__":
    cli()
```

Use the client to generate a response from the GPT service, asking a question about the employees.json document we ingested earlier.

<!--@abc: exec() -->
```bash
pip install click
echo "I have a computer problem, which employee would be best suited to help me based on the skillset? Give me a list of three possible employees and reasoning." | OPENAI_API_URL=http://localhost:8001/v1/completions python client/cli.py complete -
```

<img src="./assets/chat_5.gif"/>

Here is the response we get from the private GPT service running Mistral:

```
Based on the provided context information, here are three employees who could potentially help with a computer problem and the reasoning behind each choice:

1. John Doe (HR, skills: communication, teamwork): While John may not have direct IT-related skills, his strong communication and teamwork abilities make him an excellent candidate to help facilitate the resolution of a computer issue. He can act as a liaison between the IT department and the person experiencing the problem, ensuring clear communication throughout the process.

2. Jane Smith (IT, skills: programming, problem-solving): With her extensive IT background and strong problem-solving abilities, Jane is an ideal candidate to help diagnose and resolve computer issues. Her expertise in programming can be particularly valuable when dealing with software-related problems.

3. Mike Wilson (Operations, skills: logistics, supply chain management): Although not directly related to computer troubleshooting, Mike's skills in logistics and supply chain management could prove beneficial in managing the process of getting a malfunctioning computer repaired or replaced efficiently. He can help coordinate with IT support teams, vendors, or other necessary parties to ensure minimal downtime for the affected individual.
```