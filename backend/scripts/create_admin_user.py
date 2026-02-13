"""
Script to create an admin user for the IDP platform.
Usage: python -m scripts.create_admin_user
"""
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal, init_db
from app.models.user import User
from app.core.security import get_password_hash


def create_admin_user(email: str, username: str, password: str):
    """Create an admin user."""
    init_db()
    db = SessionLocal()

    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"User with email {email} already exists!")
            return

        # Create admin user
        admin_user = User(
            email=email,
            username=username,
            hashed_password=get_password_hash(password),
            role="admin",
            is_active=True
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print(f"Admin user created successfully!")
        print(f"Email: {email}")
        print(f"Username: {username}")
        print(f"Role: {admin_user.role}")

    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("=== IDP Admin User Creation ===\n")

    email = input("Enter admin email: ").strip()
    username = input("Enter admin username: ").strip()
    password = input("Enter admin password (min 8 chars): ").strip()

    if len(password) < 8:
        print("Error: Password must be at least 8 characters long")
        sys.exit(1)

    confirm_password = input("Confirm password: ").strip()

    if password != confirm_password:
        print("Error: Passwords do not match")
        sys.exit(1)

    create_admin_user(email, username, password)
