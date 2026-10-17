# Design Brief — MQ Expense, Phase 1 (Single-User Expense Flow)

**Track:** external — Pencil.dev. This brief gives Pencil deep context. Pencil owns all component-level, layout-hierarchy, spacing, and interaction decisions. This brief constrains *intent and discipline*, not pixels.

---

## Design intent

The one thing a user should feel: **"That took no effort."** Relief. The tedious parts of expense reporting — reading a foreign receipt, doing the currency math, formatting the PDF exactly how Finance wants it — are simply handled. The app should feel like a quiet, competent assistant that gets out of the way: open it, deal with a receipt in seconds, close it; come back at month end, generate, download, done. Nothing clever, nothing loud, no friction, no surprises.

*Every visual decision should be weighed against this. If a screen adds a step, a decision, or a moment of doubt, it's working against the north star.*

## Product context — full vision

**What it is.** MQ Expense is a private, single-purpose web app for capturing, logging, and exporting work-travel expenses. It runs as an always-on service on the user's own home PC ("homepc-1") and is opened in a normal browser tab on a phone or laptop. Phase 1 serves one person; Phase 2 opens it, invite-only, to a small team of peers. It is the kind of tool you keep pinned in a browser and barely think about.

**Who uses it.** A Macquarie University South-East-Asia sales manager (the primary user) and, later, her peer sales reps. They travel across Vietnam, Thailand, Cambodia, Myanmar, and Australia, accumulate receipts in several currencies, and must periodically claim reimbursement from Macquarie Finance by submitting an invoice + itemised expenses + receipt images. They are **not** finance professionals and **not** technical — the app must be obvious.

**What it replaces.** A working-but-manual pipeline the primary user runs today: she renames receipt photos by country, a script scans them to clean black-and-white PDFs, an AI reads the date and amount, currency is converted to Vietnamese đồng (VND), rows are logged into an Excel sheet, and at claim time a combined PDF (invoice → expense detail → receipts) plus an Excel file is generated and emailed to Finance. The new app preserves that exact output and math but moves the interaction from files-and-commands into a clean web UI — and crucially keeps every person's data private on their own device.

**What it explicitly isn't.** It is **not** a team expense-management product (no approval chains, no manager oversight dashboards, no policy engine — Expensify/SAP Concur are the wrong reference). It is **not** an accounting or bookkeeping suite. It is **not** a marketing-style consumer fintech app with dashboards, charts, streaks, or insights. There is no analytics surface. The whole product is: configure once, capture receipts, generate a report, archive when paid, back up. That's it.

**The end-state form factor.** A shallow, single-window app with a small, stable set of areas reachable in one tap: Setup, Capture, Expenses, Reports, Backup. Capture is the primary action. In Phase 2 an account/identity layer is added (login/logout and an invite flow for the manager) but the core surfaces don't change shape — they just become per-user. The app should feel equally at home full-width on a laptop and one-handed on a phone in an airport.

**The user's day with it.** Over a trip she snaps receipts as she goes — a taxi in Bangkok, a dinner in Phnom Penh — each takes a few seconds: add the photo, glance at what the AI read, pick the country, type a couple of words, save. At month end she opens Reports, picks the date range, sees the list and the total, hits Generate, and two files land in her downloads to email Finance. When Macquarie pays, she marks the report Paid. Occasionally she exports a backup. She never thinks about currency math, PDF layout, or invoice numbers.

## Patterns to avoid

No prior visual attempt of this web app exists, so these are the anti-patterns for this product type — references to pattern **away** from:

- **Consumer-fintech dashboard.** Do NOT open on a dashboard of spend charts, category breakdowns, "this month vs last", or hero metrics. There is no analytics in this product. The home of the app is Capture (do a thing), not a dashboard (look at numbers).
- **Enterprise expense suite density.** Do NOT borrow Concur/Expensify chrome — multi-pane policy controls, approval status rails, dense toolbars. This is one person's private tool, not a corporate workflow.
- **Generic AI-app chrome.** No "AI is thinking" theatrics, no chat bubbles, no glowing gradient "magic" framing around the receipt reading. The AI read is a quiet convenience that produces a pre-filled form — present it as a normal form that happens to come filled in, not as an AI showcase.
- **Marketing-site aesthetic.** No big hero headers, no purple/violet gradients, no decorative blobs or wavy dividers, no glassmorphism. This is a tool, not a landing page.
- **Money carelessness.** Do NOT render amounts in a proportional font where digits misalign, or bury the converted VND amount. Money and codes must be unambiguous and scannable.

## Roadmap at a glance

1. **Phase 1 — Single-User Expense Flow [CURRENT]:** The complete expense loop for one person (Setup → Capture → Expenses → Reports → Archive → Backup), data local to the device, no accounts. Establishes the entire visual language and IA. Leaves a clean slot for an identity layer.
2. **Phase 2 — Multi-User & Sharing:** Invite-only accounts layered on top — the manager invites peers via a link; each peer gets their own private, isolated workspace, reached by opening a link (nothing to install). Adds Account (login/logout) and Invite/Join screens; the core surfaces stay the same shape, just per-user.

*(Future, not committed: a built-in global country-code list, optional read-only report-sharing to a manager, team-level aggregate analytics with no individual visibility.)*

## Current phase scope

Phase 1 delivers the full single-user workflow as a usable app. At the end of this phase the user can: set up their invoice/bank profile and country codes once; add receipts from any device (snap in-app on mobile, drag-drop or attach several at once on desktop, PDF or any common image) and review them one at a time with the date/amount pre-read and converted to VND; keep a private, editable, searchable expense log (both the original colour photo and a clean B&W scan stored per receipt); pick a date range and generate the exact Macquarie submission package (combined PDF + Excel) with an auto-incremented invoice number; mark a report Paid to archive it; and export/import all their data as a backup file. The server stores nothing.

**Important — design ONLY the Phase 1 screens listed in the checklist.** Per an explicit project decision, Phase 1 does **not** draw or stub any Phase 2 account/invite/join screen. Instead, build the navigation so an identity layer can slot in later without restructuring (see forward-compat). The nav should feel complete and intentional now, not visibly "missing" the account piece.

## Forward-compatibility callouts

The most important section for avoiding Phase 2 rework. These capabilities are **not** in Phase 1 but land in Phase 2 — leave room, don't draw them:

- **Account / identity layer (Phase 2).** Login/logout and a session/account control arrive in Phase 2. Reserve a natural, low-prominence slot for an account control (e.g. a corner of the top bar or a nav footer) that reads as intentionally minimal in single-user mode — not an empty hole, but a place a small account affordance can occupy later without pushing the primary nav around.
- **Invite flow, manager-only (Phase 2).** The manager will generate invite links. This is a separate entry that appears only for the inviting user. Don't design it now, but don't build a nav that assumes exactly five items forever — it should tolerate one or two more top-level entries gracefully.
- **Per-user data isolation framing (Phase 2).** Phase 1 is implicitly "your data." Phase 2 makes that explicit per account. Avoid copy or chrome that hard-codes a single global identity ("My Expenses" is fine; a fixed personal name baked into the header is not).
- **Per-user reporting currency (possible, Phase 2+).** VND is the fixed reporting currency in Phase 1. Keep amount columns and totals **labelled with their currency** rather than implying VND silently, so a future non-VND home currency fits without redesign.
- **Report sharing (Future).** A report row may later gain a read-only "share to manager" action. Keep report-row actions in a pattern that can take one more action without crowding.

## Screen groups — what each does and why

### Group A — Setup (configuration)
- **Job.** Get the user's identity, invoice recipient, bank details, country→account-code mappings, and currency markup in once, so every downstream receipt and report uses their real details. A set-and-forget screen.
- **Why this phase.** Reports can't be generated and amounts can't carry the right account code without it. It's the precondition for everything.
- **User stories served.** S1.
- **Key behaviors the design must encode.** It is **one page** with grouped sections (Profile, Invoice To, Bank Details, Country Codes, Currency Markup) — no inner navigation, no wizard. Country Codes is an **editable list**: rows can be added, edited, and removed; on first run it comes pre-filled with the five SEA examples (Vietnam, Thailand, Cambodia, Myanmar, Australia) which the user can change. The currency markup is a single percentage (default 3%). The screen should make "you only do this once" obvious, and quietly indicate when changes are saved.
- **States that surprise.** First-run (seeded example country codes, other fields empty with gentle hints) vs returning (everything filled). A validation state where an incomplete profile is flagged — this is what later blocks report generation, so the connection should feel sensible, not punitive.
- **Forward-compat for this group.** This is where a future account/identity will most naturally sit adjacent to (profile ≈ account). Don't merge them, but don't wall Profile off in a way that an account section couldn't sit beside later.

### Group B — Capture (the primary action)
- **Job.** Turn a receipt — in any form, on any device — into a correctly logged expense with as little effort as possible. This is THE screen; it's where the "took no effort" promise lives or dies.
- **Why this phase.** It's the core daily loop and the reason the app exists.
- **User stories served.** S2, S3, S4, S5.
- **Key behaviors the design must encode.**
  - **Effortless, multi-channel input:** on mobile, take a photo directly in the app or pick from the gallery; on desktop, click to browse or drag-and-drop — and the user can add **several files at once**. Accepts PDF and all common image formats. Adding files should feel instant and forgiving.
  - **One-at-a-time review of a queue:** even when many files are added together, they form a queue and are reviewed **one at a time** ("Receipt 2 of 5"). For each: the file is read, a **pre-filled** form appears (date, amount, detected currency, the converted VND, a country picker drawn from the user's configured codes, a description field), the user confirms or corrects, saves, and the next one comes up.
  - **The AI read is quiet, not theatrical:** present the filled form as the normal state; don't dramatise the reading.
  - **Conversion is shown, not hidden:** the original amount + currency and the resulting VND should both be visible so the user trusts the math at a glance.
- **States that surprise.**
  - **Reading / loading** per receipt while the file is read and scanned.
  - **Low-confidence / unread:** when the AI can't read a field, that field appears **blank and clearly flagged**, with the receipt image prominent so the user can read it themselves and type it in. This must feel like a normal fallback, not an error.
  - **Per-file error** (unsupported/oversized file, or reader unavailable): the offending file is flagged in the queue, nothing is saved silently, the rest of the queue is unaffected.
  - **Saved** micro-confirmation per receipt, then advance; when the queue empties, return to the resting Capture state.
- **Forward-compat for this group.** The capture queue is fully Phase 1 — design it properly now.

### Group C — Expenses (the log / manage)
- **Job.** See everything captured, find a specific expense, and fix mistakes.
- **Why this phase.** Trust requires being able to review and correct what was logged before it goes into a report.
- **User stories served.** S6, S7, S8.
- **Key behaviors the design must encode.** A running list of expenses, each showing date, description, the VND amount, the original amount + currency, the exchange rate used, the country/account-code, submitted/unsubmitted status, and access to the receipt. Filterable by **date range, country, and submitted status**, and searchable by description. Any field of an expense can be edited (and the VND re-converts if amount/currency changes); an expense can be deleted (with confirmation). Opening a receipt shows **both** the original colour photo and the B&W scan.
- **States that surprise.** Empty (no expenses yet → a confident nudge toward Capture, not hand-holding). The receipt viewer showing two images (colour + scan). Edit-in-place vs a separate edit view — Pencil's call, but editing must be unmistakable and safe.
- **Forward-compat for this group.** Status labelling and currency labelling (see callouts) live here most visibly.

### Group D — Reports (Create + History/Archive)
- **Job.** Produce the submission package for a period, and track which reports have been paid.
- **Why this phase.** It's the payoff — the reason expenses are captured at all.
- **User stories served.** S9, S10, S11, S12.
- **Key behaviors the design must encode.**
  - **Create:** pick a start and end date; the unsubmitted expenses in that range appear with a running total; Generate produces the combined PDF + Excel (downloaded to the device) and an auto-incremented invoice number, and marks those expenses Submitted. Generate is unavailable (with a visible reason) if the profile is incomplete or there are no expenses in range.
  - **History/Archive:** a list of generated reports (period, invoice number, total, date, status). A report can be re-downloaded, marked **Paid** (which archives and locks it), or — if not yet Paid — deleted, which returns its expenses to the unsubmitted pool so a mistaken report can be redone.
- **States that surprise.** Generating (a brief working state — assembly happens on the server). Success (invoice number + total, files downloading). The Mark-Paid confirmation ("Macquarie paid invoice X?"). The locked vs deletable distinction between Paid and not-yet-Paid reports. Empty history.
- **Forward-compat for this group.** Report-row actions should tolerate a future "share" action (callout above).

### Group E — Backup (export / import)
- **Job.** Let the user protect and move their data themselves — the only backup mechanism, since nothing is on a server.
- **Why this phase.** With data living only on the device, a self-controlled backup is the safety net.
- **User stories served.** S13.
- **Key behaviors the design must encode.** Export produces a single downloadable file containing everything (settings, expenses, both image sets, report history). Import restores it on another device, with a **clear warning that importing replaces current data**, and reports what was restored. The tone should be reassuring (your data is yours and portable), and the destructive nature of import should be unmissable but not alarming.
- **States that surprise.** Importing (progress + a restored-counts summary). Import error (invalid/corrupt file → nothing changes).

### Group F — App shell / navigation
- **Job.** Move between the five areas with zero thought; make Capture the obvious primary action.
- **Key behaviors.** Shallow nav across Setup · Capture · Expenses · Reports · Backup. Works full-width on desktop and adapts to a small mobile screen where the primary "add receipt" action is reachable in one tap, with no horizontal scroll. Forward-compatible per the callouts (room for an account control and possibly one or two more entries).

## User stories (verbatim from requirements.md)

### Group A — Setup
**S1.** As a user, I can fill in my Profile, Invoice-To, Bank, Country Codes, and Currency Markup on one Setup page so that my reports and conversions use my own details.

### Group B — Capture
**S2.** As a user, I can add one or more receipt files (take a photo in-app on mobile; attach or drag-and-drop one or several files on desktop; PDF or any common image format) so that I can capture expenses the way that suits my device.
**S3.** As a user, when I add receipts they queue up and I review them one at a time — for each the AI reads the date and amount, and I see a pre-filled form — so that I can confirm or correct each receipt before it is saved.
**S4.** As a user, for each receipt I pick a country and enter a description, and the app converts the receipt's amount to VND at the recorded exchange rate, so that the saved expense is in my reporting currency with the right account code.
**S5.** As a user, both the original colour photo and the cleaned black-and-white scan are saved with each expense so that I keep the untouched source and the version used in the submission package.

### Group C — Expenses
**S6.** As a user, I can view my full expense log and filter it by date range, by country, and by submitted/unsubmitted status, and search descriptions, so that I can find specific expenses.
**S7.** As a user, I can edit any field of a logged expense and delete an expense, so that I can correct mistakes.
**S8.** As a user, I can open a logged expense and view both its colour photo and its B&W scan, so that I can check the source receipt.

### Group D — Reports
**S9.** As a user, I can pick a start and end date and generate the submission package — a combined PDF (invoice → expense detail → merged receipt scans) plus an Excel sheet, both downloaded, with an auto-incremented invoice number — so that I can email it to Macquarie Finance.
**S10.** As a user, generating a report marks its included expenses "Submitted" so that they don't appear in the next report.
**S11.** As a user, I can see a history of generated reports and re-download a report's files, so that I can resend if needed.
**S12.** As a user, I can mark a report "Paid" to archive it, and I can delete a not-yet-paid report (which returns its expenses to the unsubmitted pool) so that a mistaken report can be regenerated.

### Group E — Backup
**S13.** As a user, I can export all my data to a single file and import it on another device to fully restore everything, so that I never depend on a server copy for backup.

## Visual style

**Calm utility — a quiet, competent finance assistant.** Single light mode (this is a daytime working tool used in airports, taxis, and at a desk; a light surface reads as trustworthy and "official" for a finance artifact and is easiest in bright outdoor light). Neutral, slightly warm foundation so it feels human rather than clinical, with a single reserved accent for the primary actions (Add receipt, Generate). It is one coherent register throughout — there is no "marketing" surface and no "dense data" surface; everything is the same calm, legible utility. The screens should feel uncluttered, with generous breathing room around the one thing the user is doing on each.

## Tone and mood

- **Calm** — the user is often doing this between other things; nothing should demand attention or create urgency.
- **Trustworthy** — it produces a financial document for an employer; it must feel correct and credible, never gimmicky.
- **Effortless** — every screen should look like it's doing the work for you, not asking work of you.
- **Unobtrusive** — it's a tool you keep in a tab; it shouldn't shout, animate excessively, or decorate.
- **Crisp** — numbers, dates, codes, and statuses must be instantly legible and unambiguous.

## Palette direction

- **Primary mode:** light.
- **Foundation:** neutral, slightly warm (avoid stark clinical white-and-grey; avoid category-reflex fintech navy/teal).
- **Accent reserved for:** the primary action only (Add receipt / Generate / Save). One accent, used scarcely, so it always means "the main thing to do here."
- **Saturated/semantic color reserved for:** expense/report status (unsubmitted vs submitted vs paid) and errors/validation — scarce, semantic, never decorative. A receipt that needs a manual field should read as "needs attention" without feeling like a failure.

## Typography direction

- **UI & body:** a clean, utilitarian sans — neutral and legible, not expressive.
- **Numbers, currencies, exchange rates, account codes, invoice numbers:** must use **tabular figures** (or a mono treatment) so digits align in lists and totals and can't be misread. Money legibility is non-negotiable — this is the one place the type must be disciplined.
- **Display:** restrained. No oversized marketing headers; screen titles are functional labels, not statements. Weight contrast (not size alone) should carry hierarchy.

## References (optional)

- **Linear** — for its calm, crisp, uncluttered utility register and disciplined use of a single accent. We want that feeling of a tool that respects your attention. (We do NOT want its keyboard-power-user density — keep ours simpler.)
- A clean mobile banking **receipt/transaction detail** view — for how a single transaction can present an amount, a converted value, and metadata legibly and trustworthily. (Capture review form and the expense detail can borrow this calm, money-legible feel.)

## Information architecture

| Element | Phase 1 | Phase 2 |
|---|---|---|
| Primary nav | Setup · Capture · Expenses · Reports · Backup | same five + Invite (manager-only) |
| Primary action | Capture (Add receipt) | unchanged |
| Account control | none (single user) — reserved minimal slot | account menu: login / logout / session |
| Onboarding entry | straight to Setup | Join-via-invite flow → Setup |
| Data scope | this device only | per-user isolated workspaces |
| Status vocabulary | unsubmitted / submitted / paid | unchanged |

## Screen checklist (THIS PHASE ONLY — coverage contract)

```
GROUP A — Setup
1.  Setup — Default (returning: all sections filled)
2.  Setup — First-run (seeded example country codes; other fields empty with hints)
3.  Setup — Error (per-field validation; incomplete-profile flagged)

GROUP B — Capture
4.  Capture — Default / Empty (resting state; add-receipt entry, mobile camera + desktop drag-drop)
5.  Capture — Queue / Reviewing (pre-filled review form; "Receipt N of M"; country picker, description, date/amount/currency/converted VND)
6.  Capture — Reading / loading (per-receipt read+scan in progress)
7.  Capture — Low-confidence / read failure (unread fields blank + flagged; receipt prominent for manual entry)
8.  Capture — Error (unsupported/oversized file, or reader unavailable; failed item flagged in queue)
9.  Capture — Saved (per-receipt confirmation; queue advances)

GROUP C — Expenses
10. Expenses — Default (list with all row fields + filters + search)
11. Expenses — Empty (confident nudge to Capture)
12. Expenses — Edit (edit any field of one expense; re-convert on amount/currency change)
13. Expenses — View receipt (both colour photo and B&W scan)
14. Expenses — Delete confirm

GROUP D — Reports
15. Reports / Create — Default (date-range pickers; in-range unsubmitted list + running total; Generate, with disabled+reason state)
16. Reports / Create — Generating / loading
17. Reports / Create — Success (invoice number + total; files downloading; expenses marked Submitted)
18. Reports / Create — Error (assembly failed; nothing marked Submitted; no download)
19. Reports / History — Default (list: period, invoice number, total, date, status; actions: re-download, Mark Paid, Delete-if-not-paid)
20. Reports / History — Empty
21. Reports / History — Mark Paid confirm (locks the report)

GROUP E — Backup
22. Backup — Default (Export button; Import with replace warning)
23. Backup — Importing (progress + restored-counts summary)
24. Backup — Import error (invalid/corrupt file; nothing changes)

GROUP F — App shell
25. App shell — Default (desktop nav across the five areas; Capture primary)
26. App shell — Mobile (adapted; one-tap add-receipt; no horizontal scroll)
```

## Coverage notes

- **Constitution constraints (all screens):** light mode; must work in Chrome, Safari, Firefox on macOS, Windows, iOS, Android; no desktop-only interactions; mobile primary action (add receipt) reachable in one tap with no horizontal scroll. Money/codes use tabular figures throughout.
- **Design-system anchors:** an **expense row/card** that reads cleanly both as a list row (Expenses) and as the in-range review item (Reports / Create) — design it once, reuse it. A **status chip** vocabulary (unsubmitted / submitted / paid + a "needs attention" flag for unread capture fields) used consistently. A **receipt viewer** that always pairs colour + B&W.
- **Most-forgotten surfaces:** the expense **list-item** as a compact component (often only the detail/edit view gets designed); the **queue item** state within Capture; the **disabled Generate with a reason** state; the **import replace-warning**; all three Capture failure/low-confidence states.
- **Forward-compat reminders mapped to screens:** the account-control slot lands in the **App shell** (25, 26) and conceptually near **Setup/Profile** (1); currency-labelling discipline shows most on **Expenses** (10) and **Reports/Create** (15); extensible report-row actions on **Reports/History** (19).
- **Mobile is first-class, not an afterthought:** Capture (4–9) is used primarily on a phone in the field — its mobile form must be genuinely one-handed and fast.
