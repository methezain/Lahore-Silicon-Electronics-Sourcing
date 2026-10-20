# Pages

Page-by-page blueprint. Components are defined in [design-system.md](design-system.md#9-components); data rules in [commerce.md](commerce.md); words in [copy.md](copy.md). Every page uses the shared layout: floating header, `<main id="main">`, navy footer, cart sheet, skip link.

## Home `/`

Job: tell a first-time visitor what this counter sells and get them to a part in one action.

```
[ header pill bar ]
+-- navy frame (r-frame 28, inset 12) ------------------------------+
| status chip: Dispatching today · order within 3 h 12 m            |
| DISPLAY-XL headline (one word in signal)      [stacked part cards]|
| body-lg lede, 2 lines                         front card = real   |
| 3 facts: Lahore / Nationwide / Defects        part, live stock    |
+--[ search dock in notch ]-----------------------------------------+
Shop by job: bento (featured category 2x2 navy + 4 tiles with counts)
On the counter today: filter pills + catalog table (cards on mobile)
How ordering works: navy band, 3 steps
[ footer ]
```

- The hero card deck shows three real parts. The front card is the best-selling or newest part, chosen in data, not hard-coded markup.
- The status chip is computed from `Asia/Karachi` time against the cutoff in `src/lib/shipping.ts`. After the cutoff it reads "Order now for dispatch tomorrow"; on Sunday "Dispatch resumes Monday". If the clock cannot be read, omit the chip.
- Mobile: the deck is hidden, and the search moves inside the navy panel.
- The catalog section is the real catalog with `?category=` and `?sort=` in the URL. Filtering never needs JavaScript.

## Product `/product/[part_number]`

Job: let both readers decide and buy without scrolling on a 1280px desktop, and with one scroll on a 390px phone.

```
breadcrumb: Catalog / Power / LM7805
+-- gallery panel (r-frame) ---+  +-- buy panel (sticky) ------------+
| [tab: LM7805 · Texas Instr.] |  | LM7805 chip · TO-220 · THT       |
|  1:1 photo well              |  | h1 title: job sentence           |
|  thumbs                      |  | 1-sentence plain explanation     |
+------------------------------+  | Rs 45            48 in stock     |
image_note caption                | ETA box: order within … / windows|
                                  | [− 1 +] [Add to cart · Rs 45]    |
                                  | In the bag / Datasheet / Defects |
                                  +----------------------------------+
Key figures: 4 tiles (first navy)
Specifications: full dl table
Pinout and wiring notes (modules)          You will also need: 2–4 parts
Questions buyers ask (FAQ, 3–6 items)
```

- Above the fold on desktop: part number, name, job sentence, price, stock, ETA, add control, datasheet link.
- Quantity breaks, when a part has them, render as a small table under the price, and the add button shows the line total for the chosen quantity.
- Out of stock: the add button is disabled with "Out of stock", the restock date shows if known, and a "Ask on WhatsApp" secondary button appears if the owner's number is configured.
- "You will also need" is a hand-written list in the part's data (`companions`), not an algorithm.
- JSON-LD `Product` with `Offer` in PKR, stock availability, brand from `manufacturer`, and image only when a photograph exists.

## Search (dialog, all pages)

Job: exact part numbers resolve instantly; plain words find the job.

- Opens from the header field, the `/` key, or the hero dock. Focus goes to the input.
- Results show thumbnail, part number, job sentence, stock, price. Arrow keys move, Enter opens, Escape closes.
- Exact part-number or MPN match is always first. Matching ignores case, spaces, hyphens and dots (`lm 7805`, `LM-7805`, `ams1117 3.3`).
- Unit-aware: "5v", "5 V", "3.3v", "10k" match the spec fields.
- Zero results: "We don't stock [query]." plus WhatsApp sourcing request (if configured) and the category list. Never an empty box.

## Cart sheet (all pages)

See [design-system.md](design-system.md#cart-sheet-s-drawer). It is the cart; there is no separate `/cart` page. A `/cart` route may redirect to `/checkout`.

## Checkout `/checkout`

Job: get from cart to a saved order in the fewest fields, with no surprise.

```
Checkout                                  +-- summary (sticky) ---+
STEP 1 Contact     name, phone            | lines with thumbnails  |
STEP 2 Delivery    city, address, line 2  | Merchandise            |
                   (collapsed)            | Delivery: rule / amount|
STEP 3 Payment     method choice, details | Total (num, large)     |
                   reference field        | return rule link       |
[ Place order · Rs 2,545 ]                +------------------------+
```

- Sections are `surface` panels with `STEP n` labels because checkout is a real sequence.
- Field count target: 6 (name, phone, city, address, payment method, payment reference) plus the optional collapsed address line 2.
- Phone: one field showing `+92`, accepting `03XXXXXXXXX`, `3XXXXXXXXX` or `+923XXXXXXXXX`, normalized by `src/lib/phone.ts`.
- Mobile: the summary collapses into a "Show order · Rs 2,545" disclosure at the top.
- Payment panel copy, account details and copy buttons follow [commerce.md](commerce.md#payment). Inline `style` attributes in the current file are removed.

## Order received `/order-success/[id]`

Job: confirm the order, say exactly what happens next, and give one way to reach a person.

- A receipt card: order ID in `part`, date, lines, total, delivery destination.
- A 3-step status timeline: Received (done) → Payment confirmed → Dispatched, with the dispatch promise from the shipping module.
- Primary action: "Send payment receipt on WhatsApp" when configured. Secondary: "Continue shopping".
- Shows only order ID, lines and total from the database. Never the buyer's phone or address in a URL-addressable page.

## Shipping and payment `/shipping-and-payments`

The policy page that the product page, cart and checkout link to. Renders `src/lib/shipping.ts` and `src/lib/shop.ts`; it does not retype them. Sections with anchors: `#dispatch`, `#delivery`, `#payment`, `#defects`, `#returns`. Required by the Punjab Consumer Protection Act: the return and refund policy is public and linked before checkout.

## About `/about`

The Hall Road story in under 250 words, a real photo of the counter when the owner supplies one, the street address, hours, and what the shop checks before dispatch. No statistics unless the catalog computes them.

## Contact `/contact`

WhatsApp (primary when configured), phone, address with a map link, hours, and the sourcing-request form (parts list textarea, phone). Help links stay in the same place on every page (WCAG 3.2.6: footer and the product page's ask control).

## Not found and errors

- 404: "No page here." with search and the category list.
- A product URL for a part the shop does not sell: 404 with "We don't stock [part]." and the WhatsApp sourcing link.
- 500: "Something broke on our side. Your cart is saved." with a retry link.

## Dead code to delete

`GlobalNavbar.astro`, `TopUtilityBanner.astro`, `Welcome.astro`, `CatalogGridView.astro`, `CatalogTableView.astro`, `AddToCartButton.tsx`, `src/assets/astro.svg`, `src/assets/background.svg`, and `categorySwatch` in `src/lib/categories.ts`. None are imported by a live page; together they hold most of the inline styles and stray hex values in `src/`.
