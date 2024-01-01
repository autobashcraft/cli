
<!--@abc: init({"baseImage":"private-gpt"}) -->
<!--@abc: config({"basePath":"privateGPT","asciinema":{"timeout":100}}) -->

<!--@abc: create({"path":"privateGPT/docs/employees.json"}) -->
```json
{
    "employees": [
        {
            "name": "John Doe",
            "birthdate": "1990-05-15",
            "branch": "HR",
            "skills": [
                "communication",
                "teamwork"
            ]
        },
        {
            "name": "Jane Smith",
            "birthdate": "1985-12-10",
            "branch": "IT",
            "skills": [
                "programming",
                "problem-solving"
            ]
        },
        {
            "name": "Alice Johnson",
            "birthdate": "1992-08-23",
            "branch": "Marketing",
            "skills": [
                "marketing",
                "social media"
            ]
        },
        {
            "name": "Bob Miller",
            "birthdate": "1988-03-04",
            "branch": "Finance",
            "skills": [
                "accounting",
                "financial analysis"
            ]
        },
        {
            "name": "Eva Brown",
            "birthdate": "1995-07-18",
            "branch": "IT",
            "skills": [
                "networking",
                "cybersecurity"
            ]
        },
        {
            "name": "Mike Wilson",
            "birthdate": "1991-09-30",
            "branch": "Operations",
            "skills": [
                "logistics",
                "supply chain management"
            ]
        },
        {
            "name": "Grace Turner",
            "birthdate": "1987-02-12",
            "branch": "HR",
            "skills": [
                "recruitment",
                "employee relations"
            ]
        },
        {
            "name": "Daniel Carter",
            "birthdate": "1993-11-08",
            "branch": "Marketing",
            "skills": [
                "content creation",
                "branding"
            ]
        },
        {
            "name": "Olivia White",
            "birthdate": "1986-06-25",
            "branch": "Finance",
            "skills": [
                "financial planning",
                "investment analysis"
            ]
        },
        {
            "name": "Ryan Adams",
            "birthdate": "1994-04-20",
            "branch": "IT",
            "skills": [
                "software development",
                "database management"
            ]
        }
    ]
}
```

<!--@abc: exec() -->
```bash
make ingest docs -- --watch
```

<!--@abc: exec() -->
```bash
poetry run python -m private_gpt
```

<!--@abc: snapshot({"name":"private-gpt-ingested"}) -->
<!--@abc: config({"spawnWaitTime":60}) -->
<!--@abc: spawn({"command":"poetry run python -m private_gpt"}) -->

<!--@abc: exec() -->
```bash
curl http://127.0.0.1:8001/
```