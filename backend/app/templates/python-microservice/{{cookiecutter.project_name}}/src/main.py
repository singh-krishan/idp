"""
{{ cookiecutter.description }}
"""
from fastapi import FastAPI
import os

app = FastAPI(
    title="{{ cookiecutter.project_name }}",
    description="{{ cookiecutter.description }}",
    version="0.1.0"
)


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


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "{{ cookiecutter.port }}"))
    uvicorn.run(app, host="0.0.0.0", port=port)
