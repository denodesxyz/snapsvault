---
title: REST API
description: The nine public SnapsVault API routes, with parameters and example responses.
---

# REST API

The REST API returns the same snapshot data as the [Marketplace](/core-components/marketplace) as JSON. It has nine public routes, all `GET`, with no API key. Scripts that pick a snapshot automatically use it, and the [SnapsOS CLI](/core-components/snapsos-cli) is a client of it.

Base URL: `https://celestia.snapsvault.xyz/api`

## First request

Get the newest mainnet snapshot of one contributor:

```bash
curl -s "https://celestia.snapsvault.xyz/api/cli/latest?network=celestia&contributor=denodes"
```

::: details Response (trimmed)
```json
{
  "success": true,
  "data": {
    "chain": "mainnet",
    "chain_id": "celestia",
    "height": 15374529,
    "contributor": { "name": "deNodes", "website": "https://denodes.io", "...": "profile fields" },
    "type": "pruned",
    "size": "44Gb",
    "download_url": "https://celestia-mainnet-snap.denodes.xyz/celestia-mainnet_15374529.tar.bz2",
    "filename": "celestia-mainnet_15374529.tar.bz2",
    "time": "2026-10-28T16:03:13.000Z",
    "checksum": { "sha256": "02f15479e16faa68d214582c4f34983fc81ae4b4a8efc85238e9d3367161854e" }
  }
}
```
:::

The routes read the current snapshots from the database, which the sync job refreshes every 2 minutes.

::: info About the examples
Responses on this page are trimmed and were captured from production. Snapshot values change on every sync. Contributors remove older snapshot files, so a sample download URL can return `404`, while the request itself always returns the current URL.
:::

![The app reads the database and serves nine public routes; JSON routes are cached for about a minute](/diagrams/rest-api-flow.svg)

## Routes

| Route | Purpose |
|---|---|
| [`GET /api/snapshots`](#get-api-snapshots) | All current snapshots |
| [`GET /api/snapshots/historical`](#get-api-snapshots-historical) | Current and archived snapshots |
| [`GET /api/networks`](#get-api-networks) | Networks with their chains, chain IDs, counts and the newest snapshot |
| [`GET /api/cli`](#get-api-cli) | Self-description of the CLI routes |
| [`GET /api/cli/snapshots`](#get-api-cli-snapshots) | Filtered snapshot list for scripts |
| [`GET /api/cli/latest`](#get-api-cli-latest) | The newest snapshot for a filter |
| [`GET /api/contributors`](#get-api-contributors) | Contributor list and profile |
| [`GET /api/snapshot-configurations`](#get-api-snapshot-configurations) | Feed status per contributor and chain ID |
| [`GET /api/keybase-avatar/{identity}`](#get-api-keybase-avatar) | Contributor avatar proxy |

## Conventions

| Topic | Rule |
|---|---|
| Terms | `network` is the network name (`celestia`), `chain` is `mainnet` or `testnet`, and `chain_id` is one of `celestia`, `mocha-4`, `mocha-5`. See the [Glossary](/overview/glossary). |
| `network` format | Must match `^[A-Za-z0-9._-]{1,64}$`, otherwise the response is `400` with `Invalid network parameter`. Matching is case-insensitive. |
| Timestamps | ISO 8601 values in UTC |
| CORS | Public routes send `Access-Control-Allow-Origin: *` |
| Caching | JSON routes are cached by the CDN for 60 seconds and can serve the previous response for up to 2 more minutes while it refreshes, so a new snapshot can take a few minutes to show up. Avatars are cached for a day. |

## GET /api/snapshots

All current snapshots, optionally for one network and chain.

| Parameter | Default | Meaning |
|---|---|---|
| `network` | none | Network name, for example `celestia`. Without it, all current snapshots. |
| `chain` | none | `mainnet` or `testnet`, case-insensitive. Applied only together with `network`. |

```bash
curl -s "https://celestia.snapsvault.xyz/api/snapshots?network=celestia&chain=mainnet"
```

::: details Response (trimmed to one snapshot)
```json
{
  "success": true,
  "data": [
    {
      "block_height": 15374529,
      "time": "2026-10-28T16:03:13.000Z",
      "size": "44Gb",
      "url": "https://celestia-mainnet-snap.denodes.xyz/celestia-mainnet_15374529.tar.bz2",
      "type": "pruned",
      "network": { "name": "Celestia", "display_name": "Celestia", "image": "https://celestia.snapsvault.xyz/celestia-logo.svg" },
      "chain": "mainnet",
      "chain_id": "celestia",
      "contributor": { "name": "deNodes", "website": "https://denodes.io", "email": "hello@denodes.io", "...": "profile fields" },
      "period": "4h",
      "tx_index": "false",
      "checksum": { "sha256": "02f15479e16faa68d214582c4f34983fc81ae4b4a8efc85238e9d3367161854e" },
      "is_available": true
    }
  ],
  "last_updated": "2026-10-28T18:21:00.000Z"
}
```

`contributor` is an object here. `checksum` is absent when the contributor publishes no checksum. `is_available` is `true` on a stored snapshot. Without `network`, a feed that has no stored snapshot is added as a placeholder row with `is_available: false`, `is_unavailable: true` and an `unavailable_reason`.
:::

## GET /api/snapshots/historical

Current and archived snapshots. An archived snapshot is one that left its feed.

| Parameter | Default | Meaning |
|---|---|---|
| `network` | none | Network name. With it, current and archived snapshots, newest first, at most 100. Without it, current snapshots only. |
| `startDate`, `endDate` | none | Any parseable date string. An invalid value returns `400`. |
| `currentOnly` | `false` | `true` limits the result to current snapshots. |

```bash
curl -s "https://celestia.snapsvault.xyz/api/snapshots/historical?network=celestia"
```

::: details Response (trimmed)
```json
{ "success": true, "data": [ { "...": "same shape as /api/snapshots, one object per snapshot" } ], "count": 100 }
```

An archived snapshot has `is_available: false` when a newer snapshot uses the same download URL, because that URL now serves the newer snapshot file.
:::

## GET /api/networks

Networks with their chain IDs. No parameters. One row per network and chain ID.

```bash
curl -s "https://celestia.snapsvault.xyz/api/networks"
```

::: details Response (trimmed to one row)
```json
{
  "success": true,
  "data": [
    {
      "network": "Celestia",
      "chain_id": "mocha-5",
      "chains": ["testnet"],
      "has_snapshots": true,
      "snapshot_count": 5,
      "contributors": ["Polkachu", "QubeLabs", "deNodes", "kjnodes"],
      "types": ["archive", "pruned"],
      "latest_snapshot": { "height": 2106285, "time": "2026-10-28T18:01:33.000Z", "contributor": "deNodes" },
      "display_name": "Celestia (mocha-5)",
      "cli_id": "celestia-mocha-5"
    }
  ],
  "total": 3,
  "summary": { "total_networks": 1, "total_chain_ids": 3, "chain_ids_with_snapshots": 3, "total_snapshots": 15, "total_chains": 2 },
  "last_updated": "2026-10-28T18:20:52.556Z"
}
```

The live response has one row per chain ID. `snapshot_count` counts stored snapshots, so a contributor with two current snapshots adds two. In `summary`, `total_networks` counts distinct networks, `total_chain_ids` and `chain_ids_with_snapshots` count rows, and `total_chains` counts distinct values of mainnet and testnet.
:::

## GET /api/cli

A static description of the CLI routes. No parameters. The response has the keys `endpoints`, `workflow`, `examples` and `tips`.

```bash
curl -s "https://celestia.snapsvault.xyz/api/cli"
```

## GET /api/cli/snapshots

A filtered snapshot list for scripts, sorted by height, then time, newest first.

| Parameter | Default | Meaning |
|---|---|---|
| `network` | required | Network name. Missing returns `400` with a `usage` object. |
| `chain_id` | none | Chain ID, case-insensitive |
| `chain` | none | `mainnet` or `testnet`, case-insensitive |
| `contributor` | none | Case-insensitive substring of the contributor name |
| `type` | none | Type, for example `pruned`, case-insensitive |
| `latest` | `false` | `true` keeps the newest snapshot per chain ID and chain |
| `format` | `detailed` | `cli` returns flat rows, `detailed` returns the full objects |

::: code-group

```bash [SnapsOS CLI]
bash snapsos.sh -n Celestia -m 5
```

```bash [curl]
curl -s "https://celestia.snapsvault.xyz/api/cli/snapshots?network=celestia&contributor=denodes&format=cli"
```

:::

::: details Response (trimmed to one row)
```json
{
  "success": true,
  "data": [
    {
      "network": "Celestia",
      "chain_id": "celestia",
      "chain": "mainnet",
      "height": 15374529,
      "contributor": "deNodes",
      "type": "pruned",
      "size": "44Gb",
      "download_url": "https://celestia-mainnet-snap.denodes.xyz/celestia-mainnet_15374529.tar.bz2",
      "time": "2026-10-28T16:03:13.000Z",
      "id": "celestia-celestia-mainnet-15374529-denodes-pruned",
      "display_name": "Celestia mainnet #15374529 by deNodes (pruned)",
      "file_size": "44 GB",
      "filename": "celestia-mainnet_15374529.tar.bz2"
    }
  ],
  "total": 4,
  "filters": { "network": "celestia", "chain_id": null, "chain": null, "latest": false, "contributor": "denodes", "type": null, "format": "cli" },
  "available_options": {
    "chain_ids": ["celestia", "mocha-4", "mocha-5"],
    "chains": ["mainnet", "testnet"],
    "contributors": ["ITRocket", "NodeStake", "Noders", "Polkachu", "QubeLabs", "UnityNodes", "deNodes", "kjnodes"],
    "types": ["archive", "pruned"]
  },
  "last_updated": "2026-10-28T18:21:51.430Z"
}
```

With `format=detailed`, `network` and `contributor` are objects, and `period`, `tx_index` and `checksum` are added. Checksums are part of the detailed format.
:::

## GET /api/cli/latest

The newest snapshot for a filter, which is the one with the highest block height.

| Parameter | Default | Meaning |
|---|---|---|
| `network` | required | Network name |
| `chain_id` | none | Chain ID, case-insensitive |
| `chain` | the chain of `chain_id`, else `mainnet` | `mainnet` or `testnet`, case-insensitive |
| `type` | none | Type, case-insensitive |
| `contributor` | none | Case-insensitive substring of the contributor name |

With `chain_id` and no `chain`, the chain follows from the chain ID, so `chain_id=mocha-5` returns the newest testnet snapshot of `mocha-5`.

::: code-group

```bash [SnapsOS CLI]
bash snapsos.sh -n Celestia -i mocha-5 --latest
```

```bash [curl]
curl -s "https://celestia.snapsvault.xyz/api/cli/latest?network=celestia&chain_id=mocha-5"
```

:::

::: details Response (trimmed)
```json
{
  "success": true,
  "data": {
    "network": { "name": "Celestia", "display_name": "Celestia", "image": "https://celestia.snapsvault.xyz/celestia-logo.svg" },
    "chain": "testnet",
    "chain_id": "mocha-5",
    "height": 2106285,
    "contributor": { "name": "deNodes", "website": "https://denodes.io", "...": "profile fields" },
    "type": "pruned",
    "size": "18Gb",
    "file_size": "18 GB",
    "download_url": "https://celestia-mocha-snap.denodes.xyz/celestia-mocha_2106285.tar.bz2",
    "filename": "celestia-mocha_2106285.tar.bz2",
    "time": "2026-10-28T18:01:33.000Z",
    "checksum": { "sha256": "ba24b98465189a7bbc5ec2c3f53790f057a2154708a8ab8917ef3573bdee2b14" },
    "contributor_info": { "name": "deNodes", "website": "https://denodes.io", "identity": "C89053F92B77D8C0" }
  },
  "alternatives": { "other_contributors": ["kjnodes", "Polkachu", "QubeLabs"], "other_types": ["archive"], "total_snapshots": 5 },
  "last_updated": "2026-10-28T18:21:42.387Z"
}
```
:::

## GET /api/contributors

One contributor profile, or a list of contributors.

| Parameter | Default | Meaning |
|---|---|---|
| `name` | none | Exact contributor name. Returns the full profile, or `404` when unknown. |
| `limit` | 10 | Number of contributors returned when `name` is absent, ordered by name. Maximum 100. |

```bash
curl -s "https://celestia.snapsvault.xyz/api/contributors?name=deNodes"
```

::: details Response (description and links trimmed)
```json
{
  "success": true,
  "data": {
    "name": "deNodes",
    "email": "hello@denodes.io",
    "website": "https://denodes.io",
    "identity": "C89053F92B77D8C0",
    "contributor_since": "2025-07-24T21:16:52.000Z",
    "number_of_snapshots": 4,
    "networks_covered": ["celestia"],
    "snapshot_freshness": { "periods": ["4h"], "averagePeriodHours": 4 },
    "uptime_availability": { "totalChecks": 13124, "successfulChecks": 13121, "percentage": 99.97714111551358, "lastChecked": "2026-10-28T18:20:51.782Z" },
    "created_at": "2026-10-19T16:44:49.225Z",
    "updated_at": "2026-10-28T18:20:51.878Z"
  }
}
```

`snapshot_freshness.averagePeriodHours` is the average of the known periods in hours, and `null` when no period is known. `number_of_snapshots` counts the contributor's current snapshots. `contributor_since` is the date the contributor was added to the registry, and `null` until it is known.
:::

## GET /api/snapshot-configurations

The status of each contributor feed, one element per contributor, chain ID and type.

| Parameter | Default | Meaning |
|---|---|---|
| `network`, `chain_id` | none | Together: the feeds of that chain ID. `network` is the registry directory name, matched exactly. |
| `contributor` | none | The feeds of one contributor |
| (none) | | A `summary` and `stats` object over all feeds. `summary.chain_ids` and `stats.configurations_by_network` list the chain IDs and networks with their counts. |

```bash
curl -s "https://celestia.snapsvault.xyz/api/snapshot-configurations?network=celestia&chain_id=celestia"
```

::: details Response (trimmed to one element)
```json
{
  "success": true,
  "data": [
    {
      "contributor_name": "deNodes",
      "type": "pruned",
      "period": "4h",
      "tx_index": false,
      "chain": "mainnet",
      "is_active": true,
      "is_available": true,
      "latest_snapshot": { "filename": "celestia-mainnet_15374529.tar.bz2", "url": "https://celestia-mainnet-snap.denodes.xyz/celestia-mainnet_15374529.tar.bz2", "size": "44Gb", "height": 15374529, "creationDate": "2026-10-28T16:03:13.000Z" },
      "last_successful_fetch": "2026-10-28T18:20:51.111Z",
      "consecutive_failures": 0,
      "uptime_percentage": 99.96952613134238
    }
  ]
}
```

`is_available` is `true` when the feed has a stored latest snapshot. With `contributor`, each element carries `network` and `chain_id` instead of `contributor_name`.
:::

## GET /api/keybase-avatar/{identity}

A contributor avatar. `identity` is the 16-hex Keybase key suffix of a contributor. The route proxies the Keybase picture (PNG, JPEG, GIF or WebP). Without a picture, a default avatar is returned.

```bash
curl -s "https://celestia.snapsvault.xyz/api/keybase-avatar/C89053F92B77D8C0" -o avatar.img
```

## Errors

Failed requests return JSON with `success: false` and an `error` message.

| Status | When | Body |
|---|---|---|
| `400` | Invalid `network`, or a missing `network` on the `cli` routes | `{ "success": false, "error": "Invalid network parameter" }` |
| `404` | No contributor with that name | `{ "success": false, "error": "Contributor not found" }` |
| `404` | Any other path under `/api/` | `{ "success": false, "error": "Not found" }` |
| `404` | `/api/cli/latest` finds no match | See below |
| `500` | Server error | `success: false` with an `error` message |

::: details No match on /api/cli/latest
`mocha-5` is a testnet chain ID, so a mainnet filter finds no snapshot:

```bash
curl -s "https://celestia.snapsvault.xyz/api/cli/latest?network=celestia&chain_id=mocha-5&chain=mainnet"
```

```json
{
  "success": false,
  "error": "No snapshots found matching criteria",
  "criteria": { "network": "celestia", "chain_id": "mocha-5", "chain": "mainnet", "type": null, "contributor": null },
  "suggestion": "Try removing some filters or check available networks at /api/networks"
}
```

The same request without `chain` returns the newest `mocha-5` snapshot.
:::

## Next steps

- [Marketplace](/core-components/marketplace): the same data in the browser
- [SnapsOS CLI](/core-components/snapsos-cli): the same `cli` routes from a terminal
- [Feed format](/contributing/feed-format): how feed entries become these fields
- [Feedback](/contributing/feedback): report a problem or ask for help
