# Mission — MQ Expense

## Purpose
Lets a Macquarie University sales rep photograph a receipt, automatically read and convert it to VND, and export a complete submission-ready invoice + expenses + receipts package that Finance accepts — without any manual spreadsheet math.

## Target Users
- **Primary:** The user's wife — a Macquarie SEA sales manager who already runs a working single-user expense pipeline in production and needs it converted to a web app that works from any device.
- **Secondary:** Her peer Macquarie SEA sales reps who have directly asked to use the same tool. Same invoice target (Macquarie University), same finance submission process, similar country codes (VN/TH/KH/MM/AU).

This is a small private team tool, not a public product. Phase 1 is single-user only (no accounts) — and ships **only** single-user screens; the account/invite/join experience is introduced whole in Phase 2 (invite-only). Phase 1 navigation is built forward-compatibly so accounts can slot in later, but Phase 1 neither draws nor stubs any Phase 2 screen.

## Vision & Tone
MQ Expense feels like a quiet, competent assistant that handles the tedious parts of expense reporting — reading foreign receipts, doing currency math, formatting the PDF exactly how Finance wants it — so the sales rep never has to think about it. The interface is calm and functional: open it, photograph a receipt, close it. Come back at the end of the month, hit "Generate Report," download the file, email it. No friction, no surprises, no data leaking anywhere it shouldn't.

## Success Looks Like
- A rep photographs a messy Vietnamese or Cambodian receipt, and the app correctly reads the date and amount without any manual correction.
- At month end, the rep clicks "Generate Report," downloads one PDF and one Excel, and emails them directly to their Macquarie Finance contact — the same workflow they use today, but faster and more reliable.
- A rep who loses or changes their laptop re-imports their data from a backup file and is fully operational again within minutes.
- (Phase 2) The wife invites a peer via a link; the peer opens the app on their phone, sets up their own profile, and starts capturing expenses — their data is invisible to everyone else.

## Privacy & Data Posture
Each user's expense data, profile, invoice details, bank details, receipt images, and generated reports live **only on their own device** in the browser's local storage (IndexedDB). The server stores nothing permanently.

For every receipt the record retains **both images**: the original colour photo (a user safety-net — the untouched source) *and* the cleaned black-and-white scan used in the submission package. Both are stored privately in the user's own IndexedDB; neither is ever persisted on the server.

The server is stateless: it serves the web app and performs only momentary in-memory work — receipt reading, currency conversion, PDF assembly, Excel generation. A receipt photo passes through the server for a few seconds to be read by the AI and converted to the B&W scan, then both are returned to the user's device and discarded from the server immediately. Nothing is saved server-side. Ever.

Backup is user-controlled: the user downloads their own data file and re-imports it on any device. There is no server-side copy, no cloud backup, no hidden sync.

## Design Tool
external-pencil

## Master User Journey

### Core Jobs (Why this exists)
- When I incur a work expense abroad, I need to log it accurately in VND, so I can be reimbursed without manual spreadsheet math.
- When it's time to claim, I need a single submission-ready document, so I can send Macquarie one PDF and one Excel and get paid.
- When I switch or lose a device, I need to back up and restore my own records, so my history is safe without anyone else holding my data.
- *(Phase 2)* When my peers face the same expense pain, I need to invite them to their own private copy, so they benefit without seeing each other's data.

### Named Flows (with phase)

**Setup (Ph1):** Open app → On one Setup page, fill the Profile / Invoice To / Bank Details / Country Codes / Currency Settings sections → Ready to capture

**Capture (Ph1):** Upload receipt photo → Pick country + enter description → AI reads date + amount → App converts to VND at the recorded rate → Both the original photo and the B&W scan are saved with the expense → Saved to expense log

**Report (Ph1):** Pick a date period → Review included expenses → Generate submission PDF + Excel → Download both → (User emails to Macquarie Finance — outside the app)

**Archive & Backup (Ph1):** Mark report paid → Archive it → Export all data as a backup file → Import file on a new device

**Join (Ph2):** Receive invite link from manager → Set up own profile → Open app on any device → Start capturing in own private workspace
