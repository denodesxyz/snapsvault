# SnapsVault - Open Snapshot Marketplace

SnapsVault is an open snapshot marketplace for node snapshots. Contributors publish their snapshots in one format, and node operators find, verify and download them in one place, through a web Marketplace, the SnapsOS CLI or a REST API.

**Links:** [Website](https://snapsvault.xyz) · [Marketplace](https://celestia.snapsvault.xyz) · [Docs](https://docs.snapsvault.xyz) · [Registry](https://github.com/denodesxyz/snapsvault-registry)

## How it works

A contributor publishes a JSON feed of its snapshots over HTTPS and lists it in the registry with one file. The application reads the registry and every feed every 2 minutes, stores the result in MongoDB, and serves it through three interfaces. Snapshot files stay on the contributors' own servers. The [How it works](https://docs.snapsvault.xyz/overview/how-it-works) page in the docs has the full path.

| Component | What it is | Where |
|---|---|---|
| Marketplace | Web app to search, filter and compare snapshots | [celestia.snapsvault.xyz](https://celestia.snapsvault.xyz), [docs](https://docs.snapsvault.xyz/core-components/marketplace) |
| SnapsOS CLI | Terminal client that finds, downloads and verifies snapshots | `cli/snapsos.sh`, [docs](https://docs.snapsvault.xyz/core-components/snapsos-cli) |
| REST API | Public JSON endpoints over the same data | [docs](https://docs.snapsvault.xyz/core-components/rest-api) |
| Registry | One file per contributor and chain ID, pointing at its feeds | [snapsvault-registry](https://github.com/denodesxyz/snapsvault-registry) |
| Feed | The JSON file of one contributor's snapshots | [Feed format](https://docs.snapsvault.xyz/contributing/feed-format) |

## Registry

New contributors add their snapshots through the [registry](https://github.com/denodesxyz/snapsvault-registry): one JSON file per chain ID that names the contributor and points at its feeds, added by pull request. A check runs on the pull request, and a merged listing appears within minutes. The steps are on the [Contribute snapshots](https://docs.snapsvault.xyz/contributing/list-your-snapshots) page, and the registry repository does not need this repository.

## Repository layout

| Path | What it holds |
|---|---|
| `/` (root) | Marketplace app and REST API: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, MongoDB via Mongoose |
| `cli/snapsos.sh` | SnapsOS CLI, a single bash script that calls the REST API |
| `landing/` | Website at snapsvault.xyz, a separate Next.js app with its own build |
| `docs-site/` | Documentation at docs.snapsvault.xyz, built with VitePress |
| `docs/` | `CONTRIBUTOR-CONTRACT.md` (where the registry and feed rules live in the code), `DESIGN.md` (interface design rules) |

## Local development

Requirements: Node.js 22.18 or later, npm, a MongoDB instance (local or in Docker) and a GitHub token that can read public repositories.

```bash
npm ci
cp .env.example .env.local   # set MONGODB_URI and GITHUB_TOKEN, see Environment variables
npm run dev                  # http://localhost:3000
```

The database starts empty. With `CRON_SECRET` set in `.env.local`, one sync reads the registry and every feed into it:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/sync-snapshots
```

> [!NOTE]
> Without `MONGODB_URI` the pages open, but every API route answers `500` and the sync fails. Without `GITHUB_TOKEN` the sync stops before it reads the registry, so the database stays empty. Without `CRON_SECRET` the sync route answers `401`.

Checks:

```bash
npx tsc --noEmit
npm run lint
npm run build
npm test                          # node --test "src/**/*.test.mjs", needs Node.js 22.18 or later
bash cli/tests/run.sh             # CLI tests, need curl, jq and python3
```

The website and the docs are separate apps. Each command starts a dev server, so run them in separate terminals:

```bash
(cd landing && npm ci && npm run dev)            # http://localhost:3001
(cd docs-site && npm ci && npm run docs:dev)     # http://localhost:5173
```

> [!TIP]
> The CLI needs no build: `bash cli/snapsos.sh --help`. Point it at a local app with `--api-base http://localhost:3000`.

## Environment variables

The app reads them from `.env.local`. The template is `.env.example`, and `.env*` files are gitignored except that one.

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string, for example `mongodb://localhost:27017/snapsvault` |
| `GITHUB_TOKEN` | Yes | GitHub token for registry reads. The sync stops without it. |
| `CRON_SECRET` | For the sync | Bearer secret for `/api/sync-snapshots` |
| `GITHUB_DATA_OWNER` | No, default `denodesxyz` | Registry repository owner |
| `GITHUB_DATA_REPO` | No, default `snapsvault-registry` | Registry repository name |
| `GITHUB_DATA_BRANCH` | No, default `main` | Registry branch |
| `FEEDS_ORIGIN` | No | https origin that `/feeds/<name>.json` requests are forwarded to. Unset, nothing is forwarded. |

Any random string works for the secrets in local development. The System section of `/status` reads the `uptimechecks` collection (`{at, component, ok, latency_ms}`), which nothing in this repository writes. Without records it shows no history.

## Deployment

The app, the website and the docs deploy as three separate projects from this repository: the app from the root, the website from `landing/`, the docs from `docs-site/`. The app needs the environment variables above and a scheduler that calls `/api/sync-snapshots` with `CRON_SECRET` every 2 minutes. `vercel.json` defines that schedule for Vercel.

## Contributing

Bug reports, feature requests and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the rules and the [Improvements](https://docs.snapsvault.xyz/contributing/contribute) page for the short guide. For questions, use [Telegram](https://t.me/goldzn), the docs [Feedback](https://docs.snapsvault.xyz/contributing/feedback) page or GitHub issues. Report security issues as described in [SECURITY.md](SECURITY.md).

## License

Licensed under the [Apache License 2.0](LICENSE).
