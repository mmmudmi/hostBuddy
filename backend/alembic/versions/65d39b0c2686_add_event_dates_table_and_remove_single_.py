"""add_event_dates_table_and_remove_single_date

Revision ID: 65d39b0c2686
Revises: 
Create Date: 2025-09-30 10:24:49.736722

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '65d39b0c2686'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create event_dates table
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
    op.create_index(op.f('ix_event_dates_event_date_id'), 'event_dates', ['event_date_id'], unique=False)
    
    # Remove the date column from events table (will be handled manually during deployment)
    op.drop_column('events', 'date')


def downgrade() -> None:
    # Add back the date column to events table
    op.add_column('events', sa.Column('date', sa.DateTime(), nullable=True))
    
    # Drop event_dates table
    op.drop_index(op.f('ix_event_dates_event_date_id'), table_name='event_dates')
    op.drop_table('event_dates')