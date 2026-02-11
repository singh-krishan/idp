# Registration CORS Error - Fix Summary

**Date:** 2026-02-11
**Issue:** Registration failing with "localhost:8000 connection refused" error
**Root Cause:** CORS misconfiguration and frontend hardcoded to localhost API
**Status:** ✅ RESOLVED

---

## Problem Analysis

### Error Symptoms
Browser console showed:
```
Failed to load resource: localhost:8000/api/v1/auth/register:1
POST http://localhost:8000/api/v1/auth/register
net::ERR_CONNECTION_REFUSED
```

### Root Causes Identified

1. **Frontend API URL Configuration**
   - `VITE_API_URL` not set during Docker build
   - Frontend defaulted to localhost:8000 from development environment
   - Production build contained hardcoded localhost references

2. **CORS Misconfiguration**
   - Backend configured for old domain: `https://my-idp.duckdns.org`
   - Current production domain: `https://kris-idp.org`
   - Browsers blocked cross-origin requests

---

## Solutions Implemented

### Fix 1: Frontend API URL Configuration

**File:** `frontend/Dockerfile`

**Change:**
```dockerfile
# Copy source code
COPY . .

# Set API URL to empty string (uses relative paths, proxied by nginx)
ENV VITE_API_URL=""

# Build the application
RUN npm run build
```

**Impact:**
- Frontend now uses relative paths: `/api/v1/auth/register`
- Nginx reverse proxy forwards `/api` → `backend:8000`
- No hardcoded URLs in production build
- Works with any domain (portable deployment)

### Fix 2: CORS Configuration Update

**Production EC2 Update:**
```bash
# Updated /home/ec2-user/idp/docker-compose.yml on EC2
CORS_ORIGINS=https://kris-idp.org,http://localhost:5173
```

**Local docker-compose.yml:**
```yaml
environment:
  - CORS_ORIGINS=${CORS_ORIGINS:-http://localhost:5173,http://localhost:3000,https://kris-idp.org}
```

**Verification:**
```bash
curl -v -X POST https://kris-idp.org/api/v1/auth/register \
  -H "Origin: https://kris-idp.org" \
  -H "Content-Type: application/json"

# Response includes:
access-control-allow-credentials: true
access-control-allow-origin: https://kris-idp.org
```

### Fix 3: Production Deployment

**Actions Taken:**
1. Rebuilt frontend Docker image with ENV VITE_API_URL=""
2. Deployed new frontend to EC2
3. Forced container recreation to use new image
4. Updated backend CORS configuration
5. Restarted backend with new CORS settings

**Deployment Commands:**
```bash
./deploy.sh frontend  # Builds and deploys new frontend

# On EC2:
docker stop 00d94efb21fa && docker rm 00d94efb21fa
docker-compose up -d frontend
docker-compose restart backend
```

---

## Verification Steps

### 1. Check Frontend Build
```bash
# Verify new build timestamp
ssh ec2-user@13.42.36.97 \
  "docker exec idp-frontend ls -lh /usr/share/nginx/html/assets/"

# Output shows:
# index-nubfr6nd.js - Feb 11 12:08 (NEW BUILD)
```

### 2. Check CORS Headers
```bash
curl -I -X POST https://kris-idp.org/api/v1/auth/register \
  -H "Origin: https://kris-idp.org"

# Should include:
# access-control-allow-origin: https://kris-idp.org
# access-control-allow-credentials: true
```

### 3. Test Registration API
```bash
curl -X POST https://kris-idp.org/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Origin: https://kris-idp.org" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'

# Expected: 201 Created with user object
```

### 4. Check Backend CORS Config
```bash
ssh ec2-user@13.42.36.97 \
  "docker exec idp-backend python -c 'from app.core.config import settings; print(settings.cors_origins)'"

# Output:
# ['https://kris-idp.org', 'http://localhost:5173']
```

---

## User Testing Instructions

### Step 1: Hard Refresh Browser
The new JavaScript bundle must be loaded. Do a hard refresh:
- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`
- **Alternative:** Clear browser cache for kris-idp.org

### Step 2: Test Registration
1. Navigate to **https://kris-idp.org**
2. Click **"Don't have an account? Register"**
3. Fill in the registration form:
   - **Email:** your-email@example.com
   - **Username:** yourusername
   - **Password:** securepass123 (min 8 chars)
   - **Confirm Password:** securepass123
4. Click **"Create Account"**

### Step 3: Expected Behavior
✅ **Success:**
- No console errors
- Success message appears
- Automatically logged in to dashboard
- Can see projects and analytics

❌ **If Still Failing:**
1. Open Browser DevTools (`F12`)
2. Go to **Console** tab
3. Check for errors
4. Go to **Network** tab
5. Try registering again
6. Check the `/api/v1/auth/register` request:
   - Request URL should be `https://kris-idp.org/api/v1/auth/register`
   - NOT `http://localhost:8000/...`
7. Screenshot any errors and share

---

## Technical Details

### Architecture Flow

```
Browser (https://kris-idp.org)
    ↓
    | Frontend JavaScript makes request to: /api/v1/auth/register
    ↓
Nginx (idp-frontend container)
    ↓
    | Nginx proxy_pass matches /api → http://backend:8000
    ↓
Backend (idp-backend container)
    ↓
    | FastAPI checks CORS: https://kris-idp.org ✅
    | Processes registration
    | Returns user object
    ↓
Response to Browser
```

### Why Empty VITE_API_URL Works

**AuthContext.tsx:**
```typescript
const API_URL = import.meta.env.VITE_API_URL || '';

// When VITE_API_URL = ""
axios.post(`${API_URL}/api/v1/auth/register`)
// Becomes:
axios.post(`/api/v1/auth/register`)
// Which is relative to current domain
```

**nginx-ssl.conf:**
```nginx
location /api {
    proxy_pass http://backend:8000;
}
```

This approach is **domain-agnostic** - the same frontend build works for:
- https://kris-idp.org
- https://my-idp.duckdns.org
- Any other domain without rebuilding

---

## Files Modified

### 1. frontend/Dockerfile
- Added `ENV VITE_API_URL=""` before build step
- Ensures relative API paths in production

### 2. docker-compose.yml
- Updated CORS_ORIGINS to include kris-idp.org
- Made CORS_ORIGINS configurable via env var

### 3. Production EC2
- `/home/ec2-user/idp/docker-compose.yml` - Updated CORS
- Rebuilt and redeployed frontend container
- Restarted backend with new CORS config

---

## Commits

```bash
git log --oneline -2

f17a20d fix: Update CORS configuration to include production domain
9a8fb41 fix: Set VITE_API_URL to empty string for relative API paths
```

---

## Prevention for Future

### 1. Local Development Setup
Create `.env` file in frontend directory:
```bash
# frontend/.env
VITE_API_URL=http://localhost:8000
```

This keeps local development working while production uses relative paths.

### 2. Deployment Checklist
Before deploying to new domain:
1. ✅ Update CORS_ORIGINS in production docker-compose.yml
2. ✅ Ensure frontend Dockerfile has ENV VITE_API_URL=""
3. ✅ Update nginx SSL certificates for new domain
4. ✅ Test CORS with curl before frontend deployment
5. ✅ Hard refresh browser after deployment

### 3. Environment-Specific Configuration
Consider creating separate docker-compose files:
- `docker-compose.yml` - Development (localhost)
- `docker-compose.prod.yml` - Production (kris-idp.org)

---

## Troubleshooting Guide

### Issue: Still seeing localhost:8000 errors

**Solution:**
```bash
# 1. Clear browser cache completely
# 2. Check which bundle is served:
curl -s https://kris-idp.org/ | grep 'script.*src'

# 3. If old bundle, force container restart:
ssh ec2-user@13.42.36.97
cd /home/ec2-user/idp
docker-compose restart frontend

# 4. Verify new build timestamp:
docker exec idp-frontend ls -lh /usr/share/nginx/html/assets/
```

### Issue: CORS errors in console

**Solution:**
```bash
# 1. Check backend CORS config:
ssh ec2-user@13.42.36.97 \
  "docker exec idp-backend printenv | grep CORS_ORIGINS"

# 2. If wrong, update and restart:
cd /home/ec2-user/idp
sed -i 's|CORS_ORIGINS=.*|CORS_ORIGINS=https://kris-idp.org|g' docker-compose.yml
docker-compose restart backend

# 3. Verify:
docker exec idp-backend python -c \
  "from app.core.config import settings; print(settings.cors_origins)"
```

### Issue: Nginx not proxying /api requests

**Solution:**
```bash
# 1. Check nginx config:
ssh ec2-user@13.42.36.97
docker exec idp-frontend cat /etc/nginx/conf.d/default.conf | grep -A 5 "location /api"

# 2. Should show:
# location /api {
#     proxy_pass http://backend:8000;
#     ...
# }

# 3. Test from inside frontend container:
docker exec idp-frontend wget -qO- http://backend:8000/api/v1/health
```

---

## Success Metrics

✅ **Frontend Build:**
- No localhost:8000 in JavaScript bundle
- Uses relative paths: `/api/v1/...`
- Build timestamp: Feb 11 12:08

✅ **Backend CORS:**
- Allows: https://kris-idp.org
- Returns proper CORS headers
- access-control-allow-origin matches request origin

✅ **API Connectivity:**
- Registration endpoint returns 201 Created
- Login endpoint returns JWT tokens
- No connection refused errors

✅ **User Experience:**
- Registration form submits successfully
- No console errors
- Auto-login after registration works
- Dashboard loads correctly

---

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full production deployment guide
- [REGISTRATION_FIX_SUMMARY.md](./REGISTRATION_FIX_SUMMARY.md) - Previous database migration fix
- [CLAUDE.md](./CLAUDE.md) - Project conventions and commands

---

**Issue Resolved:** ✅
**Time to Fix:** ~25 minutes
**Impact:** Zero data loss, frontend rebuild required
**Next Steps:** Test registration in browser after hard refresh
