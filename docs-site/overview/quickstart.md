---
title: Quickstart
description: Find a SnapsVault snapshot in the Marketplace or the terminal, then download it, check it and restore a Celestia node.
---

# Quickstart

This page gets a snapshot onto a node: find one, download it, check it and restore a Celestia node.

A snapshot lets a node start from a recent block instead of syncing from genesis. SnapsVault collects snapshots from many contributors in one place, for mainnet (`celestia`) and testnets (`mocha-4`, `mocha-5`). Pruned snapshots keep recent state and are small; archive snapshots keep full history and are much larger.

There are two ways to use it:

- [Web interface](#web-interface): browse, filter and download in the browser
- [Terminal](#terminal): the SnapsOS CLI or the REST API, for servers and scripts

## Web interface

Open the [Marketplace](https://celestia.snapsvault.xyz), filter by mainnet or testnet, search by contributor or type, and open a snapshot. The snapshot page has the download command and the SHA256 checksum.

::: tip More on the Marketplace
The [Marketplace](/core-components/marketplace) page covers the filters, card and table view, and the snapshot page.
:::

## Terminal

Use the [SnapsOS CLI](/core-components/snapsos-cli) or the [REST API](/core-components/rest-api). Both return the same data as the Marketplace and need no account or key.

::: code-group

```bash [SnapsOS CLI]
curl -fsSL https://snapsvault.xyz/snapsos.sh -o snapsos.sh
bash snapsos.sh -n Celestia --latest
```

```bash [curl]
curl -s "https://celestia.snapsvault.xyz/api/cli/latest?network=celestia" \
  | jq -r '.data.download_url'
```

:::

Both print the newest mainnet snapshot.

::: tip More on the terminal
The [SnapsOS CLI](/core-components/snapsos-cli) page covers the flags and interactive mode, and the [REST API](/core-components/rest-api) page covers every endpoint.
:::

## Restore a node from a snapshot

Once a snapshot is chosen, in the Marketplace or in the terminal, these steps download it, check it and restore a node.

### Download a snapshot

1. Copy the download URL from the snapshot page.
2. Download the snapshot file. `-c` resumes an interrupted download.

   ```bash
   wget -c -O snapshot.tar.lz4 "<download URL>"
   ```

::: info File formats
Most snapshots are `.tar.lz4`. Some contributors publish `.tar.bz2`, a plain `.tar` or `.tar.gz`. Use the matching extension as the output name.
:::

::: warning Disk space
Free disk space must exceed the snapshot file size plus its extracted size.
:::

### Verify the checksum

Check the snapshot file against the SHA256 shown on the snapshot page before extracting.

1. Copy the SHA256 from the snapshot page.
2. Run the check for the operating system.

   ::: code-group

   ```bash [Linux]
   echo "<sha256>  snapshot.tar.lz4" | sha256sum -c -
   ```

   ```bash [macOS]
   echo "<sha256>  snapshot.tar.lz4" | shasum -a 256 -c -
   ```

   :::

3. The output reads `OK`. On a mismatch, download again before extracting. If it still fails, report the URL and the local hash to the contributor.

::: info No checksum published
When the snapshot shows "N/A" for SHA256, the contributor publishes no checksum and there is nothing to compare.
:::

### Restore a Celestia consensus node

These steps are for a `celestia-app` consensus node that runs the same chain ID as the snapshot.

::: info Assumed setup
Paths assume the default home directory `~/.celestia-app` and a systemd service named `celestia-appd`. Adjust both to the local setup.
:::

::: danger Validator state
`data/priv_validator_state.json` records the last block the validator signed. Restoring a snapshot that carries an older copy can make the validator sign a height twice (double-sign), which is slashable. Back the file up before extraction and put it back afterwards. Never run two validators with the same `priv_validator_key.json`.
:::

1. Stop the service.

   ```bash
   sudo systemctl stop celestia-appd
   ```

2. Back up the validator state.

   ```bash
   cp ~/.celestia-app/data/priv_validator_state.json ~/priv_validator_state.json.bak
   ```

3. Remove the old data directory contents. Keep `config/`, which holds the node and validator keys.

   ```bash
   rm -rf ~/.celestia-app/data
   mkdir -p ~/.celestia-app/data
   ```

4. Check the root of the snapshot file, because layouts differ by contributor, then extract.

   ::: code-group

   ```bash [.tar.lz4]
   lz4 -dc snapshot.tar.lz4 | tar -tf - | head -3     # root should be data/
   lz4 -dc snapshot.tar.lz4 | tar -xf - -C ~/.celestia-app
   ```

   ```bash [.tar.bz2]
   tar -tjf snapshot.tar.bz2 | head -3                # root should be data/
   tar -xjf snapshot.tar.bz2 -C ~/.celestia-app
   ```

   ```bash [.tar]
   tar -tf snapshot.tar | head -3                     # root should be ./ (contents of data/)
   tar -xf snapshot.tar -C ~/.celestia-app/data
   ```

   ```bash [.tar.gz]
   tar -tzf snapshot.tar.gz | head -3
   tar -xzf snapshot.tar.gz -C ~/.celestia-app        # if the root is data/
   ```

   :::

   ::: details Snapshot file layouts
   Some `.tar.lz4` files start with a `data/` entry and extract into `~/.celestia-app`. Some `.tar` files start at the data directory itself and extract into `~/.celestia-app/data`. If the listing shows another root, extract so that the files end up in `~/.celestia-app/data`.
   :::

5. Put the validator state back over the one in the snapshot file.

   ```bash
   mv ~/priv_validator_state.json.bak ~/.celestia-app/data/priv_validator_state.json
   ```

6. Start the service and follow the log.

   ```bash
   sudo systemctl start celestia-appd
   journalctl -u celestia-appd -f
   ```

:::: details Save disk space with a streamed extraction
Skip the download file and extract while downloading. This skips the SHA256 check, because no file is saved to check. To check the snapshot file, use the [download](#download-a-snapshot) and [verify](#verify-the-checksum) steps instead.

Pick the tab for the format of the snapshot file. The commands assume the root is `data/`; for another root, change the target directory as in step 4.

::: code-group

```bash [.tar.lz4]
wget -qO- "<download URL>" | lz4 -dc | tar -xf - -C ~/.celestia-app
```

```bash [.tar.bz2]
wget -qO- "<download URL>" | tar -xjf - -C ~/.celestia-app
```

```bash [.tar]
wget -qO- "<download URL>" | tar -xf - -C ~/.celestia-app
```

```bash [.tar.gz]
wget -qO- "<download URL>" | tar -xzf - -C ~/.celestia-app
```

:::
::::

::: tip Need help?
Ask on [Telegram](https://t.me/goldzn) or open an issue in the [SnapsVault repository](https://github.com/denodesxyz/snapsvault/issues/new/choose). More options are on the [Feedback](/contributing/feedback) page.
:::

## Next steps

- [Marketplace](/core-components/marketplace): filters, views and the snapshot page
- [SnapsOS CLI](/core-components/snapsos-cli): flags and interactive mode
- [REST API](/core-components/rest-api): every endpoint, for scripts and automation
- [How it works](/overview/how-it-works): how a snapshot gets from a feed to a listing
- [Glossary](/overview/glossary): the terms used across the docs
