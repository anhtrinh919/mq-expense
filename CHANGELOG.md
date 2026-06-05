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

## Phase 3 — Multi-User & Sharing (2026-06-05)

- Invite-only accounts layered on top of the proven single-user app: the manager account is seeded by the operator (never self-registered); peers join via an invite link/code and each gets a fully private workspace.
- Strict per-user data isolation — no user (not even the inviting manager) can see another's expenses, receipts, or reports. The manager sees only a name + email + status roster.
- Server now stores each user's data **encrypted at rest** (AES-256-GCM, per-account data key wrapped by a server master key; PINs scrypt-hashed; opaque session tokens). Server-managed key = recoverable, deliberately not zero-knowledge.
- Cross-device sync: last-write-wins by updatedAt with delete tombstones, pushed/pulled over the encrypted REST channel; blobs (receipts, report files) base64 in transit.
- **Instant live sync** via a Server-Sent-Events nudge channel (zero new deps): one device's save pokes the user's other devices to pull within ~1s; falls back to a 60s poll + on-focus sync when the stream is down.
- Sync resilience: one unreadable record can no longer wedge the whole stream (skip-and-advance), and the background-sync effect subscribes once per signed-in session (no render-rate loop).
- PIN reset is out-of-band only — operator runs an admin script; no email and no in-app reset flow (per privacy posture).
- Account screens built whole this phase: Join (create account), Login/Unlock (email+PIN, quick PIN unlock, first-login data-migration prompt, disabled/locked-out/forgot states), and the manager Invite & Team roster (generate/revoke).
- Profile/Settings restructure: Profile holds personal/invoice/bank/country config; Settings holds account + data (export backup, restore, change PIN, clear-all-my-data).
- Privacy posture amended with user sign-off: server moves from "stores nothing" to "stores only per-account, encrypted-at-rest data" solely to sync a user's own devices.

## Phase 4 — Production Deployment (2026-06-05)

- **Live at https://mqexpense.ta-infra.uk** — go-live complete; roadmap finished.
- Runs on homepc-1 (WSL2 Ubuntu) as systemd `mq-expense.service`: `NODE_ENV=production tsx server/index.ts` on port 8787, single-origin (serves built `dist/` + API), restart-on-failure, enabled at boot.
- Public access via the existing shared Cloudflare tunnel: `mqexpense.ta-infra.uk` added as a 5th ingress hostname (alongside ollama/brain/dook/dook-preview), DNS CNAME routed to the tunnel, hot-reloaded with no disruption to the other sites.
- Code on a private GitHub repo (`anhtrinh919/mq-expense`); `main` is the deployable branch. Update = pull + `npm ci` + build + restart (see `docs/deployment.md`).
- Permanent server master key generated, stored in a root-only EnvironmentFile with an operator backup copy; production refuses to boot without it. DB and key live outside the repo so redeploys never touch user data.
- Two managers seeded (operator-only, never self-registered): env-seed creates the first; `server/scripts/add-account.ts` creates additional managers/accounts. Production started from a fresh database (dogfood test data left behind).
- Fixed an unsatisfiable Python pin discovered at deploy: numpy 2.4.2 → 2.2.6 (opencv-python-headless 4.12 caps numpy on linux/cp312).
