from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    ARRAY,
    DECIMAL,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Deputy(Base):
    __tablename__ = "deputies"

    id: Mapped[int] = mapped_column(primary_key=True)
    camara_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    party: Mapped[str | None] = mapped_column(String(20))
    state: Mapped[str | None] = mapped_column(String(2))
    photo_url: Mapped[str | None] = mapped_column(Text)
    name_aliases: Mapped[list[str] | None] = mapped_column(ARRAY(String(255)))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Beneficiary(Base):
    __tablename__ = "beneficiaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    cnpj_cpf: Mapped[str] = mapped_column(String(14), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    legal_nature: Mapped[str | None] = mapped_column(String(100))
    uf: Mapped[str | None] = mapped_column(String(2))
    municipality: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Municipality(Base):
    __tablename__ = "municipalities"

    id: Mapped[int] = mapped_column(primary_key=True)
    ibge_code: Mapped[str] = mapped_column(String(7), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    uf: Mapped[str] = mapped_column(String(2), nullable=False)


class Amendment(Base):
    __tablename__ = "amendments"

    id: Mapped[int] = mapped_column(primary_key=True)
    deputy_camara_id: Mapped[int] = mapped_column(Integer, ForeignKey("deputies.camara_id"), nullable=False)
    beneficiary_cnpj: Mapped[str] = mapped_column(String(14), ForeignKey("beneficiaries.cnpj_cpf"), nullable=False)
    amendment_code: Mapped[str] = mapped_column(String(30), nullable=False)
    amendment_type: Mapped[str | None] = mapped_column(String(150))
    amount_brl: Mapped[Decimal] = mapped_column(DECIMAL(15, 2), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    year_month: Mapped[int | None] = mapped_column(Integer)
    source_file: Mapped[str | None] = mapped_column(String(255))

    __table_args__ = (
        UniqueConstraint(
            "deputy_camara_id", "beneficiary_cnpj", "amendment_code", "year_month",
            name="uq_amendment_composite",
        ),
    )


class SyncLog(Base):
    __tablename__ = "sync_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    pipeline_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    rows_read: Mapped[int] = mapped_column(Integer, default=0)
    rows_loaded: Mapped[int] = mapped_column(Integer, default=0)
    rows_skipped: Mapped[int] = mapped_column(Integer, default=0)
    rows_errored: Mapped[int] = mapped_column(Integer, default=0)
    nodes_created: Mapped[int] = mapped_column(Integer, default=0)
    edges_created: Mapped[int] = mapped_column(Integer, default=0)
    total_value_loaded: Mapped[Decimal | None] = mapped_column(DECIMAL(18, 2))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)
