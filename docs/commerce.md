# Commerce

How a part is described, found, priced, and bought. The schema is the contract. The product page, the table, the cart, and the order API read the same fields.

## Content schema

Extend `src/content.config.ts`. Every record has every required field. Optional means the control disappears, not that the page invents a value.

| Field | Required | Notes |
| --- | --- | --- |
| `part_number` | yes | Shop id and the URL. Stable. Selectable text |
| `manufacturer` | yes | Printed on the JSON-LD brand. Never `"Generic"` |
| `mpn` | yes | Manufacturer part number. May equal `part_number` |
| `name` | yes | The job sentence. “5 V, 1 A, TO-220 linear regulator.” Not a slogan |
| `category` | yes | One value from the enum below |
| `price` | yes | Integer PKR for quantity 1 |
| `currency` | yes | `PKR` |
| `stock_qty` | yes | Integer. Replaces `in_stock` |
| `restock_on` | no | ISO date. Shown only when `stock_qty` is 0 |
| `package_type` | yes | The package the shop ships |
| `mounting_type` | yes | |
| `voltage` | no | Omit when the part has no meaningful voltage |
| `specs` | yes | Array of `{ label, value, unit? }`, grouped if longer than about 20 rows. The choosing specs come first |
| `datasheet` | no | Absolute URL of a PDF the shop is willing to stand behind. No `href="#"` |
| `image` | no | Photograph of the stocked item. No `placehold.co` |
| `image_note` | no | Required when the picture is representative rather than the stocked lot |
| `in_the_bag` | yes | One sentence. “Loose TO-220 in an antistatic bag.” |
| `limits` | no | The electrical warning a careful seller would say. Example: the HC-SR04 echo pin is 5 V logic |
| `min_qty` | yes | Default 1 |
| `qty_multiple` | yes | Default 1 |
| `breaks` | no | `{ min_qty, unit_price }[]` only when the price function honors them |
| `description` | yes | Specific. Keep the useful sentences already in the JSON |

### Categories

Use one enum. Suggested values, mapped from the current files:

| Part | Category |
| --- | --- |
| LM7805, AMS1117-3.3, LM2596S | Power |
| ESP32-WROOM-32D, ARDUINO-NANO | Boards |
| NE555 | ICs |
| HC-SR04, DS18B20, TCRT5000 | Sensors |
| SRD-05VDC-SL-C | Relays |

NE555 is a timer, not a microcontroller. LM2596S is power, like the other regulators. Rename the pills and the footer links to this enum. A pill with no parts shows an empty state.

## Money

- One module formats and computes money. Suggested home: `src/lib/money.ts`.
- Display is `Rs 1,250` with a grouping separator and tabular figures. No decimals. Do not mix `PKR 1250`, `Rs45`, and `1250`.
- The unit price of a line is the break that matches the quantity, or `price` when there are no breaks.
- Line total is unit price times quantity. Order total is the sum of line totals plus shipping, when shipping is known.
- `POST /api/order` loads the catalog, recomputes, and persists the recomputed numbers. If the client total differs, persist the server total and do not trust the client.
- The decorative 7% and 14% slabs on the product page are removed until `breaks` exists and the cart uses them.

## Stock

- `stock_qty` is the number on the page and the cap in the cart.
- Zero stock hides the add control and shows `restock_on` if it exists. “Out of stock” without a date is allowed only when the shop has no date. Do not invent one.
- Do not show a low-stock scare line (“only 2 left”) unless that integer is `stock_qty`.

## Shipping and payment copy

One module is the source of windows, the cutoff, and the shipping rule. Suggested home: `src/lib/shipping.ts`. The homepage, the product page, the cart, checkout, and `shipping-and-payments.astro` render it.

Until the operator confirms a change, the shipping page is the authority, because it is the page that explains the policy:

- Lahore: one business day.
- Nationwide: 48–72 hours.
- Name the cutoff once, in that module, and use it everywhere. “Daily” and “Sunday closed” must not contradict each other.
- The cart does not say “calculated at checkout” and then show a total with no shipping line. Either show the amount or say that the address chooses the amount and show it before the buyer pays.
- Advance payment stays. The reason stays on the policy page. The review step does not add a fee that was absent on the product page.
- Payment panels list only methods the shop can clear. Bank details come from the environment. The current Meezan account, the HBL mention, and the Raast id `03001234567` are literals. Do not print them as if they were verified.
- Offer the methods the operator actually uses. Do not add a row of wallet logos for wallets the checkout cannot take.

## Search

- Hits `part_number`, `mpn`, `name`, and category.
- An exact `mpn` or `part_number` query returns that part first.
- A miss on an exact part number says the shop does not sell it, and may list a human-written alternative. It does not silently substitute.
- Pagefind indexes the production build. In development, search the loaded catalog so the path works under `astro dev`.
- The query is text, never HTML.
- Autocomplete, if added, shows the part number and the job sentence. It is not required for the first finished pass.

## Catalog behavior

- Desktop table columns, in order: part number, job sentence, the one spec that distinguishes siblings in that category (voltage or package), stock, price.
- Mobile list: the same five facts, stacked.
- Sort by price and by stock. Default sort is the shop’s category order, then part number.
- Applied filters are visible and removable.
- “Track” in the footer does not go to the contact form unless the page says that orders are confirmed on WhatsApp. If there is no order lookup, the link says what it really does, or it goes away. Do not label a contact form “Track.”

## Product page

First screen, in this order:

1. Photograph, or a quiet empty well with the package name. No fake render presented as a photo.
2. Job sentence (`name`).
3. Part number in the `part-number` style, selectable, with the copper rule.
4. Price.
5. Stock count, or the restock date.
6. Shipping line from the shipping module.
7. Add to cart and the quantity control.
8. Datasheet link, when `datasheet` is set.
9. `in_the_bag` and `limits`.

Below that, the spec table: one column of pairs, grouped, zebra rows using `--surface-sunken`. Do not use two columns of specs. People read them as a comparison of two products.

The return rule is a sentence in this block, linking to the policy anchor. It is the same sentence as the policy page.

JSON-LD `Product` uses `manufacturer`, `mpn`, the server price, and `stock_qty`. Availability is `InStock` only when `stock_qty > 0`.

## Cart

- Persistent in `localStorage` is fine for this shop. The line stores `part_number` and quantity. It does not store a trusted price. The displayed price is recomputed from the catalog on every render.
- Opening the cart shows the current lines. Adding a part opens the drawer and moves focus to it.
- Each line has the part number, the job sentence, quantity, line total, and Remove.
- Quantity control: minus, a numeric field that replaces the current value, plus. Pasting and typing are allowed. Values below `min_qty`, above `stock_qty`, or off `qty_multiple` are corrected on blur, with the rule named.
- A plain-text copy of the cart is a single control: one line per part, `PART  qty  Rs price`.
- Escape closes the drawer and returns focus to the cart button. Tab cycles inside the drawer while it is open.

## Checkout

A short guest flow. One column on the phone, with the order summary first. On desktop the summary stays in view.

Fields, and no others, until the operator asks:

| Field | Required | Notes |
| --- | --- | --- |
| Name | yes | |
| Phone | yes | One line: “We use this if the courier cannot find the address.” Normalize to `+92` and 10 digits |
| City or area | yes | This is the destination. Persist it |
| Address | yes | |
| Address line 2 | no | Hidden behind “Add an apartment, floor, or landmark” |
| Payment reference | yes | The transfer id the shop already collects. Label it with the method the buyer actually used |

- Mark required and optional on each field. A banner that says “all fields are required” is not enough.
- Do not ask for a password, an account, or a company name.
- Errors appear after blur or submit, on the field, and they quote the rule. “Enter a Pakistani mobile number, 03XX XXXXXXX.”
- The summary lists parts, quantities, merchandise, shipping, and the total. The buyer pays that total.
- The primary button is “Place order.” The success page says “Order placed” and shows the id the database returned.
- Browser Back does not wipe the form.
- No newsletter modal, no cross-sell, no account pitch on this flow.

## Order record

Persist: id, created time, name, E.164 phone, destination, address, payment reference, lines (`part_number`, quantity, unit price, line total), shipping amount, total, status.

- Success is returned only after the insert.
- The success route loads the row. Unknown ids render a not-found page with a link back to the catalog and the contact path.
- The confirmation may repeat the WhatsApp link with the real number and the order id in the prefilled text.
- Do not claim an email was sent unless a message was sent.

## Similar parts

A field `related: string[]` of part numbers may be added later. A person maintains it. Do not generate substitutes from category alone and present them as equivalents. An LM7805 and an AMS1117 are both regulators and they are not substitutes.
