# Design system

This file is the visual law of the storefront. The reference rendering is [design/specimen.html](design/specimen.html); its verified screenshots are in [design/screens/](design/screens/). When this file and the specimen disagree, this file wins and the specimen must be fixed.

Direction in one line: **a bright, cool workbench with navy instrument panels, one blue, precise type, and a part number seated in a socket.**

## 1. Color

All colors are defined once, in OKLCH, in the tokens file (`src/styles/tokens.css`, see [engineering.md](engineering.md#design-tokens-in-code)). Hex values below are computed equivalents for reference only. Contrast ratios are WCAG 2.x, computed.

### Neutrals (light surfaces)

| Token | OKLCH | Hex | Use |
| --- | --- | --- | --- |
| `canvas` | `0.972 0.006 247` | `#F3F6FA` | Page background |
| `surface` | `1 0 0` | `#FFFFFF` | Cards, panels, inputs, the buy panel |
| `sunken` | `0.948 0.009 247` | `#E9EEF4` | Image wells, table headers, segmented-control track, search field |
| `line` | `0.905 0.012 247` | `#DAE1E7` | Hairlines, card outlines, dividers (decorative only) |
| `control-line` | `0.62 0.02 250` | `#7D8792` | Borders that identify a control: inputs, steppers, secondary buttons. 3.63:1 on surface, 3.35:1 on canvas (WCAG 1.4.11 needs 3:1) |
| `ink-muted` | `0.47 0.03 252` | `#4F5C6C` | Secondary text. 6.28:1 on canvas, 5.85:1 on sunken |
| `ink` | `0.228 0.047 254.7` | `#0C1D32` | Primary text, headings, the brand navy. 15.67:1 on canvas |

The client palette's `#FFFBFC` has a faint pink cast that fights the blue-grey mist. It is replaced by the cool `canvas`. `#D9E2E9` survives as `line`.

### Navy (dark panels)

| Token | OKLCH | Hex | Use |
| --- | --- | --- | --- |
| `navy` | `0.228 0.047 254.7` | `#0C1D32` | Hero frame, category feature tile, process band, footer, cart button |
| `navy-raised` | `0.27 0.045 254` | `#16273C` | A card or chip on navy |
| `navy-raised-2` | `0.31 0.043 253` | `#203246` | A control on a raised navy card |
| `navy-line` | `0.36 0.04 252` | `#2E3F52` | Hairlines on navy |
| `on-navy` | `0.97 0.008 247` | `#F1F6FA` | Text on navy. 15.58:1 |
| `on-navy-muted` | `0.76 0.03 248` | `#A3B3C4` | Secondary text on navy. 7.94:1 |

Elevation on navy is a lighter surface, not a border or a glow.

### Blue (the only hue)

| Token | OKLCH | Hex | Use |
| --- | --- | --- | --- |
| `blue-50` | `0.975 0.012 236.5` | `#F0F8FE` | Row hover, info panel fill (ETA box) |
| `blue-100` | `0.95 0.026 236.5` | `#DFF2FE` | Selected-row fill |
| `blue-200` | `0.9 0.056 236.5` | `#BCE5FF` | Info panel outline |
| `signal` | `0.74 0.154 236.5` | `#20B7FE` | **The vivid accent, only on navy.** Highlight word in the hero, key figure, cart count, a button on navy (with `ink` label, 7.53:1) |
| `action` | `0.549 0.118 236.5` | `#047AAD` | Primary button fill on light surfaces (white label 4.78:1), focus ring, selected thumbnail ring, the socket-tab pin |
| `action-hover` | `0.5 0.11 236.5` | — | Hover and pressed fill of `action` |
| `link` | `0.47 0.102 236.5` | `#00628C` | Link text and small blue text on light surfaces. 6.19:1 on canvas |

Rules:

- `action` is never used for body-size text on `canvas` (4.41:1 fails). Use `link`.
- `action` or `link` text never sits on navy (≈ 3.5:1 fails). Use `signal`.
- One primary (`action`) button per view region. Everything else is secondary or ghost.

### Status

| Token | OKLCH | Hex | Use |
| --- | --- | --- | --- |
| `ok` / `ok-bg` | `0.5 0.12 155` / `0.96 0.03 155` | `#0B7643` / `#E3F8E9` | In stock (count above the low threshold), "Added" confirmation |
| `low` / `low-bg` | `0.52 0.11 65` / `0.965 0.035 80` | `#935A11` / `#FFF1DA` | Low stock (count at or below the threshold in [commerce.md](commerce.md#stock)) |
| `out` / `out-bg` | `0.52 0.17 25` / `0.965 0.02 25` | `#B63132` / `#FFEFED` | Out of stock, field errors |

Status color always travels with text ("16 in stock", never a dot alone). All pairs above are ≥ 5:1.

## 2. Typography

Two families, both SIL OFL, variable, self-hosted.

| Role | Family | Why |
| --- | --- | --- |
| Display and text | **Mona Sans** (variable `wght` 200–900, `wdth` 75–125) | One family that can be set semi-expanded and tight for headlines and normal width for reading. The width axis is what makes headlines feel engineered rather than templated. |
| Part numbers, codes, labels | **Geist Mono** (variable `wght`) | Slashed zero by default, so `0` and `O` never collide in `ESP32-WROOM`. Verified against Martian Mono, which failed this test. |

IBM Plex Sans and Plex Mono are retired. Do not add a third family.

### Type roles

Set every text element with one role. Never set a raw size.

| Role | Size (mobile → desktop) | Line height | Tracking | Weight | Width | Use |
| --- | --- | --- | --- | --- | --- | --- |
| `display-xl` | 40 → 72px, `clamp(2.5rem, 1.2rem + 4.2vw, 4.5rem)` | 0.98 | −0.035em | 640 | 112 | Home hero headline only |
| `display` | 32 → 48px | 1.04 | −0.03em | 620 | 110 | Section headlines |
| `title` | 26 → 32px | 1.1 | −0.02em | 600 | 106 | Product name (h1 on the product page), page titles |
| `heading` | 20px | 1.3 | −0.01em | 600 | 100 | Card titles, panel headings |
| `body-lg` | 18px | 1.55 | 0 | 400 | 100 | Ledes |
| `body` | 16px | 1.55 | 0 | 400 | 100 | Running text, max 65ch |
| `small` | 14px | 1.45 | 0 | 400–560 | 100 | Table cells, buttons, meta |
| `caption` | 13px | 1.4 | 0 | 400 | 100 | Notes, footnotes, image notes (`ink-muted`) |
| `label` | 11px, Geist Mono, uppercase | 1.2 | +0.06em | 500 | — | Eyebrows, table headers, spec labels |
| `part` | inherits size, Geist Mono | inherits | −0.01em | 500 | — | Every part number and MPN, everywhere |
| `num` | inherits size, Mona Sans | inherits | −0.02em | 600 | 108 | Prices, stock counts, key figures. Always `tabular-nums` |

Rules:

- Headings use `text-wrap: balance`. Paragraphs use `text-wrap: pretty`.
- Tracking tightens as size grows and is never positive on Mona Sans above 14px.
- Prices render as a small muted `Rs` followed by the `num` figure (`Rs 1,250`). Use thousand grouping, never lakh grouping.
- Put a non-breaking space between a number and its unit (`5 V`, `3.3 V`, `1 A`). Ranges use an en dash (`7–35 V`).
- Part numbers are selectable text, never images, never uppercase-transformed (the data already holds the correct case).

## 3. Space and layout

### Spacing scale (px)

`2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 128`

No other spacing values. Component internals use 4–24. Section rhythm uses 56 (mobile) and 96 (desktop) between sections.

### Grid

| | Mobile (< 900px) | Desktop (≥ 900px) |
| --- | --- | --- |
| Content max width | full | 1280px |
| Gutter (page side padding) | 16px | 32px |
| Frame inset (navy hero, band, footer distance from viewport edge) | 8px | 12px |
| Columns | 4 | 12 |
| Column gap | 12px | 24px |

Breakpoints: `sm 640`, `md 900` (the layout switch), `lg 1200`, `xl 1440`. Test at 390 and 1440 always, and at 900 when a layout switches.

### Alignment rules

- Every edge aligns to the content column or a column line. Text inside a card starts at the card padding, never at an arbitrary offset.
- Numbers in tables and summaries are right-aligned, and their column headers are right-aligned too.
- Thumbnails and text in a row are vertically centered with `align-items: center`, not baseline.
- An eyebrow (`label`) sits 8px above its headline. A headline sits 16–24px above its first content.

## 4. Shape

### Radius scale (concentric)

| Token | px | Use |
| --- | --- | --- |
| `r-frame` | 28 | Hero frame, process band, footer, product gallery panel, buy panel |
| `r-panel` | 20 | Bento tiles, table panel, cart sheet, spec tiles, search dock field |
| `r-card` | 16 | Product cards |
| `r-control` | 12 | Image wells inside cards, info boxes |
| `r-chip` | 8 | Part-number chips, small badges |
| `r-pill` | 999 | Buttons, inputs in the header, segmented controls, filter pills, steppers |

Nested rule: `inner radius = outer radius − padding`. A 28px gallery with 12px padding holds a 16px image well.

### Signature: the socket tab

A part-number tab that rises from a card's top edge, with 10px concave corners on both sides of its base, filled with the card's own color.

- **Where it appears:** product cards (catalog on mobile, related parts), the product gallery panel (part number and manufacturer), and the front hero card. Nowhere else.
- **Content:** a 6×6px `action` "pin" square with 2px radius, then the part number in `part` at 12–13px.
- **Geometry:** height 30px (34px on the gallery), 12px horizontal padding, top radius 10px, placed 24px from the card's left edge (32px on the gallery). The parent reserves 30px of top margin so the tab never collides with content above.
- **Implementation:** the tab's `::before` and `::after` are 10×10px squares at its base, painted with `radial-gradient(circle at 0 0 / 100% 0, transparent 9.5px, <card color> 10px)`. Cards that carry a tab are flat (outline or no shadow), because a shadow would draw a seam where the tab meets the card.
- **Reverse form (desktop hero only):** the search bar docks into a notch cut out of the navy frame's bottom-left corner, with 28px concave corners above and to the right of it. On mobile the search sits inside the navy panel instead; a sliver of navy beside a narrow notch looked like a rendering bug at 390px.
- **Accessibility:** the tab is a visual container for text that is also present in the card's accessible name. Do not put interactive controls inside a tab.

## 5. Elevation

Shadows are layered and tinted toward navy, never neutral grey.

| Token | Value | Use |
| --- | --- | --- |
| `shadow-1` | `0 1px 2px ink/6%, 0 1px 1px ink/4%` | Selected segment, keycap, small chips |
| `shadow-2` | `0 2px 4px ink/5%, 0 8px 24px -6px ink/12%` | Header bar, buy panel, hovered tile |
| `shadow-3` | `0 4px 8px ink/6%, 0 24px 48px -12px ink/28%` | Cart sheet, front hero card, dialogs |

Most surfaces have no shadow. They separate from `canvas` by being `surface` with a 1px `line` inset outline (`box-shadow: inset 0 0 0 1px`). Shadows mean "this floats above the page".

Translucency is used once: the header bar (`surface` at 78% with `backdrop-filter: blur(20px) saturate(160%)`). Under `prefers-reduced-transparency: reduce` it becomes solid `surface`.

## 6. Motion

| Token | Value | Use |
| --- | --- | --- |
| `dur-1` | 120ms | Hover, press, color changes |
| `dur-2` | 200ms | Tile hover shadow, popovers, search results |
| `dur-3` | 320ms | Cart sheet, dialogs, page view transitions |
| `ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Everything |

- Press: `transform: scale(0.97)` on `:active`, `dur-1`. Feedback begins on pointer-down.
- Hover: background, outline or shadow change. No lift (`translateY`) on catalog rows or tiles.
- Cart sheet: enters from the right and leaves to the right on the same path, `dur-3`. It can be dragged closed and reversed mid-gesture on touch.
- Add to cart: the button label changes to "Added" immediately, the cart count updates without counting through intermediate numbers, the sheet opens with an "Added [part] to cart" line. No flying thumbnail.
- Page navigation: native cross-document view transitions (`@view-transition { navigation: auto; }`). The catalog thumbnail and the product gallery image share a `view-transition-name` per part so the photo carries across. Nothing else is named.
- Allowed once per page load: a 320ms fade-and-rise of the hero copy on the home page. Not on every section, not on scroll.
- Forbidden: bounce, elastic, parallax, marquee, autoplay carousel, pulsing dots, shimmer skeletons under reduced motion, staggered reveal of every table row.
- `prefers-reduced-motion: reduce`: transforms are removed; opacity changes of 120ms remain so state changes stay visible.

## 7. Imagery

- Product photos sit in a `sunken` well on a light, even background. Use `mix-blend-mode: multiply` only when the photo background is near-white or light grey.
- Square (1:1) on the product page, 4:3 in cards, 1:1 in table thumbnails (52px) and cart lines (64px).
- Every image has explicit `width` and `height` and is served through `astro:assets` in AVIF/WebP with responsive sizes.
- A studio or representative photo carries the `image_note` caption under it. A photo of the actual lot needs no note.
- No stock lifestyle photos, no AI-generated people, no 3D renders of parts the shop does not stock.
- When no photo exists, show the package name in `part` style inside the well. Never a placeholder service.

## 8. Iconography

- One stroke icon set, drawn at 24px on a 24px grid, 1.7–1.8px stroke, round caps. Inline SVG `<symbol>` sprite in the layout; no icon font, no CDN.
- Icons appear only where they speed recognition: search, cart, close, delivery, datasheet, check, arrow. Not as decoration in front of every heading.
- The plug logo is the brand mark. `action` on light, `signal` on navy. Do not redraw it per page.

## 9. Components

Specimen sections are named in brackets.

### Header [s-header]

A floating pill bar, sticky 8/12px from the top, 60/64px tall, translucent `surface`, `shadow-2`.

- Desktop: logo, segmented nav (Catalog, How ordering works, Shipping, Contact) in a `sunken` track with the current page as a raised white segment, search field (opens the search dialog, `/` shortcut), cart button.
- Mobile: logo, search icon button, cart button. Navigation moves to the footer and a sheet opened from the logo menu if needed.
- Cart button: `navy` pill with bag icon, "Cart" on desktop, and a `signal` count badge. The count is announced to screen readers ("Cart, 2 items").
- The old two-row header (utility banner plus navbar) does not return.

### Buttons

| Variant | Look | Use |
| --- | --- | --- |
| Primary | `action` fill, white label, pill, 44px (52px large) | Add to cart, Check out, Place order, Search |
| Signal | `signal` fill, `ink` label | The primary action on navy only |
| Secondary | `surface` fill, `control-line` inset outline | Datasheet, Add in table rows, Copy |
| Ghost | transparent, `sunken` on hover | Remove, Sort, tertiary actions |
| Disabled | `sunken` fill, `ink-muted` label | Out of stock (the label says why) |

Labels state the action and, on the buy panel and cart, the amount ("Add to cart · Rs 45", "Check out · Rs 2,545"). Minimum hit area 44×44px.

### Inputs

Pill or 12px-radius field, `surface` fill, `control-line` outline, 44px minimum height (52–72px for the hero search). Focus: 2px `action` inset ring. Label above the field, always visible; placeholder is an example, never the label. Error text in `out` below the field, with `aria-invalid` and `aria-describedby`.

### Segmented control and filter pills [s-catalog]

36px pills. Unselected: `surface` with `line` outline. Selected: `navy` fill, `on-navy` text. Each category pill shows its count in `label` style. Implemented as links or `aria-pressed` buttons; the selection is in the URL.

### Stock indicator

A dot plus text in the status color: "48 in stock" (`ok`), "9 in stock" (`low`), "Out of stock, back around 12 Nov" (`out`). On product cards and the hero card, a 10-segment meter may accompany it; each segment is 10% of the shop's normal shelf quantity for that part, never a fake scarcity bar.

### Product card [s-catalog mobile, s-hero]

`surface`, `r-card`, 16px padding, socket tab with the part number. Inside: 4:3 or 1:1 image well, job sentence (`small`, weight 560), stock indicator, price (`num`). The whole card is one link to the product page; an add button, if present, is a separate control.

### Catalog table [s-catalog desktop]

Inside a `surface` panel with `r-panel` and `line` outline. Header row on `sunken` in `label` style. Columns: thumbnail, Part (`part`), What it is, Key spec, Stock (right), Price (right), Add. Row hover `blue-50`. Sorting by price and stock from the header. Below 900px the table becomes product cards.

### Category bento [s-bento]

Four-column grid on desktop with 168px rows; the featured category spans 2×2 on `navy` with a real product photo in an inset `r-card` well. Other tiles are `surface` with an arrow chip, the category label, a plain heading and the real count. Counts come from the catalog, never typed.

### Buy panel [s-pdp]

Sticky (top 96px) on desktop, `surface`, `r-frame`, 28px padding, `shadow-2`. Order: part-number chip and package, product name (h1, `title`), one-sentence job, price and stock on one line, ETA box (`blue-50`), stepper plus primary button, a hairline, then a key–value list (In the bag, Datasheet, Defects). On mobile it follows the gallery, and a sticky bottom bar with price and "Add to cart" appears once the panel's button scrolls out of view.

### Key figures [s-pdp]

Four tiles of the most decision-relevant specs as large `num` figures with small muted units. The first tile is `navy` with the figure in `signal`. Below them, the full spec table (`dl`) with `label` keys.

### Cart sheet [s-drawer]

A floating sheet 8px from the viewport edges, max 420px wide, `r-panel`, `shadow-3`, over a 42% navy scrim. Header (title and part count, close button), "Added" confirmation line in `ok-bg`, lines (64px image, part number, job, stepper, line total, Remove), footer on `canvas` with subtotal, delivery rule, a primary "Check out · amount" button, and "Guest checkout. No account needed." Focus is trapped while open; Escape and the scrim close it; focus returns to the cart button.

### Process band [s-band]

`navy` frame with a display headline and three `navy-raised` step cards labeled `STEP 1–3` in `signal` mono. Only for content that really is a sequence.

### Footer [s-footer]

`navy` frame inset like the hero. Columns: brand and hours, Catalog links, Counter links, Dispatch facts. Links in `on-navy`, labels in `on-navy-muted`. Must pass contrast; the current footer renders links black on black.

## 10. Do and don't

| Do | Don't |
| --- | --- |
| Separate surfaces with tone and a hairline | Put a shadow on every card |
| Use one primary button per region | Make every button blue |
| Show real counts in category tiles and pills | Show decorative numbers |
| Use the navy frame for one hero and one band per page | Alternate dark and light sections all the way down |
| Keep the socket tab to part numbers | Use the tab shape for headings, nav or buttons |
| Let photos breathe in a quiet well | Add gradients, glows or patterns behind products |
| Use `label` mono eyebrows sparingly | Put an eyebrow above every heading |
