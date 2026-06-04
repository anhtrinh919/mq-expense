# Phase 3 Handoff — MQ Expense (Multi-User & Sharing)

> Read this first in a fresh session before starting Phase 3. It captures where the project
> stands and the decisions Phase 3 must resolve. It is NOT the SDD `/frontend` handover —
> that gets written later, inside Phase 3's own cycle, after the design step.

## Where the project is right now

- **Phase 1 (Single-User Expense Flow)** — shipped, merged to `main`.
- **Phase 2 (Onboarding, Polish & Quality)** — built, tested, dogfooded. **Lives on branch `phase-2-onboarding-polish`, NOT yet merged to `main` (≈18 commits ahead).** The merge happens automatically at the start of the next `/build` (the `/spec` Mode 3 wrap step). Do not hand-merge it first.
- `.build-state.json` = `{ phase: 2, feature: "onboarding-polish", step: "phase-complete", … }`. Starting Phase 3 = the **next-feature path**: `/build` → `/ba` Mode 3 (wrap Phase 2 + merge) → `/ba` Mode 2 (scope Phase 3) → `/spec` → `/frontend` → `/backend` → `/sdd-review`.
- A dogfood dev server may still be running (Vite :5173 proxying API :8787). If a new session needs it gone, say "stop dogfood" or kill the `dogfoodPid` in `.build-state.json`.

## What Phase 3 delivers (from roadmap.md)

Invite-only multi-user. Phase 3 **owns all account UI** — three new screens designed/built whole here, never stubbed earlier:
- **Invite** (manager view) — the wife generates invite links/codes for peers.
- **Join** (peer onboarding) — a peer accepts an invite, sets up their own profile, enters their own workspace.
- **Account** — login/logout, session management.

Each peer gets a **fully private workspace; data still lives only on their own device**; strict per-user isolation (no cross-visibility, not even for the inviting manager). Built and exercised locally / over a temporary tunnel — the permanent public URL is Phase 4, not now.

Named flow already in the constitution — **Join (Ph3):** Receive invite link → Open on any device → Create account / set password → Fill own profile → Own private workspace ready → Capture exactly like the single-user flow.

## The hard architectural question Phase 3 must answer FIRST

The whole product is built on **"the server persists nothing"** (a locked, non-negotiable constraint in `tech-stack.md` and `mission.md`). Multi-user normally needs the server to store accounts, password hashes, sessions, and invites. These collide. `/ba` Mode 2 for Phase 3 must resolve, with the user, exactly how multi-user works without breaking the zero-server-storage promise. Candidate shapes to put in front of the user (do not pick silently — this is user-facing and changes the privacy story):

- **Local-only accounts, server only mints/validates invites in memory.** Each device holds its own account + data (as today); an "invite" is a signed token (link/code) the server can validate without storing user data. "Login" is really unlocking the local workspace (the Phase 2 PIN generalizes to this). Keeps the zero-storage promise intact but "accounts" are per-device, not portable without the existing `.mqx` backup/restore.
- **Minimal server identity store (the one allowed exception).** Server stores ONLY auth records (email + password hash + invite status) — never expense/receipt/report data. This is a real softening of the constraint and must be an explicit, signed-off decision, with the privacy copy updated everywhere.
- **Hybrid:** server stores nothing durable; invites + sessions are stateless signed tokens (JWT-style); identity is proven per-device. Cross-device continuity still relies on backup/restore.

Whichever is chosen, the per-user **data isolation** promise (no cross-visibility) is trivial if data stays device-local, and becomes a real access-control problem the moment anything is centralized — flag that trade-off.

Other things for `/ba` Mode 2 to drill: how an invite is delivered (link vs short code), what "login" means if data is device-local, whether a peer can use the app on multiple devices, what the manager can and cannot see (roadmap says: nothing), and how Phase 2's PIN relates to the new Account/login concept (likely they merge).

## Decisions already locked (carry forward, don't re-litigate)

- Local-first, **server persists nothing** (the constraint above — Phase 3 must work within or explicitly amend it with sign-off).
- Invite-only; **no public self-registration** (global Out of Scope).
- No cross-user visibility, including for the inviting manager.
- Reimbursement currency is **per-user** (built in Phase 2: `profile.baseCurrency`); in Phase 3 it becomes per-account. Settings already treats it as a normal per-user setting.
- Output format (combined PDF order, Excel layout, invoice numbering, Notes string) is frozen and Finance-accepted — unchanged by Phase 3.
- Design system is fixed (`specs/2026-06-04-single-user-flow/design-tokens.css`; Inter / Instrument Serif / JetBrains Mono; sidebar + mobile bottom-nav shell). The shell already **reserves an account slot** in the sidebar footer — Phase 3 fills it; don't redesign the shell.
- Production deployment (homepc-1 + Cloudflare, permanent URL) is **Phase 4, after** Phase 3 — build and prove multi-user locally first.

## Key code anchors a Phase 3 session should know

- **Data layer:** `src/data/db.ts` (Dexie, db name `mq-expense`, currently at version 3; stores: profile/countryCodes/expenses/images/reports/drafts). `profile` is a **singleton** keyed `"profile"` today — multi-user will need to rethink this (per-account profiles, or per-device-is-per-user). `src/data/repos.ts`, `src/data/types.ts`.
- **App gating / routing:** `src/App.tsx` already gates on `onboardingComplete` (→ `Onboarding`) and `pinHash` + locked session (→ `PinLock`). The Account/login gate slots in here naturally.
- **Onboarding + PIN (Phase 2):** `src/screens/Onboarding.tsx`, `src/screens/PinLock.tsx`, `src/lib/pin.ts` — the soft-lock model that the Account concept likely generalizes.
- **Settings:** `src/screens/Settings.tsx` (absorbed Setup; holds profile, base currency, Security/PIN, Restore).
- **Shell / nav:** `src/components/AppShell.tsx` (+ `.css`) — the reserved account slot is here; nav node "Settings".
- **Server (stateless):** `server/index.ts`, `server/routes/{processReceipt,fx,generateReport,health}.ts`. Any Phase 3 auth/invite endpoints land here and must honor the storage constraint decided above.
- **Design:** Phase 2 design file `pencil/v0.1-p2.pen`; Phase 1 `pencil/v0.1.pen`. Phase 3 adds Invite/Join/Account frames (external-pencil track has been the choice; `/frontend` re-asks the track at phase start).

## Environment / workflow reminders for the new session

- **Subagents freeze in this remote-control-UI environment — run all SDD sub-skills INLINE** (do not spawn `Agent` for `/ba`, `/spec`, `/frontend`, `/sdd-review`).
- The Pencil app socket is usually unreachable here — **read `.pen` files directly as JSON** (they're plain JSON: `version`, `children`, `variables`).
- **No git remote** is configured — work is committed locally only. If off-machine backup matters before Phase 3, add a remote first.
- `/eli` plain-language summary after every gate (the user is non-technical — outcomes, not code).
- Express times to the user as **VN time (UTC+7)**.
- Integration testing gotcha: kill any stale listener on the API port before probing, or you'll test old code (`lsof -nP -iTCP:8787 -sTCP:LISTEN -t | xargs kill -9`).

## To start Phase 3

In a fresh session, just run **`/build`**. It will read `.build-state.json` (`phase-complete`), merge Phase 2 into `main`, update the living docs, then begin Phase 3 scoping with `/ba` Mode 2 — where the architectural question above is the first thing to settle with the user.
