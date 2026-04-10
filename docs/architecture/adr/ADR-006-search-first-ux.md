---
id: adr-006-search-first-ux
title: "ADR-006: Search-First UX — Empty Graph on Load"
type: adr
status: decided
tags: [ux, frontend, search, progressive-disclosure, phase1]
related: [adr-005-cytoscapejs, architecture/frontend_components]
created: 2026-04-07
updated: 2026-04-07
summary: "Graph starts empty. User searches for a deputy or beneficiary to begin. Progressive disclosure via node expansion. Graph state is URL-encoded for sharing."
---

# ADR-006: Search-First UX — Empty Graph on Load

## Status

Decided — 2026-04-07

## Context

There are 513+ federal deputies, tens of thousands of beneficiaries, and hundreds of thousands of financial edges. We need an initial view that is informative but not overwhelming.

## Decision

The graph canvas starts empty. The user sees:
1. A prominent search bar (debounced, autocomplete)
2. A "Top 20 spenders" list to provide an entry point without search
3. A stats banner (total BRL in amendments, total deputies, last updated)

Clicking a deputy from the list or search results loads their 2-hop subgraph into the canvas.

Graph state (selected entity, filters, depth) is encoded in URL search params so views are shareable and bookmarkable: `/graph?focus=deputy_4497&depth=2&year=2024`

## Rationale

- **Performance:** Rendering 513 nodes on first load is heavy for the browser and visually unusable. Users cannot make sense of a fully-connected political network without a focal point.
- **Progressive disclosure:** Start with one entity, expand on demand. This mirrors how journalists and researchers actually investigate — they start with a subject, not a full network.
- **Shareability:** URL-encoded state lets a journalist share a specific subgraph with their editor, or a researcher link to a finding in a paper.
- **Top spenders list:** Provides immediate value without any search — users can discover the highest-spending deputies without prior knowledge.

## Alternatives Considered

| Option | Rejected because |
| --- | --- |
| Load all deputies as nodes on startup | Heavy on browser; visually overwhelming; layout takes seconds at 500+ nodes |
| Party-level aggregated overview | Adds a layer of abstraction between user and the deputy-level data they want |

## Consequences

- The app requires at least one search or list click before showing a graph — accepted trade-off
- URL param serialization must be implemented (Zustand ↔ URL sync via `react-router` search params)
- Mobile is explicitly out of scope for MVP — this UX is mouse-centric
