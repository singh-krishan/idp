# PostgreSQL Migration Guide

This guide explains how to migrate from SQLite to PostgreSQL for the IDP Platform.

## Why PostgreSQL?

SQLite is great for development, but PostgreSQL is required for production because:

- **Concurrent writes**: PostgreSQL handles multiple simultaneous users
- **Connection pooling**: Better performance under load
- **Scalability**: Can handle much larger datasets
- **Reliability**: ACID compliance and better crash recovery
- **Features**: Advanced indexing, full-text search, and more

## Prerequisites

1. **Docker** installed and running
2. **Existing SQLite database** (if migrating data)
3. **Backup** of your current database

## Step 1: Backup Current Data

```bash
cd backend

# Backup SQLite database
cp idp.db idp.db.backup.$(date +%Y%m%d_%H%M%S)
```

## Step 2: Start PostgreSQL

```bash
cd ..  # Go to root directory
docker-compose up postgres -d

# Wait for PostgreSQL to be ready (check logs)
docker-compose logs -f postgres
# Press Ctrl+C when you see "database system is ready to accept connections"
```

## Step 3: Update Environment Variables

Create or update your `.env` file in the `backend/` directory:

```bash
# PostgreSQL Configuration
DATABASE_URL=postgresql://idp:idp_password_change_in_prod@localhost:5432/idp_db

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET_KEY=your-secret-key-change-this-in-production-use-openssl-rand-hex-32

# GitHub Configuration (keep existing values)
GITHUB_TOKEN=your_github_token
GITHUB_ORG=your_github_org

# ArgoCD Configuration (keep existing values)
ARGOCD_URL=http://localhost:8080
ARGOCD_USERNAME=admin
ARGOCD_PASSWORD=your_argocd_password
```

## Step 4: Run Database Migrations

Alembic will create the PostgreSQL schema:

```bash
cd backend

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Run migrations
alembic upgrade head
```

You should see output like:
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 001, Initial schema with users and projects
```

## Step 5: Migrate Existing Data (Optional)

If you have existing projects in SQLite that you want to migrate:

```bash
python scripts/migrate_sqlite_to_postgres.py
```

This script will:
- Create a default admin user
- Migrate all projects from SQLite to PostgreSQL
- Associate projects with the admin user

**Default admin credentials:**
- Email: `admin@idp.local`
- Password: `changeme123`

**⚠️ IMPORTANT:** Change the admin password immediately after first login!

## Step 6: Test the Setup

```bash
# Start the full stack
cd ..
docker-compose up

# Or start in background
docker-compose up -d

# View logs
docker-compose logs -f backend
```

Navigate to http://localhost:5173 and:
1. Register a new account OR login with admin credentials
2. Verify your projects are visible
3. Try creating a new project

## Step 7: Verify PostgreSQL Data

Connect to PostgreSQL to verify data:

```bash
# Using psql command
docker-compose exec postgres psql -U idp -d idp_db

# List tables
\dt

# View users
SELECT id, email, username, role FROM users;

# View projects
SELECT id, name, status, user_id FROM projects;

# Exit
\q
```

## Troubleshooting

### Connection Refused

If you get "connection refused" errors:

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Authentication Failed

If you get authentication errors:

- Verify DATABASE_URL in .env matches docker-compose.yml
- Default credentials: `idp` / `idp_password_change_in_prod`
- Update both files if you change the password

### Migration Fails

If Alembic migration fails:

```bash
# Check current migration version
alembic current

# View migration history
alembic history

# Downgrade if needed
alembic downgrade -1

# Then try upgrade again
alembic upgrade head
```

### SQLite Still Being Used

If the backend is still using SQLite:

- Check that DATABASE_URL in .env is set correctly
- Restart the backend: `docker-compose restart backend`
- Check backend logs: `docker-compose logs backend | grep DATABASE`

## Reverting to SQLite (Development Only)

If you need to revert to SQLite for local development:

1. Update `.env`:
   ```bash
   DATABASE_URL=sqlite:///./idp.db
   ```

2. Restart backend:
   ```bash
   docker-compose restart backend
   ```

## Production Considerations

For production deployments:

1. **Use a managed PostgreSQL service**:
   - AWS RDS
   - Google Cloud SQL
   - Azure Database for PostgreSQL
   - DigitalOcean Managed Databases

2. **Set strong passwords**:
   ```bash
   # Generate secure password
   openssl rand -base64 32
   ```

3. **Enable SSL connections**:
   - Add `?sslmode=require` to DATABASE_URL
   - Configure PostgreSQL for SSL

4. **Regular backups**:
   ```bash
   # Backup command
   pg_dump -h localhost -U idp -d idp_db > backup.sql

   # Restore command
   psql -h localhost -U idp -d idp_db < backup.sql
   ```

5. **Monitor connection pool**:
   - Adjust `pool_size` and `max_overflow` in `app/core/database.py`
   - Monitor with `SELECT * FROM pg_stat_activity;`

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy PostgreSQL Dialect](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html)

## Support

If you encounter issues:

1. Check logs: `docker-compose logs backend postgres`
2. Verify environment variables are set correctly
3. Ensure PostgreSQL is accessible on port 5432
4. Review this guide's troubleshooting section
