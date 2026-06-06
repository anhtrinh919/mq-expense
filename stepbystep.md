# Setting up Hanh's laptop for MQ Expense development

Goal: Hanh (Mac laptop, Claude Code already installed) can edit this app with her own Claude Code, run it locally, push changes to GitHub, and deploy to production herself.

Two halves:

- **Part 1 — Anh does this first** (grants access; nothing works without it)
- **Part 2 — On Hanh's laptop** (her Claude Code can run these steps; tell it: *"read stepbystep.md and do Part 2"*)

---

## Part 1 — Anh: grant access (one time, ~10 minutes)

### 1.1 GitHub — repo access

The repo is **private**: `github.com/anhtrinh919/mq-expense`.

1. Hanh needs a GitHub account (create one at github.com if she doesn't have one — any email works).
2. Anh: repo → **Settings → Collaborators → Add people** → her GitHub username → role **Write**.
3. She accepts the invite from the email GitHub sends her.

### 1.2 Tailscale — join the tailnet

Production runs on **homepc-1**, reachable only over Tailscale.

1. Anh: [login.tailscale.com](https://login.tailscale.com) → **Users → Invite external users** → invite `hanhbh.213@gmail.com`.
2. She accepts and will later sign in to the Tailscale app on her Mac with that Google account (Part 2).

### 1.3 Tailscale — allow her to SSH into homepc-1 as `tuana`

By default Tailscale SSH only lets people into **their own** devices. homepc-1 belongs to Anh, so add a rule.

Anh: admin console → **Access Controls**, find the `"ssh"` section and add one rule (keep the existing ones):

```jsonc
{
  "action": "accept",
  "src":    ["hanhbh.213@gmail.com"],
  "dst":    ["<Anh's tailnet login, e.g. tuananhtrinh919@gmail.com>"],
  "users":  ["tuana"]
}
```

`dst` = "devices owned by Anh"; `users: ["tuana"]` = she may log in only as the `tuana` Unix user (which is the right one — the app, repo, and service all live under `tuana`). The console validates the syntax on save.

### 1.4 Verify Part 1 is done

- [ ] She shows as a collaborator on the repo
- [ ] She shows under Users in the Tailscale admin console
- [ ] The SSH rule is saved in Access Controls

---

## Part 2 — Hanh's laptop (Claude Code can run all of this)

### 2.1 Base tools

```bash
# Xcode Command Line Tools (gives you git + compilers). Skip if already installed.
xcode-select --install

# Homebrew (skip if `brew --version` works)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js + GitHub CLI
brew install node gh

# Tailscale (GUI app + CLI)
brew install --cask tailscale
```

Then open the **Tailscale** app from Applications and sign in with **hanhbh.213@gmail.com** (the invited Google account). Confirm it says Connected.

### 2.2 GitHub auth + clone the repo

```bash
gh auth login          # choose: GitHub.com → HTTPS → login with a web browser
mkdir -p ~/dev
gh repo clone anhtrinh919/mq-expense ~/dev/mq-expense
cd ~/dev/mq-expense
git config user.name  "Hanh"
git config user.email "hanhbh.213@gmail.com"
```

### 2.3 Install dependencies and run the app locally

```bash
cd ~/dev/mq-expense
npm ci
```

Run the dev server (the env vars seed a local manager account so she can log in — local data is completely separate from production):

```bash
MQX_MANAGER_EMAIL=hanhbh.213@gmail.com MQX_MANAGER_NAME=Hanh MQX_MANAGER_PIN=210390 npm run dev
```

Open **http://localhost:5173** and log in with that email + PIN. This is her private local copy: its database is a file in the repo folder (ignored by git), so she can experiment freely.

> The manager seed env vars are only needed the first time (the account persists in the local DB), but leaving them on every run is harmless.

### 2.4 Optional — full feature parity locally

Two features shell out to extra tools. Without them the app still runs; these specific features degrade:

```bash
# Receipt deskew + report assembly (Python sidecar)
python3 -m venv server/python/.venv
server/python/.venv/bin/pip install -r server/python/requirements.txt
# then run dev with: PYTHON_BIN=server/python/.venv/bin/python (add it before npm run dev)

# Full report xlsx→PDF step
brew install --cask libreoffice
```

Receipt auto-read uses the `claude` CLI, which she already has via Claude Code — nothing to install.

### 2.5 SSH to production (homepc-1)

With Tailscale connected, this should just work — no SSH keys needed (Tailscale authenticates the connection):

```bash
ssh tuana@homepc-1
```

Note the username: it's always **`tuana`**, never her Mac username. Plain `ssh homepc-1` fails.

If the first attempt opens a browser page asking to approve the session, approve it and retry.

### 2.6 Verify Part 2 is done

- [ ] `git -C ~/dev/mq-expense pull` works (GitHub access)
- [ ] http://localhost:5173 loads and she can log in (local dev works)
- [ ] `ssh tuana@homepc-1 'hostname'` prints `homepc-1` (production access)

---

## Daily workflow (for Hanh's Claude Code)

1. **Start from fresh `main`:** `git pull` before editing.
2. **Edit + test locally:** `npm run dev`, check the change at http://localhost:5173. `npm run typecheck` and `npm test` should pass before pushing.
3. **Commit + push to `main`:** small, working changes. (`main` is the deployable branch; if a change is risky, push a branch and ask Anh to review.)
4. **Deploy to production:**

```bash
ssh tuana@homepc-1 'cd ~/dev/mq-expense && git pull && npm ci && npm run build && sudo systemctl restart mq-expense'
```

5. **Verify:** open https://mqexpense.ta-infra.uk and check the change. Logs if something looks wrong:

```bash
ssh tuana@homepc-1 'journalctl -u mq-expense -n 50 --no-pager'
```

Small bugs / ideas that don't need fixing right now → append to `polish.md` in the repo.

---

## Production safety rules (important — read before any work on homepc-1)

- **Never touch `/etc/mq-expense/mq-expense.env`** — it holds the encryption master key. If that key is lost, **everyone's synced data is permanently unrecoverable**. Never print, copy, or echo `MQX_MASTER_KEY` anywhere.
- **Never delete or move** `~/.local/share/mq-expense/` on homepc-1 — that's the production database and the key backup.
- Deploys are safe by design: the database and env file live outside the repo, so `git pull && npm run build && restart` never touches user data.
- Accounts are invite-only. New account / PIN reset only via server scripts on homepc-1 (see `CLAUDE.md` → Gotchas).
- The project `CLAUDE.md` in the repo root has all production facts and gotchas — her Claude Code reads it automatically when working in the repo folder.

Full deploy/recovery runbook: `docs/deployment.md`.
