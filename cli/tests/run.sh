#!/usr/bin/env bash
# Offline tests for snapsos.sh.
#
# A local python http.server stands in for both the SnapsVault API and the
# provider host: fixture JSON lives at the API paths (http.server ignores the
# query string) and a few small files stand in for snapshot archives. No real
# archive is downloaded. Usage: bash cli/tests/run.sh

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$HERE/../snapsos.sh"

for cmd in curl jq python3; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "Missing required command: $cmd" >&2; exit 1; }
done

WORK="$(mktemp -d)"
SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

sha_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum < "$1" | cut -d' ' -f1
  else
    shasum -a 256 < "$1" | cut -d' ' -f1
  fi
}

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

ROOT="$WORK/www"
mkdir -p "$ROOT/api/cli" "$ROOT/files"
printf 'snapshot fixture payload\n' > "$ROOT/files/good.tar.lz4"
printf 'snapshot fixture payload\n' > "$ROOT/files/bad.tar.lz4"
printf 'snapshot fixture payload\n' > "$ROOT/files/none.tar.lz4"
GOOD_SHA="$(sha_of "$ROOT/files/good.tar.lz4")"
WRONG_SHA="0000000000000000000000000000000000000000000000000000000000000000"

PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
BASE="http://127.0.0.1:${PORT}"

jq -n '{success: true, data: [{
  network: "Celestia", chain_id: "celestia", chains: ["mainnet"],
  types: ["pruned"], display_name: "Celestia"}]}' > "$ROOT/api/networks"

# Detailed format, as served by /api/cli/snapshots without format=cli.
jq -n --arg base "$BASE" --arg good "$GOOD_SHA" --arg wrong "$WRONG_SHA" '
  def row(h; name; sha; url):
    {network: {name: "Celestia", display_name: "Celestia"}, chain_id: "celestia",
     chain: "mainnet", height: h, contributor: {name: "Fixture"},
     type: "pruned", size: "25B", file_size: "25 B",
     download_url: url, filename: name,
     time: "2026-10-19T12:00:00.000Z",
     checksum: (if sha == null then null else {sha256: sha} end)};
  def row(h; name; sha): row(h; name; sha; "\($base)/files/\(name)");
  {success: true, total: 8, data: [
    row(300; "good.tar.lz4"; $good),
    row(200; "bad.tar.lz4"; $wrong),
    row(100; "none.tar.lz4"; null),
    row(90; "../evil"; null; "\($base)/files/good.tar.lz4"),
    row(80; "/etc/x"; null; "\($base)/files/good.tar.lz4?v=1"),
    row(70; ".bashrc"; null; "\($base)/files/good.tar.lz4"),
    row(60; "-rf"; null; "\($base)/files/good.tar.lz4"),
    row(50; null; null; "\($base)/files/")]}' > "$ROOT/api/cli/snapshots"

jq -n --arg base "$BASE" --arg good "$GOOD_SHA" '{success: true, data: {
  network: {name: "Celestia"}, chain_id: "celestia", chain: "mainnet",
  height: 300, contributor: {name: "Fixture"}, type: "pruned", size: "25B",
  download_url: "\($base)/files/good.tar.lz4", filename: "good.tar.lz4",
  checksum: {sha256: $good}}}' > "$ROOT/api/cli/latest"

mkdir -p "$ROOT/ctl-error/api/cli"
printf '%s' '{"success":false,"error":"bad \u001b[2J\u001b]0;x\u0007 end","suggestion":"try \u001b[2J\u001b]0;x\u0007 now"}' > "$ROOT/ctl-error/api/cli/snapshots"

# Hostile API answers, served under their own base paths (--api-base "$BASE/<name>").
mkdir -p "$ROOT/bad-error/api/cli" "$ROOT/bad-url/api/cli"
jq -n '{success: false, error: "red \\033[1;31mALERT\\033[0m and \\n newline"}' > "$ROOT/bad-error/api/cli/snapshots"
jq -n '{success: true, total: 2, data: [
  {network: "Celestia", chain: "mainnet", height: 2, contributor: "Fixture", type: "pruned", size: "1 B", download_url: "https://evil.example.com/a b;touch x"},
  {network: "Celestia", chain: "mainnet", height: 1, contributor: "Fixture", type: "pruned", size: "1 B", download_url: "https://good.example.com/file.tar.lz4"}]}' > "$ROOT/bad-url/api/cli/snapshots"
jq -n '{success: true, data: {network: {name: "Celestia"}, chain: "mainnet", height: 1, contributor: {name: "Fixture"}, type: "pruned", size: "1 B", download_url: "https://evil.example.com/$(touch x)"}}' > "$ROOT/bad-url/api/cli/latest"

REQUEST_LOG="$WORK/requests.log"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >/dev/null 2>"$REQUEST_LOG" &
SERVER_PID=$!
for _ in $(seq 1 50); do
  curl -fsS "$BASE/api/networks" >/dev/null 2>&1 && break
  sleep 0.1
done
curl -fsS "$BASE/api/networks" >/dev/null || { echo "Fixture server did not start" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Harness
# ---------------------------------------------------------------------------

PASS=0
FAIL=0
OUT=""
CODE=0

# run INPUT ARGS... : runs the script in a fresh directory with INPUT on stdin.
run() {
  local input="$1"; shift
  RUN_DIR="$(mktemp -d "$WORK/run.XXXXXX")"
  OUT="$(cd "$RUN_DIR" && printf '%b' "$input" | NO_COLOR=1 SNAPSV_API_BASE="$BASE" bash "$SCRIPT" "$@" 2>&1)"
  CODE=$?
}

check() {
  local name="$1" ok="$2"
  if [ "$ok" = "0" ]; then
    PASS=$((PASS+1)); printf 'ok    %s\n' "$name"
  else
    FAIL=$((FAIL+1)); printf 'FAIL  %s\n' "$name"
    printf '%s\n' "$OUT" | sed 's/^/      | /'
  fi
}

has() { printf '%s' "$OUT" | grep -qF -- "$1"; }

# ---------------------------------------------------------------------------
# Cases
# ---------------------------------------------------------------------------

run "" --help
[ "$CODE" -eq 0 ] && has "Usage" && has "--no-verify" && has "--verify FILE" && has "--sha256 HEX"
check "--help prints usage with the verify flags and exits 0" $?

run "" --help
! printf '%s' "$OUT" | grep -qE $'\xe2\x80\x94|\xe2\x80\x93| you | your '
check "--help has no em or en dashes and no second person" $?

# Interactive: network, chain ID and type auto-select; pick row 1, then Download.
run "1\n2\n"
[ "$CODE" -eq 0 ] && has "SHA256 match: $GOOD_SHA" && [ -f "$RUN_DIR/good.tar.lz4" ]
check "download with a matching SHA256 prints a match line and exits 0" $?

run "2\n2\n"
[ "$CODE" -ne 0 ] && has "SHA256 mismatch" && has "expected $WRONG_SHA"
check "download with a mismatching SHA256 exits non-zero" $?

run "3\n2\n"
[ "$CODE" -eq 0 ] && has "No SHA256 is published for this snapshot" && [ -f "$RUN_DIR/none.tar.lz4" ]
check "download with no published SHA256 prints one neutral line and exits 0" $?

run "1\n2\n"
has "TIME (UTC)" && has "2026-10-19 12:00:00 UTC"
check "the snapshot list prints every time in UTC with the UTC label" $?

run "2\n2\n" --no-verify
[ "$CODE" -eq 0 ] && has "SHA256 check skipped (--no-verify)." && ! has "SHA256 mismatch"
check "--no-verify skips the check even on a mismatching snapshot" $?

run "" --verify "$ROOT/files/good.tar.lz4" --sha256 "$GOOD_SHA"
[ "$CODE" -eq 0 ] && has "SHA256 match: $GOOD_SHA"
check "--verify with the right SHA256 exits 0" $?

UPPER_SHA="$(printf '%s' "$GOOD_SHA" | tr '[:lower:]' '[:upper:]')"
run "" --verify "$ROOT/files/good.tar.lz4" --sha256 "$UPPER_SHA"
[ "$CODE" -eq 0 ] && has "SHA256 match: $GOOD_SHA"
check "--verify accepts an uppercase SHA256" $?

run "" --verify "$ROOT/files/good.tar.lz4" --sha256 "$WRONG_SHA"
[ "$CODE" -ne 0 ] && has "SHA256 mismatch"
check "--verify with a wrong SHA256 exits non-zero" $?

run "" --verify "$ROOT/files/good.tar.lz4"
[ "$CODE" -ne 0 ] && has "--verify needs --sha256"
check "--verify without --sha256 exits non-zero" $?

run "" --verify "$ROOT/files/good.tar.lz4" --sha256 "abc123"
[ "$CODE" -ne 0 ] && has "64 hex characters"
check "--verify rejects a malformed SHA256" $?

run "" --verify "$WORK/missing.tar.lz4" --sha256 "$GOOD_SHA"
[ "$CODE" -ne 0 ] && has "File not found: " && has "missing.tar.lz4."
check "--verify on a missing file exits non-zero, message ends with a period" $?

run "" --verify "$WORK" --sha256 "$GOOD_SHA"
[ "$CODE" -ne 0 ] && has "Not a regular file: " && ! has "File not found"
check "--verify on a directory reports a file that is not a regular file" $?

for opt in "-l" "--latest" "-q" "--quiet" "-m 3" "--limit 3" "-i celestia" "--chain-id celestia" "-c mainnet" "--chain mainnet" "-t pruned" "--type pruned"; do
  # shellcheck disable=SC2086
  run "" --verify "$ROOT/files/good.tar.lz4" --sha256 "$GOOD_SHA" $opt
  [ "$CODE" -ne 0 ] && has "cannot be combined with these flag mode options" && has "${opt%% *}" && ! has "SHA256 match"
  check "--verify rejects the flag mode option $opt" $?
done

run "" --verify "$ROOT/files/good.tar.lz4" --sha256 "$GOOD_SHA" -n Celestia
[ "$CODE" -ne 0 ] && has "cannot be combined with -n/--network" && ! has "SHA256 match"
check "--verify rejects -n/--network" $?

# The API file name is used in curl -o, so it is reduced to a safe name.
run "4\n2\n"
[ "$CODE" -eq 0 ] && [ -f "$RUN_DIR/good.tar.lz4" ] && [ ! -e "$RUN_DIR/../evil" ] && [ ! -e "$RUN_DIR/evil" ]
check "API file name ../evil falls back to the URL file name" $?

run "5\n2\n"
[ "$CODE" -eq 0 ] && [ -f "$RUN_DIR/good.tar.lz4" ] && [ ! -e "$RUN_DIR/x" ]
check "API file name /etc/x falls back to the URL file name without the query" $?

run "6\n2\n"
[ "$CODE" -eq 0 ] && [ -f "$RUN_DIR/good.tar.lz4" ] && [ ! -e "$RUN_DIR/.bashrc" ]
check "API file name .bashrc falls back to the URL file name" $?

run "7\n2\n"
[ "$CODE" -eq 0 ] && [ -f "$RUN_DIR/good.tar.lz4" ] && [ ! -e "$RUN_DIR/-rf" ]
check "API file name -rf falls back to the URL file name" $?

run "8\n2\n"
[ "$CODE" -eq 0 ] && [ -f "$RUN_DIR/snapshot.bin" ]
check "no usable file name anywhere gives snapshot.bin" $?

run "" -n Celestia --latest -q
[ "$CODE" -eq 0 ] && [ "$OUT" = "$BASE/files/good.tar.lz4" ]
check "flag mode --latest -q prints only the URL" $?

run "" -n Celestia -m 2
[ "$CODE" -eq 0 ] && has "$BASE/files/good.tar.lz4" && has "$BASE/files/bad.tar.lz4" && ! has "none.tar.lz4"
check "flag mode list respects --limit" $?

run "" -n Celestia -c testnet -i mocha-5 -t pruned --latest -q
[ "$CODE" -eq 0 ] && grep -qF 'GET /api/cli/latest?network=Celestia&chain_id=mocha-5&chain=testnet&type=pruned ' "$REQUEST_LOG"
check "flag mode sends network, chain_id, chain and type as query parameters" $?

run "" -n Celestia -c testnet -m 2
[ "$CODE" -eq 0 ] && grep -qF 'GET /api/cli/snapshots?network=Celestia&chain=testnet&format=cli ' "$REQUEST_LOG"
check "flag mode list sends network and chain as query parameters" $?

run "" -c mainnet --latest
[ "$CODE" -ne 0 ] && has "-n/--network is required"
check "flag mode without a network exits non-zero and names -n/--network" $?

run "" --help
has "-n, --network NAME" && has "-c, --chain NAME" && has "-i, --chain-id ID"
check "--help lists --network, --chain and --chain-id" $?

run "" --api-base "$BASE/bad-error" -n Celestia -m 2
[ "$CODE" -ne 0 ] && has '\033[1;31mALERT' && has 'and \n newline' && ! printf '%s' "$OUT" | grep -q $'\033'
check "API error text with backslash sequences is printed as typed, never interpreted" $?

run "" --api-base "$BASE/bad-url" -n Celestia --latest
[ "$CODE" -ne 0 ] && has "not a plain https URL" && ! has 'touch'
check "--latest refuses a download URL with shell characters" $?

run "" --api-base "$BASE/bad-url" -n Celestia -m 2 -q
[ "$CODE" -eq 0 ] && [ "$(printf '%s' "$OUT" | grep -c 'file.tar.lz4')" -eq 1 ] && ! has 'touch'
check "list mode skips a download URL with shell characters and prints the safe one" $?

run "" -n Celestia -c TESTNET -i MOCHA-5 -t ARCHIVE --latest -q
[ "$CODE" -eq 0 ] && grep -qF 'GET /api/cli/latest?network=Celestia&chain_id=mocha-5&chain=testnet&type=archive ' "$REQUEST_LOG"
check "chain, chain ID and type are sent in lower case" $?

run "" --help
has "Default: the chain of -i when given"
check "--help states the chain default" $?

run "" --api-base "$BASE/ctl-error" -n Celestia -m 2
[ "$CODE" -ne 0 ] && has "bad " && has "try " && [ "$(printf '%s' "$OUT" | LC_ALL=C tr -d '\033\007' | wc -c)" -eq "$(printf '%s' "$OUT" | wc -c)" ]
check "decoded control characters in the API error and suggestion never reach the terminal" $?

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
