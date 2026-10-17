# MQ Expense — bugs

15 words a sentence. Living doc. Holds open bugs and small changes. A round removes what it takes.

- Docs name the host "homepc-1", but that Tailscale node is offline; the live host is "homepc" (100.92.37.38) — found, 2026-10-17 — fold into: Codebase review
- `/etc/mq-expense/mq-expense.env` line 7 has an unquoted value with a space; shell `source` breaks — found, 2026-10-17 — fold into: Codebase review
