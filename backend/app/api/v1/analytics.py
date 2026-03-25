from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import (
    DashboardStatsResponse,
    PlatformOverviewResponse,
    ProjectsOverTimeResponse,
    TemplateUsageResponse
)

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics for current user

    Returns:
    - Total projects count
    - Active, failed, and building projects counts
    - Recent projects (last 5)
    - Template usage breakdown
    """
    return AnalyticsService.get_user_dashboard_stats(db, current_user.id)


@router.get("/overview", response_model=PlatformOverviewResponse)
async def get_platform_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get platform-wide overview (admin only)

    Returns:
    - Total projects and users
    - Active users in last 30 days
    - Success rate
    - Projects breakdown by status and template
    - Average deployment time

    Requires admin role.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return AnalyticsService.get_platform_overview(db)


@router.get("/projects-over-time", response_model=ProjectsOverTimeResponse)
async def get_projects_over_time(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get project creation time series (admin only)

    Args:
    - days: Number of days to look back (default: 30)

    Returns:
    - Array of data points with date and count
    - Total projects count

    Requires admin role.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return AnalyticsService.get_projects_over_time(db, days)


@router.get("/template-usage", response_model=TemplateUsageResponse)
async def get_template_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get template usage breakdown (admin only)

    Returns:
    - Array of templates with count, percentage, and success rate
    - Total projects count

    Requires admin role.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return AnalyticsService.get_template_usage(db)
