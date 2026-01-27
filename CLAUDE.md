# CLAUDE.md

This file provides guidance to Claude Code when working with the IDP Platform codebase.

## Project Overview

Internal Developer Platform (IDP) - A microservice creation and deployment automation platform.

**Purpose**: Enable developers to create production-ready microservices with full CI/CD and monitoring through a web interface.

## Build and Development Commands

### Prerequisites Check
```bash
# Verify all tools are installed
docker --version
kubectl version --client
kind --version
node --version
python3 --version
```

### Infrastructure Setup
```bash
# One-time setup: Create kind cluster and install ArgoCD
bash infrastructure/setup-cluster.sh

# Start ArgoCD port-forward (keep running in separate terminal)
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get ArgoCD admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### Backend Development
```bash
cd backend

# Setup Python environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend server
uvicorn app.main:app --reload --port 8000

# Run tests
pytest tests/ -v

# Format code
black app/
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Docker Compose (Full Stack)
```bash
# Start both frontend and backend
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Kubernetes Operations
```bash
# View all pods
kubectl get pods

# View ArgoCD applications
kubectl get applications -n argocd

# View logs of a deployment
kubectl logs deployment/my-service

# Port forward to a service
kubectl port-forward svc/my-service 8000:80

# Delete a deployment
kubectl delete deployment my-service
```

## Architecture Overview

### High-Level Flow
```
User → React UI → FastAPI Backend → [Template Engine, GitHub, ArgoCD] → Kubernetes
```

### Components

**Frontend (React + TypeScript)**
- `src/components/ProjectForm.tsx`: Main form for creating projects
- `src/components/ProjectList.tsx`: Display created projects and status
- `src/components/TemplateSelector.tsx`: Template selection UI
- `src/services/api.ts`: API client for backend communication

**Backend (FastAPI + Python)**
- `app/main.py`: FastAPI application entry point
- `app/api/v1/projects.py`: Project CRUD endpoints and orchestration
- `app/api/v1/templates.py`: Template listing endpoints
- `app/services/template_engine.py`: Cookiecutter integration
- `app/services/github_service.py`: GitHub API client (PyGithub)
- `app/services/argocd_service.py`: ArgoCD API client
- `app/models/project.py`: SQLAlchemy database models
- `app/schemas/project.py`: Pydantic validation schemas

**Templates (Cookiecutter)**
- `app/templates/python-microservice/`: FastAPI service template
- `app/templates/nodejs-api/`: Express.js service template
- Each template includes: source code, Dockerfile, GitHub Actions, Helm chart

**Infrastructure**
- `infrastructure/kind-config.yaml`: Local Kubernetes cluster config
- `infrastructure/setup-cluster.sh`: One-command infrastructure setup
- `infrastructure/argocd/install.sh`: ArgoCD installation script

### Data Flow

1. User submits project creation form (React)
2. Frontend calls `POST /api/v1/projects` (Axios)
3. Backend validates request (Pydantic)
4. Background task starts:
   - Template Engine renders Cookiecutter template
   - GitHub Service creates repository and pushes code
   - ArgoCD Service creates Application resource
5. GitHub Actions builds Docker image and pushes to GHCR
6. ArgoCD syncs Helm chart to Kubernetes
7. Service is deployed and monitored
8. Frontend polls status and displays to user

## Project-Specific Conventions

### Code Style

**Python (Backend)**
- Use Black for formatting (line length: 88)
- Type hints required for all function signatures
- Docstrings for public functions (Google style)
- Async/await for I/O operations (GitHub API, ArgoCD API)
- Pydantic for data validation
- SQLAlchemy for database models

**TypeScript (Frontend)**
- Functional components with hooks
- Props interfaces for all components
- Axios for HTTP requests
- Tailwind CSS for styling
- Strict TypeScript mode enabled

**Naming Conventions**
- Python: snake_case for functions/variables, PascalCase for classes
- TypeScript: camelCase for variables/functions, PascalCase for components/types
- Files: kebab-case for multi-word files
- Database: snake_case for tables and columns

### Directory Structure Rules

**Backend Templates**
- Each template must have `cookiecutter.json` at root
- Template files go under `{{cookiecutter.project_name}}/`
- Required files: Dockerfile, .github/workflows/ci.yml, helm/, README.md
- Templates are automatically discovered by scanning `app/templates/`

**Frontend Components**
- One component per file
- Component file names match component name (PascalCase.tsx)
- Co-locate types if component-specific, otherwise use `types/`

### Environment Variables

**Required Backend Variables**
- `GITHUB_TOKEN`: GitHub Personal Access Token (repo + packages scope)
- `GITHUB_ORG`: GitHub organization or username
- `ARGOCD_PASSWORD`: ArgoCD admin password (from setup script)

**Optional Backend Variables**
- `DATABASE_URL`: SQLite by default, can use PostgreSQL
- `DEBUG`: Enable debug logging (default: false)
- `ARGOCD_URL`: ArgoCD API URL (default: http://localhost:8080)

**Frontend Variables**
- `VITE_API_URL`: Backend API URL (default: http://localhost:8000)

### Database Models

- All models inherit from `Base` (SQLAlchemy declarative base)
- Use UUID for primary keys (String(36) in SQLite)
- Include `created_at` and `updated_at` timestamps
- Status fields use string enums, not database enums (SQLite limitation)

### API Design

- RESTful endpoints under `/api/v1/`
- Use Pydantic schemas for request/response validation
- Background tasks for long-running operations (project creation)
- Return appropriate HTTP status codes (201 for creation, 204 for deletion)
- Include error details in response body

### Testing

**Backend Tests**
- Unit tests for services (mock external APIs)
- Integration tests for endpoints (use TestClient)
- Fixtures in `conftest.py`
- Mock GitHub and ArgoCD clients

**Frontend Tests**
- Component tests with React Testing Library
- Mock API calls with MSW or jest.mock
- Test user interactions and form validation

### Kubernetes Resources

**Helm Chart Requirements**
- `Chart.yaml`: Metadata
- `values.yaml`: Default values
- `templates/deployment.yaml`: Deployment resource
- `templates/service.yaml`: Service resource
- `templates/_helpers.tpl`: Template helpers
- Optional: ingress.yaml, configmap.yaml

**Naming**
- Resources named after project (e.g., `my-service`)
- Labels: `app: <project-name>`
- Namespace: `default` (configurable)

## Common Tasks

### Adding a New Template

1. Create directory: `backend/app/templates/my-template/`
2. Add `cookiecutter.json` with variables
3. Create `{{cookiecutter.project_name}}/` with:
   - Source code
   - Dockerfile
   - `.github/workflows/ci.yml`
   - `helm/` directory with chart
   - README.md
   - tests/
4. Test rendering: `cookiecutter backend/app/templates/my-template/`
5. Restart backend to load template

### Debugging Project Creation

1. Check backend logs: `docker-compose logs backend`
2. Check database: `sqlite3 backend/idp.db "SELECT * FROM projects;"`
3. Check GitHub: `gh repo view ORG/PROJECT`
4. Check ArgoCD: `kubectl get applications -n argocd`
5. Check pods: `kubectl get pods -l app=PROJECT`

### Modifying API Endpoints

1. Update Pydantic schema in `app/schemas/`
2. Update SQLAlchemy model in `app/models/` if needed
3. Modify endpoint in `app/api/v1/`
4. Update frontend types in `frontend/src/types/`
5. Update frontend API client in `frontend/src/services/api.ts`
6. Update component using the endpoint

### Infrastructure Reset

```bash
# Delete everything and start fresh
kind delete cluster --name idp-cluster
rm backend/idp.db
docker-compose down -v
bash infrastructure/setup-cluster.sh
```

## Error Handling Patterns

**Backend**
- Raise `HTTPException` with appropriate status code
- Include detailed error message in `detail` field
- Log errors with context (project name, template, etc.)
- Catch external API errors (GitHub, ArgoCD) and convert to user-friendly messages

**Frontend**
- Display errors in red alert boxes
- Clear errors on successful actions
- Show loading states during async operations
- Provide retry mechanisms for transient errors

## Security Considerations

- GitHub token stored in backend environment only
- ArgoCD password not exposed to frontend
- CORS configured for specific origins only
- SQLite database not exposed publicly
- GitHub repos can be private (configurable)
- No authentication on MVP (add OAuth for production)

## Performance Optimization

- Project creation runs in background task
- Frontend polls for status updates (5-second interval)
- Template rendering uses temp directory cleanup
- Database uses indexes on `name` field
- Docker multi-stage builds reduce image size

## Known Limitations (MVP)

- Single user (no authentication)
- Local Kubernetes only (kind cluster)
- SQLite database (not production-ready)
- No rollback mechanism
- No multi-cluster support
- Manual ArgoCD password configuration
- No resource quotas or limits

## Future Enhancements

See README.md "Next Steps" section for planned features.
