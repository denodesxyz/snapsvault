# Contributing to SnapsVault

SnapsVault is the Open Snapshot Marketplace. This repository holds the Marketplace app and its REST API, the website, the documentation site and the SnapsOS CLI. Bug reports, fixes, features and documentation improvements are welcome. The [Improvements](https://docs.snapsvault.xyz/contributing/contribute) page in the docs is the short version of this file.

> [!NOTE]
> Contributors who publish snapshots do not need this repository. They add their snapshots through the [registry](#listing-snapshots).

## Development setup

The [README](README.md) has what a new developer needs: the [repository layout](README.md#repository-layout), the [local setup](README.md#local-development) for the app, the website, the docs and the CLI, and the [environment variables](README.md#environment-variables). Never commit `.env*` files or real values.

## Branches and commits

- Branch from `main` and name the branch `<type>/<short-topic>`, for example `fix/hash-middle-truncate`, `feat/chain-filter`, `docs/api-examples`. Common types are `feat`, `fix`, `docs`, `design`, `copy`, `chore`.
- Keep one change per pull request. Small pull requests are reviewed faster.
- Write commit messages in English, in the imperative mood and sentence case, without a trailing period: `Cut SHA256 hashes in the middle`, not `cut sha-256 hashes.`
- Do not commit generated output (`.next/`, `out/`, `.vitepress/dist`), `node_modules` or local tooling folders.

## Checks to run

Run the checks for every part the change touches before opening a pull request. All of them must pass.

| Part | Commands |
|---|---|
| App (repo root) | `npx tsc --noEmit`, `npm run lint`, `npm run build` |
| Landing | `cd landing && npx tsc --noEmit && npm run lint && npm run build` |
| Docs | `cd docs-site && npm run docs:build` |
| Node tests | `node --test "src/**/*.test.mjs"` runs every `*.test.mjs` file (Node.js 22.18 or later, which runs the imported `.ts` files directly) |
| CLI | `bash -n cli/snapsos.sh`, `bash cli/tests/run.sh`, plus `shellcheck cli/snapsos.sh` when ShellCheck is installed |

Tests cover the app helpers (`node --test` files next to the code) and the CLI (`cli/tests/run.sh`, run by CI on every pull request that touches `cli/`). Describe in the pull request how the change was checked: the pages opened, the API calls made, the CLI commands run. For visual changes, check light and dark themes at desktop and mobile widths and attach before and after screenshots.

## Pull request process

1. Open an issue first for anything larger than a small fix, so the approach can be agreed before the work starts.
2. Push the branch to a fork and open a pull request against `main`. Fill in the pull request template.
3. A maintainer reviews the change. Address review comments with new commits on the same branch.
4. An accepted pull request is merged into `main`. A pull request with failing checks is not accepted. Registry pull requests (contributor files) are reviewed and merged in the registry repository.

## Code style

- Match the surrounding code. TypeScript everywhere in the apps, functional React components, Tailwind utility classes, shadcn/ui primitives in `src/components/ui`.
- Follow [`docs/DESIGN.md`](docs/DESIGN.md) for every visual change. It sets the type scale, spacing, radii, color roles and shared components. Reuse an existing role instead of inventing a new size, gap or color.
- Icons come from Tabler, outline style only. Do not add other icon sets.
- Copy uses sentence case, a neutral voice and the canonical terms from `docs/DESIGN.md` section 7: **contributor** for the people who publish snapshots, **network** for Celestia, **chain** for mainnet or testnet, **chain ID** for `celestia`, `mocha-4` or `mocha-5`, **SHA256**. No em or en dashes in user-facing text.
- Documentation pages are written in the third person or the imperative, without colons in headings. Wrap literal tags and placeholders such as `<chain ID>` in backticks.
- Feed parsing rules live in `src/lib/validation/feed.ts`. A change there also updates the [Feed format](https://docs.snapsvault.xyz/contributing/feed-format) and [Registry file](https://docs.snapsvault.xyz/contributing/registry-file) pages in `docs-site/` and [`docs/CONTRIBUTOR-CONTRACT.md`](docs/CONTRIBUTOR-CONTRACT.md) in the same pull request.
- Keep comments short and only where the code does not explain itself.

## Listing snapshots

Contributors add their snapshots with a pull request to the [registry](https://github.com/denodesxyz/snapsvault-registry), not to this repository. The steps, the feed format and the review checklist are on the [Contribute snapshots](https://docs.snapsvault.xyz/contributing/list-your-snapshots) page.

## Reporting bugs and requesting features

Use the issue templates in this repository. A problem with a listing goes to the [registry issues](https://github.com/denodesxyz/snapsvault-registry/issues). For questions, use [Telegram](https://t.me/goldzn) or the docs [Feedback](https://docs.snapsvault.xyz/contributing/feedback) page. For a security issue, do not open a public issue; follow [SECURITY.md](SECURITY.md).

## Code of conduct

Everyone taking part in this project follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

SnapsVault is licensed under the [Apache License 2.0](LICENSE). Contributions are accepted under the same license.
