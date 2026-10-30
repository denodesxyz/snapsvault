---
title: Improvements
description: How to improve the SnapsVault code, tools and docs with issues and pull requests, with local setup and checks.
---

# Improvements

SnapsVault is open source under the Apache-2.0 license, and improvements to its code, tools and docs are welcome. This page covers the repositories, issues, pull requests, the local setup and the checks.

Contributors who list snapshots follow [Contribute snapshots](/contributing/list-your-snapshots) instead. Questions and bug reports are on the [Feedback](/contributing/feedback) page.

## Repositories

The Marketplace, the SnapsOS CLI, the REST API, the website and these docs live in one public repository, and the contributor listings live in a second one.

| Repository | Contents | Changes by |
|---|---|---|
| [SnapsVault repository](https://github.com/denodesxyz/snapsvault) | Marketplace app and REST API, SnapsOS CLI, website, docs | Issues and pull requests |
| [Registry repository](https://github.com/denodesxyz/snapsvault-registry) | One JSON file per contributor and chain ID, pointing at its feeds | Pull requests from contributors, see [Contribute snapshots](/contributing/list-your-snapshots) |

::: details Layout of the SnapsVault repository
| Path | What it holds |
|---|---|
| `/` (root) | The [Marketplace](https://celestia.snapsvault.xyz) app and the REST API, built with Next.js |
| `cli/snapsos.sh` | [SnapsOS CLI](/core-components/snapsos-cli), a single bash script |
| `landing/` | The [website](https://snapsvault.xyz), a separate Next.js app |
| `docs-site/` | These docs, built with VitePress |
| `docs/` | Feed and registry contract as the code reads it, design rules |
:::

::: info Full rules
This page is the short version of [CONTRIBUTING.md](https://github.com/denodesxyz/snapsvault/blob/main/CONTRIBUTING.md) on GitHub.
:::

## Issues

Bugs and feature requests go to [GitHub issues](https://github.com/denodesxyz/snapsvault/issues/new/choose). The issue form offers a template for each kind. Searching existing issues first avoids duplicates.

| A good bug report has | |
|---|---|
| What happened | The page, API route or CLI command, and the result |
| What was expected | The result that should have appeared instead |
| How to reproduce | Steps, the chain ID and contributor if relevant, the CLI flags or the request URL |
| Environment | Browser, or operating system and `bash` version for the CLI |

| A good feature request has | |
|---|---|
| Problem | What cannot be done today, or what is slow or unclear |
| Who it helps | Node operators, contributors or developers, and in which situation |
| Example | A concrete case, such as a network, chain ID, contributor or command, with the expected result |

Describe the need rather than the implementation. Planned work is listed on the [SnapsVault website](https://snapsvault.xyz/#roadmap). A request is not a commitment to build.

## Pull requests

1. Fork the [SnapsVault repository](https://github.com/denodesxyz/snapsvault) and clone the fork.
2. Create a branch from `main` named `<type>/<short-topic>`, for example `fix/cli-latest-testnet`. Common types are `feat`, `fix`, `docs`, `design`, `copy`, `chore`.
3. Set up the project as described in [Local setup](#local-setup) and make the change.
4. Run the [checks](#checks) for every part the change touches.
5. Push the branch and open a pull request against `main`. The description states the current behavior, the change and how it can be checked. A linked issue goes in the description.
6. A maintainer reviews the pull request. Review comments are answered with new commits on the same branch. An accepted pull request is merged into `main`.

A pull request stays small and covers one change. A larger change, such as a new route or a new page, starts as an issue so the approach can be agreed first. Registry pull requests (contributor files) are reviewed and merged in the registry repository.

## Local setup

Requirements: Node.js 22.18 or later, npm, `git`, and a MongoDB instance for the app. A local MongoDB, or one in Docker, is enough. Clone the fork and install:

```bash
git clone https://github.com/<GitHub user>/snapsvault.git
cd snapsvault
npm ci
```

Then set up the part to change.

::: code-group

```bash [App and API]
cp .env.example .env.local
npm run dev
```

```bash [Website]
cd landing
npm ci
npm run dev
```

```bash [Docs]
cd docs-site
npm ci
npm run docs:dev
```

```bash [SnapsOS CLI]
bash cli/snapsos.sh --api-base http://localhost:3000
```

:::

| Part | Runs at | Notes |
|---|---|---|
| App and API | `http://localhost:3000` | Needs `.env.local`, see below |
| Website | `http://localhost:3001` | Reads the live REST API and needs no environment variables. Set `SNAPSHOTS_API_URL=http://localhost:3000` to point it at a local app. |
| Docs | The address VitePress prints, by default `http://localhost:5173` | |
| SnapsOS CLI | N/A | Needs no build. It runs against the production API by default, or against a local app with `--api-base`. |

### App environment

In `.env.local`, set:

- `MONGODB_URI` to the local MongoDB, for example `mongodb://localhost:27017/snapsvault`.
- `GITHUB_TOKEN` to a GitHub token with read access to public repositories. The registry is public, and the token raises the GitHub API rate limit for the sync.

The other variables are described in the [README](https://github.com/denodesxyz/snapsvault#environment-variables).

The database starts empty. A sync reads the registry and every feed into it. With `CRON_SECRET` set in `.env.local`, run one sync with:

```bash
curl -H "Authorization: Bearer <cron secret>" http://localhost:3000/api/sync-snapshots
```

## Checks

| Part | Commands |
|---|---|
| App and REST API (root) | `npx tsc --noEmit`, `npm run lint`, `npm run build` |
| Website (`landing/`) | `npx tsc --noEmit`, `npm run lint`, `npm run build` |
| Docs (`docs-site/`) | `npm run docs:build` |
| Node tests | `node --test "src/**/*.test.mjs"` runs every `*.test.mjs` file (Node.js 22.18 or later, which runs the imported `.ts` files directly) |
| CLI | `bash -n cli/snapsos.sh`, `bash cli/tests/run.sh`, and `shellcheck cli/snapsos.sh` when available |

A pull request with failing checks is not accepted.

## Style

- Code follows the style of the file it changes. New dependencies are added only when the change needs them.
- Interface and docs text follows `docs/DESIGN.md`. Docs are written in the third person or the imperative.
- Commit messages are short, in English and in the imperative, for example `Fix testnet default in --latest`.

## License

SnapsVault is licensed under the [Apache License 2.0](https://github.com/denodesxyz/snapsvault/blob/main/LICENSE). A contribution submitted to the repository is licensed under the same terms.

::: tip Need help?
Ask on [Telegram](https://t.me/goldzn) or open an issue in the [SnapsVault repository](https://github.com/denodesxyz/snapsvault/issues/new/choose). More options are on the [Feedback](/contributing/feedback) page.
:::

## Next steps

- [Feedback](/contributing/feedback): ask a question, report a bug or report a security issue
- [Contribute snapshots](/contributing/list-your-snapshots): list your snapshots on SnapsVault
- [SnapsOS CLI](/core-components/snapsos-cli): the script in `cli/snapsos.sh`
