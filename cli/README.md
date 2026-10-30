# SnapsOS CLI

Command-line client for the SnapsVault snapshot marketplace. It browses and
downloads blockchain snapshots, either interactively or with flags, and checks
each download against the SHA256 the contributor publishes.

`snapsos.sh` calls the purpose-built API endpoints only.

- `GET /api/networks` lists the networks and builds the interactive menu
- `GET /api/cli/snapshots?network=X` returns the filtered, sorted snapshot list
- `GET /api/cli/latest?network=X` returns the newest snapshot for the filters

All filtering, sorting and case-insensitive network matching happen server-side.
The script does not re-implement any of that logic.

The interactive snapshot list prints every time in UTC with the `UTC` label, for example `2026-10-19 12:00:00 UTC`.

## Install

```bash
curl -fsSL https://snapsvault.xyz/snapsos.sh -o snapsos.sh && bash snapsos.sh
```

The address serves `cli/snapsos.sh` from the `main` branch of
[denodesxyz/snapsvault](https://github.com/denodesxyz/snapsvault). With no
flags the script starts interactive mode.

## Requirements

`bash`, `curl`, `jq` and `tr`, checked on start. SHA256 checks use
`sha256sum`, or `shasum -a 256` where `sha256sum` is missing (stock macOS).
`tput` and `awk` are used for styling only. `NO_COLOR` disables color.

## Usage

```
bash snapsos.sh [options]
bash snapsos.sh                                # no flags, interactive mode
bash snapsos.sh --verify FILE --sha256 HEX     # check an existing file
```

### Options

| Flag | Description |
|---|---|
| `-n`, `--network NAME` | Network, for example `Celestia`. Case-insensitive. |
| `-c`, `--chain NAME` | Chain, `mainnet` or `testnet`. Default: the chain of `-i` when given, else `mainnet` with `--latest`, both chains in a list. `-c`, `-i` and `-t` are case-insensitive. |
| `-i`, `--chain-id ID` | Chain ID, for example `celestia` or `mocha-5` |
| `-t`, `--type TYPE` | Snapshot type, for example `pruned` or `archive` |
| `-l`, `--latest` | Resolve only the newest snapshot |
| `-m`, `--limit NUM` | Max snapshots to list without `--latest` (default 15) |
| `-q`, `--quiet` | Print only the resolved download URL or URLs, for piping |
| `--no-verify` | Skip the SHA256 check after an interactive download |
| `--verify FILE` | Check an existing file against `--sha256`, then exit |
| `--sha256 HEX` | Expected SHA256 for `--verify`, 64 hex characters |
| `--api-base URL` | Override the API base URL (env `SNAPSV_API_BASE`) |
| `-h`, `--help` | Show help and exit |

Default API base: `https://celestia.snapsvault.xyz`.

### Examples

```
bash snapsos.sh -n Celestia --latest
# Celestia mainnet #15099873 by UnityNodes (pruned) - 4.40GB
# https://snapshots.unitynodes.com/celestia-mainnet/latest.tar.lz4

bash snapsos.sh -n celestia --latest          # case-insensitive, same result
bash snapsos.sh -n Celestia -c testnet --latest
bash snapsos.sh -n Celestia -t archive --latest
bash snapsos.sh -n Celestia -m 5              # 5 snapshots, two lines each
bash snapsos.sh -n Celestia --latest -q       # prints only the bare URL
```

Piping example. The file name comes from the URL, so the extension matches
the archive format:

```
url=$(bash snapsos.sh -n Celestia --latest -q)
curl -fL -o "$(basename "$url")" "$url"
```

## Interactive mode

Run with no flags. The flow is network, chain ID, type, snapshot, action. The
chain (mainnet or testnet) is not a separate step: a chain ID identifies one
chain, so it is resolved when the chain ID is picked. A step with a
single option is selected automatically and announced ("Automatically
selected: ..."). The menu is built from the live `/api/networks` response, so
a new network appears in it with no code change.

At any prompt that has a previous step, `b`, `back` or `0` goes back. Going
back skips steps that were selected automatically and returns to the nearest
step that showed a prompt.

After a snapshot is picked:

```
1) View link     prints the download URL, waits for Enter, then returns
                 to the same snapshot menu
2) Download      downloads the URL with curl -fL (with curl's progress
                 meter) to the file name reported by the API, then checks
                 its SHA256
```

The file name from the API is used only when it is a plain name: not empty,
no `/`, no control characters and not starting with `.` or `-`. Otherwise the
last segment of the download URL is used under the same rules, and
`snapshot.bin` when that fails too.

A failed download (for example a stale snapshot URL) is reported as an error
and exits non-zero. The script uses `curl -f`, so the HTTP status decides
success.

## Checksum verification

After a download, the script compares the file with the snapshot's published
`checksum.sha256`.

| Case | Output | Exit code |
|---|---|---|
| Checksum matches | `SHA256 match: <hash>` | 0 |
| Checksum differs | `Error: SHA256 mismatch.` plus the expected and actual hashes | 1 |
| No checksum published | `No SHA256 is published for this snapshot, so the file was not checked.` | 0 |
| `--no-verify` given | `SHA256 check skipped (--no-verify).` | 0 |

A file that does not match should be deleted and downloaded again.

To check a file that is already on disk, for example one downloaded with the
piping example above, pass the expected hash. The snapshot page in the web app
shows it.

```
bash snapsos.sh --verify "$(basename "$url")" --sha256 <64 hex characters>
```

`--verify` exits 0 on a match and 1 on a mismatch, a missing file, a path that
is not a regular file or a malformed hash. It does not call the API. It
rejects the flag mode options `-n`, `-c`, `-i`, `-t`, `-l`, `-m` and `-q`
(and their long forms) with an error instead of ignoring them.

## Error handling

Invalid networks, empty result sets and network failures print a short message
and exit non-zero, never a raw `jq` or bash trace. When the API returns a
`suggestion` field (for example on `/api/cli/latest` with no match), it is
printed too. Text from the API is stripped of control characters before it
reaches the terminal.

## Design notes

- Flag mode reads `/api/cli/snapshots?format=cli` and `/api/cli/latest`, which
  already filter and sort server-side, so neither an availability field nor
  the filter logic is implemented again in `jq`.
- List slicing and the split into one object per line happen in the same `jq`
  expression (`.data[:$lim][]`), so bash never receives a raw JSON array,
  whatever `--limit` is.
- Interactive mode reads the default (detailed) format of
  `/api/cli/snapshots`, which carries `checksum.sha256`, and reshapes each row
  to the flat fields the table needs.

## Tests

```
bash cli/tests/run.sh
```

The tests run offline. A local `python3 -m http.server` serves fixture JSON at
the API paths and small fixture files in place of snapshot archives, and the
script is pointed at it through `SNAPSV_API_BASE`. They cover a matching,
mismatching and missing checksum, `--no-verify`, `--verify`, `--help` and flag
mode parsing. Requirements: `bash`, `curl`, `jq`, `python3`.

The `CLI` GitHub Actions workflow runs `shellcheck` and these tests on Ubuntu
and macOS for every pull request that touches `cli/`.
