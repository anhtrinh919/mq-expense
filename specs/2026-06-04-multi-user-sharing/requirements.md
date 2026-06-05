# Multi-User & Sharing Requirements

---
phase: 3
type: feature
ui: true
---

## Phase type

`feature` — adds invite-only multi-user, accounts, and cross-device sync on top of the proven single-user app. Existing chrome (sidebar/app-shell, design tokens, capture/expenses/reports screens) is preserved; only the account surfaces and the Profile/Settings restructure are new or changed.

## Scope

Turns the single-user, device-local app into an invite-only multi-user tool with cross-device sync. Each invited peer creates their own account (name + email + PIN) and gets a fully private workspace whose data syncs across all their devices through a server-side store that is **encrypted at rest, server-managed** (protected from outsiders and DB theft; not zero-knowledge — so a PIN can be reset by the administrator). The **manager account is seeded server-side by the operator** (not self-registered); the manager generates invite links and sees a name+email roster of who has joined, and can revoke a peer's access; she never sees any peer's expenses, receipts, or reports. On completion a user can: open an invite link and create an account; log in on any device with email + PIN and see their data synced; log out; clear all their data; a user who forgets their PIN has it reset by the administrator (out-of-band); and the manager's existing on-device history is migrated into her account on first login. Also folds in three Phase-2 carry-overs: rename the Settings page to **Profile** and the Backup page to **Settings** (now home to export, restore, PIN/security, account, and clear-data), fix the invoice-number text-wrap on the pending-payment card, and add "clear all my data."

## User Stories

- As an invited peer, I can open an invite link and create my own account with a name, email, and PIN so that I get my own private workspace. `[Join (Ph3), Steps 1–4]`
- As a peer, my expenses, receipts, and reports are visible only to me — not to the manager or any other user — so that my financial data stays private. `[Join (Ph3), Step 4]`
- As a user, I can log in on any device with my email + PIN and see my own data synced so that I can work from my phone or laptop interchangeably. `[Account (Ph3), Steps 1–2]`
- As a user, once logged in on a device, I can quickly re-open the app by entering just my PIN so that daily use is fast. `[Account (Ph3), Step 2]`
- As a user who forgot my PIN, I can ask the administrator to reset it (out-of-band) and then log in with the new PIN without losing any data, so that I'm never permanently locked out. `[Account (Ph3), Step 3]`
- As a user, I can log out of a device so that my data isn't accessible if the device is shared or lost. `[Account (Ph3), Step 4]`
- As the manager, when I first log into my seeded account on my existing device, my existing on-device expense history is brought into my account and synced so that nothing is lost. `[Account (Ph3), Steps 1–2]`
- As the manager, I can generate an invite link and share it so that a peer can join the tool. `[Invite (Ph3), Step 1]`
- As the manager, I can see a roster of who has joined (name + email + status) so that I know my team is set up — without ever seeing their expenses. `[Invite (Ph3), Step 2]`
- As the manager, I can revoke a peer's access so that someone who leaves the team can no longer log in or sync. `[Invite (Ph3), Step 3]`
- As a user, I can clear all my data and start fresh (wiping it on this device and on the server) so that I can reset my workspace. `[Account (Ph3), Step 5]`

## UI Requirements

Every screen in this phase. Account surfaces (Join, Login/Unlock) are full-bleed (no app shell), like the Phase 2 Onboarding/PIN screens. Invite/roster lives inside the renamed **Settings** page (and/or a manager-only nav slot). The reserved account slot in the sidebar footer is filled this phase.

| Screen | State | Key UI Elements | Primary User Action |
|--------|-------|-----------------|---------------------|
| Join / Create account | Default (valid invite) | Welcome + inviter context; name, email, PIN + confirm-PIN fields; create button | Fill details, create account |
| Join / Create account | Invalid / expired / used invite | Clear message that the link is no longer usable; ask manager for a new one | (no action — dead end with guidance) |
| Join / Create account | Validating | Brief checking-invite indicator | (wait) |
| Join / Create account | Error (email taken / weak PIN / network) | Inline field/error message + retry | Correct and resubmit |
| Join / Create account | Mobile | Single-column full-bleed, large tap targets | same |
| Login / Unlock | Default (returning, known device) | PIN entry (JetBrains Mono digits), "Forgot PIN?" link | Enter PIN to unlock |
| Login / Unlock | Default (new device / logged out) | Email + PIN entry, "Forgot PIN?" link | Log in |
| Login / Unlock | First login with existing local data | Notice that on-device data was found, offer to bring it into the account | Confirm migrate data |
| Login / Unlock | Wrong PIN | Error message + remaining-attempts hint | Retry |
| Login / Unlock | Locked out (too many attempts) | Temporary-lock message + how long to wait | Wait |
| Login / Unlock | Account disabled | Message that access was revoked; contact manager | (no action) |
| Login / Unlock | Forgot PIN | Plain guidance: "Ask your administrator to reset your PIN" — no email, no self-service | (no action — contact admin) |
| Login / Unlock | Mobile | Full-bleed, large numeric pad | same |
| Invite & Team (manager, in Settings) | Default | "Generate invite link" action; copyable link; roster list (name, email, status, joined date); per-row revoke | Generate link, copy, revoke |
| Invite & Team (manager) | Empty (no one joined) | Prompt explaining invites + the generate action | Generate first invite |
| Invite & Team (manager) | Link generated | The link with a copy button + expiry note | Copy and share |
| Invite & Team (manager) | Revoke confirm | Confirmation prompt before revoking a peer | Confirm revoke |
| Profile (renamed from Settings) | Default | Profile / Invoice To / Bank / Country Codes / Base Currency sections (unchanged content) | Edit and save profile fields |
| Settings (renamed from Backup) | Default | Sections: Export backup, Restore from backup (moved here), PIN / Security (change PIN), Account (logged-in-as, log out), Danger zone (clear all my data) | Manage data + account |
| Settings | Clear-data confirm | Explicit destructive confirmation naming what is wiped (local + server) | Confirm clear |
| Settings | Mobile | Stacked sections | same |
| App shell | Sync status indicator | Small synced / syncing / offline indicator; manager sees the Invite/Team entry | (passive / navigate) |
| Home / dashboard | Pending-payment card (bug fix) | Invoice number no longer breaks mid-token; amount aligned | (passive) |

## Data Model

### Client (IndexedDB via Dexie — schema version 4)

Existing stores (`profile`, `countryCodes`, `expenses`, `images`, `reports`, `drafts`) are retained. Records gain sync metadata; a new local session/account record is added.

```
Account (local session state, singleton key "account")
- accountId: string — server account id once registered/logged in
- email: string
- name: string
- role: "manager" | "peer"
- sessionToken: string | null — current session; null when logged out
- pinHashLocal: string — local hash for offline quick-unlock (existing pin.ts mechanism)
- lastSyncCursor: string | null — server change cursor for incremental pull
- updatedAt: number

Sync metadata added to syncable records (expenses, images, reports, profile, countryCodes)
- updatedAt: number — already present on profile/expenses; added where missing (last-write-wins key)
- deletedAt: number | null — tombstone for deletes so removals propagate
```

### Server (SQLite — single file on homepc-1)

```
accounts
- id: text pk
- email: text unique (case-insensitive)
- name: text
- role: text — "manager" | "peer" (the single manager row is seeded by the operator on server init; all "peer" rows are created via invite)
- pin_hash: text — salted hash of the PIN (scrypt/bcrypt), for login auth
- pin_salt: text
- enc_dek: blob — per-user data-encryption key, wrapped under the server master key
- invited_by: text null — accounts.id of the manager who invited this peer
- disabled: integer — 0/1; disabled accounts cannot log in or sync
- failed_attempts: integer — login lockout counter
- locked_until: integer null — epoch ms while temporarily locked
- created_at: integer

invites
- token: text pk — opaque random token used in the invite link
- created_by: text — accounts.id (manager)
- email: text null — optional pre-fill / intended recipient
- status: text — "pending" | "redeemed" | "revoked" | "expired"
- redeemed_by: text null — accounts.id once consumed
- expires_at: integer
- created_at: integer

sessions
- token: text pk — opaque session token (sent as bearer/cookie)
- account_id: text
- created_at: integer
- expires_at: integer

sync_records (per-user encrypted data store; server cannot read contents without the user's wrapped DEK)
- account_id: text — owner; every query is scoped to the authenticated account
- store: text — "expenses" | "images" | "reports" | "profile" | "countryCodes"
- record_id: text — the client record id
- ciphertext: blob — AES-256-GCM of the record JSON, under the per-user DEK
- iv: blob
- updated_at: integer — last-write-wins key
- deleted: integer — tombstone
- pk (account_id, store, record_id)
```

## API Contracts

All new data/account endpoints are JSON. Auth is a session token from login/register (bearer header or http-only cookie). Existing `/api/fx`, `/api/process-receipt`, `/api/generate-report` gain a session requirement (they remain stateless processors) so a public URL can't be abused; their request/response bodies are otherwise unchanged. `/api/health` is unchanged and public.

### Register account (peer, via invite)
- **Method + path:** `POST /api/auth/register`
- **Auth required:** No
- **Request body:** `{ inviteToken: string, name: string, email: string, pin: string }`
- **Success response:** `{ sessionToken, accountId, role: "peer", name, email }` — 201
- **Error responses:**
  - `400`: missing field / invalid email / PIN not 4–8 digits / missing invite token — `{ error }`
  - `403`: invite token invalid, expired, already redeemed, or revoked — `{ error }`
  - `409`: email already registered — `{ error }`
  - `500`: unexpected
- **Rule:** registration **always** requires a valid `inviteToken`. There is no self-registration path to a manager. The single manager account is **seeded server-side from config** on server init (see Constraints), never created through this endpoint.

### Log in
- **Method + path:** `POST /api/auth/login`
- **Auth required:** No
- **Request body:** `{ email: string, pin: string }`
- **Success response:** `{ sessionToken, accountId, role, name, email }` — 200
- **Error responses:**
  - `401`: wrong email or PIN — `{ error }`
  - `403`: account disabled (access revoked) — `{ error }`
  - `423`: temporarily locked after too many failed attempts — `{ error, lockedUntil }`
  - `500`: unexpected

### Log out
- **Method + path:** `POST /api/auth/logout`
- **Auth required:** Yes
- **Success response:** `{ ok: true }` — 200
- **Error responses:** `401` unauthenticated · `500`

### PIN reset (no API — administrator out-of-band)
There is **no PIN-reset endpoint and no auth email**. A user who forgets their PIN contacts the administrator (the operator), who resets it with a small admin command run against the server (see Constraints → "Admin PIN reset"). Because the encryption is server-managed (the data key is independent of the PIN), the reset sets a new PIN hash without touching the user's data.

### Create invite (manager)
- **Method + path:** `POST /api/invites`
- **Auth required:** Yes (role must be manager)
- **Request body:** `{ email?: string }`
- **Success response:** `{ token, link, expiresAt }` — 201
- **Error responses:** `401` unauthenticated · `403` not a manager · `500`

### Validate invite (for the Join screen)
- **Method + path:** `GET /api/invites/:token`
- **Auth required:** No
- **Success response:** `{ status: "pending" | "redeemed" | "revoked" | "expired", email?: string }` — 200
- **Error responses:** `404` unknown token · `500`

### Team roster (manager)
- **Method + path:** `GET /api/team/roster`
- **Auth required:** Yes (manager)
- **Success response:** `{ members: [{ accountId, name, email, status: "active" | "disabled", joinedAt }] }` — 200 (never includes any expense/report data)
- **Error responses:** `401` · `403` not a manager · `500`

### Revoke a peer (manager)
- **Method + path:** `POST /api/team/:accountId/disable`
- **Auth required:** Yes (manager)
- **Request body:** `{}`
- **Success response:** `{ ok: true }` — 200 (sets the peer `disabled`; existing sessions invalidated)
- **Error responses:** `401` · `403` not a manager / cannot disable self · `404` unknown account · `500`

### Pull changes (sync)
- **Method + path:** `GET /api/sync?since=<cursor>`
- **Auth required:** Yes
- **Query params:** `?since=string` (omit/empty for a full pull)
- **Success response:** `{ records: [{ store, recordId, data, updatedAt, deleted }], cursor }` — 200 (server decrypts the authenticated owner's records to return them; scoped strictly to the caller's `accountId`)
- **Error responses:** `401` · `403` disabled · `500`

### Push changes (sync)
- **Method + path:** `POST /api/sync`
- **Auth required:** Yes
- **Request body:** `{ records: [{ store, recordId, data, updatedAt, deleted }] }`
- **Success response:** `{ applied: number, cursor }` — 200 (last-write-wins per `(store, recordId)` by `updatedAt`; encrypts at rest under the caller's DEK)
- **Error responses:** `400` malformed records · `401` · `403` disabled · `500`

### Clear my data
- **Method + path:** `DELETE /api/account/data`
- **Auth required:** Yes
- **Success response:** `{ ok: true }` — 200 (deletes all `sync_records` for the account on the server; the client wipes its local IndexedDB in the same flow; the account itself remains)
- **Error responses:** `401` · `500`

## Constraints & Context

- **Privacy posture (amended this phase, with user sign-off):** the server now stores user data, but **encrypted at rest under a server-managed key**, scoped strictly per account. This is a deliberate, signed-off softening of the former "server persists nothing" rule — see updated `mission.md` and `tech-stack.md`. The honest guarantee is: protected from outsiders and DB-file theft, recoverable via PIN reset; not zero-knowledge (the running server can decrypt).
- **Strict per-user isolation:** every data/sync query is scoped to the authenticated `accountId`. No endpoint returns another user's expense/receipt/report data. The manager roster exposes only name/email/status — never expense data.
- **PIN is the only secret:** 4–8 digits (existing `isValidPin`). It authenticates to the server (login) and unlocks the device. Because a numeric PIN is brute-forceable, the server enforces failed-attempt lockout. No separate text password.
- **Manager is seeded, not registered:** on server init the single manager account is created from config (`MQX_MANAGER_EMAIL`, `MQX_MANAGER_NAME`, `MQX_MANAGER_PIN`) if it does not already exist — mirroring the Phase 2 dogfood env-seed pattern. The app exposes no way to self-create a manager; every in-app account is an invited peer.
- **Admin PIN reset (no email):** there is no in-app reset and no auth email. A forgetful user contacts the operator, who runs a small admin command (an `server/scripts/reset-pin` script, or an equivalent Claude Code operation against the SQLite file) to set a new PIN hash for that account. Server-managed encryption keeps the data key independent of the PIN, so the reset never loses data.
- **Local-first preserved:** IndexedDB remains the working store (offline-capable, fast); the server is a sync backend. Reuse the existing `.mqx` serialization shape (`backup.ts`) for record payloads where practical.
- **Existing-data migration:** on first login on a device that already holds local data (the manager's Phase 1/2 device), offer to bring that data into the account and push it to sync.
- **Preserve everything frozen:** output format (PDF/Excel/invoice numbering/Notes), capture flow, deskew, currency math, design tokens, and the app-shell are unchanged. Build account screens from the Phase 3 design file; reuse Phase 1/2 components.
- **Dependencies pinned exactly** (no `^`/`~`); strict TypeScript; OS-agnostic browser support — all unchanged constraints from `tech-stack.md`.

## Excluded from This Phase

- **Public self-registration** — every in-app account requires an invite; the manager account is seeded by the operator, never self-registered.
- **In-app PIN reset / any auth email** — there is no self-service reset and the app sends no email; a forgotten PIN is reset out-of-band by the administrator.
- **Zero-knowledge / end-to-end encryption** — explicitly declined in favor of recoverable, server-managed encryption.
- **Shared visibility of expense data** — the manager sees only the name/email roster, never any peer's expenses, receipts, or reports.
- **Account deletion (vs. data clear)** — "clear all my data" wipes data but keeps the account; full account deletion is not in this phase.
- **Account transfer/merge** — out of scope.
- **Real-time / push sync** — sync runs on app events (open, save, periodic), not a live socket.
- **Production deployment, public URL, Cloudflare tunnel** — Phase 4. Phase 3 is built and exercised locally / over a temporary tunnel.
- **Native mobile app, approval workflows, finance-system integration, global country-code library** — remain globally out of scope.
