# Decisions

Business facts and choices that code cannot supply. Agents do not guess these; they leave the control out and add or update a row here.

## Open: the owner must answer

| # | Question | Why it matters | Default until answered |
| --- | --- | --- | --- |
| 1 | Offer cash on delivery? For Lahore only, all cities, or above a threshold? | 60–70% of Pakistani online orders are COD, and prepay-only stores read as risky. COD returns run about 24% versus about 1% prepaid. | Prepaid only (Raast, bank transfer), with the reason stated. The research report recommends offering COD with WhatsApp confirmation before dispatch, and rewarding prepayment through Raast |
| 2 | Which payment rails? Raast ID/QR, bank account (title, IBAN), JazzCash, Easypaisa, a gateway (PayFast, Safepay, XPay)? | Panels render only from real `PUBLIC_*` values. | No payment panel; checkout says details come on WhatsApp |
| 3 | WhatsApp and phone number for customers | Contact, sourcing requests, order follow-up | Controls omitted |
| 4 | Street address and shop number on Hall Road, plus map link | Trust (fraud is a known worry) and receipts under Punjab consumer law | "Hall Road, Lahore" only |
| 5 | Delivery rate table (Lahore, other cities, remote) or a free-over threshold | Total cost before checkout is the top abandonment cause | "Delivery cost is confirmed from your city before you pay." |
| 6 | Real stock counts and who updates them, how often | Stock is shown as an exact number | Current JSON values, marked for review |
| 7 | Photographs of the actual stocked lots, and a photo of the counter | Users distrust generic photos; a real counter photo proves the shop exists | Studio images with `image_note` |
| 8 | Datasheet PDF links per part | Missing datasheets make engineers abandon a part | Datasheet control omitted |
| 9 | Return and refund policy beyond the 3-day defect window (change of mind? who pays return delivery?) | Must be disclosed before sale | Defect window only |
| 10 | Public holidays to skip in dispatch countdowns | Countdown must be true | Sundays only |
| 11 | Business legal name and NTN for receipts | Receipts must carry seller name and address | Trading name only |
| 12 | Domain confirmation (`lahoresilicon.com` in `astro.config.mjs`) | Canonicals, sitemap, JSON-LD | As configured |
| 13 | Email for order confirmations, and a sender (Cloudflare Email, Resend, etc.) | Confirmation page promises nothing it cannot send | No email promise on screen |
| 14 | `shelf_qty` (a normal full drawer) and `restock_on` per part | The 10-segment meter and "back around" date need both. `low_stock_at` stays at the default of 10 | Meter hidden. Out of stock has no date |

## Made

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-10-20 | Keep the client palette; replace `#FFFBFC` canvas with cool `#F3F6FA`; add an OKLCH blue ramp with `signal` `#20B7FE` for navy panels | Pink-tinted canvas clashed with the blue-grey mist; `#007AAD` fails contrast on navy and mist |
| 2026-10-20 | Typefaces: Mona Sans (display and text) and Geist Mono (part numbers). Retire IBM Plex | Width axis gives a distinctive engineered headline; Geist Mono's slashed zero keeps `0` and `O` apart (Martian Mono failed that test) |
| 2026-10-20 | Signature: the socket tab, echoing the plug logo and the client's tab-notch references | One memorable shape instead of scattered decoration |
| 2026-10-20 | Light theme only; no dark mode toggle | One system done well; navy panels give the dark moments |
| 2026-10-20 | Native cross-document view transitions, not `<ClientRouter />` | Zero JS, compatible with Astro CSP |
| 2026-10-20 | No discounts, countdown timers other than the real dispatch cutoff, popups, or carousels | They read as cheap and manipulative in luxury and e-commerce research |
