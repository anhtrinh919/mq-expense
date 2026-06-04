# Roadmap — MQ Expense

## Phases

1. **Phase 1 — Single-User Expense Flow** *(shipped)*: Delivers the complete single-user expense workflow as a web app: Setup (one page — profile, invoice, bank, country codes, currency markup as sections) → Capture (upload receipt, AI reads date + amount, convert to VND, retain both the original colour photo and the B&W scan, save to log) → Manage (view, filter, edit expenses) → Report (generate combined PDF + Excel, auto invoice numbering, mark submitted) → Archive (mark paid/archived) → Backup (export and import all data). No accounts or logins — data is private because it lives only in that browser on that device. **Phase 1 ships only single-user screens** and perfects that flow end-to-end before any multi-user complexity exists; it neither draws nor stubs any account UI. The navigation shell is built forward-compatibly so accounts can slot in during Phase 4. (Runs on localhost today; real production deployment is Phase 3.)

2. **Phase 2 — Onboarding, Polish & Quality:** Makes the single-user app welcoming for a brand-new user and sands down the rough edges found in the first dogfood. Still single-user, still local-only — no server data, ever. Delivers:
   - **First-run onboarding + app PIN + base currency:** a guided first-run wizard instead of dropping the user onto a dense Setup page; an app PIN for the *feel* of privacy (reassurance, not encryption — data is already local-only); each user picks a home country that sets their reimbursement/base currency, so a Thailand rep gets everything in THB the same way the wife gets VND. *Open scoping question for /ba: confirm base currency is one-per-user, not per-receipt.*
   - **Settings area + relocated restore:** a Settings page (Change PIN + basics); the "Import / restore from a backup file" action moves out of the everyday Backup page into the first-run flow — restore is preserved (it's the only way to recover onto a new device), just relocated.
   - **Capture flow v2:** pre-read all uploaded receipts in the background while the user reviews the first one; a final review/summary step before everything is committed; auto-save in-progress input on Setup and Capture so a mis-click or navigation doesn't lose work.
   - **Sharper receipt scans:** auto-straighten receipts photographed at an angle (free OpenCV four-point flatten + deskew, with a graceful fallback to today's crop when no clean rectangle is found).
   - **Expenses table niceties:** sortable columns; the table defaults to the "Unsubmitted" filter on open.
   - **One-file report download:** bundle the PDF + Excel into a single .zip so Chrome no longer shows its "download multiple files" prompt.

3. **Phase 3 — Multi-User & Sharing:** Layers invite-only accounts on top of the proven single-user app. **Phase 3 owns all account UI** — the Invite (manager), Join (peer onboarding), and Account (login/logout, sessions) screens are designed and built whole here, not before. The wife invites peers via a link or code; each peer sets up their own fully-private workspace (data still local to their own device). Strict per-user data isolation — no one can see anyone else's expenses or reports. Turns the single-user app into the shared team tool the peers have asked for. (Built and exercised locally / over a temporary tunnel; the permanent public URL arrives with the Phase 4 deployment.)

4. **Phase 4 — Production Deployment (homepc-1 + Cloudflare) — go-live, last:** Once the full feature set is built and proven, take the whole app live in one move. Delivers: migrate and run the project on **homepc-1** (the SSH hub); track the project on the remote (git remote + a clean deploy/update workflow so changes ship without manual file copying); stand up a **Cloudflare tunnel** so the app is reachable at a real, stable production URL from any device with nothing to install; run it as a 24/7 background service that survives reboots. This is the single go-live: the wife and her invited peers all reach the finished tool at one permanent address.

## Global Out of Scope

- **No server-side data storage:** The server never persists any user data — not receipts, not expense rows, not reports, not profile info. Zero exceptions.
- **No Macquarie Finance system integration:** No API connection to Macquarie's finance or reimbursement systems. The user downloads the output files and emails them manually.
- **No in-app email sending:** The app generates the files; the user sends the email themselves.
- **No approval workflow:** No manager review, no approval chain, no per-report sign-off inside the app.
- **No shared visibility between users:** Even the manager who invites peers cannot see their expenses or reports.
- **No global country code library:** Users manage their own country → account code mappings. A built-in country registry is not in scope.
- **No mobile app (iOS/Android native):** The web app must work well on mobile browsers, but a native app is out of scope.
- **No public self-registration:** Access is invite-only in Phase 3. There is no public sign-up.

## Future (not committed)

- Built-in global country code list as a starting point for new users
- Optional report-sharing to a designated manager (read-only)
- Team-level analytics (aggregate spend by country/period — no individual visibility)
