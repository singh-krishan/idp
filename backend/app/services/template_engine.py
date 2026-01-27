"""
Template engine service using Cookiecutter.
"""
import os
import shutil
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
from cookiecutter.main import cookiecutter

from app.core.config import settings

logger = logging.getLogger(__name__)


class TemplateEngine:
    """Service for rendering project templates using Cookiecutter."""

    def __init__(self):
        self.templates_dir = Path(settings.templates_dir)
        self.temp_dir = Path(settings.temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def list_templates(self) -> List[Dict]:
        """
        List all available templates.

        Returns:
            List of template metadata dictionaries.
        """
        templates = []

        if not self.templates_dir.exists():
            logger.warning(f"Templates directory not found: {self.templates_dir}")
            return templates

        for template_dir in self.templates_dir.iterdir():
            if template_dir.is_dir() and (template_dir / "cookiecutter.json").exists():
                try:
                    metadata = self._get_template_metadata(template_dir)
                    templates.append(metadata)
                except Exception as e:
                    logger.error(f"Error reading template {template_dir.name}: {e}")

        return templates

    def _get_template_metadata(self, template_path: Path) -> Dict:
        """
        Get metadata for a template.

        Args:
            template_path: Path to template directory.

        Returns:
            Template metadata dictionary.
        """
        cookiecutter_json = template_path / "cookiecutter.json"

        with open(cookiecutter_json, 'r') as f:
            config = json.load(f)

        # Extract variables from cookiecutter.json
        variables = []
        for key, value in config.items():
            if key.startswith("_"):
                continue

            variables.append({
                "name": key,
                "default": value,
                "type": "string",
                "description": f"{key.replace('_', ' ').title()}"
            })

        return {
            "name": template_path.name,
            "display_name": template_path.name.replace("-", " ").title(),
            "description": f"{template_path.name} template",
            "variables": variables
        }

    def render_template(
        self,
        template_name: str,
        project_name: str,
        variables: Optional[Dict] = None
    ) -> Path:
        """
        Render a template with given variables.

        Args:
            template_name: Name of the template to use.
            project_name: Name of the project to create.
            variables: Additional template variables.

        Returns:
            Path to the rendered project directory.

        Raises:
            ValueError: If template not found.
            Exception: If rendering fails.
        """
        template_path = self.templates_dir / template_name

        if not template_path.exists():
            raise ValueError(f"Template '{template_name}' not found")

        # Prepare cookiecutter context
        extra_context = variables or {}
        extra_context["project_name"] = project_name

        # Create unique output directory
        output_dir = self.temp_dir / f"{project_name}-{os.urandom(4).hex()}"
        output_dir.mkdir(parents=True, exist_ok=True)

        try:
            logger.info(f"Rendering template '{template_name}' for project '{project_name}'")

            # Render template with cookiecutter
            result_path = cookiecutter(
                str(template_path),
                extra_context=extra_context,
                output_dir=str(output_dir),
                no_input=True
            )

            logger.info(f"Template rendered successfully at: {result_path}")
            return Path(result_path)

        except Exception as e:
            logger.error(f"Failed to render template: {e}")
            # Cleanup on failure
            if output_dir.exists():
                shutil.rmtree(output_dir)
            raise

    def cleanup_rendered_template(self, project_path: Path):
        """
        Clean up a rendered template directory.

        Args:
            project_path: Path to the rendered project.
        """
        try:
            if project_path.exists() and project_path.is_relative_to(self.temp_dir):
                # Get the parent directory (the unique temp directory we created)
                temp_parent = project_path.parent
                shutil.rmtree(temp_parent)
                logger.info(f"Cleaned up template directory: {temp_parent}")
        except Exception as e:
            logger.error(f"Failed to cleanup template directory: {e}")


# Global instance
template_engine = TemplateEngine()
