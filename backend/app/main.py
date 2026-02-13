"""
Main FastAPI application entry point.
"""
import logging
import time
import uuid

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.core.logging import setup_logging
from app.core.metrics import http_request_duration, http_requests_total
from app.middleware.request_id import request_id_var
from app.api.v1 import projects, templates, auth, analytics, health

# Configure structured JSON logging
setup_logging(debug=settings.debug)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Internal Developer Platform API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


@app.middleware("http")
async def observability_and_security_middleware(request, call_next):
    """Attach request tracing, record Prometheus metrics, and add security headers."""
    # --- Request tracing ---
    request_id = str(uuid.uuid4())
    ctx_token = request_id_var.set(request_id)
    start_time = time.time()

    try:
        response = await call_next(request)

        # --- Prometheus metrics ---
        duration = time.time() - start_time
        # Normalize path: cap at 4 segments to avoid high cardinality from path params
        parts = request.url.path.split("/")
        normalized_path = "/".join(parts[:4]) if len(parts) > 4 else request.url.path
        http_request_duration.labels(
            method=request.method,
            path=normalized_path,
            status_code=str(response.status_code),
        ).observe(duration)
        http_requests_total.labels(
            method=request.method,
            path=normalized_path,
            status_code=str(response.status_code),
        ).inc()

        # --- Observability header ---
        response.headers["X-Request-ID"] = request_id

        # --- Security headers ---
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        if not settings.debug:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )

        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' http://localhost:* https://api.github.com"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        return response
    finally:
        request_id_var.reset(ctx_token)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add session middleware for CSRF protection
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret_key,
    https_only=not settings.debug,
    same_site="lax"
)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized successfully")


# --- Observability endpoint ---

@app.get("/metrics")
async def metrics_endpoint():
    """Expose Prometheus metrics for scraping."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# --- Health check router (defines /health, /health/ready, /health/live) ---
app.include_router(health.router)

# --- API routers ---

app.include_router(
    auth.router,
    prefix=f"{settings.api_v1_prefix}/auth",
    tags=["authentication"]
)

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

app.include_router(
    analytics.router,
    prefix=f"{settings.api_v1_prefix}/analytics",
    tags=["analytics"]
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
