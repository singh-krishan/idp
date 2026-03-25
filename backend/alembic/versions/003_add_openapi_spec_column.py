"""Add openapi_spec_stored column

Revision ID: 003
Revises: 002
Create Date: 2026-02-13
"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add openapi_spec_stored column to projects table."""
    op.add_column('projects', sa.Column('openapi_spec_stored', sa.Text(), nullable=True))


def downgrade() -> None:
    """Remove openapi_spec_stored column from projects table."""
    op.drop_column('projects', 'openapi_spec_stored')
