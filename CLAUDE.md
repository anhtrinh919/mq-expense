# MQ Expense — Project Notes

Local-first expense tool for a Macquarie SEA sales manager + invited peers. React 18 + Vite SPA, Express server run via **tsx** (Node, not bun), Dexie/IndexedDB on the client, better-sqlite3 server store, AES-256-GCM at-rest encryption, invite-only accounts, last-write-wins sync with tombstones + an SSE live-nudge channel.

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
- **Reboot survival:** the systemd service is enabled, so it returns when WSL/systemd starts. Full PC-reboot survival depends on WSL auto-starting on Windows boot — the long-lived ollama tunnel on the same box suggests that's already configured; confirm after the next real reboot.
- **Master key never goes to the chat transcript** (the auto-mode classifier blocks it, correctly). Read it on the box for backup; don't echo it.

Full deploy/update/validation runbook: `docs/deployment.md`.
