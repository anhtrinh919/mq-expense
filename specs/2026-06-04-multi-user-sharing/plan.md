# Multi-User & Sharing Implementation Plan

Each group is independently reviewable and built/verified by code-harness before the next. Groups 1–5 are server-side (datastore, auth, invites, reset, sync); Groups 6–9 are client integration + UI + the carry-over fixes; Group 10 is the end-to-end story walk. Visual treatment comes from the Phase 3 design file at build time, not from this plan.

## Group 1: Server data + crypto foundation
**Delivers:** a single-file SQLite store on the server plus at-rest encryption, so later groups have somewhere to persist accounts and per-user encrypted records.
**Depends on:** none — scaffold.
**Verify:** `tsc --noEmit` on the server; `bun test --run server/crypto` (AES round-trip + DEK-wrap/unwrap); server boots and creates/migrates the DB file on first run.

1. Add a pinned SQLite dependency; create `server/db/sqlite.ts` opening a single DB file at a configurable path (env `MQX_DB_PATH`), with schema migrations for `accounts`, `invites`, `sessions`, `sync_records`.
2. Create `server/lib/crypto.ts`: AES-256-GCM encrypt/decrypt; per-user DEK generation; DEK wrap/unwrap under a server master key read from env (`MQX_MASTER_KEY`), with a clear startup error if unset in production.
3. Add `server/lib/env.ts` entries for `MQX_DB_PATH`, `MQX_MASTER_KEY`, `MQX_SESSION_TTL`, `MQX_INVITE_TTL`, and the manager seed (`MQX_MANAGER_EMAIL`, `MQX_MANAGER_NAME`, `MQX_MANAGER_PIN`).
4. Extend `/api/health` to report DB reachability.

## Group 2: Accounts & authentication
**Delivers:** the seeded manager, peer register (via invite), login, logout, and a session-auth middleware — the identity backbone every other endpoint depends on.
**Depends on:** Group 1.
**Verify:** on first boot the manager account is seeded from env; curl `register` **without** an invite returns 403; manager `login` → authenticated `logout`; PIN hash never stored in plaintext; failed-attempt lockout returns 423 after the threshold.

1. `server/lib/auth.ts`: PIN hashing (scrypt/bcrypt, per-user salt), session token mint/verify, auth middleware that resolves a session to an `accountId` + role and rejects disabled accounts.
2. **Manager seed on init:** if no manager account exists, create one from env (`MQX_MANAGER_EMAIL`/`NAME`/`PIN`) with role `manager` and a wrapped DEK. Idempotent across restarts.
3. `server/routes/auth.ts`: `POST /api/auth/register` (**always** requires a valid invite — invite consumption wired in Group 3 via a shared helper; creates a `peer`), `POST /api/auth/login` (lockout counter + `locked_until`), `POST /api/auth/logout`.
4. On register, generate and wrap the per-user DEK (Group 1) and persist the account row.
5. Require the session middleware on `/api/fx`, `/api/process-receipt`, `/api/generate-report` (stateless processors, now session-gated).

## Group 3: Invites & team management
**Delivers:** the manager can create invite links, peers consume them at register, and the manager can see and revoke peers.
**Depends on:** Group 2.
**Verify:** curl manager `POST /api/invites` → public `GET /api/invites/:token` shows pending → peer `register` with the token succeeds and the invite flips to redeemed → second register with the same token is rejected 403 → manager `GET /api/team/roster` lists the peer → `POST /api/team/:id/disable` then peer `login` returns 403.

1. `server/routes/invites.ts`: `POST /api/invites` (manager-only, mints token + expiry + link), `GET /api/invites/:token` (public validation for the Join screen).
2. Wire register (Group 2) to consume a pending, unexpired, unrevoked invite atomically; set the peer's `invited_by` to the manager.
3. `server/routes/team.ts`: `GET /api/team/roster` (manager-only; name/email/status/joinedAt only — no expense data), `POST /api/team/:accountId/disable` (manager-only; cannot disable self; invalidate the peer's sessions).
4. Role-gate manager endpoints in the auth middleware.

## Group 4: Admin PIN reset (out-of-band)
**Delivers:** an operator command to reset a forgetful user's PIN, plus the "ask your administrator" guidance on the login screen. No email, no in-app reset endpoint.
**Depends on:** Group 2.
**Verify:** run `bun run server/scripts/reset-pin <email> <newPin>` → the named account's PIN hash is updated → `login` with the new PIN succeeds and the account's synced data is intact (unchanged).
**Note:** server-managed encryption (Group 1) keeps the DEK independent of the PIN, so resetting the PIN hash never re-keys or loses user data.

1. `server/scripts/reset-pin.ts`: a small admin CLI that looks up an account by email and sets a new salted PIN hash (and clears the lockout counter). Safe to run against the live SQLite file.
2. The login screen's "Forgot PIN?" state shows plain "ask your administrator to reset your PIN" guidance — built in Group 7. No client API call.

## Group 5: Sync engine (server)
**Delivers:** per-user encrypted record storage with incremental pull/push and strict isolation — the heart of cross-device sync.
**Depends on:** Groups 1–2.
**Verify:** curl as user A: `POST /api/sync` with records → `GET /api/sync?since=` returns them → user B's pull returns none of A's records (isolation) → push with an older `updatedAt` does not overwrite a newer record (LWW) → a `deleted` tombstone propagates on the next pull.

1. `server/routes/sync.ts`: `GET /api/sync` (decrypt + return the caller's records changed since the cursor) and `POST /api/sync` (encrypt under the caller's DEK, upsert with last-write-wins by `updatedAt`, honor tombstones).
2. Enforce `account_id` scoping on every query; reject if the session account is disabled.
3. Define the cursor (monotonic `updated_at` watermark) and the record payload shape shared with the client.

## Group 6: Client auth + sync integration
**Delivers:** the client gains login/session state, talks to the auth + sync APIs, syncs IndexedDB in the background, and migrates existing local data on first login.
**Depends on:** Groups 2 & 5; Dexie schema bump.
**Verify:** `bun test --run` (sync merge + tombstone + LWW units); in two browser profiles, data created in one appears in the other after sync; existing local data is offered for migration on first login on a device that has it; isolation holds across accounts.

1. Bump Dexie to **version 4**: add the `account` singleton store and `updatedAt`/`deletedAt` sync metadata to syncable stores; migration backfills `updatedAt` and `deletedAt: null`.
2. `src/data/account.ts` + `src/lib/authClient.ts`: account/session state (register, login, logout, current session), session-token persistence, and reset-flow calls.
3. `src/lib/sync.ts`: serialize changed records (reuse `backup.ts` shapes), push/pull against `/api/sync`, merge with last-write-wins + tombstones into IndexedDB, track `lastSyncCursor`; trigger on app open, after saves, and periodically.
4. First-login migration: detect existing local data with no account, offer to claim it into the new account and push it up.
5. Generalize `App.tsx` gating: unauthenticated → Login; no account yet + has invite → Join; logged-in + locked → PIN quick-unlock; else the shell.

## Group 7: Account UI screens
**Delivers:** the Join, Login/Unlock, Reset-PIN, and Invite/Team screens, plus the sync-status indicator, built from the design file.
**Depends on:** Group 6.
**Verify:** story walk — open an invite link → create account → land in workspace; log out → log back in on a "new device" (fresh profile) → data syncs; forgot-PIN → reset → log in; manager generates a link and sees the roster.
**Note:** these are built against the Phase 3 design file (frame index in `handover.md`); reuse the Phase 2 onboarding step scaffold + PIN pad components.

1. `src/screens/Join.tsx` (+ `.css`): invite-link landing, validating/invalid/valid states, create-account form (name/email/PIN).
2. Generalize `src/screens/PinLock.tsx` into Login/Unlock: email+PIN on a new device, PIN-only quick unlock on a known device, first-login existing-data migration prompt, wrong-PIN/locked-out/disabled states, and a "Forgot PIN?" state that shows plain "ask your administrator" guidance (no API call).
3. Invite & Team UI inside the renamed Settings (Group 8): generate/copy link, roster list, per-row revoke with confirm, empty state.
4. Sync-status indicator in `AppShell` (synced / syncing / offline); fill the reserved sidebar account slot; show the manager-only Invite/Team entry.

## Group 8: Profile / Settings restructure
**Delivers:** the page rename and reorganization the user asked for, with redirects so old links keep working.
**Depends on:** Group 6 (account/logout) — can build UI shell earlier but wires account actions here.
**Verify:** nav + routes — `Profile` shows the former Settings content; `Settings` shows Export + Restore + PIN/Security + Account + Clear-data; old `/setup`, `/settings`(old meaning), `/backup` routes redirect correctly; no dead links.

1. Rename the current `Settings` screen/route to **Profile** (`/profile`, nav label "Profile"); keep profile/invoice/bank/country-codes/base-currency content unchanged.
2. Rename the current `Backup` screen/route to **Settings** (`/settings`, nav label "Settings"); add sections: Export backup (existing), Restore from backup (moved out of old Settings), PIN / Security (change PIN), Account (logged-in-as + Log out), Danger zone (Clear all my data).
3. Update `AppShell` nav nodes + the sidebar/bottom-nav labels; add route redirects for old paths.

## Group 9: Carry-over fixes
**Delivers:** the invoice-number text-wrap fix and the working clear-all-data action.
**Depends on:** Groups 5 & 8 (clear-data spans server + the new Settings home).
**Verify:** the pending-payment card shows the invoice number without breaking mid-token at 390px and 1280px; Clear-all-data wipes local IndexedDB and the server `sync_records` (confirm via a subsequent pull returning empty) behind an explicit confirmation.

1. Fix the pending-payment card on `Home` so the invoice number wraps/sizes cleanly without splitting the token; verify with a long invoice number.
2. Implement Clear-all-data: explicit destructive confirm → wipe local stores + `DELETE /api/account/data` → return the user to a clean empty state (account retained).

## Group 10: Integration & story walk
**Delivers:** every user story verified end-to-end, isolation proven, and the Phase 1/2 flows confirmed intact.
**Depends on:** all prior groups.
**Verify:** walk every `requirements.md` user story; confirm strict isolation between two accounts; confirm capture, deskew, report generation, and one-zip download still work unchanged for a logged-in user; multi-device sync round-trips.

1. Run the full story walk against `requirements.md`; fix any gaps.
2. Cross-account isolation probe (user B cannot read user A's data via any endpoint).
3. Regression pass on the frozen Phase 1/2 flows (capture → expenses → report → backup) under an authenticated session.
