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

*(Updated per phase)*

## Data Model

*(Updated per phase)*
