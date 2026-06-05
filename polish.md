# Polish — small bugs & fixes

Living tracker for small UI/UX fixes outside the phase roadmap. Newest batch at top. `[ ]` open · `[x]` shipped to production.

## 2026-06-05 (batch 6)

- [x] **Report generation fails — "report assembly failed"** — root cause confirmed: LibreOffice (`soffice`) was missing on the prod box. The xlsx→PDF step shells out to it, and it's a system package (not a pip dep), so the venv-only setup missed it. Fixed by installing `libreoffice-calc` on homepc-1 (verified `soffice` now converts xlsx→PDF as the `tuana` service user; no restart needed — `/usr/bin` is already on the service PATH). Also: the app now surfaces the real failure reason instead of the generic message, and the dependency is documented in CLAUDE.md + deployment.md.
- [x] **Preferred country code per user** — Profile now has a "Default for new receipts" selector; every new capture pre-fills that country/account code (falls back to first-in-list). Syncs across devices.
- [x] **Save & next without reaching the top-left button** — Enter now saves the current receipt and advances; on mobile the top button is replaced by a full-width "Save & next" under the fields, within thumb reach.
- [x] **Wider description in the expense list** — rebalanced the table columns to give description much more room, and long descriptions now wrap to two lines instead of truncating.
- [x] **Replace "Export CSV" with "Export Excel"** — the Expenses button now exports the currently-filtered rows as a formatted Excel ledger (subtotals per account code + grand total — same layout as the Macquarie report), via a pure-openpyxl path that needs no LibreOffice.

## 2026-06-05 (batch 5)

- [ ] **Add a transaction without a receipt** — sometimes there's no receipt (lost, or never issued). Per MQ policy, expenses under $80 don't require a receipt, so allow logging a transaction manually (date/amount/category/etc.) with no attached receipt.
- [x] **Canonical SEA country codes** — replaced placeholder example codes with the real list (Cambodia 8741/4109, Indonesia 8741/4104, Malaysia 8741/4102, Myanmar 8741/4108, Philippines 8741/4106, Singapore 8741/4107, Thailand 8741/4103, Vietnam 8741/4105, SEA Head Office & Others 8741/410). Updated the fresh-account seed and pushed to both existing accounts.
- [x] **Pin Sonnet for receipt reading** — `claude -p` now runs with `--model sonnet`.
- [x] **Stale "Go to Settings" on Reports** — the missing fields (address, bank details) live in Profile now, so the banner reads "Finish your profile" and links to Profile. Also fixed the onboarding "change later in Settings" → "in Profile".

## 2026-06-05 (batch 4)

- [x] **Installable web app (PWA)** — added a web manifest, MQ monogram icons, iOS/Apple meta tags, and a conservative service worker (network-first navigations, cache-first hashed bundles, API never cached) so the app can be installed from Chrome/Edge ("Install") and Safari/iOS ("Add to Home Screen") and opens standalone. Service worker served `no-cache` so updates land promptly.

## 2026-06-05 (batch 3)

- [x] **Stale app after a deploy** — browsers cached `index.html`, so after an update the old shell pointed at JS files that no longer existed ("works in incognito" / "couldn't reach server"). Server now sends `no-cache` on `index.html` and long-lived immutable caching on the hashed bundles, so updates load cleanly without a hard refresh.

## 2026-06-05 (batch 2)

- [x] **Expenses: drop the top-right Capture** — now a single prominent "+ Capture a receipt" CTA above the filters on every screen size.
- [x] **Change PIN fails with a vague error** — client now shows the server's real reason (e.g. signed-out prompt) and a local post-save step can no longer turn a successful change into a failure.
- [x] **Onboard new users on first run** — fresh accounts now run the first-run wizard (name/country/currency), with the redundant soft-lock step skipped since they already set a login PIN. Triggers on first login.
- [x] **PIN lock grace period** — 1-hour device-local grace after unlocking; refreshes within the hour no longer re-prompt for the PIN.

## 2026-06-05

- [x] **Mobile text wrap** — Reports "Go to Settings" button no longer breaks to 2 lines; the orphan Start→End date arrow is hidden on mobile; capture buttons no longer wrap (replaced by one button).
- [x] **Mobile nav labels too small** — bottom-nav text bumped 11px → 13px.
- [x] **Capture review: clear "Delete"** — explicit "🗑 Delete" action added when reviewing a receipt.
- [x] **Capture review: skip ≠ delete** — "Skip" now sets a receipt aside and wraps around (recoverable); tap any progress bar to jump back to a skipped one.
- [x] **Capture: one button + dropdown** — single "+ Add receipts" button with Gallery / Camera / Files options.
- [x] **Expenses: prominent Capture CTA** — full-width "+ Capture a receipt" above the From/To filters on mobile.
