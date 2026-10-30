#!/usr/bin/env bash
# snapsos.sh - SnapsVault CLI
#
# Browse and download blockchain snapshots from the SnapsVault marketplace,
# either interactively or via flags. Talks only to the purpose-built CLI
# endpoints (/api/cli/snapshots, /api/cli/latest, /api/networks); all filtering, sorting
# and case-insensitive network matching happens server-side. Downloads are
# checked against the published SHA256 when the snapshot has one.

set -uo pipefail

# ---------------------------------------------------------------------------
# Required tools
# ---------------------------------------------------------------------------

require_cmds() {
  local missing=()
  local cmd
  for cmd in curl jq tr; do
    command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
  done
  if [ "${#missing[@]}" -gt 0 ]; then
    printf 'Missing required command(s): %s\n' "${missing[*]}" >&2
    exit 1
  fi
}
require_cmds

# ---------------------------------------------------------------------------
# Colors / styling (degrades gracefully on non-TTY or no-color terminals)
# ---------------------------------------------------------------------------

is_tty() { [ -t 1 ]; }
supports_color() {
  if ! is_tty; then return 1; fi
  if [ -n "${NO_COLOR:-}" ]; then return 1; fi
  if command -v tput >/dev/null 2>&1; then
    local c
    c=$(tput colors 2>/dev/null || echo 0)
    [ "$c" -ge 8 ]
  else
    [ -n "${TERM:-}" ] && [ "$TERM" != "dumb" ]
  fi
}

if supports_color; then
  ESC="$(printf '\033')"
  BOLD="${ESC}[1m"
  DIM="${ESC}[2m"
  ITALIC="${ESC}[3m"
  RESET="${ESC}[0m"
else
  BOLD='' DIM='' ITALIC='' RESET=''
fi

print_banner() {
  cat <<'EOF'
   _____                        ____  _____
  / ___/____  ____ _____  _____/ __ \/ ___/
  \__ \/ __ \/ __ `/ __ \/ ___/ / / /\__ \
 ___/ / / / / /_/ / /_/ (__  ) /_/ /___/ /
/____/_/ /_/\__,_/ .___/____/\____//____/
                /_/
EOF
}

# API-sourced text is printed with %s only: %b would turn a literal backslash sequence such as
# \033 back into an escape character after sanitize() removed the real ones.
header() { printf '%s\n' "${BOLD}$1${RESET}"; }
label()  { printf '%s\n' "$1"; }
dim()    { printf '%s\n' "${DIM}$1${RESET}"; }
bold()   { printf '%s\n' "${BOLD}$1${RESET}"; }
status() { printf '%s\n' "${ITALIC}${DIM}$1${RESET}"; }

cap_first() { printf '%s' "$1" | awk '{print toupper(substr($0,1,1)) substr($0,2)}'; }

# Shows the resolved network/chain/type path, e.g. "Celestia (mocha-5) / Testnet".
breadcrumb() {
  local with_type="$1" id_part="" line network_name chain_id chain type
  network_name=$(sanitize "$SEL_NETWORK_NAME")
  chain_id=$(sanitize "$SEL_CHAIN_ID")
  chain=$(sanitize "$SEL_CHAIN")
  if [ "$(printf '%s' "$chain_id" | tr '[:upper:]' '[:lower:]')" != "$(printf '%s' "$network_name" | tr '[:upper:]' '[:lower:]')" ]; then
    id_part=" (${chain_id})"
  fi
  line="${network_name}${id_part} / $(cap_first "$chain")"
  if [ "$with_type" = "true" ] && [ -n "$SEL_TYPE" ]; then
    type=$(sanitize "$SEL_TYPE")
    line="${line} / $(cap_first "$type")"
  fi
  dim "$line"
}

# Defense in depth: strips control characters (including ESC) from any
# API-sourced text before it is printed to the terminal. The server already
# validates these fields strictly (allowlisted charsets, C0/C1-stripped
# names); this is a second layer against terminal escape-sequence injection.
sanitize() { tr -d '\000-\011\013-\037\177' <<<"$1"; }

# Download URLs from the API are printed and passed to curl only when they are plain https URLs
# in the same character set the server accepts. A plain http URL is accepted only when --api-base
# itself is plain http, which is a local test server.
URL_PATTERN='^https://[A-Za-z0-9._~:/?&=%+,@-]+$'
URL_PATTERN_HTTP='^http://[A-Za-z0-9._~:/?&=%+,@-]+$'
is_safe_url() {
  [[ "$1" =~ $URL_PATTERN ]] && return 0
  [[ "$API_BASE" == http://* ]] && [[ "$1" =~ $URL_PATTERN_HTTP ]]
}

die() {
  printf '%s\n' "${BOLD}Error:${RESET} $1" >&2
  exit "${2:-1}"
}

# ---------------------------------------------------------------------------
# Config / defaults
# ---------------------------------------------------------------------------

API_BASE="${SNAPSV_API_BASE:-https://celestia.snapsvault.xyz}"
NETWORK=""
CHAIN_ID=""
CHAIN=""
TYPE=""
LATEST="false"
LIMIT="15"
QUIET="false"
VERIFY="true"
VERIFY_FILE=""
VERIFY_SHA=""
FLAG_MODE_OPTS=""

usage() {
  cat <<EOF
${BOLD}SnapsOS CLI${RESET}
Terminal client for the SnapsVault snapshot marketplace, with the same
snapshot data as the web app.

${BOLD}Quick start${RESET}
  snapsos.sh -n Celestia --latest   # print the newest snapshot and its URL
  snapsos.sh                        # no flags, interactive mode

${BOLD}Usage${RESET}
  snapsos.sh [options]
  snapsos.sh --verify FILE --sha256 HEX

${BOLD}Options${RESET}
  -n, --network NAME        Network, for example Celestia (case-insensitive)
  -c, --chain NAME          Chain, mainnet or testnet. Default: the chain of -i when given,
                            else mainnet with --latest, both chains in a list
  -i, --chain-id ID         Chain ID, for example celestia or mocha-5
  -t, --type TYPE           Snapshot type, for example pruned or archive
  -l, --latest              Resolve only the newest snapshot
  -m, --limit NUM           Max snapshots to list without --latest (default 15)
  -q, --quiet               Print only the resolved download URL or URLs
      --no-verify           Skip the SHA256 check after an interactive download
      --verify FILE         Check an existing file against --sha256, then exit;
                            cannot be combined with -n, -c, -i, -t, -l, -m or -q
      --sha256 HEX          Expected SHA256 for --verify (64 hex characters)
      --api-base URL        Override the API base URL (env SNAPSV_API_BASE)
  -h, --help                Show this help and exit

${BOLD}Examples${RESET}
  snapsos.sh -n Celestia --latest
  snapsos.sh -n celestia -t archive --latest
  snapsos.sh -n Celestia -c testnet --latest
  snapsos.sh -n Celestia -m 5
  snapsos.sh -n Celestia --latest -q

With no flags, interactive mode walks through network, chain ID and type
selection (skipping any step with a single option) down to one snapshot.
The chain (mainnet or testnet) follows from the chain ID. The snapshot's link
is then shown or the file is downloaded. A download is checked against the
published SHA256 when the snapshot has one.
EOF
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

require_arg() {
  # $1 = flag name, $2 = whether a next arg exists ("0" if not)
  if [ "$2" = "0" ]; then
    die "$1 requires a value."
  fi
}

while [ $# -gt 0 ]; do
  case "$1" in
    -n|--network)
      require_arg "$1" "$([ $# -ge 2 ] && echo 1 || echo 0)"
      NETWORK="$2"; shift 2 ;;
    -i|--chain-id)
      require_arg "$1" "$([ $# -ge 2 ] && echo 1 || echo 0)"
      FLAG_MODE_OPTS="${FLAG_MODE_OPTS} $1"
      CHAIN_ID="$2"; shift 2 ;;
    -c|--chain)
      require_arg "$1" "$([ $# -ge 2 ] && echo 1 || echo 0)"
      FLAG_MODE_OPTS="${FLAG_MODE_OPTS} $1"
      CHAIN="$2"; shift 2 ;;
    -t|--type)
      require_arg "$1" "$([ $# -ge 2 ] && echo 1 || echo 0)"
      FLAG_MODE_OPTS="${FLAG_MODE_OPTS} $1"
      TYPE="$2"; shift 2 ;;
    -l|--latest)
      FLAG_MODE_OPTS="${FLAG_MODE_OPTS} $1"
      LATEST="true"; shift ;;
    -m|--limit)
      require_arg "$1" "$([ $# -ge 2 ] && echo 1 || echo 0)"
      FLAG_MODE_OPTS="${FLAG_MODE_OPTS} $1"
      LIMIT="$2"; shift 2 ;;
    -q|--quiet)
      FLAG_MODE_OPTS="${FLAG_MODE_OPTS} $1"
      QUIET="true"; shift ;;
    --no-verify)
      VERIFY="false"; shift ;;
    --verify)
      require_arg "$1" "$([ $# -ge 2 ] && echo 1 || echo 0)"
      VERIFY_FILE="$2"; shift 2 ;;
    --sha256)
      require_arg "$1" "$([ $# -ge 2 ] && echo 1 || echo 0)"
      VERIFY_SHA="$2"; shift 2 ;;
    --api-base)
      require_arg "$1" "$([ $# -ge 2 ] && echo 1 || echo 0)"
      API_BASE="$2"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      die "Unknown option: $1. Run --help for usage." ;;
  esac
done

case "$LIMIT" in
  ''|*[!0-9]*) die "--limit must be a positive integer, got $LIMIT." ;;
esac
if [ "$LIMIT" -lt 1 ]; then
  die "--limit must be a positive integer, got $LIMIT."
fi
if [ -n "$VERIFY_SHA" ] && [ -z "$VERIFY_FILE" ]; then
  die "--sha256 requires --verify FILE."
fi

# Chain, chain ID and type are lower case on the server; accept any case here.
CHAIN=$(printf '%s' "$CHAIN" | tr '[:upper:]' '[:lower:]')
CHAIN_ID=$(printf '%s' "$CHAIN_ID" | tr '[:upper:]' '[:lower:]')
TYPE=$(printf '%s' "$TYPE" | tr '[:upper:]' '[:lower:]')

# Strip a trailing slash so "$API_BASE$path" never double-slashes.
API_BASE="${API_BASE%/}"

# ---------------------------------------------------------------------------
# HTTP + JSON helpers
# ---------------------------------------------------------------------------

urlencode() {
  jq -rn --arg v "$1" '$v|@uri'
}

# Fetches a path, prints the raw JSON body on success (exit 0).
# Transport-level failures (DNS, connection, timeout) exit 1 with a message
# on stderr. HTTP-level errors (4xx/5xx) are NOT treated as failures here:
# the SnapsVault API returns a JSON body with success:false on those, and
# the caller is expected to check .success itself.
api_get() {
  local path="$1" resp
  if ! resp=$(curl -sS -m 20 "${API_BASE}${path}"); then
    printf '%s\n' "${BOLD}Error:${RESET} Could not reach ${API_BASE}. Check the internet connection or the --api-base value." >&2
    return 1
  fi
  if ! printf '%s' "$resp" | jq empty >/dev/null 2>&1; then
    printf '%s\n' "${BOLD}Error:${RESET} Unexpected (non-JSON) response from the API." >&2
    return 1
  fi
  printf '%s' "$resp"
}

print_api_error() {
  local resp="$1" err sugg
  err=$(sanitize "$(printf '%s' "$resp" | jq -r '.error // "Request failed."')")
  sugg=$(sanitize "$(printf '%s' "$resp" | jq -r '.suggestion // empty')")
  printf '%s\n' "${BOLD}Error:${RESET} ${err}" >&2
  [ -n "$sugg" ] && printf '%s\n' "${DIM}${sugg}${RESET}" >&2
}

# ---------------------------------------------------------------------------
# Download file name
# ---------------------------------------------------------------------------

# Succeeds when $1 is usable as a file name in the current directory: not
# empty, not "." or "..", no leading "." or "-", and no "/" or control
# characters.
is_safe_filename() {
  local name="$1"
  [ -n "$name" ] || return 1
  case "$name" in
    .*|-*|*/*) return 1 ;;
  esac
  case "$name" in
    *[[:cntrl:]]*) return 1 ;;
  esac
  return 0
}

# $1 = file name from the API, $2 = download URL. Prints the API name when it
# is safe, else the last path segment of the URL when that is safe, else
# snapshot.bin.
safe_download_name() {
  local name="$1" url="$2" segment
  if is_safe_filename "$name"; then
    printf '%s' "$name"
    return 0
  fi
  segment="${url%%[?#]*}"
  segment="${segment##*/}"
  if is_safe_filename "$segment"; then
    printf '%s' "$segment"
    return 0
  fi
  printf '%s' "snapshot.bin"
}

# ---------------------------------------------------------------------------
# SHA256 verification
# ---------------------------------------------------------------------------

is_sha256() {
  case "$1" in
    ''|*[!0-9a-fA-F]*) return 1 ;;
  esac
  [ "${#1}" -eq 64 ]
}

# Prints the lowercase SHA256 of a file: sha256sum where available, shasum
# (stock on macOS) otherwise. Reads the file on stdin so unusual filenames
# never reach the tool's argument parser or its escaped output format.
# Returns 2 when neither tool is installed.
file_sha256() {
  local out
  if command -v sha256sum >/dev/null 2>&1; then
    out=$(sha256sum < "$1") || return 1
  elif command -v shasum >/dev/null 2>&1; then
    out=$(shasum -a 256 < "$1") || return 1
  else
    return 2
  fi
  printf '%s' "${out%% *}" | tr '[:upper:]' '[:lower:]'
}

# $1 = file, $2 = expected SHA256. Prints a match or mismatch line and
# returns 0 only on a match.
verify_sha256() {
  local file="$1" shown expected actual rc
  shown=$(sanitize "$file")
  expected=$(printf '%s' "$2" | tr '[:upper:]' '[:lower:]')
  if [ ! -e "$file" ]; then
    printf '%s\n' "${BOLD}Error:${RESET} File not found: ${shown}." >&2
    return 1
  fi
  if [ ! -f "$file" ]; then
    printf '%s\n' "${BOLD}Error:${RESET} Not a regular file: ${shown}." >&2
    return 1
  fi
  status "Checking SHA256 of ${shown}..."
  actual=$(file_sha256 "$file"); rc=$?
  if [ "$rc" -eq 2 ]; then
    printf '%s\n' "${BOLD}Error:${RESET} Neither sha256sum nor shasum is installed, so the SHA256 was not checked." >&2
    return 1
  elif [ "$rc" -ne 0 ]; then
    printf '%s\n' "${BOLD}Error:${RESET} Could not read ${shown} to compute its SHA256." >&2
    return 1
  fi
  if [ "$actual" = "$expected" ]; then
    bold "SHA256 match: ${actual}"
    return 0
  fi
  printf '%s\n' "${BOLD}Error:${RESET} SHA256 mismatch. ${shown} does not match the published checksum. Delete it and download again." >&2
  printf '%s\n' "${DIM}  expected ${expected}${RESET}" >&2
  printf '%s\n' "${DIM}  actual   ${actual}${RESET}" >&2
  return 1
}

# Post-download check for the interactive Download action. A snapshot with
# no published SHA256 is reported in one neutral line and is not a failure.
check_download() {
  local file="$1" sha
  if [ "$VERIFY" != "true" ]; then
    dim "SHA256 check skipped (--no-verify)."
    return 0
  fi
  sha=$(printf '%s' "$SEL_SNAPSHOT_JSON" | jq -r '.sha256 // empty')
  if [ -z "$sha" ]; then
    dim "No SHA256 is published for this snapshot, so the file was not checked."
    return 0
  fi
  if ! is_sha256 "$sha"; then
    printf '%s\n' "${BOLD}Error:${RESET} The published SHA256 is not 64 hex characters, so the file was not checked." >&2
    return 1
  fi
  verify_sha256 "$file" "$sha"
}

verify_mode() {
  [ -z "$NETWORK" ] || die "--verify checks a local file and cannot be combined with -n/--network."
  [ -z "$FLAG_MODE_OPTS" ] || die "--verify checks a local file and cannot be combined with these flag mode options:${FLAG_MODE_OPTS}."
  [ -n "$VERIFY_SHA" ] || die "--verify needs --sha256 HEX with the expected checksum."
  is_sha256 "$VERIFY_SHA" || die "--sha256 must be 64 hex characters."
  verify_sha256 "$VERIFY_FILE" "$VERIFY_SHA" || exit 1
}

# ---------------------------------------------------------------------------
# CLI / scriptable mode
# ---------------------------------------------------------------------------

cli_mode() {
  [ -n "$NETWORK" ] || die "-n/--network is required in flag mode. Run with no flags for interactive mode, or --help for usage."

  local qs
  qs="network=$(urlencode "$NETWORK")"
  [ -n "$CHAIN_ID" ] && qs="${qs}&chain_id=$(urlencode "$CHAIN_ID")"
  [ -n "$CHAIN" ]  && qs="${qs}&chain=$(urlencode "$CHAIN")"
  [ -n "$TYPE" ]     && qs="${qs}&type=$(urlencode "$TYPE")"

  if [ "$LATEST" = "true" ]; then
    local resp ok
    resp=$(api_get "/api/cli/latest?${qs}") || exit 1
    ok=$(printf '%s' "$resp" | jq -r '.success')
    if [ "$ok" != "true" ]; then
      print_api_error "$resp"
      exit 1
    fi
    local latest_url
    latest_url=$(printf '%s' "$resp" | jq -r '.data.download_url')
    is_safe_url "$latest_url" || die "The API returned a download URL that is not a plain https URL."
    if [ "$QUIET" = "true" ]; then
      printf '%s\n' "$latest_url"
    else
      local line
      line=$(printf '%s' "$resp" | jq -r '.data |
        "\(.network.name) \(.chain) #\(.height) by \(.contributor.name) (\(.type)) - \(.size)"')
      sanitize "$line"
      printf '%s\n' "$latest_url"
    fi
    return 0
  fi

  # List mode, respects --limit. jq slices the server response and
  # re-splits it into one object per line, so bash never sees a raw
  # JSON array, no matter what --limit is.
  qs="${qs}&format=cli"
  local resp ok total
  resp=$(api_get "/api/cli/snapshots?${qs}") || exit 1
  ok=$(printf '%s' "$resp" | jq -r '.success')
  if [ "$ok" != "true" ]; then
    print_api_error "$resp"
    exit 1
  fi
  total=$(printf '%s' "$resp" | jq -r '.total')
  if [ "$total" -eq 0 ]; then
    if [ "$QUIET" != "true" ]; then
      printf '%s\n' "${BOLD}Error:${RESET} No snapshots found for the given filters." >&2
    fi
    exit 1
  fi

  local row
  while IFS= read -r row; do
    local row_url
    row_url=$(printf '%s' "$row" | jq -r '.download_url')
    if ! is_safe_url "$row_url"; then
      printf '%s\n' "Skipped a snapshot whose download URL is not a plain https URL." >&2
      continue
    fi
    if [ "$QUIET" = "true" ]; then
      printf '%s\n' "$row_url"
    else
      local line
      line=$(printf '%s' "$row" | jq -r '
        "\(.network) \(.chain) #\(.height) by \(.contributor) (\(.type)) - \(.size)"')
      sanitize "$line"
      printf '%s\n\n' "$row_url"
    fi
  done < <(printf '%s' "$resp" | jq -c --argjson lim "$LIMIT" '.data[:$lim][]')
}

# ---------------------------------------------------------------------------
# Interactive mode
#
# A simple stage machine: network -> chain_id -> type -> snapshot ->
# action. (Chain isn't a separate stage - a chain ID always identifies
# exactly one chain, so it's resolved silently in stage_chain_id.) Any
# stage with exactly one option auto-selects and
# advances without prompting (data-driven: it checks the actual option
# count at runtime, nothing is hardcoded to a network name). Only stages that
# actually showed a prompt are pushed onto HISTORY, so "back" from any
# stage returns to the nearest stage that really asked the user something
# (auto-skipped stages are transparently skipped on the way back too).
# ---------------------------------------------------------------------------

NETWORKS_JSON=""
SEL_NETWORK_NAME=""
SEL_CHAIN_ID=""
SEL_CHAIN=""
SEL_TYPE=""
SEL_SNAPSHOT_JSON=""
STAGE="network"
HISTORY=()
REPLY_KIND=""
REPLY_NUM=""

next_stage() {
  case "$1" in
    network)    echo "chain_id" ;;
    chain_id)   echo "type" ;;
    type)       echo "snapshot" ;;
    snapshot)   echo "action" ;;
  esac
}

# Reads one line of input, classifying it into REPLY_KIND (eof|back|num)
# and, for num, REPLY_NUM (1..max).
read_choice() {
  local prompt="$1" max="$2" allow_back="$3" input lower
  while true; do
    printf '%s' "${BOLD}${prompt}${RESET}: "
    if ! IFS= read -r input; then
      printf '\n'
      REPLY_KIND="eof"
      return 0
    fi
    lower=$(printf '%s' "$input" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
    if [ "$allow_back" = "true" ] && { [ "$lower" = "b" ] || [ "$lower" = "back" ] || [ "$lower" = "0" ]; }; then
      REPLY_KIND="back"
      return 0
    fi
    case "$lower" in
      ''|*[!0-9]*) ;;
      *)
        if [ "$lower" -ge 1 ] && [ "$lower" -le "$max" ]; then
          REPLY_KIND="num"
          REPLY_NUM="$lower"
          return 0
        fi
        ;;
    esac
    if [ "$allow_back" = "true" ]; then
      dim "Invalid input. Enter a number between 1 and ${max}, or 'b' to go back."
    else
      dim "Invalid input. Enter a number between 1 and ${max}."
    fi
  done
}

go_back_or_exit() {
  if [ "${#HISTORY[@]}" -eq 0 ]; then
    dim "No previous step. Enter a valid choice."
    return 1
  fi
  STAGE="${HISTORY[${#HISTORY[@]}-1]}"
  unset 'HISTORY[${#HISTORY[@]}-1]'
  return 0
}

stage_network() {
  local names=() n
  while IFS= read -r n; do
    [ -n "$n" ] && names+=("$n")
  done < <(printf '%s' "$NETWORKS_JSON" | jq -r '[.data[].network] | unique | .[]')

  if [ "${#names[@]}" -eq 0 ]; then
    die "The API returned no networks."
  fi

  if [ "${#names[@]}" -eq 1 ]; then
    SEL_NETWORK_NAME="${names[0]}"
    status "Automatically selected: $(sanitize "$SEL_NETWORK_NAME")"
    STAGE=$(next_stage "$STAGE")
    return 0
  fi

  echo
  label "Available networks"
  local i=1
  for n in "${names[@]}"; do
    printf "  %d) %s\n" "$i" "$(sanitize "$n")"
    i=$((i+1))
  done
  echo
  read_choice "Select a network [1-${#names[@]}]" "${#names[@]}" false
  case "$REPLY_KIND" in
    eof) die "No input received. Exiting." ;;
    num)
      SEL_NETWORK_NAME="${names[$((REPLY_NUM-1))]}"
      HISTORY+=("$STAGE")
      STAGE=$(next_stage "$STAGE")
      ;;
  esac
}

stage_chain_id() {
  local rows=() r ids=()
  while IFS= read -r r; do
    [ -n "$r" ] && rows+=("$r")
  done < <(printf '%s' "$NETWORKS_JSON" | jq -c --arg n "$SEL_NETWORK_NAME" '.data[] | select(.network==$n)')

  if [ "${#rows[@]}" -eq 1 ]; then
    SEL_CHAIN_ID=$(printf '%s' "${rows[0]}" | jq -r '.chain_id')
    SEL_CHAIN=$(printf '%s' "${rows[0]}" | jq -r '.chains[0] // "mainnet"')
    status "Automatically selected: $(sanitize "$(printf '%s' "${rows[0]}" | jq -r '.display_name')")"
    STAGE=$(next_stage "$STAGE")
    return 0
  fi

  echo
  label "Available chain IDs"
  local i=1
  for r in "${rows[@]}"; do
    ids+=("$(printf '%s' "$r" | jq -r '.chain_id')")
    printf "  %d) " "$i"; sanitize "$(printf '%s' "$r" | jq -r '.display_name')"
    i=$((i+1))
  done
  echo
  read_choice "Select a chain ID [1-${#rows[@]}, or b=back]" "${#rows[@]}" true
  case "$REPLY_KIND" in
    eof) die "No input received. Exiting." ;;
    back) go_back_or_exit || true ;;
    num)
      SEL_CHAIN_ID="${ids[$((REPLY_NUM-1))]}"
      SEL_CHAIN=$(printf '%s' "${rows[$((REPLY_NUM-1))]}" | jq -r '.chains[0] // "mainnet"')
      HISTORY+=("$STAGE")
      STAGE=$(next_stage "$STAGE")
      ;;
  esac
}

current_network_row() {
  printf '%s' "$NETWORKS_JSON" | jq -c --arg n "$SEL_NETWORK_NAME" --arg i "$SEL_CHAIN_ID" \
    '.data[] | select(.network==$n and .chain_id==$i)'
}

stage_type() {
  local row types=() opt
  row=$(current_network_row)
  while IFS= read -r opt; do
    [ -n "$opt" ] && types+=("$opt")
  done < <(printf '%s' "$row" | jq -r '.types[]')

  if [ "${#types[@]}" -eq 1 ]; then
    SEL_TYPE="${types[0]}"
    status "Automatically selected: $(sanitize "$SEL_TYPE")"
    STAGE=$(next_stage "$STAGE")
    return 0
  elif [ "${#types[@]}" -eq 0 ]; then
    SEL_TYPE=""
    STAGE=$(next_stage "$STAGE")
    return 0
  fi

  echo
  breadcrumb false
  label "Available snapshot types"
  local i=1
  for opt in "${types[@]}"; do
    printf "  %d) %s\n" "$i" "$(sanitize "$opt")"
    i=$((i+1))
  done
  echo
  read_choice "Select a type [1-${#types[@]}, or b=back]" "${#types[@]}" true
  case "$REPLY_KIND" in
    eof) die "No input received. Exiting." ;;
    back) go_back_or_exit || true ;;
    num)
      SEL_TYPE="${types[$((REPLY_NUM-1))]}"
      HISTORY+=("$STAGE")
      STAGE=$(next_stage "$STAGE")
      ;;
  esac
}

SNAP_ROWS=()

stage_snapshot() {
  local qs resp ok row

  # The detailed format (the default) is used here rather than format=cli
  # because only it carries checksum.sha256, which the Download action
  # verifies. Rows are reshaped to the flat fields the table reads.
  qs="network=$(urlencode "$SEL_NETWORK_NAME")&chain_id=$(urlencode "$SEL_CHAIN_ID")&chain=$(urlencode "$SEL_CHAIN")"
  [ -n "$SEL_TYPE" ] && qs="${qs}&type=$(urlencode "$SEL_TYPE")"

  resp=$(api_get "/api/cli/snapshots?${qs}") || exit 1
  ok=$(printf '%s' "$resp" | jq -r '.success')
  if [ "$ok" != "true" ]; then
    print_api_error "$resp"
    exit 1
  fi

  SNAP_ROWS=()
  while IFS= read -r row; do
    [ -n "$row" ] && SNAP_ROWS+=("$row")
  done < <(printf '%s' "$resp" | jq -c '.data[] |
    (.contributor | if type == "object" then .name else . end) as $who |
    (.network | if type == "object" then .name else . end) as $network |
    {height, type, file_size, time, download_url, filename,
     contributor: $who,
     display_name: "\($network) \(.chain) #\(.height) by \($who) (\(.type))",
     sha256: (.checksum.sha256 // "")}')

  if [ "${#SNAP_ROWS[@]}" -eq 0 ]; then
    printf '%s\n' "${BOLD}Error:${RESET} No snapshots found for the selected filters." >&2
    exit 1
  fi

  echo
  breadcrumb true
  label "Available snapshots"
  # Network, chain and type are already fixed above (shown once in the
  # breadcrumb instead of repeated on every line) - the table only needs
  # the columns that can still vary per snapshot.
  printf '%s\n' "${DIM}   #  HEIGHT        TYPE      SIZE        TIME (UTC)              CONTRIBUTOR${RESET}"
  local i=1 height type size contributor time_raw time_fmt
  for row in "${SNAP_ROWS[@]}"; do
    height=$(sanitize "$(printf '%s' "$row" | jq -r '.height')")
    type=$(sanitize "$(printf '%s' "$row" | jq -r '.type')")
    size=$(sanitize "$(printf '%s' "$row" | jq -r '.file_size')")
    contributor=$(sanitize "$(printf '%s' "$row" | jq -r '.contributor')")
    time_raw=$(sanitize "$(printf '%s' "$row" | jq -r '.time')")
    time_fmt="${time_raw/T/ }"; time_fmt="${time_fmt%.*}"; time_fmt="${time_fmt%Z} UTC"
    printf "  %2d  %-12s  %-9s %-11s  %-23s %s\n" "$i" "$height" "$type" "$size" "$time_fmt" "$contributor"
    i=$((i+1))
  done
  echo
  read_choice "Select a snapshot [1-${#SNAP_ROWS[@]}, or b=back]" "${#SNAP_ROWS[@]}" true
  case "$REPLY_KIND" in
    eof) die "No input received. Exiting." ;;
    back) go_back_or_exit || true ;;
    num)
      SEL_SNAPSHOT_JSON="${SNAP_ROWS[$((REPLY_NUM-1))]}"
      HISTORY+=("$STAGE")
      STAGE=$(next_stage "$STAGE")
      ;;
  esac
}

stage_action() {
  local url filename out
  url=$(printf '%s' "$SEL_SNAPSHOT_JSON" | jq -r '.download_url')
  filename=$(printf '%s' "$SEL_SNAPSHOT_JSON" | jq -r '.filename // empty')
  is_safe_url "$url" || die "The API returned a download URL that is not a plain https URL."

  echo
  label "Selected: $(sanitize "$(printf '%s' "$SEL_SNAPSHOT_JSON" | jq -r '.display_name')")"
  echo "  1) View link"
  echo "  2) Download"
  echo
  read_choice "Select an action [1-2, or b=back]" 2 true
  case "$REPLY_KIND" in
    eof) die "No input received. Exiting." ;;
    back) go_back_or_exit || true ;;
    num)
      if [ "$REPLY_NUM" = "1" ]; then
        echo
        bold "Download URL:"
        echo "$url"
        echo
        dim "Press Enter to return to the snapshot menu..."
        read -r _ignored || true
      else
        echo
        out=$(safe_download_name "$filename" "$url")
        bold "Downloading $(sanitize "$out")..."
        if curl -fL -o "$out" "$url"; then
          echo
          bold "Saved to $(sanitize "$out")."
          check_download "$out" || exit 1
          exit 0
        else
          die "Download failed."
        fi
      fi
      ;;
  esac
}

interactive_mode() {
  print_banner
  echo
  header "SnapsOS interactive mode"
  echo
  label "Terminal client for the SnapsVault snapshot marketplace,"
  label "with the same snapshot data as the web app."
  echo
  dim "Flag mode and all options: snapsos.sh --help"
  echo
  printf '%s\n' "${ITALIC}${DIM}Fetching available networks...${RESET}"

  NETWORKS_JSON=$(api_get "/api/networks") || exit 1
  local ok
  ok=$(printf '%s' "$NETWORKS_JSON" | jq -r '.success')
  if [ "$ok" != "true" ]; then
    print_api_error "$NETWORKS_JSON"
    exit 1
  fi

  while true; do
    case "$STAGE" in
      network)    stage_network ;;
      chain_id)   stage_chain_id ;;
      type)       stage_type ;;
      snapshot)   stage_snapshot ;;
      action)     stage_action ;;
    esac
  done
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if [ -n "$VERIFY_FILE" ]; then
  verify_mode
elif [ -n "$NETWORK" ]; then
  cli_mode
elif [ -n "$CHAIN" ] || [ -n "$CHAIN_ID" ]; then
  die "-n/--network is required in flag mode. Run with no flags for interactive mode, or --help for usage."
else
  interactive_mode
fi
