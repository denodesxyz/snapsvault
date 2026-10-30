# SnapsVault landing

The website at snapsvault.xyz, built as its own Next.js app inside the
SnapsVault repository. It shares the marketplace's design tokens (see
`src/app/globals.css`) but no code, so it builds and deploys on its own.

## Fonts

`src/fonts/montserrat-latin.woff2` is the Montserrat (OFL) latin variable subset from Google Fonts, self-hosted via `next/font/local`. The page uses no italics.
Refresh: `curl -A "Mozilla/5.0 Chrome/120.0" "https://fonts.googleapis.com/css2?family=Montserrat:wght@100..900"`, then download the woff2 file of the latin subset.

## Layout

- `src/app` - routes, layout, global styles
- `src/components` - header, footer, theme toggle, UI primitives
- `src/lib` - links and helpers
- `public` - logos and the Open Graph image

## Run locally

With dependencies installed in this folder:

```sh
npm ci
npm run dev
```

Without an install, the repo root's `node_modules` already has everything this
app needs (same versions), so from this folder:

```sh
node ../node_modules/next/dist/bin/next dev -p 3001
```

Either way the site is at http://localhost:3001.

## Checks

```sh
node ../node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
node ../node_modules/eslint/bin/eslint.js src
```

## Deploy

Deployed as its own project from this folder, like `docs-site`. See
[Deployment](../README.md#deployment) in the root README.
