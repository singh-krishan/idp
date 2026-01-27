"""
ArgoCD service for managing applications.
"""
import logging
import httpx
from typing import Optional, Dict

from app.core.config import settings

logger = logging.getLogger(__name__)


class ArgoCDService:
    """Service for interacting with ArgoCD API."""

    def __init__(self):
        self.base_url = settings.argocd_url.rstrip("/")
        self.username = settings.argocd_username
        self.password = settings.argocd_password
        self.namespace = settings.argocd_namespace
        self.verify_ssl = settings.argocd_verify_ssl
        self.token: Optional[str] = None

    async def _get_token(self) -> str:
        """
        Get authentication token from ArgoCD.

        Returns:
            Authentication token.
        """
        if self.token:
            return self.token

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
                logger.error(f"Failed to create ArgoCD application: {e.response.text}")
                raise Exception(f"ArgoCD application creation failed: {e.response.text}")
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
