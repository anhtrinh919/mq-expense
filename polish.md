# Polish — small bugs & fixes

Living tracker for small UI/UX fixes outside the phase roadmap. Newest batch at top. `[ ]` open · `[x]` shipped to production.

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
