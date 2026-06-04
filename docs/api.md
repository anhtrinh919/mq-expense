> Agent context — not for human reading.

# API Surface — *(Updated per phase)*

All endpoints are stateless — the server persists nothing between requests.

### `POST /api/process-receipt` (multipart `file`)
Reads a receipt photo and returns the extracted date + amount plus the cleaned B&W scan. Internally runs an OpenCV four-point deskew on angled photos, with a graceful fallback to the Phase 1 crop when no clean rectangle is found. Request/response shape unchanged since Phase 1.

### `GET /api/fx?from=<CUR>&to=<BASE>`
Returns the exchange rate from the receipt currency to the user's base currency. `to` defaults to / accepts `VND`. Both currencies validated.
- Success `200`: `{ rate, from, to, source: "xe.com", fetchedAt }`
- `400` invalid currency · `502` source unavailable · `500` unexpected
- Server caches the xe.com rate for 1 hour; the exact rate used is recorded on each expense row.

### `POST /api/generate-report` (JSON)
Assembles the combined submission PDF (invoice → expense detail → merged receipts) + the expense Excel. Takes `baseCurrency` (default `"VND"`), which drives the amount-column label `Amount (<BASE>)` and the conversion-note currency. Structure, ordering, template, subtotals, and Notes math are frozen and Finance-accepted.
- Success `200`: `{ combinedPdf, expenseXlsx }` (the client bundles these into one .zip)
- `400` missing field · `422` no expenses in range · `500` assembly failed

### `GET /api/health`
- Success `200`: `{ status: "ok", reader: "claude" | "tesseract" | "unavailable" }`
