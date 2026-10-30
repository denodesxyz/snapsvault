## Summary

<!-- What changes and why. Link the issue, for example "Closes #12". -->

## Area

- [ ] Marketplace or REST API (repo root)
- [ ] SnapsOS CLI (`cli/`)
- [ ] Website (`landing/`)
- [ ] Docs (`docs-site/`)

## How it was checked

<!-- Pages opened, API calls made, CLI commands run. For visual changes, attach before and after screenshots in light and dark at desktop and mobile widths. -->

## Checklist

- [ ] The branch is up to date with `main` and holds one change
- [ ] Checks pass for every touched part (`npx tsc --noEmit`, `npm run lint`, `npm run build`; `npm run docs:build` for docs; `bash -n`, `bash cli/tests/run.sh` and `shellcheck` for the CLI; `node --test` for the app helper tests)
- [ ] Visual changes follow `docs/DESIGN.md` and use Tabler outline icons only
- [ ] User-facing copy uses sentence case and has no em or en dashes
- [ ] Changes to feed parsing update the Feed format and Registry file docs pages and `docs/CONTRIBUTOR-CONTRACT.md`
- [ ] No secrets, `.env` files or local paths are committed
