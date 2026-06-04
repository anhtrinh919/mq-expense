> Agent context — not for human reading.

# Technical Decisions — MQ Expense

Decisions recorded at constitution stage (from `tech-stack.md`):

**Python for receipt processing, Node.js for the API server** — Why: the existing cowork pipeline is Python (Pillow, openpyxl, PDF tools) and is proven. Rewriting in Node.js would add risk with no user benefit. Python subprocess called from Node.js is a clean boundary. Alternatives: Full Python server (FastAPI) — rejected because Node.js/TypeScript ecosystem is stronger for frontend tooling; Full Node.js — rejected because rewriting the proven processing pipeline adds risk.

**Dexie.js over raw IndexedDB** — Why: typed, Promise-based wrapper with schema versioning and migration support. Raw IndexedDB is verbose and error-prone for complex queries. Alternatives: localForage (simpler but no schema versioning); SQLite WASM (heavier, less mature for production browser use).

**`claude -p` for receipt reading** — Why: homepc-1 already runs Claude Code under the user's existing plan — zero marginal cost. AI-vision understands messy foreign-language receipts far better than classical OCR. Alternatives: Google Cloud Vision (paid, external data transfer); Tesseract (free but poor on Asian scripts — kept as fallback only).

**xe.com rate** — Why: matches the existing cowork pipeline for auditing consistency. Different rate source would produce different VND figures for the same transaction. Alternatives: exchangerate.host, Open Exchange Rates — different from existing pipeline.

**Express + Vite SPA over a meta-framework** — Why: simplest deployment — Vite builds to static files, Express serves them plus the API. No SSR needed for a local-first app. Single `node server.js` on homepc-1. Alternatives: Next.js (overkill); SvelteKit (unfamiliar stack).

**Tailscale for remote access** — Why: homepc-1 is behind a home NAT. Tailscale provides secure, zero-config access from any device. Alternatives: Cloudflare Tunnel (adds external dependency); ngrok (not suitable for always-on production).

---

## Constitution-stage product decisions (resolved by user)

**Setup is one page, not five screens** — Set-once config (Profile, Invoice To, Bank Details, Country Codes, Currency Settings) lives as sections within a single Setup page. Config you touch once shouldn't require navigation.

**Receipt retention: keep both images** — Each expense record retains the original colour photo (untouched, as a user safety-net) *and* the cleaned B&W scan (used in the submission package). Both are stored privately in the user's own IndexedDB; the server persists neither. (Phase 1 spec note: storage holds original + B&W scan per receipt.)

**Exchange-rate caching** — Server-side xe.com rate cached for 1 hour; the exact rate used is recorded on each expense row.

**Phase boundaries for account UI** — Phase 1 ships only single-user screens and does not draw or stub any account screen. Navigation is built forward-compatibly so accounts can slot in later. **Phase 3** owns all account UI (Invite, Join, Account) — corrected from an earlier note that mis-assigned it to Phase 2.

**Invoice numbering preserved exactly** — Per-user counter formatted `{prefix}{YY}-{n}` (e.g. HBEXPENSE26-1, -2…). Two-digit year suffix taken from the report-generation date; counter resets to 1 each new year; year rolls over automatically. Confirmed against the existing pipeline's `next_invoice_number`.

---

## Phase 2 implementation decisions

**PIN is a soft-lock, not encryption** — Why: data is already local-only, so the PIN is for the *feel* of privacy, not protection. Reset is always available and never loses data (it clears/replaces the PIN, not the workspace). Alternatives: real encryption-at-rest — rejected as over-engineering for a single-user local app and a data-loss risk if the PIN is forgotten.

**Base currency is per-user, forward-only** — Why: a Thailand rep should see everything in THB the same way the wife sees VND. One base currency per user (not per-receipt). Changing it does not rewrite historical rows — each expense keeps the rate recorded at capture. Alternatives: per-receipt base currency (rejected — meaningless for a single submission package); retroactive recompute on change (rejected — would falsify already-recorded rates).

**Report download is a client-side zip** — Why: Chrome prompts on multi-file downloads; bundling the PDF + Excel into one .zip in the browser avoids the prompt without changing the stateless API (which still returns the two files separately). Alternatives: server-built zip (rejected — adds server work for a purely cosmetic browser issue).

**Angled-receipt deskew with graceful fallback** — Why: OpenCV four-point flatten/deskew only runs when a clean receipt rectangle is detected; otherwise it falls back to the Phase 1 crop rather than risk mangling a hard photo. Alternatives: always-deskew (rejected — distorts photos where no rectangle is found); a paid document-scanning API (rejected — cost + external data transfer).
