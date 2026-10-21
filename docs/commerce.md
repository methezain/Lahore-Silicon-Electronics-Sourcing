# Commerce

Rules for catalog data, search, cart, checkout, payment, delivery and orders. Each rule names the one module that owns it.

## Catalog data

Source: `src/content/components/*.json`, schema in `src/content.config.ts`. One file per part. The schema rejects "Generic" manufacturers, placeholder images and datasheet links that are not absolute https URLs. Keep those guards.

### Required fields (already in the schema)

`part_number`, `manufacturer`, `mpn`, `name` (the job sentence), `category`, `price` (integer PKR), `currency`, `stock_qty`, `package_type`, `mounting_type`, `specs[]`, `in_the_bag`, `description`, `min_qty`, `qty_multiple`.

### Fields to add

| Field | Type | Why |
| --- | --- | --- |
| `summary` | string, ≤ 160 chars | The one plain sentence under the h1 for the non-expert ("Turns 7–35 V into a steady 5 V…") |
| `key_specs` | array of 2–4 spec labels | Which specs become the "Key figures" tiles |
| `logic_level` | `"3.3 V"`, `"5 V"`, `"3.3 V and 5 V"`, optional | Makers fail most often on logic level |
| `pinout` | array of `{ pin, label, note? }`, optional | Required for modules and boards |
| `companions` | array of part numbers, optional | "You will also need", hand-picked from parts the shop sells |
| `not_included` | string, optional | "Headers not soldered", "No USB cable" |
| `faq` | array of `{ q, a }`, optional | 3–6 real questions per part |
| `low_stock_at` | integer, optional, default 10 | Threshold for the `low` status |
| `shelf_qty` | integer, optional | Normal full quantity, for the stock meter |
| `images` | array of `{ src, alt, note? }` | Replaces the single `image`; first image is the main one |
| `featured` | boolean | Front hero card and featured category |

Spec labels must be identical across parts ("Output voltage", never "Vout" on one and "Output V" on another) so comparison and search work.

### Categories

`src/lib/categories.ts` owns the list: Power, Boards, ICs, Sensors, Relays. A category exists only if at least one part uses it. Category counts on pills and tiles are computed.

## Stock

- `stock_qty` is the count on the shelf. The add control's maximum is `stock_qty`, and the cart clamps to it on load.
- Status: `stock_qty > low_stock_at` is `ok`; `1…low_stock_at` is `low`; `0` is `out`.
- Out of stock with `restock_on`: "Out of stock, back around [date]". Without: "Out of stock". Never "Coming soon".
- **Phase 2 (required before paid traffic):** move live stock out of JSON into a D1 `stock` table so orders decrement it. JSON stays the source for descriptive data. See [engineering.md](engineering.md#orders-stock-and-d1).

## Price

Owner: `src/lib/money.ts`. It is the only place a price is computed or formatted.

- Integer PKR. `formatPkr(1250)` returns `Rs 1,250` (thousand grouping, no decimals).
- `unitPrice()` applies quantity breaks; `priceCart()` prices a cart from the catalog; `quoteOrder()` recomputes on the server and rejects a mismatched client total.
- Quantity breaks appear on the product page only when the part has `breaks`, and the cart and server honor them (they do today).
- No strike-through prices, "was" prices, or percentage-off badges.

## Search

Owner: `src/lib/catalog-search.ts`.

1. Normalize the query and every part number and MPN: lowercase, strip spaces, hyphens, dots and slashes.
2. Exact normalized match on `part_number` or `mpn` ranks first.
3. Then prefix matches on part numbers, then word matches on `name`, `summary`, `category` and spec values.
4. Units: treat `5v`, `5 v`, `5V` the same; `k` as thousand for resistance (`10k`); `u` as `µ`.
5. Zero results: say the shop does not stock it and offer the WhatsApp sourcing request.

Build-time Pagefind may remain for prose pages, but part lookup must not depend on it.

## Cart

Owner: `src/store/cartStore.ts` (nanostores, persisted in `localStorage`).

- Stores only `{ part_number, quantity }`. Names and prices are always read from the catalog, so a stale price can never reach checkout.
- On load, lines for parts no longer sold are flagged ("The shop no longer sells LM317.") and excluded from the total.
- Quantity changes through +/− steppers and typed input, corrected by `src/lib/quantity.ts` to `min_qty`, `qty_multiple` and `stock_qty`, with a message when corrected.
- Adding opens the cart sheet with an "Added [part] to cart" line. The header count updates.

## Checkout

Owner: `src/pages/checkout.astro` (moving to an Astro Action, see [engineering.md](engineering.md#checkout-as-an-action)).

- Guest only. Fields: name, phone, city or area, address, optional address line 2, payment method, payment reference.
- Validate on blur and on submit. Errors sit under the field, keep the value, and focus moves to the first invalid field.
- The "Place order" button shows the total and is disabled only while submitting or when the cart is empty or invalid.
- The order is idempotent: the client sends an idempotency key; a double click or retry returns the same order.
- Turnstile protects submission (verified on the server).

## Payment

Owner: `src/lib/shop.ts` (reads `PUBLIC_*` environment variables; known placeholders are treated as unset).

Current model: advance payment by Raast or bank transfer, then the buyer pastes the transaction reference. If no method is configured, the payment panel is omitted and checkout says payment details are sent on WhatsApp.

Pakistan context the owner must decide on (logged in [decisions.md](decisions.md)):

- About 60–70% of Pakistani online orders are cash on delivery, and stores that demand prepayment with no COD option are a known scam pattern. COD returns run around 24% versus about 1% for prepaid.
- Raast QR is now mandatory for banks to offer merchants and costs about 0.6% through gateways such as PayFast; wallets (JazzCash, Easypaisa) about 2.2%; local cards about 2.9%. Stripe and PayPal are not available to Pakistani merchants.
- Recommended: keep prepaid (Raast, bank, wallet) as the default with a visible reason ("Parts are bought for your order"), and add COD for Lahore or for orders above a threshold with WhatsApp confirmation before dispatch, if the owner accepts the return risk.

Display rules for whatever is chosen:

- Each method shows its account lines with a Copy button that confirms "Copied".
- The amount to pay is the server total, shown again inside the payment panel.
- Payment instructions never appear before the total is final.

## Delivery

Owner: `src/lib/shipping.ts`. Pages render its strings; they never retype windows.

- Cutoff: 3:00 PM PKT, Monday to Saturday. Paid before cutoff ships the same day.
- Lahore: next business day, by Bykea or local courier. Nationwide: 48–72 hours by Leopards, TCS or Trax. Remote areas and Eid periods may add 1–2 days; say so on the shipping page.
- Delivery cost: until the owner supplies a rate table, the rule "Delivery cost is confirmed from your city before you pay" is shown on the product page, cart and checkout. When rates exist, replace it with a computed line in the cart and checkout totals.
- The ETA box on the product page and the hero status chip compute "order within X h Y m" from the real clock in `Asia/Karachi`. Sundays and public holidays the owner lists are skipped.

## Returns and defects

- "Report a defect within 24 hours of receiving the parcel" (owner: `returnRule` in `src/lib/shipping.ts`). Message on WhatsApp first (`defectNotice`). There is no cash on delivery.
- The full return and refund policy lives at `/shipping-and-payments#returns` and is linked from the product page, the cart and checkout before payment (Punjab Consumer Protection Act).

## Orders

Owner: `src/pages/api/order.ts` today, `src/actions/` later; table `Orders` in D1 (`db/schema.sql`).

- IDs are `LHR-` plus 16 random hex characters. The success page shows only ID, lines and total.
- Status values: `Pending` (saved, awaiting payment check), `Paid`, `Dispatched`, `Delivered`, `Cancelled`. Only the owner changes status.
- Each order row stores: lines as priced by the server, total, name, E.164 phone, destination city, address, payment method, payment reference, idempotency key, created time.
- Receipts (on screen and, later, by email or WhatsApp) show date, items, quantity, unit price, total, and the seller's name and address, as Punjab consumer law requires.

## Out of scope until a decision says otherwise

Accounts, reviews, wish lists, coupons, loyalty, BOM upload, parametric filter sidebars, multi-currency, marketplace sellers, live chat widgets.
