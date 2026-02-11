"""
{{ cookiecutter.description }}
"""
from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator
import os

app = FastAPI(
    title="{{ cookiecutter.project_name }}",
    description="{{ cookiecutter.description }}",
    version="0.1.0"
)

# Initialize Prometheus instrumentation
Instrumentator().instrument(app).expose(app)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to {{ cookiecutter.project_name }}",
        "version": "0.1.0"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "{{ cookiecutter.project_name }}"
    }


@app.get("/hello")
async def hello():
    """Custom hello endpoint."""
    return {
        "message": "hello, welcome to my IDP"
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "{{ cookiecutter.port }}"))
    uvicorn.run(app, host="0.0.0.0", port=port)
