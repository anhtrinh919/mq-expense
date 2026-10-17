# MQ Expense — log

15 words a sentence. Living doc. Next holds open features. Bugs live in `bug.md`. Rounds holds every round, newest first.

## Next

- Add an expense with no receipt (MQ allows no receipt under $80) — user, 2026-06-05

## Rounds

### Round 1 — Codebase review: find and rank real bugs, security gaps, and dead code

Status: building
Branch: round-1-codebase-review, from main
Try: read the ranked findings list; check the two host bugs are fixed on the live box
Bugs: docs name the offline "homepc-1" host; env file line 7 breaks shell `source`
Risk: none

Earlier work ran on autobuild; see `archive/autobuild/`, `CHANGELOG.md`, and `polish.md`.
