FROM python:3.13-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir \
    "fastapi>=0.115" \
    "uvicorn[standard]>=0.34" \
    "sqlalchemy[asyncio]>=2.0" \
    "asyncpg>=0.30" \
    "neo4j>=5.27" \
    "redis>=5.2" \
    "pydantic-settings>=2.7" \
    "httpx>=0.28" \
    "alembic>=1.14" \
    "psycopg2-binary>=2.9"

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
