# Engineering

Stack: Astro 7 (`output: 'server'`, product pages prerendered), Preact islands, nanostores, Tailwind CSS v4, Zod 4, Cloudflare Workers via `@astrojs/cloudflare`, D1 for orders, Pagefind at build. Node ≥ 22.12.

## Architecture

```
src/
  styles/tokens.css        the only file with color, radius, shadow, font, motion values
  styles/global.css        base element styles and component classes built from tokens
  layouts/Layout.astro     head, fonts, icon sprite, header, footer, cart sheet
  components/              Astro components; *.tsx only for islands
  lib/                     one module per policy: money, shipping, shop, phone, quantity, catalog, catalog-search, order, categories, clock
  store/cartStore.ts       cart state (part_number + quantity only)
  actions/index.ts         server actions (checkout) — to add
  content/components/      one JSON per part
  pages/                   routes
db/                        forward-only SQL
tests/                     vitest (unit) and playwright (e2e, visual, a11y) — to add
```

- Astro renders by default. A component becomes an island only if it needs the pointer or local state: cart sheet, cart button, quantity stepper, add button, search dialog, checkout form enhancements, mobile sheet.
- Hydration: `client:load` only for the cart button and cart sheet; `client:visible` for below-the-fold islands; `client:idle` for search.
- Shared data passes to islands as minimal props (part number, price, stock), never the whole catalog when one part is needed.
- New policy text or number goes into `src/lib/`, then pages import it.

## Astro 7 specifics

- Astro 7 (June 2026) uses Vite 8 and a stricter Rust compiler: unclosed tags are errors. `compressHTML` defaults to `'jsx'`, which strips whitespace between inline elements; write `{" "}` where a space matters.
- Content collections use loaders and `astro/zod`. Keep `glob()` for parts.
- Use `import { env } from 'cloudflare:workers'` for bindings (already done). `Astro.locals.runtime` is gone.
- Prefer native cross-document view transitions (`@view-transition { navigation: auto; }`) over `<ClientRouter />`. They need no JavaScript and are compatible with Astro's hash-based CSP, which does not support `<ClientRouter />`.
- Prefetch product links on hover/viewport with Astro's `prefetch` config.

## Design tokens in code

1. Create `src/styles/tokens.css` with one Tailwind v4 `@theme` block holding every token in [design-system.md](design-system.md), in OKLCH.
2. Start the color namespace with `--color-*: initial;` so default Tailwind colors stop existing and off-palette classes fail to generate.
3. Map fonts with `@theme inline { --font-sans: var(--font-mona); --font-mono: var(--font-geist-mono); }` when using the Astro Fonts API variables.
4. Delete both competing token sets now in `global.css` (the "Palette 2" block and the grey/copper `:root` block) and the unused keyframes.
5. Port component classes from `docs/design/specimen.html` into `global.css` (or Astro component `<style>` blocks) using only token variables.

Enforcement (add in the foundation step):

- Stylelint with `color-no-hex` and `color-named: never` on everything except `tokens.css`, plus a rule or grep check that rejects `oklch(`/`rgb(` outside it.
- A CI grep that fails on Tailwind arbitrary values (`-\[[^\]]+\]` in `class` attributes) and on visual `style="` attributes in `src/`.
- `npx astro check` with zero errors.

## Fonts

- Use the Astro Fonts API (top-level `fonts` config and `<Font />` from `astro:assets`) with the Fontsource provider or local files: Mona Sans (variable, `wght` and `wdth` axes) and Geist Mono (variable `wght`). Confirm the Mona Sans source includes the `wdth` axis; if the Fontsource variable package ships `wght` only, self-host the full variable woff2 from the official Mona Sans release with `fontProviders.local()`.
- Subset to Latin plus the symbols the site uses: `–`, `·`, `×`, `µ`, `Ω`, `°`, curly quotes.
- Preload only the Mona Sans file used above the fold. The API generates metric-matched fallbacks; keep them to avoid layout shift.
- Remove `@fontsource/ibm-plex-*` and the `public/fonts/ibm-plex-*` files.

## Images

- Move part photos from `public/parts/` to `src/assets/parts/` so `astro:assets` can optimize them. Use `<Image>`/`<Picture>` with `layout="constrained"`, explicit sizes, AVIF and WebP.
- The adapter's Cloudflare Images binding is enabled for production; keep it.
- Product page main image: `fetchpriority="high"`, no lazy loading. Everything below the fold: `loading="lazy"`, `decoding="async"`.
- Share `view-transition-name: part-<slug>` between the catalog thumbnail and the product gallery image.

## Performance budgets

Measured on Lighthouse mobile (simulated slow 4G, mid-tier Android) against a production build. Pakistani 4G has 70–130 ms latency and 11–24 Mbps typical speed, so request count matters as much as bytes.

| Metric (p75 field / lab) | Budget |
| --- | --- |
| LCP | ≤ 2.0 s (Google "good" is 2.5 s) |
| INP (field) / TBT (lab) | ≤ 200 ms / ≤ 150 ms |
| CLS | ≤ 0.05 |
| HTML document | ≤ 30 KB compressed |
| CSS total | ≤ 35 KB compressed |
| JS on product page | ≤ 45 KB compressed (Preact + nanostores + islands) |
| Fonts | ≤ 2 files on first load, ≤ 120 KB total |
| Above-the-fold images | ≤ 120 KB |
| Third-party requests | 0 on catalog and product pages; Turnstile only on checkout |

Enforce with Lighthouse CI (`resource-summary:*` assertions are in bytes) and report field data with the `web-vitals` library to a small D1 or Analytics Engine endpoint.

## Orders, stock and D1

D1 has no interactive transactions. `batch()` is atomic and ordered. The order write becomes:

1. Validate input with Zod (in the Action).
2. Verify Turnstile server-side with `remoteip` from `cf-connecting-ip`. Tokens are single-use and expire after 300 s.
3. Rate-limit with the Workers rate-limit binding, keyed by route plus a session or cart key (the binding is approximate and per location).
4. Re-price with `quoteOrder()`.
5. Idempotency: the client sends a UUID; `Orders.idempotency_key` is `UNIQUE`. A duplicate returns the existing order ID.
6. One `batch()`: a decrement per line on a `stock` table guarded by `CHECK (qty >= 0)` (so an oversell throws and rolls back the batch), then the order insert. Verify `meta.changes` afterwards. Test the rollback behavior against local D1 before relying on it.

Schema changes are new numbered files in `db/migrations/`, applied with `wrangler d1 migrations apply`. Never edit an applied migration.

## Checkout as an Action

Move `POST /api/order` into `src/actions/index.ts` with `accept: 'form'`, so checkout works as a plain form and is enhanced by the island. Keep `security.checkOrigin` on (default). Use `isInputError()` to map Zod errors to fields.

## Security

- Security headers from middleware: `Content-Security-Policy` (Astro `security.csp` hashes, plus Turnstile's origin on checkout), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal, `frame-ancestors 'none'`.
- No buyer string is rendered with `set:html`. JSON for islands goes through `JSON.stringify` in a `type="application/json"` script.
- Secrets in Wrangler secrets. Only `PUBLIC_*` shop details are inlined at build.
- Log error names, never buyer data.

## Accessibility (WCAG 2.2 AA)

- Semantic landmarks, one `h1` per page, headings in order, skip link.
- Visible focus on everything (2px `action` ring, 2px offset). Sticky header and bottom bar never cover the focused element (2.4.11).
- Targets ≥ 44×44px for primary controls, never below 24×24px (2.5.8).
- Dialogs (search, cart): `role="dialog"`, `aria-modal`, labelled, focus trapped, Escape closes, focus returns to the opener.
- Do not ask for the same information twice in checkout (3.3.7). Help (WhatsApp, contact) stays in the same place on every page (3.2.6).
- Status changes (added to cart, quantity corrected, copied) announced through one `aria-live="polite"` region.
- Respect `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast: more`.

## Testing

| Layer | Tool | Covers |
| --- | --- | --- |
| Unit | Vitest | `money`, `quantity`, `phone`, `shipping` clock math, `catalog-search` ranking, Zod schemas |
| Data | Vitest + Miniflare/local D1 | Order insert, idempotency, stock decrement and rollback |
| E2E | Playwright | Search → product → add → change quantity → cart → checkout → success; empty cart; out-of-stock; invalid phone |
| Visual | Playwright `toHaveScreenshot` | Home, product, cart open, checkout at 390 and 1440. Baselines generated on the CI OS only; hide the clock-driven status chip with `stylePath` |
| Accessibility | `@axe-core/playwright` | WCAG 2.0/2.1/2.2 A and AA tags on every route in the E2E suite |
| Performance | Lighthouse CI | Budgets above, mobile, 5 runs |

Scripts to add to `package.json`: `check` (astro check), `test` (vitest), `test:e2e`, `test:visual`, `lint:css`, `lhci`.

## Developer experience

- `astro dev --background` for the dev server; check `astro dev status` before starting one.
- Keep the specimen (`docs/design/specimen.html`) in sync when a token changes, and regenerate `docs/design/screens/`.
- A short `CONTRIBUTING` section in the root README: install, env vars from `.env.example`, D1 local setup (`wrangler d1 execute --local --file db/schema.sql`), how to run tests.
- Remove `scratch/` from the repo or move its script into `tests/`.

## AI agent setup

- `AGENTS.md` (and `CLAUDE.md`, which mirrors it) stay short: what the shop is, where the manual is, how to run the server. They point here instead of repeating rules.
- Rules that matter are enforced by tools (stylelint, CI greps, astro check, tests), not only by prose.
- Optional: a Cursor or Claude Code hook that blocks edits to `docs/design-system.md` and `src/styles/tokens.css` unless the task is a design-system change.
