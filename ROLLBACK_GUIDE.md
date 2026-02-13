# Rollback Guide - OpenAPI Feature

## Checkpoints Created

### ✅ Stable Checkpoint (Pre-OAS)
- **Tag**: `v1.0-stable-pre-oas`
- **Commit**: `cd15955` (SSL redirect fix)
- **Branch**: `main`
- **Status**: Last known stable state with working services

### 🆕 OAS Feature
- **Tag**: `v1.1-oas-feature`
- **Commit**: `c94ea64`
- **Branch**: `feature/openapi-microservice-generation`
- **Status**: New feature, ready for testing

---

## Quick Rollback (If Something Breaks)

### Option 1: Revert to Stable Tag (Recommended)

```bash
# On your local machine
cd /Users/krishansingh/Documents/claude_ai/idp

# Switch back to the stable checkpoint
git checkout v1.0-stable-pre-oas

# Or create a new branch from stable
git checkout -b rollback-to-stable v1.0-stable-pre-oas

# Verify you're on the right version
git log --oneline -3
# Should show: cd15955 fix: Update ingress templates to prevent SSL redirect loop
```

### Option 2: Revert the OAS Commit

```bash
# If you want to undo just the OAS feature
git checkout main
git revert c94ea64

# This creates a new commit that undoes the OAS changes
```

### Option 3: Delete the Feature Branch

```bash
# If you haven't merged to main yet
git checkout main
git branch -D feature/openapi-microservice-generation

# Start fresh
git checkout v1.0-stable-pre-oas
```

---

## Rollback in Production

### If OAS Feature Breaks Production

**Backend Rollback:**

```bash
# SSH to production server
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97

cd /home/ec2-user/idp

# Rollback database migration
docker exec idp-backend alembic downgrade -1

# Verify migration reverted
docker exec idp-backend alembic current
# Should show: 002 (not 003)

# Restore previous backend code (if you made backups)
# Or rebuild from stable git tag

# Restart backend
docker-compose restart backend

# Check logs
docker logs idp-backend --tail 50 -f
```

**Frontend Rollback:**

```bash
# SSH to production server
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97

cd /home/ec2-user/idp

# Restore previous frontend files
# Or rebuild from stable git tag

# Restart frontend
docker-compose restart frontend

# Verify
curl -I https://kris-idp.org
```

---

## Verification After Rollback

### Check Backend

```bash
# Verify old templates work
curl -s https://kris-idp.org/api/v1/templates | jq .

# Should NOT include "openapi-microservice" template

# Try creating a regular project
# Should work normally
```

### Check Database

```bash
# Verify migration state
docker exec idp-backend alembic current

# Check projects table
docker exec idp-backend python -c "
from app.core.database import SessionLocal
from app.models.project import Project
db = SessionLocal()
projects = db.query(Project).all()
print(f'Total projects: {len(projects)}')
for p in projects[:3]:
    print(f'{p.name}: {p.status}')
"
```

### Check Existing Services

```bash
# Verify existing services still work
curl https://kris-idp.org/krisacc-svc-5/health
# Should return: {"status":"healthy","service":"krisacc-svc-5"}

# Check metrics
curl -s https://kris-idp.org/krisacc-svc-5/metrics | head -20
```

---

## What Gets Rolled Back

### ✅ Removed in Rollback
- OpenAPI file upload UI
- `/api/v1/projects/from-openapi` endpoint
- `openapi-microservice` template
- `openapi_spec_stored` database column (if migration reverted)
- OpenAPI generator service
- New dependencies (datamodel-code-generator, openapi-spec-validator)

### ✅ Preserved
- All existing projects (including any created before rollback)
- All existing services deployed to k3s
- Database data (except OAS specs if migration reverted)
- User accounts and authentication
- GitHub repositories
- ArgoCD applications

---

## Troubleshooting After Rollback

### Issue: Backend won't start

```bash
# Check if migration is the issue
docker exec idp-backend alembic current
docker exec idp-backend alembic history

# Force downgrade if needed
docker exec idp-backend alembic downgrade base
docker exec idp-backend alembic upgrade 002

# Restart
docker-compose restart backend
```

### Issue: Frontend shows errors

```bash
# Clear browser cache
# Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### Issue: Old projects don't work

```bash
# Check project status in database
docker exec idp-backend python -c "
from app.core.database import SessionLocal
from app.models.project import Project
db = SessionLocal()
p = db.query(Project).filter(Project.name=='your-project-name').first()
print(f'Status: {p.status}')
print(f'Error: {p.error_message}')
"

# Check if service is deployed
curl https://kris-idp.org/your-project-name/health
```

---

## Re-applying OAS Feature After Rollback

If you rolled back but want to try again:

```bash
# Switch back to the OAS feature branch
git checkout feature/openapi-microservice-generation

# Or merge to main
git checkout main
git merge feature/openapi-microservice-generation

# Re-deploy using the deployment guide
```

---

## Git Tags Reference

```bash
# List all tags
git tag -l

# Show tag details
git show v1.0-stable-pre-oas
git show v1.1-oas-feature

# Compare versions
git diff v1.0-stable-pre-oas v1.1-oas-feature --stat

# View specific file differences
git diff v1.0-stable-pre-oas v1.1-oas-feature -- backend/app/api/v1/projects.py
```

---

## Emergency Contacts / Resources

- **Implementation Guide**: `OPENAPI_FEATURE_IMPLEMENTATION.md`
- **Diagnostic Report**: `IDP_DIAGNOSTIC_REPORT.md`
- **Fix Applied Summary**: `FIX_APPLIED_SUMMARY.md`
- **Git History**: `git log --oneline --graph --all`

---

## Recommendation

**Before testing in production:**
1. ✅ Test locally first (separate guide coming)
2. ✅ Create a staging environment if possible
3. ✅ Test with the petstore.yaml fixture
4. ✅ Verify existing services still work
5. ✅ Monitor logs during deployment
6. ✅ Have this rollback guide ready

**If anything breaks:**
1. Don't panic - you have checkpoints!
2. Check logs first: `docker logs idp-backend --tail 100 -f`
3. Use Option 1 (git checkout stable tag) for fastest recovery
4. Verify rollback worked using the verification section
5. Report issues and we'll fix before re-deploying

---

## Current State

```
main branch (production)
   │
   └─ cd15955 (v1.0-stable-pre-oas) ← SAFE CHECKPOINT
        │
        └─ c94ea64 (v1.1-oas-feature) ← NEW FEATURE
             └─ feature/openapi-microservice-generation branch ← YOU ARE HERE
```

You're currently on the **feature branch** with the OAS changes committed and tagged.
Main branch is still at the stable checkpoint.
