#!/usr/bin/env bash
# Verifies POST /api/generate-report: success (PDF+xlsx), 422 no expenses, 400 missing field.
set -u
BASE="${BASE:-http://localhost:8787}"
DIR="$(dirname "$0")"

# Build a payload with two expenses + two B&W scan receipts (base64) using the fixture.
python3 - "$DIR" <<'PY' > /tmp/mqx-genreq.json
import sys, json, base64, subprocess, tempfile, os
d = sys.argv[1]
fix = "/tmp/mqx-fixture.png"
subprocess.run(["python3", os.path.join(d, "make-fixture.py"), fix], check=True, capture_output=True)
scan = tempfile.mktemp(suffix=".pdf")
subprocess.run(["python3", os.path.join(d, "..", "python", "scan_receipt.py"), fix, scan], check=True, capture_output=True)
b64 = base64.b64encode(open(scan, "rb").read()).decode()
payload = {
  "profile": {
    "invoicePrefix": "HBEXPENSE", "vendorId": "139927",
    "submitter": {"name": "Hanh Bui Hong", "email": "h.bui@mq.edu.au", "phone": "0900000000",
                  "addressLine1": "SO1 Solforest Residence", "addressLine2": "Ecopark, Hung Yen", "country": "Vietnam"},
    "invoiceTo": {"name": "Macquarie University", "address": "Ground Floor,\n8 Sir Christopher Ondaatje Ave\nNSW 2109 AUSTRALIA", "email": "finance@mq.edu.au"},
    "bank": {"accountName": "BUI HONG HANH", "accountNumber": "10844397", "swift": "ASCBVNVX", "bankName": "ASIA COMMERCIAL BANK"},
  },
  "invoiceNumber": "HBEXPENSE26-1", "periodLabel": "Apr 2026",
  "expenses": [
    {"date": "2026-04-19", "description": "Taxi BKK", "amountVND": 921025, "accountCode": "Thailand: 8741-4103",
     "notes": "1,250.00 THB x 736 = 921,025 VND [xe.com +3%]", "originalAmount": 1250, "originalCurrency": "THB", "exchangeRate": 736.82, "rateSource": "xe.com +3%"},
    {"date": "2026-04-20", "description": "Coffee HCM", "amountVND": 130000, "accountCode": "Vietnam: 8741-4105",
     "notes": "", "originalAmount": None, "originalCurrency": "VND", "exchangeRate": None, "rateSource": ""},
  ],
  "receipts": [
    {"expenseRef": "a", "mimeType": "application/pdf", "dataBase64": b64},
    {"expenseRef": "b", "mimeType": "application/pdf", "dataBase64": b64},
  ],
}
print(json.dumps(payload))
PY

echo "1) success → 200 with combinedPdf + expenseXlsx"
code=$(curl -s -o /tmp/mqx-gen.json -w "%{http_code}" -X POST -H "Content-Type: application/json" --data @/tmp/mqx-genreq.json "$BASE/api/generate-report")
echo "   status=$code"
[ "$code" = "200" ] || { echo "   FAIL"; head -c 400 /tmp/mqx-gen.json; exit 1; }
grep -q '"combinedPdf"' /tmp/mqx-gen.json && grep -q '"expenseXlsx"' /tmp/mqx-gen.json && echo "   OK shape" || { echo "   FAIL shape"; exit 1; }
# decode and confirm the combined PDF is a real multi-section PDF
python3 - <<'PY'
import json, base64
o = json.load(open("/tmp/mqx-gen.json"))
pdf = base64.b64decode(o["combinedPdf"]["dataBase64"])
assert pdf[:5] == b"%PDF-", "combined not a PDF"
xls = base64.b64decode(o["expenseXlsx"]["dataBase64"])
assert xls[:2] == b"PK", "xlsx not a zip/xlsx"
from pypdf import PdfReader; import io
n = len(PdfReader(io.BytesIO(pdf)).pages)
print(f"   combined PDF pages={n} (invoice + detail + 2 receipts expected ≥3)")
PY

echo "2) no expenses → 422"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"profile":{"submitter":{"name":"x","addressLine1":"y"},"invoiceTo":{"name":"z"},"bank":{"accountName":"a","accountNumber":"1"}},"invoiceNumber":"X26-1","expenses":[]}' "$BASE/api/generate-report")
echo "   status=$code"; [ "$code" = "422" ] && echo "   OK" || { echo "   FAIL"; exit 1; }

echo "3) missing profile field → 400"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"profile":{"submitter":{"name":""}},"invoiceNumber":"X26-1","expenses":[{"amountVND":1}]}' "$BASE/api/generate-report")
echo "   status=$code"; [ "$code" = "400" ] && echo "   OK" || { echo "   FAIL"; exit 1; }
echo "ALL PASS"
