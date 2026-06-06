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

## Production (live since 2026-06-05)

- **URL:** https://mqexpense.ta-infra.uk
- **Host:** homepc-1 — WSL2 Ubuntu on the always-on Windows PC. Reach it with `tailscale ssh tuana@homepc-1`. The Unix user is **`tuana`**, not the Mac's `anhtrinh`; plain `ssh homepc-1` fails with "failed to look up local user".
- **Service:** systemd `mq-expense.service` (User=tuana, port 8787, single-origin: serves `dist/` + API on one port). Logs: `journalctl -u mq-expense -f`.
- **Public access:** a 5th ingress hostname on the shared `cloudflared.service` tunnel (UUID `644dacd1…`). Config: `~/.cloudflared/config.yml`. The Cloudflare account is already logged in there (`cert.pem`) — no re-login needed to add hostnames. To add a site: append an ingress rule (before the `http_status:404` catch-all), `cloudflared tunnel route dns <uuid> <host>`, then SIGHUP cloudflared (`sudo pkill -HUP -f 'cloudflared tunnel'` — the unit has no ExecReload).
- **Secrets/state, all OUTSIDE git:** master key + manager seed in `/etc/mq-expense/mq-expense.env` (root, 600); operator key backup at `~/.local/share/mq-expense/MASTER_KEY_BACKUP.txt` (tuana, 600); DB at `~/.local/share/mq-expense/mqx-data.sqlite`. **Losing the master key = every user's synced data is permanently unrecoverable** (it's independent of PINs, so PIN reset is still possible).
- **Code remote:** private GitHub `anhtrinh919/mq-expense`; `main` deploys. Update: `cd ~/dev/mq-expense && git pull && npm ci && npm run build && sudo systemctl restart mq-expense`. The DB + env file live outside the repo, so pull/rebuild never disturbs them.

## Gotchas

- **Accounts are invite-only; managers are operator-seeded only.** First manager via `MQX_MANAGER_*` env on first boot; additional accounts via `tsx server/scripts/add-account.ts <email> <name> <pin> [manager|peer]` (needs `MQX_MASTER_KEY` + `MQX_DB_PATH` in env). Two managers seeded in prod: `tuananhtrinh919@gmail.com` and `hanhbh.213@gmail.com`.
- **Forgotten PIN:** `tsx server/scripts/reset-pin.ts <email> <newPin>` on homepc-1. No email, no in-app reset (by design).
- **Python deps:** numpy is capped at **2.2.6** by opencv-python-headless 4.12 on linux/cp312 (2.4.x is unsatisfiable). Deps live in a venv at `server/python/.venv`; the service points at it via `PYTHON_BIN`.
- **Receipt auto-read shells out to the `claude` CLI.** The systemd `PATH` must include `/home/tuana/.local/bin` or it silently degrades to manual date/amount entry.
- **Full report generation needs LibreOffice (`soffice`) on the box** — a system package, not a pip dep, so it's easily missed (only the venv is documented). The report's xlsx→PDF step shells out to `soffice --headless`; without it the report fails with "report assembly failed". Install: `sudo apt-get install -y libreoffice-calc`. The Expenses "Export Excel" button (`/api/export-expenses-xlsx`, pure openpyxl) does NOT need it.
- **Reboot survival:** the systemd service is enabled, so it returns when WSL/systemd starts. Full PC-reboot survival depends on WSL auto-starting on Windows boot — the long-lived ollama tunnel on the same box suggests that's already configured; confirm after the next real reboot.
- **Master key never goes to the chat transcript** (the auto-mode classifier blocks it, correctly). Read it on the box for backup; don't echo it.

Full deploy/update/validation runbook: `docs/deployment.md`.
