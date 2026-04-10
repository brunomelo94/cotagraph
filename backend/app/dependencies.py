from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from neo4j import AsyncGraphDatabase
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

neo4j_driver = AsyncGraphDatabase.driver(
    settings.neo4j_uri,
    auth=(settings.neo4j_user, settings.neo4j_password),
)

redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with async_session() as session:
        yield session


async def get_neo4j():
    async with neo4j_driver.session() as session:
        yield session


async def get_redis():
    return redis_client


@asynccontextmanager
async def lifespan_connections():
    """Verify all connections on startup, close on shutdown."""
    # Verify Neo4j
    async with neo4j_driver.session() as session:
        await session.run("RETURN 1")
    # Verify PostgreSQL
    async with engine.begin() as conn:
        await conn.execute(
            __import__("sqlalchemy").text("SELECT 1")
        )
    # Verify Redis
    await redis_client.ping()

    yield

    await redis_client.aclose()
    await neo4j_driver.close()
    await engine.dispose()
