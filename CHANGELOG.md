> Agent context — not for human reading.

# Changelog

*(Auto-generated — do not edit manually)*

## Phase 1 — Single-User Expense Flow (2026-06-04)

- Single-user, local-only expense workflow shipped end-to-end: Setup → Capture → Expenses → Reports → Backup.
- Capture reads receipt date + amount via AI, converts foreign currency to VND at the recorded rate, retains both the colour photo and B&W scan in IndexedDB.
- Report generation assembles the combined submission PDF (invoice → expense detail → merged receipts) + Excel, auto-numbers invoices, marks expenses Submitted.
- Server is stateless — persists nothing; all data lives in the browser.
- Post-dogfood polish folded in: Expenses date column shows year, report drops the Notes column, camera button is mobile-only, capture shows a logged-confirmation with CTAs.
- Deferred to later phases (recorded in roadmap): onboarding/PIN/base-currency, settings + relocated restore, capture v2, sharper angled-receipt scans, sortable/Unsubmitted-default expenses, one-zip download (all Phase 2); multi-user (Phase 3); production deployment (Phase 4).
