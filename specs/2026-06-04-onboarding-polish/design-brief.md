# Design Brief — MQ Expense, Phase 2 (Onboarding, Polish & Quality)

**Track:** external-pencil. Design the new/changed screens in the **existing** `pencil/v0.1.pen` design file, reusing the Phase 1 design system. This is a functional polish phase — **no new visual language, no new tokens.**

## Design intent

The user explicitly waived a "north star" for this phase: *"I don't think this phase needs a north star. It's just functional stuff."* So the intent is **continuity, not novelty** — every new screen should look and feel like it was already part of Phase 1. The one quiet bar to clear: a brand-new peer's first run should feel effortless and reassuring (their data is theirs, on their device, and the app works immediately), and the daily user's rough edges (stop-start capture, lost in-progress work, the multi-file download prompt) should disappear. *Every visual decision should be weighed against: does this look like it always belonged in MQ Expense?*

## Product context — full vision

MQ Expense is a private, single-user-today / small-team-tomorrow expense tracker for Macquarie University SEA sales reps. A rep photographs a receipt; the app reads the date + amount, converts any foreign currency to their reimbursement currency, keeps both the colour photo and a clean B&W scan locally, and at month end assembles the exact PDF + Excel package Macquarie Finance already accepts. **All data lives only in the user's browser (IndexedDB); the server stores nothing, ever.**

**What it replaces:** a working but single-user Python "cowork" CLI pipeline (drop a named photo in a folder, run a slash command). Phase 1 turned that into a calm web app. Phase 2 makes it welcoming to someone who has never seen the CLI and never should.

**What it explicitly isn't:** not a fintech dashboard, not an accounting suite, not a charts-and-analytics product. No dashboards beyond the light Home landing already built. The aesthetic is "a well-made form tool that just works on warm paper," not a SaaS console.

**End-state form factor (already established in Phase 1):** desktop = fixed left **sidebar** (Setup/Capture/Expenses/Reports/Backup, with a "LOCAL · THIS DEVICE" reassurance card and a reserved account slot for later); mobile = bottom nav with a center capture FAB. Warm paper canvas (`--bg-canvas`), muted forest-green accent (`--accent`), Inter for UI, Instrument Serif for headings, JetBrains Mono for all money/rates/codes. Phase 2 slots three new surfaces into this shell and refines a few existing ones — it does not touch the shell's language.

**The rep's day:** open the app (unlock with a PIN if they set one) → snap or drop a few receipts → glance through the auto-read results → save the batch → at month end, pick a range, generate one zip, email it. Phase 2 is about making the *first* such day need zero hand-holding, and every later day smoother.

## Patterns to avoid

No failed predecessors — Phase 1 shipped and dogfooded well. Avoid these generic anti-patterns and Phase-2-specific traps:

- **Onboarding-as-marketing.** The welcome is not a splashy product tour with illustrations and value props. It is a calm, 3-or-4-step utility wizard. No hero imagery, no "Welcome to the future of expenses," no progress gamification.
- **A second design language for onboarding.** First-run screens too often look nothing like the app they precede. These must use the same paper canvas, the same green accent, the same type. A returning user glancing over a peer's shoulder during setup should recognize it instantly.
- **Implying the PIN is security.** Do not draw padlock-vault imagery or "encrypted / secure" language. It is a soft curtain. Reassuring, honest, low-drama.
- **Settings becoming a dumping ground.** The merged Settings page must keep Phase 1's clean section rhythm — it gains Base Currency, Security, and Restore as peer sections, not a cluttered overflow.
- **Generic AI-app chrome:** no purple/violet gradients, no glassmorphism, no decorative blobs, no uniform bubbly radii, no centered-everything. (Phase 1 already avoids all of this — just don't reintroduce it.)

## Roadmap at a glance

```
1. Phase 1 — Single-User Expense Flow: capture → log → convert → report → backup. Shipped. Established the full design system + sidebar/bottom-nav shell.
2. Phase 2 — Onboarding, Polish & Quality [CURRENT]: guided first run + optional PIN + per-user base currency; unified Settings; capture v2; sharper scans; sortable/Unsubmitted-default expenses; one-zip download. Still single-user, still local-only.
3. Phase 3 — Multi-User & Sharing: invite-only accounts (Invite / Join / Account screens), each peer a fully-private workspace. The reserved sidebar account slot finally gets filled.
4. Phase 4 — Production Deployment (homepc-1 + Cloudflare): go-live at one permanent URL. No new product UI.
```

## Current phase scope

Design only the **new or changed** surfaces. At the end of Phase 2 a user can: complete a short guided first run (name, home country → reimbursement currency, optional PIN) and land ready to capture; unlock with a PIN on open and reset it freely; manage all config from one Settings page (former Setup + base currency + Change/Remove PIN + restore); add several receipts that all read in the background, review them in one pass, and not lose work to an accidental reload; get straighter scans; sort the expenses table (opening on Unsubmitted); and download a report as one zip.

## Forward-compatibility callouts

- **Account / Invite / Join screens (Phase 3).** The sidebar already reserves an account slot — leave it reserved. The onboarding flow designed here will, in Phase 3, gain an "accept invite" entry path; design the Welcome step so an "invited by …" variant could slot in later without restructuring (don't hard-bake "this is your personal app" so deeply that an invite context looks alien).
- **Multi-currency reps at scale (Phase 3).** Base currency becomes per-account in Phase 3. The Settings "Base Currency" section and the onboarding currency pick should read as a normal per-user setting, not a one-off VND/THB toggle — so it feels identical when many peers each have their own.
- **No deployment chrome (Phase 4).** Phase 4 adds nothing visual. Don't reserve space for it.

## Screen groups — what each does and why

### Onboarding (new)
- **Job.** Get a brand-new peer from "just opened a link" to "ready to capture" without facing the dense config page. Collect only the essentials; defer the rest.
- **Why now.** Phase 1 dropped users straight onto Setup — fine for the wife who built it, wrong for a peer. This is the headline of Phase 2.
- **Stories served:** S1, and the entry into S2 (PIN), S3 (currency).
- **Key behaviors:** country pick auto-selects a reimbursement currency that the user can override; the PIN step is genuinely skippable; a "Restore from a backup instead" path on the first screen lets a device-switcher import their `.mqx` and skip the rest; finishing lands on a ready-to-capture state.
- **States that surprise:** the Restore-from-Welcome branch; the currency-override-after-country-pick interaction; the "skip PIN" path.
- **Forward-compat:** the invited-peer Welcome variant (Phase 3).

### PIN lock (new)
- **Job.** A soft, honest curtain on app open for users who want one.
- **Stories served:** S2.
- **Key behaviors:** numeric entry usable on a phone keypad; wrong-PIN feedback; "Forgot PIN?" → reset that plainly states no data is lost and lets them set a new PIN or remove it.
- **States that surprise:** the reset confirmation (must reassure, not alarm).

### Settings (reworked from Phase 1 Setup)
- **Job.** One obvious home for all configuration.
- **Stories served:** S3, S4.
- **Key behaviors:** keeps all Phase 1 Setup sections; adds Base Currency (home country + reimbursement currency, with a one-line note that changing it affects only future captures), Security (Set/Change/Remove PIN), and Restore (import a `.mqx` with the replace-warning); form edits auto-save as a draft so a reload mid-edit doesn't lose work.
- **States that surprise:** the "deferred fields" state (invoice/bank empty because onboarding skipped them, with a gentle prompt that a report needs them).

### Capture (reworked)
- **Job.** Turn a stack of receipts into saved expenses in one smooth pass.
- **Stories served:** S5, S6, S7.
- **Key behaviors:** on add, **all** receipts begin reading in the background with per-item status (reading / read / needs attention / failed); the current item is editable while others finish; a **review-all** summary lists every receipt's read values for a final check before one "Save all"; in-progress queue + edits auto-save and restore after a reload.
- **States that surprise:** per-item status in the queue rail; the review-all summary; the "restored your in-progress receipts" indication; sharper-scan output is invisible in the UI (it's just a better B&W image) — no new control needed.

### Expenses (light change)
- **Job.** Find what still needs reporting, fast.
- **Stories served:** S8.
- **Key behaviors:** clickable column headers (Date, Amount, Country, Status) sort asc/desc with an indicator; the table opens filtered to **Unsubmitted** by default; the existing filter control still switches to All/Submitted.

### Reports & Backup (light change)
- **Stories served:** S9, S10.
- **Key behaviors:** the Reports/Create **Success** state now says one zip downloaded (instead of two files); the everyday **Backup** page loses its Import card (export-only) and points to Settings → Restore.

## User stories

### Onboarding
**S1.** As a brand-new user, I'm taken through a short guided first run (name, home country → reimbursement currency, optional PIN) and land ready to capture, instead of a dense config page.
**S3.** As a user, my reimbursement currency is set once from my home country, every receipt converts to it, changeable later; a change affects only future captures.

### PIN lock
**S2.** As a user with a PIN, I see a lock screen on open and unlock by entering it; if I forget it I can reset it, and resetting never loses data.

### Settings
**S4.** As a user, I manage all config from one Settings area (former Setup + base currency + Change/Remove PIN + Restore).

### Capture
**S5.** As a user, several added receipts all read in the background while I review; I step through a review-all summary and a single confirm saves the batch.
**S6.** As a user, an accidental reload mid-edit (Settings or capture-review) doesn't lose my in-progress work.
**S7.** As a user, angled receipts come out straighter/cleaner in the B&W scan, with a graceful fallback.

### Expenses
**S8.** As a user, I can sort the expenses table by column, and it opens filtered to Unsubmitted.

### Reports & Backup
**S9.** As a user, generating a report downloads a single zip (PDF + Excel).
**S10.** As a user, the everyday Backup page only exports (restore moved to first-run + Settings).

## Visual style

**Inherit Phase 1 exactly.** Calm light-mode utility on a warm paper canvas (`--bg-canvas` / `--bg-surface`), muted forest-green accent reserved for primary actions and active state, generous quiet spacing. New screens are members of the existing family — same sidebar shell on desktop, same bottom nav on mobile. Onboarding and the PIN lock are the only **full-bleed (no-sidebar)** surfaces in the product, because they precede the app shell; design them as centered, calm, single-column flows on the same paper canvas so they still read as MQ Expense.

## Tone and mood

- **Calm** — nothing shouts; the first run should lower a new user's guard.
- **Honest** — especially around the PIN (reassurance, not a vault) and "data stays on this device."
- **Effortless** — the new user does the minimum and is in; the daily user's friction is gone.
- **Familiar** — looks like it always belonged.

## Palette direction

Use the **existing tokens only** (`specs/2026-06-04-single-user-flow/design-tokens.css`). Light mode. Warm-neutral foundation, forest-green accent reserved for primary action/active state, the established status palette (unsubmitted/submitted/paid/attention/error) reused as-is. No new colours. Per-item capture status can map onto the existing status colours (e.g. reading → neutral/muted, read → submitted-blue or paid-green, needs-attention → attention, failed → error).

## Typography direction

Existing only: Inter (UI/body), Instrument Serif (headings/display), JetBrains Mono (all money, currencies, rates, account codes, invoice numbers, and the numeric PIN entry). No new families.

## Information architecture

| Element | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| Pre-app gate | None | **Onboarding (first run) + PIN lock** | + invited-peer onboarding variant |
| Desktop sidebar | Setup·Capture·Expenses·Reports·Backup + reserved account slot | **"Setup" → "Settings"**; same nav otherwise | account slot filled (Invite/Account) |
| Mobile bottom nav + capture FAB | Yes | Yes (unchanged) | + account |
| Home landing | Light stat cards + recent | Unchanged | Unchanged |
| Backup page | Export + Import | **Export only** | Export only |

## Screen checklist

**THIS PHASE ONLY.** Every item must appear in the returned design (in `pencil/v0.1.pen`, new frames added alongside the Phase 1 frames). 13 states.

```
GROUP A — Onboarding (full-bleed, no sidebar)
1. Onboarding — Welcome (+ "Restore from a backup instead" entry)
2. Onboarding — Your details (name, home country → currency, currency overridable)
3. Onboarding — Set a PIN (optional, skippable)
4. Onboarding — Done (3-point quick guide + CTA into Capture)
5. Onboarding — Restore (file picker + import progress/result, reuses Backup import behavior)

GROUP B — PIN lock (full-bleed, no sidebar)
6. PIN lock — Default (numeric entry, wrong-PIN feedback, "Forgot PIN?")
7. PIN lock — Reset (no-data-lost confirmation; set new / remove)

GROUP C — Settings (in app shell; reworked from Setup)
8. Settings — Default (Profile · Invoice To · Bank · Country Codes · Markup · Base Currency · Security · Restore)
9. Settings — Deferred fields (invoice/bank empty with helper hints + gentle report-needs-these prompt)

GROUP D — Capture v2 (in app shell; changed states only)
10. Capture — Reviewing, batch pre-read (per-item status in queue rail + editable current item)
11. Capture — Review-all summary (editable list of all receipts + "Save all")
12. Capture — Draft restored (quiet "restored in-progress receipts" indication)

GROUP E — Light changes (in app shell)
13. Expenses — Default (sortable column headers + Unsubmitted default filter)
    Reports/Create — Success (single-zip copy)  ← variant of the existing success frame
    Backup — Default (export-only; Import card removed)  ← edit of the existing frame
```

(Items 1–12 are new frames; item 13 plus the Reports/Success and Backup edits are modifications of existing Phase 1 frames — update those frames in place.)

## Coverage notes

- **Constitution constraints (all screens):** must work in Chrome/Safari/Firefox on macOS/Windows/iOS/Android; numeric PIN entry must be comfortable on a phone keypad; sortable headers and the review-all list must work at 390px with no horizontal scroll. Light mode only. Reuse `design-tokens.css` — introduce no new tokens.
- **Design system anchors:** the sidebar shell, status chips, expense row, receipt viewer, and queue-item components already exist (see Phase 1 handover Reusable components) — reuse them; do not redraw. Capture v2's per-item status reuses the status-chip language.
- **Most-forgotten surfaces:** the capture **queue-item** in its new per-item-status variants (reading / read / needs-attention / failed) — design these compact states explicitly, they're easy to miss. The Settings "deferred fields" state. The onboarding "Restore" branch (easy to forget it isn't only the happy path).
- **Full-bleed exception:** onboarding (1–5) and PIN lock (6–7) are the only surfaces without the app shell — flag this clearly so they aren't accidentally drawn inside the sidebar.
- **Forward-compat mapped to screens:** Welcome (item 1) inherits the Phase-3 invited-peer variant; Settings Base Currency (item 8) inherits per-account currency.
