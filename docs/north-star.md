# North star

## The feeling

A buyer should feel they walked into the best counter on Hall Road. The space is calm and bright. The person behind the glass already knows the part, has counted the drawer, quotes one price, and does not change it at the till.

Premium on this site means three things at once:

1. **Composure.** Generous space, one typeface family, one accent, precise alignment, motion that answers the hand. Nothing shouts.
2. **Completeness.** The part number, the job it does, the price, the exact stock, the datasheet and the arrival window are all on the first screen.
3. **Truth.** Every number survives checkout. No fake urgency, no strike-through "sale", no invented stock, no placeholder phone number.

If a change makes the site prettier but less true or less complete, it is not premium.

## Who it is for

One catalog, two reading orders. Do not build two sites or a "simple mode".

| Reader | Needs first | What fails them |
| --- | --- | --- |
| Engineer or technician, arrives with a part number | Exact part number, maker, package, stock count, price at their quantity, datasheet | Lifestyle copy, a card grid with no columns, "In stock" without a number |
| Student or maker, arrives with a job | What it does in one plain sentence, voltage and logic level, what is in the bag, when it reaches them | A parametric wall, package codes with no explanation |

Typical device: a mid-range Android phone (Infinix, Tecno, Xiaomi, Vivo) on 4G with 70–130 ms latency, arriving from a WhatsApp, TikTok or Facebook link. Design for that phone first, then reward the desktop.

## The ceilings we borrow

Each reference sets the bar for one thing. We take that thing, not the whole costume.

| Reference | What we take | What we leave |
| --- | --- | --- |
| Apple Store buy pages | Off-black ink on near-white, one accent for action, every option priced, a calm sticky buy panel, FAQ at the end | Cinematic scroll video, custom fonts we cannot license |
| Teenage Engineering, Nothing, Analogue, Playdate | One distinctive typographic idea, a flat honest product grid, plain shipping lines ("ships in 24–48 hours") | Novelty fonts that hurt reading |
| Framework, Bang & Olufsen | Restraint, near-black that is warm or tinted, slow and quiet motion on large surfaces | Luxury habit of hiding prices |
| DigiKey, LCSC, Mouser | Exact stock, datasheet near the top, quantity price table, filters above the list, exact part-number search | Machinery for 500,000 SKUs: BOM upload, reel fees, regional price stacks |
| Adafruit, SparkFun, Pololu | Explain the module: who it is for, logic level, what is included and what is not, pinout, "you will also need" | Long essays above the facts |
| Linear, Vercel, Stripe | Tokens generated in OKLCH, concentric radii, layered tinted shadows, 120–320 ms ease-out motion | Gradient heroes, dark bento walls with glowing borders |
| PriceOye (Pakistan) | Local trust: real address, warranty and condition stated plainly, check-before-you-pay options, dated reviews | Discount banners and countdowns |
| Baymard Institute, NN/g | Guest checkout, 7–8 form fields, total cost visible before checkout, persistent add-to-cart feedback, +/− quantity controls | — |

## The client's visual references

The images in `design_language/` share one vocabulary, and the design system adopts it deliberately:

- Big rounded panels nested inside a frame, with concentric radii.
- A tab that rises out of a panel's edge with concave corners (the "Cardiology" tab, the landing page's search notch).
- Pill segmented controls for navigation and filters.
- Dark navy panels with one vivid accent, set inside a light page.
- Stacked floating cards with real depth.
- Large numerals with small unit labels, dashboard style.
- The plug logo in `#007AAD` and the palette `#007AAD / #D9E2E9 / #FFFBFC / #0C1D32`.

The lime and coral accents in the references are not adopted. The brand blue already has a vivid light step (`signal`, `#20B7FE`) that does that job on navy without adding a second hue.

## The signature

**The socket tab.** The logo is a plug and a socket about to connect. The UI echoes it: a part number sits in a small tab that rises from the top edge of its card with concave corners, like a connector seated in a socket. It appears on product cards, the product gallery and the hero card. The desktop hero repeats the shape in reverse: the search bar docks into a notch cut into the navy panel.

That is the one memorable idea. Nothing else competes with it. See [design-system.md](design-system.md#signature-the-socket-tab).

## Refuse

- Discount banners, strike-through prices, countdown timers, "only 2 left!" urgency, popups, newsletter modals, autoplay carousels, chat bubbles that cover the cart.
- Parallax, scroll-jacking, WebGL product stages, horizontal scroll voyages, marquee text, confetti.
- A purple or multi-stop gradient hero, glowing borders, glassmorphism stacked on glassmorphism, pure `#000` dark mode with one neon accent.
- Copy that sells instead of informing ("Unleash your creativity"). Lifestyle text that omits voltage.
- Two parts merged into one card with a variant picker. Two different part numbers are two products.
- Any claim the shop cannot prove: invented review counts, "100% genuine", "500+ parts", a placeholder phone number, a datasheet link that goes nowhere.

## What already belongs to this shop

Keep these and make them excellent: Hall Road sourcing as the story, part-number URLs, the content collection, server-side pricing, the persistent cart drawer, WhatsApp as the operations channel, the Lahore-versus-nationwide delivery split, the 3 PM dispatch cutoff, antistatic packing, and the defect-report window.
