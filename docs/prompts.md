# Agent prompts, in build order

One prompt per new agent session. Each is sized to fit one context window. Run them in order; do not start the next until the previous one is merged and its items are ticked in [change-plan.md](change-plan.md).

The roadmap is [change-plan.md](change-plan.md). This file only turns its phases into session-sized prompts.

## How every session starts

The agent reads `AGENTS.md` automatically. That file sends it to `docs/README.md`, which routes it to the one or two manuals it needs. Each prompt below also names those files, so the agent does not read the whole folder.

Paste this line at the top of every prompt:

> Read `docs/README.md`, `docs/agent-rules.md`, and `docs/qa.md` first. Then read only the docs this task names. Work only on this task. When done, tick the matching items in `docs/change-plan.md`, and end with the report format from `docs/qa.md`.

## Phase 0: broken things

**P1. Fix visible bugs and delete dead code**
> Do Phase 0 of `docs/change-plan.md`: fix the invisible footer links, the cart drawer layout (Remove colliding with the stepper), the catalog table alignment, and delete the dead code listed in `docs/pages.md#dead-code-to-delete`. Do not restyle anything else yet. Verify at 390px and 1440px with screenshots.

## Phase 1: foundation

**P2. Design tokens**
> Do the tokens item of Phase 1. Read `docs/design-system.md` sections 1–6 and `docs/engineering.md#design-tokens-in-code`. Create `src/styles/tokens.css` (Tailwind v4 `@theme`, OKLCH, `--color-*: initial`), remove both old token sets, the copper mark and unused keyframes from `global.css`. Compare against `docs/design/specimen.html`. Pages may look broken in places after this; list every place that still uses an old token.

**P3. Fonts, icons, logo**
> Do the fonts and icon items of Phase 1. Read `docs/design-system.md` sections 2 and 8 and `docs/engineering.md#fonts`. Install Mona Sans (with the `wdth` axis — verify it) and Geist Mono through the Astro Fonts API, remove IBM Plex, add the inline SVG sprite and a plug logo component. Verify that `0` and `O` are distinct in part numbers with a zoomed screenshot.

**P4. Tooling and test skeleton**
> Do the tooling item of Phase 1. Read `docs/engineering.md` sections Design tokens in code (enforcement), Testing, and Developer experience. Add stylelint (`color-no-hex` except tokens.css), a CI-style check script for Tailwind arbitrary values and visual `style=` attributes, `astro check`, Vitest with tests for `money`, `quantity`, `phone`, and a Playwright config with one smoke test at 390 and 1440. Add the npm scripts. Make everything pass.

**P5. Images through astro:assets**
> Do the images item of Phase 1. Read `docs/engineering.md#images` and `docs/design-system.md#7-imagery`. Move part photos to `src/assets/parts/`, render them with `<Image>`/`<Picture>` with explicit sizes, and keep the schema guards. Check no layout shift on the product page.

## Phase 2: shell and components

**P6. Header and footer**
> Do the header and footer items of Phase 2. Read `docs/design-system.md` section 9 (Header, Footer) and specimen sections `s-header`, `s-footer`. Build the floating pill header and the navy footer frame. Match `docs/design/screens/*-first-screen.png` and `*-footer.png`.

**P7. Core components**
> Do the components item of Phase 2, part 1: buttons, inputs, stepper, filter pills, stock indicator, product card with the socket tab. Read `docs/design-system.md` section 4 (signature) and section 9. One component file each. Add a dev-only `/dev/components` page that renders all states, and screenshot it.

**P8. Catalog table, key figures, cart sheet, process band**
> Do the components item of Phase 2, part 2: catalog table (cards below 900px), key-figure tiles, cart sheet, process band. Read `docs/design-system.md` section 9 and `docs/commerce.md#cart`. Add them to `/dev/components`. Test the cart sheet keyboard path (Tab trap, Escape, focus return).

**P9. Search dialog**
> Do the search item of Phase 2. Read `docs/commerce.md#search`, `docs/pages.md#search-dialog-all-pages`, and `docs/copy.md`. Rewrite `src/lib/catalog-search.ts` with exact part-number ranking and unit-aware matching, with Vitest cases (`lm 7805`, `LM-7805`, `5v`, `ams1117 3.3`, a miss). Build the dialog island with `/` shortcut and the zero-result state.

**P10. Dispatch clock**
> Do the clock item of Phase 2. Read `docs/commerce.md#delivery` and `docs/copy.md#microcopy`. Create `src/lib/clock.ts` computing the status chip and ETA text from `Asia/Karachi` time, cutoff, Sundays and a holiday list. Unit-test before cutoff, after cutoff, Saturday evening and Sunday.

## Phase 3: pages

**P11. Home page**
> Build the home page per `docs/pages.md#home-`. Read `docs/design-system.md` section 9 (bento, product card) and the specimen `s-hero`, `s-bento`, `s-catalog`, `s-band`. Desktop hero with docked search notch and live part deck; mobile without the deck. Category counts computed. Compare with `docs/design/screens/`.

**P12. Product page**
> Build the product page per `docs/pages.md#product-productpart_number`. Read `docs/design-system.md` (Buy panel, Key figures) and `docs/commerce.md` (Stock, Price). Gallery with tab, sticky buy panel, ETA box, key figures, spec table, mobile sticky add bar, view transition from the catalog thumbnail. Test an out-of-stock part by temporarily setting stock to 0 in a test fixture.

**P13. Checkout**
> Rebuild checkout per `docs/pages.md#checkout-checkout` and `docs/commerce.md` (Checkout, Payment). Three step panels, six fields, sticky summary (collapsible on mobile), payment panel with no inline styles, total on the button, error copy from `docs/copy.md#errors`. Keep the current API contract. Add a Playwright test from add-to-cart to the success page against local D1.

**P14. Order received and secondary pages**
> Build order received, shipping and payment, about, contact, 404 and 500 pages per `docs/pages.md`. Policy text must come from `src/lib/` modules, not be retyped. Leave out anything listed as open in `docs/decisions.md`.

## Phase 4: data

**P15. Catalog fields**
> Do Phase 4. Read `docs/commerce.md#catalog-data` and `docs/copy.md`. Add the new fields to the schema and fill them for all parts with facts from the part data and datasheets you can verify. Normalize spec labels. Where a fact is unknown, leave the optional field out and list it in `docs/decisions.md`.

## Phase 5: order integrity

**P16. Turnstile, rate limit, idempotency**
> Do the first three items of Phase 5. Read `docs/engineering.md#orders-stock-and-d1` and `#security`. Add Turnstile (server-verified), the rate-limit binding and an idempotency key with a forward-only migration. Test a double submit.

**P17. Live stock and checkout Action**
> Do the stock, Action and headers items of Phase 5. Move live stock to a D1 table with a guarded decrement in the order batch, prove rollback on oversell with a test against local D1, move the order endpoint to an Astro Action with `accept: 'form'`, and add security headers and CSP.

## Phase 6: proof

**P18. Full audit**
> Do Phase 6. Run the full E2E, visual and axe suites at 390 and 1440, add Lighthouse CI with the budgets in `docs/engineering.md#performance-budgets`, add field Web Vitals reporting, and check every item of `docs/north-star.md#refuse`. Fix what fails, or list it with a reason.

## Tips

- Start a fresh chat for every prompt. Long chats lose the rules.
- If an agent wants to change a token or the design system, stop it and decide yourself; then update `docs/design-system.md` and the specimen together.
- Answer the questions in `docs/decisions.md` early; P13, P14 and P15 depend on them.
