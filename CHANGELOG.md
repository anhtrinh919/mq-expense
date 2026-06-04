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

## Phase 2 — Onboarding, Polish & Quality (2026-06-04)

- First-run onboarding wizard (welcome → your details → optional PIN → done → restore) replaces dropping a new user onto a dense Setup page.
- Optional app PIN soft-lock for the *feel* of privacy; reset is always available and never loses data.
- Per-user base currency: each user picks a home country that sets their reimbursement currency, threaded through the FX endpoint, the report's amount-column label, and conversion notes (forward-only — historical rates preserved).
- Unified Settings page absorbs the old Setup, plus Base Currency, Security (Change PIN), and Restore; the Backup page becomes export-only.
- Capture v2: background pre-read of a batch while reviewing the first item, a review-all summary step, and draft autosave so navigation never loses in-progress input.
- Sharper scans: OpenCV four-point deskew for angled receipts, with a graceful fallback to the Phase 1 crop.
- Expenses table: sortable columns and a default "Unsubmitted" filter on open.
- Reports download as a single .zip (PDF + Excel) so Chrome no longer prompts for multiple files.
- Design fidelity: Instrument Serif applied to headings app-wide; mobile bottom-nav + center capture FAB rebuilt to match the design.
- Still single-user and local-only — the server persists nothing.
