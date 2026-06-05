# Tech Stack — MQ Expense

## Choices

- **Language:** TypeScript (frontend + server); Python 3 (server-side processing — receipt scanning, PDF assembly, Excel generation)
- **Frontend framework:** React 18 + Vite (single-page app; served as static files by the Node server)
- **Backend framework:** Node.js + Express (TypeScript; delegates heavy processing to Python subprocesses). *Phase 1–2: stateless. Phase 3+: also a sync backend with a small datastore (below).*
- **Local storage:** IndexedDB via Dexie.js (the local-first working store; fully usable offline)
- **Server datastore (Phase 3+):** SQLite, single file on homepc-1 — stores accounts, invites, sessions, and each user's **encrypted-at-rest** synced records. No separate DB server.
- **At-rest encryption (Phase 3+):** AES-256-GCM; a per-user data key wrapped under a server master key (env secret). Server-managed (recoverable), not zero-knowledge.
- **Auth (Phase 3+):** the manager account is **seeded from config** on server init; all other accounts are invite-only. Identity = email, secret = PIN (4–8 digits) with server-side salted hashing + failed-attempt lockout; opaque session tokens. A forgotten PIN is reset out-of-band by the operator (an admin script) — no auth email.
- **Receipt reading:** `claude -p` (Claude Code headless/print mode) shelled out on homepc-1; free OCR API (Tesseract or Google Vision free tier) as fallback if `claude -p` is unavailable
- **Receipt scanning / PDF processing:** Python (Pillow for image processing — grayscale, auto-crop, deskew, contrast; img2pdf + PyPDF2/pypdf for PDF assembly)
- **Excel generation:** Python openpyxl (preserving the proven existing pipeline)
- **Currency conversion:** xe.com rate fetched at capture time; markup applied per user config (default 3%); rate cached in-memory on the server for 1 hour to avoid hammering xe.com
- **Hosting / Deployment:** Node.js process on homepc-1 (already the user's SSH hub); accessible via the home network + Tailscale for remote access from any device
- **Testing:** Vitest (frontend unit tests); no server-side test framework in Phase 1 — manual validation against the existing cowork pipeline outputs

## Constraints & Non-Negotiables

- **Local-first working store:** The client's IndexedDB is the working copy of all data; the app is fully usable offline. *(Phase 1–2: the server persisted nothing. Phase 3+: the server also keeps a per-user, encrypted-at-rest, per-account-scoped copy solely for cross-device sync — see Privacy & Data Posture in `mission.md`.)*
- **Strict per-user isolation:** Every server data/sync query is scoped to the authenticated account. No endpoint returns another user's expense/receipt/report data. The manager roster exposes name/email/status only.
- **Receipt privacy (processing path):** During receipt *reading*, a photo is held in server RAM only for the duration of the `claude -p` subprocess call and never written to disk as part of processing. (A user's own synced receipt images are stored encrypted in the datastore.)
- **OS-agnostic access:** The web app must work correctly in Chrome, Safari, and Firefox on macOS, Windows, iOS, and Android. No desktop-only APIs.
- **Strict TypeScript from commit 1:** `strict: true` in tsconfig. No `any` without an explicit comment explaining why.
- **All dependencies pinned exactly:** No `^` or `~` in package.json or requirements.txt. Reproducible builds are required because homepc-1 is the only deployment environment and we cannot tolerate surprise upgrades.
- **Preserve existing output format:** The combined PDF structure (invoice → expense detail → merged receipts) and the Excel layout must match what Macquarie Finance already accepts from the cowork pipeline today. Do not change the format without explicit user sign-off.

## Explicit Exclusions

- **No server-side database** *(reversed in Phase 3, with user sign-off):* Phases 1–2 held this line. Phase 3 adds a SQLite datastore on homepc-1 storing accounts + per-user encrypted-at-rest records, solely to sync across a user's own devices. The earlier "no DB" stance is superseded by the amended Privacy & Data Posture.
- **No third-party cloud storage (S3, GCS, etc.):** Still excluded. The Phase 3 store is the project's own SQLite file on homepc-1 — no external cloud-storage dependency.
- **No authentication in Phase 1:** Phase 1 is single-user. The app is accessed directly on the user's device. Accounts and invite-only access are Phase 3.
- **No email-sending from the app:** Out of scope by design. The user downloads the PDF and emails it themselves.
- **No global country code list:** Deferred to Future. Users manage their own country → account code mappings.
- **No Macquarie Finance integration:** Out of scope. Manual download-and-email is the intended workflow.
- **No React Native / Electron:** Web app only. OS-agnostic browser access was a hard constraint.
- **No Next.js / server-side rendering:** The app is local-first with IndexedDB; SSR adds complexity with no benefit when the server holds no data.

## Key Technical Decisions

| Decision | Why | Alternatives Rejected |
|----------|-----|-----------------------|
| Python for receipt processing, Node.js for the API server | The existing cowork pipeline is Python (Pillow, openpyxl, PDF tools) and is proven. Rewriting it in Node.js/TypeScript would add risk with no user benefit. Python subprocess called from Node.js is a clean boundary. | Full Python server (FastAPI) — rejected because the frontend tooling (Vite, TypeScript) ecosystem is stronger in Node.js; Full Node.js — rejected because rewriting the proven processing pipeline adds risk |
| Dexie.js over raw IndexedDB | Dexie provides a typed, Promise-based wrapper over IndexedDB with schema versioning and migration support. Raw IndexedDB is verbose and error-prone for complex queries. | localForage — simpler but no schema versioning; SQLite WASM — heavier and less mature for production browser use |
| `claude -p` for receipt reading (not a third-party OCR API) | homepc-1 already runs Claude Code under the user's existing Claude plan — zero marginal cost. AI-vision understands messy, foreign-language receipts (Vietnamese, Thai, Khmer) far better than classical OCR. | Google Cloud Vision — paid API, external data transfer; Tesseract — free but poor on handwriting and Asian scripts; kept as fallback only |
| xe.com rate (not a free forex API) | The user's existing cowork pipeline uses xe.com. The output must match what they use today for auditing consistency. | exchangerate.host, Open Exchange Rates — different from existing pipeline, would produce different VND figures for the same transaction |
| Express + Vite (SPA) over a meta-framework | Simplest deployment: Vite builds to static files, Express serves them plus the API. No build-time server rendering needed — all data is client-local. Easier to deploy on homepc-1 as a single `node server.js` process. | Next.js — overkill for a local-first app with no SSR data needs; SvelteKit — unfamiliar stack |
| Tailscale for remote access | homepc-1 is behind a home NAT. Tailscale provides secure, zero-config access from any device without port-forwarding or VPN setup. | Cloudflare Tunnel — workable but adds a dependency outside the user's control; ngrok — not suitable for always-on production |
| SQLite for the Phase 3 datastore | Single-file, zero-admin, fits the single homepc-1 process; enough for a small private team. | Postgres — needs a separate server/process for no benefit at this scale; a hosted DB — external dependency the user doesn't control |
| Server-managed at-rest encryption (not zero-knowledge) | User chose recoverability over zero-knowledge: a forgotten PIN must be resettable and never permanently lock anyone out. AES-256-GCM with a per-user key wrapped under a server master key protects against DB theft while allowing reset. | Zero-knowledge E2E (key from PIN) — rejected by user because forgotten PIN = permanent data loss; plaintext storage — rejected as too exposed for bank details |
| PIN as the sole credential (email = identity) | User wanted no separate password — just a PIN. Email is collected for the manager roster + reset delivery, not as a password. Server-side salted hashing + lockout compensates for the small PIN keyspace. | Email + text password — rejected by user as extra to remember; PIN with no server hash — rejected as brute-forceable |
| Record-level sync with last-write-wins | A user edits their own data on few devices with low concurrency; per-record LWW + tombstones is robust and simple, and reuses the existing `.mqx` serialization. | Whole-dataset overwrite — risks clobbering edits made on another device; CRDT/merge — overkill for single-user-per-account |
