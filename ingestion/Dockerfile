FROM python:3.13-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    "sqlalchemy>=2.0" \
    "psycopg2-binary>=2.9" \
    "neo4j>=5.27"

COPY . .

CMD ["python", "pipelines/amendments_loader.py"]
