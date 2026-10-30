---
title: Contribute snapshots
description: How a contributor gets its snapshots listed on SnapsVault with a JSON feed, one registry file and a pull request.
---

# Contribute snapshots

This page shows how a contributor, a snapshot provider, lists its snapshots on SnapsVault. Nothing needs to be installed on the snapshot server: the feed is a plain file, and the registry file is checked automatically on the pull request.

## The process

The process includes three steps:

1. Publish a JSON feed over HTTPS, one entry per snapshot, in the format of the [feed example](#feed-example).
2. Add one file at `chains/celestia/<chain ID>/<contributor>.json` to the [registry repository](https://github.com/denodesxyz/snapsvault-registry) by pull request, in the format of the [registry file example](#registry-file-example). `<chain ID>` is `celestia` (mainnet), `mocha-4` or `mocha-5` (testnets). `<contributor>` is a file name of your choice, such as your contributor name, and you reuse it in every chain ID folder.
3. Once the pull request is merged, the snapshots appear on SnapsVault, in the [Marketplace](/core-components/marketplace), the [SnapsOS CLI](/core-components/snapsos-cli) and the [REST API](/core-components/rest-api), within a few minutes.

::: info Already on SnapsVault?
Some contributors are already listed. They edit their existing file in `chains/celestia/<chain ID>/` and replace its feed URL with their own, keeping the file name, instead of adding a new file. A new file with the same contributor name fails the check.
:::

::: tip Need help?
Ask in your pull request, or on [Telegram](https://t.me/goldzn). More options are on the [Feedback](/contributing/feedback) page.
:::

::: tip Using an AI agent?
A ready prompt in [Set it up with an AI agent](#set-it-up-with-an-ai-agent) lets a coding agent create the feed on the snapshot server.
:::

## Feed example

A feed is a JSON array served over HTTPS, one entry per current snapshot, one feed per chain ID and snapshot type. The file can have any name, for example `index.json`. Fill all six fields: `url`, `filename`, `size`, `creation_date`, `latest_block_height` and `sha256sum`. A missing field is shown as "N/A" on SnapsVault (see [Feed format](/contributing/feed-format#feed-fields) for the few that get a fallback), and the check fails when `url` is missing, or `latest_block_height` is missing (except for an archive). A snapshot of type `archive` that starts at genesis may use height `0`. This example is based on the deNodes mainnet feed:

```json
[
  {
    "url": "https://celestia-mainnet-snap.denodes.xyz/celestia-mainnet_15318997.tar.bz2",
    "filename": "celestia-mainnet_15318997.tar.bz2",
    "size": "38Gb",
    "creation_date": "2026-10-26T20:02:47Z",
    "latest_block_height": "15318997",
    "sha256sum": "931f722be05699d02cbc082c476aa48d07b9fa1ea1c336dc6844e8298838b598"
  }
]
```

Each field and its rules are described in the [Feed format](/contributing/feed-format#feed-fields) page.

::: details Publishing several snapshots
List every current snapshot of the same chain ID and snapshot type as one more entry in the same array. Each entry needs its own `url` and its own `latest_block_height`.

```json
[
  {
    "url": "https://celestia-mainnet-snap.denodes.xyz/celestia-mainnet_15318997.tar.bz2",
    "filename": "celestia-mainnet_15318997.tar.bz2",
    "size": "38Gb",
    "creation_date": "2026-10-26T20:02:47Z",
    "latest_block_height": "15318997",
    "sha256sum": "931f722be05699d02cbc082c476aa48d07b9fa1ea1c336dc6844e8298838b598"
  },
  {
    "url": "https://celestia-mainnet-snap.denodes.xyz/celestia-mainnet_15313940.tar.bz2",
    "filename": "celestia-mainnet_15313940.tar.bz2",
    "size": "37Gb",
    "creation_date": "2026-10-26T16:02:43Z",
    "latest_block_height": "15313940",
    "sha256sum": "d0d08cf821578bca2b14aebdc56f17d6b51417b1539df43b37a918b2d3265214"
  }
]
```

A feed holds one snapshot type. To publish both `pruned` and `archive` snapshots, publish two feeds and list both in the registry file.
:::

## Registry file example

The registry file names the contributor and points at each feed with its snapshot type and update period. This is the deNodes file for mainnet, `chains/celestia/celestia/deNodes.json`:

```json
{
  "contributor": {
    "name": "deNodes",
    "email": "hello@denodes.io",
    "discord": "bombermine",
    "telegram": "https://t.me/denodes",
    "x": "https://x.com/denodes_io",
    "description": "An institutional-grade staking provider delivering secure operations and superior performance for PoS networks",
    "website": "https://denodes.io",
    "identity": "C89053F92B77D8C0"
  },
  "snapshots": [
    {
      "snapshots": "https://celestia-mainnet-snap.denodes.xyz/index.json",
      "type": "pruned",
      "period": "4h",
      "tx_index": false
    }
  ]
}
```

- `snapshots` is the URL of the feed.
- `type` is `pruned` or `archive`.
- `period` is how often a new snapshot appears, such as `4h`, `6h` or `1d`.
- `tx_index` is `true` only if the node keeps the transaction index.

`snapshots` is an array, so one file can list several feeds, one per type. A contributor with snapshots for several chain IDs adds one file to each chain ID folder, with the same file name and the same `contributor` object. The fields are described in [Registry file](/contributing/registry-file).

## Check the file

Every pull request runs the **Validate registry** check on the files it adds or changes. It reads the file, fetches every feed it lists and applies the rules of the reference pages.

::: tip Run it before the pull request
From a clone of the registry, with Node.js 22.18 or later:

```bash
node scripts/validate.mjs chains/celestia/<chain ID>/<contributor>.json
```
:::

Each problem names the field, the value found, what is expected and what SnapsVault does with it. An entry stops at its first problem, so run the check again after each fix.

| Result | Effect | Typical cause |
|---|---|---|
| Error | Fails the check | A rule of the reference pages is broken |
| Warning | Does not fail the check | A missing `size` or `sha256sum`, data shown as "N/A", a value read differently from what was written (such as a size without a unit), a snapshot file that does not answer the reachability request |

## Open a pull request

1. Fork the [registry repository](https://github.com/denodesxyz/snapsvault-registry).
2. Add the file at `chains/celestia/<chain ID>/<contributor>.json`, one per chain ID, where `<chain ID>` is `celestia`, `mocha-4` or `mocha-5` and the file name is the same in every chain ID folder.
3. Open a pull request that lists the feed URLs and the snapshot types they cover.
4. The SnapsVault team reviews the file against the checklist and merges it.

### Review checklist

The pull request template carries the same checklist.

| Area | What the review checks |
|---|---|
| File | Path `chains/celestia/<chain ID>/<contributor>.json`, one file per chain ID, with the same file name in every folder. The contributor name and every feed URL are not used by another contributor. |
| Feed | Returns a JSON array, smaller than 1 MiB, within 10 seconds, without redirects. |
| URLs | Every feed and download URL starts with `https://`, uses a public DNS name, and has no port, credentials or IP address. |
| Entries | Every entry has all six fields: `url`, `filename`, `size`, `creation_date`, `latest_block_height` and `sha256sum`. A `pruned` entry has a `latest_block_height` above `0` (height `0` is only for an `archive` that starts at genesis). |
| Size | Has a unit, such as `38Gb`. A bare number is read as GB; a bare value above `100000` is an error. |
| Type and period | The registry `type` matches the feed and wins over the `type` of each entry. `period` matches how often the feed really updates. |
| Snapshot files | The newest snapshot file answers a HEAD request over HTTPS (a warning if not). A stable latest URL, such as `latest.tar.lz4`, comes with a `latest_block_height` that changes for each new snapshot file, so history is kept. |
| Check | **Validate registry** passes on the pull request, or the [local run](#check-the-file) passes. |

## After the merge

A new listing appears within a few minutes. Search for the contributor name in the [Marketplace](/core-components/marketplace) or query the [REST API](/core-components/rest-api). If the listing does not appear, re-check the checklist above.

A contributor is listed while its feed can be read, and a snapshot stays listed while it is in the feed.

## Update or remove a listing

Changes to the profile, feed URL, type or period go through a pull request that edits the registry file. A pull request that deletes the file removes the contributor. Its snapshots leave the Marketplace at the next sync.

## Generate a feed with a script

A contributor can produce the feed with any tool in its own stack, because only the [feed format](/contributing/feed-format) matters. Below is an example for a typical Linux server, to adapt as needed. It needs bash, GNU coreutils and awk, and writes a one-entry feed next to the snapshot.

:::: details make-feed.sh
```bash
#!/usr/bin/env bash
# Usage: make-feed.sh FILE TYPE HEIGHT BASE_URL [FEED]
# TYPE is pruned or archive. FEED defaults to index.json next to the snapshot file.
# Example: make-feed.sh /srv/snap/celestia-mainnet_15318997.tar.bz2 pruned 15318997 https://snap.example.com
set -euo pipefail
export LC_ALL=C

file=${1:?usage: make-feed.sh FILE TYPE HEIGHT BASE_URL [FEED]}
type=${2:?missing TYPE}
height=${3:?missing HEIGHT}
base=${4:?missing BASE_URL}
feed=${5:-$(dirname "$file")/index.json}
name=$(basename "$file")

die() { echo "error: $*" >&2; exit 1; }

[[ -s $file ]] || die "file not found or empty: $file"
[[ $type == pruned || $type == archive ]] || die "TYPE must be pruned or archive"
if [[ $type == pruned ]]; then
  [[ $height =~ ^[1-9][0-9]{0,14}$ ]] || die "every type except archive needs a height above 0"
else
  [[ $height =~ ^(0|[1-9][0-9]{0,14})$ ]] || die "HEIGHT must be a whole number (0 only for an archive from genesis)"
fi
[[ $base =~ ^https://([A-Za-z0-9-]+\.)+[A-Za-z]+(/[A-Za-z0-9._~/-]*)?$ ]] || die "BASE_URL must be https:// followed by a public host name and an optional plain path"
[[ $name =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$ && $name != *..* ]] || die "invalid file name: $name"

bytes=$(stat -c %s "$file")
size=$(awk -v b="$bytes" 'BEGIN { if (b >= 1e9) printf "%.1fGB", b / 1e9; else if (b >= 1e6) printf "%.1fMB", b / 1e6; else printf "%dB", b }')
created=$(date -u -d "@$(stat -c %Y "$file")" +%Y-%m-%dT%H:%M:%SZ)
sum=$(sha256sum "$file" | awk '{ print $1 }')

tmp=$(mktemp "$feed.XXXXXX")
trap 'rm -f "$tmp"' EXIT
printf '[\n  {\n    "url": "%s/%s",\n    "filename": "%s",\n    "size": "%s",\n    "creation_date": "%s",\n    "latest_block_height": "%s",\n    "sha256sum": "%s"\n  }\n]\n' \
  "${base%/}" "$name" "$name" "$size" "$created" "$height" "$sum" > "$tmp"
chmod 644 "$tmp"
mv "$tmp" "$feed"
echo "wrote $feed"
```

```bash
./make-feed.sh /srv/snap/celestia-mainnet_15318997.tar.bz2 pruned 15318997 https://snap.example.com
```

The script works as follows:

- The contributor passes the type and the block height, because only the contributor knows them.
- It takes the size, the modification time and the SHA256 from the file, and rejects input that breaks the [feed format](/contributing/feed-format) rules. If the server already writes a `.sha256` file, use only its first 64 characters (the hash) for `sha256sum`, not the whole line with the file name.
- It moves the finished feed into place, so the sync never reads a half-written file.
- The feed URL for the registry file is then `https://snap.example.com/index.json`.
- Call it at the end of the snapshot job, once the snapshot file is complete. Each feed covers one chain ID and one snapshot type, so give each its own `FEED` path.
- One entry is enough, because older snapshots move to the history when they leave the feed.

::: tip Check the JSON
To check the file without Node.js, run `python3 -m json.tool index.json`.
:::
::::

## Set it up with an AI agent

An AI coding agent can set up the feed on the snapshot server. Fill in the four values at the top and paste the prompt into the agent, running on that server. The agent shows its plan before it changes anything.

<div class="sv-prompt">

```text
Set up a SnapsVault snapshot feed on this server.

Snapshot folder: <folder where the snapshot files are written>
Public base URL: <https:// URL that serves that folder>
Chain ID: <celestia, mocha-4 or mocha-5>
Snapshot type: <pruned or archive>

Rules: follow these pages exactly and treat them as the source of truth:
- https://docs.snapsvault.xyz/contributing/feed-format
- https://docs.snapsvault.xyz/contributing/list-your-snapshots

Steps:
1. Inspect the snapshot folder and the job that creates the snapshots (cron, systemd timer or script). Do not move, rename or delete any snapshot file.
2. Find the block height of each snapshot from the snapshot job: its file name, its log or the node state at the time the snapshot was taken. Never use the current height of a running node for an older file. If the height cannot be found, stop and ask me.
3. Write the feed: a JSON array with one entry per current snapshot and the six fields url, filename, size, creation_date, latest_block_height and sha256sum. Compute sha256sum from the file, or take the 64-character hash from an existing .sha256 file. Write it under a new name and move it into place, so a reader never sees a half-written feed.
4. Run the feed update at the end of the snapshot job, once the snapshot file is complete, so the feed changes with every new snapshot.
5. Check the result: the JSON parses, every entry has the six fields in the documented formats, and the feed URL and every snapshot url answer over HTTPS.
6. Print the feed URL and a draft registry file for chains/celestia/<chain ID>/<contributor>.json in the format of the registry file example, with the period that matches the snapshot job.

Before step 3, show me the plan: the files you will create or change and the exact feed you will write for the newest snapshot. Wait for my approval.
```

</div>

The agent ends with the feed URL and a draft registry file. Review the draft, then [open a pull request](#open-a-pull-request) or ask the SnapsVault team to update an existing listing.
