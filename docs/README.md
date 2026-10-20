# Lahore Silicon — agent manual

These files are the operating manual for every agent that changes this storefront. Read them before editing pages, styles, content, cart, or checkout.

The long evidence writeup is [`reports/Premium electronics store standard.md`](../reports/Premium%20electronics%20store%20standard.md). The notes behind it are in `research_notes/Premium electronics store standard/`. This manual is the decision. When a research note leaves a choice open, the decision in these files wins.

## Reading order

| When you are about to… | Read |
| --- | --- |
| Change anything | [agent-rules.md](agent-rules.md) |
| Decide what to do next | [change-plan.md](change-plan.md) |
| Touch layout, type, color, or motion | [design-system.md](design-system.md) |
| Touch a part, the catalog, cart, or checkout | [commerce.md](commerce.md) |
| Write a sentence a buyer will read | [copy.md](copy.md) |
| Touch architecture, accessibility, or speed | [engineering.md](engineering.md) |
| Need the reason for a rule | [north-star.md](north-star.md) |

## Precedence

1. A fact the catalog, the policy, or the server cannot prove does not ship. [copy.md](copy.md) and [agent-rules.md](agent-rules.md).
2. [design-system.md](design-system.md) wins over a one-off class, an inline hex, or a Tailwind arbitrary value.
3. [commerce.md](commerce.md) wins over a field that exists only on one page.
4. [change-plan.md](change-plan.md) wins over visual ideas. Trust fixes come before a reskin.
5. Taste, a reference screenshot, and a generic component library lose to the files above.

## What this shop is

Lahore Silicon is a small Hall Road sourcing desk. It sells a short catalog of components and modules, takes advance payment, and ships from Lahore. The buyer is a maker, a student, or a technician. Some of them arrive with a part number. Some of them need one sentence that says what the object does. Both of them use the same screen.

Premium here means the part, the price, the stock, and the arrival window agree, and the page looks as careful as that agreement.
