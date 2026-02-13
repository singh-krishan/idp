# Security Guidelines

## Secrets Management

### Development Environment

Secrets are loaded from environment variables or `.env.local` file:

```bash
cp .env.example .env.local
# Edit .env.local with your actual secrets
```

**IMPORTANT:** Never commit `.env.local` to git. It is excluded in `.gitignore`.

### Production Environment

For production deployments, use a dedicated secrets management solution:

#### Option 1: AWS Secrets Manager

```bash
# Set environment variable
export SECRETS_BACKEND=aws
export AWS_REGION=us-east-1

# Store secrets in AWS
aws secretsmanager create-secret --name GITHUB_TOKEN --secret-string "ghp_..."
aws secretsmanager create-secret --name ARGOCD_PASSWORD --secret-string "..."
```

#### Option 2: HashiCorp Vault

```bash
# Set environment variables
export SECRETS_BACKEND=vault
export VAULT_ADDR=https://vault.company.com
export VAULT_TOKEN=s.xxxxx

# Store secrets in Vault
vault kv put secret/idp/GITHUB_TOKEN value="ghp_..."
vault kv put secret/idp/ARGOCD_PASSWORD value="..."
```

#### Option 3: Kubernetes Secrets

```bash
# Set environment variable
export SECRETS_BACKEND=k8s

# Create Kubernetes secrets
kubectl create secret generic github-token --from-literal=GITHUB_TOKEN="ghp_..."
kubectl create secret generic argocd-password --from-literal=ARGOCD_PASSWORD="..."

# Mount secrets in deployment
# The secrets will be available at /var/run/secrets/GITHUB_TOKEN, etc.
```

## Secret Rotation

Regular secret rotation is critical for security. Follow these steps:

### 1. GitHub Token Rotation

```bash
# 1. Create new GitHub Personal Access Token
# Go to: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
# Scopes needed: repo, read:packages, write:packages

# 2. Update secret in your secrets backend
aws secretsmanager update-secret --secret-id GITHUB_TOKEN --secret-string "ghp_NEW_TOKEN"

# 3. Restart backend to pick up new token
docker-compose restart backend

# 4. Verify new token works
curl -H "Authorization: Bearer ghp_NEW_TOKEN" https://api.github.com/user

# 5. Delete old token from GitHub
```

### 2. ArgoCD Password Rotation

```bash
# 1. Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# 2. Update ArgoCD password
kubectl -n argocd patch secret argocd-secret \
  -p '{"stringData": {"admin.password": "'$(htpasswd -bnBC 10 "" $NEW_PASSWORD | tr -d ':\n')'"}}'

# 3. Update secret in your secrets backend
aws secretsmanager update-secret --secret-id ARGOCD_PASSWORD --secret-string "$NEW_PASSWORD"

# 4. Restart backend
docker-compose restart backend

# 5. Test login
argocd login localhost:8080 --username admin --password "$NEW_PASSWORD"
```

### 3. JWT Secret Key Rotation

```bash
# 1. Generate new secret key
NEW_JWT_SECRET=$(openssl rand -hex 32)

# 2. Update secret
aws secretsmanager update-secret --secret-id JWT_SECRET_KEY --secret-string "$NEW_JWT_SECRET"

# 3. Restart backend (WARNING: This will invalidate all existing user sessions)
docker-compose restart backend

# 4. Users will need to log in again
```

## SSL/TLS Configuration

### ArgoCD SSL Verification

**Production:** SSL verification is enabled by default for security.

```bash
# Enforce SSL verification
export ARGOCD_VERIFY_SSL=true
```

**Self-Signed Certificates:** If using self-signed certificates, provide CA certificate:

```bash
# Set path to CA certificate
export ARGOCD_CA_CERT_PATH=/path/to/ca.crt

# Mount certificate in docker-compose.yml
volumes:
  - /path/to/ca.crt:/certs/ca.crt:ro
```

**Development Only:** Disable SSL verification (NOT recommended for production):

```bash
# WARNING: Only use for local development with self-signed certs
export ARGOCD_VERIFY_SSL=false
```

## Security Headers

The following security headers are automatically added to all HTTP responses:

- **X-Frame-Options:** DENY
- **X-Content-Type-Options:** nosniff
- **X-XSS-Protection:** 1; mode=block
- **Strict-Transport-Security:** max-age=31536000; includeSubDomains (production only)
- **Content-Security-Policy:** Restrictive policy to prevent XSS
- **Referrer-Policy:** strict-origin-when-cross-origin
- **Permissions-Policy:** Restricts dangerous features

## Sensitive Data Redaction

Logs and error messages automatically redact sensitive data:

- API tokens and keys
- Passwords
- Authorization headers
- JWT tokens
- Connection strings with credentials

Example:
```python
logger.info(f"GitHub token: {github_token}")
# Logged as: GitHub token: ***REDACTED***
```

## Secret Validation

On startup, the application validates all required secrets:

```bash
# Check secret validation in logs
docker-compose logs backend | grep "Secret"

# Output:
# Secret 'JWT_SECRET_KEY': your****prod
# Secret 'GITHUB_TOKEN': ghp_****1234
# Secret 'GITHUB_ORG': myorg
# Secret 'ARGOCD_PASSWORD': ****5678
```

## Security Checklist for Production

- [ ] All secrets stored in external secrets manager (AWS/Vault/K8s)
- [ ] GitHub token has minimum required scopes (repo, packages)
- [ ] JWT secret key is strong random value (32+ bytes)
- [ ] SSL verification enabled for ArgoCD (`ARGOCD_VERIFY_SSL=true`)
- [ ] Database password is strong (not default)
- [ ] CORS origins restricted to specific domains
- [ ] Debug mode disabled (`DEBUG=false`)
- [ ] Security headers enabled (automatic)
- [ ] Regular secret rotation schedule established
- [ ] `.env` files excluded from version control
- [ ] No secrets in git history (check with: `git log --all --full-history --source -- '*.env*'`)

## Incident Response

If a secret is compromised:

1. **Immediately rotate** the compromised secret following steps above
2. **Audit access logs** for unauthorized usage
3. **Revoke old credentials** at the source (GitHub, ArgoCD, etc.)
4. **Monitor** for suspicious activity
5. **Document incident** for future prevention

## Reporting Security Issues

If you discover a security vulnerability, please email: security@company.com

**Do NOT** open a public GitHub issue for security vulnerabilities.
