from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models import Amendment, Beneficiary, Deputy, SyncLog

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary")
async def stats_summary(db: AsyncSession = Depends(get_db)):
    deputies = await db.scalar(select(func.count()).select_from(Deputy))
    beneficiaries = await db.scalar(select(func.count()).select_from(Beneficiary))
    total_brl = await db.scalar(select(func.coalesce(func.sum(Amendment.amount_brl), 0)))
    latest_year = await db.scalar(select(func.max(Amendment.year)))
    last_sync = await db.scalar(
        select(SyncLog.finished_at)
        .where(SyncLog.status == "completed")
        .order_by(SyncLog.finished_at.desc())
        .limit(1)
    )

    return {
        "total_deputies": deputies,
        "total_beneficiaries": beneficiaries,
        "total_amendments_brl": float(total_brl),
        "latest_amendment_year": latest_year,
        "last_sync_at": last_sync.isoformat() if last_sync else None,
    }
