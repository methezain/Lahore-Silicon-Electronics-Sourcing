import { useEffect, useRef, useState } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import "./cart-sheet.css";
import {
  addedNotice,
  cartStore,
  isCartDrawerOpen,
  quantityNotes,
  removeFromCart,
  setQuantityNote,
  updateQuantity,
} from "../store/cartStore";
import { formatPkr, priceCart } from "../lib/money";
import { correctQuantity } from "../lib/quantity";
import { deliveryCost, returnRule } from "../lib/shipping";
import type { CatalogPart } from "../lib/catalog";

type Props = {
  catalog?: CatalogPart[];
};

function focusableIn(dialog: HTMLElement) {
  return [...dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])")].filter(
    (element) => element.tabIndex !== -1,
  );
}

function partNoun(count: number) {
  return count === 1 ? "part" : "parts";
}

function noteId(partNumber: string) {
  return `cart-note-${partNumber.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export default function CartSheet({ catalog = [] }: Props) {
  const isOpen = useStore(isCartDrawerOpen);
  const cartItems = useStore(cartStore);
  const notice = useStore(addedNotice);
  const notes = useStore(quantityNotes);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  const items = ready ? Object.values(cartItems) : [];
  const noticeShown = ready ? notice : null;
  const open = ready && isOpen;
  openRef.current = open;

  const priced = priceCart(catalog, items);
  const byPart = new Map(priced.lines.map((line) => [line.part_number, line]));
  const rules = new Map(catalog.map((part) => [part.part_number, part]));
  const missing = new Set(priced.missing);

  function close() {
    openRef.current = false;
    isCartDrawerOpen.set(false);
    addedNotice.set(null);
    const opener = document.getElementById("cart-button");
    opener?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      if (!openRef.current) opener?.focus({ preventScroll: true });
    });
  }

  function commit(partNumber: string, raw: string) {
    const rule = rules.get(partNumber);
    if (!rule) return;
    const corrected = correctQuantity(Number(raw), rule);
    setQuantityNote(partNumber, corrected.message);
    setDrafts((current) => ({ ...current, [partNumber]: String(corrected.quantity) }));
    if (corrected.quantity < 1) removeFromCart(partNumber);
    else updateQuantity(partNumber, corrected.quantity);
  }

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!openRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = focusableIn(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && dialog.contains(active);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    return addedNotice.listen((next) => {
      if (!next) return;
      const status = document.getElementById("cart-status");
      if (status) status.textContent = `Added ${next.partNumber} to cart`;
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const byNumber = new Map(catalog.map((part) => [part.part_number, part]));
    for (const item of Object.values(cartItems)) {
      const rule = byNumber.get(item.part_number);
      if (!rule) continue;
      const corrected = correctQuantity(item.quantity, rule);
      if (corrected.quantity === item.quantity) continue;
      if (corrected.message) setQuantityNote(item.part_number, corrected.message);
      if (corrected.quantity < 1) removeFromCart(item.part_number);
      else updateQuantity(item.part_number, corrected.quantity);
    }
  }, [cartItems, catalog, ready]);

  useEffect(() => {
    if (!open) {
      openRef.current = false;
      return;
    }
    openRef.current = true;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onFocusIn(event: FocusEvent) {
      if (!openRef.current) return;
      const dialog = dialogRef.current;
      const target = event.target;
      if (!dialog || (target instanceof Node && dialog.contains(target))) return;
      closeButtonRef.current?.focus();
    }

    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.body.style.overflow = previousOverflow;
      // Hide commits before this cleanup. Restoring focus here survives the dialog losing focus.
      if (!openRef.current) document.getElementById("cart-button")?.focus({ preventScroll: true });
    };
  }, [open]);

  function onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) close();
  }

  const countLabel = `${items.length} ${partNoun(items.length)}`;

  return (
    <div class="cart-sheet" hidden={!open} onClick={onOverlayClick}>
      <div
        ref={dialogRef}
        class="cart-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header class="cart-head">
          <h2 class="cart-heading">
            <span id="cart-title">Cart</span>
            <span class="cart-part-count">{countLabel}</span>
          </h2>
          <button ref={closeButtonRef} class="cart-close" type="button" aria-label="Close cart" onClick={close}>
            <svg width="20" height="20" aria-hidden="true" focusable="false">
              <use href="#close" />
            </svg>
          </button>
        </header>
        {noticeShown && <p class="cart-added">
          <svg width="20" height="20" aria-hidden="true" focusable="false">
            <use href="#check" />
          </svg>
          Added {noticeShown.partNumber} to cart
        </p>}
        <div class="cart-lines">
          {items.length === 0 ? (
            <p class="cart-empty">Your cart is empty. <a href="/#catalog">Browse the catalog.</a></p>
          ) : (
            items.map((item) => {
              const line = byPart.get(item.part_number);
              const rule = rules.get(item.part_number);
              const gone = missing.has(item.part_number) || !rule;
              const shown = drafts[item.part_number] ?? String(line?.quantity ?? item.quantity);
              const note = notes[item.part_number];
              return (
                <article key={item.part_number} class="cart-line">
                  <div class="cart-photo">
                    {rule?.image ? (
                      <img src={rule.image} alt="" width="64" height="64" loading="lazy" decoding="async" />
                    ) : (
                      <span class="cart-photo-fallback">{rule?.package_type ?? ""}</span>
                    )}
                  </div>
                  <div class="cart-main">
                    <p class="cart-part">{item.part_number}</p>
                    {line && <p class="cart-job">{line.name}</p>}
                    {gone && <p class="cart-missing" role="status">The shop no longer sells {item.part_number}.</p>}
                    {!gone && rule && (
                      <div class="qty-stepper is-compact">
                        <div class="qty-stepper-control">
                          <button
                            type="button"
                            aria-label={`Decrease ${item.part_number}`}
                            onClick={() => commit(item.part_number, String(Number(shown) - rule.qty_multiple))}
                          >
                            −
                          </button>
                          <input
                            aria-label={`Quantity for ${item.part_number}`}
                            aria-describedby={note ? noteId(item.part_number) : undefined}
                            inputMode="numeric"
                            autoComplete="off"
                            spellcheck={false}
                            value={shown}
                            onInput={(event) => setDrafts((current) => ({
                              ...current,
                              [item.part_number]: (event.currentTarget as HTMLInputElement).value,
                            }))}
                            onBlur={(event) => commit(item.part_number, (event.currentTarget as HTMLInputElement).value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                commit(item.part_number, (event.currentTarget as HTMLInputElement).value);
                              }
                            }}
                          />
                          <button
                            type="button"
                            aria-label={`Increase ${item.part_number}`}
                            onClick={() => commit(item.part_number, String(Number(shown) + rule.qty_multiple))}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                    {note && <p id={noteId(item.part_number)} class="cart-note" role="status">{note}</p>}
                  </div>
                  <div class="cart-side">
                    {line && <p class="cart-amount">{formatPkr(line.line_total)}</p>}
                    <button
                      type="button"
                      class="cart-remove"
                      onClick={() => {
                        setQuantityNote(item.part_number);
                        removeFromCart(item.part_number);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
        {items.length > 0 && (
          <footer class="cart-foot">
            <p class="cart-row">
              <span class="cart-label">Subtotal</span>
              <span class="cart-amount">{formatPkr(priced.total)}</span>
            </p>
            <p class="cart-row">
              <span class="cart-label">Delivery</span>
              <span class="cart-rule">{deliveryCost}</span>
            </p>
            <p class="cart-return"><a href="/shipping-and-payments#defects">{returnRule}</a></p>
            {priced.lines.length > 0 && (
              <a class="cart-checkout" href="/checkout">Check out · {formatPkr(priced.total)}</a>
            )}
            <p class="cart-guest">Guest checkout. No account needed.</p>
          </footer>
        )}
      </div>
    </div>
  );
}

/** Dev gallery only. Replaces the cart in this browser with two catalog lines. */
export function CartSampleButton() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  function open() {
    cartStore.set({
      LM7805: {
        part_number: "LM7805",
        name: "5 V, 1 A, TO-220 linear regulator",
        quantity: 1,
      },
      "ESP32-WROOM-32D": {
        part_number: "ESP32-WROOM-32D",
        name: "Wi-Fi and Bluetooth module, 3.3 V",
        quantity: 2,
      },
    });
    quantityNotes.set({});
    addedNotice.set({ partNumber: "LM7805", nonce: Date.now() });
    isCartDrawerOpen.set(true);
  }

  return (
    <button type="button" class="cart-sample" data-ready={ready ? "true" : undefined} onClick={open}>
      Open the cart sheet
    </button>
  );
}

export function CartEmptyButton() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  function open() {
    cartStore.set({});
    quantityNotes.set({});
    addedNotice.set(null);
    isCartDrawerOpen.set(true);
  }

  return (
    <button type="button" class="cart-sample" data-ready={ready ? "true" : undefined} onClick={open}>
      Show the empty cart
    </button>
  );
}
