# MQ Expense — log

15 words a sentence. Living doc. Next holds open features. Bugs live in `bug.md`. Rounds holds every round, newest first.

## Next

- Report correctness: exact totals, receipt order, report robustness — found, 2026-10-17
- Sync reliability: no lost, revived, or leaked data across devices and accounts — found, 2026-10-17
- Add an expense with no receipt (MQ allows no receipt under $80) — user, 2026-06-05

## Rounds

### Round 3 — Receipt auto-read works again, and says when it is offline

Status: building
Branch: round-3-receipt-reader-offline, from main
Try: four Viettel PDFs and one photo auto-read on the live site; a logged-out reader shows an "offline" banner
Bugs: user report "the app can't read PDFs" (cause: expired `claude` login on homepc)
Risk: none

### Round 2 — Own details on every invoice, one copy per country, no repeat invoice numbers

Status: kept
Branch: round-2-report-and-country-fixes, from main
Try: a peer invoice shows no Hanh data; New report suggests the next number and blocks a used one; each country shows once
Bugs: invoice template leaks Hanh's details; country codes doubled per device; New report repeats the invoice number; non-VND screens show "null IDR" and ₫
Risk: user data

Result: invoices carry only the sender's details and currency. Merged the June GitHub work this clone lacked. Country repeats removed after sync (18 → 9). Used invoice numbers are blocked. Screens show the user's own currency. 44 app tests and 5 invoice tests pass.
Learned: fetch origin before a round; this clone was 12 commits behind. Fixed seed ids need the oldest timestamp, or they overwrite real edits. Seed only after the first pull. A template file can hide real personal data.

### Round 1 — Codebase review: find and rank real bugs, security gaps, and dead code

Status: kept
Branch: round-1-codebase-review, from main
Try: read the ranked findings list; check the two host bugs are fixed on the live box
Bugs: docs name the offline "homepc-1" host; env file line 7 breaks shell `source`
Risk: none

Result: 39 findings logged in `bug.md`. Security items parked by the user. Host renamed to "homepc" in all docs. Env file quoted. Two stale tests fixed; 36/36 pass.
Learned: users are trusted and on their own devices, so rank by what users see, not by attack risk. Live sync row counts can prove client bugs without decrypting data.

Earlier work ran on autobuild; see `archive/autobuild/`, `CHANGELOG.md`, and `polish.md`.
