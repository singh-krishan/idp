# Deploy NGINX Proxy for Service Accessibility

This guide implements **Option 1: NGINX Proxy** to make all services accessible via `kris-idp.org`.

## What This Fixes

**Before:**
- Services only accessible at `https://kris-idp.duckdns.org/krisacc-svc-X/`
- Requests to `https://kris-idp.org/krisacc-svc-X/` fail with 404

**After:**
- All services accessible at `https://kris-idp.org/krisacc-svc-X/`
- Single unified domain for IDP and deployed services

## Architecture

```
User Request → kris-idp.org (DNS: EC2 #1 - 13.42.36.97)
  → NGINX on EC2 #1
    ├─ / → React Frontend
    ├─ /api → FastAPI Backend
    └─ /*-svc*/ → Proxy to k3s (EC2 #2 - 18.130.143.156:30080)
```

---

## Phase 1: Deploy Updated NGINX Configuration

### Step 1: Backup Current Configuration

SSH to EC2 #1:
```bash
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97
cd idp
cp nginx-ssl.conf nginx-ssl.conf.backup-$(date +%Y%m%d)
```

### Step 2: Upload New Configuration

From your local machine:
```bash
cd /Users/krishansingh/Documents/claude_ai/idp

# Upload updated config
scp -i ~/.ssh/idp-demo-key-new.pem \
  nginx-ssl.conf \
  ec2-user@13.42.36.97:~/idp/nginx-ssl.conf
```

### Step 3: Test and Reload NGINX

SSH to EC2 #1:
```bash
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97
cd idp

# Test configuration syntax
docker exec idp-frontend nginx -t

# If test passes, reload NGINX
docker exec idp-frontend nginx -s reload

# Verify NGINX is running
docker ps | grep idp-frontend
```

**Expected Output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## Phase 2: Update Existing Services on GitHub

For each service (krisacc-svc-1, krisacc-svc-2, krisacc-svc-3, krisacc-svc-4):

### Option A: Using GitHub Web UI

1. Navigate to: `https://github.com/krisaccsyn/krisacc-svc-X`
2. Edit `helm/values.yaml`
3. Change line 15:
   ```yaml
   # FROM:
   host: kris-idp.duckdns.org

   # TO:
   host: kris-idp.org
   ```
4. Commit: "Update ingress host to kris-idp.org"
5. Repeat for all 4 services

### Option B: Using GitHub CLI (Faster)

```bash
cd /Users/krishansingh/Documents/claude_ai/idp

# Run the update script (see deploy-update-services.sh below)
bash deploy-update-services.sh
```

---

## Phase 3: Sync Services in ArgoCD

After updating GitHub, sync each service in ArgoCD:

### Option A: Using ArgoCD Web UI

1. Open: `https://kris-idp.duckdns.org/argocd/`
2. Login with admin credentials
3. For each service (krisacc-svc-1, krisacc-svc-2, krisacc-svc-3, krisacc-svc-4):
   - Click the service
   - Click "Sync" button
   - Click "Synchronize"
   - Wait for "Healthy" status

### Option B: Using ArgoCD CLI

```bash
# Get ArgoCD password
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath="{.data.password}" | base64 -d

# Login to ArgoCD
argocd login kris-idp.duckdns.org:443 --username admin --insecure

# Sync all services
argocd app sync krisacc-svc-1
argocd app sync krisacc-svc-2
argocd app sync krisacc-svc-3
argocd app sync krisacc-svc-4

# Check status
argocd app get krisacc-svc-1
argocd app get krisacc-svc-2
argocd app get krisacc-svc-3
argocd app get krisacc-svc-4
```

---

## Phase 4: Test Service Accessibility

### Test from Command Line

```bash
# Test each service health endpoint
curl -I https://kris-idp.org/krisacc-svc-1/health
curl -I https://kris-idp.org/krisacc-svc-2/health
curl -I https://kris-idp.org/krisacc-svc-3/health
curl -I https://kris-idp.org/krisacc-svc-4/health

# Expected: HTTP/2 200
# If you see 404, 502, or 504, see troubleshooting below
```

### Test Full Response

```bash
curl https://kris-idp.org/krisacc-svc-1/health
```

**Expected Output:**
```json
{"status":"healthy","service":"krisacc-svc-1"}
```

### Test in Browser

Open each URL in browser:
- https://kris-idp.org/krisacc-svc-1/health
- https://kris-idp.org/krisacc-svc-2/health
- https://kris-idp.org/krisacc-svc-3/health
- https://kris-idp.org/krisacc-svc-4/health

---

## Phase 5: Verify Everything Works

### Checklist

- [ ] IDP Frontend loads at https://kris-idp.org/
- [ ] IDP Backend API works at https://kris-idp.org/api/v1/projects
- [ ] krisacc-svc-1 accessible at https://kris-idp.org/krisacc-svc-1/health
- [ ] krisacc-svc-2 accessible at https://kris-idp.org/krisacc-svc-2/health
- [ ] krisacc-svc-3 accessible at https://kris-idp.org/krisacc-svc-3/health
- [ ] krisacc-svc-4 accessible at https://kris-idp.org/krisacc-svc-4/health
- [ ] No SSL certificate errors
- [ ] Services still work on old domain (kris-idp.duckdns.org) during transition

### Test IDP Functionality

1. Create a new service using IDP UI
2. Verify it's accessible at `https://kris-idp.org/<new-service-name>/health`
3. Confirms templates are using correct domain

---

## Troubleshooting

### Issue: 404 Not Found

**Symptom:** `curl https://kris-idp.org/krisacc-svc-1/health` returns 404

**Diagnosis:**
```bash
# Check NGINX config was loaded
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97
docker exec idp-frontend cat /etc/nginx/conf.d/default.conf | grep -A 10 "Proxy deployed"
```

**Fix:**
- Verify config file uploaded correctly
- Reload NGINX: `docker exec idp-frontend nginx -s reload`

---

### Issue: 502 Bad Gateway

**Symptom:** `curl https://kris-idp.org/krisacc-svc-1/health` returns 502

**Diagnosis:**
```bash
# Check if k3s NGINX Ingress is accessible from EC2 #1
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97
curl -I http://18.130.143.156:30080/krisacc-svc-1/health
```

**Fix:**
1. Verify EC2 security groups allow traffic between instances
2. Check k3s NGINX Ingress is running:
   ```bash
   kubectl get pods -n ingress-nginx
   kubectl get svc -n ingress-nginx
   ```

---

### Issue: 504 Gateway Timeout

**Symptom:** Request takes 60+ seconds and times out

**Diagnosis:**
```bash
# Check if service pods are running
kubectl get pods -l app=krisacc-svc-1

# Check service logs
kubectl logs -l app=krisacc-svc-1 --tail=50
```

**Fix:**
- Restart service pods: `kubectl rollout restart deployment/krisacc-svc-1`
- Increase timeout in nginx-ssl.conf if services are legitimately slow

---

### Issue: SSL Certificate Warning

**Symptom:** Browser shows SSL certificate error

**Diagnosis:**
This shouldn't happen since kris-idp.org already has valid Let's Encrypt certificate

**Fix:**
```bash
# Check certificate validity
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97
sudo certbot certificates
```

---

### Issue: Services Work on duckdns.org but Not kris-idp.org

**Diagnosis:**
- Ingress host not updated in GitHub
- ArgoCD not synced

**Fix:**
1. Check ingress host in GitHub: `https://github.com/krisaccsyn/krisacc-svc-X/blob/main/helm/values.yaml`
2. Verify line 15 shows `host: kris-idp.org`
3. Sync in ArgoCD: `argocd app sync krisacc-svc-X`
4. Wait 30 seconds for ingress to update

---

## Rollback Plan

If issues occur, quickly revert to previous working state:

```bash
# SSH to EC2 #1
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97
cd idp

# Restore backup
cp nginx-ssl.conf.backup-YYYYMMDD nginx-ssl.conf

# Reload NGINX
docker exec idp-frontend nginx -s reload

# Services will still work on kris-idp.duckdns.org
```

Then update services back to `host: kris-idp.duckdns.org` if needed.

---

## Success Criteria

✅ All services accessible via single domain `kris-idp.org`
✅ No 404, 502, or 504 errors
✅ IDP frontend and backend still functional
✅ New services automatically use correct domain
✅ Professional, unified URL structure

---

## Next Steps After Successful Deployment

1. **Update Documentation:**
   - Update README.md with new service URLs
   - Update any deployment guides or runbooks

2. **Monitor Performance:**
   - Check NGINX access logs: `docker logs idp-frontend`
   - Monitor response times for proxy overhead
   - If performance issues, consider Option 3 (use duckdns.org) as fallback

3. **Optional: Deprecate DuckDNS Domain:**
   - Once stable, can remove kris-idp.duckdns.org references
   - Keep working during transition period for safety

4. **Test New Service Creation:**
   - Create a test service via IDP UI
   - Verify it's immediately accessible at kris-idp.org
   - Confirms end-to-end flow works

---

## Files Modified

### Local Files (This Repository)
- ✅ `nginx-ssl.conf` - Added service proxy configuration

### Remote Files (Needs Manual Update)
- GitHub: `krisaccsyn/krisacc-svc-1/helm/values.yaml` - Line 15
- GitHub: `krisaccsyn/krisacc-svc-2/helm/values.yaml` - Line 15
- GitHub: `krisaccsyn/krisacc-svc-3/helm/values.yaml` - Line 15
- GitHub: `krisaccsyn/krisacc-svc-4/helm/values.yaml` - Line 15
- EC2 #1: `/home/ec2-user/idp/nginx-ssl.conf` - Needs upload

---

## Timeline

- **Phase 1 (NGINX):** 5 minutes
- **Phase 2 (GitHub):** 10 minutes (or 2 minutes with script)
- **Phase 3 (ArgoCD Sync):** 5 minutes
- **Phase 4 (Testing):** 5 minutes
- **Phase 5 (Verification):** 5 minutes

**Total Time:** ~30 minutes

---

## Support

If you encounter issues not covered in troubleshooting:

1. Check NGINX logs: `docker logs idp-frontend`
2. Check k3s ingress logs: `kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx`
3. Verify service pod logs: `kubectl logs -l app=krisacc-svc-X`
4. Test connectivity between EC2 instances
5. Review ArgoCD application status for errors
