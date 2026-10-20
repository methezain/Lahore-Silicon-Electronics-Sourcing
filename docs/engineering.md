# Engineering

How the shop is built, how fast it has to be, and what “accessible” means on this catalog. Stack facts below match `package.json` as of 19 October 2026.

## Stack

- Astro 7, server output, `@astrojs/cloudflare`.
- Preact islands for the cart, the quantity control, and mobile navigation. New interaction uses an island. New documents use `.astro`.
- Tailwind CSS v4, configured through `@theme` in `src/styles/global.css`. Tokens from [design-system.md](design-system.md) live there. Utilities may apply those tokens. Arbitrary values (`text-[9px]`, `p-[13px]`, hex in a class) are not allowed in new code.
- Content collection `components`, JSON files in `src/content/components/`, schema in `src/content.config.ts`.
- Cart state: nanostores, persisted. The store holds ids and quantities. Prices are derived.
- Search: Pagefind at build time (`astro build && pagefind --site dist`), with a dev fallback defined in [commerce.md](commerce.md).
- Orders: `POST /api/order`, D1, Zod. Zod parses the buyer’s text. Zod does not trust the buyer’s money.

## Modules

Put shared rules in one place and import them. Do not copy a string into a second page.

| Concern | Single home | Consumers |
| --- | --- | --- |
| Price and PKR formatting | `src/lib/money.ts` | Product page, cart, checkout, order API |
| Dispatch windows, cutoff, shipping amount | `src/lib/shipping.ts` | Home, product, cart, checkout, shipping page |
| Stock cap and catalog lookup by part number | `src/lib/catalog.ts` | Pages and the order API |
| Buyer-facing sentences that must match | next to the module that proves them | See [copy.md](copy.md) |

A page may format a module’s output. It may not restate a different delivery window.

## Order API

- Validate the body with Zod. Unknown keys do not have to be stored. `destination` is either in the schema or it is not on the form.
- Recompute lines from the catalog inside the handler. Persist those numbers.
- Verify Turnstile with the siteverify API when the widget is real. Until the widget exists, do not pretend: remove the dummy token.
- Insert into D1. If the binding is missing, return a 500 and log it. Do not return a success id.
- Generate an id that will not collide. A random four-digit suffix is not enough. Use a longer random id or a database sequence, still prefixed `LHR-` so the shop’s existing language survives.
- Rate-limit and reject oversized carts. This catalog’s largest honest cart is small. Cap line quantity at `stock_qty`.
- Do not log the full address and phone in a client-visible response.

## Schema migrations

`db/schema.sql` must not drop the orders table as its first statement. Write a forward migration that creates the table if it is missing and adds columns without destroying rows. Document the command in the README when the command exists.

## Security and trust boundaries

- The catalog JSON is public. Secrets are not. Bank account numbers, if they are real, come from the Cloudflare environment and are rendered on the server. They are not committed as a second fake.
- Buyer HTML is escaped. Search, address, and the order id in a heading are text nodes.
- The success page does not treat the URL as proof of purchase. The database row is the proof.
- Do not add a client-side price override “for testing” and leave it in the handler.

## Accessibility

Target WCAG 2.2 AA on the catalog, the product page, the drawer, and checkout. The failures that matter here, because this UI has a sticky bar, a drawer, steppers, and a form:

| Criterion | What it requires on this shop |
| --- | --- |
| 1.4.3 Contrast | 4.5:1 for text. The pairs in the design system already clear this. Do not introduce a new gray |
| 1.4.11 Non-text contrast | 3:1 for input borders and for the focus ring. Use `--line` and the ink outline |
| 1.4.1 Use of color | Stock, errors, and filters have a word or an icon |
| 1.4.4 Resize text | At 200% zoom the price stacks. No horizontal scroll on the checkout form |
| 2.4.7 Focus visible | The 2px ink outline stays |
| 2.4.11 Focus not obscured | The sticky bar and the open drawer do not cover the focused control |
| 2.5.8 Target size | At least 24px, with 44px on the primary button and the stepper |
| 3.3.1, 3.3.2 Errors and labels | Visible labels. Errors identify the field and the rule |
| 3.3.7 Redundant entry | A value already typed in this checkout is not demanded again |
| 3.3.8 Accessible authentication | There is no password. If one is ever added, paste and password managers must work |
| 3.2.6 Consistent help | The contact link stays in the same footer position |
| 4.1.3 Status messages | “Added” is announced. Focus does not jump to the drawer unless the buyer opened it |
| 2.1.2, drawer pattern | Focus moves into the drawer, Tab is trapped, Escape closes, focus returns |

Also:

- One `h1` per page. The product `h1` is the job sentence. The part number is text in that block, not a second `h1`.
- Heading levels do not skip.
- Images have alt that names the part and the package. Decorative rules are empty alt or CSS.
- The page has a skip link to the catalog or the main content.
- `lang="en"` stays on the document until a real Urdu locale exists. Do not add a language toggle as decoration.
- Do not use ARIA to recreate a native control. Use `button`, `a`, `label`, and `input`. Add ARIA when the drawer and the live region need it.

## Performance

Budgets, at the 75th percentile of real visits, mobile and desktop separately:

| Metric | Good |
| --- | --- |
| LCP | ≤ 2.5 s |
| INP | ≤ 200 ms |
| CLS | ≤ 0.1 |

These are the pass lines from current Web Vitals guidance. They are not a revenue forecast.

How this catalog stays inside them:

- The LCP image on a product page has width and height, a modern format, a `srcset` matched to the 1:1 well, and `fetchpriority="high"`. It is not lazy-loaded. Other images may be.
- Fonts are self-hosted, subset to the weights in the design system, and preloaded for the body weight only.
- No render-blocking Google Fonts stylesheet.
- Islands are small. Do not hydrate the catalog table if it is static HTML with links.
- Do not animate layout properties.
- Third-party scripts: Turnstile, when it is real, and nothing else on the critical path. No chat widget, no tag manager, no extra font CDN.

## Developer experience

- `npm run dev` uses `astro dev`. The project rules say to start it in the background with `astro dev --background` and to stop it with `astro dev stop`.
- Typecheck with `astro check` when a schema, an API, or a content field changes.
- A content file that fails the Zod schema fails the build. That is the point of the required fields.
- README is still the Astro starter. When the order flow becomes real, replace the starter text with how to run the app, where catalog JSON lives, and how D1 is migrated. Do not leave two sources of setup truth.
- `AGENTS.md` points here. When a rule in this folder changes, do not also paste the rule into a third file. Update the one file that owns it.
- Comments explain a constraint a reader cannot see, such as why the price is recomputed. They do not narrate the JSX.

## Verification

Before calling a buyer-facing change done:

1. Desktop and a 390px viewport.
2. The path in [change-plan.md](change-plan.md)’s “Done” section that your change touches.
3. Keyboard only, for any new control.
4. An empty cart, an empty search, and a category with no parts, if those states exist on the page you touched.
5. A forced error: a bad phone, a quantity above stock, an unknown order id.

Record what you ran and what you could not run.
