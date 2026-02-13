"""
Comprehensive health check endpoints for Kubernetes probes and monitoring.

Endpoints:
    GET /health        – Full check (database, GitHub, ArgoCD, disk space).
    GET /health/ready  – Kubernetes readiness probe (database only).
    GET /health/live   – Kubernetes liveness probe (always 200 if alive).
"""
import logging
import shutil

import httpx
from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Full health check.  Returns the status of every platform dependency.
    """
    # --- Database (sync, but SELECT 1 is sub-millisecond) ---
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        database = {
            "status": "healthy",
            "driver": settings.database_url.split("://")[0],
        }
    except Exception as e:
        logger.warning("Health check: database unhealthy", extra={"error": str(e)})
        database = {"status": "unhealthy", "error": str(e)}

    # --- GitHub reachability ---
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get("https://api.github.com/rate_limit")
        github = (
            {"status": "healthy"}
            if resp.status_code == 200
            else {"status": "unhealthy", "status_code": resp.status_code}
        )
    except Exception as e:
        logger.warning("Health check: github unreachable", extra={"error": str(e)})
        github = {"status": "unhealthy", "error": str(e)}

    # --- ArgoCD reachability (401 is acceptable — proves it is up) ---
    try:
        async with httpx.AsyncClient(
            timeout=5.0, verify=settings.argocd_verify_ssl
        ) as client:
            resp = await client.get(f"{settings.argocd_url}/api/v1/applications")
        argocd = (
            {"status": "healthy"}
            if resp.status_code in (200, 401)
            else {"status": "unhealthy", "status_code": resp.status_code}
        )
    except Exception as e:
        logger.warning("Health check: argocd unreachable", extra={"error": str(e)})
        argocd = {"status": "unhealthy", "error": str(e)}

    # --- Disk space ---
    try:
        usage = shutil.disk_usage(settings.temp_dir)
        free_pct = round((usage.free / usage.total) * 100, 1)
        disk = {
            "status": "healthy" if free_pct > 5 else "warning",
            "free_percent": free_pct,
            "free_gb": round(usage.free / (1024**3), 2),
        }
    except Exception as e:
        logger.warning("Health check: disk check failed", extra={"error": str(e)})
        disk = {"status": "unhealthy", "error": str(e)}

    checks = {
        "database": database,
        "github": github,
        "argocd": argocd,
        "disk": disk,
    }

    overall_healthy = all(c["status"] in ("healthy", "warning") for c in checks.values())

    return {
        "status": "healthy" if overall_healthy else "unhealthy",
        "app": settings.app_name,
        "version": "0.1.0",
        "checks": checks,
    }


@router.get("/health/ready")
async def readiness_check():
    """
    Kubernetes readiness probe.  Only checks database connectivity.
    Returns 503 if the database is unavailable.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")

    return {"status": "ready"}


@router.get("/health/live")
async def liveness_check():
    """
    Kubernetes liveness probe.  Returns 200 if the process is alive.
    """
    return {"status": "alive"}
