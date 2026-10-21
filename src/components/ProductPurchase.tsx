import { useEffect, useRef, useState } from "preact/hooks";
import { etaDetail, etaLead, pricedChoice, purchaseModel, quantityBreakTable } from "../lib/product";
import { correctQuantity, type QtyRule } from "../lib/quantity";
import { formatPkr, type PriceBreak } from "../lib/money";
import { addToCart, cartStore, isCartDrawerOpen } from "../store/cartStore";
import "./product-purchase.css";

type Props = {
  partNumber: string;
  name: string;
  image?: string;
  price: number;
  breaks?: PriceBreak[];
  askHref?: string;
} & QtyRule & {
  restock_on?: string;
  low_stock_at?: number;
};

function PriceFigure({ amount, className = "" }: { amount: number; className?: string }) {
  const formatted = formatPkr(amount);
  const figure = formatted.startsWith("Rs ") ? formatted.slice(3) : formatted;
  return (
    <p class={`unit-price ${className}`.trim()}>
      <span class="rs" aria-hidden="true">Rs</span>
      <span aria-hidden="true">{figure}</span>
      <span class="sr-only">{formatted}</span>
    </p>
  );
}

export default function ProductPurchase(props: Props) {
  const rule: QtyRule = {
    min_qty: props.min_qty,
    qty_multiple: props.qty_multiple,
    stock_qty: props.stock_qty,
  };
  const unavailable = props.stock_qty < 1;
  const starting = unavailable ? 0 : correctQuantity(props.min_qty, rule).quantity;
  const [draft, setDraft] = useState(String(starting));
  const [committed, setCommitted] = useState(starting);
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);
  const [lead, setLead] = useState<string | null>(null);
  const [bar, setBar] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const part = { price: props.price, breaks: props.breaks };
  const priced = pricedChoice(part, committed, props.stock_qty);
  const model = purchaseModel({
    stockQty: props.stock_qty,
    restockOn: props.restock_on,
    lowStockAt: props.low_stock_at,
    lineTotal: priced.total,
    askHref: props.askHref,
  });
  const label = added ? "Added" : model.label;
  const tiers = quantityBreakTable(part);
  const noteId = `qty-note-${props.partNumber.replace(/[^a-zA-Z0-9]+/g, "-")}`;

  function commit(next: number) {
    if (unavailable) return 0;
    const corrected = correctQuantity(next, rule);
    const quantity = corrected.quantity < 1 ? props.min_qty : corrected.quantity;
    setDraft(String(quantity));
    setCommitted(quantity);
    setMessage(corrected.message ?? "");
    setAdded(false);
    return quantity;
  }

  function add() {
    if (unavailable) return;
    const chosen = commit(Number(draft));
    if (chosen < 1) return;
    const existing = cartStore.get()[props.partNumber]?.quantity ?? 0;
    const corrected = correctQuantity(existing + chosen, rule);
    const delta = corrected.quantity - existing;
    if (corrected.quantity !== existing + chosen && corrected.message) setMessage(corrected.message);
    if (delta < 1) {
      isCartDrawerOpen.set(true);
      return;
    }
    addToCart({ part_number: props.partNumber, name: props.name, image: props.image }, delta);
    setAdded(true);
  }

  useEffect(() => {
    setLead(etaLead());
  }, []);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const observed = button;
    const mobile = window.matchMedia("(max-width: 899px)");

    function apply(inView: boolean) {
      const on = mobile.matches && !inView;
      setBar(on);
      document.documentElement.classList.toggle("buy-bar-on", on);
    }

    const header = document.querySelector(".site-header");
    const top = header instanceof HTMLElement ? Math.ceil(header.getBoundingClientRect().height) : 0;

    // Show the bar only after the button has scrolled above the header.
    // A button still below the fold stays the control, so the bar does not cover the price.
    function sync() {
      const rect = observed.getBoundingClientRect();
      apply(rect.bottom > top);
    }

    const observer = new IntersectionObserver(sync, { threshold: [0, 1] });
    observer.observe(observed);
    sync();

    function onChange() {
      sync();
    }

    mobile.addEventListener("change", onChange);
    window.addEventListener("scroll", sync, { passive: true });
    return () => {
      observer.disconnect();
      mobile.removeEventListener("change", onChange);
      window.removeEventListener("scroll", sync);
      document.documentElement.classList.remove("buy-bar-on");
    };
  }, []);

  function addButton(primary: boolean) {
    return (
      <button
        ref={primary ? buttonRef : undefined}
        type="button"
        class="buy-add"
        disabled={model.disabled}
        tabIndex={primary && bar ? -1 : undefined}
        aria-hidden={primary && bar ? "true" : undefined}
        onClick={add}
      >
        {label}
      </button>
    );
  }

  return (
    <div class="buy-controls">
      <div class="price-line">
        <PriceFigure amount={priced.unit} />
        <span class={`stock-line ${model.level}`}>{model.stock}</span>
      </div>
      {tiers.length > 0 && (
        <table class="breaks">
          <caption class="sr-only">Quantity prices for {props.partNumber}</caption>
          <thead>
            <tr>
              <th scope="col">Quantity</th>
              <th scope="col">Unit price</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={tier.quantity}>
                <td>{tier.quantity}</td>
                <td>{tier.unitPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div class="eta">
        <svg width="20" height="20" aria-hidden="true" focusable="false">
          <use href="#truck" />
        </svg>
        <div>
          <p class="eta-lead" aria-live="polite">{lead}</p>
          <p class="eta-detail">{etaDetail}</p>
        </div>
      </div>
      <div class="qty-row">
        <div class="qty-stepper">
          <div class="qty-stepper-control">
            <button
              type="button"
              aria-label={`Decrease ${props.partNumber}`}
              disabled={unavailable}
              onClick={() => commit(Number(draft) - props.qty_multiple)}
            >
              −
            </button>
            <input
              aria-label={`Quantity for ${props.partNumber}`}
              inputMode="numeric"
              autoComplete="off"
              spellcheck={false}
              value={draft}
              disabled={unavailable}
              aria-describedby={noteId}
              onInput={(event) => {
                setDraft((event.currentTarget as HTMLInputElement).value);
                setAdded(false);
              }}
              onBlur={(event) => commit(Number((event.currentTarget as HTMLInputElement).value))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commit(Number((event.currentTarget as HTMLInputElement).value));
                }
              }}
            />
            <button
              type="button"
              aria-label={`Increase ${props.partNumber}`}
              disabled={unavailable}
              onClick={() => commit(Number(draft) + props.qty_multiple)}
            >
              +
            </button>
          </div>
        </div>
        {addButton(true)}
      </div>
      <p id={noteId} class="qty-stepper-note" role="status">{message}</p>
      {model.askHref && (
        <a class="buy-ask" href={model.askHref}>Ask on WhatsApp</a>
      )}
      <div class={bar ? "buy-bar is-on" : "buy-bar"}>
        <PriceFigure amount={priced.unit} />
        {addButton(false)}
      </div>
    </div>
  );
}
