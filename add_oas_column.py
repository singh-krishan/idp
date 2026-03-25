#!/usr/bin/env python3
"""Add openapi_spec_stored column to projects table"""
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    # Check if column exists
    result = db.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='projects' AND column_name='openapi_spec_stored'
    """)).fetchone()

    if result:
        print('✓ Column openapi_spec_stored already exists')
    else:
        # Add the column
        db.execute(text('ALTER TABLE projects ADD COLUMN openapi_spec_stored TEXT'))
        db.commit()
        print('✓ Column openapi_spec_stored added successfully')
except Exception as e:
    print(f'✗ Error: {e}')
    db.rollback()
    sys.exit(1)
finally:
    db.close()
