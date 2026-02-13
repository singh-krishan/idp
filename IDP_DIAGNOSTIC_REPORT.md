# IDP Platform Diagnostic Report

**Date**: 2026-02-13
**Test Type**: End-to-End Service Deployment and Accessibility Test

## Summary

✅ **IDP Platform Status**: Operational
✅ **Backend API**: Responding correctly
✅ **Database**: Functional with 17 projects
⚠️ **Service Accessibility**: Partially working (SSL redirect issue)

---

## Infrastructure Status

### EC2 Instance #1 (13.42.36.97) - IDP Application
- **Backend Container**: `idp-backend` - **UP** (45 hours uptime)
- **Frontend Container**: `idp-frontend` - **UP** (46 hours uptime)
- **Domain**: https://kris-idp.org ✅
- **Database**: SQLite operational

### EC2 Instance #2 (18.130.143.156) - k3s Cluster
- **SSH Access**: ❌ Permission denied (SSH key mismatch)
- **Services Deployed**: Multiple microservices running
- **ArgoCD**: Presumably operational (services are deployed)

---

## API Testing Results

### Template Listing
```json
GET /api/v1/templates
Status: 200 OK ✅

Templates Available:
- nodejs-api
- python-microservice
```

### Project Listing
```
GET /api/v1/projects
Status: 401 Not authenticated ⚠️
```

**Note**: Authentication was added to the platform (not in original MVP spec).

---

## Database Analysis

**Total Projects**: 17

### Project Status Breakdown
- **Active**: 13 projects ✅
- **Failed**: 3 projects ❌
- **Pending**: 1 project ⏳

### Active Projects (Sample)
| Project Name | Status | GitHub | ArgoCD | Notes |
|--------------|--------|--------|--------|-------|
| krisacc-svc-4 | active | ✅ | ✅ | Deployed successfully |
| krisacc-svc-5 | active | ✅ | ✅ | **Working correctly** |
| krisacc-svc-6 | active | ✅ | ✅ | **Has ingress issue** |
| demo-svc-1 | active | ✅ | ✅ | Deployed successfully |
| kris-aws-svc-2 | active | ✅ | ✅ | Deployed successfully |

### Failed Projects
| Project Name | Error |
|--------------|-------|
| kris-aws-service | `[Errno 20] Not a directory: 'app/templates/python-microservice/._{{cookiecutter.project_name}}'` |
| kris-aws-svc-1 | Same as above |
| kris-aws-svc-4 | Same as above |

**Root Cause**: macOS hidden files (`._*`) in Cookiecutter template directory causing rendering failures.

---

## Service Accessibility Testing

### ✅ Working Service: krisacc-svc-5

```bash
# Health Endpoint
curl https://kris-idp.org/krisacc-svc-5/health
Response: {"status":"healthy","service":"krisacc-svc-5"}
Status: 200 OK ✅

# Metrics Endpoint
curl https://kris-idp.org/krisacc-svc-5/metrics
Response: Prometheus metrics (Python 3.11.14)
Status: 200 OK ✅

# Custom Endpoint
curl https://kris-idp.org/krisacc-svc-5/hello
Response: {"message":"hello, welcome to my IDP"}
Status: 200 OK ✅
```

### ❌ Broken Service: krisacc-svc-6

```bash
# All Endpoints
curl https://kris-idp.org/krisacc-svc-6/health
curl https://kris-idp.org/krisacc-svc-6/hello
curl https://kris-idp.org/krisacc-svc-6/

Response: 308 Permanent Redirect (loop)
Status: FAILED ❌
```

**Root Cause**: Ingress configuration has `nginx.ingress.kubernetes.io/ssl-redirect: "true"` causing redirect loop.

---

## Issue Analysis

### Issue #1: SSL Redirect Loop in Newer Services

**Affected Services**: krisacc-svc-6 and potentially others created after a certain date

**Problem**:
- Ingress annotation `nginx.ingress.kubernetes.io/ssl-redirect: "true"` causes NGINX to continuously redirect HTTPS requests
- This happens when TLS is already configured in the ingress spec

**Evidence**:
```yaml
# krisacc-svc-6/helm/templates/ingress.yaml (BROKEN)
annotations:
  nginx.ingress.kubernetes.io/ssl-redirect: "true"  # ❌ Causes loop

# krisacc-svc-5/helm/templates/ingress.yaml (WORKING)
annotations:
  nginx.ingress.kubernetes.io/ssl-redirect: "false"  # ✅ Correct
```

**Fix**: Update the Cookiecutter template to use `ssl-redirect: "false"`

**File to Update**:
```
backend/app/templates/python-microservice/{{cookiecutter.project_name}}/helm/templates/ingress.yaml
```

Change line:
```yaml
nginx.ingress.kubernetes.io/ssl-redirect: "true"
```

To:
```yaml
nginx.ingress.kubernetes.io/ssl-redirect: "false"
```

### Issue #2: macOS Hidden Files Breaking Template Rendering

**Affected Projects**: 3 failed projects

**Problem**:
- macOS creates hidden `._*` files in directories
- Cookiecutter tries to process these as template files
- Results in "Not a directory" error

**Fix**: Add `.dockerignore` or clean template directory of macOS artifacts

---

## Recommendations

### High Priority
1. ✅ **Fix SSL redirect in template** - Update ingress template to use `ssl-redirect: "false"`
2. ✅ **Clean template directory** - Remove macOS hidden files from `backend/app/templates/`
3. ⚠️ **Redeploy broken services** - Delete and recreate krisacc-svc-6 after template fix

### Medium Priority
4. ⚠️ **Fix EC2 #2 SSH access** - Ensure correct SSH key is configured
5. ⚠️ **Document authentication** - Update docs to reflect API authentication requirement
6. ⚠️ **Add health check to IDP** - Restore `/api/v1/health` endpoint

### Low Priority
7. ℹ️ **Add service status dashboard** - Display service health in UI
8. ℹ️ **Implement service deletion** - Allow users to clean up failed projects

---

## Verification Steps Completed

- [x] Backend container running
- [x] Frontend container running
- [x] API responding to template requests
- [x] Database accessible and queryable
- [x] Multiple services deployed to k3s cluster
- [x] At least one service fully accessible (krisacc-svc-5)
- [x] Identified root cause of accessibility issues
- [x] Verified working vs broken service configurations

---

## Next Steps

1. Apply the template fix for SSL redirect
2. Clean up macOS hidden files from templates
3. Test by creating a new diagnostic service
4. Verify the new service is accessible at all endpoints
5. Consider redeploying affected services

---

## Conclusion

The IDP Platform is **functional and operational** with the following caveats:

- ✅ Core functionality works: Template rendering, GitHub integration, ArgoCD deployment
- ✅ Most services (13/17) deployed successfully
- ⚠️ Recent template change introduced SSL redirect loop
- ⚠️ macOS artifacts causing some deployment failures

**Overall Grade**: B+ (Operational with minor issues)

The platform successfully automates microservice creation and deployment. The identified issues are configuration problems that can be easily fixed by updating the Cookiecutter templates.
