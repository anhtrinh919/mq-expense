# Product — MQ Expense

## End-State Vision
MQ Expense is a focused, private expense tracker that lives in a browser tab and never asks anything of you except to photograph receipts and generate the report at month end. The finished product has five clean areas: Setup (one page with all your set-once config — profile, invoice recipient, bank details, country codes, currency settings — grouped into sections), Capture (photograph a receipt and let the AI do the reading), Expenses (your running log — editable, filterable), Reports (generate and download submission packages), and Backup (export/import your data). In Phase 3 the team-manager and onboarding screens (Invite / Join / Account) are added. Navigation is shallow — every function is one or two taps away. The tone is utility-first: no dashboard clutter, no social features, no notifications. It should feel like a well-designed form tool that just works.

## Screen Inventory

| Screen | Purpose | Phase |
|--------|---------|-------|
| Setup | Single page of set-once config, grouped into sections: **Profile** (submitter name, address, phone, invoice prefix, vendor ID), **Invoice To** (Macquarie University recipient details), **Bank Details** (account info for reimbursement), **Country Codes** (country → account code mappings, e.g. VN → 8741-4105), **Currency Settings** (markup %, default 3%). One screen, no inner navigation. | Ph1 |
| Capture | Upload receipt photo, pick country, enter description, review AI-read result, save | Ph1 |
| Expenses | Full running log — view, filter by date/country, edit, delete individual entries | Ph1 |
| Reports — Create | Pick period, review included expenses, generate PDF + Excel | Ph1 |
| Reports — History | List of all submitted and archived reports; mark paid | Ph1 |
| Backup | Export all data as a file; import from a file | Ph1 |
| Invite (manager view) | Generate invite links/codes for peers | Ph3 |
| Join (peer onboarding) | Accept invite, set up own profile, enter own workspace | Ph3 |
| Account | Login/logout, session management for multi-user | Ph3 |

## Navigation Structure

```
App
├── Setup            [one page — Profile · Invoice To · Bank Details · Country Codes · Currency Settings as sections]
├── Capture          [primary action]
├── Expenses         [log view]
├── Reports
│   ├── Create Report
│   └── History / Archive
└── Backup
    ├── Export
    └── Import
```

The Phase 1 navigation shell is built **forward-compatibly** so accounts can slot in later, but Phase 1 ships only the nodes above. The Phase 3 nodes below are designed and built whole in Phase 3 — they are not drawn, stubbed, or greyed out in Phase 1.

Phase 3 additions:
```
├── Invite           [manager only]
├── Join             [peer onboarding]
└── Account          [login/logout]
```

## Core Feature Surface

- **Receipt capture:** Upload a photo → AI (via `claude -p` on homepc-1) reads the transaction date and amount from any language/currency → auto-converts to VND at xe.com live rate × (1 + markup%) → saves to expense log. The exact rate used is recorded on the expense row.
- **Receipt processing & retention:** The image is converted to a clean black-and-white scan (grayscale, auto-crop, deskew, contrast enhancement) as part of capture — matches today's pipeline. The expense record keeps **both** images: the original colour photo (untouched, as a user safety-net) and the cleaned B&W scan (used in the submission package). Both live privately in the user's IndexedDB.
- **Expense log:** Running list of all captured expenses. Editable — the user can correct a date, amount, description, or account code after AI reading. Filterable by date range and country.
- **Report generation:** Pick a start and end date → the app collects all unsubmitted expenses in that range → assembles: (1) an invoice PDF, (2) an expense detail sheet, (3) all receipt PDFs (the B&W scans) merged — in that order — into one combined PDF, plus a separate Excel file. Matching today's output format exactly.
- **Invoice numbering:** Preserved exactly as today — a per-user counter formatted `{prefix}{YY}-{n}` (e.g. `HBEXPENSE26-1`, `HBEXPENSE26-2`, …). The two-digit year suffix is taken from the report-generation date; the counter resets to 1 at the start of each new year and the year rolls over automatically.
- **Submitted marking:** Expenses included in a report are marked "Submitted" so they don't appear in the next report.
- **Archive:** When Macquarie pays, the user marks that report "Paid" and it moves to archive (Reports → History).
- **Backup/restore:** Export all data (profile + expense log + report history) as a single JSON file; import it back on any device to fully restore.
- **Per-user profile:** Every configurable field from today's pipeline-config.json lives in the user's local Setup: invoice prefix, vendor ID, submitter info, invoice-to info, bank details, country codes, currency markup.
- *(Phase 3)* **Invite-only access:** Manager generates an invite link; peer opens it on any device; gets their own private workspace with no cross-visibility.

## Named Flows

- **Setup (Ph1):** Open app for the first time (Ph1) → Navigate to Setup (Ph1) → Fill in Profile, Invoice To, Bank Details (Ph1) → Add country codes for the countries you work in (Ph1) → Set currency markup (Ph1) → Ready to capture (Ph1)

- **Capture (Ph1):** Tap Capture (Ph1) → Upload receipt photo (Ph1) → Select country + enter description (Ph1) → AI reads date and amount from the photo (Ph1) → Review the pre-filled form (Ph1) → Confirm/correct any fields (Ph1) → Save → Expense added to log (Ph1)

- **Report (Ph1):** Go to Reports → Create (Ph1) → Enter start and end date (Ph1) → Review the list of included expenses (Ph1) → Click Generate (Ph1) → App assembles combined PDF (invoice → expense detail → receipts) + Excel (Ph1) → Both files download automatically (Ph1) → User emails files to Macquarie Finance contact (outside app, Ph1) → Expenses in report marked Submitted (Ph1)

- **Archive & Backup (Ph1):** Go to Reports → History (Ph1) → Find the paid report (Ph1) → Mark it Paid / Archive (Ph1) → Go to Backup → Export (Ph1) → Download backup JSON file (Ph1) → On new device: open app, go to Backup → Import, upload file (Ph1) → All data restored (Ph1)

- **Join (Ph3):** Receive invite link from manager (Ph3) → Open link on any device (Ph3) → Create account / set password (Ph3) → Fill in own profile details (Ph3) → Own private workspace ready (Ph3) → Capture expenses exactly like the single-user flow (Ph1 flow, Ph3 context)

## Phase 1 Scope

Phase 1 designs and ships **only** the single-user screens — the goal is to perfect the single-user flow before any multi-user complexity exists. Phase 1 draws no Phase 3 screen and stubs nothing. The only forward-looking requirement is that the navigation shell be built so the Phase 3 account/invite/join nodes can slot in later without a redesign — but those nodes are absent from Phase 1.

**Phase 1 — designed and built (full implementation):**
- **Setup** (single page; Profile · Invoice To · Bank Details · Country Codes · Currency Settings sections)
- **Capture**
- **Expenses**
- **Reports — Create**
- **Reports — History**
- **Backup**

**Phase 3 — not touched in Phase 1 (designed and built whole in Phase 3):**
- **Invite** (manager view)
- **Join** (peer onboarding)
- **Account** (login/logout, sessions)
