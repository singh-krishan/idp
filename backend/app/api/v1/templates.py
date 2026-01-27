"""
API endpoints for template management.
"""
import logging
from typing import List
from fastapi import APIRouter

from app.schemas.project import TemplateInfo
from app.services.template_engine import template_engine

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=List[TemplateInfo])
def list_templates():
    """
    List all available templates.

    Returns:
        List of available templates with their metadata.
    """
    templates = template_engine.list_templates()
    return templates


@router.get("/{template_name}", response_model=TemplateInfo)
def get_template(template_name: str):
    """
    Get details for a specific template.

    Args:
        template_name: Name of the template.

    Returns:
        Template metadata.
    """
    templates = template_engine.list_templates()

    for template in templates:
        if template["name"] == template_name:
            return template

    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail=f"Template '{template_name}' not found")
