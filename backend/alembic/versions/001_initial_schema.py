"""Initial schema: deputies, beneficiaries, municipalities, amendments, sync_logs

Revision ID: 001
Revises:
Create Date: 2026-04-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "deputies",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("camara_id", sa.Integer, unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("party", sa.String(20)),
        sa.Column("state", sa.String(2)),
        sa.Column("photo_url", sa.Text),
        sa.Column("name_aliases", sa.ARRAY(sa.String(255))),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_deputies_party", "deputies", ["party"])
    op.create_index("idx_deputies_state", "deputies", ["state"])

    op.create_table(
        "beneficiaries",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("cnpj_cpf", sa.String(14), unique=True, nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("legal_nature", sa.String(100)),
        sa.Column("uf", sa.String(2)),
        sa.Column("municipality", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_beneficiaries_uf", "beneficiaries", ["uf"])
    op.create_index("idx_beneficiaries_legal_nature", "beneficiaries", ["legal_nature"])

    op.create_table(
        "municipalities",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("ibge_code", sa.String(7), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("uf", sa.String(2), nullable=False),
    )

    op.create_table(
        "amendments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("deputy_camara_id", sa.Integer, sa.ForeignKey("deputies.camara_id"), nullable=False),
        sa.Column("beneficiary_cnpj", sa.String(14), sa.ForeignKey("beneficiaries.cnpj_cpf"), nullable=False),
        sa.Column("amendment_code", sa.String(30), nullable=False),
        sa.Column("amendment_type", sa.String(150)),
        sa.Column("amount_brl", sa.DECIMAL(15, 2), nullable=False),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("year_month", sa.Integer),
        sa.Column("source_file", sa.String(255)),
        sa.UniqueConstraint(
            "deputy_camara_id", "beneficiary_cnpj", "amendment_code", "year_month",
            name="uq_amendment_composite",
        ),
    )
    op.create_index("idx_amendments_deputy", "amendments", ["deputy_camara_id"])
    op.create_index("idx_amendments_beneficiary", "amendments", ["beneficiary_cnpj"])
    op.create_index("idx_amendments_year", "amendments", ["year"])

    op.create_table(
        "sync_logs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("pipeline_name", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("rows_read", sa.Integer, default=0),
        sa.Column("rows_loaded", sa.Integer, default=0),
        sa.Column("rows_skipped", sa.Integer, default=0),
        sa.Column("rows_errored", sa.Integer, default=0),
        sa.Column("nodes_created", sa.Integer, default=0),
        sa.Column("edges_created", sa.Integer, default=0),
        sa.Column("total_value_loaded", sa.DECIMAL(18, 2)),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("error_message", sa.Text),
    )


def downgrade() -> None:
    op.drop_table("sync_logs")
    op.drop_table("amendments")
    op.drop_table("municipalities")
    op.drop_table("beneficiaries")
    op.drop_table("deputies")
