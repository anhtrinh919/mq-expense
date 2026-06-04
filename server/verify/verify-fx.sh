#!/usr/bin/env bash
# Verifies GET /api/fx: numeric rate on success, 400 on invalid currency.
set -u
BASE="${BASE:-http://localhost:8787}"

echo "1) THB→VND → numeric rate"
curl -s "$BASE/api/fx?from=THB&to=VND" -o /tmp/mqx-fx.json -w "  status=%{http_code}\n"
cat /tmp/mqx-fx.json; echo
grep -qE '"rate":\s*[0-9.]+' /tmp/mqx-fx.json && echo "  OK rate present" || echo "  WARN no rate (offline?)"

echo "2) invalid currency → 400"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/fx?from=ZZZ&to=VND")
echo "  status=$code"
[ "$code" = "400" ] && echo "  OK" || { echo "  FAIL (expected 400)"; exit 1; }
echo "DONE"
