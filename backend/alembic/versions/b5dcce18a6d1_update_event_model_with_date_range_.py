"""update_event_model_with_date_range_fields

Revision ID: b5dcce18a6d1
Revises: 65d39b0c2686
Create Date: 2025-09-30 11:13:30.879770

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b5dcce18a6d1'
down_revision = '65d39b0c2686'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the event_dates table if it exists (from previous migration)
    op.drop_table('event_dates')
    
    # Add date range fields to events table
    op.add_column('events', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column('events', sa.Column('end_date', sa.Date(), nullable=True))
    op.add_column('events', sa.Column('start_time', sa.Time(), nullable=True))
    op.add_column('events', sa.Column('end_time', sa.Time(), nullable=True))


def downgrade() -> None:
    # Remove the date range fields
    op.drop_column('events', 'end_time')
    op.drop_column('events', 'start_time')
    op.drop_column('events', 'end_date')
    op.drop_column('events', 'start_date')
    
    # Recreate event_dates table (reverse of previous migration)
    op.create_table('event_dates',
        sa.Column('event_date_id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['events.event_id'], ),
        sa.PrimaryKeyConstraint('event_date_id')
    )