# Post-Deployment Updates

After successfully deploying the NGINX proxy, update documentation and examples to reflect the new domain.

---

## 1. Update Frontend Documentation (Home Page)

**File:** `frontend/src/pages/Home.tsx`

**Lines to Update:**

### Line 127 - Ingress URL Example
```tsx
// FROM:
https://kris-idp.duckdns.org/&lt;your-project-name&gt;/hello

// TO:
https://kris-idp.org/&lt;your-project-name&gt;/hello
```

### Line 131 - cURL Example
```tsx
// FROM:
curl https://kris-idp.duckdns.org/user-service/hello

// TO:
curl https://kris-idp.org/user-service/hello
```

### Line 218 - Quick Start Example
```tsx
// FROM:
curl https://kris-idp.duckdns.org/my-first-service/hello

// TO:
curl https://kris-idp.org/my-first-service/hello
```

---

## 2. Update README.md

**File:** `README.md`

Add a section documenting the architecture:

```markdown
## Architecture

### Infrastructure Overview

The IDP platform runs on two AWS EC2 instances:

**EC2 #1 (13.42.36.97) - Control Plane**
- Domain: `kris-idp.org`
- Services: IDP Frontend (React), Backend (FastAPI), NGINX
- Purpose: User interface for creating and managing services

**EC2 #2 (18.130.143.156) - Workload Cluster**
- Domain: `kris-idp.duckdns.org` (direct access)
- Services: k3s Kubernetes, ArgoCD, NGINX Ingress Controller
- Purpose: Runtime environment for deployed microservices

### Request Flow

All services are accessible via the unified domain `kris-idp.org`:

```
User → kris-idp.org
  → NGINX on EC2 #1
    ├─ / → IDP Frontend
    ├─ /api → IDP Backend
    └─ /<service-name>/ → Proxied to k3s cluster on EC2 #2
```

### Service URLs

After deploying a service, access it at:
```
https://kris-idp.org/<your-service-name>/
```

Example endpoints:
- Health Check: `https://kris-idp.org/user-service/health`
- Hello Endpoint: `https://kris-idp.org/user-service/hello`
- API Docs: `https://kris-idp.org/user-service/docs` (Python services)
```

---

## 3. Update DEPLOYMENT.md

**File:** `DEPLOYMENT.md`

Add section on NGINX proxy configuration:

```markdown
## NGINX Proxy Configuration

The production deployment uses NGINX on EC2 #1 to proxy service requests to the k3s cluster on EC2 #2.

### Proxy Setup

**File:** `nginx-ssl.conf`

The proxy configuration matches service paths and forwards them to k3s:

```nginx
location ~ ^/([a-zA-Z0-9-]+svc[a-zA-Z0-9-]*|[a-zA-Z0-9-]+-service|[a-zA-Z0-9-]+-api)(/.*)?$ {
    proxy_pass http://18.130.143.156:30080$request_uri;
    # ... proxy headers ...
}
```

### Updating NGINX Configuration

After modifying `nginx-ssl.conf`:

```bash
# Upload to EC2
scp -i ~/.ssh/idp-demo-key-new.pem nginx-ssl.conf ec2-user@13.42.36.97:~/idp/

# Reload NGINX
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \
  "cd idp && docker exec idp-frontend nginx -t && docker exec idp-frontend nginx -s reload"
```

### Troubleshooting Service Access

If services return 404:
1. Check NGINX config: `docker exec idp-frontend nginx -t`
2. Verify ingress host: `kubectl get ingress`
3. Test k3s connectivity: `curl http://18.130.143.156:30080/<service>/health`

If services return 502:
1. Check service pods: `kubectl get pods`
2. Verify ArgoCD sync status: `argocd app list`
3. Check k3s ingress: `kubectl get svc -n ingress-nginx`
```

---

## 4. Update SERVICE_ACCESS_GUIDE.md

**File:** `SERVICE_ACCESS_GUIDE.md`

Update all URL examples to use `kris-idp.org`:

```bash
# Find and replace throughout the file
kris-idp.duckdns.org → kris-idp.org
```

**Important sections to update:**
- "Accessing Services" - URL examples
- "Testing Service Health" - cURL commands
- "Using Services in Your Applications" - API endpoint examples

---

## 5. Create Architecture Diagram

**Recommended:** Add a visual diagram to README.md or create `ARCHITECTURE.md`

```markdown
## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User/Browser                         │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS
                             ▼
                    kris-idp.org (DNS)
                             │
         ┌───────────────────┴───────────────────┐
         │      EC2 #1 (13.42.36.97)             │
         │      Control Plane                    │
         │  ┌─────────────────────────────────┐  │
         │  │   NGINX Reverse Proxy           │  │
         │  │   (SSL Termination)             │  │
         │  └──────┬─────────────────┬────────┘  │
         │         │                 │           │
         │    ┌────▼─────┐      ┌───▼────────┐  │
         │    │ Frontend │      │  Backend   │  │
         │    │ (React)  │      │ (FastAPI)  │  │
         │    └──────────┘      └────────────┘  │
         └─────────────────┬──────────────────────┘
                           │ HTTP Proxy
                           │ Service requests (/*-svc*)
                           ▼
         ┌─────────────────────────────────────┐
         │  EC2 #2 (18.130.143.156)           │
         │  Workload Cluster                  │
         │  ┌──────────────────────────────┐  │
         │  │  k3s Kubernetes              │  │
         │  │  ┌────────────────────────┐  │  │
         │  │  │ NGINX Ingress          │  │  │
         │  │  │ (Path-based routing)   │  │  │
         │  │  └──────┬─────────────────┘  │  │
         │  │         │                    │  │
         │  │  ┌──────▼──────┐             │  │
         │  │  │  Service 1  │             │  │
         │  │  │  Service 2  │             │  │
         │  │  │  Service 3  │             │  │
         │  │  │  ...        │             │  │
         │  │  └─────────────┘             │  │
         │  │                              │  │
         │  │  ┌──────────────┐            │  │
         │  │  │   ArgoCD     │            │  │
         │  │  │   (GitOps)   │            │  │
         │  │  └──────────────┘            │  │
         │  └──────────────────────────────┘  │
         └─────────────────────────────────────┘
```
```

---

## 6. Update API Response Examples

If your backend API returns service URLs in responses, update those as well:

**File:** `backend/app/api/v1/projects.py`

Check if there are any hardcoded URL constructions and ensure they use the correct domain.

---

## 7. Update Monitoring Dashboards

If you have Grafana dashboards or Prometheus alerting rules that reference service URLs, update them:

- Grafana dashboard annotations
- Prometheus blackbox exporter targets
- Alert notification messages

---

## 8. Update Environment Variables Documentation

**File:** `.env.example` (if it exists)

Add documentation for the architecture:

```bash
# NGINX Proxy Configuration
# Services are proxied from EC2 #1 to k3s cluster on EC2 #2
# Primary domain for all services: kris-idp.org
# Direct k3s access: kris-idp.duckdns.org (optional)
```

---

## Deployment Checklist

Complete these steps after the NGINX proxy deployment is successful:

- [ ] Test all services accessible at `kris-idp.org`
- [ ] Update `frontend/src/pages/Home.tsx` (3 locations)
- [ ] Update `README.md` with architecture section
- [ ] Update `DEPLOYMENT.md` with proxy configuration
- [ ] Update `SERVICE_ACCESS_GUIDE.md` URLs
- [ ] Rebuild and deploy frontend with updated examples
- [ ] Test that new users see correct URLs in UI
- [ ] Update any monitoring dashboards
- [ ] Update team documentation/wiki if applicable
- [ ] Announce domain change to users (if any)

---

## Frontend Rebuild and Deploy

After updating `Home.tsx`:

```bash
# Build frontend with updated URLs
cd frontend
npm run build

# Deploy to EC2 #1
cd ..
./deploy.sh frontend

# Verify changes
# Open https://kris-idp.org/ and check examples show correct domain
```

---

## Gradual Migration Approach

**Option:** Keep both domains working during transition

1. **Week 1:** Deploy NGINX proxy, both domains work
2. **Week 2:** Update UI examples to show `kris-idp.org`
3. **Week 3:** Monitor usage, ensure no issues
4. **Week 4+:** Consider deprecating `kris-idp.duckdns.org` references (keep working as backup)

**Benefits:**
- Zero-downtime migration
- Existing integrations keep working
- Time to find/fix any hardcoded URLs
- Safety net if rollback needed

---

## Verification Commands

After updates:

```bash
# Verify frontend shows correct URLs
curl -s https://kris-idp.org/ | grep -o 'https://kris-idp[^"]*' | sort -u

# Should only show kris-idp.org URLs, not kris-idp.duckdns.org

# Test services still work
curl https://kris-idp.org/krisacc-svc-1/health
curl https://kris-idp.org/krisacc-svc-2/health
```

---

## Rollback of Documentation Updates

If you need to revert documentation changes:

```bash
# Git rollback
git checkout HEAD -- frontend/src/pages/Home.tsx
git checkout HEAD -- README.md

# Rebuild frontend
cd frontend
npm run build

# Redeploy
cd ..
./deploy.sh frontend
```

---

## Communication Template

**Sample message to users/team:**

```
Subject: Platform Update - New Unified Domain

Hi Team,

We've updated the IDP platform to use a unified domain for all services:

**New URL Format:**
https://kris-idp.org/<your-service-name>/

**What Changed:**
- All services now accessible via kris-idp.org
- Improved architecture with centralized routing
- Professional, consistent URLs

**Action Required:**
- Update any bookmarks or integrations to use new URLs
- Old URLs (kris-idp.duckdns.org) will continue working for now

**Questions?**
Contact: [your contact info]

Thanks!
```

---

## Long-Term Considerations

### Future Improvements

1. **Add Metrics:**
   - Monitor proxy response times
   - Track request volume per service
   - Alert on 502/504 errors

2. **Performance Optimization:**
   - Enable NGINX caching for static content
   - Add compression for API responses
   - Consider CDN for frontend assets

3. **Enhanced Routing:**
   - Add rate limiting per service
   - Implement authentication at proxy level
   - Add WAF rules for security

4. **Alternative Architectures:**
   - If proxy becomes bottleneck, consider moving to Option 2 (wildcard DNS)
   - If consolidating infrastructure, consider Option 4 (single EC2)
   - Evaluate cloud load balancers vs NGINX proxy

---

## Success Metrics

Track these after deployment:

1. **Availability:**
   - Uptime of services via kris-idp.org
   - Success rate of proxy requests
   - SSL certificate validity

2. **Performance:**
   - Average response time <200ms
   - 95th percentile response time <500ms
   - No increase in error rates

3. **User Experience:**
   - All examples in UI show correct domain
   - No user confusion about URLs
   - Positive feedback on unified domain

---

## Additional Resources

- **NGINX Proxy Guide:** `DEPLOY_NGINX_PROXY.md`
- **Quick Deploy Steps:** `QUICK_DEPLOY_STEPS.md`
- **Implementation Summary:** `NGINX_PROXY_IMPLEMENTATION.md`
- **Testing Script:** `test-service-accessibility.sh`
- **Service Update Script:** `deploy-update-services.sh`
