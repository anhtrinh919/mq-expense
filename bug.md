# MQ Expense — bugs

15 words a sentence. Living doc. Holds open bugs and small changes. A round removes what it takes.

Found by the round 1 review, 2026-10-17. Severity in brackets. Paths are as of commit on `round-1-codebase-review`.

## Parked — security

User, 2026-10-17: trusted invite-only users on their own devices; hardening risks breaking the app. Not planned.

- [critical, verified] Receipt reader runs `claude -p` with `--permission-mode bypassPermissions` and the full server env, master key included (`server/lib/claude.ts:36`, `server/lib/run.ts:12`). Text printed on a receipt could steer it to run shell commands. Fix: allow only the Read tool, pass a clean env, never use the upload's file name in the prompt (`processReceipt.ts:29`) — found, 2026-10-17 — parked
- [high] PIN lockout is per account and resets every 5 minutes: about 1,440 guesses a day; no per-IP limit; `trust proxy` unset (`server/lib/auth.ts:113-126`) — found, 2026-10-17 — parked
- [high] 200 MB JSON body limit applies to every route, including public login; login uses blocking `scryptSync` (`server/index.ts:20`) — found, 2026-10-17 — parked
- [medium] PIN change or reset does not end the account's other sessions (`server/routes/auth.ts:100-112`, `server/scripts/reset-pin.ts:26`) — found, 2026-10-17 — parked
- [medium] Register does not check the email matches the invite; parallel sign-ups crash with a 500 (`server/routes/auth.ts:36-46`) — found, 2026-10-17 — parked
- [medium] Session token travels in the live-update URL, and the stream outlives logout (`server/routes/events.ts:30`, `src/App.tsx:440`) — found, 2026-10-17 — parked
- [medium] Invite links may be built as `http://` because `trust proxy` is unset (`server/routes/team.ts:23`) — found, 2026-10-17 — parked
- [low] Login reveals which emails exist, via "disabled"/"locked" replies before the PIN check (`server/lib/auth.ts:110-112`) — found, 2026-10-17 — parked
- [low] Python error text with server paths goes back to the browser (`server/routes/generateReport.ts:73,121`) — found, 2026-10-17 — parked
- [low] Receipt photos sit in disk-backed `/tmp` during reading; a crash leaves them behind. Use tmpfs (`PrivateTmp`) or sweep on start (`processReceipt.ts:28`, `generateReport.ts:40`) — found, 2026-10-17 — parked

## Report correctness

- [high] LibreOffice runs with a shared profile; two reports at once can fail. A hung `soffice` survives Node's kill and blocks later reports (`generate_report.py:181`, `server/lib/run.ts:15`) — found, 2026-10-17 — fold into: Report correctness
- [medium] Receipt pages can come out in a different order from the numbered sheet rows (`generate_report.py:54-61`, `src/screens/Reports.tsx:88-91`) — found, 2026-10-17 — fold into: Report correctness
- [medium] A receipt that fails to parse (e.g. HEIC) is silently left out of the report (`generate_report.py:197-208`) — found, 2026-10-17 — fold into: Report correctness
- [medium] Amounts are rounded to whole numbers for every currency; wrong for USD/AUD bases (`generate_report.py:58`) — found, 2026-10-17 — fold into: Report correctness
- [medium] An expense with a null date crashes the sort (`generate_report.py:54`) — found, 2026-10-17 — fold into: Report correctness
- [medium] Dates use UTC, not Vietnam time: wrong invoice year 00:00–07:00 on 1 Jan, and today can't be picked before 07:00 (`src/lib/format.ts:209`) — found, 2026-10-17 — fold into: Report correctness
- [medium] "Recalculate from rate" overwrites the saved capture-time rate with no confirm (`src/screens/Expenses.tsx:196-205`) — found, 2026-10-17 — fold into: Report correctness

## Sync and shared devices

- [critical, verified] Signing up on a device another account used keeps the old data, and offers to bring it into the new account (`src/lib/authClient.ts:83-100`, `src/App.tsx:458`) — found, 2026-10-17 — fold into: Sync reliability
- [high] Account wipe misses capture drafts and the profile draft, so the next user sees them (`src/lib/authClient.ts:47-62`) — found, 2026-10-17 — fold into: Sync reliability
- [high] Sync bookmark uses device clocks; an offline or slow-clock edit can be skipped forever (`server/routes/sync.ts:39-51`, `src/lib/sync.ts:550,577`) — found, 2026-10-17 — fold into: Sync reliability
- [high] Restored backup expenses and reports never upload, because their old timestamps sit below the push mark (`src/lib/backup.ts:740-747`) — found, 2026-10-17 — fold into: Sync reliability
- [high] "Clear my data" offline wipes the device only; the next sync brings everything back (`src/screens/Settings.tsx:471-474`) — found, 2026-10-17 — fold into: Sync reliability
- [medium] An older delete from another device removes a newer local edit (`src/lib/sync.ts:559-561`) — found, 2026-10-17 — fold into: Sync reliability
- [medium] A failed "Save all" in Capture can save the same expenses twice on retry (`src/screens/Capture.tsx:239-243`) — found, 2026-10-17 — fold into: Sync reliability
- [medium] First sync on a new device pulls the whole history in one response, images included (`server/routes/sync.ts:29-53`) — found, 2026-10-17 — fold into: Sync reliability
- [low] A huge `updatedAt` makes a record impossible to overwrite or delete (`server/routes/sync.ts:61-87`) — found, 2026-10-17 — fold into: Sync reliability

## Bug round (no feature fits)

- [medium] Service worker can cache an error page as the app shell during a deploy (`public/sw.js:621-643`) — found, 2026-10-17 — fold into: bug round
- [medium] Several actions have no error handling; a DB error leaves a blank screen or stuck button (`src/App.tsx:414`, `Settings.tsx:343`, `Reports.tsx:261,268`, `Login.tsx:53`) — found, 2026-10-17 — fold into: bug round
- [low] Amount field reads "1,250.00" as 1, with no warning (`src/screens/Capture.tsx:162`) — found, 2026-10-17 — fold into: bug round
- [low] Conversion note prints small rates as "× 0" (`src/lib/currency.ts:393`) — found, 2026-10-17 — fold into: bug round
- [low] Accessibility: modal has no Escape or focus trap; icon buttons named only by tooltip; login labels not linked (`components/ui.tsx:49-64`, `Reports.tsx:250`, `Login.tsx:95`) — found, 2026-10-17 — fold into: bug round
- [low] Expired sessions are never cleaned out of the database (`server/lib/auth.ts:48-57`) — found, 2026-10-17 — fold into: bug round
- [low] Dead code: `getHealth`, `plainVnd`, `getImage`, `getReport`, `revokeInvitesFor`, the "tesseract" reader option, leftover `void slots` — found, 2026-10-17 — fold into: bug round
- [low] Runbook: relative `PYTHON_BIN`; `systemctl restart cloudflared` should be a SIGHUP; systemd unit file is not in the repo (`docs/deployment.md:45,49`) — found, 2026-10-17 — fold into: bug round
- [low] Hanh's SSH rule targets a tag on the node "homepc-1". The live box is now node "homepc", so her access may have stopped. Check the tag in the Tailscale admin page — found, 2026-10-17 — fold into: bug round
- [low] `CLAUDE.md` still names "homepc-1" and `tailscale ssh tuana@homepc-1`; editing it needs the user's OK — found, 2026-10-17 — fold into: bug round
