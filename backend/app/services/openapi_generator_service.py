"""
Service for generating FastAPI code from OpenAPI specifications.
"""
import json
import yaml
import logging
from pathlib import Path
from typing import Dict, Tuple
from openapi_spec_validator import validate_spec
from datamodel_code_generator import DataModelType, PythonVersion
from datamodel_code_generator import InputFileType, generate
from jinja2 import Template
import io

logger = logging.getLogger(__name__)

# Jinja2 template for main.py
MAIN_PY_TEMPLATE = '''"""
{{ title }}

{{ description }}

Auto-generated from OpenAPI specification by IDP Platform.
"""
from fastapi import FastAPI, HTTPException, Query, Path, Body, Depends
from typing import List, Optional, Dict, Any
from prometheus_fastapi_instrumentator import Instrumentator
import os
{% if has_models %}
from .models import *
{% endif %}

app = FastAPI(
    title="{{ title }}",
    description="{{ description }}",
    version="{{ version }}",
)

# Initialize Prometheus instrumentation
Instrumentator().instrument(app).expose(app)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "{{ project_name }}"}

{% for route in routes %}
@app.{{ route.method }}("{{ route.path }}"{% if route.response_model %}, response_model={{ route.response_model }}{% endif %}{% if route.status_code %}, status_code={{ route.status_code }}{% endif %})
async def {{ route.operation_id }}(
    {%- for param in route.params %}
    {{ param.name }}: {{ param.type }}{{ param.default }},
    {%- endfor %}
{% if route.request_body %}    body: {{ route.request_body }} = Body(...),
{% endif %}):
    """{{ route.summary }}

    {{ route.description }}"""
    # TODO: Implement {{ route.operation_id }}
    # Return type: {{ route.response_model or "Dict[str, Any]" }}
    raise NotImplementedError("Endpoint {{ route.method.upper() }} {{ route.path }} not yet implemented")

{% endfor %}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "{{ port }}"))
    uvicorn.run(app, host="0.0.0.0", port=port)
'''

TEST_TEMPLATE = '''"""
Tests for {{ project_name }}

Auto-generated from OpenAPI specification by IDP Platform.
"""
import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


def test_health():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

{% for test in tests %}
def test_{{ test.operation_id }}():
    """Test {{ test.method.upper() }} {{ test.path }} endpoint."""
    response = client.{{ test.method }}("{{ test.test_path }}"{% if test.json_data %}, json={{ test.json_data }}{% endif %})
    # TODO: Update assertions once endpoint is implemented
    assert response.status_code in [{{ test.expected_status }}, 501]
{% endfor %}
'''


class OpenAPIGeneratorService:
    """Service for generating FastAPI code from OpenAPI specifications."""

    def validate_spec(self, spec_content: str, file_format: str) -> dict:
        """
        Parse and validate an OAS file.

        Args:
            spec_content: Raw file content as string.
            file_format: "yaml" or "json".

        Returns:
            Parsed spec as dict.

        Raises:
            ValueError: If spec is invalid with user-friendly message.
        """
        try:
            # Parse YAML or JSON
            if file_format == "yaml":
                spec_dict = yaml.safe_load(spec_content)
            else:
                spec_dict = json.loads(spec_content)

            # Check OpenAPI version
            if "openapi" not in spec_dict:
                if "swagger" in spec_dict:
                    raise ValueError("Swagger 2.0 is not supported. Please use OpenAPI 3.0 or later.")
                raise ValueError("Not a valid OpenAPI specification. Missing 'openapi' field.")

            version = spec_dict.get("openapi", "")
            if not version.startswith("3."):
                raise ValueError(f"OpenAPI version {version} is not supported. Please use OpenAPI 3.0 or later.")

            # Validate spec structure
            validate_spec(spec_dict)

            # Check for required sections
            if "paths" not in spec_dict or not spec_dict["paths"]:
                raise ValueError("OpenAPI specification must define at least one path in the 'paths' section.")

            logger.info(f"Successfully validated OpenAPI {version} specification")
            return spec_dict

        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML format: {str(e)}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {str(e)}")
        except Exception as e:
            raise ValueError(f"OpenAPI validation failed: {str(e)}")

    def generate_models(self, spec_content: str) -> str:
        """
        Generate Pydantic model code from OAS component schemas.

        Args:
            spec_content: Raw spec content for datamodel-codegen.

        Returns:
            Python source code string for models.py, or empty string if no schemas.
        """
        output = io.StringIO()
        input_stream = io.StringIO(spec_content)

        try:
            generate(
                input_=input_stream,
                input_file_type=InputFileType.OpenAPI,
                output=output,
                output_model_type=DataModelType.PydanticV2BaseModel,
                target_python_version=PythonVersion.PY_311,
                use_standard_collections=True,
                use_union_operator=True,
                field_constraints=True,
                capitalise_enum_members=True,
                use_annotated=True,
            )

            result = output.getvalue()

            # Check if any meaningful content was generated
            if not result.strip() or result.strip() == "from __future__ import annotations":
                logger.warning("No schemas found in OpenAPI spec, models.py will be empty")
                return ""

            logger.info("Successfully generated Pydantic models")
            return result

        except Exception as e:
            logger.error(f"Failed to generate models: {e}")
            # Return empty string, routes can still be generated without models
            return ""

    def generate_routes(self, spec_dict: dict, has_models: bool, project_name: str, port: str) -> str:
        """
        Generate FastAPI route handler code from OAS paths.

        Args:
            spec_dict: Parsed OAS spec.
            has_models: Whether models.py was generated.
            project_name: Project name for health endpoint.
            port: Port number for uvicorn.

        Returns:
            Python source code string for main.py.
        """
        info = spec_dict.get("info", {})
        title = info.get("title", project_name.replace("-", " ").title())
        description = info.get("description", f"API for {project_name}")
        version = info.get("version", "1.0.0")

        routes = []
        operation_ids = set()

        for path, path_item in spec_dict.get("paths", {}).items():
            for method in ["get", "post", "put", "patch", "delete"]:
                if method not in path_item:
                    continue

                operation = path_item[method]

                # Generate operation_id
                operation_id = operation.get("operationId")
                if not operation_id:
                    # Generate from method and path
                    operation_id = f"{method}_{path.replace('/', '_').replace('{', '').replace('}', '').replace('-', '_').strip('_')}"

                # Ensure uniqueness
                original_id = operation_id
                counter = 1
                while operation_id in operation_ids:
                    operation_id = f"{original_id}_{counter}"
                    counter += 1
                operation_ids.add(operation_id)

                # Extract parameters
                params = []
                for param in operation.get("parameters", []):
                    param_name = param["name"]
                    param_in = param["in"]
                    required = param.get("required", False)
                    schema = param.get("schema", {})
                    param_type = self._map_type(schema.get("type", "string"))

                    if param_in == "path":
                        default = f' = Path(..., alias="{param_name}")' if param_name != param_name.replace("-", "_") else " = Path(...)"
                        param_name = param_name.replace("-", "_")
                    elif param_in == "query":
                        if required:
                            default = f' = Query(..., alias="{param["name"]}")' if param["name"] != param_name else " = Query(...)"
                        else:
                            default = f' = Query(None, alias="{param["name"]}")' if param["name"] != param_name else " = Query(None)"
                        param_name = param_name.replace("-", "_")
                    else:
                        continue  # Skip header/cookie params for now

                    params.append({
                        "name": param_name,
                        "type": f"Optional[{param_type}]" if not required and param_in == "query" else param_type,
                        "default": default
                    })

                # Extract request body
                request_body = None
                request_body_content = operation.get("requestBody", {}).get("content", {})
                if has_models and "application/json" in request_body_content:
                    schema = request_body_content["application/json"].get("schema", {})
                    if "$ref" in schema:
                        request_body = self._extract_model_name(schema["$ref"])

                # Extract response model
                response_model = None
                if has_models:
                    responses = operation.get("responses", {})
                    for status in ["200", "201", "202"]:
                        if status in responses:
                            response_content = responses[status].get("content", {})
                            if "application/json" in response_content:
                                schema = response_content["application/json"].get("schema", {})
                                if "$ref" in schema:
                                    response_model = self._extract_model_name(schema["$ref"])
                                elif schema.get("type") == "array" and "$ref" in schema.get("items", {}):
                                    item_model = self._extract_model_name(schema["items"]["$ref"])
                                    response_model = f"List[{item_model}]"
                            break

                status_code = 201 if method == "post" else None

                routes.append({
                    "method": method,
                    "path": path,
                    "operation_id": operation_id,
                    "summary": operation.get("summary", f"{method.upper()} {path}"),
                    "description": operation.get("description", ""),
                    "params": params,
                    "request_body": request_body,
                    "response_model": response_model,
                    "status_code": status_code
                })

        # Render Jinja2 template
        template = Template(MAIN_PY_TEMPLATE)
        return template.render(
            title=title,
            description=description,
            version=version,
            project_name=project_name,
            port=port,
            has_models=has_models,
            routes=routes
        )

    def generate_tests(self, spec_dict: dict, project_name: str) -> str:
        """
        Generate basic test stubs for each endpoint.

        Args:
            spec_dict: Parsed OAS spec.
            project_name: Project name.

        Returns:
            Python source code for test_main.py.
        """
        tests = []
        operation_ids = set()

        for path, path_item in spec_dict.get("paths", {}).items():
            for method in ["get", "post", "put", "patch", "delete"]:
                if method not in path_item:
                    continue

                operation = path_item[method]
                operation_id = operation.get("operationId", f"{method}_{path.replace('/', '_').strip('_')}")

                # Ensure uniqueness
                original_id = operation_id
                counter = 1
                while operation_id in operation_ids:
                    operation_id = f"{original_id}_{counter}"
                    counter += 1
                operation_ids.add(operation_id)

                # Replace path parameters with test values
                test_path = path
                for param in operation.get("parameters", []):
                    if param["in"] == "path":
                        test_path = test_path.replace(f"{{{param['name']}}}", "1")

                # Determine expected status
                responses = operation.get("responses", {})
                if method == "post" and "201" in responses:
                    expected_status = 201
                elif "200" in responses:
                    expected_status = 200
                else:
                    expected_status = 200

                # Add test JSON data for POST/PUT/PATCH
                json_data = None
                if method in ["post", "put", "patch"]:
                    request_body = operation.get("requestBody", {}).get("content", {}).get("application/json", {})
                    if request_body:
                        json_data = "{}"  # Placeholder

                tests.append({
                    "operation_id": operation_id,
                    "method": method,
                    "path": path,
                    "test_path": test_path,
                    "expected_status": expected_status,
                    "json_data": json_data
                })

        template = Template(TEST_TEMPLATE)
        return template.render(project_name=project_name, tests=tests)

    def generate_project(
        self,
        spec_content: str,
        file_format: str,
        project_name: str,
        description: str,
        port: str = "8000"
    ) -> Tuple[dict, str, str, str]:
        """
        Full generation pipeline.

        Returns:
            Tuple of (parsed_spec, models_code, main_code, tests_code).
        """
        # Validate and parse spec
        spec_dict = self.validate_spec(spec_content, file_format)

        # Generate models
        models_code = self.generate_models(spec_content)
        has_models = bool(models_code.strip())

        # Generate routes
        main_code = self.generate_routes(spec_dict, has_models, project_name, port)

        # Generate tests
        tests_code = self.generate_tests(spec_dict, project_name)

        return spec_dict, models_code, main_code, tests_code

    def inject_generated_code(
        self,
        project_path: Path,
        models_code: str,
        main_code: str,
        tests_code: str,
        spec_content: str,
        file_format: str
    ):
        """
        Inject generated code into rendered Cookiecutter template.

        Args:
            project_path: Path to rendered project directory.
            models_code: Generated models.py content.
            main_code: Generated main.py content.
            tests_code: Generated test_main.py content.
            spec_content: Original OAS spec content.
            file_format: "yaml" or "json".
        """
        # Write main.py
        main_file = project_path / "src" / "main.py"
        main_file.parent.mkdir(parents=True, exist_ok=True)
        main_file.write_text(main_code)
        logger.info(f"Injected main.py at {main_file}")

        # Write models.py (if generated)
        if models_code.strip():
            models_file = project_path / "src" / "models.py"
            models_file.write_text(models_code)
            logger.info(f"Injected models.py at {models_file}")
        else:
            # Create empty models.py
            models_file = project_path / "src" / "models.py"
            models_file.write_text("# No models generated from OpenAPI spec\n")

        # Write test_main.py
        test_file = project_path / "tests" / "test_main.py"
        test_file.parent.mkdir(parents=True, exist_ok=True)
        test_file.write_text(tests_code)
        logger.info(f"Injected test_main.py at {test_file}")

        # Write original OAS spec
        spec_filename = f"openapi.{file_format if file_format == 'json' else 'yaml'}"
        spec_file = project_path / spec_filename
        spec_file.write_text(spec_content)
        logger.info(f"Copied original spec to {spec_file}")

    def _map_type(self, oas_type: str) -> str:
        """Map OpenAPI types to Python types."""
        type_map = {
            "string": "str",
            "integer": "int",
            "number": "float",
            "boolean": "bool",
            "array": "List[Any]",
            "object": "Dict[str, Any]"
        }
        return type_map.get(oas_type, "str")

    def _extract_model_name(self, ref: str) -> str:
        """Extract model name from $ref path."""
        # Example: "#/components/schemas/User" -> "User"
        return ref.split("/")[-1]


# Global instance
openapi_generator = OpenAPIGeneratorService()
