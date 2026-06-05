# Phase 3 Frontend Handover — MQ Expense (Multi-User & Sharing)

## Mockups — source of truth

> **This handover is an index. The mockups are the visual specification.**
> Backend must open the mockup files and build the new/changed UI from them — screen by screen, state by state. Where this doc and a mockup differ, **the mockup wins.** The mockups reuse the live app's tokens and component classes, so they are faithful to the shipping look.

- **Directory:** `specs/2026-06-04-multi-user-sharing/mockups/` (project-relative).
- **Track:** `claude-code-impeccable` — static HTML mockups (no external design file this phase).
- **How to read them:** open each `.html` in a browser. Each file is a labeled gallery: every state is a captioned frame. The shared look comes from `mockups.css`, which imports the existing token file and mirrors the app's `globals.css` primitives + the Phase 2 `PinLock.css` / `Onboarding.css` scaffold.

## Mockup index

| Mockup file | Screens / states it covers |
|---|---|
| `mockups/auth.html` | Join/Create account (valid, validating, invalid, error, mobile); Login/Unlock (known-device PIN, new-device email+PIN, first-login migrate prompt, wrong-PIN, locked-out, disabled, forgot-PIN, mobile) |
| `mockups/team-settings.html` | App shell (account slot + sync dot + manager Invite entry); Invite & Team (roster default, empty, link-generated, revoke inline-confirm); Profile (renamed); Settings (renamed: Account/Backup/Security/Danger zone, clear-data inline-confirm, mobile); sync indicator (synced/syncing/offline); Home pending-payment card fix |
| `mockups/mockups.css` | Shared stylesheet — tokens import + app primitives + auth scaffold + shell + roster/invite/sync/danger styles |

## Design tokens

- **Tokens file:** `specs/2026-06-04-single-user-flow/design-tokens.css` — **unchanged this phase.** Phase 3 introduces **no new tokens** (no new color family, typeface, or scale). The app already imports this file via `src/styles/design-tokens.css` / `globals.css`; keep using it. Reference `var(--…)`; do not hardcode hex.

## Fonts required

Unchanged from Phases 1–2 — all three already loaded via the Google Fonts `<link>` in `index.html`.

| Role | Family | Variable | Weights |
|------|--------|----------|---------|
| Body / UI | **Inter** | `--font-sans` | 400, 500, 600 |
| Display / headings | **Instrument Serif** | `--font-display` | 400 |
| Mono — PIN digits, invite codes/links, amounts, codes, invoice numbers | **JetBrains Mono** | `--font-mono` | 400, 500 |

> PIN entry digits and invite links/codes are JetBrains Mono with tabular figures, consistent with the Phase 2 PIN treatment.

## Frame index (every requirements.md UI state → mockup)

| Requirement state | Mockup file · section |
|---|---|
| Join — Default (valid invite) | `auth.html` · "1 · Join — valid invite" |
| Join — Validating | `auth.html` · "2 · Join — validating" |
| Join — Invalid / expired / used | `auth.html` · "3 · invalid invite" |
| Join — Error (email taken / weak PIN / network) | `auth.html` · "4 · Join — error" |
| Join — Mobile | `auth.html` · "5 · Mobile — Join" |
| Login/Unlock — Known device (PIN only) | `auth.html` · "6 · known device" |
| Login/Unlock — New device / logged out (email+PIN) | `auth.html` · "7 · new device" |
| Login/Unlock — First login w/ existing local data | `auth.html` · "8 · migrate prompt" |
| Login/Unlock — Wrong PIN | `auth.html` · "9 · wrong PIN" |
| Login/Unlock — Locked out | `auth.html` · "10 · locked out" |
| Login/Unlock — Account disabled | `auth.html` · "11 · disabled" |
| Login/Unlock — Forgot PIN (contact admin) | `auth.html` · "12 · forgot PIN" |
| Login/Unlock — Mobile | `auth.html` · "13 · Mobile — Unlock" |
| Invite & Team — Default (roster) | `team-settings.html` · "22/14 · shell + roster" |
| Invite & Team — Empty | `team-settings.html` · "15 · empty" |
| Invite & Team — Link generated | `team-settings.html` · "16 · link generated" (in shell) |
| Invite & Team — Revoke inline confirm | `team-settings.html` · "17 · revoke" (in roster) |
| Profile (renamed from Settings) — Default | `team-settings.html` · "18 · Profile" |
| Settings (renamed from Backup) — Default | `team-settings.html` · "19 · Settings" |
| Settings — Clear-data inline confirm | `team-settings.html` · "20 · clear-data" (Danger zone) |
| Settings — Mobile | `team-settings.html` · "21 · Settings mobile" |
| App shell — Sync indicator + account slot + manager entry | `team-settings.html` · "22 · shell" + "sync indicator" |
| Home — Pending-payment card fix | `team-settings.html` · "23 · pending-payment card" |

## Reusable components

Reuse the Phase 1/2 components (Sidebar, status chip, expense row, etc.) — do not redraw. New/extended for Phase 3:

| Component | Where | Notes |
|---|---|---|
| Full-bleed auth scaffold | Join, Login/Unlock | Reuses the Phase 2 onboarding/PIN centered single-column card; rendered OUTSIDE `AppShell` |
| PIN pad / numeric entry | Join (set PIN), Login, Unlock | Reuse the Phase 2 PIN component; active cell carries the green accent ring; JetBrains Mono digits |
| Copyable invite link | Invite & Team | Mono read-only field + Copy with transient "Copied"; quiet expiry note below; not a modal |
| Roster list | Invite & Team | Borderless list, hairline rule per row: name + email + status chip (active=`chip-paid`, disabled=`chip-disabled`) + low-emphasis Revoke. NOT a card grid |
| Destructive inline-confirm | Revoke peer, Clear all data | Two-step inline morph (action → "Sure? Yes / Cancel"); never a modal-first |
| Sync-status indicator | App shell footer | Tinted dot + label (synced=accent, syncing=unsubmitted-amber, offline=muted) |
| Account slot | Sidebar footer | Fills the slot reserved since Phase 1: avatar + name/email + sync line |
| Contact-admin notice | Login forgot-PIN | Inline guidance panel, no form, no email field |

## Deviations from requirements spec

None. Every `requirements.md` UI state maps to a mockup. The mockups realize the spec's behavior; the seeded-manager / no-email-reset / encrypted-sync rules are backend concerns not contradicted by any screen. No new API surfaced from the design.

## Layout / IA notes

- **Two full-bleed surfaces precede the shell:** Join and Login/Unlock render OUTSIDE `AppShell` (like Phase 2 Onboarding/PIN). Gate routing in `App.tsx`: unauthenticated → Login; valid invite + no account → Join; logged-in + locked → PIN quick-unlock; else the shell.
- **Page rename (load-bearing):** today's `Settings` screen becomes **Profile** (`/profile`); today's `Backup` screen becomes **Settings** (`/settings`) and absorbs Restore + PIN/Security + Account(logout) + Clear-data. Add redirects for old `/setup`, `/settings`(old), `/backup`. The nav labels change to match.
- **Manager-only nav:** the "Invite & Team" entry shows only for `role: "manager"`; peers never see it. Invite & Team UI lives inside the renamed Settings area / its own manager route.
- **Numerics in mono:** PIN digits, invite links/codes, amounts, invoice numbers — JetBrains Mono / tabular figures.
- **Invoice-number fix:** the pending-payment card must keep the invoice number as a whole token (no mid-token break); shrink/wrap the whole unit if needed. See the before/after frame.

## API contracts expected from backend

From `requirements.md` API Contracts — implement exactly. Auth via session token; existing `/api/fx`, `/api/process-receipt`, `/api/generate-report` gain a session requirement (bodies unchanged). New: `POST /api/auth/register` (invite-required peer), `POST /api/auth/login`, `POST /api/auth/logout`; `POST /api/invites` + `GET /api/invites/:token`; `GET /api/team/roster` + `POST /api/team/:accountId/disable`; `GET /api/sync` + `POST /api/sync`; `DELETE /api/account/data`. No PIN-reset endpoint (admin/out-of-band). Manager account seeded from env on init. Full request/response/error shapes are in `requirements.md` — that section is the contract.
