# How to Fix krisacc-svc-6 (308 Redirect Loop)

## Problem
Service `krisacc-svc-6` returns 308 Permanent Redirect on all endpoints due to incorrect ingress configuration.

## Solution Options (Choose One)

---

## Option 1: Fix via GitHub + ArgoCD Auto-Sync (Recommended - No SSH needed)

This is the easiest method since you can do it from your local machine.

### Steps:

1. **Clone the service repository**:
   ```bash
   cd /tmp
   git clone https://github.com/singh-krishan/krisacc-svc-6.git
   cd krisacc-svc-6
   ```

2. **Edit the ingress configuration**:
   ```bash
   # Edit helm/templates/ingress.yaml
   nano helm/templates/ingress.yaml
   ```

3. **Make these changes**:
   ```diff
   annotations:
     nginx.ingress.kubernetes.io/rewrite-target: /$2
     cert-manager.io/cluster-issuer: letsencrypt-prod
   - nginx.ingress.kubernetes.io/ssl-redirect: "true"
   + nginx.ingress.kubernetes.io/ssl-redirect: "false"
   + nginx.ingress.kubernetes.io/force-ssl-redirect: "false"
   ```

4. **Commit and push**:
   ```bash
   git add helm/templates/ingress.yaml
   git commit -m "fix: Change SSL redirect to false to prevent 308 loop"
   git push origin main
   ```

5. **Wait for ArgoCD to sync** (or trigger manually):
   - ArgoCD will detect the change and redeploy
   - Usually takes 1-3 minutes
   - If auto-sync is disabled, you'll need to sync manually via ArgoCD UI

6. **Verify the fix**:
   ```bash
   # Wait 2-3 minutes, then test
   curl https://kris-idp.org/krisacc-svc-6/health
   # Should return: {"status":"healthy","service":"krisacc-svc-6"}

   curl https://kris-idp.org/krisacc-svc-6/hello
   # Should return: {"message":"hello, welcome to my IDP"}
   ```

---

## Option 2: Quick Patch via kubectl (Requires k3s cluster access)

If you have direct access to the k3s cluster on EC2 #2:

```bash
# SSH to k3s cluster (EC2 #2)
ssh -i <your-key> ubuntu@18.130.143.156

# Patch the ingress
kubectl patch ingress krisacc-svc-6 -n default --type=json \
  -p='[
    {"op":"replace","path":"/metadata/annotations/nginx.ingress.kubernetes.io~1ssl-redirect","value":"false"},
    {"op":"add","path":"/metadata/annotations/nginx.ingress.kubernetes.io~1force-ssl-redirect","value":"false"}
  ]'

# Verify
kubectl get ingress krisacc-svc-6 -n default -o yaml | grep ssl-redirect
```

**Note**: This fix is temporary. If ArgoCD re-syncs from GitHub, it will revert unless you also update the GitHub repo.

---

## Option 3: Delete and Recreate via IDP

Start fresh with the fixed template:

### Steps:

1. **Delete from database**:
   ```bash
   ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \
     "docker exec idp-backend python -c \"
import sys
sys.path.insert(0, '/app')
from app.core.database import SessionLocal
from app.models.project import Project

db = SessionLocal()
project = db.query(Project).filter(Project.name == 'krisacc-svc-6').first()
if project:
    db.delete(project)
    db.commit()
    print('Deleted from database')
\""
   ```

2. **Delete GitHub repository**:
   ```bash
   # Using GitHub CLI
   gh repo delete singh-krishan/krisacc-svc-6 --yes

   # Or via web: https://github.com/singh-krishan/krisacc-svc-6/settings
   ```

3. **Delete ArgoCD application** (if accessible):
   ```bash
   kubectl delete application krisacc-svc-6 -n argocd
   ```

4. **Recreate via IDP**:
   - Go to https://kris-idp.org
   - Create new project with name `krisacc-svc-6`
   - Select `python-microservice` template
   - Add `/hello` endpoint code after deployment

---

## Verification After Fix

Run these tests to confirm the service is working:

```bash
# Test all endpoints
SERVICE="krisacc-svc-6"

echo "Testing /$SERVICE/health"
curl -i https://kris-idp.org/$SERVICE/health
echo -e "\n"

echo "Testing /$SERVICE/hello"
curl -i https://kris-idp.org/$SERVICE/hello
echo -e "\n"

echo "Testing /$SERVICE/ (root)"
curl -i https://kris-idp.org/$SERVICE/
echo -e "\n"

echo "Testing /$SERVICE/docs (FastAPI docs)"
curl -I https://kris-idp.org/$SERVICE/docs
```

**Expected Results**:
- ✅ HTTP/2 200 OK (not 308)
- ✅ JSON responses
- ✅ No redirect loops

**If Still Broken**:
- ❌ HTTP/2 308 Permanent Redirect
- ❌ curl error 47 (redirect loop)

---

## My Recommendation

**Use Option 1** (GitHub + ArgoCD):
- ✅ No SSH/kubectl access needed
- ✅ Permanent fix (survives ArgoCD syncs)
- ✅ Git history of the fix
- ✅ Can do from your local machine right now

It's the cleanest and most maintainable solution.

---

## After Fixing, Test with:

```bash
# Should work now!
curl https://kris-idp.org/krisacc-svc-6/hello

# Expected response:
{
  "message": "hello, welcome to my IDP"
}
```

Let me know if you need help with any of these options!
