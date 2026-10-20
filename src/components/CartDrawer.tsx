import { useEffect, useRef, useState } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { cartStore, isCartDrawerOpen, removeFromCart, updateQuantity } from "../store/cartStore";
import { formatPkr, priceCart, type CatalogPrice } from "../lib/money";
import { deliveryCost, shippingWindows } from "../lib/shipping";
import { correctQuantity } from "../lib/quantity";

type CatalogLine = CatalogPrice & {
  stock_qty: number;
  min_qty: number;
  qty_multiple: number;
};

type Props = {
  catalog?: CatalogLine[];
};

export default function CartDrawer({ catalog = [] }: Props) {
  const isOpen = useStore(isCartDrawerOpen);
  const cartItems = useStore(cartStore);
  const dialogRef = useRef<HTMLDivElement>(null);
  const items = Object.values(cartItems);
  const priced = priceCart(catalog, items);
  const byPart = new Map(priced.lines.map((line) => [line.part_number, line]));
  const rules = new Map(catalog.map((part) => [part.part_number, part]));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  function close() {
    isCartDrawerOpen.set(false);
    document.getElementById("cart-button")?.focus();
  }

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>("button, a[href], input");
    focusable?.focus();
  }, [isOpen]);

  function onKeyDown(event: KeyboardEvent) {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])")];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function commit(partNumber: string, raw: string) {
    const rule = rules.get(partNumber);
    if (!rule) return;
    const corrected = correctQuantity(Number(raw), rule);
    setNotes((current) => ({ ...current, [partNumber]: corrected.message ?? "" }));
    setDrafts((current) => ({ ...current, [partNumber]: String(corrected.quantity) }));
    if (corrected.quantity < 1) removeFromCart(partNumber);
    else updateQuantity(partNumber, corrected.quantity);
  }

  function copyCart() {
    const text = priced.lines
      .map((line) => `${line.part_number}  ${line.quantity}  ${formatPkr(line.line_total)}`)
      .join("\n");
    void navigator.clipboard.writeText(text);
    const status = document.getElementById("cart-status");
    if (status) status.textContent = "Cart copied";
  }

  return (
    <div class="cart-drawer" hidden={!isOpen} onKeyDown={onKeyDown}>
      <button class="cart-backdrop" type="button" aria-label="Close cart" onClick={close} />
      <div
        id="cart-drawer"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        class="cart-panel"
      >
        <header class="cart-head">
          <h2 id="cart-title">Cart</h2>
          <button type="button" onClick={close}>Close</button>
        </header>
        <div class="cart-lines">
          {items.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            items.map((item) => {
              const line = byPart.get(item.part_number);
              const rule = rules.get(item.part_number);
              const shown = drafts[item.part_number] ?? String(item.quantity);
              return (
                <article key={item.part_number}>
                  <p class="mono">{item.part_number}</p>
                  <p>{line?.name ?? item.part_number}</p>
                  {priced.missing.includes(item.part_number) && <p>The shop does not sell {item.part_number}.</p>}
                  <div class="stepper">
                    <button type="button" aria-label={`Decrease ${item.part_number}`} onClick={() => commit(item.part_number, String(Number(shown) - (rule?.qty_multiple ?? 1)))}>−</button>
                    <input
                      aria-label={`Quantity for ${item.part_number}`}
                      inputMode="numeric"
                      value={shown}
                      onInput={(event) => setDrafts((current) => ({ ...current, [item.part_number]: (event.currentTarget as HTMLInputElement).value }))}
                      onBlur={() => commit(item.part_number, shown)}
                    />
                    <button type="button" aria-label={`Increase ${item.part_number}`} onClick={() => commit(item.part_number, String(Number(shown) + (rule?.qty_multiple ?? 1)))}>+</button>
                  </div>
                  <button type="button" onClick={() => removeFromCart(item.part_number)}>Remove</button>
                  {line && <p class="money">{formatPkr(line.line_total)}</p>}
                  {notes[item.part_number] && <p role="status">{notes[item.part_number]}</p>}
                </article>
              );
            })
          )}
        </div>
        {items.length > 0 && (
          <footer class="cart-foot">
            <p><span>Subtotal</span> <span class="money">{formatPkr(priced.total)}</span></p>
            <p>{shippingWindows}</p>
            <p>{deliveryCost}</p>
            <button type="button" onClick={copyCart}>Copy cart</button>
            <a href="/checkout">Proceed to Checkout</a>
          </footer>
        )}
      </div>
    </div>
  );
}
