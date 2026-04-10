from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models import Amendment, Beneficiary, Deputy

router = APIRouter(prefix="/deputies", tags=["deputies"])


@router.get("")
async def list_deputies(
    party: str | None = None,
    state: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if party:
        filters.append(Deputy.party == party)
    if state:
        filters.append(Deputy.state == state)

    count_q = select(func.count()).select_from(Deputy)
    for f in filters:
        count_q = count_q.where(f)
    total = await db.scalar(count_q)

    data_q = (
        select(
            Deputy.camara_id,
            Deputy.name,
            Deputy.party,
            Deputy.state,
            Deputy.photo_url,
            func.coalesce(func.sum(Amendment.amount_brl), 0).label("total_amendments_brl"),
        )
        .outerjoin(Amendment, Deputy.camara_id == Amendment.deputy_camara_id)
        .group_by(Deputy.id)
        .order_by(Deputy.name, Deputy.camara_id)
        .offset(offset)
        .limit(limit)
    )
    for f in filters:
        data_q = data_q.where(f)

    rows = (await db.execute(data_q)).all()

    items = [
        {
            "camara_id": r.camara_id,
            "name": r.name,
            "party": r.party,
            "state": r.state,
            "photo_url": r.photo_url,
            "total_amendments_brl": float(r.total_amendments_brl),
        }
        for r in rows
    ]

    return {"total": total, "items": items}


@router.get("/{camara_id}")
async def get_deputy(camara_id: int, db: AsyncSession = Depends(get_db)):
    deputy = await db.scalar(select(Deputy).where(Deputy.camara_id == camara_id))
    if not deputy:
        raise HTTPException(status_code=404, detail=f"No deputy found with camara_id={camara_id}")

    stats_row = (
        await db.execute(
            select(
                func.coalesce(func.sum(Amendment.amount_brl), 0).label("total_amendments_brl"),
                func.count(Amendment.id).label("amendment_count"),
            ).where(Amendment.deputy_camara_id == camara_id)
        )
    ).one()

    return {
        "camara_id": deputy.camara_id,
        "name": deputy.name,
        "party": deputy.party,
        "state": deputy.state,
        "photo_url": deputy.photo_url,
        "stats": {
            "total_amendments_brl": float(stats_row.total_amendments_brl),
            "amendment_count": stats_row.amendment_count,
        },
    }


@router.get("/{camara_id}/amendments")
async def get_deputy_amendments(
    camara_id: int,
    year: int | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    deputy = await db.scalar(select(Deputy.id).where(Deputy.camara_id == camara_id))
    if deputy is None:
        raise HTTPException(status_code=404, detail=f"No deputy found with camara_id={camara_id}")

    base = (
        select(
            Amendment.amendment_code,
            Beneficiary.name.label("beneficiary_name"),
            Amendment.beneficiary_cnpj,
            Amendment.amount_brl,
            Amendment.year,
            Amendment.amendment_type,
        )
        .join(Beneficiary, Amendment.beneficiary_cnpj == Beneficiary.cnpj_cpf)
        .where(Amendment.deputy_camara_id == camara_id)
    )
    if year:
        base = base.where(Amendment.year == year)

    total = await db.scalar(select(func.count()).select_from(base.subquery()))

    rows = (
        await db.execute(base.order_by(Amendment.amount_brl.desc()).offset(offset).limit(limit))
    ).all()

    items = [
        {
            "amendment_code": r.amendment_code,
            "beneficiary_name": r.beneficiary_name,
            "beneficiary_cnpj": r.beneficiary_cnpj,
            "amount_brl": float(r.amount_brl),
            "year": r.year,
            "amendment_type": r.amendment_type,
        }
        for r in rows
    ]

    return {"total": total, "items": items}
