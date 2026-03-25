"""
Secrets management module for secure credential handling.

This module provides an abstraction layer for loading secrets from different sources:
- Environment variables (development)
- AWS Secrets Manager (production on AWS)
- HashiCorp Vault (self-hosted production)
- Kubernetes Secrets (Kubernetes deployments)

Usage:
    from app.core.secrets import get_secret

    github_token = get_secret("GITHUB_TOKEN")
"""
import os
import logging
from typing import Optional, Dict, Any
from enum import Enum

logger = logging.getLogger(__name__)


class SecretsBackend(str, Enum):
    """Supported secrets backend providers."""
    ENV = "env"  # Environment variables
    AWS_SECRETS_MANAGER = "aws"  # AWS Secrets Manager
    VAULT = "vault"  # HashiCorp Vault
    KUBERNETES = "k8s"  # Kubernetes Secrets


# Current backend (default to environment variables)
SECRETS_BACKEND = os.getenv("SECRETS_BACKEND", SecretsBackend.ENV.value)


def get_secret(secret_name: str, default: Optional[str] = None) -> str:
    """
    Get a secret from the configured secrets backend.

    Args:
        secret_name: Name of the secret to retrieve
        default: Default value if secret not found

    Returns:
        Secret value as string

    Raises:
        ValueError: If secret not found and no default provided
    """
    if SECRETS_BACKEND == SecretsBackend.ENV.value:
        return _get_secret_from_env(secret_name, default)
    elif SECRETS_BACKEND == SecretsBackend.AWS_SECRETS_MANAGER.value:
        return _get_secret_from_aws(secret_name, default)
    elif SECRETS_BACKEND == SecretsBackend.VAULT.value:
        return _get_secret_from_vault(secret_name, default)
    elif SECRETS_BACKEND == SecretsBackend.KUBERNETES.value:
        return _get_secret_from_kubernetes(secret_name, default)
    else:
        raise ValueError(f"Unsupported secrets backend: {SECRETS_BACKEND}")


def _get_secret_from_env(secret_name: str, default: Optional[str] = None) -> str:
    """Load secret from environment variable."""
    value = os.getenv(secret_name, default)

    if value is None:
        raise ValueError(f"Secret '{secret_name}' not found in environment variables")

    return value


def _get_secret_from_aws(secret_name: str, default: Optional[str] = None) -> str:
    """
    Load secret from AWS Secrets Manager.

    Requires: boto3, AWS credentials configured
    """
    try:
        import boto3
        import json
        from botocore.exceptions import ClientError

        # Create Secrets Manager client
        session = boto3.session.Session()
        client = session.client(
            service_name='secretsmanager',
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )

        try:
            response = client.get_secret_value(SecretId=secret_name)

            # Parse secret (could be string or JSON)
            if 'SecretString' in response:
                secret = response['SecretString']
                try:
                    # Try to parse as JSON
                    secret_dict = json.loads(secret)
                    # If it's a dict, return the first value
                    if isinstance(secret_dict, dict):
                        return list(secret_dict.values())[0]
                    return secret
                except json.JSONDecodeError:
                    return secret
            else:
                # Binary secret
                return response['SecretBinary'].decode('utf-8')

        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                if default is not None:
                    return default
                raise ValueError(f"Secret '{secret_name}' not found in AWS Secrets Manager")
            raise

    except ImportError:
        logger.error("boto3 not installed. Install with: pip install boto3")
        raise


def _get_secret_from_vault(secret_name: str, default: Optional[str] = None) -> str:
    """
    Load secret from HashiCorp Vault.

    Requires: hvac, VAULT_ADDR and VAULT_TOKEN environment variables
    """
    try:
        import hvac

        vault_addr = os.getenv('VAULT_ADDR')
        vault_token = os.getenv('VAULT_TOKEN')

        if not vault_addr or not vault_token:
            raise ValueError("VAULT_ADDR and VAULT_TOKEN must be set for Vault backend")

        client = hvac.Client(url=vault_addr, token=vault_token)

        if not client.is_authenticated():
            raise ValueError("Vault authentication failed")

        # Read secret (assumes KV v2 secrets engine at 'secret/')
        mount_point = os.getenv('VAULT_MOUNT_POINT', 'secret')
        secret_path = os.getenv('VAULT_SECRET_PATH', 'idp')

        try:
            response = client.secrets.kv.v2.read_secret_version(
                path=f"{secret_path}/{secret_name}",
                mount_point=mount_point
            )

            secret_data = response['data']['data']
            return secret_data.get('value', secret_data.get(secret_name))

        except hvac.exceptions.InvalidPath:
            if default is not None:
                return default
            raise ValueError(f"Secret '{secret_name}' not found in Vault")

    except ImportError:
        logger.error("hvac not installed. Install with: pip install hvac")
        raise


def _get_secret_from_kubernetes(secret_name: str, default: Optional[str] = None) -> str:
    """
    Load secret from Kubernetes Secret.

    Secrets are mounted as files in /var/run/secrets/<secret-name>
    """
    secret_file = f"/var/run/secrets/{secret_name}"

    try:
        with open(secret_file, 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        if default is not None:
            return default
        raise ValueError(f"Secret '{secret_name}' not found in Kubernetes secrets")


def redact_secret(value: str, show_chars: int = 4) -> str:
    """
    Redact a secret value for logging.

    Args:
        value: Secret value to redact
        show_chars: Number of characters to show at the end

    Returns:
        Redacted string like "ghp_****abcd"

    Example:
        >>> redact_secret("ghp_1234567890abcdef", 4)
        'ghp_****cdef'
    """
    if not value or len(value) <= show_chars:
        return "****"

    prefix = value[:4] if len(value) > 4 else ""
    suffix = value[-show_chars:] if show_chars > 0 else ""

    return f"{prefix}****{suffix}"


def validate_secrets() -> Dict[str, bool]:
    """
    Validate that all required secrets are available.

    Returns:
        Dictionary mapping secret names to availability status
    """
    required_secrets = [
        "JWT_SECRET_KEY",
        "GITHUB_TOKEN",
        "GITHUB_ORG",
        "ARGOCD_PASSWORD",
    ]

    validation_results = {}

    for secret in required_secrets:
        try:
            value = get_secret(secret)
            is_valid = value and len(value) > 0
            validation_results[secret] = is_valid

            if is_valid:
                logger.info(f"Secret '{secret}': {redact_secret(value)}")
            else:
                logger.warning(f"Secret '{secret}' is empty")

        except Exception as e:
            logger.error(f"Failed to load secret '{secret}': {e}")
            validation_results[secret] = False

    return validation_results
