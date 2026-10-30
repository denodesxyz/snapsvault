---
title: Registry file
description: The location, fields and rules of a SnapsVault registry file, which lists a contributor and its snapshot feeds.
---

# Registry file

This page is the reference for the registry file: one JSON file per contributor and chain ID in the [registry repository](https://github.com/denodesxyz/snapsvault-registry). To add one, follow [Contribute snapshots](/contributing/list-your-snapshots). The feed it points at is described in [Feed format](/contributing/feed-format).

## File location

The file lives at `chains/<network>/<chain ID>/<contributor>.json`. The first directory level is the network, capitalized for display. The second level is the chain ID, which decides the chain. Each file holds one contributor and one chain ID.

| Folder | Chain ID | Chain |
|---|---|---|
| `celestia/` | `celestia` | Mainnet |
| `mocha-4/` | `mocha-4` | Testnet |
| `mocha-5/` | `mocha-5` | Testnet |

::: info New chain IDs
A new chain ID needs an issue first.
:::

| Item | Rule |
|---|---|
| Directory names | Match `^[A-Za-z0-9._-]{1,64}$` |
| File names | Match `^[A-Za-z0-9._-]{1,100}\.json$` and are not only dots before `.json`. The file name does not have to equal `contributor.name`, but every file of one contributor uses the same file name. |
| Chain | A chain ID is testnet when it is exactly `mocha-4` or `mocha-5`, or when it contains `test` (case-insensitive). Every other chain ID is mainnet. |

## Fields

A value of `null` or `""` counts as absent. An invalid profile field is dropped from the profile, and an invalid `snapshots[]` element skips that feed.

### Contributor profile

| Field | Required | Rule |
|---|---|---|
| `contributor` | Yes | Object |
| `contributor.name` | Yes | Display name, 1 to 64 characters after trimming, no control, bidirectional or zero-width characters. Compared without case and extra spaces, so a name belongs to one contributor. |
| `contributor.website`, `x`, `telegram` | Optional | Profile links. [URL rules](/contributing/feed-format#url-rules), `#` fragment allowed. |
| `contributor.description` | Optional | One line about the contributor, at most 500 characters. Control characters become spaces. |
| `contributor.email` | Optional | Contact address: `^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$`, at most 254 characters |
| `contributor.discord` | Optional | Discord username, such as `bombermine`, shown as text: `^[A-Za-z0-9._#-]{2,40}$`, not a link |
| `contributor.identity` or `contributor.logoUrl` | Optional | Avatar: the 16-character Keybase key suffix (`identity`, 16 hex characters), or an HTTPS image URL (`logoUrl`, URL rules with `#` allowed). Without either, the default avatar is shown. |

### Feeds

`snapshots` is an array with at least one feed. One file can list several feeds, for example a `pruned` feed and an `archive` feed.

| Field | Required | Meaning |
|---|---|---|
| `snapshots[].snapshots` | Yes | URL of the feed. URL rules, no fragment. A feed URL belongs to one contributor. |
| `snapshots[].type` | Yes, here or in the feed | `pruned` or `archive`. Applies to every entry of the feed. Matches `^[A-Za-z0-9._-]{1,32}$`. |
| `snapshots[].period` | Recommended | How often the feed updates, such as `4h`, `6h` or `1d`. Drives "next update". Matches `^[A-Za-z0-9._-]{1,32}$`. |
| `snapshots[].tx_index` | Optional | `true` when the snapshots include the TX index. A boolean or `"true"` or `"false"`. |

## Next steps

- [Contribute snapshots](/contributing/list-your-snapshots): add your registry file by pull request
- [Feed format](/contributing/feed-format): the fields of each feed entry
- [Glossary](/overview/glossary): the terms used across the docs
