# IDP Platform - Production Deployment Guide

## Overview

This guide covers the production deployment of the IDP Platform to EC2, including database management, troubleshooting, and best practices.

## Current Production Setup

- **EC2 Instance:** 13.42.36.97 (t3.medium, eu-west-2)
- **Domain:** https://kris-idp.org
- **Deployment Method:** Docker Compose via `deploy.sh` script
- **Database:** SQLite (`/home/ec2-user/idp/backend/idp.db`)
- **Containers:**
  - `idp-backend`: FastAPI application (port 8000)
  - `idp-frontend`: React application (port 5173)
  - `nginx`: Reverse proxy with SSL (ports 80, 443)

## Quick Deployment

### Deploy Both Frontend and Backend
```bash
./deploy.sh both
```

### Deploy Backend Only
```bash
./deploy.sh backend
```

### Deploy Frontend Only
```bash
./deploy.sh frontend
```

**Note:** Backend deployments automatically run database migrations.

## Database Configuration

### Current Setup: SQLite

Production uses **SQLite** for simplicity in the MVP phase:

- **Location (on EC2):** `/home/ec2-user/idp/backend/idp.db`
- **Location (in container):** `/app/idp.db`
- **Persistence:** Volume mount in docker-compose.yml
- **Migrations:** Automatically applied during deployment

### Why SQLite vs PostgreSQL?

The `docker-compose.yml` includes PostgreSQL configuration, but **production uses SQLite**:

**SQLite (Current):**
- ✅ Simple deployment (no separate DB service)
- ✅ No additional infrastructure
- ✅ Perfect for MVP/demo
- ✅ Automatic backups via file copy
- ❌ Limited concurrent writes
- ❌ Not ideal for high traffic

**PostgreSQL (Future):**
- ✅ Production-ready scalability
- ✅ Better concurrent write performance
- ✅ Advanced features (JSON queries, full-text search)
- ❌ Requires separate service management
- ❌ More complex backups

### Switching to PostgreSQL

To migrate from SQLite to PostgreSQL:

1. **Start PostgreSQL service:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Migrate data:**
   ```bash
   docker exec idp-backend python scripts/migrate_sqlite_to_postgres.py
   ```

3. **Update environment:**
   - Ensure `DATABASE_URL` environment variable is set to PostgreSQL URL
   - Restart backend: `docker-compose restart backend`

4. **Verify:**
   ```bash
   docker exec idp-backend python -c "
   from app.core.config import settings
   print(f'Database: {settings.database_url}')
   "
   ```

## Database Migrations

### Automatic Migrations (Recommended)

Migrations run automatically during deployment via `deploy.sh`:

```bash
./deploy.sh backend
# Automatically runs: docker exec idp-backend alembic upgrade head
```

### Manual Migration Commands

If you need to run migrations manually:

```bash
# SSH into EC2
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97

# Navigate to project
cd /home/ec2-user/idp

# Run migrations
docker exec idp-backend alembic upgrade head

# OR initialize database from scratch
docker exec idp-backend python -c "from app.core.database import init_db; init_db()"
```

### Check Migration Status

```bash
# View current migration version
docker exec idp-backend alembic current

# View migration history
docker exec idp-backend alembic history

# Verify tables exist
docker exec idp-backend python -c "
from sqlalchemy import inspect
from app.core.database import engine
tables = inspect(engine).get_table_names()
print(f'Tables: {tables}')
"
```

### Create New Migration

When you add new models or modify existing ones:

```bash
# On development machine
cd backend
source venv/bin/activate

# Generate migration
alembic revision --autogenerate -m "description of changes"

# Review generated migration in alembic/versions/
# Edit if needed, then commit to git

# Deploy to production
./deploy.sh backend  # Migrations auto-apply
```

## Database Backups

### Manual Backup (SQLite)

```bash
# From local machine
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \
  "docker exec idp-backend sqlite3 /app/idp.db '.backup /app/idp-backup.db'"

scp -i ~/.ssh/idp-demo-key-new.pem \
  ec2-user@13.42.36.97:/home/ec2-user/idp/backend/idp-backup.db \
  ./backups/idp-$(date +%Y%m%d-%H%M%S).db
```

### Automated Backup Script

Create a cron job on EC2:

```bash
# On EC2
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /home/ec2-user/idp && docker exec idp-backend sqlite3 /app/idp.db ".backup /app/idp-backup-$(date +\%Y\%m\%d).db"
```

### Restore from Backup

```bash
# SSH into EC2
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97

cd /home/ec2-user/idp

# Stop backend
docker-compose stop backend

# Restore database
cp backend/idp-backup.db backend/idp.db

# Start backend
docker-compose start backend
```

## Troubleshooting

### Registration/Login Errors

**Symptom:** "Registration failed" or "User not found" errors

**Cause:** Database missing `users` table (migrations not applied)

**Fix:**
```bash
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97
cd /home/ec2-user/idp
docker exec idp-backend alembic upgrade head
docker-compose restart backend
```

### Database Locked Errors

**Symptom:** "Database is locked" errors in logs

**Cause:** SQLite doesn't handle concurrent writes well

**Fix:**
```bash
# Short-term: Restart backend
docker-compose restart backend

# Long-term: Migrate to PostgreSQL (see above)
```

### Missing Tables After Deployment

**Symptom:** Tables disappear after redeploying

**Cause:** Volume mount not configured or database file deleted

**Fix:**
```bash
# Verify volume mount exists in docker-compose.yml
grep "idp.db" docker-compose.yml
# Should show: - ./backend/idp.db:/app/idp.db

# Re-run migrations
docker exec idp-backend alembic upgrade head
```

### Check Backend Health

```bash
# View backend logs
docker-compose logs backend --tail=100 -f

# Check container status
docker-compose ps

# Test API endpoint
curl https://kris-idp.org/api/v1/health

# Check database connection
docker exec idp-backend python -c "
from app.core.database import engine
try:
    engine.connect()
    print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database error: {e}')
"
```

### Database Inspection

```bash
# Count users
docker exec idp-backend python -c "
from sqlalchemy import text
from app.core.database import engine
with engine.connect() as conn:
    result = conn.execute(text('SELECT COUNT(*) FROM users'))
    print(f'Total users: {result.fetchone()[0]}')
"

# List recent users
docker exec idp-backend python -c "
from sqlalchemy import text
from app.core.database import engine
with engine.connect() as conn:
    result = conn.execute(text('SELECT username, email, created_at FROM users ORDER BY created_at DESC LIMIT 5'))
    for row in result:
        print(f'{row[0]} ({row[1]}) - {row[2]}')
"

# Check table schema
docker exec idp-backend python -c "
from sqlalchemy import inspect
from app.core.database import engine
inspector = inspect(engine)
for col in inspector.get_columns('users'):
    print(f'{col[\"name\"]}: {col[\"type\"]}')
"
```

## Security Considerations

### Production Checklist

- [x] SSL/TLS enabled (Let's Encrypt)
- [x] JWT secret key changed from default
- [x] Database file permissions restricted
- [ ] GitHub token has minimal required scopes
- [ ] ArgoCD password rotated from default
- [ ] Database backups automated
- [ ] Error messages don't expose sensitive data
- [ ] CORS origins restricted to production domain

### Environment Variables

Critical environment variables on EC2 (set in docker-compose.yml or .env):

```bash
JWT_SECRET_KEY=<use-openssl-rand-hex-32>
GITHUB_TOKEN=<personal-access-token>
GITHUB_ORG=<your-org-or-username>
ARGOCD_PASSWORD=<argocd-admin-password>
```

**Never commit these to git!**

## Monitoring

### Check Application Metrics

- **Prometheus:** https://kris-idp.org/prometheus
- **Grafana:** https://kris-idp.org/grafana (admin/password)

### Key Metrics to Monitor

- Backend response time
- Database query duration
- User registration rate
- Project creation success rate
- API error rate
- Container resource usage

## Common Maintenance Tasks

### Update Backend Code

```bash
# Make changes locally, commit to git
git add .
git commit -m "Your changes"

# Deploy to production
./deploy.sh backend
```

### Update Frontend Code

```bash
# Make changes locally
cd frontend
npm run build  # Test production build

# Deploy to production
./deploy.sh frontend
```

### View Logs

```bash
# Real-time logs
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97
cd /home/ec2-user/idp
docker-compose logs -f

# Specific service
docker-compose logs backend -f
docker-compose logs frontend -f
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

### Update SSL Certificate

```bash
# Certbot auto-renews, but to force renewal:
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

## Rollback Procedure

If a deployment causes issues:

```bash
# SSH into EC2
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97
cd /home/ec2-user/idp

# Restore database from backup (if needed)
cp backend/idp-backup.db backend/idp.db

# Rebuild previous version
git checkout <previous-commit>
docker build -t idp-backend:rollback ./backend

# Update docker-compose to use rollback image
# OR manually stop and start with rollback image
docker stop idp-backend
docker run -d --name idp-backend idp-backend:rollback

# Restart services
docker-compose restart
```

## Future Improvements

### Short-term (Next Sprint)
- [ ] Automated database backups to S3
- [ ] Health check endpoint monitoring
- [ ] Structured logging with ELK stack
- [ ] PostgreSQL migration for better scalability

### Long-term
- [ ] Multi-region deployment
- [ ] Database replication
- [ ] Blue-green deployments
- [ ] Auto-scaling based on load
- [ ] CI/CD pipeline with GitHub Actions

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review this guide's troubleshooting section
- Check application health: `curl https://kris-idp.org/api/v1/health`
- GitHub Issues: [Your repo URL]

---

**Last Updated:** 2026-02-11
**Deployment Version:** v1.0 (MVP)
