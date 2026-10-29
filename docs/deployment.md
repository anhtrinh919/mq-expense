# Deployment — MQ Expense

Source of truth for running MQ Expense in production. Read this before any deploy or update.

## Target (Railway since 2026-10-29)

- **Public URL:** `https://mqexpense.ta-infra.uk` (Cloudflare CNAME, proxied → `4na84wwj.up.railway.app`). Railway test URL: `https://mq-expense-production.up.railway.app`.
- **Railway:** project `mq-expense`, service `mq-expense`, environment `production`, region Singapore (`asia-southeast1-eqsg3a`). Hobby plan, account tuananhtrinh919@gmail.com.
- **Build:** the repo's `Dockerfile` — Node 22, Python venv (`server/python/requirements.txt`), LibreOffice (`soffice`), poppler, fonts, and the `claude` CLI. One process serves `dist/` + the API on Railway's `PORT`.
- **Volume:** `mq-expense-volume` mounted at `/data`. Live DB at `/data/live/mqx-data.sqlite` (`MQX_DB_PATH`). `/data/hold/` holds a throwaway DB from the first test boot.
- **Code remote:** private GitHub `anhtrinh919/mq-expense`. Railway deploys from the local folder (`railway up`), not from GitHub.

Until 2026-10-29 it ran on homepc (systemd + Cloudflare tunnel). That service is stopped and disabled; its old DB stays at `~/.local/share/mq-expense/` on homepc as a frozen fallback. The tunnel's `mqexpense` ingress rule is unused now.

## Variables (Railway, never in git)

`MQX_MASTER_KEY`, `MQX_MANAGER_EMAIL`, `MQX_MANAGER_NAME`, `MQX_MANAGER_PIN`, `CLAUDE_CODE_OAUTH_TOKEN`, `MQX_DB_PATH`. `NODE_ENV`, `PYTHON_BIN` and `IS_SANDBOX` are set in the Dockerfile. Read with `railway variable list`.

- **Master key:** **if lost, every user's synced data is permanently unreadable.** Off-Railway copy: `~/.local/share/mq-expense/MASTER_KEY_BACKUP.txt` on homepc (and `/etc/mq-expense/mq-expense.env`). It is independent of PINs.
- **Manager seed:** only used on an empty DB. The real manager PIN has been changed in-app, so `MQX_MANAGER_PIN` is not the current PIN.
- **`CLAUDE_CODE_OAUTH_TOKEN`:** logs in the receipt reader. A dead login shows users "Auto-read is offline" and logs `[receipt] claude CLI error`. Renew yearly: `claude setup-token`, then `railway variable set CLAUDE_CODE_OAUTH_TOKEN --stdin`.
- **`IS_SANDBOX=1`:** the container runs as root; the `claude` CLI refuses `bypassPermissions` as root without it.

## Update workflow

```bash
npm run typecheck && npm test
git push origin main
railway up -d -m "<commit subject>"
railway service status            # wait for SUCCESS
railway logs --lines 20           # "API + app listening on …"
curl -sf https://mqexpense.ta-infra.uk/api/health
# expected: {"status":"ok","reader":"claude","store":"ok"}
```

Each deploy has a few seconds of downtime (volume). The app is local-first, so phones keep entries and sync later.

## Backups

- The server writes `VACUUM INTO /data/live/backups/mqx-YYYY-MM-DD.sqlite` once per Vietnam day (`server/lib/backup.ts`, production only) and keeps the newest 7.
- homepc pulls them daily at 04:30 Vietnam time: user timer `mq-expense-backup.timer` runs `~/apps/mq-expense-backup/pull-backup.sh` (source: `scripts/pull-backup.sh`, units in `deploy/`). Copies land in `~/backups/mq-expense/`, newest 30 kept.
- Railway volume backups (dashboard → volume → Backups) are optional on top.

## Operator tasks

```bash
# Forgotten PIN / add an account — run inside the container (env already set)
env -u RAILWAY_API_TOKEN railway ssh -- 'cd /app && node_modules/.bin/tsx server/scripts/reset-pin.ts <email> <newPin>'
env -u RAILWAY_API_TOKEN railway ssh -- 'cd /app && node_modules/.bin/tsx server/scripts/add-account.ts <email> <name> <pin> [manager|peer]'
```

- **Restore a backup:** never overwrite the live file (old `-wal` files would replay onto it). Upload the copy into a fresh folder (`railway volume files --volume mq-expense-volume upload <file> restore-<date>/mqx-data.sqlite`), then `railway variable set MQX_DB_PATH=/data/restore-<date>/mqx-data.sqlite`.
- **Logs:** `railway logs --lines 200`. **Rollback code:** check out the old commit, `railway up -d`. A rollback never restores data.

## Validation

- [x] Health, login screen, receipt auto-read and full PDF report work on Railway (2026-10-29).
- [x] All 467 live records decrypt with the Railway master key (0 failures).
- [x] Manager logs in on a phone with their real PIN and sees their data.
- [x] First pull landed in `~/backups/mq-expense/` on homepc (intact, 551 records).
