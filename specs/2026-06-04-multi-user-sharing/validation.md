# Multi-User & Sharing Validation

This is the test contract for `/sdd-review`. Every check must pass before the phase is approved. Server runs on the dev port (proxied by Vite); replace `:PORT` with the API port.

## Automated Checks

Run these commands. Each must exit 0.

- **TypeScript:** `tsc --noEmit` (client) and server typecheck — zero errors.
- **Unit — crypto:** `bun test --run server/crypto` — AES-256-GCM encrypt/decrypt round-trips; per-user DEK wrap/unwrap recovers the key.
- **Unit — sync merge:** `bun test --run sync` — last-write-wins by `updatedAt`; tombstones remove records; older incoming writes do not clobber newer local records.
- **Unit — PIN:** `bun test --run pin` — `isValidPin` accepts 4–8 digits, rejects others (existing test still green).
- **API — manager seeded:** after server init with the manager env set, `POST /api/auth/login` with the seeded manager's email+PIN returns 200 with `role:"manager"` and a `sessionToken` (the manager was created without any register call).
- **API — register requires invite:** `curl -sf -XPOST :PORT/api/auth/register -d '{"name":"P","email":"p@x.test","pin":"1234"}'` **without** an invite token returns 403; there is no register path to a manager role.
- **API — login:** `POST /api/auth/login` with valid email+PIN returns 200 + session; wrong PIN returns 401; after the configured failed-attempt threshold returns 423.
- **Admin — PIN reset:** `bun run server/scripts/reset-pin p@x.test 9999` exits 0; the peer then `login`s with PIN `9999` (old PIN no longer works) and a subsequent `GET /api/sync` returns their data unchanged.
- **API — invite lifecycle:** manager `POST /api/invites` → `GET /api/invites/:token` returns `status:"pending"` → peer `register` with the token returns 201 → re-validating the token shows `redeemed` → a second register with it returns 403.
- **API — roster:** manager `GET /api/team/roster` returns the peer (name/email/status only) and **no** expense fields; a peer calling it returns 403.
- **API — revoke:** manager `POST /api/team/:peerId/disable` returns 200; the peer's subsequent `login` returns 403.
- **API — sync isolation:** user A `POST /api/sync` with a record, then user B `GET /api/sync` returns **none** of A's records.
- **API — sync LWW:** push a record, then push the same record id with an older `updatedAt` — the pull still returns the newer version.
- **API — clear data:** authenticated `DELETE /api/account/data` returns 200; a subsequent `GET /api/sync?since=` returns no records.
- **API — auth gate:** `POST /api/process-receipt` / `GET /api/fx` / `POST /api/generate-report` without a session return 401; with a valid session, behave as in Phase 2.

## Manual Verification

Walk through these in a browser. Each is pass/fail.

**Viewport 390px (mobile):**
- [ ] Join screen from an invite link renders full-bleed, no horizontal scroll; name/email/PIN entry usable with large tap targets.
- [ ] Login/Unlock PIN pad is comfortably tappable; "Forgot PIN?" is visible by the entry.
- [ ] Renamed Settings page sections stack cleanly; Clear-data confirm is readable.

**Viewport 1280px (desktop):**
- [ ] Sidebar shows the filled account slot and (for the manager) the Invite/Team entry; sync-status indicator is visible.
- [ ] Profile page shows the former Settings content unchanged; Settings page shows Export/Restore/PIN/Account/Clear-data.
- [ ] Navigation between Profile, Settings, Capture, Expenses, Reports works; old `/setup` and `/backup` URLs redirect.

**User flows:**
- [ ] Join: open a valid invite link → create account (name, email, PIN) → land in an empty private workspace and reach Capture. `[primary]`
- [ ] Invalid invite: open an expired/used/garbage link → clear "ask your manager for a new link" message, not a blank or broken screen.
- [ ] Multi-device sync: create an expense in one browser profile → in a second profile logged into the same account, after sync the expense appears. `[primary]`
- [ ] Isolation: logged in as a peer, there is no way to see the manager's (or any other user's) expenses/receipts/reports; manager's roster shows only name/email/status. `[primary]`
- [ ] Quick unlock: after logging in, re-opening the app prompts for the PIN only (not email), and the correct PIN unlocks.
- [ ] Forgot PIN: tapping "Forgot PIN?" shows plain "ask your administrator" guidance — no email, no self-service reset form.
- [ ] Admin reset: after the operator runs the reset-pin command, the user logs in with the new PIN and their data is intact.
- [ ] Log out: logging out returns to the login screen and the workspace is not reachable without logging back in.
- [ ] Existing-data migration: logging into the seeded manager account on a device with pre-existing local data offers to bring it in; after confirm, the data is present and syncs.
- [ ] Manager revoke: manager revokes a peer → that peer can no longer log in.
- [ ] Clear data: Clear-all-data behind an explicit confirm wipes the workspace on this device and on the server (a fresh login shows no data); the account still exists.
- [ ] Bug fix: the pending-payment card shows the invoice number without breaking mid-token.
- [ ] Regression: capture a receipt (with deskew), generate a report (PDF + Excel one-zip), mark paid — all still work for a logged-in user.

## Definition of Done

This phase is complete when ALL of the following are true:

- [ ] All automated checks pass (exit 0)
- [ ] All manual verifications pass
- [ ] Frontend compliance check passes (handover covers all UI requirements)
- [ ] UX review passes — no blocking issues; strict per-user isolation verified
- [ ] user explicitly approves
- [ ] Living docs updated: README status, WIKI learnings, docs/api.md, docs/decisions.md, docs/architecture.md, CHANGELOG.md
