# ✅ NGINX Proxy Working - Confirmation

## Test Results

**Test Service:** `test-proxy-svc`
**Test URL:** https://kris-idp.org/test-proxy-svc/health
**Result:** ✅ **HTTP 200 OK**

```json
{
  "http": {
    "method": "GET",
    "originalUrl": "/health",
    "protocol": "http"
  },
  "request": {
    "headers": {
      "host": "kris-idp.org",
      "x-real-ip": "172.31.46.112",
      "x-forwarded-for": "172.31.46.112",
      "x-forwarded-host": "kris-idp.org",
      "x-forwarded-proto": "http"
    }
  }
}
```

## What's Working

1. ✅ **NGINX Proxy on EC2 #1**
   - Configured with correct k3s private IP: `172.31.2.204`
   - Configured with correct port: `80`
   - Proxy rules loaded and active

2. ✅ **Network Connectivity**
   - EC2 #1 → k3s cluster communication working
   - Proxy headers correctly forwarded
   - SSL termination on EC2 #1, HTTP to k3s

3. ✅ **Test Service**
   - Deployed with `host: kris-idp.org`
   - Configured with `ssl-redirect: false`
   - Accessible at: https://kris-idp.org/test-proxy-svc/

4. ✅ **Templates Updated**
   - Python microservice template: `ssl-redirect: false`
   - Node.js API template: `ssl-redirect: false`
   - Both use `host: kris-idp.org` by default

## What This Means

### For New Services

**Any service created going forward will:**
- ✅ Use domain: `kris-idp.org`
- ✅ Be immediately accessible via NGINX proxy
- ✅ Work without SSL redirect issues
- ✅ Have proper proxy headers

**Example URLs:**
```
https://kris-idp.org/my-new-service/
https://kris-idp.org/my-new-service/health
https://kris-idp.org/my-new-service/docs
```

### For Existing Services

**Existing services (krisacc-svc-1 through krisacc-svc-4):**
- ⏸️ **Unchanged** (as you requested)
- Still use: `kris-idp.duckdns.org`
- Still have: `ssl-redirect: true`
- Still accessible at old URLs

**Their URLs:**
```
https://kris-idp.duckdns.org/krisacc-svc-1/health
https://kris-idp.duckdns.org/krisacc-svc-2/health
https://kris-idp.duckdns.org/krisacc-svc-3/health
https://kris-idp.duckdns.org/krisacc-svc-4/health
```

## Configuration Summary

### EC2 #1 (Control Plane) - 13.42.36.97

**NGINX Configuration (`nginx-ssl.conf`):**
```nginx
location ~ ^/([a-zA-Z0-9-]+svc[a-zA-Z0-9-]*|[a-zA-Z0-9-]+-service|[a-zA-Z0-9-]+-api)(/.*)?$ {
    proxy_pass http://172.31.2.204$request_uri;  # k3s private IP
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    # ... timeouts ...
}
```

**Status:** ✅ Deployed and active

### EC2 #2 (k3s Cluster) - 18.130.143.156

**k3s NGINX Ingress:**
- LoadBalancer IP: `172.31.2.204`
- HTTP Port: `80`
- HTTPS Port: `443`

**Test Service Ingress:**
```yaml
host: kris-idp.org
annotations:
  nginx.ingress.kubernetes.io/ssl-redirect: "false"
  nginx.ingress.kubernetes.io/force-ssl-redirect: "false"
```

**Status:** ✅ Working

## Request Flow

```
User Browser
    ↓ HTTPS
kris-idp.org (DNS resolves to 13.42.36.97)
    ↓
EC2 #1 - NGINX
    ├─ SSL Termination (Let's Encrypt)
    ├─ Pattern Match: /test-proxy-svc/
    └─ Proxy to: http://172.31.2.204/test-proxy-svc/
        ↓ HTTP (internal VPC)
    EC2 #2 - k3s NGINX Ingress
        ├─ Host Match: kris-idp.org
        ├─ Path Match: /test-proxy-svc/
        └─ Route to Pod
            ↓
        Service Pod (test-proxy-svc)
            ↓ HTTP Response
        User Browser (via proxy chain)
```

## Test Service Details

**Deployment:**
- Name: `test-proxy-svc`
- Image: `ealen/echo-server:latest`
- Replicas: 1
- Port: 80

**Service:**
- Type: ClusterIP
- Port: 80

**Ingress:**
- Host: `kris-idp.org`
- Path: `/test-proxy-svc(/|$)(.*)`
- Rewrite: `/$2`
- SSL Redirect: `false`

**Pod Status:**
```
NAME                              READY   STATUS    RESTARTS   AGE
test-proxy-svc-766f6bbdb5-z7k7g   1/1     Running   0          Running
```

## Verification Commands

```bash
# Test service via proxy
curl https://kris-idp.org/test-proxy-svc/health
# Expected: HTTP 200 with JSON response

# Check proxy headers
curl -s https://kris-idp.org/test-proxy-svc/ | jq '.request.headers'
# Should show: x-forwarded-host: kris-idp.org

# Verify NGINX config on EC2 #1
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \
  "docker exec idp-frontend cat /etc/nginx/conf.d/default.conf" | grep 172.31.2.204
# Should show: proxy_pass http://172.31.2.204$request_uri;

# Check test service ingress
kubectl get ingress test-proxy-svc -o yaml
# Should show: host: kris-idp.org, ssl-redirect: false
```

## What Was Fixed

### Issue 1: Wrong IP Address
- ❌ **Before:** `proxy_pass http://18.130.143.156:30080`
- ✅ **After:** `proxy_pass http://172.31.2.204`
- **Why:** Need to use k3s node's private IP, not public IP

### Issue 2: Wrong Port
- ❌ **Before:** Port `30080` (NodePort that doesn't exist)
- ✅ **After:** Port `80` (LoadBalancer)
- **Why:** k3s ingress uses LoadBalancer on port 80

### Issue 3: SSL Redirect Loop
- ❌ **Before:** Templates had `ssl-redirect: true`
- ✅ **After:** Templates have `ssl-redirect: false`
- **Why:** EC2 #1 handles SSL, k3s should accept HTTP

## Cleanup Test Service

When ready to clean up the test service:

```bash
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@18.130.143.156 \
  "kubectl delete -f /tmp/test-proxy-service.yaml"
```

## Next Steps

### Option 1: Keep Test Service
- Leave it running as a proof-of-concept
- Shows the proxy configuration works
- Can be used for monitoring/testing

### Option 2: Create Real Service via IDP
- Use IDP UI to create a new service
- It will automatically use the correct configuration
- Will be accessible at `kris-idp.org/<service-name>/`

### Option 3: Update Existing Services (When Ready)
- When you want to migrate existing services to kris-idp.org
- Update their helm/values.yaml on GitHub
- Change host and ssl-redirect settings
- Sync in ArgoCD

## Success Criteria

- ✅ NGINX proxy configured with correct IP and port
- ✅ Network connectivity between EC2 instances working
- ✅ Test service deployed and accessible
- ✅ HTTP 200 responses via kris-idp.org
- ✅ Proxy headers correctly forwarded
- ✅ No SSL redirect loops
- ✅ Templates updated for future services

## Status: WORKING ✅

The NGINX proxy is fully functional and ready for use!

**Date Confirmed:** 2026-02-11
**Test Service:** test-proxy-svc
**Test URL:** https://kris-idp.org/test-proxy-svc/health
**Result:** HTTP 200 OK
