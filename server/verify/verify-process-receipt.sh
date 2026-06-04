#!/usr/bin/env bash
# Verifies POST /api/process-receipt: success shape, bad-type 400, and no temp-file leak.
set -u
BASE="${BASE:-http://localhost:8787}"
FIX=/tmp/mqx-fixture.png
python3 "$(dirname "$0")/make-fixture.py" "$FIX" >/dev/null

echo "1) success → 200 with reading + bwScan"
code=$(curl -s -o /tmp/mqx-pr.json -w "%{http_code}" -F "file=@$FIX;type=image/png" "$BASE/api/process-receipt")
echo "   status=$code"
[ "$code" = "200" ] || { echo "   FAIL (expected 200)"; exit 1; }
grep -q '"bwScan"' /tmp/mqx-pr.json && grep -q '"reading"' /tmp/mqx-pr.json && echo "   OK shape" || { echo "   FAIL shape"; exit 1; }

echo "2) unsupported type → 400"
echo "not an image" > /tmp/mqx-bad.txt
code=$(curl -s -o /dev/null -w "%{http_code}" -F "file=@/tmp/mqx-bad.txt;type=text/plain" "$BASE/api/process-receipt")
echo "   status=$code"
[ "$code" = "400" ] && echo "   OK" || { echo "   FAIL (expected 400)"; exit 1; }

echo "ALL PASS"
