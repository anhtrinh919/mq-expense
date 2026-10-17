# MQ Expense — brief

15 words a sentence. Living doc: it states the product as it is today. Rewrite in place.

## What it is

MQ Expense is a private web app for Macquarie SEA sales reps. A rep photographs a receipt. The app reads the date and amount, and converts it to their home currency. At month end, it builds the invoice, expense sheet, and receipt PDF that Finance accepts. It also builds a matching Excel file. Data lives on the rep's device first. It syncs, encrypted, across that rep's own devices. Access is invite-only. Two managers invite peers. Live at https://mqexpense.ta-infra.uk since 2026-06-05.

## What good looks like

- "I photographed a messy Vietnamese receipt, and the date and amount were right."
- "I clicked Generate Report and emailed one PDF and one Excel to Finance."
- "I lost my laptop, logged in on a new one, and everything was there."
- "My peer joined from a link and can't see any of my expenses."

## Hard rules

Things that must be exact, or must never happen. Each one is code, with a test.

- No user ever sees another user's expenses, receipts, or reports — not even a manager. — Privacy is the core promise to the team.
- Invoice numbers follow `{prefix}{YY}-{n}`, reset each year, never repeat. — Finance matches invoices by number.
- Each expense keeps the exact exchange rate used at capture. Later changes never rewrite it. — Reports must be auditable.
- The report output matches the existing Macquarie submission format exactly. — Finance rejects anything else.
- Synced data is encrypted at rest under the master key. — Protects against database theft.
- The master key never leaves the server box, and never appears in chat. — Losing or leaking it breaks every user's data.
- A PIN reset never loses a user's data. — Users must never be locked out for good.
- Receipt photos pass through the server's memory only, never its disk, while being read. — Privacy posture.
- Accounts are invite-only. Managers are added only by the operator. — No public sign-up.

## Agent abilities

### Read a receipt

Goal: read the transaction date and total amount from any receipt photo, in any language or currency.
Tools: the receipt image file. One call to the `claude` CLI on Sonnet.
Instructions: `server/lib/claude.ts` (the `PROMPT` constant)

Scenarios:

- A crumpled Vietnamese restaurant bill in VND → correct date and total, currency VND.
- A Thai taxi receipt in Thai script → correct date and total in THB.
- A blurry or non-receipt photo → no guess; the user enters date and amount by hand.

## Not doing

- No link to Macquarie's finance systems. Users email the files themselves.
- No email sent by the app, for reports or PIN resets.
- No approval workflow or manager review.
- No native mobile app. The web app installs as a PWA instead.
- No public self-registration.
- No hardening against bad actors inside the team. Users are trusted, invite-only, on their own devices. — user, 2026-10-17

## Settled choices

- React 18 + Vite front end; Express server run by tsx — simple single-port deploy, before round 1
- Python (Pillow, OpenCV, openpyxl) for scans and reports — reuses the proven pipeline, before round 1
- Dexie/IndexedDB on the device; better-sqlite3 on the server — local-first with sync, before round 1
- Last-write-wins sync with tombstones, plus a live nudge channel — simple and good enough for one user per account, before round 1
- Server-managed AES-256-GCM encryption — allows PIN reset; not zero-knowledge by choice, before round 1
- xe.com exchange rate plus a per-user markup, cached one hour — matches the old pipeline, before round 1
- Report download is one zip, built in the browser — avoids Chrome's multi-file prompt, before round 1
- Hosted on homepc (WSL) behind a Cloudflare tunnel, as a systemd service — before round 1
- Old autobuild phase specs live in `archive/autobuild/` — history only, round 1

## How to run

Local: `npm run dev`, then open the Vite address it prints. Tests: `npm test`. Typecheck: `npm run typecheck`.
Production: on homepc, `cd ~/dev/mq-expense && git pull && npm ci && npm run build && sudo systemctl restart mq-expense`. See `docs/deployment.md`.
