# Change plan

Work in this order. A later item that ships while an earlier item is still false makes a calmer version of the same distrust. Visual polish is item 9.

The audit below is from the source as read on 19 October 2026. Re-read the file before editing it. Line numbers drift.

## 1. Remove claims the data cannot prove

| Claim in the repo | Where | Replacement |
| --- | --- | --- |
| `500+` components sourced | `src/pages/about.astro` | The real count of published parts, or delete the statistic |
| Every record `in_stock: true` | `src/content/components/*.json` | A numeric `stock_qty`. See [commerce.md](commerce.md) |
| `100%` inspected, `2hrs`, `24h` as bare stats | `src/pages/about.astro`, and the homepage and layout meta descriptions | A sentence the shipping page can still support, or nothing |
| Pulsing “open” dot that ignores the cutoff | banner component | Hours as text. Open state comes from the clock versus the cutoff, or the dot goes away |
| Datasheet `href="#"` | `src/pages/product/[part_number].astro` | A real PDF URL, or no datasheet control |
| JSON-LD brand `"Generic"` | product page | The manufacturer field, once it exists |
| `placehold.co` images | `esp32.json`, `lm2596.json` | No image, until a photograph of the stocked part exists. The UI already treats these URLs as missing |
| Raast, Meezan, HBL, and `+92 300 0000000` literals | banner, footer, contact, checkout, shipping, success | The operator’s real details from the environment. If they are not supplied, omit the panel |
| WhatsApp `923000000000` | order success and contact | The same real number, or no link |
| NE555 filed under Microcontrollers | `ne555.json` | A timer / IC category that exists in the filter enum |
| LM2596 category `Power Modules` | `lm2596.json` | A category the filter pills actually match. Today the pills and the hero counts do not include this string |

## 2. Make the server the price

`src/pages/api/order.ts` stores the items and the total the browser sends. The product page draws quantity slabs (about 7% and 14% off) and then adds the one-piece price, so the slabs cannot change the cart.

- One function prices a line. The product page, the cart, and `POST /api/order` all call it.
- The API recomputes every line from the catalog and rejects a mismatched client total.
- Quantity breaks do not appear until that function honors them.
- Prices are integer PKR.

## 3. One phone rule, one destination, one shipping clock

- Checkout shows `+92` and asks for 10 digits. The API requires 11 digits. Those cannot both be the contract. Normalize `03XXXXXXXXX` and `3XXXXXXXXX` to E.164 `+92` plus 10 digits, and validate that.
- `destination` is collected and then dropped. Persist it, or stop asking.
- Lahore versus nationwide windows disagree across the homepage, checkout, the shipping page, and the cart. Write them once, in one module, and render that module everywhere. See [commerce.md](commerce.md).
- The checkout total is the sum of item prices. Shipping is either a line in that total or an explicit “calculated with the address, shown before payment” state. It is never a surprise on the review step.

## 4. An order is a row, not a random id

- `turnstile_token: 'dummy_token'` is compared to the same literal in the API. Replace it with a real Turnstile siteverify, or remove the field. Do not leave a check that any client can satisfy by typing the string.
- Return success only after D1 inserts the order. A missing binding is an error, not a 200.
- The id is unique. `LHR-` plus a random integer from 1000 to 9999 will collide.
- `src/pages/order-success/[id].astro` loads that id from D1. An unknown id is a not-found page, not a receipt.
- `db/schema.sql` starts with `DROP TABLE IF EXISTS Orders`. That is not a migration a person can run twice. Replace it with a forward-only migration.
- Email is a console log labeled as a Resend stub. Either send the mail or do not mention a receipt email in the UI.

## 5. Extend the content schema before restyling cards

The collection in `src/content.config.ts` has part number, name, category, voltage, package, price, mounting, a boolean `in_stock`, and optional image and description. It cannot fill a serious product page.

Add the fields in [commerce.md](commerce.md) and fill them for every record before changing card markup. Missing attributes on some rows are how comparison breaks.

## 6. Product page, first screen

Job sentence, part number as selectable text, price, stock number, shipping assumption, return rule, datasheet, and one in-scale image or an honest representative line. Specs in HTML beside the PDF. Layout is in [design-system.md](design-system.md).

## 7. Catalog that filters, sorts, and searches

- Desktop: a table. Sort by price and by stock.
- Mobile: a list of the same facts. Not a shrunken table, and not a different set of facts.
- Category pills filter both views. A pill that matches nothing shows an empty state that names the category.
- Footer category links go to the filtered catalog, not all to `/#catalog`.
- Search works from a narrow viewport. Pagefind stays the production index. In `astro dev`, where the index is absent, fall back to the in-memory catalog so the path is testable.
- Exact manufacturer part number and shop part number always hit. A miss means the shop does not sell that part.
- The search script must not inject the raw query into `innerHTML`.

## 8. Checkout, cart, and the drawer

- Guest checkout is the path. There is no account wall.
- Required and optional are both marked. Phone is explained in one line or it is optional.
- Errors name the broken rule, sit on the field, and keep the typed value.
- The review step introduces no new fee.
- Quantity is minus, a field that replaces the current number, and plus. Remove is a separate control. Quantity cannot exceed `stock_qty`.
- The cart drawer traps focus, closes on Escape, and returns focus to the cart button. It does not unmount in a way that drops keyboard users.
- Contact stays in the same footer position on the catalog, the cart, and checkout.

## 9. One visual layer

Only after items 1–8 are true in the running app.

- Pages use the tokens and the named type styles in [design-system.md](design-system.md).
- Delete the unused classes in `src/styles/global.css` or start using them. Today `.btn-primary`, `.input-field`, `.card`, and `.spec-row` are defined and the pages do not use them.
- Remove inline hex, `text-[9px]`, `font-size:10px`, and `0.625rem` informational text.
- Remove the second Google Fonts request. Inter and JetBrains Mono leave with that request.
- Replace the fixed notice plus navbar (`padding-top: 104px`, navbar `top: 32px`) with the single bar in the design system.
- Do not add dark mode in this pass.

## 10. Photographs and the shareable list

After the facts are true:

- Photographs of the stocked parts, with a scale reference in the frame or in the caption.
- A pinout only when the shop knows it.
- A control that copies the cart as plain text: part number, quantity, price. Engineers hand carts to colleagues. Baymard’s Arrow sessions failed this.

Do not add reviews, a BOM uploader, parametric filters, ECAD, or a second accent.

## Keep

- Astro content collection and `/product/[part_number]` routes.
- nanostores cart persisted in `localStorage`, including the remove control.
- Product JSON-LD, once the brand and the price are real.
- Pagefind at build time.
- Cloudflare adapter and D1, once an insert is required for success.
- The shipping page’s explanation of advance payment, the cutoff, Lahore versus nationwide, antistatic packaging, and the defect-report window. Reconcile the clocks. Do not rewrite the policy into marketing.

## Done

The pass is done when a person can, in a browser:

1. Search `LM7805` from a 390px-wide viewport and open the part.
2. See a job sentence, a stock count, a datasheet that opens, and a shipping line that matches the cart.
3. Add two, and see the server’s price, not a decorative discount.
4. Filter the table and the mobile list to the same category, including a category with no parts.
5. Check out as a guest with a Pakistani mobile, pay only the methods the page names, and land on a success page that 404s for any id the database does not hold.

A restyle of the hero that leaves the client total, the dead datasheet, or the phone mismatch is not done.
