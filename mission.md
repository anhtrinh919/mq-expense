# Mission — MQ Expense

## Purpose
Lets a Macquarie University sales rep photograph a receipt, automatically read and convert it to VND, and export a complete submission-ready invoice + expenses + receipts package that Finance accepts — without any manual spreadsheet math.

## Target Users
- **Primary:** The user's wife — a Macquarie SEA sales manager who already runs a working single-user expense pipeline in production and needs it converted to a web app that works from any device.
- **Secondary:** Her peer Macquarie SEA sales reps who have directly asked to use the same tool. Same invoice target (Macquarie University), same finance submission process, similar country codes (VN/TH/KH/MM/AU).

This is a small private team tool, not a public product. Phase 1 is single-user only (no accounts) — and ships **only** single-user screens; the account/invite/join experience is introduced whole in Phase 3 (invite-only). Phase 1 navigation is built forward-compatibly so accounts can slot in later, but Phase 1 neither draws nor stubs any Phase 3 screen.

## Vision & Tone
MQ Expense feels like a quiet, competent assistant that handles the tedious parts of expense reporting — reading foreign receipts, doing currency math, formatting the PDF exactly how Finance wants it — so the sales rep never has to think about it. The interface is calm and functional: open it, photograph a receipt, close it. Come back at the end of the month, hit "Generate Report," download the file, email it. No friction, no surprises, no data leaking anywhere it shouldn't.

## Success Looks Like
- A rep photographs a messy Vietnamese or Cambodian receipt, and the app correctly reads the date and amount without any manual correction.
- At month end, the rep clicks "Generate Report," downloads one PDF and one Excel, and emails them directly to their Macquarie Finance contact — the same workflow they use today, but faster and more reliable.
- A rep who loses or changes their laptop re-imports their data from a backup file and is fully operational again within minutes.
- (Phase 3) The wife invites a peer via a link; the peer opens the app on their phone, sets up their own profile, and starts capturing expenses — their data is invisible to everyone else.

## Privacy & Data Posture

> **Amended in Phase 3 (multi-user & sharing), with user sign-off.** Phases 1–2 were strictly device-local with a stateless server. Phase 3 introduces accounts and cross-device sync, which requires the server to store user data. The privacy guarantee changed deliberately — from "the server stores nothing" to "the server stores only data it has encrypted, scoped strictly per user." The text below reflects the Phase 3 onward posture.

Each user's data is **local-first**: the working copy of their expenses, profile, invoice/bank details, receipt images, and reports lives in their own device's local storage (IndexedDB), exactly as before. The app is fully usable offline.

To sync across a user's own devices, that data is also stored on the server **encrypted at rest, scoped strictly to that one account**. The encryption is **server-managed** (so a forgotten PIN can be reset and a user can never be permanently locked out) — meaning it is protected against outsiders and database-file theft, but it is *not* zero-knowledge: the running server can decrypt a user's data to serve it back to them. This trade was chosen for recoverability and convenience.

**Strict per-user isolation is absolute.** No user can see another user's expenses, receipts, or reports — not even the manager who sent the invite. The manager sees only a roster of who has joined (name, email, status). Every data request is scoped to the authenticated account.

For every receipt the record still retains **both images**: the original colour photo (a user safety-net) *and* the cleaned black-and-white scan used in the submission package — now synced (encrypted) across the user's devices.

Receipt *processing* remains transient: a photo passes through the server's RAM only for the few seconds it takes the AI to read it and produce the B&W scan, and is never written to disk as part of processing. (It is the user's own synced data store, not the processing path, that now persists encrypted.)

Backup remains user-controlled in addition to sync: a user can still export their own data file and import it on any device.

## Design Tool
claude-code-impeccable

## Master User Journey

### Core Jobs (Why this exists)
- When I incur a work expense abroad, I need to log it accurately in VND, so I can be reimbursed without manual spreadsheet math.
- When it's time to claim, I need a single submission-ready document, so I can send Macquarie one PDF and one Excel and get paid.
- When I switch or lose a device, I need to back up and restore my own records, so my history is safe without anyone else holding my data.
- *(Phase 3)* When my peers face the same expense pain, I need to invite them to their own private copy, so they benefit without seeing each other's data.

### Named Flows (with phase)

**Setup (Ph1):** Open app → On one Setup page, fill the Profile / Invoice To / Bank Details / Country Codes / Currency Settings sections → Ready to capture

**Capture (Ph1):** Upload receipt photo → Pick country + enter description → AI reads date + amount → App converts to VND at the recorded rate → Both the original photo and the B&W scan are saved with the expense → Saved to expense log

**Report (Ph1):** Pick a date period → Review included expenses → Generate submission PDF + Excel → Download both → (User emails to Macquarie Finance — outside the app)

**Archive & Backup (Ph1):** Mark report paid → Archive it → Export all data as a backup file → Import file on a new device

**Invite (Ph3):** Manager generates an invite link → Shares it with a peer → Sees the peer appear on the name+email roster → (if needed) Revokes a peer's access

**Join (Ph3):** Receive invite link from manager → Open it on any device → Create own account (name, email, PIN) → Own private workspace ready (existing on-device data brought in if present) → Start capturing exactly like the single-user flow

**Account (Ph3):** Log in on any device with email + PIN → Quick-unlock with PIN thereafter → If PIN forgotten, ask the administrator to reset it (out-of-band; no email) → Log out → (or) Clear all own data and start fresh — with expenses syncing privately across the user's devices throughout. *(The manager account itself is seeded by the operator, not self-registered.)*
