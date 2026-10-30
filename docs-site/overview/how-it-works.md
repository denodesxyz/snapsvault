---
title: How it works
description: The path a snapshot takes from a contributor feed through the registry, sync and database to the Marketplace, the SnapsOS CLI and the REST API.
---

# How it works

This page follows a snapshot from a contributor feed to a node operator in five stages: a JSON feed, an entry in the registry, a scheduled sync, a database, and access through the Marketplace, the SnapsOS CLI and the REST API.

![SnapsVault end-to-end path: contributor feed, registry, sync, database, then the REST API serving the Marketplace and the SnapsOS CLI](/diagrams/how-it-works.svg)

## The path

1. **Feed.** Each listing has a JSON [feed](/contributing/feed-format) served over HTTPS, with any file name such as `index.json`. It is a JSON array with one entry per snapshot: download URL, size, creation date, block height and SHA256 checksum.
2. **Registry.** One [registry file](/contributing/registry-file) per contributor and chain ID holds the contributor profile and the URL of each feed with its snapshot type and update period.
3. **Sync.** The application reads the registry and every listed feed every 2 minutes.
4. **Database.** Snapshots are stored and listed while they appear in their feed. Older ones stay available through the historical route of the REST API.
5. **Access.** The stored data is available in the [Marketplace](/core-components/marketplace), in the terminal with the [SnapsOS CLI](/core-components/snapsos-cli), and through the [REST API](/core-components/rest-api) for scripts.

## Next steps

- [Quickstart](/overview/quickstart): find, download and restore a snapshot
- [Glossary](/overview/glossary): the terms used across the docs
- [Contribute snapshots](/contributing/list-your-snapshots): publish your own snapshots
