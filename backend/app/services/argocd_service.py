"""
ArgoCD service for managing applications.
"""
import logging
import httpx
from typing import Optional, Dict

from app.core.config import settings
from app.core.metrics import track_external_call

logger = logging.getLogger(__name__)


class ArgoCDService:
    """Service for interacting with ArgoCD API."""

    def __init__(self):
        self.base_url = settings.argocd_url.rstrip("/")
        self.username = settings.argocd_username
        self.password = settings.argocd_password
        self.namespace = settings.argocd_namespace
        self.token: Optional[str] = None

        # SSL verification configuration
        if not settings.argocd_verify_ssl:
            logger.warning("ArgoCD SSL verification is DISABLED - not recommended for production")
            self.verify_ssl = False
        elif settings.argocd_ca_cert_path:
            # Custom CA certificate for self-signed certs
            logger.info(f"Using custom CA certificate: {settings.argocd_ca_cert_path}")
            self.verify_ssl = settings.argocd_ca_cert_path
        else:
            # Default SSL verification
            self.verify_ssl = True

    def _invalidate_token(self):
        """Invalidate the cached token to force re-authentication."""
        self.token = None
        logger.info("ArgoCD token invalidated")

    async def _get_token(self, force_refresh: bool = False) -> str:
        """
        Get authentication token from ArgoCD.

        Args:
            force_refresh: Force getting a new token even if one is cached.

        Returns:
            Authentication token.
        """
        if self.token and not force_refresh:
            return self.token

        with track_external_call("argocd", "authenticate"):
            async with httpx.AsyncClient(verify=self.verify_ssl) as client:
                try:
                    response = await client.post(
                        f"{self.base_url}/api/v1/session",
                        json={"username": self.username, "password": self.password}
                    )
                    response.raise_for_status()
                    self.token = response.json()["token"]
                    logger.info("Successfully authenticated with ArgoCD")
                    return self.token
                except Exception as e:
                    logger.error(f"Failed to authenticate with ArgoCD: {e}")
                    raise Exception(f"ArgoCD authentication failed: {e}")

    async def create_application(
        self,
        app_name: str,
        repo_url: str,
        path: str = "helm",
        namespace: str = None,
        auto_sync: bool = True
    ) -> Dict:
        """
        Create an ArgoCD application.

        Args:
            app_name: Name of the application.
            repo_url: Git repository URL.
            path: Path to Helm chart in repository.
            namespace: Kubernetes namespace to deploy to.
            auto_sync: Enable automatic synchronization.

        Returns:
            Created application details.

        Raises:
            Exception: If application creation fails.
        """
        token = await self._get_token()
        target_namespace = namespace or settings.kube_namespace

        application = {
            "metadata": {
                "name": app_name,
                "namespace": self.namespace
            },
            "spec": {
                "project": "default",
                "source": {
                    "repoURL": repo_url,
                    "targetRevision": "HEAD",
                    "path": path,
                    "helm": {
                        "releaseName": app_name
                    }
                },
                "destination": {
                    "server": "https://kubernetes.default.svc",
                    "namespace": target_namespace
                },
                "syncPolicy": {}
            }
        }

        if auto_sync:
            application["spec"]["syncPolicy"] = {
                "automated": {
                    "prune": True,
                    "selfHeal": True
                },
                "syncOptions": [
                    "CreateNamespace=true"
                ]
            }

        with track_external_call("argocd", "create_application"):
            async with httpx.AsyncClient(verify=self.verify_ssl) as client:
                try:
                    logger.info(f"Creating ArgoCD application: {app_name}")

                    response = await client.post(
                        f"{self.base_url}/api/v1/applications",
                        json=application,
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    response.raise_for_status()

                    logger.info(f"ArgoCD application created: {app_name}")
                    return response.json()

                except httpx.HTTPStatusError as e:
                    # Check if error is due to expired token (code 16 = Unauthenticated in gRPC)
                    error_text = e.response.text
                    if "token is expired" in error_text or "invalid session" in error_text or e.response.status_code == 401:
                        logger.warning("ArgoCD token expired, refreshing and retrying...")
                        self._invalidate_token()

                        # Retry with fresh token
                        new_token = await self._get_token(force_refresh=True)
                        retry_response = await client.post(
                            f"{self.base_url}/api/v1/applications",
                            json=application,
                            headers={"Authorization": f"Bearer {new_token}"}
                        )
                        retry_response.raise_for_status()
                        logger.info(f"ArgoCD application created after token refresh: {app_name}")
                        return retry_response.json()

                    logger.error(f"Failed to create ArgoCD application: {error_text}")
                    raise Exception(f"ArgoCD application creation failed: {error_text}")
                except Exception as e:
                    logger.error(f"Failed to create ArgoCD application: {e}")
                    raise Exception(f"ArgoCD application creation failed: {e}")

    async def get_application(self, app_name: str) -> Optional[Dict]:
        """
        Get ArgoCD application details.

        Args:
            app_name: Name of the application.

        Returns:
            Application details or None if not found.
        """
        token = await self._get_token()

        with track_external_call("argocd", "get_application"):
            async with httpx.AsyncClient(verify=self.verify_ssl) as client:
                try:
                    response = await client.get(
                        f"{self.base_url}/api/v1/applications/{app_name}",
                        headers={"Authorization": f"Bearer {token}"}
                    )

                    if response.status_code == 404:
                        return None

                    response.raise_for_status()
                    return response.json()

                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 404:
                        return None
                    logger.error(f"Failed to get ArgoCD application: {e}")
                    return None
                except Exception as e:
                    logger.error(f"Failed to get ArgoCD application: {e}")
                    return None

    async def get_application_status(self, app_name: str) -> Optional[str]:
        """
        Get the sync status of an ArgoCD application.

        Args:
            app_name: Name of the application.

        Returns:
            Sync status string or None if not found.
        """
        app = await self.get_application(app_name)
        if app:
            return app.get("status", {}).get("sync", {}).get("status")
        return None

    async def delete_application(self, app_name: str):
        """
        Delete an ArgoCD application.

        Args:
            app_name: Name of the application.
        """
        token = await self._get_token()

        with track_external_call("argocd", "delete_application"):
            async with httpx.AsyncClient(verify=self.verify_ssl) as client:
                try:
                    response = await client.delete(
                        f"{self.base_url}/api/v1/applications/{app_name}",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    response.raise_for_status()
                    logger.info(f"Deleted ArgoCD application: {app_name}")

                except Exception as e:
                    logger.error(f"Failed to delete ArgoCD application: {e}")
                    raise Exception(f"ArgoCD application deletion failed: {e}")

    async def sync_application(self, app_name: str):
        """
        Manually trigger sync for an ArgoCD application.

        Args:
            app_name: Name of the application.
        """
        token = await self._get_token()

        with track_external_call("argocd", "sync_application"):
            async with httpx.AsyncClient(verify=self.verify_ssl) as client:
                try:
                    response = await client.post(
                        f"{self.base_url}/api/v1/applications/{app_name}/sync",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    response.raise_for_status()
                    logger.info(f"Triggered sync for ArgoCD application: {app_name}")

                except Exception as e:
                    logger.error(f"Failed to sync ArgoCD application: {e}")
                    raise Exception(f"ArgoCD application sync failed: {e}")


# Global instance
argocd_service = ArgoCDService()
