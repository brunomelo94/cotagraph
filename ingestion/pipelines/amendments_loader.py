"""
amendments_loader.py — Load amendments CSV into PostgreSQL and Neo4j.

Reads: emendas_por_favorecido_partidos.csv (CGU, enriched with party column)
Loads: PostgreSQL (source of truth) → Neo4j (graph)

Data quality rules (from docs/data/data_quality.md):
- Zero-pad CNPJ to 14 digits, validate modulo-11 checksum
- Divide Valor Recebido by 100 (centavos → reais)
- Edge composite key: (deputy_id, beneficiary_cnpj, amendment_code, year_month)
- Canonical deputy name: most frequent per camara_id
- Filter rows with Valor Recebido <= 0
"""

import csv
import logging
import os
import sys
from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal

from neo4j import GraphDatabase
from sqlalchemy import create_engine, text

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("amendments_loader")

CSV_PATH = os.environ.get("CSV_PATH", "/data/emendas_por_favorecido_partidos.csv")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://cotagraph:localdev_only@postgres:5432/cotagraph")
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "localdev_only")
SOURCE_FILE = os.path.basename(CSV_PATH)


# --- CNPJ Validation ---

def validate_cnpj(raw: str) -> str | None:
    """Zero-pad and validate CNPJ checksum. Returns 14-digit string or None."""
    digits = raw.strip().zfill(14)
    if len(digits) != 14 or not digits.isdigit():
        return None
    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    s = sum(int(digits[i]) * weights1[i] for i in range(12))
    d1 = 11 - (s % 11)
    d1 = 0 if d1 >= 10 else d1
    if int(digits[12]) != d1:
        return None
    weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    s = sum(int(digits[i]) * weights2[i] for i in range(13))
    d2 = 11 - (s % 11)
    d2 = 0 if d2 >= 10 else d2
    if int(digits[13]) != d2:
        return None
    return digits


# --- CSV Reading & Transformation ---

def read_csv(path: str) -> list[dict]:
    """Read CSV and return raw rows."""
    log.info("Reading CSV: %s", path)
    with open(path, "r", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f, delimiter=","))
    log.info("Read %d rows", len(rows))
    return rows


def transform_rows(rows: list[dict]) -> tuple[list[dict], dict]:
    """Transform and validate rows. Returns (clean_rows, stats)."""
    stats = {"read": len(rows), "loaded": 0, "skipped_zero": 0, "skipped_invalid_cnpj": 0}
    clean = []

    # Build canonical name map: camara_id → most frequent name
    name_counter: dict[str, Counter] = {}
    for r in rows:
        cid = r.get("Código do Autor da Emenda", "").strip()
        name = r.get("Nome do Autor da Emenda", "").strip()
        if cid and name:
            name_counter.setdefault(cid, Counter())[name] += 1

    canonical_names: dict[str, str] = {}
    name_aliases_map: dict[str, list[str]] = {}
    for cid, counter in name_counter.items():
        canonical_names[cid] = counter.most_common(1)[0][0]
        all_names = list(counter.keys())
        if len(all_names) > 1:
            name_aliases_map[cid] = all_names

    for r in rows:
        valor_raw = r.get("Valor Recebido", "0").strip()
        try:
            valor_centavos = int(valor_raw)
        except ValueError:
            valor_centavos = 0

        if valor_centavos <= 0:
            stats["skipped_zero"] += 1
            continue

        cnpj_raw = r.get("Código do Favorecido", "").strip()
        cnpj = validate_cnpj(cnpj_raw)
        if not cnpj:
            stats["skipped_invalid_cnpj"] += 1
            continue

        camara_id = r.get("Código do Autor da Emenda", "").strip()
        year_month_raw = r.get("Ano/Mês", "").strip()
        try:
            year_month = int(year_month_raw)
            year = year_month // 100
        except ValueError:
            year_month = None
            year = None

        amendment_code_raw = r.get("Código da Emenda", "").strip()
        try:
            amendment_code = str(int(float(amendment_code_raw)))
        except (ValueError, OverflowError):
            amendment_code = amendment_code_raw

        clean.append({
            "camara_id": int(camara_id) if camara_id else None,
            "deputy_name": canonical_names.get(camara_id, r.get("Nome do Autor da Emenda", "").strip()),
            "party": r.get("siglaPartido", "").strip() or None,
            "cnpj": cnpj,
            "beneficiary_name": r.get("Favorecido", "").strip(),
            "legal_nature": r.get("Natureza Jurídica", "").strip() or None,
            "uf": r.get("UF Favorecido", "").strip() or None,
            "municipality": r.get("Município Favorecido", "").strip() or None,
            "amendment_code": amendment_code,
            "amendment_type": r.get("Tipo de Emenda", "").strip() or None,
            "amount_brl": Decimal(valor_centavos) / 100,
            "year": year,
            "year_month": year_month,
        })

    # Aggregate rows by composite key: (deputy_id, beneficiary_cnpj, amendment_code, year_month)
    # Multiple CSV rows can share the same key — SUM their amounts for idempotent upserts
    agg: dict[tuple, dict] = {}
    for r in clean:
        key = (r["camara_id"], r["cnpj"], r["amendment_code"], r["year_month"])
        if key in agg:
            agg[key]["amount_brl"] += r["amount_brl"]
        else:
            agg[key] = dict(r)
    aggregated = list(agg.values())

    stats["loaded"] = len(clean)
    stats["aggregated"] = len(aggregated)
    stats["collapsed"] = len(clean) - len(aggregated)
    return aggregated, stats, canonical_names, name_aliases_map


# --- PostgreSQL Loading ---

def load_postgres(engine, rows: list[dict], canonical_names, name_aliases_map) -> dict:
    """Upsert deputies, beneficiaries, amendments into PostgreSQL."""
    log.info("Loading into PostgreSQL (%d rows)...", len(rows))
    pg_stats = {"deputies": 0, "beneficiaries": 0, "amendments": 0}

    with engine.begin() as conn:
        # Upsert deputies
        deputies_seen = set()
        for r in rows:
            if r["camara_id"] and r["camara_id"] not in deputies_seen:
                deputies_seen.add(r["camara_id"])
                aliases = name_aliases_map.get(str(r["camara_id"]))
                conn.execute(text("""
                    INSERT INTO deputies (camara_id, name, party, state, name_aliases)
                    VALUES (:camara_id, :name, :party, :state, :aliases)
                    ON CONFLICT (camara_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        party = EXCLUDED.party,
                        state = EXCLUDED.state,
                        name_aliases = EXCLUDED.name_aliases,
                        updated_at = now()
                """), {
                    "camara_id": r["camara_id"],
                    "name": r["deputy_name"],
                    "party": r["party"],
                    "state": r["uf"],  # Note: this is beneficiary UF, not deputy UF (not in CSV)
                    "aliases": aliases,
                })
                pg_stats["deputies"] += 1

        # Upsert beneficiaries
        bens_seen = set()
        for r in rows:
            if r["cnpj"] not in bens_seen:
                bens_seen.add(r["cnpj"])
                conn.execute(text("""
                    INSERT INTO beneficiaries (cnpj_cpf, name, legal_nature, uf, municipality)
                    VALUES (:cnpj, :name, :legal_nature, :uf, :municipality)
                    ON CONFLICT (cnpj_cpf) DO UPDATE SET
                        name = CASE WHEN length(EXCLUDED.name) > length(beneficiaries.name)
                                    THEN EXCLUDED.name ELSE beneficiaries.name END,
                        legal_nature = COALESCE(EXCLUDED.legal_nature, beneficiaries.legal_nature),
                        uf = COALESCE(EXCLUDED.uf, beneficiaries.uf),
                        municipality = COALESCE(EXCLUDED.municipality, beneficiaries.municipality)
                """), {
                    "cnpj": r["cnpj"],
                    "name": r["beneficiary_name"],
                    "legal_nature": r["legal_nature"],
                    "uf": r["uf"],
                    "municipality": r["municipality"],
                })
                pg_stats["beneficiaries"] += 1

        # Upsert amendments
        for r in rows:
            conn.execute(text("""
                INSERT INTO amendments
                    (deputy_camara_id, beneficiary_cnpj, amendment_code, amendment_type,
                     amount_brl, year, year_month, source_file)
                VALUES (:dep_id, :ben_cnpj, :code, :type, :amount, :year, :ym, :src)
                ON CONFLICT ON CONSTRAINT uq_amendment_composite DO UPDATE SET
                    amount_brl = EXCLUDED.amount_brl,  -- pre-aggregated, so this is the full sum
                    amendment_type = COALESCE(EXCLUDED.amendment_type, amendments.amendment_type),
                    source_file = EXCLUDED.source_file
            """), {
                "dep_id": r["camara_id"],
                "ben_cnpj": r["cnpj"],
                "code": r["amendment_code"],
                "type": r["amendment_type"],
                "amount": float(r["amount_brl"]),
                "year": r["year"],
                "ym": r["year_month"],
                "src": SOURCE_FILE,
            })
            pg_stats["amendments"] += 1

    log.info("PostgreSQL: %d deputies, %d beneficiaries, %d amendments",
             pg_stats["deputies"], pg_stats["beneficiaries"], pg_stats["amendments"])
    return pg_stats


# --- Neo4j Loading ---

def load_neo4j(driver, rows: list[dict], canonical_names, name_aliases_map):
    """Load nodes and edges into Neo4j using UNWIND + MERGE."""
    log.info("Loading into Neo4j...")

    with driver.session() as session:
        # Create constraints
        for constraint in [
            "CREATE CONSTRAINT deputy_camara_id IF NOT EXISTS FOR (d:Deputy) REQUIRE d.camara_id IS UNIQUE",
            "CREATE CONSTRAINT beneficiary_cnpj IF NOT EXISTS FOR (b:Beneficiary) REQUIRE b.cnpj_cpf IS UNIQUE",
            "CREATE CONSTRAINT party_acronym IF NOT EXISTS FOR (p:Party) REQUIRE p.acronym IS UNIQUE",
            "CREATE CONSTRAINT state_uf IF NOT EXISTS FOR (s:State) REQUIRE s.uf IS UNIQUE",
        ]:
            session.run(constraint)
        log.info("Neo4j constraints ensured")

        # Batch deputies
        deputies = []
        seen_deps = set()
        for r in rows:
            if r["camara_id"] and r["camara_id"] not in seen_deps:
                seen_deps.add(r["camara_id"])
                deputies.append({
                    "camara_id": r["camara_id"],
                    "name": r["deputy_name"],
                    "party": r["party"],
                })
        session.run("""
            UNWIND $batch AS row
            MERGE (d:Deputy {camara_id: row.camara_id})
            SET d.name = row.name, d.party = row.party
        """, batch=deputies)
        log.info("Neo4j: %d Deputy nodes", len(deputies))

        # Batch beneficiaries
        bens = []
        seen_bens = set()
        for r in rows:
            if r["cnpj"] not in seen_bens:
                seen_bens.add(r["cnpj"])
                bens.append({
                    "cnpj": r["cnpj"],
                    "name": r["beneficiary_name"],
                    "legal_nature": r["legal_nature"],
                    "uf": r["uf"],
                    "municipality": r["municipality"],
                })
        session.run("""
            UNWIND $batch AS row
            MERGE (b:Beneficiary {cnpj_cpf: row.cnpj})
            SET b.name = row.name, b.legal_nature = row.legal_nature,
                b.uf = row.uf, b.municipality = row.municipality
        """, batch=bens)
        log.info("Neo4j: %d Beneficiary nodes", len(bens))

        # Batch parties
        parties = list({r["party"] for r in rows if r["party"]})
        session.run("""
            UNWIND $batch AS acronym
            MERGE (p:Party {acronym: acronym})
        """, batch=parties)
        log.info("Neo4j: %d Party nodes", len(parties))

        # Batch states
        states = list({r["uf"] for r in rows if r["uf"]})
        session.run("""
            UNWIND $batch AS uf
            MERGE (s:State {uf: uf})
        """, batch=states)
        log.info("Neo4j: %d State nodes", len(states))

        # Batch municipalities (name+uf as key since we don't have IBGE codes)
        munis = []
        seen_munis = set()
        for r in rows:
            if r["municipality"] and r["uf"]:
                key = (r["municipality"], r["uf"])
                if key not in seen_munis:
                    seen_munis.add(key)
                    munis.append({"name": r["municipality"], "uf": r["uf"]})
        session.run("""
            UNWIND $batch AS row
            MERGE (m:Municipality {name: row.name, uf: row.uf})
        """, batch=munis)
        log.info("Neo4j: %d Municipality nodes", len(munis))

        # SENT_AMENDMENT edges (batch in chunks to avoid memory issues)
        chunk_size = 5000
        edge_count = 0
        for i in range(0, len(rows), chunk_size):
            chunk = rows[i : i + chunk_size]
            edges = []
            for r in chunk:
                if r["camara_id"] and r["cnpj"]:
                    edges.append({
                        "camara_id": r["camara_id"],
                        "cnpj": r["cnpj"],
                        "code": r["amendment_code"],
                        "type": r["amendment_type"],
                        "amount": float(r["amount_brl"]),
                        "year": r["year"],
                        "year_month": r["year_month"],
                    })
            session.run("""
                UNWIND $batch AS row
                MATCH (d:Deputy {camara_id: row.camara_id})
                MATCH (b:Beneficiary {cnpj_cpf: row.cnpj})
                MERGE (d)-[r:SENT_AMENDMENT {
                    amendment_code: row.code,
                    year_month: row.year_month
                }]->(b)
                SET r.amount_brl = row.amount,
                    r.year = row.year,
                    r.amendment_type = row.type
            """, batch=edges)
            edge_count += len(edges)
        log.info("Neo4j: %d SENT_AMENDMENT edges", edge_count)

        # MEMBER_OF edges (deputy → party)
        dep_party = [{"camara_id": d["camara_id"], "party": d["party"]}
                     for d in deputies if d["party"]]
        session.run("""
            UNWIND $batch AS row
            MATCH (d:Deputy {camara_id: row.camara_id})
            MATCH (p:Party {acronym: row.party})
            MERGE (d)-[:MEMBER_OF]->(p)
        """, batch=dep_party)
        log.info("Neo4j: %d MEMBER_OF edges", len(dep_party))

        # LOCATED_IN edges (beneficiary → municipality)
        ben_muni = [{"cnpj": b["cnpj"], "muni": b["municipality"], "uf": b["uf"]}
                    for b in bens if b["municipality"] and b["uf"]]
        session.run("""
            UNWIND $batch AS row
            MATCH (b:Beneficiary {cnpj_cpf: row.cnpj})
            MATCH (m:Municipality {name: row.muni, uf: row.uf})
            MERGE (b)-[:LOCATED_IN]->(m)
        """, batch=ben_muni)
        log.info("Neo4j: %d LOCATED_IN edges", len(ben_muni))

        # PART_OF edges (municipality → state)
        session.run("""
            UNWIND $batch AS row
            MATCH (m:Municipality {name: row.name, uf: row.uf})
            MATCH (s:State {uf: row.uf})
            MERGE (m)-[:PART_OF]->(s)
        """, batch=munis)
        log.info("Neo4j: %d PART_OF edges", len(munis))

    return {
        "deputies": len(deputies),
        "beneficiaries": len(bens),
        "parties": len(parties),
        "states": len(states),
        "municipalities": len(munis),
        "edges": edge_count,
    }


# --- Reconciliation ---

def reconcile(engine, driver, expected_total: Decimal):
    """Post-load reconciliation: compare totals across CSV → PG → Neo4j."""
    log.info("Running reconciliation checks...")
    errors = []

    with engine.connect() as conn:
        pg_total = conn.execute(text("SELECT COALESCE(SUM(amount_brl), 0) FROM amendments")).scalar()
        pg_count = conn.execute(text("SELECT COUNT(*) FROM amendments")).scalar()

    with driver.session() as session:
        result = session.run(
            "MATCH ()-[r:SENT_AMENDMENT]->() RETURN count(r) AS cnt, sum(r.amount_brl) AS total"
        ).single()
        neo4j_count = result["cnt"]
        neo4j_total = Decimal(str(result["total"])) if result["total"] else Decimal(0)

    log.info("Reconciliation — CSV total: R$ %s", expected_total)
    log.info("Reconciliation — PG total:  R$ %s (%d rows)", pg_total, pg_count)
    log.info("Reconciliation — Neo4j total: R$ %s (%d edges)", neo4j_total, neo4j_count)

    # Allow small floating-point tolerance for Neo4j
    tolerance = Decimal("0.01") * pg_count
    if abs(pg_total - expected_total) > Decimal("0.01"):
        errors.append(f"PG total mismatch: expected {expected_total}, got {pg_total}")
    if abs(neo4j_total - expected_total) > tolerance:
        errors.append(f"Neo4j total mismatch: expected ~{expected_total}, got {neo4j_total}")

    if errors:
        for e in errors:
            log.error("RECONCILIATION FAILED: %s", e)
    else:
        log.info("Reconciliation PASSED")

    return errors


# --- Sync Log ---

def write_sync_log(engine, stats, neo4j_stats, total_value, errors, started_at):
    """Write ETL run record to sync_logs."""
    status = "success" if not errors else "error"
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO sync_logs
                (pipeline_name, status, rows_read, rows_loaded, rows_skipped, rows_errored,
                 nodes_created, edges_created, total_value_loaded, started_at, finished_at, error_message)
            VALUES (:pipe, :status, :read, :loaded, :skipped, :errored,
                    :nodes, :edges, :total, :started, :finished, :err)
        """), {
            "pipe": "amendments_loader",
            "status": status,
            "read": stats["read"],
            "loaded": stats["loaded"],
            "skipped": stats["skipped_zero"] + stats.get("skipped_invalid_cnpj", 0),
            "errored": stats.get("skipped_invalid_cnpj", 0),
            "nodes": neo4j_stats.get("deputies", 0) + neo4j_stats.get("beneficiaries", 0),
            "edges": neo4j_stats.get("edges", 0),
            "total": float(total_value),
            "started": started_at,
            "finished": datetime.now(timezone.utc),
            "err": "; ".join(errors) if errors else None,
        })
    log.info("Sync log written: %s", status)


# --- Main ---

def main():
    started_at = datetime.now(timezone.utc)
    log.info("=== amendments_loader starting ===")

    # Read & transform
    raw_rows = read_csv(CSV_PATH)
    clean_rows, stats, canonical_names, name_aliases_map = transform_rows(raw_rows)
    total_value = sum(r["amount_brl"] for r in clean_rows)
    log.info("Transform: %d clean rows → %d aggregated (%d collapsed), R$ %s total, %d skipped (zero=%d, invalid_cnpj=%d)",
             stats["loaded"], stats["aggregated"], stats["collapsed"],
             total_value, stats["skipped_zero"] + stats["skipped_invalid_cnpj"],
             stats["skipped_zero"], stats["skipped_invalid_cnpj"])

    # Connect
    engine = create_engine(DATABASE_URL)
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    try:
        # Load
        pg_stats = load_postgres(engine, clean_rows, canonical_names, name_aliases_map)
        neo4j_stats = load_neo4j(driver, clean_rows, canonical_names, name_aliases_map)

        # Reconcile
        errors = reconcile(engine, driver, total_value)

        # Log
        write_sync_log(engine, stats, neo4j_stats, total_value, errors, started_at)

        if errors:
            log.error("=== amendments_loader FINISHED WITH ERRORS ===")
            sys.exit(1)
        else:
            log.info("=== amendments_loader COMPLETE ===")

    finally:
        driver.close()
        engine.dispose()


if __name__ == "__main__":
    main()
