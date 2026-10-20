# Copy

Words on this shop are part of the counter. They tell the buyer what the object is, what it costs, and what happens next. They are not a place to sound expensive.

## Voice

- Sentence case. Plain verbs. Short sentences.
- Address the buyer only when the sentence needs it. “Add to cart,” not “Add this premium component to your cart.”
- Name the object by its job, the way a careful salesperson would, and then give the number.
- Specific beats clever. “Echo pin is 5 V logic” is the voice. “Unleash your next build” is not.
- An action keeps its name. “Add to cart” leads to “Added.” “Place order” leads to “Order placed.”
- Errors state the rule and the repair. “Enter a Pakistani mobile number, 03XX XXXXXXX.” They do not say “Oops” and they do not apologize.
- An empty state invites the next action. “No parts in Sensors. Show the full catalog.”

## The job sentence

`name` is the job sentence. It includes the distinguishing facts the buyer would ask for at the counter.

| Part | Shape |
| --- | --- |
| LM7805 | 5 V, 1 A, TO-220 linear regulator |
| AMS1117-3.3 | 3.3 V LDO regulator, SOT-223 |
| HC-SR04 | Ultrasonic distance module, 5 V |
| NE555 | Timer IC, 8-pin |

Keep a fact in the sentence only when the spec row agrees with it. If the LM7805 record says 1 A in one place and 1.5 A in another, fix the data before publishing either number.

## Vocabulary

Use these words. Do not rotate synonyms.

| Thing | Word |
| --- | --- |
| The bag of parts | Cart |
| The confirmation step | Checkout |
| The button that adds | Add to cart |
| The button that buys | Place order |
| Money | Rs, with a grouping separator |
| How many are in the drawer | “24 in stock”, the integer |
| When it leaves Lahore | Dispatch |
| When it arrives | Delivery |
| The PDF | Datasheet |
| The shop | Lahore Silicon |
| The market | Hall Road, when the sentence is about sourcing |

Do not say “SKU” in the interface. Say “part number.” Do not say “buyflow,” “PDP,” or “landing.”

## Claims that may ship

A claim may ship when the source named next to it is true.

| Claim | Source required |
| --- | --- |
| A price | The catalog integer, formatted by the money module |
| A stock count | `stock_qty` |
| A restock date | `restock_on` |
| A dispatch window | `src/lib/shipping.ts`, matching the policy page |
| Antistatic packaging | The policy page, and only for parts whose `in_the_bag` says so |
| Advance payment | The policy page |
| A datasheet | A URL that opens |
| A bank account or wallet | The operator’s environment variable |
| A phone or WhatsApp link | The operator’s real number |
| “Representative image” | `image_note`, when the photo is not the stocked lot |

## Claims that do not ship

Do not write these unless the source appears in the repo and a person could check it.

- “500+ components,” “100% inspected,” “2 hour dispatch,” or any statistic that is a literal in a component.
- “Premium,” “world-class,” “cutting-edge,” “best prices,” “trusted by engineers.”
- “Genuine” or “100% authentic” as a badge. The datasheet, the manufacturer, and the part number do that work. A badge without a named distributor or a named lot is advertising.
- A pulsing “open now” that is not computed from the cutoff and the clock.
- A discount percentage the cart does not apply.
- A delivery date the shop has not calculated. If the shop can only promise dispatch, say dispatch.
- Fake reviews, star ratings, “customers also bought,” and countdown timers.
- Payment logos for methods the checkout cannot take.
- “Track your order” when the page is a contact form.
- Brand “Generic.”

## Shipping sentence

The policy page is the authority until the operator changes it. As written in `src/pages/shipping-and-payments.astro`, the facts are:

- Cutoff: 3:00 PM PKT, Monday–Saturday.
- Lahore: 1 business day, via Bykea same-day or a local courier.
- Nationwide: 48–72 hours.

Write that once, in the shipping module, and render it everywhere:

> Lahore: 1 business day, by Bykea or a local courier. Nationwide: 48–72 hours. Order by 3:00 PM PKT, Monday–Saturday.

These current strings disagree with that page and get replaced by the module, not by a new invention:

- The homepage says Lahore 24h and nationwide 48h.
- The product page says Lahore 24h and nationwide 48–72h.
- Checkout says same-day Bykea and nationwide 48–72h.
- Contact lists Sunday as closed and the cutoff as “daily.”

Do not shorten 48–72 hours to 48 hours. Do not call a 1-business-day Lahore delivery “same-day dispatch” in a second place unless the policy page says both and says which one is which.

The product page adds the cost assumption in the same block:

> Delivery in Lahore from Rs {amount}. Nationwide from Rs {amount}.

If the amount is unknown, do not print a blank. Print: “Delivery cost is confirmed from your city, before you pay.”

## Buttons and errors

| Situation | Copy |
| --- | --- |
| Add | Add to cart |
| Added | Added |
| Out of stock, no date | Out of stock |
| Out of stock, with date | Back on {date} |
| Quantity too high | Only {stock_qty} in stock |
| Bad phone | Enter a Pakistani mobile number, 03XX XXXXXXX |
| Order failed to save | The order was not saved. Nothing was charged. Try again, or message the shop |
| Unknown order id | No order with this id |

## Page titles

| Page | Title |
| --- | --- |
| Home | Parts — Lahore Silicon |
| Product | {part number} — {job sentence} |
| Checkout | Checkout — Lahore Silicon |
| Success | Order {id} — Lahore Silicon |
| Shipping | Shipping and payment — Lahore Silicon |

The visible `h1` can be shorter than the document title. The product `h1` is the job sentence.
