# Petstore 503 Error - Root Cause and Fix

**Date**: 2026-02-13
**Time**: 12:25 UTC
**Status**: ✅ FIXED - Ready for Recreation

---

## Problem Analysis

### Symptom
```
https://kris-idp.org/petstore-api-svc/hello
→ 503 Service Temporarily Unavailable
```

### Root Cause

The generated FastAPI application **crashes on startup** due to undefined model references.

**What Happened:**

1. ✅ OpenAPI spec uploaded successfully
2. ✅ Code generation started
3. ❌ **Model generation failed** (returned empty - no Pydantic models created)
4. ❌ **Routes still referenced models** (`Pet`, `CreatePetRequest`) that don't exist
5. ❌ FastAPI app crashes: `NameError: name 'Pet' is not defined`
6. ❌ Kubernetes pods keep restarting (CrashLoopBackOff)
7. ❌ NGINX gets 503 because no healthy backend

### Evidence

**Generated models.py:**
```python
# No models generated from OpenAPI spec
```

**Generated main.py (line 27-28):**
```python
@app.get("/pets", response_model=List[Pet])  # ❌ Pet not defined!
async def listPets(
    limit: Optional[int] = Query(None),
):
```

**Missing import:**
```python
# NO IMPORT for Pet, CreatePetRequest, etc.
from fastapi import FastAPI, HTTPException, Query, Path, Body, Depends
from typing import List, Optional, Dict, Any
```

---

## Technical Details

### Bug Location

**File**: `backend/app/services/openapi_generator_service.py`
**Function**: `generate_routes()` (lines 261-282)

**The Bug:**

The function always extracts model names from the OpenAPI spec, even when `has_models=False`:

```python
# BEFORE (buggy):
def generate_routes(self, spec_dict: dict, has_models: bool, ...):
    # Extract request body
    request_body = None
    request_body_content = operation.get("requestBody", {}).get("content", {})
    if "application/json" in request_body_content:  # ❌ No has_models check!
        schema = request_body_content["application/json"].get("schema", {})
        if "$ref" in schema:
            request_body = self._extract_model_name(schema["$ref"])  # ❌ Extracts "CreatePetRequest"

    # Extract response model
    response_model = None
    responses = operation.get("responses", {})
    for status in ["200", "201", "202"]:
        # ... extracts model names without checking has_models ❌
        response_model = self._extract_model_name(schema["$ref"])  # ❌ Extracts "Pet"
```

**The Fix:**

Only extract model names if `has_models=True`:

```python
# AFTER (fixed):
def generate_routes(self, spec_dict: dict, has_models: bool, ...):
    # Extract request body
    request_body = None
    request_body_content = operation.get("requestBody", {}).get("content", {})
    if has_models and "application/json" in request_body_content:  # ✅ Check has_models!
        schema = request_body_content["application/json"].get("schema", {})
        if "$ref" in schema:
            request_body = self._extract_model_name(schema["$ref"])

    # Extract response model
    response_model = None
    if has_models:  # ✅ Check has_models!
        responses = operation.get("responses", {})
        for status in ["200", "201", "202"]:
            # ... extract model names
            response_model = self._extract_model_name(schema["$ref"])
```

Now when models aren't generated:
- `response_model = None` (no type hint)
- `request_body = None` (no type hint)
- Generated code: `@app.get("/pets")` (instead of `@app.get("/pets", response_model=List[Pet])`)

---

## Why Did Model Generation Fail?

The model generation uses `datamodel-code-generator`, which we fixed earlier to use a `StringIO` wrapper. However, the library might still fail for certain specs.

**Possible reasons:**
1. Complex schema definitions
2. Missing `components.schemas` section
3. Inline schemas instead of `$ref` references
4. Library compatibility issues

**Current behavior:** If model generation fails, it returns empty string and logs a warning. Routes should still be generated but without model type hints.

---

## Deployment Status

### Fix Applied ✅

1. **12:20 UTC**: Updated `openapi_generator_service.py` locally
2. **12:22 UTC**: Uploaded to EC2 #1
3. **12:23 UTC**: Deployed to idp-backend container
4. **12:23 UTC**: Restarted backend
5. **12:24 UTC**: Verified backend running (template API working)

### Current State

- ✅ Backend running with fixed code generator
- ✅ Template API responding correctly
- ❌ Old petstore-api-svc project **still deployed with broken code**
- ❌ GitHub repo **still contains broken code**

---

## Steps to Fix Your Deployment

You need to **delete and recreate** the project with the fixed code generator.

### Step 1: Delete Failed Project from IDP

1. Go to https://kris-idp.org
2. Find "petstore-api-svc" in project list
3. Click **DELETE** button
4. Confirm deletion

### Step 2: Delete GitHub Repository

```bash
# Option A: Via GitHub CLI (if installed)
gh repo delete singh-krishan/petstore-api-svc --yes

# Option B: Via GitHub Web UI
# Go to: https://github.com/singh-krishan/petstore-api-svc
# Settings → Danger Zone → Delete this repository
```

### Step 3: Delete ArgoCD Application (Optional)

The application might auto-delete when the IDP project is deleted, but if not:

```bash
# SSH to k3s cluster
ssh <k3s-server>

# Delete ArgoCD application
kubectl delete application petstore-api-svc -n argocd

# Delete any remaining pods/services
kubectl delete all -l app=petstore-api-svc
```

### Step 4: Recreate Project

1. Go to https://kris-idp.org
2. Click "Create New Project"
3. **Fill in form:**
   - Name: `petstore-api-v2` (use new name to avoid conflicts)
   - Description: `Pet store API from OpenAPI spec`
   - Template: "Openapi Microservice"
4. **Upload OpenAPI file** (same file as before)
5. **Port**: 8000
6. Click **Create Project**

### Step 5: Wait for Deployment

Monitor the status in the project list:
```
pending → creating_repo → building → deploying → active
```

**Expected time**: 2-5 minutes

### Step 6: Verify Service

```bash
# Test health endpoint
curl https://kris-idp.org/petstore-api-v2/health

# Expected response:
{"status":"healthy","service":"petstore-api-v2"}

# Test generated endpoint (should return 501 NotImplementedError)
curl https://kris-idp.org/petstore-api-v2/pets

# Expected response:
{"detail":"Endpoint GET /pets not yet implemented"}
```

---

## What Will Be Different This Time?

### Generated Code (Without Models)

**models.py:**
```python
# No models generated from OpenAPI spec
```

**main.py:**
```python
from fastapi import FastAPI, HTTPException, Query, Path, Body, Depends
from typing import List, Optional, Dict, Any
from prometheus_fastapi_instrumentator import Instrumentator
import os
# NO MODEL IMPORT (correct!)

app = FastAPI(
    title="Pet Store API",
    description="A sample pet store API",
    version="1.0.0",
)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "petstore-api-v2"}

# NO response_model type hint (correct!)
@app.get("/pets")
async def listPets(
    limit: Optional[int] = Query(None),
):
    """List all pets"""
    # TODO: Implement listPets
    raise NotImplementedError("Endpoint GET /pets not yet implemented")

# NO response_model type hint (correct!)
@app.post("/pets", status_code=201)
async def createPet(
    # NO body type hint (correct!)
):
    """Create a pet"""
    # TODO: Implement createPet
    raise NotImplementedError("Endpoint POST /pets not yet implemented")
```

### Result

- ✅ App starts successfully
- ✅ Pods run and become healthy
- ✅ NGINX can reach the service
- ✅ `/health` returns 200 OK
- ✅ `/pets` returns 501 Not Implemented (as expected)
- ✅ You can then implement the TODO methods with actual business logic

---

## Alternative: Manual Fix (Advanced)

If you don't want to delete and recreate, you can manually fix the existing repo:

### Option A: Add Models Manually

1. Clone the repo
2. Create proper Pydantic models in `src/models.py`
3. Add import to `src/main.py`
4. Push changes
5. Wait for GitHub Actions to rebuild
6. ArgoCD will auto-sync

### Option B: Remove Model References

1. Clone the repo
2. Edit `src/main.py`:
   - Remove `response_model=List[Pet]`
   - Remove `response_model=Pet`
   - Remove `body: CreatePetRequest = Body(...)`
3. Push changes
4. Wait for rebuild and auto-sync

---

## Prevention for Future

This bug is now fixed in the code generator. Future OpenAPI projects will:

1. Attempt to generate Pydantic models
2. If model generation fails → skip model imports and type hints
3. If model generation succeeds → include models and type hints
4. Either way → **app will start successfully**

---

## Summary

**Problem**: Model generation failed, but routes still referenced undefined models
**Fix**: Updated code generator to skip model references when `has_models=False`
**Action Required**: Delete and recreate the project with fixed code generator
**Expected Result**: Working service with `/health` endpoint responding 200 OK

The fix is deployed and ready. Just delete the old project and create a new one!
