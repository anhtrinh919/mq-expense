# MQ Expense — log

15 words a sentence. Living doc. Next holds open features. Bugs live in `bug.md`. Rounds holds every round, newest first.

## Next

- Report correctness: invoice shows only the submitter's own details; exact totals; safe numbering — found, 2026-10-17
- Country code cleanup: one copy of each country per account, on every device — found, 2026-10-17
- Sync reliability: no lost, revived, or leaked data across devices and accounts — found, 2026-10-17
- Add an expense with no receipt (MQ allows no receipt under $80) — user, 2026-06-05

## Rounds

### Round 1 — Codebase review: find and rank real bugs, security gaps, and dead code

Status: showing
Branch: round-1-codebase-review, from main
Try: read the ranked findings list; check the two host bugs are fixed on the live box
Bugs: docs name the offline "homepc-1" host; env file line 7 breaks shell `source`
Risk: none

Earlier work ran on autobuild; see `archive/autobuild/`, `CHANGELOG.md`, and `polish.md`.
