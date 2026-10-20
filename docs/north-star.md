# North star

## The feeling

A buyer should feel they are standing at a careful counter. The person on the other side already knows the part, has counted the drawer, and will not change the number at the end.

That feeling comes from three things on one screen:

- A job sentence a non-technical buyer can use. Example: “5 V, 1 A, TO-220 linear regulator.”
- The part number, the price, the stock count, and the datasheet, in the same block, for the person who arrived with a number.
- A shipping assumption and a return rule that are still true after the server prices the order.

Apple’s product pages, Aesop’s “what the associate would say,” Framework’s one-accent buy flow, and Braun’s habit of naming an object by its job set the ceiling for restraint. Baymard’s 2024 study of electronic-component sites (168 moderated sessions with engineers and buyers) sets the ceiling for facts: people left when the datasheet, a matching drawing, or a stock count was missing. DigiKey, Mouser, RS, Arrow, and LCSC show how those facts look at distributor scale. Adafruit and SparkFun show the module version: logic level, what is in the bag, and a datasheet above the essay.

## Who it is for

One catalog, two reading orders.

| Reader | What they need first | What fails them |
| --- | --- | --- |
| Working engineer or technician | Manufacturer part number, package, stock integer, price at the quantity they need, datasheet | A lifestyle paragraph, a card grid with no columns, a stock badge that only says “in stock” |
| Maker or student | What it does, the voltage, what else is in the bag, when it arrives in Lahore | A parametric wall, a reel fee, a page that assumes they already know the package code |

Do not build two sites, two heroes, or a “simple mode.”

## Copy this

- Manufacturer part number and the shop’s part number, as selectable text.
- A one-line job, then HTML specs, then the PDF. The PDF is not a substitute for the voltage.
- A numeric stock count, or a date when the count is zero. “In stock” alone is not a count.
- Minimum and multiple, if they are not 1.
- A quantity-break table only when the cart and the order use the same breaks.
- A photo of the item the shop actually ships, or an explicit line that the picture is representative.
- One sentence on packaging. Example: “Loose TO-220 in an antistatic bag.”
- Pinout and electrical limits in the first screen for modules.
- Shipping cost, or the free-over rule, next to the price, with the assumption in the label.
- A delivery date or a dispatch window in calendar language.
- Guest checkout as the primary path. An account, if it ever exists, comes after the order.
- One accent, used for the action. In this system the action is ink, and the only chromatic mark is the copper rule under the part number. See [design-system.md](design-system.md).
- A footnote under any number the shop did not measure itself.

## Adapt this

- Distributor product tables become a short desktop table of the columns that actually differ, and a mobile list of the same facts. This catalog has about ten parts, not half a million.
- Filters are a single row of real categories above the table. A left sidebar is for a catalog that needs the columns back.
- Search hits the manufacturer part number, the shop part number, and the plain name. Exact part-number search must not miss.
- “Similar parts” is a short list a person wrote, of parts this shop sells.
- Apple’s sequence of feeling, then proof, then specification becomes one job sentence above a spec block that is already on the first screen.

## Refuse this

- Parametric filters for attributes that do not vary in this catalog.
- Separate part numbers for cut tape, reel, and Digi-Reel, and any reel fee.
- Regional price stacks, contract-price icons, and quote-only as the default for a part on the shelf.
- A replenishment date that appears only after add to cart.
- Merging two different parts into one card because a marketplace template does that with shirt sizes.
- A BOM tool, ECAD models, and manufacturer lead times the shop cannot honor.
- A cinematic marketing URL that is separate from the shop.
- Horizontal scroll voyages, WebGL product stages, parallax, and autoplaying carousels.
- Award-site decoration. Aesop’s candles microsite scored higher on design than on usability and accessibility. That split is the failure mode.
- Hidden prices, hidden stock, and a delivery promise with no date.
- Lifestyle copy that omits voltage and logic level.
- A second visual theme, a gradient mesh, a cream-and-terracotta palette, a near-black page with one acid accent, or a newspaper layout. Those are generic costumes. This shop’s costume is specified in [design-system.md](design-system.md).
- DigiKey’s chrome. The facts transfer. The machinery for hundreds of thousands of SKUs does not.

## What already belongs to this shop

Keep these, and make them true:

- Hall Road procurement as the story of the business.
- Advance payment, with the reason written on the shipping page.
- WhatsApp as the operations channel, using the operator’s real number.
- Part-number URLs and the content collection.
- A persistent cart with a drawer and a remove control.
- The shipping page’s real distinctions: Lahore versus nationwide, a cutoff, antistatic packaging, a defect-report window.

The differentiated copy already in the JSON (the LM7805 text names the package, the current, and thermal shutdown) is worth more than a generic marketplace voice. Extend it. Do not replace it with slogans.

## Evidence boundaries

Do not quote these as this shop’s expected lift: Baymard’s modeled 35.26% checkout gain, Vodafone’s 8% sales lift, Rakuten’s 33% conversion lift, or a redBus 7% figure whose case-study URL 404’d. Do not treat the 2017 shipping-cost study, or the 2018 spec-sheet rates, as 2026 retests. Baymard’s guideline scores are paywalled. DigiKey’s US pages were bot-walled during the 19 October 2026 pass. The full source notes record every conflict.
