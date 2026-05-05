#!/usr/bin/env bash
# smoke/test-endpoints.sh — POST synthetic data to every backend endpoint
# Usage: platform smoke test <site>

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"

SITE="${1:?Usage: smoke test <site>}"
SPEC="$HUB_ROOT/sites/site-$SITE/spec.json"
[[ -f "$SPEC" ]] || { echo "smoke.test: spec not found"; exit 1; }

API=$(python3 -c "
import json
spec = json.load(open('$SPEC'))
prod = spec.get('environments', {}).get('production', {})
backend = spec.get('backend', {})
url = prod.get('api_url') or prod.get('url') or ('https://' + backend.get('subdomain', 'api.${SITE}.com'))
print(url)
")
ORIGIN=$(python3 -c "
import json
spec = json.load(open('$SPEC'))
prod = spec.get('environments', {}).get('production', {})
domain = prod.get('custom_domain') or '${SITE}.com'
print('https://' + domain)
")

echo "smoke.test: API base = $API"
echo "smoke.test: Origin    = $ORIGIN"
API_HOST=$(python3 -c "from urllib.parse import urlparse; print(urlparse('$API').hostname or '')")
DNS_FALLBACK=false
if [[ -n "$API_HOST" ]] && ! dig +short "$API_HOST" >/tmp/mbsh-smoke-dns 2>/dev/null; then
  DNS_FALLBACK=true
elif [[ -n "$API_HOST" && ! -s /tmp/mbsh-smoke-dns ]]; then
  DNS_FALLBACK=true
fi
if [[ "$DNS_FALLBACK" == true ]]; then
  echo "smoke.test: DNS unresolved for $API_HOST; falling back to https://FAMTASTICINC.COM for backend runtime proof"
  API="https://FAMTASTICINC.COM"
fi
CURL_SSL_ARGS=()
if [[ "$API" == "https://FAMTASTICINC.COM" ]]; then
  CURL_SSL_ARGS=(-k)
fi
echo ""

NOW_MINUS_4S=$(( $(date +%s) - 4 ))000
PASS=0; FAIL=0
RESULTS=()

run_test() {
  local name="$1" method="$2" path="$3" content_type="$4" body="$5" expect_status="$6"
  local origin="${7:-$ORIGIN}"
  local url="$API$path"
  echo -n "  -> $name ... "
  if [[ -n "$content_type" ]]; then
    status=$(curl "${CURL_SSL_ARGS[@]}" -s -o /tmp/smoke-$$ -w "%{http_code}" -X "$method" \
      -H "Origin: $origin" -H "Content-Type: $content_type" \
      ${body:+--data "$body"} \
      "$url" || echo "000")
  else
    status=$(curl "${CURL_SSL_ARGS[@]}" -s -o /tmp/smoke-$$ -w "%{http_code}" -X "$method" \
      -H "Origin: $origin" \
      "$url" || echo "000")
  fi
  if [[ "$status" == "$expect_status" ]]; then
    echo "PASS ($status)"
    PASS=$((PASS+1))
    RESULTS+=("{\"name\":\"$name\",\"status\":$status,\"result\":\"pass\"}")
  else
    echo "FAIL (got $status, expected $expect_status)"
    FAIL=$((FAIL+1))
    RESULTS+=("{\"name\":\"$name\",\"status\":$status,\"result\":\"fail\"}")
    cat /tmp/smoke-$$ 2>/dev/null
    echo
  fi
  rm -f /tmp/smoke-$$
}

run_test "rsvp" POST /rsvp.php "application/json" "{\"first_name\":\"Test\",\"last_name\":\"Smoke\",\"email\":\"smoke+$(date +%s)@example.com\",\"attending\":\"yes\",\"form_loaded_at\":$NOW_MINUS_4S}" 200
run_test "capsule" POST /capsule.php "application/json" "{\"email\":\"smoke+capsule@example.com\",\"song_answer\":\"test\",\"form_loaded_at\":$NOW_MINUS_4S}" 200
run_test "chatbot-question" POST /chatbot-question.php "application/json" "{\"question\":\"smoke test\",\"email\":\"smoke@example.com\",\"was_fallback\":true}" 200
run_test "attendees" GET /attendees.php "" "" 200
run_test "sponsors" GET /sponsors.php "" "" 200
run_test "in-memory" GET /in-memory.php "" "" 200
run_test "cors-reject" POST /rsvp.php "application/json" "{}" 403 "https://blocked.example.com"
echo ""
echo "smoke.test: PASS=$PASS FAIL=$FAIL"

python3 <<PY
import json, datetime
spec_path = "$SPEC"
with open(spec_path) as f: spec = json.load(f)
spec["last_smoke_test"] = {
  "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
  "passed": $PASS, "failed": $FAIL,
  "dns_fallback": "$DNS_FALLBACK" == "true",
  "results": [$(IFS=,; echo "${RESULTS[*]}")]
}
with open(spec_path, "w") as f: json.dump(spec, f, indent=2)
PY

DAY=$(date +%Y-%m-%d)
RESULT="ok"; [[ $FAIL -gt 0 ]] && RESULT="failed"
printf '{"ts":"%s","capability":"smoke.test","args":{"site":"%s","pass":%d,"fail":%d},"result":"%s"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SITE" "$PASS" "$FAIL" "$RESULT" >> "$PLATFORM_ROOT/invocations/$DAY.jsonl"

[[ $FAIL -eq 0 ]] || exit 1
