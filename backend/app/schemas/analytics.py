from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime


class DashboardStatsResponse(BaseModel):
    """User dashboard statistics"""
    total_projects: int
    active_projects: int
    failed_projects: int
    building_projects: int  # pending + creating_repo + building + deploying
    recent_projects: List['ProjectResponse']  # Last 5 projects
    template_usage: Dict[str, int]  # template_type -> count


class PlatformOverviewResponse(BaseModel):
    """Platform-wide analytics (admin only)"""
    total_projects: int
    total_users: int
    active_users_30d: int  # Users with projects created in last 30 days
    success_rate: float  # Percentage of projects in 'active' status
    projects_by_status: Dict[str, int]
    projects_by_template: Dict[str, int]
    avg_deployment_time_minutes: float  # Average time from creation to active


class ProjectTimeSeriesPoint(BaseModel):
    """Single point in time series"""
    date: str  # ISO format date (YYYY-MM-DD)
    count: int


class ProjectsOverTimeResponse(BaseModel):
    """Projects created over time"""
    data_points: List[ProjectTimeSeriesPoint]
    total_projects: int


class TemplateUsageItem(BaseModel):
    """Template usage statistics"""
    template_type: str
    count: int
    percentage: float
    success_rate: float


class TemplateUsageResponse(BaseModel):
    """Template breakdown"""
    templates: List[TemplateUsageItem]
    total_projects: int


class ProjectQueryParams(BaseModel):
    """Query parameters for project list"""
    search: Optional[str] = None
    status: Optional[str] = None
    template_type: Optional[str] = None
    sort_by: str = "created_at"  # created_at, name, status
    sort_order: str = "desc"  # asc, desc
    page: int = 1
    page_size: int = 10


# Import ProjectResponse to resolve forward reference
from app.schemas.project import ProjectResponse

DashboardStatsResponse.model_rebuild()
