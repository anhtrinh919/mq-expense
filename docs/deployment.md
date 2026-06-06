# Deployment — MQ Expense (Phase 4 go-live)

Source of truth for running MQ Expense in production. Read this before any deploy or update.

## Target

- **Host:** `homepc-1` (Tailscale `100.92.37.38`) — WSL2 Ubuntu 24.04 on the always-on Windows PC. Reach it with `tailscale ssh tuana@homepc-1`.
- **Public URL:** `https://mqexpense.ta-infra.uk` (Cloudflare Tunnel → `http://localhost:8787` on homepc-1).
- **Runtime:** Node 24, single-origin (`tsx server/index.ts` serves the built SPA from `dist/` and the API on one port).
- **Code remote:** private GitHub repo `anhtrinh919/mq-expense`. `main` is the deployable branch.

## Components

1. **App service** — systemd unit `mq-expense.service` runs `NODE_ENV=production tsx server/index.ts` on port 8787, restart-on-failure, enabled at boot. Env (including the master key + manager seed) comes from a root-only EnvironmentFile, never from git.
2. **Cloudflare ingress** — `mqexpense.ta-infra.uk` added as a 5th ingress hostname on the existing `ollama-local` tunnel (`~/.cloudflared/config.yml`), served by the already-running `cloudflared.service`. No new tunnel or login needed (account cert already present).
3. **Python sidecar** — receipt deskew + report assembly run from a venv at `server/python/.venv` (Pillow, numpy, openpyxl, pypdf, opencv-python-headless, all pinned).
4. **Receipt auto-read** — shells out to the `claude` CLI on homepc-1; degrades to manual entry if unavailable.
5. **LibreOffice (`soffice`)** — system package, NOT a pip dep. The full report's xlsx→PDF step shells out to `soffice --headless`. Without it, report generation fails with "report assembly failed → LibreOffice (soffice) not found". Install once: `sudo apt-get install -y libreoffice-calc`. (The Expenses "Export Excel" path is pure openpyxl and does NOT need it.)

## Persistent state (never in git, never overwritten by a redeploy)

- **Encryption master key** — `MQX_MASTER_KEY` (64 hex chars = 32 bytes), generated once. Stored in `/etc/mq-expense/mq-expense.env` (mode 600) and backed up off-box by the operator. **If this key is lost, every user's synced data is permanently unreadable.** It is independent of PINs (so a forgotten PIN is still resettable).
- **Database** — `MQX_DB_PATH=/home/tuana/.local/share/mq-expense/mqx-data.sqlite`, outside the repo so `git pull` / re-clone never touches it. Holds accounts, invites, sessions, and per-user encrypted sync records.
- **Manager account** — seeded on first boot from `MQX_MANAGER_EMAIL` / `MQX_MANAGER_NAME` / `MQX_MANAGER_PIN`. The manager is never self-registered. Every other account joins by invite only.

## Environment file (`/etc/mq-expense/mq-expense.env`, mode 600)

```
NODE_ENV=production
PORT=8787
MQX_DB_PATH=/home/tuana/.local/share/mq-expense/mqx-data.sqlite
MQX_MASTER_KEY=<64 hex chars, generated once — back this up>
MQX_MANAGER_EMAIL=<manager email>
MQX_MANAGER_NAME=<manager name>
MQX_MANAGER_PIN=<initial PIN, changeable in-app after first login>
PATH=/home/tuana/.local/bin:/usr/local/bin:/usr/bin:/bin
```

`PATH` includes `/home/tuana/.local/bin` so the service can find the `claude` CLI for receipt reading.

## First deploy (one time)

1. `git clone git@github.com:anhtrinh919/mq-expense.git ~/dev/mq-expense` on homepc-1.
2. `npm ci` (compiles better-sqlite3 against Node 24).
3. `python3 -m venv server/python/.venv && server/python/.venv/bin/pip install -r server/python/requirements.txt`. Point the server at it with `PYTHON_BIN=server/python/.venv/bin/python` (add to the env file). Also `sudo apt-get install -y libreoffice-calc` — the report's xlsx→PDF step needs `soffice`.
4. `npm run build` → `dist/`.
5. Create `/etc/mq-expense/mq-expense.env` (above), generate the master key with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
6. Install `mq-expense.service`, `systemctl enable --now mq-expense`.
7. Add the `mqexpense.ta-infra.uk` ingress rule to `~/.cloudflared/config.yml`, run `cloudflared tunnel route dns ollama-local mqexpense.ta-infra.uk`, `systemctl restart cloudflared`.
8. Verify (see Validation).

## Update workflow (every future change)

Run all steps in order. Each step must succeed before the next one.

```bash
# 1. On the dev Mac — finish and push the commit
git push origin main

# 2. SSH to the production host
tailscale ssh tuana@homepc-1

# 3. Pull, install, build, restart (run as tuana, sudo only for the restart)
cd ~/dev/mq-expense
git pull                          # confirm the expected commit SHA lands
npm ci                            # only needed when package-lock changed; safe to always run
npm run build                     # builds the SPA into dist/ (~1-2 s)
sudo systemctl restart mq-expense # service comes back in < 2 s

# 4. Verify the service came up
systemctl is-active mq-expense    # must print "active"
journalctl -u mq-expense -n 5 --no-pager   # last line: "API + app listening on …:8787"
```

Then do a quick smoke test from a separate device (or curl from the Mac):

```bash
curl -sf https://mqexpense.ta-infra.uk/api/health
# expected: {"status":"ok","reader":"claude","store":"ok"}
```

(The DB and env file live outside the repo, so a pull/rebuild never disturbs user data or the key.)

### One-liner (if you trust the build)

```bash
tailscale ssh tuana@homepc-1 "cd ~/dev/mq-expense && git pull && npm ci && npm run build && sudo systemctl restart mq-expense && sleep 2 && systemctl is-active mq-expense"
```

### If the service fails to start

```bash
journalctl -u mq-expense -n 30 --no-pager   # read the error
# Common causes:
#   - syntax error in a new server file  → check the tsx output
#   - missing env var in /etc/mq-expense/mq-expense.env
#   - port 8787 already bound (stale process) → sudo pkill -f "tsx server/index"
sudo systemctl start mq-expense   # try again after fixing
```

## Validation (go-live is done only when all pass)

- [ ] `https://mqexpense.ta-infra.uk` loads the login screen over HTTPS from a device **not** on the tailnet (phone on cellular).
- [ ] Manager can log in with the seeded email + PIN; can generate an invite link.
- [ ] A second person can open the invite link, create an account, and capture an expense; the manager cannot see that expense (isolation holds).
- [ ] Capturing a receipt auto-reads date + amount (claude CLI reachable from the service).
- [ ] `sudo systemctl restart mq-expense` brings it back with all data intact (DB persisted).
- [ ] A full WSL/PC reboot brings both `cloudflared` and `mq-expense` back automatically.
- [ ] The master key is backed up off-box by the operator.

## Recovery notes

- **Forgotten PIN:** operator runs `tsx server/scripts/reset-pin.ts <email> <newPin>` on homepc-1. No email, no in-app reset.
- **Key loss = data loss:** there is no recovery path if `MQX_MASTER_KEY` is lost. Back it up.
- **Logs:** `journalctl -u mq-expense -f` and `journalctl -u cloudflared -f`.
