# Roadmap — MQ Expense

## Phases

1. **Phase 1 — Single-User Expense Flow:** Delivers the complete single-user expense workflow as a web app: Setup (one page — profile, invoice, bank, country codes, currency markup as sections) → Capture (upload receipt, AI reads date + amount, convert to VND, retain both the original colour photo and the B&W scan, save to log) → Manage (view, filter, edit expenses) → Report (generate combined PDF + Excel, auto invoice numbering, mark submitted) → Archive (mark paid/archived) → Backup (export and import all data). No accounts or logins — data is private because it lives only in that browser on that device. The wife uses this in production on homepc-1. **Phase 1 ships only single-user screens** and perfects that flow end-to-end before any multi-user complexity exists; it neither draws nor stubs any account UI. The navigation shell is built forward-compatibly so accounts can slot in during Phase 2.

2. **Phase 2 — Multi-User & Sharing:** Layers invite-only accounts on top of the proven single-user app. **Phase 2 owns all account UI** — the Invite (manager), Join (peer onboarding), and Account (login/logout, sessions) screens are designed and built whole here, not before. The wife invites peers via a link or code; each peer sets up their own fully-private workspace (data still local to their own device); accessible from any device by opening a web link — nothing to install. Strict per-user data isolation — no one can see anyone else's expenses or reports. Turns the single-user app into the shared team tool the peers have asked for.

## Global Out of Scope

- **No server-side data storage:** The server never persists any user data — not receipts, not expense rows, not reports, not profile info. Zero exceptions.
- **No Macquarie Finance system integration:** No API connection to Macquarie's finance or reimbursement systems. The user downloads the output files and emails them manually.
- **No in-app email sending:** The app generates the files; the user sends the email themselves.
- **No approval workflow:** No manager review, no approval chain, no per-report sign-off inside the app.
- **No shared visibility between users:** Even the manager who invites peers cannot see their expenses or reports.
- **No global country code library:** Users manage their own country → account code mappings. A built-in country registry is not in scope.
- **No mobile app (iOS/Android native):** The web app must work well on mobile browsers, but a native app is out of scope.
- **No public self-registration:** Access is invite-only in Phase 2. There is no public sign-up.

## Future (not committed)

- Built-in global country code list as a starting point for new users
- Optional report-sharing to a designated manager (read-only)
- Team-level analytics (aggregate spend by country/period — no individual visibility)
