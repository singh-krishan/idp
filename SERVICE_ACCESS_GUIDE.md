# Service Access Guide - How to Access Your Deployed Services

**Date:** 2026-02-11
**Service Example:** krisacc-svc-1

---

## 🎯 Understanding Service Deployment

When you create a service through the IDP Platform:

1. ✅ **GitHub Repository** is created with your code
2. ✅ **GitHub Actions** builds Docker image and pushes to GHCR
3. ✅ **ArgoCD Application** is created
4. ✅ **Kubernetes Resources** are deployed (Deployment, Service, Ingress)
5. ✅ **Ingress** exposes the service publicly via HTTPS

**Your service is NOT accessible from the IDP frontend URL!**

---

## 📍 Where Is My Service?

### Service: krisacc-svc-1

**GitHub Repository:**
```
https://github.com/singh-krishan/krisacc-svc-1
```

**Deployed To:**
- **Kubernetes Cluster:** 18.130.143.156:30443
- **ArgoCD UI:** https://18.130.143.156:30443
- **Namespace:** default

**Public Endpoints (OLD DOMAIN):**
```
https://kris-idp.duckdns.org/krisacc-svc-1/
https://kris-idp.duckdns.org/krisacc-svc-1/health
```

**Public Endpoints (NEW DOMAIN - After Update):**
```
https://kris-idp.org/krisacc-svc-1/
https://kris-idp.org/krisacc-svc-1/health
```

---

## 🔧 How Ingress Works

### Ingress Configuration

Your service template includes an ingress that:

1. **Exposes service on a specific path:**
   - Path pattern: `/<project-name>(/|$)(.*)`
   - Example: `/krisacc-svc-1/health`

2. **Uses path rewriting:**
   - External request: `https://kris-idp.org/krisacc-svc-1/health`
   - Internal request: `http://krisacc-svc-1-service/health`
   - The `/krisacc-svc-1` prefix is stripped by nginx

3. **Requires:**
   - ✅ nginx-ingress-controller in cluster
   - ✅ cert-manager for TLS certificates
   - ✅ DNS pointing to cluster load balancer
   - ✅ Letsencrypt ClusterIssuer configured

### Ingress Template

From `helm/templates/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: krisacc-svc-1
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - kris-idp.org
    secretName: kris-idp-tls
  rules:
  - host: kris-idp.org
    http:
      paths:
      - path: /krisacc-svc-1(/|$)(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: krisacc-svc-1
            port:
              number: 80
```

---

## ✅ Step 1: Check ArgoCD Status

### Access ArgoCD UI

1. **Open in browser:**
   ```
   https://18.130.143.156:30443
   ```

2. **Login credentials:**
   - **Username:** `admin`
   - **Password:** `9dXEuh5sATcVKRu9`

### Find Your Application

1. Search for `krisacc-svc-1` in the applications list
2. Check the status indicators:

   | Status | Meaning | Action |
   |--------|---------|--------|
   | 🟢 **Synced + Healthy** | Everything working | Service is accessible |
   | 🟡 **Synced + Progressing** | Pods starting | Wait 1-2 minutes |
   | 🔴 **Synced + Degraded** | Pods failing | Check logs, fix issues |
   | ⚪ **OutOfSync** | Changes not applied | Click "Sync" button |

3. **Click on the application** to see detailed resources:
   - **Pods** - Should show "Running"
   - **Service** - Should show ClusterIP
   - **Ingress** - Should show host and path

### Common Issues in ArgoCD

#### Issue: Application is "Degraded"

**Possible Causes:**
1. **ImagePullBackOff** - Can't pull Docker image from GHCR
2. **CrashLoopBackOff** - App crashes on startup
3. **Pending** - Not enough cluster resources

**Solutions:**

**For ImagePullBackOff:**
```bash
# Check if image exists in GHCR
https://github.com/singh-krishan/krisacc-svc-1/pkgs/container/krisacc-svc-1

# Make sure package is public or add image pull secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=singh-krishan \
  --docker-password=<GITHUB_TOKEN> \
  --docker-email=your-email@example.com

# Update deployment to use the secret
# Add to helm/templates/deployment.yaml:
imagePullSecrets:
  - name: ghcr-secret
```

**For CrashLoopBackOff:**
```bash
# Check pod logs
kubectl logs -l app=krisacc-svc-1 --tail=100

# Common issues:
# - App expects environment variables not set
# - App tries to connect to database that doesn't exist
# - Port mismatch (app listens on different port than defined)
```

---

## ✅ Step 2: Verify Pods Are Running

If you have kubectl access to the cluster:

```bash
# Check pods
kubectl get pods -l app=krisacc-svc-1

# Expected output:
# NAME                             READY   STATUS    RESTARTS   AGE
# krisacc-svc-1-xxxxxxxxx-xxxxx   1/1     Running   0          5m

# Check pod details
kubectl describe pod -l app=krisacc-svc-1

# Check pod logs
kubectl logs -l app=krisacc-svc-1 --tail=50 -f
```

---

## ✅ Step 3: Verify Service and Ingress

```bash
# Check service
kubectl get svc krisacc-svc-1

# Expected output:
# NAME            TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
# krisacc-svc-1   ClusterIP   10.96.xxx.xxx   <none>        80/TCP    5m

# Check ingress
kubectl get ingress krisacc-svc-1

# Expected output:
# NAME            CLASS   HOSTS                    ADDRESS        PORTS     AGE
# krisacc-svc-1   nginx   kris-idp.duckdns.org     x.x.x.x        80, 443   5m

# Get detailed ingress info
kubectl describe ingress krisacc-svc-1
```

### Verify Ingress Backend

```bash
# Check if backend is healthy
kubectl get ingress krisacc-svc-1 -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Test from inside cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://krisacc-svc-1/health
```

---

## ✅ Step 4: Update Service Domain

Your service was deployed with the old domain `kris-idp.duckdns.org`. Update it to use `kris-idp.org`:

### Method 1: Edit via GitHub UI

1. **Go to your repository:**
   ```
   https://github.com/singh-krishan/krisacc-svc-1
   ```

2. **Edit `helm/values.yaml`:**
   ```
   https://github.com/singh-krishan/krisacc-svc-1/edit/main/helm/values.yaml
   ```

3. **Find line 15:**
   ```yaml
   ingress:
     enabled: true
     host: kris-idp.duckdns.org  # OLD
     path: krisacc-svc-1
     tlsSecretName: kris-idp-tls
   ```

4. **Change to:**
   ```yaml
   ingress:
     enabled: true
     host: kris-idp.org  # NEW
     path: krisacc-svc-1
     tlsSecretName: kris-idp-tls
   ```

5. **Commit changes** with message: "Update ingress host to kris-idp.org"

6. **Sync in ArgoCD:**
   - Open ArgoCD UI
   - Click on `krisacc-svc-1` application
   - Click **"Sync"** button
   - Select **"Synchronize"**

7. **Wait 30-60 seconds** for sync to complete

8. **Access your service:**
   ```
   https://kris-idp.org/krisacc-svc-1/health
   ```

### Method 2: Using kubectl (Direct)

```bash
# Edit the ingress directly
kubectl edit ingress krisacc-svc-1

# Find the host field and change:
# OLD:
#   - host: kris-idp.duckdns.org
# NEW:
#   - host: kris-idp.org

# Save and exit (:wq in vim)
```

**Note:** Direct kubectl edits will be overwritten next time ArgoCD syncs. Always update the source in GitHub.

---

## ✅ Step 5: Test Your Service

### Using curl

```bash
# Test health endpoint
curl -v https://kris-idp.org/krisacc-svc-1/health

# Expected response:
# HTTP/2 200
# content-type: application/json
# {"status":"healthy","timestamp":"2026-02-11T12:30:00Z"}

# Test root endpoint
curl https://kris-idp.org/krisacc-svc-1/

# Test with authentication (if required)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://kris-idp.org/krisacc-svc-1/api/endpoint
```

### Using Browser

1. **Open:**
   ```
   https://kris-idp.org/krisacc-svc-1/
   ```

2. **Test health:**
   ```
   https://kris-idp.org/krisacc-svc-1/health
   ```

3. **Check API docs (if using FastAPI):**
   ```
   https://kris-idp.org/krisacc-svc-1/docs
   ```

### Using httpie

```bash
# Install httpie
brew install httpie

# Test endpoint
http https://kris-idp.org/krisacc-svc-1/health

# POST request with JSON
http POST https://kris-idp.org/krisacc-svc-1/api/data \
  name=test \
  value=123
```

---

## 🐛 Troubleshooting

### Issue: 503 Service Unavailable

**Causes:**
1. Pods not running or not ready
2. Service selector doesn't match pod labels
3. Backend health checks failing

**Solutions:**

```bash
# Check pod status
kubectl get pods -l app=krisacc-svc-1

# If pods are Running, check readiness
kubectl describe pod -l app=krisacc-svc-1 | grep -A 10 "Readiness"

# Check service endpoints
kubectl get endpoints krisacc-svc-1

# Should show pod IPs. If empty, selector is wrong
# Check service selector matches pod labels:
kubectl get svc krisacc-svc-1 -o yaml | grep -A 5 selector
kubectl get pods -l app=krisacc-svc-1 --show-labels
```

### Issue: 404 Not Found

**Causes:**
1. Ingress path is wrong
2. Service listening on different path
3. Path rewrite annotation incorrect

**Solutions:**

```bash
# Check ingress path
kubectl get ingress krisacc-svc-1 -o yaml | grep path

# Test service directly (port-forward)
kubectl port-forward svc/krisacc-svc-1 8080:80

# Then test:
curl http://localhost:8080/health

# If this works but ingress doesn't, check rewrite rule
kubectl get ingress krisacc-svc-1 -o yaml | grep rewrite-target
```

### Issue: SSL Certificate Not Valid

**Causes:**
1. cert-manager not installed
2. ClusterIssuer not configured
3. Certificate still provisioning

**Solutions:**

```bash
# Check if cert-manager is installed
kubectl get pods -n cert-manager

# Check certificate status
kubectl get certificate -n default

# Check certificate details
kubectl describe certificate kris-idp-tls

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager
```

### Issue: DNS Not Resolving

**Causes:**
1. Domain doesn't point to cluster load balancer
2. Wrong IP in DNS configuration

**Solutions:**

```bash
# Check what IP the domain resolves to
nslookup kris-idp.org

# Check ingress load balancer IP
kubectl get ingress krisacc-svc-1 \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# These IPs should match
```

### Issue: ImagePullBackOff

**Causes:**
1. Docker image doesn't exist or is private
2. No imagePullSecret configured
3. Wrong image tag

**Solutions:**

```bash
# Check image in GHCR
open https://github.com/singh-krishan?tab=packages

# Make package public:
# Go to package settings → Change visibility → Public

# Or create image pull secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=singh-krishan \
  --docker-password=YOUR_GITHUB_PAT \
  --docker-email=your-email@example.com

# Add to values.yaml:
imagePullSecrets:
  - name: ghcr-secret
```

---

## 📊 Service URL Patterns

### Understanding the URL Structure

```
https://kris-idp.org/krisacc-svc-1/health
         └─────┬─────┘ └─────┬──────┘ └──┬──┘
           Domain      Service Name    Endpoint
```

**Components:**
- **Domain:** `kris-idp.org` (shared by all services)
- **Service Path:** `/krisacc-svc-1` (unique per service)
- **Endpoint:** `/health` (defined in your app code)

### Example Services

| Service | URL | Notes |
|---------|-----|-------|
| krisacc-svc-1 | https://kris-idp.org/krisacc-svc-1/ | Python microservice |
| my-api | https://kris-idp.org/my-api/ | Node.js API |
| user-service | https://kris-idp.org/user-service/api/users | With nested paths |

### Testing Different Endpoints

```bash
# Health check
curl https://kris-idp.org/krisacc-svc-1/health

# API endpoint
curl https://kris-idp.org/krisacc-svc-1/api/data

# Metrics (if enabled)
curl https://kris-idp.org/krisacc-svc-1/metrics
```

---

## 🚀 Future Services

All new services created through the IDP will automatically use:
- ✅ Domain: `kris-idp.org`
- ✅ Path: `/<project-name>`
- ✅ HTTPS with auto-provisioned certificates
- ✅ Nginx ingress with path rewriting

**No additional configuration needed!**

---

## 📚 Quick Reference Commands

```bash
# Check all deployments
kubectl get deployments -n default

# Check all services
kubectl get svc -n default

# Check all ingresses
kubectl get ingress -n default

# Check all pods
kubectl get pods -n default

# Watch pods in real-time
kubectl get pods -w

# Get logs from all pods of a service
kubectl logs -l app=krisacc-svc-1 --tail=100 -f

# Describe pod for troubleshooting
kubectl describe pod <pod-name>

# Execute command in pod
kubectl exec -it <pod-name> -- /bin/sh

# Port forward to local machine
kubectl port-forward svc/krisacc-svc-1 8080:80

# Delete and recreate pod (forces image pull)
kubectl delete pod -l app=krisacc-svc-1

# Force ArgoCD sync
# Via UI: Click app → Sync → Synchronize
# Via CLI: argocd app sync krisacc-svc-1
```

---

## 🔗 Useful Links

**Your Service:**
- GitHub Repo: https://github.com/singh-krishan/krisacc-svc-1
- GitHub Actions: https://github.com/singh-krishan/krisacc-svc-1/actions
- GHCR Package: https://github.com/singh-krishan/krisacc-svc-1/pkgs/container/krisacc-svc-1
- Service URL: https://kris-idp.org/krisacc-svc-1/
- Health Check: https://kris-idp.org/krisacc-svc-1/health

**Infrastructure:**
- ArgoCD UI: https://18.130.143.156:30443
- IDP Frontend: https://kris-idp.org
- IDP API: https://kris-idp.org/api/v1

**Documentation:**
- Kubernetes Ingress: https://kubernetes.io/docs/concepts/services-networking/ingress/
- nginx Ingress Controller: https://kubernetes.github.io/ingress-nginx/
- cert-manager: https://cert-manager.io/docs/
- ArgoCD: https://argo-cd.readthedocs.io/

---

## 💡 Pro Tips

1. **Always check ArgoCD first** - It shows the real-time status of your deployment

2. **Use kubectl port-forward** to test services without ingress:
   ```bash
   kubectl port-forward svc/krisacc-svc-1 8080:80
   curl http://localhost:8080/health
   ```

3. **Enable detailed logging** in your application for easier debugging

4. **Add health checks** to your application:
   ```python
   @app.get("/health")
   def health():
       return {"status": "healthy", "timestamp": datetime.now()}
   ```

5. **Monitor pod resource usage**:
   ```bash
   kubectl top pods -l app=krisacc-svc-1
   ```

6. **Check ingress logs** for request debugging:
   ```bash
   kubectl logs -n ingress-nginx \
     -l app.kubernetes.io/name=ingress-nginx \
     --tail=100 -f | grep krisacc-svc-1
   ```

---

**Last Updated:** 2026-02-11
**Cluster:** 18.130.143.156:30443
**Domain:** kris-idp.org
