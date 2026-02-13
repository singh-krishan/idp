"""
API endpoints for project management.
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate, ProjectListResponse
from app.services.template_engine import template_engine
from app.services.github_service import github_service
from app.services.argocd_service import argocd_service
from app.middleware.auth import get_current_user
from app.core.metrics import project_creation_total, background_tasks_active

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
    background_tasks_active.inc()
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

        project_creation_total.labels(status="success", template_type=template_type).inc()
        logger.info(f"Project creation completed: {project_name}")

    except Exception as e:
        logger.error(f"Project creation failed: {e}")
        project.status = "failed"
        project.error_message = str(e)
        db.commit()
        project_creation_total.labels(status="failed", template_type=template_type).inc()

    finally:
        background_tasks_active.dec()


async def create_openapi_project_workflow(
    project_id: str,
    project_name: str,
    description: str,
    spec_content: str,
    file_format: str,
    port: str,
    db: Session
):
    """
    Background task for OpenAPI-based project creation workflow.

    Args:
        project_id: Database project ID.
        project_name: Name of the project.
        description: Project description.
        spec_content: OpenAPI specification content.
        file_format: "yaml" or "json".
        port: Application port.
        db: Database session.
    """
    background_tasks_active.inc()
    project = db.query(Project).filter(Project.id == project_id).first()

    try:
        project.status = "creating_repo"
        db.commit()

        logger.info(f"Starting OpenAPI project creation: {project_name}")

        # Step 1: Generate code from OpenAPI spec
        from app.services.openapi_generator_service import openapi_generator
        logger.info(f"Parsing OpenAPI spec and generating code")

        parsed_spec, models_code, main_code, tests_code = openapi_generator.generate_project(
            spec_content=spec_content,
            file_format=file_format,
            project_name=project_name,
            description=description,
            port=port,
        )

        # Step 2: Render Cookiecutter template (infrastructure files)
        logger.info(f"Rendering openapi-microservice template")
        rendered_path = template_engine.render_template(
            template_name="openapi-microservice",
            project_name=project_name,
            variables={
                "description": description,
                "port": port
            }
        )

        # Step 3: Inject generated code into rendered template
        logger.info(f"Injecting generated Python code")
        openapi_generator.inject_generated_code(
            project_path=rendered_path,
            models_code=models_code,
            main_code=main_code,
            tests_code=tests_code,
            spec_content=spec_content,
            file_format=file_format,
        )

        # Step 4: Create GitHub repository
        logger.info(f"Creating GitHub repository: {project_name}")
        repo_url, clone_url = github_service.create_repository(
            repo_name=project_name,
            description=description,
            private=False
        )

        project.github_repo_url = repo_url
        project.github_repo_name = project_name
        db.commit()

        # Step 5: Push files to GitHub
        logger.info(f"Pushing files to GitHub repository: {project_name}")
        github_service.push_files(
            repo_name=project_name,
            project_path=rendered_path
        )

        # Cleanup rendered template
        template_engine.cleanup_rendered_template(rendered_path)

        # Update status: building
        project.status = "building"
        db.commit()

        # Step 6: Create ArgoCD application
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

            # Mark as active
            project.status = "active"
            db.commit()

        except Exception as e:
            logger.warning(f"ArgoCD creation failed (may not be running): {e}")
            project.status = "active"
            project.error_message = f"ArgoCD integration failed: {str(e)}"
            db.commit()

        project_creation_total.labels(status="success", template_type="openapi-microservice").inc()
        logger.info(f"OpenAPI project creation completed: {project_name}")

    except Exception as e:
        logger.error(f"OpenAPI project creation failed: {e}")
        project.status = "failed"
        project.error_message = str(e)
        db.commit()
        project_creation_total.labels(status="failed", template_type="openapi-microservice").inc()

    finally:
        background_tasks_active.dec()


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    project_data: ProjectCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
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

    Requires authentication.
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
        status="pending",
        user_id=current_user.id
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


@router.post("/from-openapi", response_model=ProjectResponse, status_code=201)
async def create_project_from_openapi(
    background_tasks: BackgroundTasks,
    openapi_file: UploadFile = File(..., description="OpenAPI spec file (.yaml or .json)"),
    name: str = Form(..., min_length=1, max_length=255),
    description: str = Form(default=""),
    port: str = Form(default="8000"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new project from an OpenAPI specification file.

    Accepts multipart/form-data with the OAS file and project metadata.
    Generates FastAPI code with typed routes and Pydantic models.

    Requires authentication.
    """
    # Validate file extension
    filename = openapi_file.filename or ""
    if not filename.lower().endswith(('.yaml', '.yml', '.json')):
        raise HTTPException(
            status_code=400,
            detail="File must be .yaml, .yml, or .json"
        )

    # Read and validate file size
    content = await openapi_file.read()
    if len(content) > 1_048_576:  # 1MB limit
        raise HTTPException(
            status_code=400,
            detail="File size must be under 1MB"
        )

    spec_content = content.decode('utf-8')
    file_format = "json" if filename.lower().endswith('.json') else "yaml"

    # Validate OpenAPI spec
    from app.services.openapi_generator_service import openapi_generator
    try:
        openapi_generator.validate_spec(spec_content, file_format)
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid OpenAPI specification: {str(e)}"
        )

    # Validate project name
    name_lower = name.lower()
    if not name_lower.replace("-", "").replace("_", "").isalnum():
        raise HTTPException(
            status_code=400,
            detail="Project name must contain only alphanumeric characters, hyphens, and underscores"
        )

    # Check if project already exists
    existing = db.query(Project).filter(Project.name == name_lower).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Project '{name_lower}' already exists"
        )

    # Check if GitHub repository exists
    if github_service.repository_exists(name_lower):
        raise HTTPException(
            status_code=400,
            detail=f"GitHub repository '{name_lower}' already exists"
        )

    # Create database record
    project = Project(
        name=name_lower,
        description=description or f"API generated from OpenAPI specification",
        template_type="openapi-microservice",
        status="pending",
        user_id=current_user.id,
        openapi_spec_stored=spec_content,
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    # Start background workflow
    background_tasks.add_task(
        create_openapi_project_workflow,
        project.id,
        name_lower,
        description or "",
        spec_content,
        file_format,
        port,
        db
    )

    logger.info(f"Started OpenAPI project creation: {name_lower}")
    return project


@router.get("", response_model=ProjectListResponse)
def list_projects(
    search: Optional[str] = None,
    status: Optional[str] = None,
    template_type: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List projects for the authenticated user with search, filter, sort, and pagination.

    Args:
        search: Search projects by name (case-insensitive)
        status: Filter by project status
        template_type: Filter by template type
        sort_by: Sort by field (created_at, name, status)
        sort_order: Sort order (asc, desc)
        page: Page number (starting from 1)
        page_size: Number of items per page
        current_user: Current authenticated user

    Returns:
        Paginated list of user's projects with metadata

    Requires authentication.
    """
    # Base query - filter by user
    query = db.query(Project).filter(Project.user_id == current_user.id)

    # Apply search filter
    if search:
        query = query.filter(Project.name.ilike(f"%{search}%"))

    # Apply status filter
    if status:
        query = query.filter(Project.status == status)

    # Apply template filter
    if template_type:
        query = query.filter(Project.template_type == template_type)

    # Count total before pagination
    total = query.count()

    # Apply sorting
    if sort_by == "name":
        sort_column = Project.name
    elif sort_by == "status":
        sort_column = Project.status
    else:
        sort_column = Project.created_at

    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Apply pagination
    offset = (page - 1) * page_size
    projects = query.offset(offset).limit(page_size).all()

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    # Convert to response models with computed fields
    response_projects = []
    for p in projects:
        project_dict = {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "template_type": p.template_type,
            "github_repo_url": p.github_repo_url,
            "github_repo_name": p.github_repo_name,
            "argocd_app_name": p.argocd_app_name,
            "status": p.status,
            "error_message": p.error_message,
            "has_openapi_spec": bool(p.openapi_spec_stored),
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }
        response_projects.append(ProjectResponse(**project_dict))

    return ProjectListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        projects=response_projects
    )


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific project by ID.

    Args:
        project_id: Project ID.
        current_user: Current authenticated user.

    Returns:
        Project details.

    Requires authentication. Users can only access their own projects.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a project.

    Args:
        project_id: Project ID.
        project_update: Fields to update.
        current_user: Current authenticated user.

    Returns:
        Updated project.

    Requires authentication. Users can only update their own projects.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Update fields
    for field, value in project_update.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)

    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a project and all its resources.

    This will delete:
    - ArgoCD application (which removes k3s/Kubernetes resources)
    - GitHub repository
    - Database record

    Args:
        project_id: Project ID.
        current_user: Current authenticated user.

    Requires authentication. Users can only delete their own projects.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    logger.info(f"Deleting project: {project.name}")

    # Delete ArgoCD application (this will remove k3s resources)
    if project.argocd_app_name:
        try:
            logger.info(f"Deleting ArgoCD application: {project.argocd_app_name}")
            await argocd_service.delete_application(project.argocd_app_name)
            logger.info(f"ArgoCD application deleted: {project.argocd_app_name}")
        except Exception as e:
            logger.warning(f"Failed to delete ArgoCD application: {e}")
            # Continue with deletion even if ArgoCD fails

    # Delete GitHub repository
    if project.github_repo_name:
        try:
            logger.info(f"Deleting GitHub repository: {project.github_repo_name}")
            github_service.delete_repository(project.github_repo_name)
            logger.info(f"GitHub repository deleted: {project.github_repo_name}")
        except Exception as e:
            logger.warning(f"Failed to delete GitHub repository: {e}")
            # Continue with deletion even if GitHub fails

    # Delete database record
    db.delete(project)
    db.commit()

    logger.info(f"Project deleted successfully: {project.name}")
    return None
