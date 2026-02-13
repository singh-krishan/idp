# krisacc-svc-5 Fix - SSL Redirect Issue

## Problem

**Service:** krisacc-svc-5
**Symptom:** Blank white page in browser when accessing `https://kris-idp.org/krisacc-svc-5/`
**Root Cause:** HTTP 308 Permanent Redirect loop caused by `ssl-redirect: true` annotation

## Why It Happened

krisacc-svc-5 was created **before** the template fix, so it inherited the old template configuration:

```yaml
annotations:
  nginx.ingress.kubernetes.io/ssl-redirect: "true"  # ❌ OLD TEMPLATE
```

This caused a redirect loop:
1. User → HTTPS to EC2 #1 NGINX
2. EC2 #1 → HTTP to k3s (proxy internally uses HTTP)
3. k3s ingress → Sees HTTP request with `ssl-redirect: true`
4. k3s → Returns 308 redirect to HTTPS
5. Browser → Redirects to same URL
6. **Loop back to step 1** → Infinite redirect

The browser shows a blank page because it's stuck in this redirect loop.

## The Difference

### test-proxy-svc (Working from the start)
```yaml
# Created manually with correct config
annotations:
  nginx.ingress.kubernetes.io/ssl-redirect: "false"  ✅
  nginx.ingress.kubernetes.io/force-ssl-redirect: "false"  ✅
```

### krisacc-svc-5 (Created via IDP before template fix)
```yaml
# Used old template with wrong config
annotations:
  nginx.ingress.kubernetes.io/ssl-redirect: "true"  ❌
```

## Solution

### Step 1: Updated Source Repository

**Repository:** `https://github.com/singh-krishan/krisacc-svc-5.git`
**File:** `helm/templates/ingress.yaml`
**Change:** Line 11

```diff
- nginx.ingress.kubernetes.io/ssl-redirect: "true"
+ nginx.ingress.kubernetes.io/ssl-redirect: "false"
```

**Commit:** `3e79d89` - "Fix: Disable SSL redirect for NGINX proxy compatibility"

### Step 2: Synced ArgoCD

Triggered ArgoCD to sync the changes from GitHub to Kubernetes.

### Step 3: Verified Fix

```bash
$ curl https://kris-idp.org/krisacc-svc-5/health
{"status":"healthy","service":"krisacc-svc-5"}

$ curl https://kris-idp.org/krisacc-svc-5/hello
{"message":"hello, welcome to my IDP"}
```

✅ **Both endpoints now work perfectly!**

## Why Direct kubectl Changes Didn't Work

Initially tried:
```bash
kubectl annotate ingress krisacc-svc-5 \
  nginx.ingress.kubernetes.io/ssl-redirect=false --overwrite
```

**This didn't persist because:**
- ArgoCD manages this resource (GitOps)
- ArgoCD syncs from GitHub every ~3 minutes
- Any manual changes get overwritten by ArgoCD
- **Solution:** Must update the source in GitHub, not Kubernetes directly

## Key Learnings

### 1. GitOps Principle
When ArgoCD manages a resource, always update the source repository, not Kubernetes directly.

```
❌ kubectl patch/annotate → Changes get reverted
✅ Update GitHub → ArgoCD syncs → Changes persist
```

### 2. SSL Redirect Configuration

**For services behind NGINX proxy:**
```yaml
annotations:
  nginx.ingress.kubernetes.io/ssl-redirect: "false"
  nginx.ingress.kubernetes.io/force-ssl-redirect: "false"
```

**Why:**
- SSL is handled by EC2 #1 NGINX (Let's Encrypt certificate)
- k3s receives HTTP traffic from the proxy
- k3s shouldn't try to redirect to HTTPS (causes loop)

### 3. Template Updates vs Existing Services

**Templates Updated:** ✅
- New services will have correct configuration
- `backend/app/templates/*/helm/templates/ingress.yaml`
- Both Python and Node.js templates fixed

**Existing Services:** Depends on when they were created
- Services created before template fix: Need manual GitHub update
- Services created after template fix: Work automatically

## Services Status

| Service | Created | SSL Redirect | Status | URL |
|---------|---------|--------------|--------|-----|
| test-proxy-svc | Manual | false ✅ | Working | https://kris-idp.org/test-proxy-svc/ |
| krisacc-svc-5 | Via IDP (fixed) | false ✅ | Working | https://kris-idp.org/krisacc-svc-5/ |
| krisacc-svc-1 to 4 | Before fix | true ❌ | Using duckdns.org | (unchanged) |

## Future Service Creation

**All new services created via IDP will:**
1. ✅ Use `host: kris-idp.org`
2. ✅ Have `ssl-redirect: false`
3. ✅ Work immediately via NGINX proxy
4. ✅ Be accessible at `https://kris-idp.org/<service-name>/`

## Troubleshooting Steps Used

1. **Check ingress configuration:**
   ```bash
   kubectl get ingress <service> -o yaml
   ```
   Look for: `ssl-redirect` annotation

2. **Test HTTP response:**
   ```bash
   curl -v https://kris-idp.org/<service>/health 2>&1 | grep HTTP
   ```
   If you see: `HTTP/2 308` → SSL redirect issue

3. **Find source repository:**
   ```bash
   kubectl get application <service> -n argocd -o jsonpath='{.spec.source.repoURL}'
   ```

4. **Update source, commit, push:**
   ```bash
   git clone <repo>
   # Edit helm/templates/ingress.yaml
   git commit -am "Fix SSL redirect"
   git push
   ```

5. **Trigger ArgoCD sync:**
   - Wait for auto-sync (~3 minutes)
   - Or manually trigger sync

6. **Verify fix:**
   ```bash
   kubectl get ingress <service> -o jsonpath='{.metadata.annotations.nginx\.ingress\.kubernetes\.io/ssl-redirect}'
   # Should show: false

   curl https://kris-idp.org/<service>/health
   # Should return JSON, not redirect
   ```

## Commands Reference

```bash
# Clone service repository
git clone https://github.com/singh-krishan/<service-name>.git
cd <service-name>

# Fix SSL redirect
sed -i 's/ssl-redirect: "true"/ssl-redirect: "false"/' helm/templates/ingress.yaml

# Commit and push
git add helm/templates/ingress.yaml
git commit -m "Fix: Disable SSL redirect for NGINX proxy compatibility"
git push

# Verify annotation changed (after ArgoCD sync)
kubectl get ingress <service> -o jsonpath='{.metadata.annotations.nginx\.ingress\.kubernetes\.io/ssl-redirect}'

# Test service
curl https://kris-idp.org/<service>/health
```

## Prevention

This issue is now prevented for future services because:

1. ✅ **Backend templates updated:**
   - `/backend/app/templates/python-microservice/{{cookiecutter.project_name}}/helm/templates/ingress.yaml`
   - `/backend/app/templates/nodejs-api/{{cookiecutter.project_name}}/helm/templates/ingress.yaml`

2. ✅ **Both have:**
   ```yaml
   nginx.ingress.kubernetes.io/ssl-redirect: "false"
   nginx.ingress.kubernetes.io/force-ssl-redirect: "false"
   ```

3. ✅ **Any service created via IDP from now on will work immediately**

## Summary

- **Problem:** Blank page due to SSL redirect loop
- **Cause:** Old template had `ssl-redirect: true`
- **Solution:** Updated GitHub source to `ssl-redirect: false`
- **Result:** Service now works perfectly at `https://kris-idp.org/krisacc-svc-5/`
- **Prevention:** Templates fixed, new services won't have this issue

---

**Status:** ✅ Fixed and working
**Fixed Date:** 2026-02-11
**Test Results:** All endpoints return HTTP 200 with correct JSON responses
