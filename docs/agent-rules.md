# Agent rules

These rules bind every change until the site is finished. They outrank a screenshot, a component library default, and a preference for “making it pop.”

## Before editing

1. Read [change-plan.md](change-plan.md) and do the earliest unfinished item that your task touches. Do not jump to the visual layer while items 1–4 are false.
2. Read the one other manual your task requires. The map is in [README.md](README.md).
3. Re-read the files you will change. The audit dates from 19 October 2026.

## The product

- This is a Hall Road sourcing desk with a short catalog. Keep that. Do not turn it into a marketplace, a flagship film, or a DigiKey clone.
- One screen serves both readers. The job sentence and the part-number block are visible together, without a scroll, at a 1280px desktop width and at a 390px phone width.
- Two different manufacturer part numbers are two products. Do not merge them into one card with a variant picker.
- A new page needs a job a buyer has on this shop. Account dashboards, review systems, BOM upload, and parametric search are out of scope until [change-plan.md](change-plan.md) says otherwise.

## Facts

- A sentence may ship only when a content field, the shipping module, or a server check can still prove it after the cart closes.
- If the operator has not supplied a real account number, phone, datasheet, stock count, or photograph, omit the control. Do not invent a substitute, a placeholder number, or a “100%” claim.
- The server prices the order. Client-supplied totals are ignored.
- Stock is a number. The add control cannot exceed it.
- Do not cite Baymard’s 35% checkout model, Vodafone, Rakuten, or redBus as a reason this shop will make more money. Cite them only as outside evidence that speed and checkout clarity have moved sales on those sites.

## Visual work

- Use the tokens, type roles, and spacing scale in [design-system.md](design-system.md). A value used twice becomes a token. A value off the spacing scale does not ship.
- The chromatic signature is the copper rule under the part number. Do not add a second accent, a gradient, or a glow.
- Catalog motion is a response to an action, under a quarter-second, with no bounce. Honor `prefers-reduced-motion`.
- Do not add dark mode, a theme toggle, or a new font in this pass.
- Do not restyle a page by pasting hex into a `style` attribute. The existing pages do this. New work stops doing it, and touched pages lose it.

## Commerce behavior

- Guest checkout stays the path.
- Shipping cost and the return rule are visible before payment. The review step adds no fee.
- Search that misses an exact part number means the shop does not sell it. Do not “correct” the buyer into a different part without saying so.
- Buttons say what happens. The control that says “Add to cart” produces a confirmation that says “Added.” The same words continue through the flow.
- Errors name the broken rule and sit on the field. They do not apologize, and they do not clear the typed value.

## Engineering

- Interactive UI is a Preact island: cart, quantity, mobile navigation, and any control that must move with the pointer. Everything else stays Astro.
- Price, shipping windows, and stock rules each live in one module. Pages render those modules. They do not retype the policy.
- Do not trust the browser for money, stock, or the Turnstile result.
- Do not inject a search query or any buyer string into HTML.
- `DROP TABLE` is not a migration.

## Verification

A UI, layout, copy, routing, or client-state change is unfinished until it has been exercised in a browser. A screenshot of the first paint is not that exercise.

- Walk the flow a buyer walks: search, open, add, change quantity, open the drawer, check out.
- Check the other surface that reads the same state. The cart drawer, the checkout summary, and the product page must show one price.
- Check a 390px viewport and a desktop viewport when layout moved.
- Check the empty state when a filter, a search, or a cart can be empty.
- Check the keyboard path when a drawer, a dialog, or a form changed: Tab, Shift-Tab, Escape, and visible focus.

If no browser is available, say what you could not verify. Do not describe an unrun checkout as working.

## When you are unsure

Prefer the quieter, more specific, more provable version. Leave a short note in the pull request or the session summary naming the file you followed and the claim you refused to invent.
