"""
API endpoints for project management.
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate, ProjectListResponse
from app.services.template_engine import template_engine
from app.services.github_service import github_service
from app.services.argocd_service import argocd_service

logger = logging.getLogger(__name__)

router = APIRouter()


async def create_project_workflow(
    project_id: str,
    project_name: str,
    template_type: str,
    description: str,
    variables: dict,
    db: Session
):
    """
    Background task for project creation workflow.

    Args:
        project_id: Database project ID.
        project_name: Name of the project.
        template_type: Template to use.
        description: Project description.
        variables: Template variables.
        db: Database session.
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    try:
        # Update status: creating repository
        project.status = "creating_repo"
        db.commit()

        logger.info(f"Starting project creation workflow for: {project_name}")

        # Step 1: Render template
        logger.info(f"Rendering template: {template_type}")
        rendered_path = template_engine.render_template(
            template_name=template_type,
            project_name=project_name,
            variables=variables
        )

        # Step 2: Create GitHub repository
        logger.info(f"Creating GitHub repository: {project_name}")
        repo_url, clone_url = github_service.create_repository(
            repo_name=project_name,
            description=description,
            private=False
        )

        project.github_repo_url = repo_url
        project.github_repo_name = project_name
        db.commit()

        # Step 3: Push files to GitHub
        logger.info(f"Pushing files to GitHub repository: {project_name}")
        github_service.push_files(
            repo_name=project_name,
            project_path=rendered_path
        )

        # Cleanup rendered template
        template_engine.cleanup_rendered_template(rendered_path)

        # Update status: building (GitHub Actions will build)
        project.status = "building"
        db.commit()

        # Step 4: Create ArgoCD application
        logger.info(f"Creating ArgoCD application: {project_name}")
        try:
            await argocd_service.create_application(
                app_name=project_name,
                repo_url=clone_url,
                path="helm",
                auto_sync=True
            )

            project.argocd_app_name = project_name
            project.status = "deploying"
            db.commit()

            logger.info(f"ArgoCD application created: {project_name}")

            # In a real scenario, we would poll ArgoCD for deployment status
            # For now, mark as active
            project.status = "active"
            db.commit()

        except Exception as e:
            logger.warning(f"ArgoCD creation failed (may not be running): {e}")
            # Continue even if ArgoCD fails - project is still created
            project.status = "active"
            project.error_message = f"ArgoCD integration failed: {str(e)}"
            db.commit()

        logger.info(f"Project creation completed: {project_name}")

    except Exception as e:
        logger.error(f"Project creation failed: {e}")
        project.status = "failed"
        project.error_message = str(e)
        db.commit()


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    project_data: ProjectCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Create a new project.

    This endpoint initiates the project creation workflow which includes:
    1. Rendering the template
    2. Creating GitHub repository
    3. Pushing code to GitHub
    4. Creating ArgoCD application
    5. Deploying to Kubernetes

    The workflow runs in the background, and the project status is updated accordingly.
    """
    # Check if project name already exists
    existing = db.query(Project).filter(Project.name == project_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Project '{project_data.name}' already exists")

    # Check if template exists
    templates = template_engine.list_templates()
    template_names = [t["name"] for t in templates]
    if project_data.template_type not in template_names:
        raise HTTPException(
            status_code=400,
            detail=f"Template '{project_data.template_type}' not found. Available: {template_names}"
        )

    # Check if GitHub repository already exists
    if github_service.repository_exists(project_data.name):
        raise HTTPException(
            status_code=400,
            detail=f"GitHub repository '{project_data.name}' already exists"
        )

    # Create database record
    project = Project(
        name=project_data.name,
        description=project_data.description,
        template_type=project_data.template_type,
        status="pending"
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    # Start background workflow
    background_tasks.add_task(
        create_project_workflow,
        project.id,
        project_data.name,
        project_data.template_type,
        project_data.description or "",
        project_data.variables or {},
        db
    )

    return project


@router.get("", response_model=ProjectListResponse)
def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all projects.

    Args:
        skip: Number of projects to skip.
        limit: Maximum number of projects to return.

    Returns:
        List of projects.
    """
    total = db.query(Project).count()
    projects = db.query(Project).offset(skip).limit(limit).all()

    return ProjectListResponse(total=total, projects=projects)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    """
    Get a specific project by ID.

    Args:
        project_id: Project ID.

    Returns:
        Project details.
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a project.

    Args:
        project_id: Project ID.
        project_update: Fields to update.

    Returns:
        Updated project.
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Update fields
    for field, value in project_update.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)

    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    """
    Delete a project.

    Note: This only deletes the database record. It does not delete the GitHub
    repository or ArgoCD application.

    Args:
        project_id: Project ID.
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()

    return None
