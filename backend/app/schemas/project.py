"""
Pydantic schemas for project API requests and responses.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, validator


class ProjectBase(BaseModel):
    """Base project schema with common fields."""
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    template_type: str = Field(..., description="Template to use (e.g., python-microservice)")

    @validator("name")
    def validate_name(cls, v):
        """Validate project name follows naming conventions."""
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Project name must contain only alphanumeric characters, hyphens, and underscores")
        if v.startswith("-") or v.startswith("_"):
            raise ValueError("Project name cannot start with hyphen or underscore")
        return v.lower()


class ProjectCreate(ProjectBase):
    """Schema for creating a new project."""
    variables: Optional[dict] = Field(default_factory=dict, description="Template-specific variables")


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""
    description: Optional[str] = None
    status: Optional[str] = None
    github_repo_url: Optional[str] = None
    github_repo_name: Optional[str] = None
    argocd_app_name: Optional[str] = None
    error_message: Optional[str] = None


class ProjectResponse(ProjectBase):
    """Schema for project response."""
    id: str
    github_repo_url: Optional[str] = None
    github_repo_name: Optional[str] = None
    argocd_app_name: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TemplateInfo(BaseModel):
    """Schema for template information."""
    name: str
    display_name: str
    description: str
    variables: list[dict]  # List of {name, description, default, type}


class ProjectListResponse(BaseModel):
    """Schema for listing projects."""
    total: int
    projects: list[ProjectResponse]
