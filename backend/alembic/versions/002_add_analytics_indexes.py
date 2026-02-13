"""Add analytics performance indexes

Revision ID: 002
Revises: 001
Create Date: 2026-01-31

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add composite indexes to projects table for analytics query optimization.

    Indexes added:
    - idx_user_status: For filtering projects by user and status
    - idx_user_created: For sorting user projects by creation date
    - idx_template_type: For grouping by template type
    - idx_status: For filtering by status globally
    - idx_created_at: For time-series queries
    """
    # Create composite index for user + status queries (dashboard stats)
    op.create_index('idx_user_status', 'projects', ['user_id', 'status'])

    # Create composite index for user + created_at queries (recent projects)
    op.create_index('idx_user_created', 'projects', ['user_id', 'created_at'])

    # Create index for template_type (template usage analytics)
    op.create_index('idx_template_type', 'projects', ['template_type'])

    # Create index for status (platform overview)
    op.create_index('idx_status', 'projects', ['status'])

    # Create index for created_at (time series queries)
    op.create_index('idx_created_at', 'projects', ['created_at'])


def downgrade():
    """Remove analytics indexes."""
    op.drop_index('idx_created_at', table_name='projects')
    op.drop_index('idx_status', table_name='projects')
    op.drop_index('idx_template_type', table_name='projects')
    op.drop_index('idx_user_created', table_name='projects')
    op.drop_index('idx_user_status', table_name='projects')
