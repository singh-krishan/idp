# {{cookiecutter.project_name}}

{{cookiecutter.description}}

## Generated from OpenAPI Specification

This microservice was automatically generated from an OpenAPI specification by the IDP Platform.

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn src.main:app --reload --port {{cookiecutter.port}}

# Run tests
pytest tests/

# View API documentation
# Open http://localhost:{{cookiecutter.port}}/docs
```

## Implementation

The generated code includes route handlers with TODO comments. Fill in the business logic for each endpoint.

## OpenAPI Specification

The original OpenAPI specification is included in this repository as `openapi.yaml` (or `openapi.json`).
