> Agent context — not for human reading.

# Architecture — MQ Expense

## Tech Stack

See `tech-stack.md` for the full stack and decisions.

**Summary:**
- Frontend: React 18 + Vite (SPA, TypeScript)
- Local storage: IndexedDB via Dexie.js (all user data — zero server persistence)
- Server: Node.js + Express (TypeScript, stateless API)
- Processing: Python subprocesses (Pillow for image scanning, openpyxl for Excel, pypdf for PDF assembly)
- Receipt AI: `claude -p` shelled out on homepc-1
- Currency: xe.com rate at capture time, 1h server-side cache
- Deployment: homepc-1 (always-on), Tailscale for remote access

## Data Flow

```
Client (browser / IndexedDB)
  ↕ HTTP (stateless)
Node.js Express server (homepc-1)
  ↕ subprocess
Python processing (Pillow / openpyxl / pypdf / claude -p)
```

No data persists on the server between requests.

## Component Structure

- **App gating (`src/App.tsx`):** routes on profile state — `onboardingComplete === false` → full-bleed Onboarding wizard; a set PIN + locked session → full-bleed PIN lock; otherwise the normal sidebar/app-shell. The Onboarding and PIN-lock surfaces render *outside* `AppShell`.
- **Full-bleed surfaces (Phase 2):** `Onboarding` (welcome → details → set-PIN → done → restore) and `PinLock` (default entry + no-data-loss reset).
- **App shell (`src/components/AppShell.tsx`):** sidebar + mobile bottom-nav with center capture FAB; nav node renamed Setup → **Settings**. The sidebar footer reserves an account slot for Phase 3.
- **Settings (`src/screens/Settings.tsx`):** absorbs the old Setup page plus Base Currency, Security (Change PIN), and Restore sections.
- **Capture v2:** background pre-read of a batch while the user reviews the first item, a review-all summary step, and draft autosave so navigation never loses in-progress input.

## Data Model

User data lives only in the browser via Dexie.js (db name `mq-expense`, **schema version 3**). Stores: `profile` (singleton keyed `"profile"`), `countryCodes`, `expenses`, `images`, `reports`, `drafts`.

- **`profile` (singleton):** holds the user's details plus `baseCurrency` (per-user reimbursement currency), `onboardingComplete`, and `pinHash` (soft-lock; null when no PIN set). *Phase 3 note: the singleton profile is the main thing multi-user has to rethink — either per-account profiles or per-device-is-per-user.*
- **`drafts`:** autosaved in-progress Setup/Settings and Capture input, restored on reload.
- The server persists none of this — it passes receipt photos through in-memory and discards them after returning the scan.
