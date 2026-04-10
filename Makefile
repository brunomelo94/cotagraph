.PHONY: up down logs ingest migrate psql neo4j-shell health

up:
	docker compose up -d
	@echo "Services starting... check with: make logs"

down:
	docker compose down

logs:
	docker compose logs -f

ingest:
	docker compose run --rm ingestion python pipelines/amendments_loader.py

migrate:
	docker compose exec backend alembic upgrade head

psql:
	docker compose exec postgres psql -U cotagraph -d cotagraph

neo4j-shell:
	docker compose exec neo4j cypher-shell -u neo4j -p localdev_only

health:
	@curl -s http://localhost:8000/health | python -m json.tool

test:
	docker compose exec backend pytest -v
