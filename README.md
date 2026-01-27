# Internal Developer Platform (IDP) MVP

A lightweight Internal Developer Platform that automates the creation of microservices with full CI/CD and monitoring capabilities.

## Overview

This IDP provides a web portal where developers can create new microservices with a single click. The platform automatically:
- Generates project code from templates
- Creates GitHub repository with CI/CD pipeline
- Builds and pushes Docker images
- Deploys to Kubernetes using ArgoCD
- Sets up monitoring (Dynatrace or Prometheus)

## Architecture

```
Developer → React Portal → FastAPI Backend → GitHub API
                                ↓
                    Creates: Repo + GH Actions + Helm Chart
                                ↓
                    GitHub Actions builds Docker image
                                ↓
                    ArgoCD syncs to local Kubernetes
                                ↓
                    Dynatrace monitors automatically
```

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Python 3.11+ FastAPI + SQLAlchemy + Pydantic
- **Database**: SQLite
- **Templating**: Cookiecutter
- **Git Integration**: PyGithub
- **Container Orchestration**: kind (Kubernetes in Docker)
- **GitOps**: ArgoCD
- **Monitoring**: Dynatrace OneAgent or Prometheus/Grafana

## Prerequisites

Before starting, ensure you have the following installed:

- **Docker Desktop** (v20.10+)
- **kubectl** (v1.25+)
- **kind** (v0.20+)
- **Node.js** (v18+)
- **Python** (v3.11+)
- **GitHub Personal Access Token** with repo and packages permissions

### Installing Prerequisites

**macOS:**
```bash
brew install docker kubectl kind node python@3.11
```

**Linux:**
```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# kind
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind

# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python 3.11
sudo apt-get install python3.11 python3.11-venv python3-pip
```

## Quick Start

### 1. Clone the Repository

```bash
cd /Users/krishansingh/Documents/claude_ai/idp
```

### 2. Set Up Infrastructure

```bash
# Create kind cluster and install ArgoCD
bash infrastructure/setup-cluster.sh
```

This will:
- Create a local Kubernetes cluster using kind
- Install ingress controller
- Install ArgoCD
- Display ArgoCD admin password

### 3. Configure Environment Variables

**Backend (.env):**
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set:
```env
GITHUB_TOKEN=ghp_your_github_personal_access_token
GITHUB_ORG=your-github-username-or-org
ARGOCD_PASSWORD=<password-from-setup-script>
```

**Frontend (.env):**
```bash
cd frontend
cp .env.example .env
# Default values should work for local development
```

### 4. Start ArgoCD Port Forward

In a separate terminal:
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Keep this running. You can access ArgoCD UI at `https://localhost:8080`

### 5. Start the Application

```bash
# From project root
docker-compose up
```

This will start:
- **Backend API** at http://localhost:8000
- **Frontend UI** at http://localhost:5173

### 6. Create Your First Project

1. Open http://localhost:5173 in your browser
2. Fill in the project creation form:
   - **Project Name**: `my-first-service` (lowercase, hyphens allowed)
   - **Description**: A test microservice
   - **Template**: Select "Python Microservice" or "Node.js API"
3. Click "Create Project"
4. Watch the status change from "pending" → "creating_repo" → "building" → "deploying" → "active"

### 7. Verify Deployment

**Check GitHub:**
```bash
# Repository should be created
open https://github.com/YOUR_ORG/my-first-service

# GitHub Actions should be running
gh run list --repo YOUR_ORG/my-first-service
```

**Check ArgoCD:**
```bash
kubectl get applications -n argocd
# Should show your new application

# Or view in UI
open https://localhost:8080
```

**Check Kubernetes:**
```bash
kubectl get pods
kubectl get services

# Access the service
kubectl port-forward svc/my-first-service 8000:80
curl http://localhost:8000/health
```

## Development

### Backend Development

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend
uvicorn app.main:app --reload --port 8000
```

**API Documentation:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will be available at http://localhost:5173

### Running Tests

**Backend:**
```bash
cd backend
pytest tests/ -v
```

**Frontend:**
```bash
cd frontend
npm test
```

## Project Structure

```
idp/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Configuration and database
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── templates/    # Cookiecutter templates
│   ├── tests/
│   └── requirements.txt
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API client
│   │   └── types/        # TypeScript types
│   └── package.json
├── infrastructure/       # K8s and ArgoCD setup
│   ├── kind-config.yaml
│   ├── setup-cluster.sh
│   └── argocd/
└── docker-compose.yml    # Local development
```

## Available Templates

### Python Microservice
- FastAPI application
- Health check endpoint
- Pytest test suite
- Multi-stage Dockerfile
- GitHub Actions CI/CD
- Helm chart for K8s deployment

### Node.js API
- Express.js application
- Health check endpoint
- Jest test suite
- Multi-stage Dockerfile
- GitHub Actions CI/CD
- Helm chart for K8s deployment

## Adding Custom Templates

1. Create a new directory in `backend/app/templates/`
2. Add `cookiecutter.json` with template variables
3. Create template structure under `{{cookiecutter.project_name}}/`
4. Include: source code, Dockerfile, GitHub Actions workflow, Helm chart
5. Restart backend to load the new template

See existing templates for reference.

## Monitoring Setup

### Option 1: Dynatrace (Production)

See [infrastructure/dynatrace/setup.md](infrastructure/dynatrace/setup.md) for full Dynatrace integration.

### Option 2: Prometheus + Grafana (Development)

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Username: admin, Password: prom-operator
```

## Troubleshooting

### Backend won't start
- Check that PostgreSQL is running (or using SQLite)
- Verify `.env` file exists with correct values
- Check GitHub token has correct permissions

### Frontend can't connect to backend
- Ensure backend is running on port 8000
- Check CORS origins in backend configuration
- Verify `VITE_API_URL` in frontend `.env`

### ArgoCD can't sync
- Check ArgoCD credentials in backend `.env`
- Verify repository exists and is accessible
- Check ArgoCD Application resource: `kubectl get applications -n argocd`

### GitHub Actions failing
- Verify GITHUB_TOKEN has packages:write permission
- Check workflow logs in GitHub UI
- Ensure Dockerfile builds locally: `docker build -t test .`

### Kind cluster issues
```bash
# Delete and recreate cluster
kind delete cluster --name idp-cluster
bash infrastructure/setup-cluster.sh
```

## API Reference

### Projects

**Create Project**
```
POST /api/v1/projects
{
  "name": "my-service",
  "description": "My new service",
  "template_type": "python-microservice",
  "variables": {}
}
```

**List Projects**
```
GET /api/v1/projects
```

**Get Project**
```
GET /api/v1/projects/{project_id}
```

### Templates

**List Templates**
```
GET /api/v1/templates
```

**Get Template**
```
GET /api/v1/templates/{template_name}
```

## Cleanup

```bash
# Stop docker-compose
docker-compose down

# Delete kind cluster
kind delete cluster --name idp-cluster

# Remove local database
rm backend/idp.db
```

## Next Steps

- Add authentication (GitHub OAuth)
- Support multiple Kubernetes clusters
- Add template marketplace
- Implement webhook for build status updates
- Add resource quotas and cost tracking
- Support custom domains with cert-manager
- Add rollback capabilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/YOUR_ORG/idp/issues
- Documentation: See docs/ directory
