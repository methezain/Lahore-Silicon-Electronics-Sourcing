# Decisions

Business facts and choices that code cannot supply. Agents do not guess these; they leave the control out and add or update a row here.

## Open: the owner must answer

| # | Question | Why it matters | Default until answered |
| --- | --- | --- | --- |
| 1 | Offer cash on delivery? For Lahore only, all cities, or above a threshold? | 60–70% of Pakistani online orders are COD, and prepay-only stores read as risky. COD returns run about 24% versus about 1% prepaid. | Prepaid only (Raast, bank transfer), with the reason stated. The research report recommends offering COD with WhatsApp confirmation before dispatch, and rewarding prepayment through Raast |

Answer: No Cash on Delivery service is available. Pay first then pick your order from us or get it delivered. If pickup is selected, then delivery charges are not included, if delivery is selected, then delivery charges are included in the bill.

The shipping page states that there is no cash on delivery. Pickup is not a checkout choice, so the page does not describe one, and it does not put a delivery charge in the total. 

| 2 | Which payment rails? Raast ID/QR, bank account (title, IBAN), JazzCash, Easypaisa, a gateway (PayFast, Safepay, XPay)? | Panels render only from real `PUBLIC_*` values. | No payment panel; checkout says details come on WhatsApp |

Answer: JazzCash, SadaPay, and Bank transfers are supported. 
JazzCash: 03229587927
SadaPay: 03229587927
Bank Details:
Bank Name: Meezan Bank
Account Title: ALI ZAIN
Account Number: 08210107580494
IBAN: PK77MEZN0008210107580494

| 3 | WhatsApp and phone number for customers | Contact, sourcing requests, order follow-up | Controls omitted |
Answer:
WhatsApp: +92 3229587927

| 4 | Street address and shop number on Hall Road, plus map link | Trust (fraud is a known worry) and receipts under Punjab consumer law | "Hall Road, Lahore" only |
Answer: No physical address yet.

| 5 | Delivery rate table (Lahore, other cities, remote) or a free-over threshold | Total cost before checkout is the top abandonment cause | "Delivery cost is confirmed from your city before you pay." |
Answer: for delivery rates, we have to make a json file where we write the city name and then its delivery charges, for now it is not there, you create that add top 5 cities of pakistan and add dummy delivery rates like 250 RS.

Held back: dummy rupee amounts are not a rate table. `deliveryCost` stays until real city amounts exist. 

| 6 | Real stock counts and who updates them, how often | Stock is shown as an exact number | Current JSON values, marked for review |
| 7 | Photographs of the actual stocked lots, and a photo of the counter | Users distrust generic photos; a real counter photo proves the shop exists | Studio images with `image_note` |
Answer: we will keep using the json for now. 

| 8 | Datasheet PDF links per part | Missing datasheets make engineers abandon a part | Datasheet control omitted |
Answer: I don't know much about this for now, my electronics engineer will add some way, but you don't need to totally skip this, add something or some way of this.

Links added only where a manufacturer https PDF matches the part we list: LM7805 (TI LM340 family), NE555 (TI), DS18B20 (Analog Devices), ESP32-WROOM-32D (Espressif), ARDUINO-NANO (Arduino A000005). Still omitted: AMS1117 (the AMS PDF is http, and the schema allows only https), LM2596S (sold as a module; the TI IC sheet does not document the board), HC-SR04 (no manufacturer datasheet), TCRT5000 (Vishay's sheet is the sensor, not this module), SRD-05VDC-SL-C (Songle's sheet is the relay, not this module). Lot photos and a street address are still not supplied. 

| 9 | Return and refund policy beyond the 3-day defect window (change of mind? who pays return delivery?) | Must be disclosed before sale | Defect window only |
Answer: not 3 days, only 24 hours, and must inform on WhatsApp first. 

| 10 | Public holidays to skip in dispatch countdowns | Countdown must be true | Sundays only |
Answer: Ok, keep Sundays Only, holiday does not mean you cannot order, you can order.

| 11 | Business legal name and NTN for receipts | Receipts must carry seller name and address | Trading name only |
Answer: For now keep it as lahore silicon, we may change this name in future, so there should be a way like a variable in env or config file, if i change the name at one place it is changed there as well. 

| 12 | Domain confirmation (`lahoresilicon.com` in `astro.config.mjs`) | Canonicals, sitemap, JSON-LD | As configured |
Answer: Will buy this domain soon, keep this as it. 

| 13 | Email for order confirmations, and a sender (Cloudflare Email, Resend, etc.) | Confirmation page promises nothing it cannot send | No email promise on screen |
Answer: Resend api key is added in .env file.

Order received does not mention email. These pages do not send mail. 

| 14 | `shelf_qty` (a normal full drawer) and `restock_on` per part | The 10-segment meter and "back around" date need both. `low_stock_at` stays at the default of 10 | Meter hidden. Out of stock has no date |
Answer: decide yourself.

Decided 21 Oct 2026: leave `shelf_qty` and `restock_on` unset on every part. A full-drawer count and a restock date were not supplied, so the meter stays hidden and out of stock has no date. `low_stock_at` stays at the schema default of 10.

| 15 | Which part leads the hero, and which category leads the bento? | There is no sales history and no arrival date, so the page cannot say "best-selling" or "newest" | Editorial, not a sales rank: `featured: true` on LM2596S is the front card. `FEATURED_CATEGORY` is Boards. The tile photo is ESP32-WROOM-32D. The page does not call any of these a bestseller
Answer: for now keep as it, we will edit these things later.

| 16 | Turnstile sitekey and secret for checkout | The server refuses an order it cannot verify | No production widget was supplied. Local `.env` may use Cloudflare's published test keys. The committed hostname allowlist is `lahoresilicon.com` only. A deploy without `TURNSTILE_SECRET` and `PUBLIC_TURNSTILE_SITEKEY` fails closed | 
## Open: catalog facts still missing

Left out of the part files on 21 Oct 2026. Do not invent them.

| Part | Left out | Why |
| --- | --- | --- |
| LM7805 | Tab connection. Output current kept at the listed 1 A | The TI family sheet rates the LM7805 at 1.5 A and says the tab is ground or output depending on the drawing. Pins 1–3 are named. The listed 1 A stays |
| LM2596S | Pinout, datasheet, logic level, what is not included | Screw-terminal names are not in the listing. The studio photo is not the lot |
| AMS1117-3.3 | Datasheet link. Output current kept at 800 mA | Official AMS PDF is http. Some AMS sheets say 1 A and call 1.3 V a maximum; the listing stays "1.3 V typical" and 800 mA |
| ESP32-WROOM-32D | Nothing electrical from the Espressif v2.8 sheet that this page states | — |
| ARDUINO-NANO | Per-pin current. Whether the lot's headers are soldered | Arduino's own sheets disagree (20 mA on the 2021 pinout, 40 mA on the older product sheet). The studio photo shows unsoldered holes and is not the lot. No USB cable follows from "Board in an antistatic bag" |
| NE555 | Logic level | The supply is 4.5–16 V, which is not one of the three logic-level values |
| DS18B20 | — | Pull-up is named as 4.7 kΩ in the drawing and about 5 kΩ in the text. Both are on the page. The resistor is not in the bag |
| HC-SR04 | Datasheet. Left-to-right pin order | Pin names are the ones already in the listing. No manufacturer PDF |
| TCRT5000 | Pinout, datasheet, logic level | Header names are not in the listing. Vishay's PDF is the sensor, not this module |
| SRD-05VDC-SL-C | Pinout, datasheet, logic level | Header and screw-terminal names are not in the listing. The coil is 5 V; the logic-pin voltage is not |
| All parts | `shelf_qty`, `restock_on`, street address, lot photographs | See rows 4, 7, and 14 |

## Made

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-10-20 | Keep the client palette; replace `#FFFBFC` canvas with cool `#F3F6FA`; add an OKLCH blue ramp with `signal` `#20B7FE` for navy panels | Pink-tinted canvas clashed with the blue-grey mist; `#007AAD` fails contrast on navy and mist |
| 2026-10-20 | Typefaces: Mona Sans (display and text) and Geist Mono (part numbers). Retire IBM Plex | Width axis gives a distinctive engineered headline; Geist Mono's slashed zero keeps `0` and `O` apart (Martian Mono failed that test) |
| 2026-10-20 | Signature: the socket tab, echoing the plug logo and the client's tab-notch references | One memorable shape instead of scattered decoration |
| 2026-10-20 | Light theme only; no dark mode toggle | One system done well; navy panels give the dark moments |
| 2026-10-20 | Native cross-document view transitions, not `<ClientRouter />` | Zero JS, compatible with Astro CSP |
| 2026-10-20 | No discounts, countdown timers other than the real dispatch cutoff, popups, or carousels | They read as cheap and manipulative in luxury and e-commerce research |
| 2026-10-21 | Spec labels use one name per fact (`Supply voltage`, `Temperature range`, `Sensing distance`). `shelf_qty` stays unset | Comparison and search need the same label for the same fact. A meter without a real full-drawer count would be a fake scarcity bar |
