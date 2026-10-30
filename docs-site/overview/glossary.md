---
title: Glossary
description: Short definitions of the terms used across the SnapsVault docs, the Marketplace, the REST API and the SnapsOS CLI.
---

# Glossary

These are the terms used across SnapsVault, so the docs, the Marketplace, the API and the CLI mean the same thing by them. Each entry links to the page where the term is used.

## Networks and chains

| Term | Definition | Used in |
|---|---|---|
| Network | A blockchain network, such as Celestia. A network has one or more chain IDs. | [Introduction](/overview/what-is-snapsvault#supported-networks) |
| Chain | `mainnet` or `testnet`. Every chain ID belongs to one of the two. | [REST API](/core-components/rest-api#conventions) |
| Chain ID | The identifier of one chain of a network: `celestia` (mainnet), `mocha-4` and `mocha-5` (testnets). Snapshots are listed per chain ID. | [Registry file](/contributing/registry-file#file-location) |

## Snapshots

| Term | Definition | Used in |
|---|---|---|
| Snapshot | A copy of a node's data at one block height. A node restored from it starts at that height instead of syncing from genesis. | [Marketplace](/core-components/marketplace) |
| Pruned | A snapshot type that keeps recent state only. It is small. | [Registry file](/contributing/registry-file#fields) |
| Archive | A snapshot type that keeps the full history. It is very large and may start at genesis, with block height `0`. | [Feed format](/contributing/feed-format#height-rule) |
| Checksum (SHA256) | A 64-character fingerprint of the snapshot file. Comparing it with the hash of the downloaded file shows that the file is complete and unchanged. | [Quickstart](/overview/quickstart#verify-the-checksum) |
| TX index | Whether a snapshot includes the transaction index. The contributor sets it as `tx_index` and the snapshot page shows Enabled or Disabled. | [Registry file](/contributing/registry-file#fields) |
| Period | How often a contributor publishes a new snapshot, such as `4h` or `1d`. It drives the "next update" estimate on the snapshot page. | [Registry file](/contributing/registry-file#fields) |

## Contributors and listings

| Term | Definition | Used in |
|---|---|---|
| Contributor | A snapshot provider: a person or team that publishes snapshots and lists them on SnapsVault. | [Contribute snapshots](/contributing/list-your-snapshots) |
| Feed | A JSON file served over HTTPS with one entry per current snapshot of a contributor, for one chain ID and snapshot type. | [Feed format](/contributing/feed-format) |
| Registry | The public [registry repository](https://github.com/denodesxyz/snapsvault-registry) on GitHub that lists every contributor and its feeds. | [How it works](/overview/how-it-works) |
| Registry file | One JSON file per contributor and chain ID in the registry. It holds the contributor profile and the URL of each feed with its type and period. | [Registry file](/contributing/registry-file) |

## Tools

| Term | Definition | Used in |
|---|---|---|
| Marketplace | The SnapsVault web app, where snapshots are searched, filtered and compared. The Quickstart calls it the web interface. | [Marketplace](/core-components/marketplace) |
| SnapsOS CLI | The SnapsVault command-line client, `snapsos.sh`, a single bash script that finds snapshots, prints their links and can download them with a checksum check. | [SnapsOS CLI](/core-components/snapsos-cli) |
| REST API | The public JSON endpoints over the same snapshot data. | [REST API](/core-components/rest-api) |
