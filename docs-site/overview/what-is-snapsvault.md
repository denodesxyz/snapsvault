---
title: Introduction
description: SnapsVault is a community-driven marketplace for sharing and discovering verified snapshots published by trusted contributors.
---

# SnapsVault Open Snapshot Marketplace

SnapsVault is a community-driven marketplace for sharing and discovering verified snapshots published by trusted contributors. Snapshots are usually scattered across many sources, each with its own format. SnapsVault brings them into one catalog with one format, so picking one takes seconds.

## Components

SnapsVault has two sides. Contributors, the snapshot providers, publish a snapshot feed and list it in the registry. Node operators and developers use the same catalog through the Marketplace, the SnapsOS CLI or the REST API.

| Component | What it does |
|---|---|
| [Snapshot feed](/contributing/feed-format) | A JSON file served over HTTPS, one entry per snapshot |
| [Registry](/contributing/registry-file) | A [GitHub repository](https://github.com/denodesxyz/snapsvault-registry) listing each contributor and its feed URLs |
| [Marketplace](/core-components/marketplace) | Web app to search, filter and compare snapshots |
| [SnapsOS CLI](/core-components/snapsos-cli) | Terminal client to find and download snapshots |
| [REST API](/core-components/rest-api) | Public JSON endpoints over the same data |

::: tip Under the hood
[How it works](/overview/how-it-works) follows a feed to the Marketplace, the SnapsOS CLI and the REST API.
:::

## Supported networks

A network can have several chain IDs, each a mainnet or testnet chain. The [Glossary](/overview/glossary) defines these terms. More networks are planned on the [roadmap](https://snapsvault.xyz/#roadmap).

| Network | Chain ID | Chain |
|---|---|---|
| **Celestia** | `celestia` | Mainnet |
| **Celestia** | `mocha-4` | Testnet |
| **Celestia** | `mocha-5` | Testnet |

## Trust and verification

- Each listing shows what the contributor publishes: size, block height, creation time and a SHA256 checksum.
- Snapshot files stay on the contributor's servers. Each listing can be verified locally against the published checksum, as shown in the [Quickstart](/overview/quickstart#verify-the-checksum).

## Where to go next

**Find and download a snapshot.** Start with the [Quickstart](/overview/quickstart). It shows the two ways to use SnapsVault. For more detail:

- [Marketplace](/core-components/marketplace): search, filter and open snapshots in the browser
- [SnapsOS CLI](/core-components/snapsos-cli): the terminal client
- [REST API](/core-components/rest-api): the same data for scripts and automation

**List your snapshots.** [Contribute snapshots](/contributing/list-your-snapshots) shows how a contributor publishes a feed and gets listed with one file and a pull request.

**Get help or share feedback.** [Feedback](/contributing/feedback) lists where to ask and how to report a problem.
