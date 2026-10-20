# Design system

House decision, 19 October 2026. The research left the hues unlocked so the report would not invent a brand. This file locks them so later agents paint the same shop.

The system is called Bench. It should feel like a finished counter, not an unstyled document. Photographs, the ink header, the copper action, and the short motion below are part of the system. A page of naked type on a gray field is a failed pass. Do not remove the photographs or set every `stock_qty` back to 0. The counts in the catalog are sample drawer counts so a buyer can add a part. The photographs are representative studio pictures; each record says so in `image_note`.

The memorable element is the part number, set large in mono. The photograph is evidence of the object. The price is a fact, not a shout.

## What to refuse

These looks are generic, and they are forbidden on this shop even when a reference site uses something adjacent:

- Warm cream paper with a clay or terracotta accent.
- A near-black page whose only idea is an acid green or vermilion accent.
- A newspaper layout of drop caps and hairline columns.
- Inter, or the raw system font, as the unchosen default. The current stack is Inter and JetBrains Mono. Replace it. Do not keep both during the reskin.
- An identical rounded card for every part, with a shadow that lifts on hover.
- Gradient-mesh heroes, glassmorphism, and purple-blue SaaS gradients.
- The current 16px card radius, 12px input radius, and the stack of decorative shadows in `global.css`.

## Color

Roles, not nicknames, in component CSS. Check pairs, not swatches. Contrast below was measured against the bench and white surfaces.

| Token | Hex | Use |
| --- | --- | --- |
| `--surface` | `#F4F5F3` | Page background. Cool bench. Replaces `#FFFBFC`, which has a pink cast |
| `--surface-raised` | `#FFFFFF` | Drawer, dialog, inputs |
| `--surface-sunken` | `#E8EAE6` | Image well, spec-table stripe |
| `--ink` | `#161A1D` | Text, the primary button fill, the wordmark. 16.01:1 on `--surface` |
| `--ink-muted` | `#3C4650` | Secondary text that is still information. 8.79:1 on `--surface`. Spec labels use this, not a lighter gray |
| `--ink-faint` | `#5C656C` | Disabled controls only. 5.43:1 on `--surface`. Never a price, a part number, or a stock count |
| `--on-ink` | `#FFFFFF` | Text on the primary button. 17.51:1 |
| `--line` | `#7E8682` | The boundary of an input, a button, or any control whose edge carries meaning. 3.42:1 on `--surface`, 3.74:1 on white |
| `--line-subtle` | `#D8DCD8` | Decorative table rules only. Alignment still has to work if the rule disappears |
| `--mark` | `#8A4E2B` | The copper rule under a part number. 5.99:1 on `--surface`. Not a link color, not a heading color, not a second button |
| `--success` | `#0E5C3B` | 7.35:1 on `--surface` |
| `--success-bg` | `#E5F3EC` | Success container. Text pair 7.03:1 |
| `--warning` | `#7A4E00` | |
| `--warning-bg` | `#FBF3E0` | Pair 6.51:1 |
| `--danger` | `#8E1E2B` | |
| `--danger-bg` | `#F8E8EA` | Pair 7.48:1 |

Rules:

- The primary action is an ink button with `--on-ink` text. There is no blue CTA. The current `#007AAD` accent is retired.
- `--mark` appears as a 2px rule directly under the part number, and nowhere else.
- Status always has a word or an icon as well as a color. “In stock” is not communicated by green alone.
- Do not invent `--ink-faint` body copy to make a layout look delicate. Muted information uses `--ink-muted`.
- Shadows are translucent black at low alpha, and only on the cart drawer, a menu, and a dialog. Cards and table rows have no shadow.
- Light theme only. Do not add a dark assignment of these roles in this pass.

## Type

One family, chosen because it was designed as a pair for technical interfaces and it includes tabular figures and a slashed zero.

- Text: **IBM Plex Sans**, weights 400, 500, and 600 only. No light, thin, bold-as-in-700, or black.
- Mono: **IBM Plex Mono**, weights 400 and 500. Part numbers, pin names, prices in a column, stock counts, and the order id.
- Self-host the woff2 files. One preload for the body weight. Do not request the Google CSS stylesheet, and do not request it twice.
- Product descriptions stay in Plex Sans. Mono is for data, not for paragraphs.

Each role locks size, line-height, weight, and tracking together. Do not set a new combination at the call site.

| Role | Size | Line-height | Weight | Tracking | Notes |
| --- | --- | --- | --- | --- | --- |
| `display` | `clamp(2rem, 4vw, 2.75rem)` | 1.05 | 500 | `-0.02em` | Home title only |
| `title` | `1.75rem` | 1.15 | 500 | `-0.015em` | The job sentence on a product page |
| `part-number` | `1.5rem` | 1.2 | 500 | `0` | Plex Mono, `tabular-nums`, `slashed-zero`. This is the signature |
| `heading` | `1.125rem` | 1.3 | 600 | `-0.01em` | Section headings |
| `body` | `1rem` | 1.5 | 400 | `0` | 16px. Measure 45–75 characters |
| `price` | `1.25rem` | 1.2 | 500 | `0` | Tabular lining figures. In a table, align right |
| `label` | `0.75rem` | 1.3 | 500 | `0.06em` | Uppercase eyebrows only. Not the only place a fact appears |
| `caption` | `0.8125rem` | 1.45 | 400 | `0` | Floor for informative text. 13px |
| `mono` | `0.875rem` | 1.4 | 500 | `0` | Table cells, order ids |

- Nothing a buyer must read is below 13px. The current `text-[9px]`, `font-size:10px`, and `0.625rem` sizes are defects. Delete them when you touch the component.
- All-caps labels use the tracking in the table. Body and table prose get none.
- Prices, stock counts, and columns of part numbers use `font-variant-numeric: tabular-nums`. Part numbers also use `slashed-zero`.
- A part number inside a sentence may stay in the text face so it does not look like a ripped-out cell. A part number that is the name of the product uses `part-number`.
- Two weights plus italic are enough for UI text. Italic is for the representative-image note and for nothing decorative.

## Spacing and alignment

The scale is `0, 2, 4, 8, 12, 16, 24, 32, 48, 64` pixels. In CSS, use the custom properties `--space-0` through `--space-64`.

- `2px` is only for a hairline offset, a focus ring’s gap, or optical alignment of an icon inside its box.
- A margin of 13px, 18px, 20px, or any other off-scale value is a defect.
- Page padding is 16px below 720px and 32px from 720px up.
- The catalog table’s content width is 1120px. Reading text is 65 characters, not the table width.
- Part numbers align left. Prices align right, in tabular figures. The same alignment is used in the table, the cart, and the checkout summary.
- When text is resized to 200%, the price stacks under the name. Do not shrink the type to save the row.
- Centered card grids are not the catalog.

The grid may break in four cases only:

1. Optical centering of a label inside a button.
2. A 1px keyline.
3. A pixel of icon shift inside its box.
4. A full-bleed photograph whose crop is the object.

## Radius, focus, and controls

- `--radius-control: 4px` for buttons, inputs, and the image well.
- Table rows, spec rows, and the page itself are square.
- Focus is a 2px outline in `--ink`, with a 2px offset. Do not remove the outline. Do not replace it with a color change alone.
- Primary buttons and the quantity stepper are at least 44px tall. WCAG 2.2 AA allows 24px. This shop’s hand controls are 44px anyway.
- Pressed buttons scale to `0.98` on `:active`, for about 100ms. Hover is a background or opacity change, not a lift and not a shadow.
- Inputs have a visible label. The placeholder is an example, never the label.

## Layout

One sticky bar. It contains the wordmark, search, and the cart. It is not a utility banner plus a second navbar. The current 104px offset and the 32px banner are removed when the catalog work reaches the header. Hours, the phone, and the delivery window live in the footer and next to the price. They do not occupy a permanent strip.

### Home

```
Lahore Silicon          [ search part number ]     Cart
The counter. A short sentence of what this desk sells.

Part            What it is                  Stock     Price
LM7805          5 V, 1 A, TO-220            24        Rs 45
AMS1117-3.3     3.3 V LDO, SOT-223          40        Rs 20
```

The home page is the catalog. A hero may be the title and one sentence. It is not a campaign.

### Product, first screen at desktop

```
+------------------+  5 V, 1 A, TO-220 linear regulator
|                  |  LM7805
|   photograph     |  ────          copper rule, 2px, --mark
|   1:1 well       |  Rs 45
|                  |  24 in stock
+------------------+  Lahore: 1 business day. Nationwide: 48–72 hours.
                      [ Add to cart ]   −  1  +
                      Datasheet · Loose TO-220 in an antistatic bag

                      Output        5 V
                      Current       1 A
                      Package       TO-220
```

On a 390px screen the photograph stacks above the same block. The block does not split into a story above and the facts below a fold.

### Catalog

- Desktop is the table. Sortable by price and by stock. Filters are a row of text buttons above the table, not a sidebar.
- Mobile is a list: part number, job line, stock, price. Same data.
- Hover on a row is `--surface-sunken`. No transform.
- The empty filter state names the category and offers the full list.

## Motion

Catalog motion answers an action. It is not atmosphere.

| Element | Duration | Easing | Notes |
| --- | --- | --- | --- |
| Hover, press | 100–150ms | ease-out | Opacity or background only |
| Drawer, dialog | 200–250ms | ease-out | Transform and opacity. Interruptible. Enters and leaves on the same path: the drawer comes from the right and returns to the right |
| Add to cart | instant text confirmation | | No flying thumbnail. No count animation through intermediate numbers |
| Home intro | one 300ms fade, optional | ease-out | The only marketing motion |

- Do not animate `width`, `height`, `top`, or `margin` on catalog rows.
- No bounce, no elastic, no marquee, no gradient drift, no parallax, no autoplaying carousel, no pulsing dot.
- Under `prefers-reduced-motion: reduce`, drop the transform and keep a 150ms opacity change so a panel is still obviously open.
- The drawer follows the pointer while it is dragged, and it can be reversed mid-way. A scripted close that ignores a second grab is a defect.

## Signature

On the product page the part number is set in `part-number`, larger than the surrounding captions and with the copper rule beneath it. Everywhere else, part numbers are mono and selectable. That treatment is the thing a buyer remembers. Do not compete with it with a second graphic idea.

## Migration from the current CSS

`src/styles/global.css` already tries to be a token file and the pages do not consume it. When you reach change-plan item 9:

- Replace the palette, the fonts, the radii, and the shadows with this file’s tokens.
- Delete unused keyframes `pulse-dot` and `shimmer` unless a real loading state needs a static skeleton. A skeleton does not shimmer if the buyer has asked for reduced motion.
- Map old names once: `--color-navy` and `--color-accent` do not survive as aliases of the new ink. Leaving the old blue in an alias guarantees it comes back.
