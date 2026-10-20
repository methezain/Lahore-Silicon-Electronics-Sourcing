# Copy

Words are part of the interface. They follow the same discipline as spacing.

## Voice

The voice of a careful counter: plain, specific, unhurried, a little dry. It informs; it does not sell.

- Say what the part does and what the buyer controls. "Turns 7–35 V into a steady 5 V", not "Power your dreams".
- Active voice, sentence case, plain verbs. No exclamation marks.
- English throughout the interface. Roman Urdu is welcome in WhatsApp templates and may appear in help text when the owner approves it.
- Be specific over clever. A number beats an adjective.

## The truth rule

A sentence ships only when data, the shipping module, or the server can prove it.

| Allowed | Not allowed |
| --- | --- |
| "48 in stock" (from `stock_qty`) | "Plenty in stock", "Selling fast" |
| "Paid before 3 PM, Monday to Saturday, ships the same day" | "Lightning-fast delivery" |
| "Representative studio photograph" (from `image_note`) | Implying a stock photo is the lot |
| "10 parts on the counter" (computed) | "500+ components" |
| "Report a defect within 3 days" | "100% genuine guaranteed" without a policy behind it |

Never cite outside studies (Baymard, Google, Deloitte) on the site.

## Vocabulary

Use one word for one thing, everywhere.

| Use | Not |
| --- | --- |
| part | product, item, component (in UI labels) |
| cart | bag, basket |
| Add to cart → Added | Buy now, Add to bag |
| Check out | Proceed to checkout, Continue |
| Place order | Submit, Confirm |
| in stock / out of stock | available / unavailable |
| delivery | shipping (buyer-facing), except the page name "Shipping and payment" |
| dispatch | ship out |
| datasheet | spec sheet, PDF |
| counter | store, shop (in brand voice; "shop" is fine in legal text) |

## Formatting

- Money: `Rs 1,250`. Thousand grouping, no decimals, no "PKR" in the UI (JSON-LD uses `PKR`).
- Units: non-breaking space between value and unit (`5 V`, `1 A`, `3.3 V`, `10 kΩ`, `100 µF`). Ranges with an en dash (`7–35 V`, `48–72 hours`).
- Times: `3:00 PM PKT`, days `Monday to Saturday`. Dates `12 Nov 2026`.
- Part numbers exactly as the manufacturer writes them, in the `part` style.
- Counts with their noun: "1 part", "2 parts".

## Microcopy

| Moment | Text |
| --- | --- |
| Hero headline (home) | Parts from Hall Road, counted before you pay. |
| Hero lede | Regulators, boards, sensors and relays. Every price is the price at checkout. Every stock number is a real count. |
| Status chip, before cutoff | Dispatching today · order within 3 h 12 m |
| Status chip, after cutoff | Order now for dispatch tomorrow |
| Status chip, Sunday | Dispatch resumes Monday |
| Search placeholder | LM7805, ESP32, "5 V regulator" |
| Search no results | We don't stock "[query]". Send the part number on WhatsApp and we'll check Hall Road. |
| Add button | Add to cart · Rs 45 |
| Add confirmation | Added LM7805 to cart |
| Quantity corrected | LM2596S: only 16 in stock. Quantity set to 16. |
| Out of stock button | Out of stock |
| Cart empty | Your cart is empty. Browse the catalog. |
| Cart footer note | Guest checkout. No account needed. |
| Delivery rule (no rate table) | Delivery cost is confirmed from your city before you pay. |
| Checkout submit | Place order · Rs 2,545 |
| Submitting | Placing order… |
| Order saved | Order received. We'll confirm your payment and dispatch. |
| Order not saved | The order was not saved. Nothing was charged. Try again, or message us on WhatsApp. |
| Copy button | Copy → Copied |

## Errors

Name the rule, keep the value, sit on the field, no apology.

| Field | Message |
| --- | --- |
| Name | Enter your name (at least 2 letters). |
| Phone | Enter a Pakistani mobile number, like 0300 1234567. |
| City | Enter your city or area. |
| Address | Enter the full address, with house and street. |
| Payment reference | Paste the transaction ID from your payment (at least 5 characters). |
| Total mismatch | Prices changed while you were checking out. The new total is Rs 2,600. |
| Stock exceeded | ESP32-WROOM-32D: only 9 in stock. |

## Alt text

- Product photo: "[part number], [package]" plus what is visible ("LM7805 regulator in a TO-220 package").
- Decorative images and thumbnails next to a visible part number: `alt=""`.
- Icons with visible labels: `aria-hidden="true"`. Icon-only buttons: an `aria-label` that says the action ("Close cart", "Search parts").

## Metadata

- Title: `[PART] [job sentence] | Lahore Silicon` on product pages; `[Page] | Lahore Silicon` elsewhere.
- Description: the part's `summary`, then "Ships from Hall Road, Lahore."
- Product description formula: `[Part number] [job]: [key electrical ratings], [package]. [What it is used for]. Ships from Hall Road, Lahore.`
