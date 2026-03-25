# OpenAPI Microservice Generation Feature - Implementation Complete

**Date**: 2026-02-13
**Status**: ✅ **READY FOR DEPLOYMENT**

---

## Overview

The IDP Platform now supports automatic microservice generation from OpenAPI Specification files. Users can upload a `.yaml` or `.json` OAS file and the platform will generate a fully functional FastAPI microservice with:

- ✅ Typed Pydantic models from schemas
- ✅ Route handlers with TODO comments
- ✅ Full infrastructure (Dockerfile, Helm charts, GitHub Actions)
- ✅ Automatic deployment to k3s cluster via ArgoCD
- ✅ Prometheus metrics and health endpoints

---

## Implementation Summary

### Backend Changes (11 files)

1. **`backend/requirements.txt`**
   - Added `datamodel-code-generator[http]==0.25.9`
   - Added `openapi-spec-validator==0.7.1`

2. **`backend/alembic/versions/003_add_openapi_spec_column.py`** (NEW)
   - Database migration to add `openapi_spec_stored` column

3. **`backend/app/models/project.py`**
   - Added `openapi_spec_stored = Column(Text, nullable=True)`

4. **`backend/app/services/openapi_generator_service.py`** (NEW)
   - Core service for OAS validation and code generation
   - `validate_spec()` - Validates OpenAPI 3.x specs
   - `generate_models()` - Generates Pydantic models using datamodel-code-generator
   - `generate_routes()` - Generates FastAPI routes with Jinja2 templates
   - `generate_tests()` - Creates test stubs
   - `inject_generated_code()` - Injects code into Cookiecutter template

5. **`backend/app/templates/openapi-microservice/`** (NEW TEMPLATE)
   - `cookiecutter.json` with `_openapi_template: true` flag
   - Complete infrastructure files (Dockerfile, Helm, GitHub Actions)
   - Placeholder Python files (replaced by generator)

6. **`backend/app/schemas/project.py`**
   - Added `ProjectCreateFromOpenAPI` schema
   - Added `has_openapi_spec` field to `ProjectResponse`
   - Added `requires_openapi_upload` field to `TemplateInfo`

7. **`backend/app/services/template_engine.py`**
   - Updated `_get_template_metadata()` to detect `_openapi_template` flag
   - Returns `requires_openapi_upload` in template metadata

8. **`backend/app/api/v1/projects.py`**
   - Added imports: `UploadFile`, `File`, `Form`
   - Added `create_openapi_project_workflow()` background task
   - Added `POST /api/v1/projects/from-openapi` endpoint
   - Updated `list_projects()` to include `has_openapi_spec`

### Frontend Changes (4 files)

9. **`frontend/src/types/project.ts`**
   - Added `requires_openapi_upload: boolean` to `Template` interface

10. **`frontend/src/components/OpenAPIUpload.tsx`** (NEW)
    - Drag-and-drop file upload component
    - Validates file type (.yaml, .yml, .json)
    - 1MB file size limit
    - Visual file preview with remove option

11. **`frontend/src/services/api.ts`**
    - Added `createProjectFromOpenAPI()` method
    - Uses FormData for multipart/form-data upload

12. **`frontend/src/components/ProjectForm.tsx`**
    - Added OpenAPI file upload state
    - Conditional rendering of OpenAPIUpload component
    - Updated submit logic to use correct API endpoint
    - Disabled submit button until file is uploaded (for OAS templates)

13. **`frontend/src/components/TemplateSelector.tsx`**
    - Added purple badge "📄 Requires OpenAPI Spec" for OAS templates

### Test Files (1 file)

14. **`backend/tests/fixtures/petstore.yaml`** (NEW)
    - Sample OpenAPI spec for testing

---

## How It Works

### User Flow

1. **User navigates to Create Project** → https://kris-idp.org
2. **Selects "Openapi Microservice" template** → Badge shows "Requires OpenAPI Spec"
3. **Uploads OAS file** → Drag-and-drop or click to browse (.yaml/.json, max 1MB)
4. **Enters project details** → Name, description, port (default: 8000)
5. **Clicks Create Project** → Background workflow starts

### Backend Workflow

```
1. Validate OAS file (OpenAPI 3.x, valid structure, has paths)
   ↓
2. Generate Pydantic models from schemas (datamodel-code-generator)
   ↓
3. Generate FastAPI routes from paths (Jinja2 templates)
   ↓
4. Generate test stubs (pytest + TestClient)
   ↓
5. Render Cookiecutter template (infrastructure files)
   ↓
6. Inject generated code into template
   ↓
7. Create GitHub repository
   ↓
8. Push all files (code + infra + original OAS)
   ↓
9. GitHub Actions builds Docker image
   ↓
10. Create ArgoCD Application
    ↓
11. Deploy to k3s cluster (EC2 #2)
    ↓
12. Service accessible at https://kris-idp.org/<project-name>/*
```

### Generated Code Structure

```
my-openapi-service/
├── openapi.yaml                 # Original OAS file
├── src/
│   ├── __init__.py
│   ├── main.py                  # Generated FastAPI app with routes
│   └── models.py                # Generated Pydantic models
├── tests/
│   ├── __init__.py
│   └── test_main.py             # Generated test stubs
├── Dockerfile
├── requirements.txt
├── helm/                        # Kubernetes Helm chart
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── ingress.yaml
├── .github/workflows/
│   └── docker-image.yml         # CI/CD pipeline
└── README.md
```

---

## Deployment Steps

### 1. Commit Changes

```bash
git add .
git commit -m "feat: Add OpenAPI microservice generation feature

- Add OAS validation and code generation service
- Create openapi-microservice Cookiecutter template
- Add file upload UI component with drag-and-drop
- Support generating FastAPI code from OAS specs
- Generate Pydantic models using datamodel-code-generator
- Generate route handlers with TODO comments
- Include full infrastructure (Docker, Helm, CI/CD)
- Store original OAS spec in database and repo
"
git push origin main
```

### 2. Deploy Backend to EC2 #1

```bash
# SSH to production server
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97

# Navigate to project
cd /home/ec2-user/idp

# Pull latest code (if using git) or upload new files
# For now, we'll copy updated files directly

# Copy backend files
# (We'll do this from local machine using scp)
```

```bash
# From local machine, copy updated backend files
cd /Users/krishansingh/Documents/claude_ai/idp

# Create tarball
tar -czf backend-openapi-update.tar.gz \
  backend/requirements.txt \
  backend/alembic/versions/003_add_openapi_spec_column.py \
  backend/app/models/project.py \
  backend/app/schemas/project.py \
  backend/app/services/openapi_generator_service.py \
  backend/app/services/template_engine.py \
  backend/app/api/v1/projects.py \
  backend/app/templates/openapi-microservice/

# Upload to server
scp -i ~/.ssh/idp-demo-key-new.pem backend-openapi-update.tar.gz \
  ec2-user@13.42.36.97:/tmp/

# SSH and extract
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97
cd /home/ec2-user/idp
tar -xzf /tmp/backend-openapi-update.tar.gz

# Install new dependencies in container
docker exec idp-backend pip install datamodel-code-generator[http]==0.25.9 openapi-spec-validator==0.7.1

# Run database migration
docker exec idp-backend alembic upgrade head

# Restart backend
cd /home/ec2-user/idp && docker-compose restart backend
```

### 3. Deploy Frontend to EC2 #1

```bash
# From local machine
cd /Users/krishansingh/Documents/claude_ai/idp

# Create frontend tarball
tar -czf frontend-openapi-update.tar.gz \
  frontend/src/types/project.ts \
  frontend/src/components/OpenAPIUpload.tsx \
  frontend/src/components/ProjectForm.tsx \
  frontend/src/components/TemplateSelector.tsx \
  frontend/src/services/api.ts

# Upload
scp -i ~/.ssh/idp-demo-key-new.pem frontend-openapi-update.tar.gz \
  ec2-user@13.42.36.97:/tmp/

# SSH and extract
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97
cd /home/ec2-user/idp
tar -xzf /tmp/frontend-openapi-update.tar.gz

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### 4. Verify Deployment

```bash
# Check backend logs
docker logs idp-backend --tail 50 -f

# Check templates are loaded
curl -s https://kris-idp.org/api/v1/templates | jq '.[] | select(.name=="openapi-microservice")'

# Should show:
# {
#   "name": "openapi-microservice",
#   "display_name": "Openapi Microservice",
#   "description": "openapi-microservice template",
#   "variables": [...],
#   "requires_openapi_upload": true
# }
```

---

## Testing the Feature

### Test Case 1: Create Pet Store API

1. **Login to IDP**: https://kris-idp.org
2. **Click "Create New Project"**
3. **Select Template**: "Openapi Microservice" (should show purple badge)
4. **Upload File**: `backend/tests/fixtures/petstore.yaml`
5. **Enter Details**:
   - Name: `petstore-api-test`
   - Description: `Pet store API from OpenAPI spec`
   - Port: `8000` (default)
6. **Click "Create Project"**
7. **Monitor Status**: Should go through pending → creating_repo → building → deploying → active
8. **Verify**:
   - GitHub repo created: https://github.com/singh-krishan/petstore-api-test
   - Contains generated code (src/main.py, src/models.py)
   - Contains original openapi.yaml
   - Docker image built by GitHub Actions
   - ArgoCD application deployed
   - Service accessible: https://kris-idp.org/petstore-api-test/health

### Test Case 2: Verify Generated Code

```bash
# Clone generated repo
git clone https://github.com/singh-krishan/petstore-api-test
cd petstore-api-test

# Check generated main.py
cat src/main.py
# Should see:
# - FastAPI app
# - Health endpoint
# - listPets endpoint with TODO
# - createPet endpoint with TODO
# - getPet endpoint with TODO

# Check generated models.py
cat src/models.py
# Should see:
# - Pet model with id, name, tag fields
# - CreatePetRequest model

# Check tests
cat tests/test_main.py
# Should see test stubs for each endpoint
```

### Test Case 3: Access Deployed Service

```bash
# Health check
curl https://kris-idp.org/petstore-api-test/health
# {"status":"healthy","service":"petstore-api-test"}

# API docs
open https://kris-idp.org/petstore-api-test/docs

# Try endpoints (will return NotImplementedError)
curl https://kris-idp.org/petstore-api-test/pets
# 501: "Endpoint GET /pets not yet implemented"
```

---

## Features Implemented

### ✅ Core Functionality
- [x] OAS file upload (drag-and-drop + click to browse)
- [x] File validation (extension, size, format)
- [x] OpenAPI 3.x validation
- [x] Pydantic model generation from schemas
- [x] FastAPI route generation from paths
- [x] Test stub generation
- [x] Store original OAS in database and repo
- [x] Full infrastructure generation (Docker, Helm, CI/CD)

### ✅ Code Generation Quality
- [x] Type-safe Pydantic v2 models
- [x] Proper FastAPI decorators (path, query params)
- [x] Response models from OAS responses
- [x] Request bodies from OAS requestBody
- [x] TODO comments for business logic
- [x] Health and metrics endpoints

### ✅ User Experience
- [x] Visual file upload with preview
- [x] Template badge showing OAS requirement
- [x] Form validation (file required for OAS templates)
- [x] Error messages for invalid OAS files
- [x] Background processing with status updates

### ✅ Infrastructure
- [x] Separate Cookiecutter template
- [x] Database migration for spec storage
- [x] Multipart/form-data API endpoint
- [x] Integration with existing GitHub + ArgoCD workflow

---

## Known Limitations

1. **OpenAPI Version**: Only supports OpenAPI 3.x (not Swagger 2.0)
2. **File Size**: Maximum 1MB upload
3. **Schema Support**: Basic schemas only (complex references may not work perfectly)
4. **Endpoint Stubs**: All endpoints return NotImplementedError (by design)
5. **Parameter Types**: Header and cookie parameters not yet supported
6. **Authentication**: OAS security schemes not implemented

---

## Future Enhancements

1. **Code Completion**: Pre-fill common CRUD operations
2. **Multiple Files**: Support multi-file OAS specs ($ref to external files)
3. **Swagger 2.0**: Add converter for older specs
4. **Custom Templates**: Allow users to customize code generation templates
5. **Live Preview**: Show generated code before creating project
6. **Diff View**: Compare changes when re-uploading OAS spec
7. **Implementation Hints**: Add more detailed TODO comments with examples

---

## Rollback Plan

If issues occur:

```bash
# SSH to server
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97

# Restore previous backend image
cd /home/ec2-user/idp
docker-compose down
docker-compose up -d

# Rollback database migration
docker exec idp-backend alembic downgrade -1

# Check status
docker ps
docker logs idp-backend --tail 50
```

---

## Success Metrics

After deployment, monitor:
- [ ] No errors in backend logs
- [ ] Template list includes "openapi-microservice"
- [ ] UI shows file upload for OAS template
- [ ] Can successfully create project from petstore.yaml
- [ ] Generated code compiles without errors
- [ ] Service deploys to k3s cluster
- [ ] Endpoints return 501 (not 500 or 404)

---

## Conclusion

The OpenAPI microservice generation feature is **ready for production deployment**. All code has been implemented and tested locally. The feature seamlessly integrates with the existing IDP workflow and provides a powerful new capability for users.

**Next Step**: Deploy to production following the deployment steps above.
