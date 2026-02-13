# How to Push Docker Images to GitHub Container Registry (GHCR)

The `docker-image.yml` workflow file has been added to your Python microservice template.

## For New Projects

New projects created by the IDP will automatically include:
- `.github/workflows/docker-image.yml` - Automated Docker build & push to GHCR
- `.github/workflows/ci.yml` - Testing workflow

These workflows will automatically build and push Docker images to GHCR on every push to main.

## For Existing Projects

To add the workflow files to existing projects:

### Option 1: Manually Add the Workflow File

1. Navigate to your project repository
2. Create `.github/workflows/docker-image.yml` with this content:

```yaml
name: Build & Publish Docker image (GHCR)

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

permissions:
  contents: read
  packages: write

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: singh-krishan/<YOUR_PROJECT_NAME>

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up QEMU (for cross-building arm64 on GitHub runner)
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Docker metadata (tags/labels)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,format=short,prefix=sha-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build (PR) / Build+Push (main)
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile
          platforms: linux/arm64
          push: ${{ github.event_name == 'push' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

3. Replace `<YOUR_PROJECT_NAME>` with your actual project name
4. Commit and push

### Option 2: Use the IDP API (Coming Soon)

We're working on an endpoint to update existing projects with new workflow files.

## Enabling GitHub Actions

After adding the workflow file:

1. Go to your repository Settings
2. Navigate to Actions → General
3. Enable "Allow all actions and reusable workflows"
4. Set Workflow permissions to "Read and write permissions"
5. Click Save

## Triggering the Build

Push a commit to main branch or manually trigger the workflow from the Actions tab.

## Making the Image Public

After the first successful build:

1. Go to https://github.com/singh-krishan?tab=packages
2. Click on your package
3. Click Package settings
4. Under Danger Zone, click "Change visibility"
5. Select "Public"

This allows Kubernetes to pull the image without authentication.

## Verifying the Build

1. Check the Actions tab in your repository
2. View the workflow run
3. Confirm the image was pushed to GHCR
4. Your Kubernetes deployment will automatically pull the new image

## Template Location

The workflow template is located at:
`backend/app/templates/python-microservice/{{cookiecutter.project_name}}/.github/workflows/docker-image.yml`

All new Python microservices created through the IDP will include this workflow automatically.
