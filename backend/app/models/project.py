"""
SQLAlchemy models for projects.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Project(Base):
    """Project model representing a created microservice."""

    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    template_type = Column(String(100), nullable=False)
    github_repo_url = Column(String(500), nullable=True)
    github_repo_name = Column(String(255), nullable=True)
    argocd_app_name = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="pending")
    # Status values: pending, creating_repo, building, deploying, active, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Project(id={self.id}, name={self.name}, status={self.status})>"
