---
id: process-localization
title: "Localization — Language Strategy and i18n Plan"
type: process
status: decided
tags: [localization, i18n, portuguese, english, react-i18next, phase3]
created: 2026-04-07
updated: 2026-04-07
summary: "English for all code, docs, and agent communication. Portuguese for frontend user-facing text. i18n via react-i18next, planned for Phase 3. Database values preserved in original language."
---

# Localization — Language Strategy

## Decision

| Context | Language | When |
| --- | --- | --- |
| Source code (variable names, functions, types) | English | Always |
| Code comments | English | Always |
| Git commit messages | English | Always |
| All files in `docs/` | English | Always |
| Agent communication | English | Always |
| Frontend UI text (labels, buttons, tooltips, messages) | Portuguese | Phase 3 |
| Error messages shown to users | Portuguese | Phase 3 |
| Database column values from government sources | Portuguese (preserved as-is) | Always |
| Deputy/beneficiary names in the graph | Portuguese (preserved as-is) | Always |

**Rationale:** The primary end-users (Brazilian citizens, journalists, researchers) speak Portuguese. Developers and AI agents working on the codebase communicate in English — the lingua franca of software development and the language with the best AI model coverage.

---

## Implementation Plan (Phase 3)

**Library:** `react-i18next`  
**Pattern:** All hardcoded UI strings extracted to JSON translation files.

### File Structure

```
frontend/src/
└── locales/
    ├── pt-BR/
    │   ├── common.json     # shared strings (buttons, labels)
    │   ├── graph.json      # graph page strings
    │   ├── deputy.json     # deputy page strings
    │   └── errors.json     # error messages
    └── en/                 # English translations (for future)
        └── common.json
```

### Usage Pattern

```typescript
// Instead of:
<button>Explore graph</button>

// Use:
const { t } = useTranslation('graph')
<button>{t('explore_graph')}</button>

// pt-BR/graph.json:
{ "explore_graph": "Explorar grafo" }
```

### Default Locale

`pt-BR` is the default. No locale switcher in MVP — all users see Portuguese UI.

English locale files are created in Phase 3 alongside Portuguese so future internationalization (English UI) is straightforward.

---

## Government Data in Portuguese

Deputy names, beneficiary names, policy areas, amendment types, and municipality names are stored and displayed in Portuguese exactly as they appear in the source data. These are proper nouns and official classifications — they are not translated.

Examples:

- Deputy: `ARTHUR LIRA` (preserved as-is)
- Beneficiary: `PREFEITURA MUNICIPAL DE MACEIÓ` (preserved)
- Policy area: `Saúde` (preserved)
- Amendment type: `Emenda Individual - Transferências Especiais` (preserved)

---

## Future Consideration

If Cotagraph is ever opened to international audiences (researchers outside Brazil), add English UI strings in Phase 4. The i18n infrastructure set up in Phase 3 makes this a translation task, not an architectural change.
