# NGINX Proxy Not Working - Troubleshooting Steps

## Quick Diagnostic Commands

Run these commands to identify the issue:

### 1. Check if NGINX config file was actually deployed

```bash
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \
  "docker exec idp-frontend cat /etc/nginx/conf.d/default.conf" | grep -A 10 "Proxy deployed"
```

**Expected:** Should show the proxy location block
**If not found:** NGINX config file wasn't uploaded or container needs restart

---

### 2. Check NGINX container is using the correct config file

```bash
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \
  "docker inspect idp-frontend | grep -A 5 nginx"
```

**Check:** Volume mounts for nginx config
**Issue:** Config might not be mounted into container

---

### 3. Test k3s is accessible from EC2 #1

```bash
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \
  "curl -v http://18.130.143.156:30080/krisacc-svc-1/health"
```

**Expected:** Should get HTTP response (200, 404, or 502)
**If connection refused:** Network/security group issue
**If timeout:** k3s NGINX ingress not running on NodePort 30080

---

### 4. Test service directly (bypass NGINX proxy)

```bash
curl -v https://kris-idp.org/krisacc-svc-1/health
```

**Check the response:**
- **404:** NGINX proxy rule not matching
- **502:** k3s unreachable from EC2 #1
- **503:** Service pod not ready
- **200:** It's working!

---

### 5. Check service ingress configuration

```bash
kubectl get ingress -o yaml | grep -A 10 krisacc-svc-1
```

**Check:**
- `host:` should be `kris-idp.org`
- `path:` should be `/krisacc-svc-1` or `/krisacc-svc-1/`

---

## Common Issues & Fixes

### Issue 1: NGINX Config Not Loaded

**Symptom:** Test 1 doesn't show proxy config

**Cause:** Config file not uploaded or container using old config

**Fix:**
```bash
# Check what config file is in the container
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 << 'EOF'
cd idp
# Check if nginx-ssl.conf exists on host
ls -lh nginx-ssl.conf

# Check if config has proxy rules
grep "Proxy deployed" nginx-ssl.conf

# Restart the container to load new config
docker-compose restart frontend
# OR
docker restart idp-frontend

# Verify config loaded
sleep 5
docker exec idp-frontend nginx -t
EOF
```

---

### Issue 2: Config File Not Mounted in Docker Container

**Symptom:** File exists on host but container shows old config

**Cause:** docker-compose.yml doesn't mount the config file

**Fix - Check docker-compose.yml:**
```bash
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \
  "cat ~/idp/docker-compose.yml" | grep -A 10 "frontend:"
```

**Look for:**
```yaml
frontend:
  volumes:
    - ./nginx-ssl.conf:/etc/nginx/conf.d/default.conf
```

**If missing, add the volume mount and restart:**
```bash
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 << 'EOF'
cd idp
# Edit docker-compose.yml to add volume mount
# Then restart
docker-compose down
docker-compose up -d
EOF
```

---

### Issue 3: k3s NGINX Ingress Not Accessible

**Symptom:** Test 3 fails with connection refused or timeout

**Fix - Check NodePort service:**
```bash
kubectl get svc -n ingress-nginx
```

**Expected output:**
```
NAME                    TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)
ingress-nginx           NodePort    10.x.x.x        <none>        80:30080/TCP,443:30443/TCP
```

**If NodePort not 30080:**
- Update nginx-ssl.conf with actual NodePort
- Or update ingress service to use NodePort 30080

**Fix NodePort:**
```bash
kubectl patch svc ingress-nginx-controller -n ingress-nginx -p '{"spec":{"type":"NodePort","ports":[{"port":80,"nodePort":30080,"name":"http"},{"port":443,"nodePort":30443,"name":"https"}]}}'
```

---

### Issue 4: Security Group Blocking Traffic

**Symptom:** Test 3 times out

**Fix - Check EC2 #1 can reach EC2 #2:**
```bash
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \
  "ping -c 3 18.130.143.156"
```

**If ping fails:**
- Check AWS Security Groups
- EC2 #2 security group must allow inbound on port 30080 from EC2 #1's private IP
- Add rule: Type=Custom TCP, Port=30080, Source=<EC2 #1 Private IP>

**Get private IPs:**
```bash
# EC2 #1 private IP
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 "hostname -I"

# EC2 #2 private IP
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@18.130.143.156 "hostname -I"
```

---

### Issue 5: Regex Pattern Not Matching

**Symptom:** Test 5 returns 404, but k3s is accessible

**Cause:** Service name doesn't match regex pattern

**Current regex:**
```regex
^/([a-zA-Z0-9-]+svc[a-zA-Z0-9-]*|[a-zA-Z0-9-]+-service|[a-zA-Z0-9-]+-api)(/.*)?$
```

**Matches:**
- `/krisacc-svc-1/` ✅
- `/my-service/` ✅
- `/user-api/` ✅

**Doesn't match:**
- `/myservice/` ❌ (no -svc, -service, or -api suffix)

**Fix - Use broader pattern:**

Edit nginx-ssl.conf and change the location block to:

```nginx
# Match any path except /, /api, /static
location ~ ^/([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])(/.*)?$ {
    # Exclude specific paths
    if ($uri ~ ^/(api|static|assets|favicon)) {
        return 404;
    }

    proxy_pass http://18.130.143.156:30080$request_uri;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    proxy_buffering off;
}
```

---

### Issue 6: Service Ingress Still Using Old Domain

**Symptom:** k3s returns 404 when accessed directly

**Fix - Update service ingress:**

```bash
# Check current ingress host
kubectl get ingress krisacc-svc-1 -o jsonpath='{.spec.rules[0].host}'

# If it shows kris-idp.duckdns.org, update it
# Edit the service's helm/values.yaml on GitHub
# Then sync in ArgoCD:
argocd app sync krisacc-svc-1
```

---

### Issue 7: Location Block Order

**Symptom:** Frontend works but services return index.html

**Cause:** `location /` is matching before service proxy

**Fix - Verify location block order in config:**

```bash
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \
  "docker exec idp-frontend cat /etc/nginx/conf.d/default.conf" | grep -n "location"
```

**Correct order:**
1. `location ~ ^/([a-zA-Z0-9-]+svc...)` (regex - processed first)
2. `location /api` (exact prefix)
3. `location /` (catch-all - processed last)

---

## Step-by-Step Fix Procedure

### Option A: NGINX config not loaded

```bash
# 1. Upload config
scp -i ~/.ssh/idp-demo-key-new.pem \
  nginx-ssl.conf \
  ec2-user@13.42.36.97:~/idp/nginx-ssl.conf

# 2. SSH to EC2 #1
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97

# 3. Verify file
cd idp
cat nginx-ssl.conf | grep "Proxy deployed"

# 4. Check docker-compose mounts it
cat docker-compose.yml | grep -A 5 frontend

# 5. Restart frontend container
docker-compose restart frontend

# 6. Verify config in container
docker exec idp-frontend cat /etc/nginx/conf.d/default.conf | grep "Proxy deployed"

# 7. Test syntax
docker exec idp-frontend nginx -t

# 8. Test
curl https://kris-idp.org/krisacc-svc-1/health
```

---

### Option B: Network connectivity issue

```bash
# 1. Test from EC2 #1 to k3s
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \
  "curl -v http://18.130.143.156:30080/krisacc-svc-1/health"

# If connection refused:

# 2. Check k3s ingress service
kubectl get svc -n ingress-nginx -o wide

# 3. Check NodePort
kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.ports[0].nodePort}'

# 4. Update nginx-ssl.conf if NodePort is different
# Then restart NGINX

# If timeout:

# 5. Check security groups in AWS console
# Allow EC2 #1 private IP → EC2 #2 port 30080
```

---

### Option C: Ingress host mismatch

```bash
# 1. Check all ingress hosts
kubectl get ingress -A -o custom-columns="NAME:.metadata.name,HOST:.spec.rules[0].host"

# 2. If any show kris-idp.duckdns.org, update them:
# - Edit helm/values.yaml on GitHub (line 15)
# - Change to: host: kris-idp.org
# - Commit and sync in ArgoCD:

argocd app sync krisacc-svc-1
argocd app sync krisacc-svc-2
argocd app sync krisacc-svc-3
argocd app sync krisacc-svc-4

# 3. Verify
kubectl get ingress -A -o custom-columns="NAME:.metadata.name,HOST:.spec.rules[0].host"

# All should show: kris-idp.org
```

---

## Quick Test Commands

After applying fixes, test with:

```bash
# Test 1: IDP still works
curl -I https://kris-idp.org/

# Test 2: Backend API still works
curl -I https://kris-idp.org/api/v1/projects

# Test 3: Service works
curl https://kris-idp.org/krisacc-svc-1/health

# Expected: {"status":"healthy"}
```

---

## Get Help

Run the automated diagnostics script:
```bash
./diagnose-nginx-issue.sh
```

This will test all common failure points and suggest fixes.
