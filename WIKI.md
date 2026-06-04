> Agent context — not for human reading.

# Project WIKI

## Tech Stack Notes

*(Added per phase)*

## Phase 2 — Onboarding, Polish & Quality Learnings

- **PIN is a soft-lock, not encryption.** The data is already local-only, so the PIN exists purely for the *feel* of privacy. The load-bearing consequence: "Forgot PIN" must never destroy data — the reset flow clears/replaces the PIN while leaving the workspace untouched. Any future "security" hardening must preserve this no-data-loss guarantee.
- **PIN change vs. unsaved form state collide.** Changing the PIN from Settings was silently dropping unsaved edits elsewhere on the page (a real fix this phase). When a screen hosts both a destructive-feeling action (PIN change) and an autosave form, the action must not remount/reset the form. Watch for this pattern again as Account/login lands in Phase 3.
- **Base currency is per-user, threaded end-to-end, forward-only.** One base currency per user (not per-receipt). It flows through the FX endpoint's `to` param, the report's amount-column label `Amount (<BASE>)`, and the conversion-note string. Changing it is forward-only — historical rows keep the rate recorded at capture. In Phase 3 this becomes per-account.
- **Heading-font fidelity drifted silently in Phase 1.** `--font-display` (Instrument Serif) was only wired to the sidebar brand + the global `h*` rule, so many screen/section headings fell through to Inter and nobody noticed until a fidelity pass. Lesson: a token existing ≠ a token applied. Phase 2's S11 story reconciled headings + mobile nav app-wide.
- **OpenCV deskew needs a graceful fallback.** The four-point flatten/deskew only fires when a clean receipt rectangle is detected; when it isn't, it falls back to the Phase 1 crop rather than mangling the image. The fallback is the safety net that let the feature ship without regressions on hard photos.
- **One-zip download is a client-side bundle.** The API still returns the two files (PDF + Excel) separately; the client zips them so Chrome stops showing its "download multiple files" prompt. The server contract didn't change — worth remembering before assuming the zip is server-built.

## From Global WIKI — spec-writing

**Design-agnostic plan.md pays off:** Writing plan.md without hex values, Tailwind classes, or pixel sizes — and keeping the design file as the single visual source of truth — prevents silent drift between the spec and the design. Phase 2 SDD project confirmed: no visual specifics in plan.md, zero hex drift at review time.

**Validate external schema columns in spec:** When requirements.md names a column from an external schema (database, API field), verify the column actually exists before spec approval. In a prior project, a "grouped by region" promise survived through spec, frontend, backend, and all tests — and only failed when a human used the app. Lesson: if the spec names a field from an existing data source, read the schema and paste the actual field list into the data model section of requirements.md.
