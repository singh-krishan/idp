"""
Migration script to move data from SQLite to PostgreSQL.

This script:
1. Reads all existing projects from SQLite database
2. Creates a default admin user in PostgreSQL
3. Migrates projects to PostgreSQL, associating them with the admin user

Usage:
    python scripts/migrate_sqlite_to_postgres.py

Prerequisites:
    - PostgreSQL database must be running and accessible
    - Alembic migrations must be run first: alembic upgrade head
    - SQLite database (idp.db) must exist with data to migrate
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from app.models.user import User
from app.models.project import Project
from app.core.security import get_password_hash
from app.core.config import settings

# SQLite database URL
SQLITE_URL = "sqlite:///./idp.db"


def migrate_data():
    """Migrate data from SQLite to PostgreSQL."""

    print("=" * 60)
    print("IDP Platform: SQLite to PostgreSQL Migration")
    print("=" * 60)
    print()

    # Check if PostgreSQL is configured
    if not settings.database_url.startswith("postgresql"):
        print("Error: DATABASE_URL must be set to a PostgreSQL connection string")
        print(f"Current DATABASE_URL: {settings.database_url}")
        sys.exit(1)

    # Create engines
    print("Connecting to databases...")
    try:
        sqlite_engine = create_engine(SQLITE_URL)
        postgres_engine = create_engine(settings.database_url)
    except Exception as e:
        print(f"Error connecting to databases: {e}")
        sys.exit(1)

    # Create sessions
    SQLiteSession = sessionmaker(bind=sqlite_engine)
    PostgresSession = sessionmaker(bind=postgres_engine)

    sqlite_session = SQLiteSession()
    postgres_session = PostgresSession()

    try:
        # Count records in SQLite
        sqlite_project_count = sqlite_session.query(Project).count()
        print(f"\nFound {sqlite_project_count} projects in SQLite database")

        if sqlite_project_count == 0:
            print("No projects to migrate. Exiting.")
            return

        # Create default admin user in PostgreSQL
        print("\nCreating default admin user in PostgreSQL...")
        admin_email = "admin@idp.local"
        admin_username = "admin"
        admin_password = "changeme123"  # User should change this immediately

        # Check if admin user already exists
        existing_admin = postgres_session.query(User).filter(User.email == admin_email).first()

        if existing_admin:
            print(f"Admin user already exists (ID: {existing_admin.id})")
            admin_user = existing_admin
        else:
            admin_user = User(
                email=admin_email,
                username=admin_username,
                hashed_password=get_password_hash(admin_password),
                role="admin",
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            postgres_session.add(admin_user)
            postgres_session.commit()
            postgres_session.refresh(admin_user)
            print(f"Admin user created (ID: {admin_user.id})")
            print(f"  Email: {admin_email}")
            print(f"  Password: {admin_password}")
            print("  ⚠️  IMPORTANT: Change this password immediately!")

        # Migrate projects
        print(f"\nMigrating {sqlite_project_count} projects...")

        sqlite_projects = sqlite_session.query(Project).all()
        migrated_count = 0
        skipped_count = 0

        for old_project in sqlite_projects:
            # Check if project already exists in PostgreSQL
            existing_project = postgres_session.query(Project).filter(
                Project.name == old_project.name
            ).first()

            if existing_project:
                print(f"  ⏭  Skipping '{old_project.name}' (already exists)")
                skipped_count += 1
                continue

            # Create new project in PostgreSQL
            new_project = Project(
                id=old_project.id,
                name=old_project.name,
                description=old_project.description,
                template_type=old_project.template_type,
                github_repo_url=old_project.github_repo_url,
                github_repo_name=old_project.github_repo_name,
                argocd_app_name=old_project.argocd_app_name,
                status=old_project.status,
                error_message=old_project.error_message,
                user_id=admin_user.id,  # Associate with admin user
                created_at=old_project.created_at,
                updated_at=old_project.updated_at
            )

            postgres_session.add(new_project)
            migrated_count += 1
            print(f"  ✓ Migrated '{old_project.name}' (status: {old_project.status})")

        # Commit all changes
        postgres_session.commit()

        print("\n" + "=" * 60)
        print("Migration Summary:")
        print("=" * 60)
        print(f"Total projects in SQLite: {sqlite_project_count}")
        print(f"Projects migrated: {migrated_count}")
        print(f"Projects skipped (duplicates): {skipped_count}")
        print(f"All projects associated with user: {admin_user.email}")
        print()
        print("✅ Migration completed successfully!")
        print()
        print("Next steps:")
        print("1. Test the PostgreSQL setup: docker-compose up")
        print("2. Login with admin credentials and verify projects")
        print("3. Create additional user accounts as needed")
        print("4. Backup and archive the SQLite database: mv idp.db idp.db.backup")
        print()

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        postgres_session.rollback()
        sys.exit(1)

    finally:
        sqlite_session.close()
        postgres_session.close()


if __name__ == "__main__":
    import sys

    print("\n⚠️  WARNING: This will migrate data from SQLite to PostgreSQL")
    print("Make sure you have:")
    print("  1. PostgreSQL running (docker-compose up postgres)")
    print("  2. Run migrations (alembic upgrade head)")
    print("  3. Backed up your SQLite database")
    print()

    response = input("Continue with migration? (yes/no): ").strip().lower()

    if response != "yes":
        print("Migration cancelled.")
        sys.exit(0)

    migrate_data()
