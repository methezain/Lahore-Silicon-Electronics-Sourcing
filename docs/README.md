# Lahore Silicon: agent manual

This folder is the operating manual for every person and AI agent who changes this storefront. Read it before you edit pages, styles, catalog data, cart, or checkout.

Lahore Silicon is a small electronics-components counter on Hall Road, Lahore. It sells a short, real catalog of regulators, boards, sensors, ICs and relays, and ships across Pakistan. The aim is a store that feels like a premium brand and works like a careful distributor.

## Reading order

| Before you… | Read |
| --- | --- |
| Change anything | [agent-rules.md](agent-rules.md) |
| Pick the next task | [change-plan.md](change-plan.md) (session prompts in [prompts.md](prompts.md)) |
| Touch color, type, spacing, layout, motion, or a component | [design-system.md](design-system.md), then open [design/specimen.html](design/specimen.html) |
| Build or change a page | [pages.md](pages.md) |
| Touch catalog data, search, cart, checkout, payment, or delivery | [commerce.md](commerce.md) |
| Write any sentence a buyer will read | [copy.md](copy.md) |
| Touch architecture, performance, security, or tests | [engineering.md](engineering.md) |
| Say a task is done | [qa.md](qa.md) |
| Need the reason behind a rule | [north-star.md](north-star.md) |
| Hit a business question the code cannot answer | [decisions.md](decisions.md) |

## Precedence

When two sources disagree, the higher one wins.

1. **Truth.** A claim that the catalog, the shipping module, or the server cannot prove does not ship ([copy.md](copy.md)).
2. **[agent-rules.md](agent-rules.md).**
3. **[design-system.md](design-system.md)** over any one-off class, inline style, hex value, or Tailwind arbitrary value.
4. **[commerce.md](commerce.md)** over a field or behavior that exists on only one page.
5. **[change-plan.md](change-plan.md)** order over visual ideas. Broken and untrue things are fixed before polish.
6. Taste, a screenshot from `design_language/`, and component-library defaults come last.

## What is in this folder

| Path | What it is |
| --- | --- |
| `design/specimen.html` | The reference rendering of the design system. Open it in a browser. Port its tokens and patterns, not its file. |
| `design/screens/` | Verified screenshots of the specimen at 1440px and 390px. These are the visual targets. |
| `reports/Premium electronics ecommerce standard.md` | The synthesized research report behind this manual. |
| `research_notes/Premium electronics ecommerce standard/` | Six sourced research notes: premium brand stores, component distributors and maker shops, e-commerce UX evidence, premium web craft, Pakistan market, engineering and agent practice. |

`documents/` at the repo root holds the client's original MVP briefs. They are history. Where they disagree with this folder, this folder wins.

## The one-sentence brief

Every part page should feel as composed as an Apple buy page and be as complete as a DigiKey listing, and every number on it should still be true after checkout.
