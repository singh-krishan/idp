# Internal Developer Platform (IDP)

A cloud-hosted Internal Developer Platform that automates the creation and deployment of microservices with full CI/CD, monitoring, and analytics capabilities.

🌐 **Live Platform**: [https://kris-idp.org](https://kris-idp.org)

## Overview

The IDP provides a web portal where developers can create production-ready microservices with a single click. The platform automatically:

- ✅ Generates project code from templates (including OpenAPI specifications)
- ✅ Creates GitHub repository with CI/CD pipeline
- ✅ Builds and publishes Docker images to GitHub Container Registry
- ✅ Deploys to Kubernetes (k3s) using ArgoCD
- ✅ Sets up Prometheus metrics and Grafana dashboards
- ✅ Provides HTTPS access with automatic SSL certificates
- ✅ Tracks analytics and platform metrics

## Architecture

### Cloud Infrastructure

The platform runs on a **dual-EC2 architecture** on AWS:

```
┌─────────────────────────────────────────────────────────────────┐
│                          AWS Cloud                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EC2 Instance #1 (13.42.53.7)                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🌐 kris-idp.org (HTTPS)                                  │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌─────────────┐                       │  │
│  │  │   Frontend  │  │   Backend   │                       │  │
│  │  │   (React)   │  │  (FastAPI)  │                       │  │
│  │  │   + Nginx   │  │  + SQLite   │                       │  │
│  │  └─────────────┘  └─────────────┘                       │  │
│  │                                                           │  │
│  │  Private IP: 172.31.46.112                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          │ ArgoCD API + Metrics                 │
│                          ↓                                      │
│  EC2 Instance #2 (18.133.74.27)                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ☸️  k3s Kubernetes Cluster                               │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │
│  │  │   ArgoCD    │  │ Prometheus  │  │   Grafana   │     │  │
│  │  │  (GitOps)   │  │ (Metrics)   │  │ (Dashboards)│     │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │   Deployed Microservices (User Projects)           │ │  │
│  │  │   • krisacc-svc-1, krisacc-svc-2, ...             │ │  │
│  │  │   • Each with: Deployment, Service, Ingress        │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │                                                           │  │
│  │  Private IP: 172.31.2.204                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment Flow

```
Developer → https://kris-idp.org
              ↓
         React Frontend
              ↓
         FastAPI Backend
              ↓
    ┌─────────┴──────────┐
    ↓                    ↓
GitHub API          ArgoCD API (EC2 #2)
    ↓                    ↓
Creates Repo        Creates Application
+ Helm Chart             ↓
    ↓              Syncs to k3s Cluster
GitHub Actions           ↓
    ↓              Deployment + Service + Ingress
Builds Docker            ↓
    ↓              https://kris-idp.org/PROJECT-NAME/*
Pushes to GHCR
```

### Key Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **IDP Platform** | https://kris-idp.org | Main web portal |
| **Prometheus** | https://prometheus-idp.duckdns.org | Metrics collection |
| **Grafana** | https://grafana-idp.duckdns.org | Monitoring dashboards |
| **Deployed Services** | https://kris-idp.org/`{project-name}`/* | Your microservices |

## Features

### 🎯 Core Capabilities

- **Multi-Template Support**: Python FastAPI, Node.js Express, OpenAPI-generated, Apache Camel YAML DSL
- **OpenAPI Code Generation**: Upload OpenAPI 3.x spec → Get typed FastAPI service
- **One-Click Deployment**: From form submission to live service in 2-5 minutes
- **GitOps Workflow**: GitHub + GitHub Actions + ArgoCD + k3s
- **Built-in Monitoring**: Prometheus metrics + Grafana dashboards
- **HTTPS by Default**: Automatic SSL via NGINX reverse proxy
- **User Authentication**: JWT-based auth with password reset
- **Analytics Dashboard**: Track project creation, deployments, and platform usage

### 📦 Available Templates

#### 1. Python Microservice
- **Framework**: FastAPI 0.109.0
- **Features**:
  - Async request handlers
  - Pydantic v2 validation
  - Pytest test suite
  - Health check endpoint
  - Prometheus metrics instrumentation
  - OpenAPI documentation auto-generated
- **Default Port**: 8000

#### 2. Node.js API
- **Framework**: Express.js 4.18.2
- **Features**:
  - RESTful API structure
  - Jest test suite
  - Health check endpoint
  - Prometheus metrics (prom-client)
  - Error handling middleware
- **Default Port**: 3000

#### 3. OpenAPI Microservice ⭐ NEW
- **Framework**: FastAPI (auto-generated)
- **Features**:
  - Upload OpenAPI 3.x specification (.yaml/.json)
  - Automatic code generation:
    - Pydantic models from schemas
    - Route handlers with type hints
    - Request/response validation
    - TODO comments for implementation
  - Full deployment pipeline included
  - Preserves original spec in repo
- **Default Port**: 8000

#### 4. Apache Camel YAML DSL ⭐ NEW
- **Framework**: Apache Camel on Quarkus 3.17.5
- **Features**:
  - Upload your own Camel YAML routes file
  - Drag-and-drop file upload with validation
  - Supports REST DSL, HTTP, Timer, Direct, and more
  - Quarkus runtime with Java 17
  - Health checks at `/q/health`
  - Prometheus metrics at `/q/metrics`
  - WireMock integration for mock backends
- **Default Port**: 8080
- **Supported Camel Components**: platform-http, rest, jackson, bean, http, timer, log, direct, microprofile-health

### 🔐 Security

- **Authentication**: JWT tokens with 30-minute expiry
- **HTTPS Everywhere**: All traffic encrypted via Let's Encrypt
- **Secret Management**: GitHub tokens stored securely in backend env
- **Redaction**: Sensitive data redacted in logs and responses
- **CORS**: Configured for production domain only

### 📊 Monitoring & Observability

**Prometheus Metrics** (Auto-collected from all services):
- HTTP request rate and latency
- Response status codes (2xx, 4xx, 5xx)
- Background task execution
- External API performance (GitHub, ArgoCD)
- Custom metrics from deployed services

**Grafana Dashboards**:
- **IDP Platform Metrics**: Platform health and performance
- **Project Analytics**: Creation success/failure rates
- **Service Metrics**: Individual microservice monitoring

**Access Monitoring**:
- Prometheus: https://prometheus-idp.duckdns.org
- Grafana: https://grafana-idp.duckdns.org
  - Username: `admin`
  - Password: See `MONITORING_ACCESS_GUIDE.md`

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **State Management**: React Context API
- **Deployment**: NGINX (Docker)

### Backend
- **Framework**: FastAPI 0.109.0
- **Language**: Python 3.11
- **Database**: SQLAlchemy + SQLite (production), Alembic migrations
- **Authentication**: JWT tokens (python-jose)
- **Validation**: Pydantic v2
- **Templating**: Cookiecutter
- **Git Integration**: PyGithub
- **Code Generation**: datamodel-code-generator, openapi-spec-validator
- **Metrics**: Prometheus (prometheus-fastapi-instrumentator)
- **Deployment**: Docker (FastAPI + Uvicorn)

### Infrastructure
- **Container Orchestration**: k3s (lightweight Kubernetes)
- **GitOps**: ArgoCD 2.x
- **Container Registry**: GitHub Container Registry (GHCR)
- **CI/CD**: GitHub Actions
- **Reverse Proxy**: NGINX with SSL termination
- **Certificates**: Let's Encrypt (manual setup)
- **DNS**: DuckDNS for monitoring subdomains
- **Cloud Provider**: AWS EC2 (Ubuntu 22.04, Amazon Linux 2023)

### Package Managers
- **Helm**: v3 (Kubernetes deployments)
- **Python**: pip + venv
- **Node.js**: npm

## Getting Started (For Users)

### Access the Platform

1. Visit **https://kris-idp.org**
2. Click "Login" or "Sign Up"
3. Create an account or use demo credentials (if available)

### Create Your First Microservice

#### Option 1: Use a Built-in Template

1. Click **"Create New Project"**
2. Select a template:
   - **Python Microservice** for FastAPI services
   - **Node.js API** for Express.js services
3. Fill in the form:
   - **Project Name**: `my-first-service` (lowercase, hyphens allowed)
   - **Description**: Brief description of your service
   - **Port**: Default is fine (8000 for Python, 3000 for Node.js)
   - **Author**: Your name
   - **GitHub Org**: Your GitHub username or organization
4. Click **"Create Project"**
5. Watch the status: `pending` → `creating_repo` → `building` → `deploying` → `active`

#### Option 2: Deploy a Camel YAML Integration

1. Click **"Create New Project"**
2. Select **"Apache Camel YAML DSL"** template
3. **Upload your Camel YAML routes file**:
   - Supported formats: `.yaml`, `.yml`
   - Must contain Camel route definitions (`route`, `from`, or `rest` keys)
   - Max file size: 1MB
4. Fill in **Project Name** and **Description**
5. Click **"Create Project"**
6. Platform will:
   - Validate your YAML routes
   - Inject routes into the Quarkus/Camel project
   - Build with Maven + Java 17
   - Deploy to k3s cluster with correct health probes

#### Option 3: Generate from OpenAPI Specification

1. Click **"Create New Project"**
2. Select **"OpenAPI Microservice"** template
3. Fill in the form and **upload your OpenAPI spec file**:
   - Supported formats: `.yaml`, `.yml`, `.json`
   - Must be OpenAPI 3.x (Swagger 2.0 not supported)
   - Max file size: 1MB
4. Click **"Create Project"**
5. Platform will:
   - Validate your spec
   - Generate Pydantic models from schemas
   - Generate typed route handlers
   - Create full deployment pipeline
   - Deploy to k3s cluster

### Access Your Service

Once status is **"active"**, your service is live at:

```
https://kris-idp.org/{project-name}/*
```

**Example endpoints:**
- Health check: `https://kris-idp.org/my-first-service/health`
- API docs: `https://kris-idp.org/my-first-service/docs` (FastAPI services)
- Metrics: `https://kris-idp.org/my-first-service/metrics`

### Monitor Your Service

Query your service in **Prometheus**:

```promql
# Check if service is up
up{service="my-first-service"}

# HTTP request rate
rate(http_requests_total{service="my-first-service"}[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="my-first-service"}[5m]))
```

View dashboards in **Grafana**:
1. Visit https://grafana-idp.duckdns.org
2. Login with provided credentials
3. Go to **Dashboards** → **IDP Platform Metrics**

## Development Setup (For Contributors)

### Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- kubectl (for k3s access)
- SSH key for EC2 instances

### Local Development

#### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your GitHub token and settings

# Run database migrations
alembic upgrade head

# Start backend
uvicorn app.main:app --reload --port 8000
```

**API Documentation:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env if needed (default values work for local dev)

# Start dev server
npm run dev
```

Frontend will be available at http://localhost:5173

#### Running Tests

**Backend:**
```bash
cd backend
pytest tests/ -v

# With coverage
pytest tests/ -v --cov=app --cov-report=html
```

**Frontend:**
```bash
cd frontend
npm test

# Watch mode
npm test -- --watch
```

### Docker Compose (Full Stack)

```bash
# Start both frontend and backend
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild after changes
docker-compose up --build

# Stop
docker-compose down
```

## Production Deployment

**⚠️ For production deployment to EC2, see [DEPLOYMENT.md](./DEPLOYMENT.md)**

### Quick Deployment Commands

```bash
# SSH to IDP Application server (EC2 #1)
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.53.7

# Navigate to project
cd /home/ec2-user/idp

# Pull latest changes
git pull origin main

# Deploy both frontend and backend
./deploy.sh both

# Or deploy individually
./deploy.sh backend  # Includes database migrations
./deploy.sh frontend
```

**Production URL**: https://kris-idp.org

### Monitoring Production

```bash
# SSH to k3s cluster (EC2 #2)
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@18.133.74.27

# Check deployed projects
kubectl get pods,svc,ingress

# Check ArgoCD applications
kubectl get applications -n argocd

# Check monitoring stack
kubectl get pods -n monitoring

# View logs
kubectl logs -l app={project-name}
```

## Project Structure

```
idp/
├── backend/                    # FastAPI backend application
│   ├── app/
│   │   ├── api/v1/            # API endpoints
│   │   │   ├── projects.py    # Project CRUD + workflow
│   │   │   ├── templates.py   # Template listing
│   │   │   ├── auth.py        # JWT authentication
│   │   │   ├── analytics.py   # Platform analytics
│   │   │   └── health.py      # Health checks
│   │   ├── core/              # Core configuration
│   │   │   ├── config.py      # Settings management
│   │   │   ├── database.py    # SQLAlchemy setup
│   │   │   ├── security.py    # JWT & password hashing
│   │   │   ├── secrets.py     # Secret management
│   │   │   ├── logging.py     # Structured logging
│   │   │   ├── metrics.py     # Prometheus metrics
│   │   │   └── redaction.py   # Sensitive data redaction
│   │   ├── models/            # SQLAlchemy models
│   │   │   ├── project.py     # Project model
│   │   │   └── user.py        # User model
│   │   ├── schemas/           # Pydantic schemas
│   │   │   ├── project.py     # Project DTOs
│   │   │   ├── user.py        # User DTOs
│   │   │   └── analytics.py   # Analytics DTOs
│   │   ├── services/          # Business logic services
│   │   │   ├── template_engine.py        # Cookiecutter rendering
│   │   │   ├── github_service.py         # GitHub API integration
│   │   │   ├── argocd_service.py         # ArgoCD API integration
│   │   │   ├── openapi_generator_service.py  # OAS code generation
│   │   │   └── analytics_service.py      # Analytics aggregation
│   │   ├── templates/         # Cookiecutter templates
│   │   │   ├── python-microservice/
│   │   │   ├── nodejs-api/
│   │   │   ├── openapi-microservice/
│   │   │   └── camel-yaml-api/
│   │   ├── middleware/        # FastAPI middleware
│   │   │   ├── cors.py        # CORS configuration
│   │   │   └── logging.py     # Request logging
│   │   └── main.py            # FastAPI app entry point
│   ├── alembic/               # Database migrations
│   │   ├── versions/          # Migration scripts
│   │   └── env.py
│   ├── tests/                 # Backend tests
│   │   ├── fixtures/          # Test fixtures (OAS files, etc.)
│   │   └── test_*.py
│   ├── scripts/               # Utility scripts
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Backend container
│   └── .env.example           # Environment template
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── ProjectForm.tsx       # Create project form
│   │   │   ├── ProjectList.tsx       # Project listing
│   │   │   ├── TemplateSelector.tsx  # Template chooser
│   │   │   ├── OpenAPIUpload.tsx     # OpenAPI file upload
│   │   │   ├── CamelYAMLUpload.tsx  # Camel YAML routes upload
│   │   │   ├── Login.tsx             # Login form
│   │   │   ├── PasswordReset.tsx     # Password reset
│   │   │   └── StatsCard.tsx         # Analytics cards
│   │   ├── contexts/          # React contexts
│   │   │   └── AuthContext.tsx       # Auth state
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── AnalyticsPage.tsx
│   │   ├── services/          # API clients
│   │   │   └── api.ts         # Axios client + endpoints
│   │   ├── types/             # TypeScript types
│   │   │   ├── project.ts
│   │   │   ├── user.ts
│   │   │   └── analytics.ts
│   │   ├── App.tsx            # Main app component
│   │   ├── main.tsx           # React entry point
│   │   └── index.css          # Global styles
│   ├── public/                # Static assets
│   ├── package.json           # Node dependencies
│   ├── vite.config.ts         # Vite configuration
│   ├── tsconfig.json          # TypeScript config
│   └── Dockerfile             # Frontend container (NGINX)
├── infrastructure/            # Kubernetes & monitoring setup
│   ├── kubernetes/
│   │   └── monitoring/        # Prometheus + Grafana
│   │       ├── namespace.yaml
│   │       ├── prometheus/
│   │       │   ├── deployment.yaml
│   │       │   ├── configmap.yaml     # Scrape configs
│   │       │   ├── service.yaml
│   │       │   └── ingress.yaml
│   │       ├── grafana/
│   │       │   ├── deployment.yaml
│   │       │   ├── configmap-dashboard-idp.yaml
│   │       │   ├── secret.yaml        # Grafana password
│   │       │   ├── service.yaml
│   │       │   └── ingress.yaml
│   │       └── deploy.sh              # Deployment script
│   └── grafana/               # Grafana dashboard JSONs
│       └── idp-platform-metrics.json
├── nginx-ssl.conf             # NGINX reverse proxy config
├── docker-compose.yml         # Local development stack
├── deploy.sh                  # Production deployment script
├── .env.example               # Root environment template
├── DEPLOYMENT.md              # Deployment guide
├── MONITORING_ACCESS_GUIDE.md # Monitoring access guide
├── CHECKPOINT_v1.2.md         # Version checkpoint
├── SECURITY.md                # Security documentation
└── README.md                  # This file
```

## API Reference

### Authentication

**Register**
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Login**
```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=johndoe&password=SecurePass123!
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### Projects

**Create Project (Standard Template)**
```http
POST /api/v1/projects
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "my-service",
  "description": "My new service",
  "template_type": "python-microservice",
  "variables": {
    "port": "8000",
    "author": "John Doe",
    "github_org": "my-org"
  }
}
```

**Create Project (OpenAPI Template)**
```http
POST /api/v1/projects/from-openapi
Authorization: Bearer {token}
Content-Type: multipart/form-data

name=my-api-service
description=API from OpenAPI spec
port=8000
openapi_file=@petstore.yaml
```

**Create Project (Camel YAML Template)**
```http
POST /api/v1/projects/from-camel-yaml
Authorization: Bearer {token}
Content-Type: multipart/form-data

name=my-camel-service
description=Camel integration service
camel_yaml_file=@routes.yaml
```

**List Projects**
```http
GET /api/v1/projects
Authorization: Bearer {token}
```

**Get Project**
```http
GET /api/v1/projects/{project_id}
Authorization: Bearer {token}
```

**Delete Project**
```http
DELETE /api/v1/projects/{project_id}
Authorization: Bearer {token}
```

### Templates

**List Templates**
```http
GET /api/v1/templates
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "name": "python-microservice",
    "display_name": "Python Microservice",
    "description": "FastAPI microservice template",
    "variables": [
      {
        "name": "port",
        "default": "8000",
        "description": "Port"
      }
    ],
    "requires_openapi_upload": false
  }
]
```

### Analytics

**Get Platform Statistics**
```http
GET /api/v1/analytics/stats
Authorization: Bearer {token}
```

**Get Time Series Data**
```http
GET /api/v1/analytics/timeseries?period=7d
Authorization: Bearer {token}
```

## Configuration

### Backend Environment Variables

```env
# GitHub Integration
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_ORG=your-github-username-or-org

# ArgoCD Integration
ARGOCD_URL=http://172.31.2.204:80  # k3s cluster private IP
ARGOCD_USERNAME=admin
ARGOCD_PASSWORD=your-argocd-password

# Authentication
SECRET_KEY=your-secret-key-for-jwt-signing
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=sqlite:///./idp.db

# CORS
CORS_ORIGINS=https://kris-idp.org

# Logging
LOG_LEVEL=INFO
```

### Frontend Environment Variables

```env
# Backend API
VITE_API_URL=https://kris-idp.org/api

# Optional: Analytics
VITE_ANALYTICS_ENABLED=true
```

### NGINX Configuration

See `nginx-ssl.conf` for full reverse proxy configuration:
- SSL termination with Let's Encrypt certificates
- Frontend serving from `/usr/share/nginx/html`
- Backend API proxy to `/api/*`
- Service proxy to deployed microservices
- Monitoring proxy to `/prometheus` and `/grafana` (disabled by default)

## Troubleshooting

### Common Issues

#### "Cannot connect to backend"
- **Cause**: Backend not running or CORS misconfigured
- **Solution**:
  ```bash
  docker logs idp-backend
  # Check CORS_ORIGINS in .env
  ```

#### "GitHub repository creation failed"
- **Cause**: Invalid GitHub token or insufficient permissions
- **Solution**:
  - Verify token has `repo` and `packages:write` scopes
  - Check token hasn't expired
  - Test: `gh auth status`

#### "ArgoCD sync failed"
- **Cause**: ArgoCD unreachable or credentials wrong
- **Solution**:
  ```bash
  ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@18.133.74.27
  kubectl get applications -n argocd
  kubectl logs -n argocd -l app.kubernetes.io/name=argocd-server
  ```

#### "Service not accessible at kris-idp.org"
- **Cause**: Ingress misconfigured or NGINX not routing
- **Solution**:
  ```bash
  # Check ingress
  kubectl get ingress
  kubectl describe ingress {project-name}

  # Check NGINX config
  docker exec idp-frontend nginx -t
  docker exec idp-frontend cat /etc/nginx/conf.d/default.conf
  ```

#### "OpenAPI generation failed"
- **Cause**: Invalid spec or unsupported OpenAPI version
- **Solution**:
  - Ensure spec is OpenAPI 3.x (not Swagger 2.0)
  - Validate spec: https://editor.swagger.io
  - Check backend logs: `docker logs idp-backend | grep -i openapi`

#### "Camel YAML service not starting"
- **Cause**: Missing Camel dependencies for routes used or Java build failure
- **Solution**:
  - Check GitHub Actions build logs for Maven errors
  - Ensure routes only use supported components (rest, http, timer, direct, log, bean, jackson)
  - Quarkus health is at `/q/health` (not `/health`)
  - Java services need ~60s to start — check pod events: `kubectl describe pod -l app={service-name}`

#### "Prometheus not scraping my service"
- **Cause**: Missing Prometheus annotations
- **Solution**:
  ```bash
  # Check pod annotations
  kubectl get pods -l app={service-name} -o yaml | grep prometheus

  # Should see:
  # prometheus.io/scrape: "true"
  # prometheus.io/port: "8000"
  # prometheus.io/path: "/metrics"
  ```

### Getting Help

1. **Check Logs**:
   ```bash
   # Backend
   docker logs idp-backend --tail 100 -f

   # Frontend
   docker logs idp-frontend --tail 100 -f

   # Deployed service
   kubectl logs -l app={service-name}
   ```

2. **Check Status**:
   ```bash
   # IDP containers
   docker ps

   # Kubernetes resources
   kubectl get all
   kubectl get applications -n argocd
   ```

3. **Review Documentation**:
   - `DEPLOYMENT.md` - Production deployment guide
   - `MONITORING_ACCESS_GUIDE.md` - Monitoring setup
   - `CHECKPOINT_v1.2.md` - Current feature set
   - `SECURITY.md` - Security guidelines

## Version History

### v1.3 - Camel YAML DSL Support (2026-03-25)
- ✅ Apache Camel YAML DSL template with Quarkus runtime
- ✅ Drag-and-drop YAML routes file upload with validation
- ✅ WireMock integration for mock backends
- ✅ Fixed health probe paths for Quarkus services (`/q/health`)
- ✅ Updated EC2 IPs after Elastic IP removal
- ✅ Cleaned up orphaned k8s resources

### v1.2 - OpenAPI Feature Complete (2026-02-13)
- ✅ OpenAPI microservice generation from spec files
- ✅ UI redesign with template-first flow
- ✅ Fixed duplicate field issues
- ✅ Improved code generation (models + routes + tests)
- ✅ Production deployment with HTTPS
- ✅ Comprehensive monitoring setup

### v1.1 - Initial OpenAPI Implementation
- Initial OpenAPI template (had bugs)
- Basic code generation

### v1.0 - MVP Release
- Python and Node.js templates
- GitHub + ArgoCD integration
- Basic monitoring

## Roadmap

### Planned Features

- [ ] **Multi-Cluster Support**: Deploy to different environments (dev, staging, prod)
- [ ] **Template Marketplace**: Browse and share community templates
- [ ] **Cost Tracking**: Resource usage and cost estimation per project
- [ ] **Rollback Mechanism**: One-click rollback to previous versions
- [ ] **Webhook Integration**: Real-time build status updates from GitHub
- [ ] **Custom Domains**: Automatic DNS + SSL for custom domains
- [ ] **Team Management**: Organization-based access control
- [ ] **Audit Logs**: Full audit trail of all platform actions
- [ ] **Resource Quotas**: Limit CPU/memory per project
- [ ] **Database Templates**: PostgreSQL, MongoDB, Redis templates
- [ ] **Scheduled Scaling**: Auto-scaling based on time or metrics

### Future Enhancements

- Support for other languages (Go, Java, Rust)
- Visual workflow builder (drag-and-drop)
- Built-in API gateway
- Service mesh integration (Istio, Linkerd)
- Policy enforcement (OPA)
- Secrets management (Vault integration)

## Contributing

We welcome contributions! Here's how:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Add tests**: Ensure existing tests pass and add new ones
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines

- Follow existing code style (Black for Python, Prettier for TypeScript)
- Write tests for new features
- Update documentation (README, DEPLOYMENT, etc.)
- Keep commits atomic and well-described
- Ensure all tests pass: `pytest` (backend), `npm test` (frontend)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For questions, issues, or feature requests:

- 📧 **Email**: (your email)
- 🐛 **Issues**: [GitHub Issues](https://github.com/singh-krishan/idp/issues)
- 📖 **Documentation**: See `docs/` directory
- 🌐 **Live Demo**: https://kris-idp.org

## Acknowledgments

- **FastAPI** - High-performance Python web framework
- **React** - UI library
- **ArgoCD** - GitOps continuous delivery
- **Prometheus & Grafana** - Monitoring and observability
- **Cookiecutter** - Project templating
- **k3s** - Lightweight Kubernetes

---

**Built with ❤️ by Krishan Singh**

**Live Platform**: [https://kris-idp.org](https://kris-idp.org)
