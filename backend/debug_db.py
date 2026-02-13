#!/usr/bin/env python3
"""
Debug script to check database connectivity and table creation.
"""
import sys
from sqlalchemy import inspect, text

from app.core.database import engine, init_db
from app.core.config import settings

def main():
    print(f"Database URL: {settings.database_url}")
    print("-" * 50)

    # Test connection
    try:
        with engine.connect() as conn:
            print("✓ Database connection successful")
            result = conn.execute(text("SELECT 1"))
            print(f"✓ Query test passed: {result.fetchone()}")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        sys.exit(1)

    # Check existing tables
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    print("\nExisting tables:")
    if tables:
        for table in tables:
            columns = inspector.get_columns(table)
            print(f"  - {table} ({len(columns)} columns)")
            for col in columns:
                print(f"      {col['name']}: {col['type']}")
    else:
        print("  No tables found")

    # Check if users table exists
    print("\n" + "=" * 50)
    if "users" in tables:
        print("✓ Users table exists")

        # Check row count
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM users"))
            count = result.fetchone()[0]
            print(f"  Total users: {count}")
    else:
        print("✗ Users table MISSING - This is the problem!")
        print("\nTo fix, run ONE of these commands:")
        print("  1. Using Alembic (recommended):")
        print("     cd backend && alembic upgrade head")
        print("\n  2. Using init_db (quick fix):")
        print("     cd backend && python -c 'from app.core.database import init_db; init_db()'")

    print("=" * 50)

if __name__ == "__main__":
    main()
