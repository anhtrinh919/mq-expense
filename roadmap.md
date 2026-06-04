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

## Post-Phase-1 dogfood backlog (deferred from the 2026-06-04 dogfood)

Captured for the next /ba + /spec cycle. Grouped by theme with rough size.

### A. First-run onboarding + PIN + base currency  (large — own phase)
- First-run wizard: walk a brand-new user through profile/invoice/bank/country-code setup instead of dropping them on a dense Setup page.
- PIN lock for the app — image of privacy, NOT real security (data is already local; the PIN is reassurance, not encryption). Includes "Change PIN" in Settings.
- **Base currency choice:** user picks their home country at first run → sets the app's reimbursement currency. Today everything is hardcoded to VND (conversion, the "Converted to VND" label, the invoice line, the report). Making the base currency configurable (e.g. a Thailand rep gets everything in THB, same conversion method) touches currency math, all "VND" labels, the invoice template, and the report generator. **OPEN QUESTION for /ba:** confirm base currency = the single reimbursement currency per user (not per-receipt).
- 3-step quick guide after setup + a clear CTA, stating that files are saved locally on this device.

### B. Settings consolidation + relocate restore  (medium — pairs with A)
- Add a Settings area (Change PIN + other basics).
- Remove the standalone Import box from the everyday Backup page. **FLAG:** Import IS the restore mechanism — it's how a backup file is loaded onto a new/wiped device, a LOCKED privacy requirement. Do not delete restore; relocate it into the first-run flow ("Restore from a backup file" as an onboarding choice).

### C. Capture flow v2  (medium-large)
- Pre-read all uploaded receipts in the background while the user reviews the first one (parallelize the AI read to save waiting time).
- A final review/summary step after going through all uploads, before they're committed.
- Auto-save in-progress input on Setup and Capture so a mis-click or navigation doesn't lose work. (Setup draft is the easy half; persisting the Capture review queue is harder because it holds in-memory files.)

### D. Receipt scan quality — auto-straighten angled receipts  (medium — FEASIBLE, free)
- Today's scan only does EXIF rotation + an axis-aligned crop; it cannot straighten a receipt photographed at an angle (it stays skewed/trapezoidal).
- **Verdict: fixable for free.** Standard document-scanner approach with OpenCV (free): detect the receipt's four corners, apply a perspective transform to flatten it, then deskew. Falls back to today's behaviour when no clean rectangle is found (so never worse than now). Cost: one new image-processing dependency on homepc-1 + tuning against real angled photos. Limits: struggles when the receipt blends into the background or is crumpled/curled (long thermal receipts).

### E. Zip the report download  (small — isolated)
- Report generation downloads two separate files (PDF + Excel), which makes Chrome show its "download multiple files" permission prompt. (Confirmed it is NOT exporting twice — two distinct files.) Bundling them into one .zip removes the prompt.

## Future (not committed)

- Built-in global country code list as a starting point for new users
- Optional report-sharing to a designated manager (read-only)
- Team-level analytics (aggregate spend by country/period — no individual visibility)
