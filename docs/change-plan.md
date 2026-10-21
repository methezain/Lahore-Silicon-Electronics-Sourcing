# Change plan

Work top to bottom. Do the earliest unfinished item your task touches. Tick an item only when [qa.md](qa.md) passes for it. Audit date: 20 October 2026, from source and screenshots of the running site.

## Where the site stands

Already right: server-side pricing (`quoteOrder`), integer PKR, a stock-aware quantity rule, E.164 phone normalization, placeholder-proof shop details, a schema that rejects "Generic" brands and fake image hosts, part-number URLs, prerendered product pages, a persistent cart.

What a buyer sees today (`before` screenshots taken 20 Oct 2026): a plain grey page with a full-width search bar, a copper "Cart" button, an unstyled table, an under-designed cart drawer, and a footer whose link columns look empty. It reads as a prototype, not a premium store.

## Phase 0: broken things (do first, small)

- [x] **Footer links are invisible.** `.site-footer a { color: var(--ink) }` later in `global.css` overrides the white link color, so the Catalog and Desk columns render black on black. Fixed 20 Oct 2026.
- [x] **Cart drawer layout.** "Remove" collides with the quantity stepper; lines have no thumbnail; the footer stacks plain paragraphs. Fixed 20 Oct 2026.
- [x] **Catalog table alignment.** Stock and Price headers are left-aligned over right-aligned numbers; row text sits on the thumbnail's bottom edge (baseline alignment); the hero lede touches the headline. Fixed 20 Oct 2026.
- [x] **Duplicate agent instructions.** `AGENTS.md` and `CLAUDE.md` each repeated the Storefront block. Fixed 20 Oct 2026.
- [x] **Delete dead code** listed in [pages.md](pages.md#dead-code-to-delete). Fixed 20 Oct 2026.

## Phase 1: foundation

- [x] Create `src/styles/tokens.css` from [design-system.md](design-system.md) with `--color-*: initial`. Delete both old token sets, the copper `--mark`, unused keyframes, and the `.card:hover` lift. Done 20 Oct 2026.
- [x] Fonts: install Mona Sans (with `wdth`) and Geist Mono through the Astro Fonts API; remove IBM Plex packages and files. Done 20 Oct 2026.
- [x] Add the inline SVG icon sprite and the plug logo component. Done 20 Oct 2026.
- [x] Add stylelint, the CI greps, `astro check`, Vitest and Playwright skeletons ([engineering.md](engineering.md#testing)). Done 20 Oct 2026.
- [x] Move part photos to `src/assets/parts/` and render through `astro:assets`. Done 20 Oct 2026.

## Phase 2: shell and components

- [x] Floating pill header with segmented nav, search trigger and cart button. Done 20 Oct 2026.
- [x] Footer as a navy frame with readable links. Done 20 Oct 2026.
- [x] Buttons, inputs, stepper, filter pills, stock indicator, product card with the socket tab. Done 20 Oct 2026.
- [x] Catalog table, key-figure tiles, cart sheet, process band: each as one component, matching the specimen. Done 20 Oct 2026.
- [x] Search dialog with exact part-number ranking, unit-aware matching and a useful zero-result state. Done 20 Oct 2026.
- [x] `src/lib/clock.ts`: dispatch countdown from `Asia/Karachi` time, cutoff, Sundays and listed holidays. Done 21 Oct 2026.

## Phase 3: pages

- [x] Home per [pages.md](pages.md#home-): navy hero with docked search and live part deck, bento, catalog, process band. Done 21 Oct 2026.
- [x] Product page: gallery panel with tab, sticky buy panel, ETA box, key figures, spec table, pinout, companions, FAQ, mobile sticky add bar, view-transition image. Done 21 Oct 2026. Pinout, companions, and FAQ stay off the page until those catalog fields exist (Phase 4). Key figures use the first four specs until `key_specs` exists.
- [ ] Cart sheet: drag to close on touch. The Added line, quantity clamping, and the removed-part notice shipped with the sheet on 20 Oct 2026.
- [x] Checkout: three step panels, six fields, sticky summary (collapsible on mobile), payment panel without inline styles, total on the button. Done 21 Oct 2026. Payment account lines come from `PUBLIC_*` env vars. The order POST is unchanged.
- [x] Order received: receipt card and status timeline. Done 21 Oct 2026. The page shows the id, date, lines, total, and city. The buyer's phone and street address stay off the URL. Email is not promised.
- [x] Shipping and payment, About, Contact, 404 and 500 pages in the new system. Done 21 Oct 2026. Policy text comes from `src/lib/`. No street address, map, counter photo, pickup choice, or invented delivery rates. Defect window is 24 hours, and the buyer messages on WhatsApp first.

## Phase 4: data completeness

- [x] Add the new catalog fields ([commerce.md](commerce.md#fields-to-add)) to the schema and fill them for all 10 parts: `summary`, `key_specs`, `logic_level`, `pinout`, `companions`, `not_included`, `faq`, `images`. Done 21 Oct 2026. `low_stock_at` defaults to 10. `featured` was already in the schema. `shelf_qty` stays unset (see [decisions.md](decisions.md)).
- [x] Normalize spec labels across parts. Done 21 Oct 2026. One label per fact (`Supply voltage`, `Temperature range`, `Sensing distance`, and the rest listed in `tests/unit/catalog-fields.test.ts`).
- [ ] Real datasheet links, real photos and the street address as the owner supplies them ([decisions.md](decisions.md)). Datasheet links added 21 Oct 2026 where a manufacturer https PDF matches the part. Studio photos stay. No street address.

## Phase 5: order integrity

- [x] Turnstile on checkout, verified server-side. Done 21 Oct 2026. The widget is only on checkout. The order route calls siteverify with `cf-connecting-ip` and accepts the token only when `success` is true, the action is `checkout`, and the hostname is on the allowlist. No production sitekey or secret was supplied (decisions row 16), so a deploy without them refuses the order.
- [x] Rate limiting on order submission. Done 21 Oct 2026. Binding `ORDER_LIMIT`: 5 requests per 60 seconds, keyed by `POST /_actions/placeOrder` plus the checkout session, or the connecting IP when that cookie is absent.
- [x] Idempotency key with a `UNIQUE` column. Done 21 Oct 2026. `db/migrations/0003_idempotency.sql` adds `idempotency_key` and a unique index. A second submit returns the first order id. Applied on the local D1 database.
- [x] Live stock in D1 with guarded decrement inside the order batch. Done 21 Oct 2026. `db/migrations/0004_stock.sql` seeds `stock` from the catalog counts. The order batch decrements each line under `CHECK (qty >= 0)`, then inserts the order. An oversell or a missing row fails the batch and rolls it back, including an earlier line. Proved against local D1. Pages still show the catalog count.
- [x] Checkout as an Astro Action with `accept: 'form'`. Done 21 Oct 2026. `src/actions/index.ts` `placeOrder`. The form posts without the script; the script calls the action and maps Zod errors with `isInputError()`. `security.checkOrigin` stays on.
- [x] Security headers and CSP. Done 21 Oct 2026. Middleware sets HSTS, `nosniff`, `strict-origin-when-cross-origin`, a minimal Permissions-Policy, and merges `frame-ancestors 'none'` into the CSP. Astro `security.csp` hashes scripts and styles. Checkout also allows `https://challenges.cloudflare.com`. Static files get the same headers from `public/_headers`.

## Phase 6: proof

- [ ] E2E, visual and axe suites green at 390 and 1440.
- [ ] Lighthouse CI meeting the budgets.
- [ ] Field Web Vitals reporting.
- [ ] A final pass against [north-star.md](north-star.md#refuse): nothing on the refuse list shipped.

## Phase 7: after launch (only with a decision)

COD for Lahore, a payment gateway with Raast QR, order confirmation by WhatsApp or email, delivery rate table in the total, a small "recently viewed" strip, and dated buyer reviews once real orders exist.
