# Design Brief — Phase 3: Multi-User & Sharing (Claude Code / impeccable track)

## Design intent (north star)

**"It just works everywhere."** The account, sync, and onboarding surfaces should feel like quiet plumbing the user never has to think about — log in once, the data is just there on every device, you're never locked out, you never re-enter anything. The emotional target is *reassurance through calm*, not celebration. No confetti, no "Welcome aboard!" fanfare — just a frictionless slide from invite link into a working, private workspace.

**Register:** product (these screens *serve* the task; they are not the product's marketing). Apply the impeccable product reference + shared laws.

## Visual style

Continue the **established MQ Expense system unchanged** — there are no new design tokens this phase. Warm paper canvas (`--bg-canvas` #F6F3EE), white surfaces, forest-green accent (`--accent` #3D5A3A) used sparingly, soft warm borders, generous calm spacing. Headings in **Instrument Serif** (`--font-display`), body/UI in **Inter** (`--font-sans`), and all numerics — PIN digits, invite codes, amounts — in **JetBrains Mono** (`--font-mono`) with tabular figures.

**Why:** the product's whole personality is "quiet, competent assistant." A new login/account area is exactly where apps usually break character with a generic SaaS auth screen (centered card, purple button, drop shadow). Holding the warm-paper language *through* the account flow is what makes "it just works everywhere" feel true — the account screens look like the same calm tool, not a bolted-on gate. The full-bleed onboarding/PIN surfaces from Phase 2 already established this; Phase 3's Join/Login reuse that exact scaffold.

**Color strategy:** Restrained — tinted warm neutrals carry the surface; the green accent stays ≤10% (primary buttons, the active sync dot, the focused PIN cell). Status tints (the existing `--status-*` families) carry meaning on the roster (active/disabled) and error states. No new color family.

**Theme:** light. Scene sentence: *"A sales rep standing in an airport or sitting in a daytime office taps an invite link on her phone, or unlocks the app on her laptop at her desk in normal daylight, wanting in fast without ceremony."* Daylight, mobile-first, low-ceremony → warm light paper, never a dark auth screen.

## Layout hierarchy per screen

- **Join / Create account (full-bleed, no shell):** First — a calm one-line welcome naming who invited them and that this workspace is theirs alone ("You've been invited to your own private MQ Expense workspace"). Second — the create form (name, email, PIN + confirm) in a single centered column. Third — a quiet reassurance line (data is private to you). Primary element: the PIN field + Create button. Reuses the Phase 2 onboarding step scaffold.
- **Login / Unlock (full-bleed):** Known device — First: the PIN pad (large JetBrains Mono digits), greeting the user by first name. Second: "Forgot PIN?" link. New device / logged out — First: email field then PIN; Second: "Forgot PIN?". Primary element: the numeric entry. Reuses the Phase 2 PIN-lock pad component.
- **Invite & Team (inside the renamed Settings, manager only):** First — the "Invite a teammate" action and, once generated, the copyable link block (mono). Second — the roster: a quiet list of who has joined (name, email, status pill, joined date) with a low-emphasis per-row "Revoke." Primary element: generate-invite. Not a card grid — a single calm list with a rule between rows.
- **Profile (renamed from Settings, unchanged content):** identical to today's Settings — Profile / Invoice To / Bank / Country Codes / Base Currency sections. Hierarchy unchanged; only the page title + nav label change to "Profile."
- **Settings (renamed from Backup):** First — Account block (logged-in-as name/email, Log out). Second — Data tools: Export backup, Restore from backup. Third — Security: Change PIN. Last — a visually-separated Danger zone: "Clear all my data." Hierarchy descends from identity → routine data tools → security → destructive, so the destructive action is last and visually distinct.
- **App shell:** a small sync-status indicator in the sidebar footer near the filled account slot (a tinted dot + word: synced / syncing / offline). Manager sees an "Invite & Team" entry; peers don't.
- **Home pending-payment card (fix):** the invoice number is the second-level element under the "PENDING PAYMENT" label; it must sit on its own line and shrink/wrap as a whole token, with the amount on its own line — never the mid-token break shown in the bug.

## Component decisions

- **PIN pad / numeric entry** — reuse the Phase 2 component; large JetBrains Mono cells, the active cell carries the green accent ring. Used on Join (set PIN), Login, and Unlock.
- **Full-bleed auth scaffold** — reuse the Phase 2 onboarding centered single-column layout (no sidebar) for Join + Login + Unlock.
- **Copyable invite link** — a mono, full-width read-only field with a single "Copy" affordance and a transient "Copied" confirmation; below it a quiet expiry note. Not a modal.
- **Roster list** — a borderless list with a hairline rule between rows; each row = name (Inter medium) + email (tertiary) + a status pill (existing `--status-paid-bg`/green for active, `--bg-muted`/tertiary for disabled) + a low-emphasis text "Revoke" that expands to inline confirm. Explicitly **not** an identical-card grid.
- **Destructive-action button with inline confirmation** — "Clear all my data" and "Revoke" both use a two-step inline confirm (the action morphs into "Sure? — Yes / Cancel" in place), never a separate modal as the first thought.
- **Sync-status indicator** — a tinted dot + label; the green accent only while actively synced.
- **Contact-admin notice** — the "Forgot PIN?" state is a plain inline panel of guidance text, no form, no email field.

## Interaction patterns

- **Create account (Join):** full-page progression to the workspace on success; inline field validation (email format, PIN match) before submit; no modal.
- **Log in / unlock:** inline error in place on wrong PIN with a remaining-attempts hint; on lockout, the pad disables with a wait message; success slides into the app (no full reload feel).
- **Generate invite:** inline reveal of the link below the button (optimistic — the link appears immediately); Copy gives a transient toast/inline "Copied."
- **Revoke a peer:** inline two-step confirm in the row; on confirm, the row's status pill flips to "disabled" optimistically.
- **Clear all my data:** inline two-step confirm with explicit naming of what is wiped (this device + the synced copy); on confirm, returns to a clean empty workspace.
- **Sync:** silent/background; the indicator is passive feedback, never a blocking spinner over the app.
- **Migrate existing data (first login):** a quiet one-time inline prompt ("We found expenses on this device — add them to your account?") with Add / Not now; not a modal wall.

## Mobile strategy

Mobile-first for the auth surfaces (most peers join on a phone from a link):
- **Join / Login / Unlock:** full-bleed single column, large tap targets, numeric PIN pad sized for thumbs; no horizontal scroll at 390px.
- **Settings / Profile:** sections stack vertically; the Danger zone stays clearly separated. Reuse the existing mobile shell (bottom nav + FAB) from Phase 2.
- **Invite & Team:** the roster collapses to stacked rows (name+status on line 1, email on line 2); the invite link field is full-width with the Copy button below it on narrow screens.

## Empty and error states

- **Invite & Team — empty (no one joined):** warmth element — a calm one-liner ("No teammates yet. Generate a link and share it to get someone started.") + the primary "Invite a teammate" CTA. Not an illustration-heavy empty state.
- **Join — invalid/expired/used invite:** message — "This invite link isn't valid anymore. Ask your manager for a fresh one." No retry form; a clear dead-end with guidance.
- **Login — wrong PIN:** "That PIN didn't match. {n} tries left." inline under the pad.
- **Login — locked out:** "Too many tries. Try again in {m} minutes." pad disabled.
- **Login — account disabled:** "Your access has been turned off. Contact your manager." no entry.
- **Login — forgot PIN:** "Ask your administrator to reset your PIN — there's no email reset on this app." plain panel.
- **Settings — clear-data confirm:** "This erases every expense, receipt, and report on this device and in your synced copy. This can't be undone." Cancel / Clear everything.
- **Network/server error (any auth action):** "Couldn't reach the server. Check your connection and try again." inline, with the action re-enabled to retry.

## Impeccable discipline — bans explicitly avoided

- **No side-stripe borders** — roster rows use a hairline full rule + status pill, not a colored left border.
- **No gradient text, no glassmorphism** — solid warm-paper surfaces; emphasis via weight/size and the serif display face.
- **No hero-metric template, no identical card grids** — the roster is a list, not a card grid; no big-number dashboards added.
- **No modal-as-first-thought** — invite link, revoke, clear-data, and migrate all use inline/progressive patterns.
- **No category-reflex palette** — deliberately *not* the generic "auth screen" look (centered white card, purple primary, drop shadow); we hold the warm-paper product language instead.
- **No em dashes in UI copy**; numerics in mono with tabular figures; motion ease-out only (no bounce).

## Screen checklist (coverage contract — every item must appear in the handover)

1. Join / Create account — Default (valid invite)
2. Join / Create account — Validating invite
3. Join / Create account — Invalid / expired / used invite
4. Join / Create account — Error (email taken / weak PIN / network)
5. Join / Create account — Mobile (390px)
6. Login / Unlock — Default, known device (PIN only)
7. Login / Unlock — Default, new device / logged out (email + PIN)
8. Login / Unlock — First login with existing local data (migrate prompt)
9. Login / Unlock — Wrong PIN
10. Login / Unlock — Locked out
11. Login / Unlock — Account disabled
12. Login / Unlock — Forgot PIN (contact-admin guidance)
13. Login / Unlock — Mobile (390px)
14. Invite & Team — Default (has roster)
15. Invite & Team — Empty (no one joined)
16. Invite & Team — Link generated (copyable)
17. Invite & Team — Revoke inline confirm
18. Profile (renamed from Settings) — Default
19. Settings (renamed from Backup) — Default (Account / Export / Restore / Change PIN / Danger zone)
20. Settings — Clear-data inline confirm
21. Settings — Mobile (390px)
22. App shell — Sync status indicator (synced / syncing / offline) + filled account slot + manager-only Invite entry
23. Home — Pending-payment card invoice-number wrap fix
