# Evidence-based commerce UX for a small electronics catalog

Scope: a small electronics-component shop with a catalog, cart, and checkout, not a marketplace. Research cutoff: 19 October 2026. Every percentage below was read on a public page. Where a number is old, paywalled, or in conflict with another public page, that is stated. Vendor marketing is labeled as such.

Primary method pages opened in full:

- [Product Page UX 2026](https://baymard.com/research-articles/current-state-ecommerce-product-page-ux), Edward Scott, updated 18 March 2026
- [Checkout UX 2025](https://baymard.com/research-articles/current-state-of-checkout-ux), Kathryn Reeves, updated 25 November 2025
- [50 Cart Abandonment Rate Statistics 2026](https://baymard.com/lists/cart-abandonment-rate), last updated 22 September 2025
- [Product List UX 2025](https://baymard.com/research-articles/current-state-product-list-and-filtering), Mark Crowley, updated 9 September 2025
- [Ecommerce Search UX 2026](https://baymard.com/research-articles/ecommerce-search-query-types), Edward Scott, updated 29 April 2026
- [B2B Electronics Sites](https://baymard.com/research-articles/b2b-electronic-components-machinery-launch), Edward Scott, published 8 May 2024
- [Product Spec Sheets](https://baymard.com/research-articles/spec-sheet-scannability), Edward Scott, published 27 March 2018
- [Estimated shipping on product pages](https://baymard.com/research-articles/show-shipping-costs-on-product-pages), Christian Holst, published 20 June 2017
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [What’s New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/), Recommendation 5 October 2023
- [WebAIM Million 2025](https://webaim.org/projects/million/2025/), February 2025 crawl
- [web.dev Web Vitals](https://web.dev/articles/vitals), [threshold methodology](https://web.dev/articles/defining-core-web-vitals-thresholds), [INP](https://web.dev/articles/inp) (last updated 2 September 2025)

## What are the highest-impact Baymard findings on product pages, spec tables, images, reviews, shipping cost visibility, and checkout friction?

### Takeaway

As of the public 2025–2026 benchmarks, most large retail sites still have mediocre product pages, lists, search, and checkouts, and Baymard’s own abandonment survey puts extra cost, slow delivery, card distrust, forced accounts, and a long checkout ahead of almost everything else. For a low-price parts catalog, the findings that change the design are: show the lowest shipping cost and a real delivery date before the form, keep guest checkout the obvious path, keep the form short and explicit, and put scannable specs and an in-scale image where the buy decision happens.

### Cited Findings

**Product pages, benchmark dated 18 March 2026.** The benchmark covers 155+ US and European sites and 30,000+ manually scored ratings. 52% of desktop, 62% of mobile, and 64% of app sites are “mediocre or worse.” Only 48% of desktop and 38% of mobile sites are “decent” or better. A few desktop sites and one mobile site are “good.” None are “perfect” or “state of the art.” Baymard’s interpretation, not a separate experiment: users more often leave because medium issues accumulate than because one severe issue appears. — [Product Page UX 2026](https://baymard.com/research-articles/current-state-ecommerce-product-page-ux)

The same article’s ten public pitfalls, with the site-failure rates it prints:

- Size selectors as buttons, not a closed dropdown: 57% don’t. Testers missed out-of-stock sizes hidden in menus.
- “In scale” images: 37% don’t. 42% of users try to judge size from the pictures and, without a reference object, some abandoned rather than read the written dimensions.
- Human-model images: 23% don’t. The article limits this to products that are worn (apparel, bags, jewelry, watches, cosmetics).
- Guest-usable save/wishlist: 89% don’t make save easy. In a study of 1,193 people, 21% said they rely on save features. Forcing signup to save caused participants to refuse.
- Price per unit when the same product is sold in different amounts: 81% don’t, on the product page.
- A total-order-cost estimate near the buy section: 67% don’t. The recommended content is the lowest shipping cost, or at least an estimate plus its conditions.
- Return policy linked or summarized in the main product-page content: 44% don’t. In the Consideration & Purchase Behavior study of 1,032 respondents, 60% look for the return policy on the product page. The article also says 15% of 1,026 US online shoppers abandoned in the last quarter because the return policy was unsatisfactory, and it points readers at the cart-abandonment page. That page, updated 22 September 2025, now says 13% for the same reason. Both numbers are printed; they are not reconciled on the public pages.
- Gifting on the product page: 78% don’t. Low relevance for components.
- Staff replies to negative reviews, styled differently from the review: 89% don’t. Testing found replies read as evidence of reachable support. No conversion percentage is published.
- A carousel across reviewer-submitted images: 63% don’t. Testers treated customer photos as a check on whether the site photos were representative.

**Spec tables.** The only fully public spec-sheet article is from 27 March 2018, so its benchmark rates are not a 2026 measurement. It says 50% of sites had spec sheets that were hard to scan; 23% did not group specs into sections; sheets longer than about 20 specs need titled groups; only 3% summarized key specs; 23% used no visual aid such as alternating rows; 20% used multiple columns, which some users misread as a comparison of two products; eye-tracking showed alternating row color made label-to-value tracing faster and more reliable; 52% did not post-process vendor-supplied data into a consistent structure. — [Spec sheet scannability](https://baymard.com/research-articles/spec-sheet-scannability)

**Images on lists.** Updated 9 September 2025: 80% of sites do not offer 3 or more thumbnails in the list. Two images were often not enough for visually complex goods. Apparel may need 5–15. One extra thumbnail is described as not enough; two additional thumbnails are called a minimum. 42% do not combine variations into one list item, which clutters the list when the variations are colors of the same product. — [Product List UX 2025](https://baymard.com/research-articles/current-state-product-list-and-filtering)

**Reviews in the list.** A separate listing article says five attributes are so basic that users avoid items that lack them: price, title or type, thumbnail, ratings average plus the count of ratings, and variations. It explicitly says small or direct-to-consumer sites do not have as much need to offer site-provided reviews. The “50% get it wrong” and “35% don’t” rates on that article were not re-benchmarked in the 2025 list article, so treat them as older. — [What to display in product listings](https://baymard.com/research-articles/product-listing-information)

**Shipping cost visibility.** The behavior study is old (20 June 2017) and should not be quoted as a 2026 user percentage without that date. It says 64% of test users looked for shipping cost on the product page before add-to-cart; 43% of sites showed no shipping cost or calculator there; 16% did not show it even in the cart; 21% of US shoppers in that era abandoned because they could not see the total before starting checkout. Shipping mattered more when it was a large share of a cheap item (a $4.34 DVD with $4.97 shipping) than when it was a small share of an expensive item. Best-to-worst estimate methods in that test: flat lowest rate; IP geo estimate; the signed-in user’s last destination; a stated range. The estimate needs a label of what it assumes, and a way to change the destination. — [Show shipping costs on product pages](https://baymard.com/research-articles/show-shipping-costs-on-product-pages)

The newer implementation rate, not the same statistic, is the March 2026 product-page article: 67% do not show a total-order-cost estimate near Buy.

**Checkout friction, benchmark updated 25 November 2025.** 41,000+ checkout scores. 64% of desktop and 63% of mobile sites are “mediocre or worse”; only 2% are “good”; 15% of desktop sites are “poor” or “very poor”; 46% of apps are “mediocre or worse”; 7% of apps are “good”; none are perfect. The article says checkout design was frequently the sole cause of abandonment in 16 years of testing, and that the average large site “can gain as much as a 35% increase in conversion rate” from checkout design changes. The abandonment statistics page states the modeled figure more precisely as 35.26%, and then multiplies it by “$738 billion” of US and EU ecommerce sales to get “$260 billion” recoverable. That dollar figure is Baymard’s model. The page does not show the arithmetic inputs, the year of the $738 billion base, or an independent A/B test. Do not treat 35.26% as the expected lift for a small parts shop. — [Checkout UX 2025](https://baymard.com/research-articles/current-state-of-checkout-ux); [Cart abandonment statistics](https://baymard.com/lists/cart-abandonment-rate)

The abandonment page’s average cart-abandonment rate is 70.22%, the mean of 50 studies from 2006 through a 2025 Uptain figure, last updated 22 September 2025. The checkout article rounds this to 70%. This average mixes window-shopping with genuine checkout failure.

Among people who were not “just browsing,” the same page’s latest quantitative study prints:

- 42% abandoned because they were just browsing or not ready (this slice is excluded from the list below)
- 40% extra costs too high (shipping, tax, fees)
- 20% delivery too slow
- 19% did not trust the site with the credit card
- 18% the site wanted an account
- 17% checkout too long or complicated
- 17% the website had errors or crashed
- 13% returns policy unsatisfactory
- 12% could not see or calculate the total up front
- 10% the card was declined
- 9% not enough payment methods
- 7% don’t know

The checkout article’s separate survey of 1,026 US adults says 18% abandoned because they did not want to create an account. That matches the 18% on the statistics page. A February 2024 Baymard wave, as reported by eMarketer (n=1,012), had extra costs at 48%. A Statista chart dated 28 May 2025, citing Baymard, shows a slightly different 2025 distribution (39% extra costs, 21% slow delivery, 19% account, 19% card distrust, 18% long checkout, 15% returns, 15% errors, 14% could not see the total, 10% payment methods, 8% card declined). The numbers used above are the ones printed on baymard.com on the page updated 22 September 2025. The other waves are real publications, not rounding of the same table.

Checkout design findings from the November 2025 article:

- Guest checkout is not the most prominent option on 62% of sites. An earlier public article (17 January 2023) said 47% of sites that offer guest checkout do not make it prominent. The 2025 article is the later benchmark. A guest option presented as a text link, or below the sign-in fields, was missed. On mobile, autofocusing the email field can cover a guest button with the keyboard.
- Overly complex password rules: 65% don’t avoid them. Baymard says strict rules plus a fragile reset email can cause up to a 19% checkout-abandonment rate among existing account holders. Their recommendation is a 6–8 character minimum only, because an ecommerce site can add other controls, and they note 2FA and magic links can be both easier and safer. This is a usability recommendation, not a security standard.
- Delivery date, or a date range, instead of “2 business days”: 48% don’t. Testers calculated calendars and misread “2–3 days” as calendar days from today.
- Order-by cutoff as a countdown in the user’s terms (“order in the next 43 minutes”), not a static “1pm ET”: 83% don’t. Static times were misread as the delivery date and caused time-zone arithmetic.
- Cart quantity as buttons, or buttons plus a text field that does not append to the existing digit: 97% don’t. Some orders were placed with the wrong quantity. Mobile was worse.
- All fulfillment choices inside the shipping step, not only on the product page: 52% don’t.
- Mark both required and optional fields: 61% don’t. When only optional fields were marked, 32% of participants skipped at least one required field. Marking only required fields did not fix it. “All fields are required” at the top was missed.
- Uncommon optional inputs (address line 2, company) hidden behind a link, and no radios or dropdowns for purely optional choices: 32% don’t choose the right control. Optional fields were observed to make some steps 5–30% longer and to cause wrong data.
- Adaptive error text that names the specific failed rule (“card number is incomplete”), not one generic “invalid”: 94% don’t. Specific text shortened recovery and, in testing, sharply reduced the share who gave up. No numeric reduction is published.
- Explain why a phone number is required, or don’t require it. 49% don’t explain. “Over 70%” of survey respondents were reluctant to give a phone number. Testers entered fake numbers or left.

Form length, from the abandonment page: an ideal flow can be 12–14 form elements (7–8 if only fields count). The average US checkout in their benchmark shows 23.48 elements by default (14.88 fields). They say a 20–60% cut in default elements is possible for most checkouts. The benchmark of 60 leading sites found 39 potential checkout improvements on the average site. That “60 sites / 39 improvements” line sits next to older research wording (“past 10 years”) and may not be the 2025 41,000-score set.

**Lists, filters, search, which feed the product page.** Updated 9 September 2025: 58% of desktop and 78% of mobile sites are mediocre or worse on product lists (21,000+ scores, 170+ sites). 14% do not let users combine several values of one filter. 51% lack at least one of price, ratings, color, size, and brand. 20% do not show applied filters in an overview. 69% lack at least one of price, rating, best-selling, and newest sorts (the body also says 68% of desktop and 69% of mobile). Horizontal filter bars hide the option list and were only comfortable with a small set of filters, about eight on apparel sites. — [Product List UX 2025](https://baymard.com/research-articles/current-state-product-list-and-filtering)

Search, updated 29 April 2026: 10,000+ ratings, 170+ sites and apps. 56% fail to support search adequately. 46% of desktop, 58% of mobile, and 64% of apps are mediocre or worse. 44% are decent or good. Four desktop sites and one mobile site are “perfect,” which is unlike product pages and checkout. Across rounds of testing, roughly half of participants preferred search and half preferred navigation. Exact title, model, or SKU search still has issues on 12% of sites, while the same section also says a third of sites tested were mediocre or worse on exact search. Those two rates are both printed and are not the same claim. If an exact model search misses, testers concluded the site did not carry the item. Feature queries such as “100000 IOPS hard drive” fail on 39% of sites. Product-type queries have issues on 20%. — [Ecommerce Search UX 2026](https://baymard.com/research-articles/ecommerce-search-query-types)

Autocomplete, published 2 August 2022 and not refreshed in the 2026 search article: present on 80% of sites (72% in 2014); only 19% get the design details right. — [Autocomplete design](https://baymard.com/research-articles/autocomplete-design)

**NN/g, qualitative, older than the Baymard benchmarks.** The public mobile-checkout article (2 December 2018, fourth-edition ecommerce study) says: open the cart directly from the cart icon; give each line a Remove control rather than quantity zero; do not require a separate Update action; put guest checkout above the fold and above sign-in; put the order summary at the top on mobile, expanded; use the right keyboard; let ZIP fill city and state while remaining editable; make browser autofill work, because a broken autofill is blamed on the site; use a text field rather than a long state or expiry dropdown on mobile; offer a familiar wallet such as PayPal or Apple Pay, repeat it on the payment step, and do not flood the page with options. Wallet pay was perceived as more trustworthy than typing a card number. No abandonment percentage is attached. — [The Mobile Checkout Experience](https://www.nngroup.com/articles/mobile-checkout-ux/)

NN/g’s error rubric (public article, not a benchmark percentage): put the message next to the field; use multiple accessible indicators reserved for real errors; do not use a modal for a simple field error; do not show the error before the user has entered something; write at a 7th–8th grade level; say what is wrong and how to fix it; do not blame the user; keep what they typed. — [Error messages scoring rubric](https://www.nngroup.com/articles/error-messages-scoring-rubric/); [Hostile error patterns](https://www.nngroup.com/articles/hostile-error-messages/)

NN/g’s expectations article (10 June 2018; 7 researchers, 63 tasks, 49 B2C sites, 16 lab participants, plus smaller studies) is qualitative. Participants became skeptical when inventory, fees, dates, or product facts were vague or wrong, and they wanted the shipping number before checkout. — [Changes in users’ expectations](https://www.nngroup.com/articles/ecommerce-expectations/)

NN/g’s filter article is also qualitative: filters must be appropriate to the product type, predictable, and ordered with general criteria first. It names brand, material, color, rating, price, size, and availability as common, and says those common ones are not enough for appliances versus other goods. Laptops are the example of obscure filters that still need a sensible order. — [Filter categories and values](https://www.nngroup.com/articles/filter-categories-values/)

The full NN/g ecommerce search report (139 guidelines) and trust report (53 recommendations) are paid. Their public landing pages do not include the statistics, so those reports are not used as numeric evidence here.

### Inferences

Rules for this catalog:

1. On every product page, next to the price, show the lowest shipping cost for one unit, or “free over $X,” with the assumption in the label (for example “flat rate in the US”). If the rate depends on destination, show a range or a postal-code field on the page, not only after checkout starts.
2. In the cart and on the shipping step, show a delivery date or date range, and a countdown to the cutoff if same-day or next-day shipping exists. Do not say only “2–4 business days.”
3. Guest checkout is a primary button at the top of account selection, labeled “Guest checkout.” Do not autofocus a field that covers it on a phone. Offer account creation after the order, for reorder, not as the price of paying.
4. Default checkout shows only the fields needed to ship and pay. Mark every field required or optional. Hide company and address line 2 behind a link. Ask for a phone number only with a one-line reason, or leave it optional.
5. Quantity in the cart and on the product page is minus, a field that replaces the current number, and plus. Removing a line is a separate control, and it does not require setting quantity to zero or pressing Update.
6. Errors name the broken rule, sit on the field, keep the typed value, and do not appear before the person leaves the field.
7. Specs are one column, grouped (electrical, package, environmental), with alternating rows. A sheet longer than about 20 rows leads with the specs that choose the part (voltage, current, package, interface) and repeats them in the full table. Do not lay two spec columns side by side.
8. The gallery includes one in-scale reference (a dimensioned drawing, a grid, or a familiar object). A lifestyle model is not required for a component. Customer photos are optional until there are enough real orders to support them; do not invent ratings. If reviews exist, answer the negative ones in a visually distinct staff style.
9. Search must return the product when the query is the exact manufacturer part number or the shop SKU, including a copy-paste from a datasheet. Attribute queries (“5V regulator”, “ultrasonic”) must hit the spec fields. A miss on an exact part number is treated as “we don’t sell it.”
10. Do not merge distinct orderable part numbers into one list card. Baymard’s “combine variations” finding is about colorways of one product. A 3.3V and a 5V regulator are different parts.
11. List cards for parts show part number, price, a truthful thumbnail, and the one or two specs that distinguish siblings. Three consumer thumbnails are not the goal when the part is not visually evaluated. Ratings are not a requirement while the catalog is small; Baymard says small shops have less need for on-site reviews.
12. Password rules, if accounts exist, stay at a short minimum and must allow paste and a password manager. Guest checkout is the path that avoids the 19% account-holder reset failure mode.

### Gaps

- The detailed guideline text behind the public “% don’t” headlines is paywalled. The public articles state the rate and the observed behavior, not the full scoring rubric.
- The 64% “looked for shipping on the product page” figure is from 2017. The 2025 abandonment page’s “12% could not see the total” is a different question and a later sample. Both are cited above; neither was re-measured in a 2026 public study that was opened.
- The 15% versus 13% returns-abandonment conflict is unresolved.
- Statista’s 2025 chart was not opened beyond the search extract, and it does not match the Baymard page fetched on 19 October 2026.
- No public Baymard percentage was found for “how many sites show a numeric stock count” or “how many spec tables are accessible.”
- The 35.26% conversion claim and the $260 billion figure are Baymard’s extrapolation. The public page does not document an A/B test.
- NN/g’s “27% of task failures were failing to locate a suitable item” appears in a search snippet for [The State of Ecommerce Search](https://www.nngroup.com/articles/state-ecommerce-search/). The full article was not opened, so that number is not used.
- redBus’s claimed sales lift is mentioned on [Why speed matters](https://web.dev/learn/performance/why-speed-matters) as a 7% sales increase after an INP improvement. The case-study URL `https://web.dev/case-studies/redbus` returned 404 on 19 October 2026, so the study details were not verified.

## What does research say about technical and B2B buyers versus consumer shoppers?

### Takeaway

Baymard’s 2024 study of electronic-component sites found that engineers and buyers will not purchase from specs they cannot verify: they want the datasheet, a numeric stock count, price breaks, and a table they can sort, and they use desktop for that work. They still interpret ordinary interface patterns the way consumer shoppers do, so guest checkout, visible totals, and plain error text still apply. What does not transfer is apparel logic: color swatches, human models, and a ratings-first list.

### Cited Findings

**Baymard B2B electronic components and machinery, published 8 May 2024.** 2,500+ hours, 168 moderated think-aloud sessions, all participants industry professionals in engineering, purchasing, or manufacturing. 15 manufacturer and distributor sites (Analog Devices, Microchip, ST, TDK, TE, Arrow, CoreStaff, Digi-Key, Farnell/Newark/element14, Future, Mouser, RS, TTI). 1,100+ medium-to-severe issues, distilled to 275+ guidelines. The guidelines themselves are paywalled. — [B2B Electronics Sites](https://baymard.com/research-articles/b2b-electronic-components-machinery-launch)

What the public article actually shows:

- On desktop, a product table beat a card list for spec-heavy parts because people scan attributes across rows. On mobile, the same table was judged a hindrance. Baymard did not test mobile users. They recommend a normal list on mobile.
- Tested sites averaged 73% of monthly traffic from desktop, and some reached 83%. That is why the study was desktop-only. It is traffic to those distributor sites, not a universal law for a hobbyist shop.
- 100% of participants filtered, or tried to filter, the table. They preferred filters above the table rather than a left sidebar, because the sidebar stole columns. Sorting by price and by inventory was heavily used, including as a substitute for filters. Sort arrows were misread until a tooltip said what the click would do.
- Sticky horizontal scroll, persistent headers, and visible scrollbars were necessary. A scrollbar that only appeared at the bottom of a long table hid columns for nearly a minute in one session.
- List and table rows need part number, name, price including minimum order quantity, thumbnail, the category specs that distinguish the part, lifecycle, inventory, and lead time. Missing attributes on only some rows broke comparison.
- Out-of-stock rows that only revealed a replenishment date after add-to-cart or after opening the product page wasted the comparison. Mouser’s “view dates” overlay, with ship dates and factory lead time, was received well.
- On the product page, a biomedical engineer refused a part with no datasheet and went to another distributor. An electronics engineer did not trust the photo of a connector and used the datasheet drawing, in millimeters and inches, to confirm the part number and dimensions. A senior electrical engineer looked for the stock count first and said he would buy 100 if 100 were in stock, or more if 100,000 were in stock. An industrial engineer hit an error adding 200 of a microprocessor when stock was not shown. An engineer at Arrow chose the part with 1,000 in stock over a cheaper part with 30.
- The article’s minimum product-page set is: datasheet, pricing table, shipping and stock status, compatible parts, plus 1–2 images and a real description. Missing any of these caused product abandonment, and sometimes site abandonment if it looked sitewide.
- Two use modes share one page: the person who already has the part number and only needs stock and price, and the person who must read the datasheet and CAD files. Both have to be fast.
- A design engineer abandoned Arrow because the cart could not be shared with purchasing. A computer engineer wanted a saved list to send to someone else. The article does not give a percentage of participants who needed this.
- Baymard’s own framing: interface interpretation is largely shared with consumer ecommerce, because people learn interfaces on the sites they use most. Attribute sets, terminology, and purchasing preferences are not shared. Failing the table or the product page produces lost sales to a distributor that shows the data.

**Paywalled but the issue statement is public.** Guideline #2432, first observed August 2023, updated September 2025: when minimum order quantity and price breaks are missing from the product-table row, users cannot confidently choose the part. The fix text is redacted. — [Guideline 2432](https://baymard.com/guidelines/2432-minimum-order-quantity-moq-and-price-breaks-in-the-product-table-item-details)

Guideline #417, updated July 2026: out-of-stock or unavailable rows add clutter for people who need something they can actually have. The advice is redacted. — [Guideline 417](https://baymard.com/guidelines/417-product-status-filters)

**Consumer findings that still bind a parts checkout.** Guest checkout, upfront totals, delivery dates, adaptive errors, and phone-number reluctance are from general US/EU shoppers, not from the 168 engineers. Baymard says the low-level interface behavior transfers. The 2025 abandonment reasons (account, card trust, extra cost) are therefore still the right checkout constraints for a one-time hobbyist or a small-business buyer who is not on contract pricing.

**Vendor survey, not a usability lab.** BigCommerce hired Price Intelligently by Paddle. Survey of May 2023, n=1,006 B2B buyers (US 508, UK 261, Australia 237), age 18+, employed, allowed to buy for the business, purchasing more than twice a year. This is a platform vendor’s buyer survey. It is not Baymard or NN/g. — [Global B2B Buyer Behavior Report (PDF)](https://www.swktech.com/wp-content/uploads/2023/11/BigCommerce-Report-Co-Branded.pdf)

Figures printed in that PDF:

- Most frustrating pain, ranked by respondents: inaccurate pricing and shipping costs 40%; slow load 29%; poor customer support 28%. The ranked list also included complicated checkout, privacy, poor search, lack of payment options, hard to contact support, no real-time inventory, and limited discount flexibility. Only the top three have percentages in the prose.
- 31% said technical issues at checkout were what would most likely stop them completing checkout. Complicated checkout was 15%. UK respondents picked lack of a secure checkout at 30%, versus 20% US and 21% Australia.
- The checkout feature they valued most was a display of the complete, accurate total, ahead of mobile optimization and auto-renew.
- Features that “resonate” in aggregate: detailed product information, and custom pricing or discounts. Frequent buyers leaned toward bulk ordering. Buyers with many approval steps leaned toward reorder and account tools. The report says suggestions based on history were not why they chose a supplier website.
- Credit and debit cards were the most-used payment methods; ACH and purchase-order invoicing “follow closely.” US electronic checks 21% and physical checks 18% are the only other payment percentages printed in the extract.
- A BigCommerce employee says buyers are “typically returning to make a repeat purchase.” That sentence is an author comment, not a survey result. No repeat-purchase rate is printed.
- The report’s “use a one-page checkout” sentence is a product-marketing conclusion by BigCommerce staff. It is not a test result. Baymard’s public checkout articles do not establish that a single page outperforms a short multi-step flow; they establish that the number of fields, guest access, cost visibility, and error text do.

An agency blog, Echidna’s “9 fixes,” repeats the same pattern (show every part number, specs in a table, datasheet as backup, stock with a date, quantity rules on the page, quote and list beside add-to-cart). It cites no study. It is not used as evidence.

### Inferences

Rules that differ from a normal consumer shop:

1. Every orderable part has its own manufacturer part number, visible in the list, in search results, and beside the title, and selectable as text so it can be copied.
2. Search indexes that part number, the shop SKU, and common alternate names. Exact match lands on that part.
3. The product page shows a datasheet download on the first screen. Key specs are also in HTML on the page, so the PDF is the verification document, not the only place the voltage is written.
4. Stock is a number, or an honest “not stocked, lead time X,” in the list and next to the quantity field. Adding more than the available quantity is blocked on the product page with the number that is available, not by a surprise error in the cart.
5. If a minimum quantity or a pack multiple exists, the quantity field states it and enforces it before add-to-cart. Price breaks, if any, are in the same buy area.
6. Desktop catalog default for a family of similar parts is a table with sticky headers, a visible horizontal scroll, and sort on price and stock. Mobile is a list of the same facts, not a pinched table. Filters sit where they do not cover the part number; on a phone they are a disclosure, with applied filters shown as removable chips.
7. The cart can be left and resumed, and a line list can be copied or shared as plain text (part number, quantity, price). A multi-person approval workflow is out of scope for this shop; a shareable list is the part of that need a small shop can meet.
8. Guest checkout stays. Contract pricing, net-30 terms, and punchout are not supported by a finding that this shop must build them. The BigCommerce survey says cards are the common method and that the total must be accurate. Offer a card and one familiar wallet; do not imply ACH or purchase orders unless they actually work.
9. Reorder is a logged-in convenience after the first guest order, not a gate. There is no published rate that says repeat purchase is the majority of a small component shop’s orders.
10. Compatibility and “replaces” only when the shop actually knows them. The B2B article lists compatible parts as page content that prevented abandonment. Inventing a cross-reference would violate the accuracy finding from NN/g.

### Gaps

- No public 2025 or 2026 retest of the B2B electronics study was found. Baymard’s 2026 roadmap says a “B2B Electronic Components & Machinery” benchmark was planned for the first half of 2026. Whether it shipped was not confirmed on a page that was opened.
- Mobile behavior of engineers was not tested. The 73% desktop-traffic figure is for the large distributors in the sample.
- No verified percentage for “share of component orders that are repeat purchases,” “share of buyers who require a datasheet,” or “guest versus account among technical buyers.”
- Price-break and MOQ guidance beyond the one-sentence issue statement is paywalled.
- The BigCommerce 40% / 29% / 28% / 31% figures are a 2023 vendor survey. They are not a substitute for the Baymard lab study.

## What accessibility requirements do premium sites still fail, and which WCAG 2.2 criteria matter most?

### Takeaway

There is no public manual audit that says “premium electronics shops fail WCAG 2.2 at rate X.” What is measured is automated detection on the top million homepages in February 2025: 94.8% had at least one detectable WCAG failure, and pages classed as Shopping were worse than average. The criteria that change a catalog, a cart drawer, and a checkout are the ones those crawls already fail (contrast, names, labels, alt text) plus the WCAG 2.2 additions that sticky headers, drawers, quantity steppers, and login forms violate (focus not obscured, 24px targets, redundant entry, accessible authentication, consistent help).

### Cited Findings

**WebAIM Million, February 2025, top 1,000,000 homepages (Tranco).** WAVE on the rendered DOM. 50,960,288 errors, average 51 per page, down 10.3% from 56.8 in 2024. Errors are defined as barriers with a very high likelihood of being WCAG 2.2 A/AA failures. The report says automated tools miss many failures, so full conformance is certainly rarer than “no detected errors.” 94.8% of homepages had a detected failure, versus 95.9% in 2024 and 97.8% six years earlier. 23.4% had 5 or fewer errors; 33.6% had 10 or fewer. — [WebAIM Million 2025](https://webaim.org/projects/million/2025/)

The six types that are 96% of detected errors, and the share of homepages:

- Low-contrast text: 79.1% (average 29.6 instances, down from 34.5 in 2024)
- Missing image alternative text: 55.5%. 18.5% of images lacked alt (about 11 per page). 44% of those were linked images. One in five linked images had no alt.
- Missing form labels: 48.2% of homepages. Separately, 34.2% of form inputs were unlabeled (via label, aria-label, aria-labelledby, or title). Average 6.3 inputs per homepage.
- Empty links: 45.4%
- Empty buttons: 29.6%
- Missing document language: 15.8%

Other measured facts that affect a catalog:

- Skipped heading levels on 39% of pages (up from 37.9%). 16.3% had more than one h1. 9.8% had no headings.
- A main landmark on 42.6%. A search landmark on 16.6%.
- Skip link on 15.3%, and one in ten of those was broken.
- Pages that use ARIA averaged 57 errors, versus 27 on pages without it. ARIA menus were on 4.5% of pages, and 35% of those menus lacked the required markup.
- Category labels were assigned by Amazon Bedrock, so the category cut is an AI classification, not a hand taxonomy. Shopping homepages averaged 71.2 detected errors, 39.8% above the 51-error average. That is the worst category in the published table. It is homepages, not product or checkout templates, and it is not a hand-check of “premium” brands.

**HTTP Archive Web Almanac 2025, accessibility chapter.** The fetched page says only about 30% of sites had sufficient contrast in the figure description for 2025, and the prose says 31% of mobile sites meet minimum contrast, up about 1 point from 2024. The page itself is inconsistent between 30 and 31. Either way, passing contrast is still a minority. Contrast rules restated there: 4.5:1 for normal text, 3:1 for large text, at AA. — [Web Almanac 2025 accessibility](https://almanac.httparchive.org/en/2025/accessibility)

**WCAG 2.2, W3C Recommendation, 5 October 2023.** Nine new success criteria. 4.1.1 Parsing was removed. The new ones, with the level that a typical AA target includes: — [What’s New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/); [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

- 2.4.11 Focus Not Obscured (Minimum), AA. When a component receives keyboard focus, author content must not hide it completely. Sticky footers, sticky headers, and non-modal dialogs are the examples in the understanding document. A cookie banner that covers the focused control fails. Partial overlap still passes AA; covering none of it is AAA (2.4.12).
- 2.4.13 Focus Appearance, AAA. Not required for an AA target. A visible focus indicator is still required by the older 2.4.7 Focus Visible (AA).
- 2.5.7 Dragging Movements, AA. Anything the site implements as a drag needs a single-pointer alternative, unless dragging is essential.
- 2.5.8 Target Size (Minimum), AA. Pointer targets at least 24 by 24 CSS pixels, or spaced so that 24px circles centered on the targets do not overlap, with exceptions for inline text links, equivalent larger controls, user-agent controls, and essential presentation. This is the AA bar. The older 2.5.5 Target Size at 44 by 44 is AAA.
- 3.2.6 Consistent Help, A. If human contact details, a contact mechanism, self-help, or an automated contact mechanism appear on multiple pages, they stay in the same relative order.
- 3.3.7 Redundant Entry, A. Information the user already entered in the same process is auto-filled or available to select, unless re-entry is essential, needed for security, or the old value is no longer valid.
- 3.3.8 Accessible Authentication (Minimum), AA. A step must not require a cognitive test (remembering a password, transcribing a one-time code, solving a puzzle) unless there is an alternative method, or a mechanism that helps (password manager and paste both count), or the test is object recognition or personal content. 3.3.9 (AAA) also disallows object-recognition puzzles unless an alternative or an assistive mechanism exists.

Older criteria that the WebAIM failures map onto, and that a catalog still has to meet for AA:

- 1.1.1 Non-text Content, 1.3.1 Info and Relationships (spec tables and data tables), 1.3.5 Identify Input Purpose (autocomplete on checkout fields), 1.4.3 Contrast (Minimum), 1.4.10 Reflow, 1.4.11 Non-text Contrast, 1.4.13 Content on Hover or Focus
- 2.1.1 Keyboard, 2.1.2 No Keyboard Trap, 2.4.1 Bypass Blocks, 2.4.3 Focus Order, 2.4.7 Focus Visible, 2.5.3 Label in Name
- 3.3.1 Error Identification, 3.3.2 Labels or Instructions, 3.3.3 Error Suggestion, 3.3.4 Error Prevention for legal and financial transactions
- 4.1.2 Name, Role, Value; 4.1.3 Status Messages (add-to-cart confirmation)

Baymard’s UX benchmarks are not accessibility conformance audits. “No site has a perfect product page” is a usability score, not a WCAG result.

### Inferences

Catalog:

1. Body text at least 4.5:1, large text and icons at least 3:1. Muted gray part numbers fail the most common detected error.
2. Every product image has an alt that includes the part number and package, or empty alt if the part number is already the adjacent text. Linked thumbnails are named.
3. The spec table is a real table with a caption and header cells, one column, so 1.3.1 and Baymard’s single-column finding agree.
4. One h1, no skipped heading levels, a main landmark, and a skip link that moves focus.
5. Filter chips, sort buttons, and quantity steppers are at least 24 by 24 CSS pixels, or spaced so their 24px hit areas do not overlap. Icon-only controls have an accessible name (WebAIM: empty buttons on 29.6% of homepages).
6. Sort and filter do not depend on drag. If a comparison control is ever added, it also works by buttons (2.5.7).

Cart drawer:

1. Opening the drawer moves focus inside it. Tab does not escape to the page behind. Escape or an explicit close returns focus to the cart button.
2. The drawer, the sticky header, and any cookie bar do not completely cover the focused control (2.4.11). On a phone, the quantity controls and checkout button stay in view when the keyboard opens.
3. Add-to-cart announces a status message without moving focus unexpectedly (4.1.3).
4. Line remove and quantity controls have names that include the part number (“Remove NE555”).

Checkout:

1. Every input has a visible label. Placeholder text is not the label. This is the 48.2% / 34.2% failure.
2. Errors are text, tied to the field with aria-describedby or equivalent, and not color alone (3.3.1, 3.3.3, and NN/g’s rubric).
3. Billing copied from shipping is a choice, not a second typing of the same address (3.3.7). Review before payment states the total (3.3.4).
4. Guest checkout does not require a password. If an account exists, the password field allows paste and is not blocked from a password manager (3.3.8). Do not add a puzzle as the only way to pay.
5. Contact (a mailto or a phone number, or one link to the contact page) appears in the same place on the catalog, cart, and checkout (3.2.6). That is an A criterion, and it is also the trust requirement for a shop with no staffed chat.
6. Inputs use autocomplete tokens so browser autofill works (1.3.5), matching the NN/g mobile finding that broken autofill is blamed on the shop.

### Gaps

- No opened source reports a 2025 or 2026 manual WCAG audit of premium electronics retailers, cart drawers, or checkouts. WebAIM is homepages and automated. Shopping’s 71.2 average is an AI-labeled category of homepages.
- The Web Almanac page disagrees with itself between 30% and 31% sufficient contrast. The order of magnitude is the finding.
- Overlay widgets and “accessibility menus” are not given a failure rate in the sources opened. The ARIA finding (more ARIA, more detected errors) is not a finding that ARIA itself causes inaccessibility.
- 2.5.5’s 44px target is AAA. Using 24px meets the AA criterion that was checked; it is not a claim that 24px is comfortable.

## What performance budgets do current guidance and ecommerce case studies recommend, and what business effect is documented?

### Takeaway

The only budgets that current Google guidance states as pass/fail are the Core Web Vitals at the 75th percentile of real visits, separately for mobile and desktop: LCP within 2.5 seconds, INP within 200 milliseconds, CLS of 0.1 or less. There is no published universal image-kilobyte budget. Documented business effects come from a few large-site experiments and correlations. They show that improving LCP and CLS can move revenue on those sites. They do not predict a percentage for a small parts catalog, and one often-cited INP case study URL no longer resolves.

### Cited Findings

**Thresholds still published on web.dev as of the pages fetched 19 October 2026.** — [Web Vitals](https://web.dev/articles/vitals); [How the thresholds were defined](https://web.dev/articles/defining-core-web-vitals-thresholds); [INP](https://web.dev/articles/inp)

| Metric | Good | Poor | How it is judged |
| --- | --- | --- | --- |
| LCP | ≤ 2500 ms | > 4000 ms | 75th percentile of page views, mobile and desktop separately |
| INP | ≤ 200 ms | > 500 ms | same |
| CLS | ≤ 0.1 | > 0.25 | same |

A page “passes” only if all three are good at the 75th percentile. The CLS “good” line of 0.1 was chosen because internal testing found shifts of 0.15 and above consistently disruptive, and shifts of 0.1 and below noticeable but not excessively so. CrUX data cited for that choice is from April 2020 (about 60% of origins were at or under 0.1). The threshold page still presents these cutoffs; it does not publish a 2026 revision. INP replaced FID as the responsiveness vital. The INP article was last updated 2 September 2025. INP is the worst interaction latency on the page, ignoring outliers on pages with many interactions. Shopify’s help center repeats the same three cutoffs and the 75% rule, and adds Google’s non-vital page-experience items (mobile usability, HTTPS, no intrusive interstitials). That page is a restatement, not a new study. — [Shopify web performance overview](https://help.shopify.com/en/manual/online-store/web-performance/overview)

**Image weight.** [Image performance](https://web.dev/learn/performance/image-performance) says images are often the heaviest resource, and the optimization is fewer bytes and dimensions that match the display size times device pixel ratio. WebP is supported broadly; AVIF “tests have shown greater than 50% savings when compared to JPEG in some cases.” It does not set a maximum kilobyte size. [Key performance issues for images](https://web.dev/learn/images/performance-issues) says that on more than 70% of pages the LCP element involves an image. It says never put `loading="lazy"` on the above-the-fold LCP image, and use `fetchpriority="high"` on it. A Google Flights experiment with Fetch Priority, reported on the Fetch Priority article, moved LCP from 2.6 s to 1.9 s. That is a lab-style rewrite of one page, not a revenue test. — [Fetch Priority](https://web.dev/articles/fetch-priority)

A web.dev blog, [Common misconceptions about how to optimize LCP](https://web.dev/blog/common-misconceptions-lcp), as returned in search, says Chrome field data showed image download time is almost never the main LCP bottleneck, and that request delay and server response often dominate. The full article was not opened, so no further breakdown is claimed. The practical implication that was verified elsewhere still holds: bytes matter, but a byte cap alone is not the published budget.

[The most effective ways to improve Core Web Vitals](https://web.dev/articles/top-cwv) says 40% of sites in the Chrome UX Report do not meet the good LCP threshold. The extract does not date that 40%.

**Documented business effects, primary case studies.**

- Vodafone, published 17 March 2021. A/B test on a landing page. About 100k clicks and 34k visits per day per version, paid traffic, 50/50 split, no functional or visual difference other than the performance work. Field LCP was 31% better on the optimized version. Result: 8% more sales, 15% higher lead-to-visit rate, 11% higher cart-to-visit rate. DOMContentLoaded actually got 15% worse, which is why they warn against optimizing the wrong metric. Changes were server-rendered critical HTML, less render-blocking JavaScript, and image work (resized hero, SVG and PNG optimization, not loading images that were not yet visible). Absolute business numbers are redacted. — [Vodafone case study](https://web.dev/case-studies/vodafone)
- Rakuten 24. Field-data correlation, not proof of cause: a good LCP was associated with up to 61.13% higher conversion, 26.09% higher revenue per visitor, and 11.26% higher average order value; a good FID with up to 55.88% higher conversion. Separately, a one-month A/B test on one high-traffic landing page, 50/50, no other functional or visual change: the optimized version loaded 0.4 s earlier in a mobile load test, CLS improved 92.72%, FID 7.95%, FCP 8.45%, TTFB 18.03%. Business result versus the control: revenue per visitor +53.37%, conversion +33.13%, average order value +15.20%, time on page +9.99%, exit rate −35.12%. These percentages are large and specific to that page. They are not a forecast. — [Rakuten 24 case study](https://web.dev/case-studies/rakuten)
- Renault. Correlation across more than 10 million visits, 33 countries, four months, landing pages of a single-page app. Lower LCP tracked with lower bounce and more completed lead forms. The page says a 1-second LCP improvement can lead to a 14 percentage-point lower bounce rate and a 13% increase in conversions, and that on this site LCP under 1 second kept helping. This is not a controlled A/B test, and the outcome is lead forms, not a parts checkout. — [Renault case study](https://web.dev/case-studies/renault)
- redBus is cited on [Why speed matters](https://web.dev/learn/performance/why-speed-matters) as an INP improvement that increased sales by 7%. The case-study URL 404’d. Treat 7% as unverified.

Baymard does not publish an LCP or INP budget. Its checkout article does say 17% of the non-browsing abandonments in the current statistics page were “website had errors or crashed,” which is reliability rather than a millisecond budget.

The BigCommerce 2023 survey’s “slow website load times” at 29% is a stated frustration rank, not a measured timing threshold. It is vendor survey data.

### Inferences

Budgets for this shop, stated as the published pass line rather than a stricter number nobody published:

1. Field data, mobile and desktop, 75th percentile: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Lab scores are a debug tool, not the pass.
2. The product photo or the hero on the homepage is the likely LCP element. Give it explicit width and height, a modern format, a srcset matched to the slot, `fetchpriority="high"`, and do not lazy-load it. Lazy-load the rest of the gallery and below-the-fold list images.
3. Do not adopt a kilobyte cap as if it were a research finding. Compress until the image is still legible at the display size. A dimensioned line drawing of a part should be far smaller than a lifestyle photograph; the budget that matters is the LCP time.
4. CLS: the cart badge, the drawer, and late-loading fonts or banners must not shift the buy button or the price. Reserve the image box.
5. INP: quantity changes, add-to-cart, and filter changes must paint within 200 ms at the 75th percentile. Do not block the click on a large client bundle.
6. Do not quote Rakuten’s 33% or Vodafone’s 8% as the expected return. Those were A/B tests on high-traffic landing pages of large companies. The justified claim is that, on measured sites, faster LCP and stabler layout moved sales, and that a crash or a long checkout is already a Baymard abandonment reason (17% errors, 17% too long).

### Gaps

- No opened 2025 or 2026 case study measures conversion change for a small catalog or for electronic parts.
- No primary source states a maximum image weight in kilobytes.
- The 40% of CrUX origins missing good LCP was not dated in the extract.
- The redBus 7% figure could not be opened.
- FID appears in the Rakuten study because that study predates INP’s promotion. It should not be used as a current budget.

## Which trust patterns are supported by research rather than folklore?

### Takeaway

The patterns with a study behind them are: say the extra cost before the form, say the arrival date, say the return rule on the product page, let people pay without an account, explain or drop the phone number, show a real stock number, and do not publish a fact you cannot stand behind. Seals, countdown timers, fake scarcity, and “chat widgets equal trust” are not established by the sources that were opened.

### Cited Findings

**Shipping and total cost.** Among non-browsing abandonments on the Baymard page updated 22 September 2025: 40% extra costs too high, 12% could not see the total up front, 20% delivery too slow. The 2017 product-page study: 64% looked for shipping cost before add-to-cart, and the cost mattered more when it was a large fraction of a cheap product. The March 2026 benchmark: 67% of sites still do not put a total-cost estimate near Buy. The November 2025 checkout benchmark: 48% do not use a delivery date; 83% do not use a countdown cutoff. NN/g’s 2018 lab participants got frustrated when a surcharge existed but the number was only available deep in checkout or on another page. — sources in the first section

**Returns.** 60% of 1,032 respondents look for the policy on the product page (Baymard Consideration study, cited in the March 2026 article). 44% of sites do not show or link it in the main product content. Abandonment because the policy was unsatisfactory is 13% on the September 2025 statistics page and 15% in the March 2026 article’s citation of a 1,026-person survey. The direction is stable; the point estimate is not.

**Payment trust.** 19% abandoned because they did not trust the site with the credit card (Baymard statistics page). 9% because there were not enough payment methods. 10% because the card was declined, which is not a design pattern but is a reason to show a specific card error. NN/g 2018: participants used PayPal or Apple Pay to avoid typing, and perceived those as more secure than giving the card to the site. Too many options caused choice overload in that same article. The BigCommerce survey (vendor, 2023) says cards are the most-used B2B method and that UK buyers in that sample ranked an insecure checkout as their top stopper (30%). No opened study says a particular badge (“Norton”, “McAfee”) raises conversion.

**Account and data.** 18% abandoned because the site wanted an account (Baymard, both the 1,026 survey in the checkout article and the statistics page). Over 70% were reluctant to provide a phone number; unexplained required phone fields produced fake numbers and abandonment (checkout article, November 2025). NN/g’s assurance theme (2018) is qualitative: if people are unsure the site protects their data, they are less likely to return. The study does not rank trust badges.

**Stock honesty.** In the 2024 component study, stock quantity was sometimes the first fact an engineer looked for, changed which part won, and an add of 200 units failed when the count was hidden. A replenishment date hidden until the cart was a failure. NN/g 2018: wrong or vague inventory, dates, and product identity made participants question whether the site knew its own goods. One participant rejected a shop after a product was mislabeled. The quote is about a dog breed, and the principle they draw is accuracy of the fact on the page. Guideline #417’s public issue line says unavailable products add clutter for people who need something now. No public percentage says “show the exact integer or lose X%.”

**Contact and help.** WCAG 3.2.6 (Level A) requires help mechanisms that repeat across pages to stay in the same relative order. That is a conformance requirement, not a conversion test. NN/g 2018 participants wanted a channel that fit the moment (phone, message, social) and, on one example, visible wait times. That is an expectation from a 16-person lab study plus smaller studies, not a measured lift for live chat. Baymard’s review finding (89% do not answer negative reviews) is the closest public test that a visible human response increased confidence. The BigCommerce survey ranks poor support at 28% and “difficult to contact” as a listed pain without its own percentage. A chat widget is a vendor suggestion in that PDF, not a result.

**What the research does not support.** No opened Baymard, NN/g, or web.dev page finds that countdown scarcity, “only 2 left” when the number is false, trust-seal clip art, or a newsletter modal increases trust. Baymard’s cutoff countdown is a true order deadline, not a marketing timer. Fake stock would contradict both the component study and NN/g’s accuracy finding. The product-page article’s gifting guidance is for gift retail, not for parts.

### Inferences

Rules:

1. Shipping cost, the free-shipping threshold if one exists, and the return rule (how many days, who pays postage, and whether a static-sensitive or soldered part can come back) are on the product page and again in the cart before payment.
2. The arrival estimate is a date. If the shop cannot promise a date, say the dispatch window in calendar terms and do not imply a carrier promise.
3. Stock is the number on hand, or “built to order / lead time,” and it matches what add-to-cart will allow. Never show “in stock” for a part that will error at quantity 2.
4. Payment is guest checkout, card fields with a specific error if the number is incomplete, and one wallet the shop can actually clear. Do not add payment logos for methods that are not offered.
5. The phone field is optional or explained in one line (“used if the carrier cannot deliver”). Do not require an account to pay.
6. A contact link or address sits in the same footer position on the catalog, the cart, and checkout, and it is a real inbox. Live chat is not a research requirement for this shop.
7. Part number, voltage, package, and pinout on the page must match the datasheet. If they might not, link the manufacturer PDF and do not retype unchecked specs into the marketing description.
8. If there are no customer reviews yet, show nothing, rather than a fabricated average. Baymard’s small-site note and NN/g’s accuracy finding agree.

### Gaps

- No opened study isolates the conversion effect of a trust seal, a physical address, or a live-chat widget for a small shop.
- Returns abandonment is 13% or 15% depending on which Baymard page is current. The design rule (show the policy on the product page) is in both.
- “Over 70% reluctant to give a phone number” is Baymard’s summary of its survey. The sample size for that particular item is not printed in the checkout article.
- B2B stock behavior is qualitative (session quotes), not a percentage of engineers.
