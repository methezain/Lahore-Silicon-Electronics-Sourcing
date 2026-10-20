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
- [ ] `src/lib/clock.ts`: dispatch countdown from `Asia/Karachi` time, cutoff, Sundays and listed holidays.

## Phase 3: pages

- [ ] Home per [pages.md](pages.md#home-): navy hero with docked search and live part deck, bento, catalog, process band.
- [ ] Product page: gallery panel with tab, sticky buy panel, ETA box, key figures, spec table, pinout, companions, FAQ, mobile sticky add bar, view-transition image.
- [ ] Cart sheet: drag to close on touch. The Added line, quantity clamping, and the removed-part notice shipped with the sheet on 20 Oct 2026.
- [ ] Checkout: three step panels, six fields, sticky summary (collapsible on mobile), payment panel without inline styles, total on the button.
- [ ] Order received: receipt card and status timeline.
- [ ] Shipping and payment, About, Contact, 404 and 500 pages in the new system.

## Phase 4: data completeness

- [ ] Add the new catalog fields ([commerce.md](commerce.md#fields-to-add)) to the schema and fill them for all 10 parts: `summary`, `key_specs`, `logic_level`, `pinout`, `companions`, `not_included`, `faq`, `images`.
- [ ] Normalize spec labels across parts.
- [ ] Real datasheet links, real photos and the street address as the owner supplies them ([decisions.md](decisions.md)).

## Phase 5: order integrity

- [ ] Turnstile on checkout, verified server-side.
- [ ] Rate limiting on order submission.
- [ ] Idempotency key with a `UNIQUE` column.
- [ ] Live stock in D1 with guarded decrement inside the order batch.
- [ ] Checkout as an Astro Action with `accept: 'form'`.
- [ ] Security headers and CSP.

## Phase 6: proof

- [ ] E2E, visual and axe suites green at 390 and 1440.
- [ ] Lighthouse CI meeting the budgets.
- [ ] Field Web Vitals reporting.
- [ ] A final pass against [north-star.md](north-star.md#refuse): nothing on the refuse list shipped.

## Phase 7: after launch (only with a decision)

COD for Lahore, a payment gateway with Raast QR, order confirmation by WhatsApp or email, delivery rate table in the total, a small "recently viewed" strip, and dated buyer reviews once real orders exist.
