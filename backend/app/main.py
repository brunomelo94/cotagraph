from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.dependencies import lifespan_connections, neo4j_driver, redis_client, engine
import sqlalchemy


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with lifespan_connections():
        yield


app = FastAPI(
    title="Cotagraph API",
    description="Brazilian parliamentary spending transparency",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    checks = {"neo4j": False, "pg": False, "redis": False}

    try:
        async with neo4j_driver.session() as session:
            await session.run("RETURN 1")
        checks["neo4j"] = True
    except Exception:
        pass

    try:
        async with engine.begin() as conn:
            await conn.execute(sqlalchemy.text("SELECT 1"))
        checks["pg"] = True
    except Exception:
        pass

    try:
        await redis_client.ping()
        checks["redis"] = True
    except Exception:
        pass

    status = "ok" if all(checks.values()) else "degraded"
    return {"status": status, **checks}
