"""
Main FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import projects, templates

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Internal Developer Platform API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized successfully")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": "0.1.0"
    }


# Include API routers
app.include_router(
    projects.router,
    prefix=f"{settings.api_v1_prefix}/projects",
    tags=["projects"]
)

app.include_router(
    templates.router,
    prefix=f"{settings.api_v1_prefix}/templates",
    tags=["templates"]
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
