# Agent rules

These rules bind every change, by a person or an AI agent, until the site is finished. They outrank a screenshot, a library default, and a wish to "make it pop".

## Before you edit

1. Open [change-plan.md](change-plan.md). Do the earliest unfinished item your task touches. Do not restyle a page while an earlier item on it is still open.
2. Read the one manual your task needs (map in [README.md](README.md)).
3. Re-read every file you will change. Line numbers in these docs drift.
4. Start the dev server in the background: `astro dev --background` (manage with `astro dev status`, `astro dev logs`, `astro dev stop`). Do not start a second server if one is already running on port 4321.

## Truth

- A sentence ships only if a content field, the shipping module, or a server check can still prove it after checkout.
- If the owner has not supplied a real phone number, address, account number, datasheet, stock count or photograph, leave the control out. Never invent a placeholder, a sample number, or a "100%" claim. Log the gap in [decisions.md](decisions.md).
- The server prices every order. Client totals are compared and then ignored.
- Stock is an integer. No control may add more than the stock count.
- No fake urgency. A countdown appears only when it counts down to the real dispatch cutoff from the real clock in `Asia/Karachi`.

## Visual work

- Use only the tokens, type roles, spacing scale, radii, shadows and motion values in [design-system.md](design-system.md). If a value is not there, you may not use it. If you need it twice, propose a token in the same change.
- No hex, `rgb()`, or `oklch()` literals outside the tokens file. No inline `style` attributes for visual properties. No Tailwind arbitrary values (`p-[13px]`, `bg-[#...]`).
- One accent hue. `action` blue is for the primary action on light surfaces. `signal` blue is the only vivid color on navy. Status colors (`ok`, `low`, `out`) appear only next to a stock count or a result, always with text.
- The socket tab is the only signature shape. Use it only where [design-system.md](design-system.md#signature-the-socket-tab) allows.
- Motion answers an action: 120–320 ms, ease-out, `transform` and `opacity` only. No bounce on UI that was not flicked. Honor `prefers-reduced-motion`.
- Do not add dark mode, a theme toggle, a new font, an icon library, or a UI component library without a decision logged in [decisions.md](decisions.md).
- When you touch a page, remove its inline styles and dead classes in the same change.

## Commerce behavior

- Guest checkout is the only path. Accounts, if they ever exist, are offered after the order.
- Delivery cost (or the exact rule that sets it) and the return rule are visible before the buyer commits. The last step adds no surprise fee.
- Exact part-number search never misses a part the shop sells. A miss means the shop does not sell it; say so and offer WhatsApp. Do not silently "correct" to a different part.
- A button says what happens. "Add to cart" produces "Added". The same words carry through the flow.
- Errors name the broken rule, sit on the field, keep the typed value, and do not apologize.

## Engineering

- Astro renders everything that does not need the pointer. Preact islands only for cart, quantity, search, mobile navigation, drawers and checkout controls.
- Price, stock rules, shipping windows, phone rules and shop details each live in exactly one module in `src/lib/`. Pages render those modules. Pages never retype policy text.
- Never trust the browser for money, stock, or Turnstile. Never inject a buyer string or search query into HTML.
- Migrations are forward-only. `DROP TABLE` is not a migration.
- Keep the first-load JavaScript of a product page under the budget in [engineering.md](engineering.md#performance-budgets).

## Verification

A UI, layout, copy, routing or client-state change is not done until [qa.md](qa.md) passes. At minimum:

- Exercise the real flow in a browser: search, open a part, add, change quantity, open the cart, reach checkout.
- Screenshot at 390px and 1440px and compare against `docs/design/screens/`.
- Check the empty state, the keyboard path (Tab, Shift+Tab, Escape, visible focus) and reduced motion when relevant.
- Run `npx astro check` and the test suite once they exist.

If you could not run a browser, say exactly what you did not verify. Never describe an unrun checkout as working.

## When you are unsure

Choose the quieter, more specific, more provable version. In your summary, name the doc you followed and any claim you refused to invent.
