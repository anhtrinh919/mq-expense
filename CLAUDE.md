# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MQ Expense — Project Notes

Local-first expense tool for a Macquarie SEA sales manager + invited peers. React 18 + Vite SPA, Express server run via **tsx** (Node, not bun), Dexie/IndexedDB on the client, better-sqlite3 server store, AES-256-GCM at-rest encryption, invite-only accounts, last-write-wins sync with tombstones + an SSE live-nudge channel.

## Commands

```bash
# Dev: starts Vite (port 5173) + Express API (port 8787) together via concurrently
MQX_MANAGER_EMAIL=hanhbh.213@gmail.com MQX_MANAGER_NAME=Hanh MQX_MANAGER_PIN=210390 npm run dev

# Build frontend to dist/
npm run build

# Production server only (serves dist/ + API on port 8787)
npm run start

# Type-check both client and server
npm run typecheck

# Run all tests
npm test

# Run a single test file
npx vitest run src/lib/currency.test.ts
```

The dev env vars seed the manager account on first boot (idempotent after that — safe to leave on every run). `MQX_DB_PATH` controls where the SQLite file lands (defaults to `mqx-data.sqlite` in the repo root, git-ignored). `PYTHON_BIN` points to the Python binary for receipt scanning and report generation (optional — without it those two features degrade gracefully).

## Architecture

### Two processes, one origin

`npm run dev` starts both with `concurrently`. The **Vite dev server** (5173) proxies `/api` to the **Express API** (8787), so the browser sees a single origin. In production a single `tsx server/index.ts` serves `dist/` (the built SPA) and the API on port 8787.

### Client data layer (`src/data/`)

All user data lives in **Dexie/IndexedDB** (`MqExpenseDB`, version 4). Five stores are synced: `profile`, `countryCodes`, `expenses`, `images`, `reports`. Two are local-only: `drafts` (in-progress capture queue) and `account` (session + sync cursors).

Every write to a synced store automatically stamps `updatedAt` via a Dexie `creating`/`updating` hook — this is the last-write-wins key. When the sync engine applies a record pulled from the server it calls `withSuppressedStamp()` so the server timestamp is preserved rather than overwritten.

### Server data layer (`server/db/sqlite.ts`)

SQLite in WAL mode via `better-sqlite3`. Four tables: `accounts`, `invites`, `sessions`, `sync_records`. The `sync_records.data` column is AES-256-GCM ciphertext — no user data is stored in the clear.

### Sync (`src/lib/sync.ts` ↔ `server/routes/sync.ts`)

Push-then-pull on login, on visibility change, on a 60-second interval, and on an SSE nudge from `/api/events`. Blobs (receipt images, report files) are base64-encoded for transit. The server enforces last-write-wins on push — it only overwrites a record if the incoming `updatedAt` is newer. Deletes are tombstoned locally; a tombstone in the push payload causes a hard delete on the server and on other devices without creating a new tombstone there (avoids echo).

### Encryption (`server/lib/crypto.ts`)

AES-256-GCM throughout. Each account has a random per-user **DEK** (data-encryption key) stored in `accounts.enc_dek`, itself wrapped (encrypted) under the single server **master key** (`MQX_MASTER_KEY`). This lets PIN reset work without re-encrypting user data. In dev a deterministic fallback key is derived so a server restart can still read the local DB; in prod `MQX_MASTER_KEY` is required. PINs are hashed with `scryptSync` + per-user salt.

### Auth flow

PIN-based, invite-only. New accounts arrive via a manager-issued invite link. Login returns an opaque session token stored in IndexedDB; the `requireAuth` middleware looks up the token in `sessions` and attaches the full account row. After 5 failed PIN attempts the account locks for 5 minutes. The app also supports an offline quick-unlock (local scrypt hash) within a 1-hour grace window.

### Python sidecar (`server/python/`)

Two scripts invoked via `child_process`:
- `scan_receipt.py` — deskews the image and shells out to the `claude` CLI for OCR
- `generate_report.py` — assembles the expense xlsx from a template and converts to PDF via `soffice --headless`

Both are optional. Without `PYTHON_BIN` the receipt auto-read and full report generation features degrade.

### TypeScript setup

Two configs: `tsconfig.json` (client, bundled by Vite, `"module": "ESNext"`) and `tsconfig.server.json` (server, run by `tsx`, `"module": "NodeNext"`). Run `npm run typecheck` to check both.

### Tests

Vitest. `src/test/setup.ts` installs `fake-indexeddb/auto` so Dexie tests run in Node without a browser. Test files are co-located with the source files they test (`.test.ts` suffix).

## Production (Railway since 2026-10-29)

- **URL:** https://mqexpense.ta-infra.uk → Railway project `mq-expense`, Singapore. Deploy: `railway up -d -m "<subject>"`. Logs: `railway logs`. Build is the repo `Dockerfile` (Node 22, Python venv, LibreOffice, `claude` CLI).
- **Data:** volume `/data`, live DB `/data/live/mqx-data.sqlite` (`MQX_DB_PATH`). Nightly copy kept 7 days (`server/lib/backup.ts`); homepc pulls it to `~/backups/mq-expense` (30 kept) via user timer `mq-expense-backup.timer`.
- **Secrets:** Railway variables. Master key backup still on homepc at `~/.local/share/mq-expense/MASTER_KEY_BACKUP.txt`. **Losing it = all synced data unreadable** (independent of PINs, so PIN reset still works).
- **homepc:** reach with `ssh tuana@homepc` (user `tuana`; plain `ssh homepc` fails). The old `mq-expense.service` is disabled and its DB kept as a frozen fallback.
- **Code remote:** private GitHub `anhtrinh919/mq-expense`. Push with `git -c credential.helper='!gh auth git-credential' push` (plain https push has no login).

## Gotchas

- **Accounts are invite-only; managers are operator-seeded only.** First manager via `MQX_MANAGER_*` on an empty DB (the seed PIN is NOT the current PIN). More accounts: `env -u RAILWAY_API_TOKEN railway ssh -- 'cd /app && node_modules/.bin/tsx server/scripts/add-account.ts <email> <name> <pin> [manager|peer]'`. Two managers in prod: `tuananhtrinh919@gmail.com` and `hanhbh.213@gmail.com`.
- **Forgotten PIN:** same `railway ssh` form with `server/scripts/reset-pin.ts <email> <newPin>`. No email, no in-app reset (by design).
- **Python deps:** numpy is capped at **2.2.6** by opencv-python-headless 4.12 (2.4.x is unsatisfiable). The Dockerfile builds the venv at `server/python/.venv`; `PYTHON_BIN` points at it.
- **Receipt auto-read shells out to the `claude` CLI.** Its login is the `CLAUDE_CODE_OAUTH_TOKEN` variable (from `claude setup-token`, valid a year). The container runs as root, so `IS_SANDBOX=1` is needed for `bypassPermissions`. When the login dies, users see "Auto-read is offline" and logs show `[receipt] claude CLI error`.
- **Full report generation needs LibreOffice (`soffice`)** — installed by the Dockerfile, not pip. Without it the report fails with "report assembly failed". The "Export Excel" button (pure openpyxl) does NOT need it.
- **Restoring a DB:** never overwrite the live SQLite file (old `-wal` files replay onto it). Upload into a fresh folder and switch `MQX_DB_PATH`. See `docs/deployment.md`.
- **Master key never goes to the chat transcript** (the auto-mode classifier blocks it, correctly). Pipe it with `--stdin`; don't echo it.

Full deploy/update/validation runbook: `docs/deployment.md`.

This project runs on autoloop. Use `autoloop:round` to continue, never autobuild.
