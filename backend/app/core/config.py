"""
Application configuration using Pydantic Settings.
Loads configuration from environment variables.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional, Union


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "IDP Platform"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: str = "sqlite:///./idp.db"

    # GitHub Configuration
    github_token: str = ""
    github_org: str = ""  # GitHub organization or username
    github_base_url: str = "https://api.github.com"

    # ArgoCD Configuration
    argocd_url: str = "http://localhost:8080"
    argocd_username: str = "admin"
    argocd_password: str = ""
    argocd_namespace: str = "argocd"
    argocd_verify_ssl: bool = False

    # Kubernetes Configuration
    kube_context: str = "kind-idp-cluster"
    kube_namespace: str = "default"

    # Container Registry
    container_registry: str = "ghcr.io"

    # CORS
    cors_origins: Union[list[str], str] = "http://localhost:5173,http://localhost:3000"

    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v

    # Template Configuration
    templates_dir: str = "app/templates"
    temp_dir: str = "/tmp/idp-projects"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


# Global settings instance
settings = Settings()
