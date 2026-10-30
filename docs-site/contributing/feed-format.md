---
title: Feed format
description: The fields, rules and limits of a SnapsVault snapshot feed, the JSON file a contributor publishes over HTTPS.
---

# Feed format

This page is the reference for the snapshot feed: a JSON array served over HTTPS, one entry per current snapshot. To publish one, follow [Contribute snapshots](/contributing/list-your-snapshots). The registry side is described in [Registry file](/contributing/registry-file).

## Feed fields

Fill all six fields below for each entry. A missing field is shown as "N/A" on SnapsVault, except where the table names a fallback. A value of `null` or `""` counts as absent, and unknown keys are ignored. A present field with an invalid value skips that entry.

| Field | What to provide | Rule | When absent |
|---|---|---|---|
| `url` | HTTPS download URL of the snapshot file | [URL rules](#url-rules), no fragment. Alias `download_url`. | The entry is skipped |
| `filename` | File name of the snapshot file | `^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$`, no `..` | Last path segment of `url` |
| `size` | Size of the snapshot file with a unit, such as `38Gb` or `4.4GB` | A number with a unit (`B`, or `K`, `M`, `G`, `T`, `P` with optional `B` or `iB`), case-insensitive, so `38Gb` and `38GB` both mean 38 gigabytes. At most 24 characters. | Shown as "N/A"; the API returns `"0GB"` |
| `creation_date` | When the snapshot was made | ISO 8601 with `Z` or an offset, a real date between 2019-01-01 and one day from now. Alias `time`. | Time of the sync |
| `latest_block_height` | Block height of the snapshot | Safe integer or a string of 1 to 15 digits. Aliases `block_height`, `height`. See the [height rule](#height-rule). | Counts as 0 |
| `sha256sum` | SHA256 of the snapshot file | 64 hex characters, stored lower case. Alias `checksum.sha256`. If the server already writes a `.sha256` file, use only its first 64 characters (the hash), not the whole line with the file name. | No checksum is shown |

::: details Size units
A bare number is read as GB, and a digit string without a unit is shown without one. Never publish bytes: the check fails a bare value above `100000`. Sorting by size across units is approximate.
:::

### Also accepted in a feed

`type`, `period` and `tx_index` belong in the [registry file](/contributing/registry-file#feeds), which explains each of them. The registry values win, and the feed values are used only when the registry file leaves them out.

| Field | Rule |
|---|---|
| `type` | Matches `^[A-Za-z0-9._-]{1,32}$` |
| `period` | Matches `^[A-Za-z0-9._-]{1,32}$` |
| `tx_index` | A boolean, or `"true"` or `"false"` |

When neither file sets the `type`, the type of the newest entry is used.

## What the check requires

The registry check fails an entry only when it has no valid `url`, when a present field has an invalid value, or when it breaks the height rule. A missing `size` or `sha256sum` gives a warning. Everything else missing is shown as "N/A" or replaced by the fallback in the table. Fill all six fields so every snapshot shows its size, date, height and checksum.

### Height rule

::: warning Height above 0
`latest_block_height` must be above 0 for every entry, unless the effective type is exactly `archive` (lower case), an archive that starts at genesis. A missing height counts as 0. The effective type is the `type` in the registry file, else the `type` of the newest entry in the feed (by `creation_date`), else the `type` of the entry itself. An entry that breaks the rule is skipped.
:::

## How fields show on SnapsVault

- **SHA256** is shown next to the snapshot.
- **Type** applies to every entry of a feed, so one feed carries one type. An entry whose own `type` differs from the registry `type` gets a warning from the check.
- **Period** values in the `4h`, `1d` and `1w` style are parsed for "next update".
- **Size** is shown as published.
- **Reachability.** The check sends a HEAD request to the `url` of the newest entry and warns when the snapshot file does not answer with a success status.

## Feed limits

| Limit | Value |
|---|---|
| Transport | HTTPS only, redirects refused |
| Timeout | 10 seconds |
| Body size | At most 1 MiB, checked on `Content-Length` and while reading |
| Top level | JSON array with at least one entry |
| Entries kept | 500 newest |

::: details How a snapshot is identified
A snapshot is identified by network, chain ID, type, contributor and height. A snapshot without a height (an `archive`, stored as height 0) is identified by its download URL instead, so each snapshot file is its own snapshot. A feed that repeats the same height still updates that one snapshot in place, so publish a new height for each snapshot to build history. Snapshots that leave the feed move to the history, which the API returns through `/api/snapshots/historical`.
:::

## URL rules

These apply to feed URLs, download URLs and profile links.

| Rule | Detail |
|---|---|
| Length and characters | At most 2048 characters from `A-Z a-z 0-9 . _ ~ : / ? & = % + , @ -` (profile links may also contain `#`) |
| Scheme | Starts with lowercase `https://` |
| Host characters | Only letters, digits, dots and hyphens: no user, password, port or percent-encoding |
| Host name | A public DNS name with at least two labels and an alphabetic top-level label. IP addresses, `localhost` and names ending in `.local`, `.localhost`, `.internal`, `.localdomain`, `.lan` or `.home.arpa` are rejected. |

## Next steps

- [Contribute snapshots](/contributing/list-your-snapshots): publish your feed and get listed
- [Registry file](/contributing/registry-file): describe the feed in the registry
- [REST API](/core-components/rest-api): the same fields as the API returns them
