# QA: definition of done

A change is done when every item that applies is checked. Paste the checked list, with screenshots, into the pull request or the agent summary.

## Always

- [ ] `npx astro check` passes with zero errors.
- [ ] Unit and E2E tests pass (once `tests/` exists).
- [ ] No hex, `rgb()`, `oklch()` literals outside `src/styles/tokens.css`. No visual `style=""`. No Tailwind arbitrary values.
- [ ] No new claim that the data cannot prove ([copy.md](copy.md#the-truth-rule)).
- [ ] Dead code touched by the change is removed.

## Visual

- [ ] Screenshot at **390×844** (device scale 2) and **1440×900**. Also at 900px if a layout switches there.
- [ ] Compare with the matching image in `docs/design/screens/`. Type roles, radii, spacing and colors match the system.
- [ ] Edges align to the content column; numbers and their headers are right-aligned; row content is vertically centered.
- [ ] Nothing overflows horizontally at 390px (`document.documentElement.scrollWidth === 390`).
- [ ] Long content tested: the longest part number (`ESP32-WROOM-32D`), a 2-line job sentence, a 5-digit price.
- [ ] Hover, pressed, focus, disabled and selected states all render.

## Flow (any cart, product, search or checkout change)

- [ ] Search an exact part number with odd formatting (`lm 7805`) and reach the product.
- [ ] Add to cart: label confirms, count updates, sheet opens with "Added".
- [ ] Change quantity with +/−, type a quantity above stock, see the correction message.
- [ ] The product page, cart sheet and checkout summary show the same unit price and total.
- [ ] Reach checkout, trigger each field error, fix it, and see the error clear.
- [ ] Empty states: empty cart, empty filter, zero search results.

## Keyboard and assistive tech

- [ ] Tab order follows the visual order; focus is always visible and never hidden under the sticky header.
- [ ] Search and cart dialogs: focus moves in, Tab is trapped, Escape closes, focus returns to the opener.
- [ ] Status messages are announced (added, corrected, copied).
- [ ] axe scan shows no WCAG A/AA violations on the changed routes.

## Motion and preferences

- [ ] With `prefers-reduced-motion: reduce`, no transforms animate; state changes still visible.
- [ ] With `prefers-reduced-transparency: reduce`, the header is solid.
- [ ] No animation longer than 320 ms on a UI control.

## Performance (any page, asset or dependency change)

- [ ] Lighthouse mobile on a production build meets [engineering.md budgets](engineering.md#performance-budgets).
- [ ] No new third-party request on catalog or product pages.
- [ ] Images have width, height and responsive sizes; the LCP image is not lazy-loaded.

## Screenshot loop for agents

```powershell
astro dev status        # start with `astro dev --background` if it is not running
# then drive the pages with Playwright at 390x844 and 1440x900,
# save screenshots, open them, and fix what does not match the system.
```

Agents must look at the screenshots they take. A screenshot that was saved but not inspected does not count as verification.

## Report format

```
Followed: docs/<file>.md section <x>
Changed: <files>
Verified: 390 ✓ 1440 ✓ keyboard ✓ reduced motion ✓ astro check ✓
Not verified: <what and why>
Refused to invent: <claims or data left out>
```
