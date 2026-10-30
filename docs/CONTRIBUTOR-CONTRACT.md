# Contributor contract

This file says where the registry and feed rules are implemented, and records the behavior that the documentation pages leave out. The rules themselves, with fields, limits and examples, are documented once:

- [Registry file](https://docs.snapsvault.xyz/contributing/registry-file): location, contributor profile and `snapshots[]` fields
- [Feed format](https://docs.snapsvault.xyz/contributing/feed-format): entry fields, URL rules, limits and the height rule
- [Contribute snapshots](https://docs.snapsvault.xyz/contributing/list-your-snapshots): the process, examples and the review checklist

A change to the rules updates those pages and this file in the same pull request.

## Where the rules live

| Rule | Code |
|---|---|
| Feed entries, URLs, file names, size, date, height, SHA256, contributor fields | `src/lib/validation/feed.ts` |
| Public host check for URLs | `src/lib/validation/public-host.ts` |
| Registry listing, feed fetching, sync | `src/lib/github-data-service.ts` |
| Chain from the chain ID | `src/lib/chain-kind.ts` |
| Contributor links, logo and Discord shown in the Marketplace | `src/lib/contributor-profile.ts` |
| Pull request check on the registry | `scripts/validate.mjs` in [snapsvault-registry](https://github.com/denodesxyz/snapsvault-registry), kept in line by `test/parity.test.mjs` |

## Behavior not covered in the docs

### Registry

- `<network>` is the directory name, stored as `chain.name` with the first letter capitalized (`celestia` becomes `Celestia`). Its logo is set in `src/lib/constants.ts`; an unknown network shows the default image.
- Files and directories that break the name rules are skipped and logged without being read.
- Invalid values are logged with the reason and never stored. A value of `null` or `""` is treated like a missing key.
- `type` and `period` are optional in code but produce broken data when missing: they then fall back to the newest feed entry, and a failed feed produces a configuration with `type: ""`. When the `tx_index` key is present in the registry file, the feed value is ignored.

### Feed

- A breach of a feed limit marks the configuration unavailable for that run, logs the reason and stores nothing from that feed.
- A present field with an invalid value skips that entry. The first 20 skipped entries of a feed are logged as `skip <feed host> #<index>: <reason>` with the offending value truncated to 100 characters, then one summary line gives the total.
- Size is stored verbatim: a number with a unit (`B`, or `K`, `M`, `G`, `T`, `P` optionally followed by `B` or `iB`, case-insensitive, at most one space between number and unit), or 1 to 15 digits. A finite JSON number above 0 is stored as `"<n>GB"`. A missing size is stored as `"0GB"`.
- A missing `creation_date` becomes the time of the sync, not a value read from the feed.
- Entries are sorted by `creation_date`, newest first, and the newest entry supplies a missing `type` or `period`.
- Every entry becomes a snapshot keyed on `(chain.name, chain_id, type, contributor.name, block_height)`. An entry without a height (an `archive`, stored as height 0) is keyed on its `download_url` instead. An entry that repeats a height updates that snapshot in place. Entries missing from the latest feed are marked `is_current: false`.
- The sync does not check that the snapshot file answers, that `size` matches its content length or that `creation_date` is recent. The registry check sends a HEAD request to the newest entry and warns when it does not answer with a 2xx status. Contributors should still meet all three.

### What the interfaces return

- `GET /api/cli/latest` returns the entry with the highest `block_height` for the filters. It returns no shell command strings: the client builds the download command and quotes the URL. `filename` is the last path segment of `download_url` when it passes the file name rule, otherwise `null`.
- A stored snapshot whose `download_url` fails the URL rules is never returned by `/api/cli/latest`, `/api/cli/snapshots`, `/api/snapshots` or `/api/snapshots/historical` (the drop is logged). `/api/snapshot-configurations` returns `latest_snapshot: null` when its `url` fails the rules. The detail page shows a `wget '<url>'` line only for a URL that passes the rules, with the URL single-quote escaped.
- Contributor fields are checked again when the Marketplace renders them, so values stored before ingest validation are covered too. `website`, `x` and `telegram` become links only when they pass the URL rules. The logo is `logoUrl` when it passes, else the stored `image` when it is a same-origin path or a valid https URL, else `/default-contributor.svg`. Ingest sets `image` to the Keybase avatar path for a valid `identity`.
- Discord is a plain username: it is shown as text, only when it passes the `discord` rule, and is never a link. The email link is built only from an address that passes the `email` rule.
