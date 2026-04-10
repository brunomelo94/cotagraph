---
id: process-testing-strategy
title: "Testing Strategy — TDD + BDD"
type: process
status: decided
tags: [testing, tdd, bdd, pytest, vitest, playwright, testcontainers, phase1]
related: [architecture/adr/ADR-009-testing-strategy, process/cicd_pipeline]
created: 2026-04-07
updated: 2026-04-07
summary: "Three-layer pyramid: unit (pytest+vitest, 70%), integration with real DBs via testcontainers (20%), E2E Playwright BDD (10%). No database mocking in integration tests."
---

# Testing Strategy — TDD + BDD

## The Pyramid

```
        ┌─────────────┐
        │  E2E / BDD  │  10%  Playwright — full user journeys against staging
        │             │
     ┌──┴─────────────┴──┐
     │    Integration    │  20%  pytest + testcontainers — real DBs, no mocks
     │                   │
  ┌──┴───────────────────┴──┐
  │         Unit            │  70%  pytest (backend) + vitest (frontend)
  └─────────────────────────┘
```

---

## Layer 1: Unit Tests (70%)

**Backend — pytest + pytest-asyncio**

- Test FastAPI route handlers with a **mocked service layer** (not mocked DBs)
- Test Pydantic schemas: valid input, invalid input, edge cases
- Test normalization utilities: CNPJ stripping, name normalization, `legal_nature` classification
- Test fuzzy match logic: correct match, below-threshold rejection, empty input

```python
# Example: test that /graph/{id} calls graph_service with correct params
async def test_graph_endpoint_calls_service(client, mock_graph_service):
    mock_graph_service.get_subgraph.return_value = GraphResponse(nodes=[], edges=[])
    response = await client.get("/api/v1/graph/deputy_4497?depth=2")
    assert response.status_code == 200
    mock_graph_service.get_subgraph.assert_called_once_with("deputy_4497", depth=2)
```

**Frontend — Vitest + React Testing Library**

- Test component behavior, not implementation
- Test `SearchBar`: debounce fires after 300ms, clears on empty
- Test `FilterPanel`: filter changes update Zustand store
- Test `GraphCanvas`: renders nodes from props, calls `onNodeClick` on click
- Test `api.ts`: correct URL construction, error handling

```typescript
// Example: SearchBar calls API after debounce
it('triggers search after 300ms debounce', async () => {
  render(<SearchBar onSelect={vi.fn()} />)
  await userEvent.type(screen.getByRole('textbox'), 'Arthur')
  expect(mockFetchSearch).not.toHaveBeenCalled()   // not yet
  await vi.advanceTimersByTimeAsync(300)
  expect(mockFetchSearch).toHaveBeenCalledWith('Arthur')
})
```

---

## Layer 2: Integration Tests (20%)

**Tool:** `testcontainers-python` — spins up real Docker containers per test session.

**Hard rule: Do not mock databases.** Use real Neo4j and PostgreSQL containers.

```python
# conftest.py
@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg.get_connection_url()

@pytest.fixture(scope="session")
def neo4j_container():
    with Neo4jContainer("neo4j:5.18-community") as neo:
        yield neo.get_connection_url()
```

**What integration tests cover:**
- ETL pipeline loads CSV → PostgreSQL rows are correct (counts, values, no duplicates on re-run)
- Neo4j loader: `MERGE` creates correct node types, no duplicate nodes
- Graph service: Cypher query against real Neo4j returns expected shape
- Alembic migrations: `alembic upgrade head` runs without error on a fresh DB
- API endpoint → DB → response: full stack integration for graph endpoint

---

## Layer 3: E2E / BDD Tests (10%)

**Tool:** Playwright (Python or TypeScript bindings — TBD in Phase 3)

**Runs against:** Staging environment (not localhost). Phase 3 only.

**BDD scenario examples:**

```gherkin
Feature: Deputy graph exploration

  Scenario: User searches for a deputy and explores their graph
    Given I am on the Cotagraph homepage
    When I type "Arthur Lira" in the search bar
    And I select "ARTHUR LIRA (PP - AL)" from suggestions
    Then I see a deputy card in the sidebar with party "PP"
    And I click "Explore graph"
    Then the graph canvas shows at least 3 nodes
    And at least one edge has a positive amount_brl

  Scenario: Shareable URL preserves graph state
    Given I have expanded the graph for deputy 4497
    When I copy the URL and open it in a new tab
    Then the graph shows the same deputy and connected nodes
```

---

## Running Tests

```bash
# Unit tests
make test                        # runs pytest + vitest together

# Backend unit only
cd backend && pytest tests/ -v

# Frontend unit only
cd frontend && npm run test

# Integration tests (requires Docker)
cd backend && pytest tests/integration/ -v --timeout=120

# E2E (Phase 3, staging)
cd e2e && playwright test
```

---

## CI Test Execution

See `process/cicd_pipeline.md`. Integration tests run on every PR. E2E runs weekly against staging (Phase 3). Tests are path-filtered — backend changes only trigger backend tests.
