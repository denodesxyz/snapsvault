# SnapsVault design canon

This file sets the visual rules for the SnapsVault app (`src/`), and says where the marketing landing (`landing/`) follows them or deliberately differs. The values come from what the product already ships. Where two places disagreed, the value used by most places won, and the canon changes as little as possible.

Every new or changed screen follows this file. If a value is not here, reuse the closest role instead of inventing a new size, gap or color.

---

## 1. Foundations

- **Font.** Montserrat everywhere (`--font-montserrat`, set on `body`). Letter-spacing is normal in the app. Mono text uses `font-mono`.
- **Themes.** Light and dark change color only. Sizes, weights, spacing and radii are identical in both themes.
- **Breakpoints.** These are custom: `2xs` 530, `xs` 640, `sm` 828, `base` 960, `md` 1090, `lg` 1280, `xl` 1450, `2xl` 1920.
- **Page frame.** `main` is `px-4`, with `pt-[112px]` when the announcement bar shows and `76px` when it does not. Each page wrapper is `py-8` with `gap-4` between its sections. Use `py-8`, not `py-[32px]`.

---

## 2. Type scale (app)

| Role | Size / line height | Weight | Color | Tailwind |
|---|---|---|---|---|
| Page title (h1: hero, not-found, error panels) | 30/36 | 600 | foreground | `text-3xl font-semibold` |
| Entity title (h1 next to the 56px chain logo on detail) | 24/32 | 600 | foreground | `text-2xl font-semibold` |
| Page subtitle | 14/20 | 400 | muted | `text-sm text-muted-foreground` |
| Section title (h2 in a section header) | 20/28 | 600 | foreground | `text-xl font-semibold` |
| Section subtitle | 14/20 | 400 | muted | `text-sm text-muted-foreground` |
| Subsection title (h3 inside a panel, e.g. Download snapshot) | 16/24 | 500 | foreground | `text-base font-medium` |
| Empty / error state title | 18/28 | 500 | muted | `text-lg font-medium text-muted-foreground` |
| Stat value (hero, status) | 30/36 | 700 | foreground | `text-3xl font-bold` |
| Stat title (hero card title) | 18/28 | 600 | foreground | `text-lg font-semibold` |
| Card title (chain name on a snapshot card) | 16/24 | 500 | foreground | `text-base font-medium` |
| Contributor name (card) | 16/24 | 500 | foreground | `text-base font-medium` |
| Contributor name stacked above an email (detail) | 16/20 | 500 | foreground | `text-base/tight font-medium` |
| Body | 14/20 | 400 | foreground or muted | `text-sm` |
| Row label | 14/20 | 400 | muted | `text-sm text-muted-foreground` |
| Row value (cards and detail) | 14/20 | 500 on detail, 400 on cards | foreground | detail `text-sm font-medium`, card `text-sm` |
| Meta (chain_id, email, counts) | 12/16 | 400 | muted | `text-xs text-muted-foreground` |
| Button text | 14/20 | 500 | per variant | set by `Button` |
| Badge text (network, tag) | 12/16 | 500 | per badge | `text-xs font-medium` |
| Brand badge (Celestia) | 14/20 | 500 | primary-foreground on celestia | `text-sm font-medium` |
| Brand wordmark | 24/32 | 700 | see color | `text-2xl font-bold` |
| Code / checksum / command | 14/20 | 400 | foreground | `font-mono text-sm` |
| Table | 14/20 body, header 500, chain_id 12/16 | | | `text-sm`, `font-medium`, `text-xs` |

Rules:
- There are only two h1 sizes. Use 30px for a page or panel title and 24px for the entity title on the detail page. The detail h1 stays at 24px on purpose, because it sits beside the 56px logo and above a 20px h2.
- Every section title in the app is `text-xl font-semibold`. That covers Latest snapshots, Snapshot details, More snapshots and Available snapshots, plus their skeletons. Never use `text-lg` for an h2.
- Separate a value from its label by weight and color, not by size. Labels are 14px muted at 400. Values are 14px foreground at 500 on the detail page.
- The status page uses the hero pattern. Its h1 is `text-3xl font-semibold` in a title panel, and its stat cards match the hero stat tiles (value `text-3xl font-bold`, title `text-lg font-semibold`, muted description). Below `xs` the value and title step down one size and the Totals grid keeps two columns.
- The status page sections, top to bottom: title panel, overall banner, System, Totals, New snapshots per day, Feed timeline, Feeds. Every contributor has one series color (`--series-1` to `--series-12`, assigned by sorted name in steps of 5 slots so no two contributors share a color), identical in light and dark, shared by the daily chart and the timeline dots. Degraded states use `--warning`.

---

## 3. Spacing scale (app)

Use the 4px Tailwind steps only. A new value needs a reason written into this file.

| Role | Value | Tailwind |
|---|---|---|
| Gap between page sections | 16 | `gap-4` on the page wrapper |
| Page / section / panel padding (hero, detail panels, not-found, footer, bordered sections) | 32 | `p-8` (footer included: `p-8`, not `px-4 py-8`) |
| Stat tile padding | 16, then 24 from xs | `p-4 xs:p-6` |
| Card padding (snapshot card) | 16 | `p-4` |
| Command box padding | 12 | `p-3` |
| Title to subtitle, inside a section header | 4 | `flex flex-col gap-1` |
| Title to subtitle to actions, inside an h1 title panel | 16 / 16 | `flex flex-col gap-4` (no extra `pt-*` on the button row) |
| Section header to content | 16 | section `flex flex-col gap-4`, or `pt-4` |
| Section title block to header actions (stacked on mobile) | 16 | `gap-4` |
| Grid gap between cards (grid and carousel, every width) | 16 | `gap-4`; carousel `-ml-4` / `pl-4` |
| Detail stats grid | 12, then 16 from 2xs | `gap-3 2xs:gap-4` |
| Divider inside a panel | 16 above and 16 below | `border-t pt-4`, with the parent `gap-4` or `mt-4` |
| Divider inside a card | 8 above and 8 below | `border-t mt-2 pt-2` |
| Subsection title to its text | 4 | `flex flex-col gap-1` |
| Empty state block | at least 235 tall, centered | `min-h-[235px] flex flex-col items-center justify-center text-center` |

Panel dividers never use 12 (`pt-3`) or 24 (`mt-6 pt-6`).

---

## 4. Radii, borders, control heights

**Radii**
- Use `rounded-md` (8px) for panels, sections, cards, buttons, inputs, toggle groups and code boxes.
- Use `rounded-sm` (6px) only for badges and the 24px inline copy buttons.
- Use `rounded-full` for dots, avatars and logo wells.

**Surfaces.** There are two, and they never mix.
- **Filled panel or card.** `bg-secondary-background` with no visible border. Snapshot cards add `border border-transparent hover:border-foreground/10`. This style is used by the hero, the detail chain panel, the not-found and error panels, the footer, hero stat tiles, snapshot cards and the status stat tiles.
- **Outlined section.** Transparent with a 1px `border` (`--border`). This style is used by Latest snapshots, Snapshot details, the related section, and the status banner, System, Totals, New snapshots per day, Feed timeline and Feeds sections (padding `p-4` below `xs`, `p-8` from `xs`).
- A filled box with a border is used only for an inset code surface (see below). Empty states never get a box.

**Inset code surface.** Both the SHA256 chip and the wget box use `bg-secondary-background border rounded-md font-mono text-sm`. The chip keeps `pl-1.5` and a 24px height. The box uses `p-3`. Keep the border: in dark mode it is the only thing that outlines the surface.

**Control heights**

| Height | Use |
|---|---|
| 36 (`h-9`, `size="icon"`) | Default and outline buttons, search input, filter dropdowns, the toggle-group frame, header icon buttons, the detail Contact button, Download |
| 32 (`size="icon-sm"`, `size="sm"`) | Icon buttons inside a section header or inside a 36px group (carousel arrows, view toggles), and small social links |
| 28 | The announcement-bar dismiss button only (a documented exception inside the 36px bar; hover `bg-primary-foreground/15`) |
| 24 (`size-6 rounded-sm`) | Inline copy buttons, with 14px (`size-3.5`) icons |

- Carousel arrows use `size="icon-sm"`, not an `h-8 w-8` override.
- Icons are 16px (`size-4 shrink-0`) in every 36px or 32px icon button and in every detail and card row. Do not use em-relative icon sizes (`w-[1.2em]`) or `size-[1.2rem]`.

**Toolbar controls.** The search input, outline buttons and the view-toggle group all share the outline look.
- Light: `border bg-background`.
- Dark: add `dark:bg-input/30 dark:border-input`.
- `shadow-xs` is optional, but use it on all three or on none.

**Focus.** There is one focus style: the global `:focus-visible` outline (2px `var(--ring)`, 2px offset). Components do not add `ring-offset-background` focus rings and never add `outline-none` without a replacement. The only variant override is the destructive button, which recolors the same outline with `focus-visible:outline-destructive`.

**Badges.** All badges are 20px tall with `px-2 rounded-sm text-xs font-medium`.
- Tag badge: `bg-popover border`.
- Network badge: tinted with no border (see the color roles).

---

## 5. Color roles (app)

All color comes from tokens in `src/app/globals.css`. Raw palette classes (`green-500`, `red-500`, `yellow-700`) and hex classes (`bg-[#5640D1]`) are not allowed in components.

Every token is defined on `:root` (light) and `.dark`, so it resolves on every host. `.celestia-theme` only overrides the brand slots (`--primary`, `--primary-text`, `--ring`). `--primary-text` defaults to `var(--primary)` on `:root`. `--color-brand` and `--color-celestia` are fixed values in `@theme`, the same in both themes.

| Token | Light | Dark |
|---|---|---|
| `--success` | oklch(0.527 0.154 150.069) (green-700) | oklch(0.792 0.209 151.711) (green-400) |
| `--mainnet` / `--mainnet-bg` | oklch(0.448 0.119 151.328) (green-800) on oklch(0.962 0.044 156.743) (green-100) | oklch(0.871 0.15 154.449) (green-300) on oklch(0.393 0.095 152.535 / 30%) (green-900/30) |
| `--testnet` / `--testnet-bg` | oklch(0.476 0.114 61.907) (yellow-800) on oklch(0.973 0.071 103.193) (yellow-100) | oklch(0.905 0.182 98.111) (yellow-300) on oklch(0.421 0.095 57.708 / 30%) (yellow-900/30) |
| `--primary-text` | `var(--primary)`; #5640D1 in `.celestia-theme` | `var(--primary)`; #8B7CF0 in `.dark .celestia-theme` |
| `--color-brand` | #C792B8 | #C792B8 |
| `--color-celestia` | #5640D1 | #5640D1 |

| Role | Token / class |
|---|---|
| Page background | `bg-background` |
| Heading and body text | `text-foreground` |
| Secondary text, labels, meta, subtitles | `text-muted-foreground` |
| Filled panel / card | `bg-secondary-background` |
| Outlined section, dividers | `border` (`--border`) |
| Popover, tooltip, tag badge | `bg-popover` + `border` |
| Input / outline control border, dark | `border-input`, fill `bg-input/30` |
| Primary action | `bg-primary text-primary-foreground` (Celestia violet via `.celestia-theme`) |
| Accent text (hover link, hero icon chip) | `text-primary-text` (Celestia host: #5640D1 light, #8B7CF0 dark; other hosts: same as `--primary`) |
| Logo well and contributor avatar (loading and loaded) | `bg-logo-well text-logo-well-foreground border-foreground/20` |
| Skeleton | `bg-skeleton` |
| Focus | `--ring` |
| Success / available / enabled / copied | `text-success`, `bg-success` |
| Error / unavailable / disabled | `text-destructive`, `bg-destructive`, `border-destructive/40` |
| Mainnet badge | `bg-mainnet-bg text-mainnet` |
| Testnet badge | `bg-testnet-bg text-testnet` |
| SnapsVault wordmark "Snaps" | `text-brand` (#C792B8 in both themes; a logotype, exempt from contrast) |
| Celestia announcement bar and brand badge | `bg-celestia text-primary-foreground` |

Rules:
- In dark mode there is one near-white: `#FCFCFC`. Card, popover, secondary, accent and sidebar foregrounds match `--foreground`.
- Use `text-primary` only on fills (`bg-primary`, `bg-primary/15`). For violet text, use `text-primary-text`, which is lighter in dark mode for contrast.
- The unavailable state looks the same in grid and table views: a `bg-destructive` dot with `border-background`.

---

## 6. Section header (one shared component)

Every app section header is built with `SectionHeader`. Do not hand-roll one.

```tsx
<SectionHeader
  title="More snapshots"
  subtitle="Related mainnet snapshots from Celestia"
  actions={<CarouselArrows />}   // optional right slot
  inlineActions                  // keep actions on the title row at every width
/>
```

The component renders this structure:

```tsx
<div className={cn(
  "flex gap-4 justify-between",
  inlineActions ? "flex-row items-start" : "flex-col md:flex-row md:items-start"
)}>
  <div className="flex flex-col gap-1 min-w-0">
    <h2 className="text-xl font-semibold">{title}</h2>
    {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
  </div>
  {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
</div>
```

- The title and subtitle always sit in their own block with a 4px gap. Controls never sit between them, and they never wrap between them on mobile. This includes the Snapshot details "Next update" meta.
- The parent section is `rounded-md border p-8 flex flex-col gap-4`, so there is 16px from the header to the content.
- Use `inlineActions` for small controls (carousel arrows). Toolbars (filters, search, view toggle) stack below the title block under `md`.
- Subsection headers inside a panel (Download snapshot) use the same pattern: an h3 `text-base font-medium` and a subtitle with `gap-1`.

**Title panel (h1).** The hero, NotFoundPanel, SnapshotNotFound and the detail error state all use `rounded-md bg-secondary-background p-8 flex flex-col gap-4`. Inside it go an h1 `text-3xl font-semibold`, a subtitle `text-sm text-muted-foreground`, and an action row. Panel actions use the default (primary) `Button`. The detail error state reuses `NotFoundPanel` with an action prop.

**Empty state (one component).** It has no box and lives inside its section.
- An optional icon: `h-12 w-12 mb-4 opacity-50`.
- A title: `text-lg font-medium text-muted-foreground mb-2`.
- Body text: `text-sm text-muted-foreground`, with no trailing period.
- An optional outline action: `mt-4`.

---

## 7. Copy and casing

- Headings, buttons, labels, tooltips, filter labels, aria-labels and alt text all use **sentence case**. Proper nouns and acronyms keep their case: SnapsVault, SnapsOS, Celestia, GitHub, CLI, API, URL, SHA256, TX. The product is the "Open Snapshot Marketplace" and its Celestia edition is the "Celestia Snapshot Marketplace". Both names are correct, each stays in Title Case, and neither is a mistake to unify (page titles, hero, announcement bar).
- Headings, subtitles, empty-state lines and short descriptions end with no period.
- Write in a neutral voice.
- Use one noun for the people who publish snapshots: **contributor**. **Provider** may appear as a rare synonym in prose, for example "snapshot providers" once in an intro. Never call a contributor a node operator: node operators are the people who download snapshots.
- Three terms name where a snapshot lives, in tables, filters, copy, the API, the CLI and the docs alike:
  - **network** = the blockchain network, for example Celestia.
  - **chain** = mainnet or testnet.
  - **chain ID** = `celestia`, `mocha-4`, `mocha-5`.
- The registry path is `chains/<network>/<chain ID>/<contributor>.json`. The API and CLI use the same words: `network`, `chain` and `chain_id` parameters, `/api/networks`, and `-n/--network`, `-c/--chain`, `-i/--chain-id`.
- "Latest" means the newest snapshot, the one with the highest block height.
- Write **SHA256**, never SHA-256, and **community-driven**, always hyphenated.
- A title and a tooltip for the same control match: "Copy wget command".
- Loading skeletons repeat the exact strings of the loaded page.
- Canonical strings: "Snapshot details", "More snapshots", "Download snapshot", "Block height", "TX index", "Try again", "N/A" (a value the contributor does not publish), "All chains" (mainnet or testnet), "All networks", "All contributors", "snapshots from the marketplace".

---

## 8. Landing (`landing/`)

**Aligned with the app (must match):**
- Font family (Montserrat), radius (`rounded-md`), button text (14/20, weight 500), body text (14/20).
- Color tokens: `--background`, `--secondary-background`, `--border`, dark `--muted-foreground`, and light `--muted-foreground` set to **oklch(0.49 0 0)**.
- The wordmark is fixed #C792B8 in both themes, as in the app. All other brand-colored text on the landing is `text-brand-ink dark:text-brand`.
- The copy rules in section 7.

**One-line titles.** Every landing section title and subtitle stays on one line at every width from 640 up. Some sections use a smaller title size between 960 and 1280 on purpose to keep this. Change a title size only after measuring that the title still fits on one line at every width from 640 up.

**Deliberately different (marketing scale):**

| Role | Landing value |
|---|---|
| Hero h1 | 28/36, then 36/44 from xs, then 40/48 from lg, weight 700 |
| Eyebrow | 14/20, weight 600, brand ink |
| Section title | One shared `SECTION_TITLE` from `ui/section.tsx`: `text-[28px] leading-8 xs:text-[32px] xs:leading-10 base:text-[36px] base:leading-[44px] font-semibold tracking-[-0.02em]`. Used by `SectionHeader` and FAQ. See it in action sets its own title size so it stays on one line between 960 and 1280 |
| Section subtitle | 16/24, muted |
| Eyebrow to title to subtitle gap | 12 |
| Card title, standalone (Why, Ecosystem) | `text-lg leading-6 font-semibold` (18/24) |
| Card title next to a step or badge chip (How it works, Roadmap) | `text-base leading-5 font-semibold` (16/20), with no breakpoint dips |
| Card text | 14/20, muted |
| FAQ answer (prose) | 14/24 |
| Roadmap milestone text | 14/20, not 12/16 |
| Band padding | `<Band>` everywhere: `p-6 xs:p-8 base:p-12`. The hero may stay at 32px as its own role |
| Section header to content | 40 (`gap-10`) in every stacked section |
| Space between sections | 148 from base up, 106 below |
| Card padding | 24 for top-level cards, 20 (`p-5`) for cards nested in a padded band, with no breakpoint dip |
| Card grid gap | 16; unframed column layouts use 24 |

---

## 9. Checking a change

- Measure the result with `getComputedStyle` and `getBoundingClientRect` at 1440x900 and 390x844, in dark and light.
- Check WebKit first, then Chromium.
- Two places with the same role must report the same values.
