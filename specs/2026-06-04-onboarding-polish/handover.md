# Phase 2 Frontend Handover — MQ Expense (Onboarding, Polish & Quality)

## Design file — source of truth

> **This handover is an index. The design file is the specification.**
> Backend must open the design file and build the new/changed UI from it — frame by frame, node by node. Where this doc and the design file differ, **the design file wins.**

- **Path:** `pencil/v0.1-p2.pen` (project-relative). This is the **Phase 2** file; the Phase 1 file `pencil/v0.1.pen` remains the reference for unchanged screens.
- **Tool:** Pencil (schema 2.13)
- **How to read it:** read the `.pen` directly as JSON (plain JSON; top-level keys `version`, `children` = array of frame nodes each with `id`/`name`/`type`/`width`/`height`/`children`, and `variables` = the token map). Navigate by frame `name` (e.g. `"A · 01 Onboarding — Welcome"`) or `id` (see frame index). Parse with `python3 -c "import json; d=json.load(open('pencil/v0.1-p2.pen'))"`. The Pencil MCP is an alternative when the desktop app is reachable, but direct JSON read is reliable on this machine and is how the tokens were verified.

## Design tokens

- **Tokens file:** `specs/2026-06-04-single-user-flow/design-tokens.css` — **unchanged.** The Phase 2 file's `variables` map is byte-identical to Phase 1 (41 tokens). No new tokens this phase. The app already imports this file via `src/styles/design-tokens.css` / `globals.css`; keep using it. Do not duplicate hex/number values into components — reference `var(--…)`.

## Fonts required

Unchanged from Phase 1 — all three already loaded via the Google Fonts `<link>` in `index.html`. **The Phase 2 fidelity story (S11) is specifically about applying them correctly, not adding any:**

| Role | Family | Variable | Weights |
|------|--------|----------|---------|
| Body / UI | **Inter** | `--font-sans` | 400, 500, 600 |
| Display / headings | **Instrument Serif** | `--font-display` | 400 |
| Mono — money, currencies, rates, account codes, invoice numbers, **the numeric PIN** | **JetBrains Mono** | `--font-mono` | 400, 500 |

> **Fidelity note (load-bearing, S11):** in Phase 1 `--font-display` is referenced only by the sidebar brand + the globals `h*` rule; screen/section headings can fall through to Inter. Apply Instrument Serif to headings everywhere the design uses it. JetBrains Mono / tabular figures for all numerics, **including the PIN entry digits.**

## What was designed

All 13 Phase 2 desktop states plus 5 mobile screens, added alongside the Phase 1 frames in the same file. Two new **full-bleed (no sidebar)** surfaces precede the app shell — Onboarding (5 states) and the PIN lock (2 states) — drawn as calm centered single-column flows on the same paper canvas. A reworked **Settings** (absorbs Setup + Base Currency + Security + Restore), **Capture v2** (batch pre-read, review-all, draft-restored), and light edits to the existing Expenses / Reports-Success / Backup frames. The two systemic Phase 1 drifts (heading font, mobile nav) are reconciled in implementation per S11, against this file.

## Frame index

Every new/changed `requirements.md` UI state maps to a frame in `pencil/v0.1-p2.pen`.

| Requirement state | Frame (id) | Frame name |
|---|---|---|
| Onboarding — Welcome (+ Restore entry) | `I5rU4` | A · 01 Onboarding — Welcome |
| Onboarding — Your details (name, country→currency, override) | `Ck42l` | A · 02 Onboarding — Your details |
| Onboarding — Set a PIN (optional, skippable) | `ydLia` | A · 03 Onboarding — Set a PIN |
| Onboarding — Done (3-point quick guide + CTA) | `S4bld` | A · 04 Onboarding — Done |
| Onboarding — Restore (file picker + import progress/result) | `gnGso` | A · 05 Onboarding — Restore |
| PIN lock — Default (numeric entry, wrong-PIN, Forgot PIN?) | `r92QsP` | B · 06 PIN lock — Default |
| PIN lock — Reset (no-data-lost confirm; set new / remove) | `DThZ0` | B · 07 PIN lock — Reset |
| Settings — Default (all sections + Base Currency + Security + Restore) | `LHPfu` | C · 08 Settings — Default |
| Settings — Deferred fields (invoice/bank empty + report-needs-these prompt) | `mo7t2` | C · 09 Settings — Deferred fields |
| Capture — Reviewing, batch pre-read (per-item status + editable current) | `zAWP0` | D · 10 Capture v2 — Reviewing batch |
| Capture — Review-all summary (editable list + Save all) | `ZcRqv` | D · 11 Capture v2 — Review-all summary |
| Capture — Draft restored (quiet restored indication) | `zWOeJ` | D · 12 Capture v2 — Draft restored |
| Expenses — Default (sortable headers + Unsubmitted default filter) | `GZKAO` | C · 10 Expenses — Default *(existing frame; sort + default-filter affordances)* |
| Reports/Create — Success (single-zip copy) | `UemuK` | D · 17 Reports/Create — Success *(existing frame; "one zip" copy)* |
| Backup — Default (export-only; Import card removed) | `Nex2m` | E · 22 Backup — Default *(existing frame; export-only)* |

**Mobile frames (build mobile layouts from these):**

| Mobile screen | Frame (id) |
|---|---|
| Onboarding — Welcome | `TSV1E` (M1) |
| Onboarding — Your details | `ftJO5` (M2) |
| PIN lock — Default | `s9o8D` (M3) |
| Settings — Default | `IQTxL` (M4) |
| Capture v2 — Review-all | `Yz5Am` (M5) |
| App shell — Mobile (nav/FAB reference for S11 rebuild) | `kvjJO` (F · 26) |

## Reusable components

Reuse the Phase 1 components (Sidebar `cyT52`, status chip, expense row, receipt viewer, queue item, stat card) — do not redraw. New/extended for Phase 2:

| Component | Where | Notes |
|---|---|---|
| Onboarding step scaffold | Onboarding frames | Shared full-bleed centered layout + step progression; one component, per-step content |
| PIN pad / numeric entry | PIN lock + Onboarding Set-a-PIN | JetBrains Mono digits; reused on the lock screen and the onboarding PIN step |
| Settings section | Settings frames | Extends the Phase 1 Setup section pattern; Base Currency / Security / Restore are new peer sections |
| Capture per-item status chip | Capture v2 queue rail | Maps onto the existing status palette (reading→muted/neutral, read→submitted/paid, needs-attention→attention, failed→error) |
| Review-all row | Capture v2 review-all | Compact editable summary row per receipt |

## Deviations from requirements spec

None functional. The design realizes the spec's screens; all behavior is as `requirements.md` describes. The base-currency, PIN-as-soft-lock, forward-only-currency-change, and draft-autosave rules in `requirements.md` Constraints stand. No new API surfaced from the design.

## Layout / IA notes

- **Two full-bleed surfaces:** Onboarding (`I5rU4`/`Ck42l`/`ydLia`/`S4bld`/`gnGso`) and PIN lock (`r92QsP`/`DThZ0`) are the only screens **without** the sidebar/app-shell — they precede it. Do not render them inside `AppShell`. Gate routing: `onboardingComplete === false` → Onboarding; a set PIN + locked session → PIN lock; otherwise the normal shell.
- **S11 fidelity, implement against this file:** apply `--font-display` to headings app-wide; rebuild the mobile bottom nav + center capture FAB to match `kvjJO`. Targeted reconciliation of the two flagged systemic issues — not a per-screen audit.
- **Nav rename:** the sidebar/bottom-nav "Setup" node becomes "Settings" (same route slot, same shortcut).
- **Numerics in mono:** PIN digits, amounts, rates, codes, invoice numbers all in JetBrains Mono / tabular figures.

## API contracts expected from backend

From `requirements.md` API Contracts — implement exactly. No new endpoints; two existing contracts change.

### Get FX Rate (changed — `to` variable)
- `GET /api/fx?from=<CUR>&to=<BASE>` — `to` is the user's base currency (defaults to/accepts `VND`). Validate both currencies. Success `{ rate, from, to, source:"xe.com", fetchedAt }` 200. Errors: `400` invalid currency, `502` source unavailable, `500`.

### Generate Report Package (changed — base currency)
- `POST /api/generate-report` (JSON) — gains `baseCurrency` (default `"VND"`); drives the amount-column label `Amount (<BASE>)` + conversion-string currency. Structure/order/template/subtotals/Notes math unchanged. Success `{ combinedPdf, expenseXlsx }` 200. Errors: `400` missing field, `422` no expenses, `500` assembly failed. (Zip bundling is client-side; API still returns the two files.)

### Process Receipt (no contract change — better scan)
- `POST /api/process-receipt` (multipart `file`) — unchanged request/response. Internal: OpenCV four-point deskew with graceful fallback to the Phase 1 crop.

### Health (unchanged)
- `GET /api/health` → `{ status:"ok", reader:"claude"|"tesseract"|"unavailable" }`.
