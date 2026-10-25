import { useEffect, useRef, useState } from "preact/hooks";
import { etaDetail, etaLead, pricedChoice, purchaseModel, quantityBreakTable } from "../lib/product";
import { correctQuantity, quantityPresets, type QtyRule } from "../lib/quantity";
import { formatPkr, type PriceBreak } from "../lib/money";
import { addToCart, cartStore, isCartDrawerOpen } from "../store/cartStore";
import {
  ADDED_HOLD_MS,
  armPhotoMorph,
  beginViewTransition,
  connectHaptic,
  desktopPhotoMorph,
  markConnect,
  prefersReducedMotion,
  waitForCartPhoto,
} from "../lib/connect";
import RollingText from "./RollingText";
import "./product-purchase.css";
import "./connect.css";

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
      <span aria-hidden="true"><RollingText value={figure} /></span>
      <span class="sr-only">{formatted}</span>
    </p>
  );
}

function BuyLabel({ added, total }: { added: boolean; total: number }) {
  if (added) {
    return (
      <span class="buy-add-label">Added<svg class="buy-add-check" width="20" height="20" aria-hidden="true" focusable="false"><use href="#check" /></svg></span>
    );
  }
  const formatted = formatPkr(total);
  const figure = formatted.startsWith("Rs ") ? formatted.slice(3) : formatted;
  return (
    <span class="buy-add-label">{"Add to cart · Rs "}<RollingText value={figure} /></span>
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
  const [editing, setEditing] = useState(false);
  const [lead, setLead] = useState<string | null>(null);
  const [bar, setBar] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const revertTimer = useRef(0);
  const part = { price: props.price, breaks: props.breaks };
  const priced = pricedChoice(part, committed, props.stock_qty);
  const model = purchaseModel({
    stockQty: props.stock_qty,
    restockOn: props.restock_on,
    lowStockAt: props.low_stock_at,
    lineTotal: priced.total,
    askHref: props.askHref,
  });
  const tiers = quantityBreakTable(part);
  const presets = quantityPresets(rule);
  const noteId = `qty-note-${props.partNumber.replace(/[^a-zA-Z0-9]+/g, "-")}`;

  function cancelAdded() {
    window.clearTimeout(revertTimer.current);
    setAdded(false);
  }

  function holdAdded() {
    window.clearTimeout(revertTimer.current);
    setAdded(true);
    revertTimer.current = window.setTimeout(() => setAdded(false), ADDED_HOLD_MS);
  }

  function commit(next: number, keepAdded = false) {
    if (unavailable) return 0;
    if (!keepAdded) cancelAdded();
    setEditing(false);
    const corrected = correctQuantity(next, rule);
    const quantity = corrected.quantity < 1 ? props.min_qty : corrected.quantity;
    setDraft(String(quantity));
    setCommitted(quantity);
    setMessage(corrected.message ?? "");
    return quantity;
  }

  function add(button: HTMLButtonElement) {
    if (unavailable) return;
    window.clearTimeout(revertTimer.current);
    const chosen = commit(Number(draft), true);
    if (chosen < 1) return;
    const existing = cartStore.get()[props.partNumber]?.quantity ?? 0;
    const corrected = correctQuantity(existing + chosen, rule);
    const delta = corrected.quantity - existing;
    if (corrected.quantity !== existing + chosen && corrected.message) setMessage(corrected.message);
    if (delta < 1) {
      isCartDrawerOpen.set(true);
      return;
    }

    const apply = () => {
      addToCart({ part_number: props.partNumber, name: props.name, image: props.image }, delta);
      holdAdded();
    };

    markConnect();
    connectHaptic();

    const reduced = prefersReducedMotion();
    const morphPhoto = !reduced && desktopPhotoMorph();
    const morphButton = !reduced && button.isConnected;
    if (!morphButton) {
      apply();
      return;
    }

    const root = document.documentElement;
    root.classList.add("is-connect");
    if (morphPhoto) root.classList.add("is-connect-photo");
    button.style.setProperty("view-transition-name", "buy-connect");

    let release = () => {};
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      button.style.removeProperty("view-transition-name");
      release();
      root.classList.remove("is-connect", "is-connect-photo");
    };

    let transition: ReturnType<typeof beginViewTransition> = null;
    try {
      transition = beginViewTransition(() => {
        apply();
        if (!morphPhoto) return;
        return waitForCartPhoto(props.partNumber).then(() => {
          release = armPhotoMorph(props.partNumber);
        });
      });
    } catch {
      finish();
      apply();
      return;
    }

    if (!transition) {
      finish();
      apply();
      return;
    }
    transition.finished.then(finish, finish);
  }

  useEffect(() => {
    setLead(etaLead());
    return () => window.clearTimeout(revertTimer.current);
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

    // The bar is the buy control whenever the panel button is outside the viewport,
    // including on load when the gallery pushes it below the first screen.
    function sync() {
      const rect = observed.getBoundingClientRect();
      const headerBottom = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;
      const inView = rect.top >= headerBottom && rect.bottom <= window.innerHeight;
      apply(inView);
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
        onClick={(event) => {
          const target = event.currentTarget;
          if (target instanceof HTMLButtonElement) add(target);
        }}
      >
        {model.disabled ? model.label : <BuyLabel added={added} total={priced.total} />}
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
      {presets.length > 0 && (
        <div class="qty-presets" role="group" aria-label="Quantity presets">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              class="qty-preset"
              aria-pressed={committed === preset}
              aria-label={`Set quantity to ${preset}`}
              onClick={() => commit(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
      )}
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
            <div class="qty-figure">
              <input
                class={editing ? "qty-input" : "qty-input is-ghost"}
                aria-label={`Quantity for ${props.partNumber}`}
                inputMode="numeric"
                autoComplete="off"
                spellcheck={false}
                value={draft}
                disabled={unavailable}
                aria-describedby={noteId}
                onFocus={() => setEditing(true)}
                onInput={(event) => {
                  setDraft((event.currentTarget as HTMLInputElement).value);
                  cancelAdded();
                }}
                onBlur={(event) => commit(Number((event.currentTarget as HTMLInputElement).value))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commit(Number((event.currentTarget as HTMLInputElement).value));
                  }
                }}
              />
              <span class={editing ? "qty-roll is-hidden" : "qty-roll"} aria-hidden="true">
                <RollingText value={String(committed)} />
              </span>
            </div>
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
      <div class={bar ? "buy-bar" : "buy-bar is-off"}>
        <PriceFigure amount={priced.unit} />
        {addButton(false)}
      </div>
    </div>
  );
}
