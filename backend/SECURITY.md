# Security Guide

This document outlines security best practices and hardening measures for the IDP Platform.

## Table of Contents

1. [Secrets Management](#secrets-management)
2. [Authentication & Authorization](#authentication--authorization)
3. [Network Security](#network-security)
4. [Database Security](#database-security)
5. [Dependency Security](#dependency-security)
6. [Security Headers](#security-headers)
7. [Incident Response](#incident-response)

---

## Secrets Management

### Never Commit Secrets to Git

**❌ NEVER do this:**
```bash
# Bad: Committing .env file
git add .env
git commit -m "Add configuration"
```

**✅ Do this instead:**
- Use `.env.example` as a template
- Add `.env` to `.gitignore`
- Store secrets in a secure secrets manager

### Check for Leaked Secrets

```bash
# Check git history for secrets
git log --all --full-history --source -- '*env*'

# Use git-secrets to prevent commits
git secrets --install
git secrets --register-aws
```

### Rotate Secrets Regularly

Run the rotation script every 90 days:

```bash
./scripts/rotate_secrets.sh
```

### Secrets Backend Options

#### Development: Environment Variables

```bash
# .env file (DO NOT COMMIT)
SECRETS_BACKEND=env
JWT_SECRET_KEY=<generated-key>
GITHUB_TOKEN=<your-token>
```

#### Production: AWS Secrets Manager

```bash
# Store secrets in AWS
aws secretsmanager create-secret \
    --name idp/prod/jwt-secret \
    --secret-string "$(openssl rand -hex 32)"

# Configure backend
SECRETS_BACKEND=aws
AWS_REGION=us-east-1
```

#### Production: HashiCorp Vault

```bash
# Store secrets in Vault
vault kv put secret/idp/prod \
    jwt_secret="$(openssl rand -hex 32)" \
    github_token="ghp_..."

# Configure backend
SECRETS_BACKEND=vault
VAULT_ADDR=https://vault.example.com
VAULT_TOKEN=<your-token>
```

#### Kubernetes: Secrets

```yaml
# Create secret
apiVersion: v1
kind: Secret
metadata:
  name: idp-secrets
type: Opaque
stringData:
  JWT_SECRET_KEY: <base64-encoded-secret>
  GITHUB_TOKEN: <base64-encoded-token>
```

Mount as environment variables or files in pod spec.

---

## Authentication & Authorization

### Password Requirements

- Minimum 8 characters
- Enforce complexity in production (add to validation)
- Hash with bcrypt (cost factor: 12)

### JWT Token Security

**Generate secure secret key:**
```bash
openssl rand -hex 32
```

**Token settings:**
- Access token expiry: 30 minutes
- Refresh token expiry: 7 days
- Rotate refresh tokens on use
- Implement token blacklisting for logout

### Session Management

- Use httpOnly cookies for tokens (prevents XSS)
- Enable secure flag in production (HTTPS only)
- Implement CSRF protection
- Set SameSite=Lax or SameSite=Strict

### Rate Limiting

Add to `main.py`:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Limit login attempts
@limiter.limit("5/minute")
@router.post("/login")
async def login(...):
    ...
```

---

## Network Security

### HTTPS/TLS

**Development:**
- Use self-signed certificates
- Set `ARGOCD_VERIFY_SSL=false` only for local development

**Production:**
- Use Let's Encrypt or proper CA certificates
- Enable HSTS (Strict-Transport-Security header)
- Force HTTPS redirects
- Set `ARGOCD_VERIFY_SSL=true`

### CORS Configuration

Only allow trusted origins:

```python
# Production
CORS_ORIGINS=https://idp.yourcompany.com

# Development
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Firewall Rules

- Limit database access to application servers only
- Use security groups/network policies
- Close unused ports
- Implement WAF (Web Application Firewall)

---

## Database Security

### Connection Security

**Use SSL/TLS for PostgreSQL:**

```python
# Production database URL
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

### Access Control

- Create separate database users for different services
- Grant minimum required permissions
- Use connection pooling limits
- Enable audit logging

### Encryption at Rest

- Enable PostgreSQL encryption at rest
- Use encrypted volumes (AWS EBS, Azure Disk)
- Encrypt backups

### Backup Security

```bash
# Encrypted backup
pg_dump idp_db | gpg --encrypt --recipient admin@company.com > backup.sql.gpg

# Restore
gpg --decrypt backup.sql.gpg | psql idp_db
```

---

## Dependency Security

### Scan for Vulnerabilities

```bash
# Python dependencies
pip install safety
safety check

# Alternative: pip-audit
pip install pip-audit
pip-audit

# Frontend dependencies
cd frontend
npm audit
npm audit fix
```

### Keep Dependencies Updated

```bash
# Check for outdated packages
pip list --outdated

# Update carefully with testing
pip install --upgrade <package>
```

### Use Dependency Pinning

```txt
# requirements.txt
fastapi==0.109.0  # Pinned version
uvicorn[standard]==0.27.0
```

### Enable Dependabot

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "pip"
    directory: "/backend"
    schedule:
      interval: "weekly"

  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
```

---

## Security Headers

All responses include these security headers (configured in `main.py`):

| Header | Value | Purpose |
|--------|-------|---------|
| X-Frame-Options | DENY | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-XSS-Protection | 1; mode=block | Enable XSS filter |
| Strict-Transport-Security | max-age=31536000 | Force HTTPS |
| Content-Security-Policy | default-src 'self' | Prevent XSS/injection |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer info |

Test headers:

```bash
curl -I https://your-idp-url.com
```

---

## Incident Response

### If Secrets Are Leaked

1. **Immediately rotate all secrets:**
   ```bash
   ./scripts/rotate_secrets.sh
   ```

2. **Remove from Git history:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all

   git push origin --force --all
   ```

3. **Audit access logs:**
   ```bash
   # Check PostgreSQL logs
   docker-compose logs postgres | grep LOGIN

   # Check application logs
   docker-compose logs backend | grep -i "unauthorized\|failed"
   ```

4. **Notify affected users**

5. **Review and improve:**
   - How was secret leaked?
   - Update procedures to prevent recurrence
   - Consider using git-secrets hooks

### Security Monitoring

**Enable logging:**
```python
# In main.py
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

**Monitor for:**
- Failed login attempts
- Unauthorized API access (401/403 errors)
- SQL injection attempts (unusual queries)
- Rate limit violations
- Unusual data access patterns

### Security Auditing

**Regular security checklist:**

- [ ] All secrets rotated in last 90 days
- [ ] No secrets in git history
- [ ] Dependencies scanned for vulnerabilities
- [ ] SSL/TLS certificates valid
- [ ] Database backups encrypted and tested
- [ ] Access logs reviewed
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Production uses managed secrets backend

---

## Security Hardening Checklist

### Infrastructure

- [ ] Use managed PostgreSQL (RDS, Cloud SQL, Azure DB)
- [ ] Enable database encryption at rest
- [ ] Use private networking for database
- [ ] Configure firewall rules (allow only app servers)
- [ ] Use load balancer with WAF
- [ ] Enable DDoS protection

### Application

- [ ] Set `DEBUG=false` in production
- [ ] Use strong JWT secret (32+ random bytes)
- [ ] Enable HTTPS/TLS
- [ ] Configure security headers
- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Validate all user inputs
- [ ] Sanitize error messages (no stack traces in production)

### Secrets

- [ ] Use secrets manager (not .env files)
- [ ] Rotate secrets every 90 days
- [ ] Use least-privilege access (IAM roles)
- [ ] Audit secret access
- [ ] Enable secret versioning

### Monitoring

- [ ] Configure alerting for security events
- [ ] Enable audit logging
- [ ] Monitor failed authentication attempts
- [ ] Set up intrusion detection
- [ ] Regular vulnerability scanning

### Compliance

- [ ] GDPR compliance (if applicable)
- [ ] SOC 2 requirements (if applicable)
- [ ] Data retention policies
- [ ] Privacy policy
- [ ] Terms of service

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [CWE Top 25](https://cwe.mitre.org/top25/archive/2023/2023_top25_list.html)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## Support

For security issues, please email: security@your-company.com

**Do not** open public GitHub issues for security vulnerabilities.
