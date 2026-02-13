# Quick Deployment Steps - NGINX Proxy for Service Accessibility

**Goal:** Make all services accessible via `kris-idp.org` (currently only work on `kris-idp.duckdns.org`)

**Time Required:** ~15-30 minutes

---

## Step 1: Deploy NGINX Configuration (5 min)

```bash
# From local machine
cd /Users/krishansingh/Documents/claude_ai/idp

# Upload updated NGINX config to EC2 #1
scp -i ~/.ssh/idp-demo-key-new.pem \
  nginx-ssl.conf \
  ec2-user@13.42.36.97:~/idp/nginx-ssl.conf

# SSH to EC2 #1 and reload NGINX
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 << 'EOF'
cd idp
docker exec idp-frontend nginx -t && \
docker exec idp-frontend nginx -s reload
EOF
```

**Verify:**
```bash
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \
  "docker exec idp-frontend nginx -t"
# Should output: "syntax is ok" and "test is successful"
```

---

## Step 2: Update Service Ingress Hosts (10 min)

### Option A: Automated (Recommended)

```bash
# From local machine
cd /Users/krishansingh/Documents/claude_ai/idp

# Run the update script
./deploy-update-services.sh
```

### Option B: Manual

For each service (krisacc-svc-1 through krisacc-svc-4):

1. Open: `https://github.com/krisaccsyn/krisacc-svc-X/edit/main/helm/values.yaml`
2. Change line 15: `host: kris-idp.duckdns.org` → `host: kris-idp.org`
3. Commit with message: "Update ingress host to kris-idp.org"

---

## Step 3: Sync Services in ArgoCD (5 min)

```bash
# Get ArgoCD password
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath="{.data.password}" | base64 -d

# Login to ArgoCD CLI
argocd login kris-idp.duckdns.org:443 --username admin --insecure

# Sync all services
argocd app sync krisacc-svc-1 krisacc-svc-2 krisacc-svc-3 krisacc-svc-4

# Check status
argocd app list
```

**Or use ArgoCD Web UI:**
- https://kris-idp.duckdns.org/argocd/
- Login → Click each service → Sync → Synchronize

---

## Step 4: Test (5 min)

```bash
# From local machine
cd /Users/krishansingh/Documents/claude_ai/idp

# Run automated tests
./test-service-accessibility.sh

# Or manual tests
curl https://kris-idp.org/krisacc-svc-1/health
curl https://kris-idp.org/krisacc-svc-2/health
curl https://kris-idp.org/krisacc-svc-3/health
curl https://kris-idp.org/krisacc-svc-4/health
```

**Expected:** Each returns `{"status":"healthy","service":"krisacc-svc-X"}`

---

## Troubleshooting Quick Fixes

### 404 Not Found
```bash
# NGINX config not loaded - reload it
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \
  "docker exec idp-frontend nginx -s reload"
```

### 502 Bad Gateway
```bash
# k3s not accessible - check connectivity
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \
  "curl -I http://18.130.143.156:30080/krisacc-svc-1/health"
```

### Services Still on Old Domain
```bash
# Ingress not updated - check and sync
kubectl get ingress -o wide
argocd app sync krisacc-svc-1  # Repeat for all services
```

---

## Rollback (If Needed)

```bash
# SSH to EC2 #1
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97

# Restore old config (if you made a backup)
cd idp
cp nginx-ssl.conf.backup nginx-ssl.conf
docker exec idp-frontend nginx -s reload

# Services will still work on kris-idp.duckdns.org
```

---

## Success Checklist

- [ ] NGINX config uploaded and reloaded without errors
- [ ] All 4 services updated on GitHub (host: kris-idp.org)
- [ ] All 4 services synced in ArgoCD (Healthy status)
- [ ] All 4 services return 200 OK at kris-idp.org URLs
- [ ] IDP frontend still works at https://kris-idp.org/
- [ ] IDP backend API still works at https://kris-idp.org/api

---

## What Changed

**File Modified:**
- `nginx-ssl.conf` - Added proxy rules to forward service requests to k3s cluster

**Architecture:**
```
Before: kris-idp.org → Only IDP Platform
        kris-idp.duckdns.org → User Services

After:  kris-idp.org → IDP Platform + User Services (proxied to k3s)
        kris-idp.duckdns.org → Still works (for safety)
```

**How It Works:**
1. User requests `https://kris-idp.org/krisacc-svc-1/health`
2. DNS resolves to EC2 #1 (13.42.36.97)
3. NGINX on EC2 #1 matches path pattern `/krisacc-svc-1/`
4. NGINX proxies request to k3s cluster on EC2 #2 (18.130.143.156:30080)
5. k3s NGINX Ingress routes to service pod
6. Response flows back through proxy to user

---

## Documentation

For detailed information, see:
- **Full Guide:** `DEPLOY_NGINX_PROXY.md`
- **Troubleshooting:** Section in DEPLOY_NGINX_PROXY.md
- **Architecture:** Plan document at start of conversation

---

## Next Steps After Deployment

1. Test creating a new service via IDP UI - verify it's immediately accessible at kris-idp.org
2. Update README.md with new service URL structure
3. Monitor NGINX logs for any proxy errors: `docker logs idp-frontend`
4. Eventually can deprecate kris-idp.duckdns.org references (keep for now as backup)
