import { useId, useState } from "preact/hooks";
import { correctQuantity, type QtyRule } from "../lib/quantity";

type Props = QtyRule & {
  id?: string;
  /** Starting quantity. Corrected against the rule on first render. */
  value?: number;
  /** Part number, or another name, so each stepper has its own accessible name. */
  partNumber?: string;
  label?: string;
  size?: "default" | "compact";
};

export default function Stepper(props: Props) {
  const rule: QtyRule = {
    min_qty: props.min_qty,
    qty_multiple: props.qty_multiple,
    stock_qty: props.stock_qty,
  };
  const reactId = useId();
  const inputId = props.id ?? `qty-${reactId}`;
  const messageId = `${inputId}-note`;
  const unavailable = props.stock_qty < 1;
  const starting = unavailable
    ? { quantity: 0, message: undefined as string | undefined }
    : correctQuantity(props.value ?? props.min_qty, rule);
  const [quantity, setQuantity] = useState(String(starting.quantity));
  const [message, setMessage] = useState(starting.message ?? "");
  const name = props.label ?? props.partNumber;

  function commit(next: number) {
    if (unavailable) return;
    const corrected = correctQuantity(next, rule);
    setQuantity(String(corrected.quantity < 1 ? props.min_qty : corrected.quantity));
    setMessage(corrected.message ?? "");
  }

  return (
    <div class={props.size === "compact" ? "qty-stepper is-compact" : "qty-stepper"}>
      <div class="qty-stepper-control">
        <button
          type="button"
          aria-label={name ? `Decrease ${name}` : "Decrease quantity"}
          disabled={unavailable}
          onClick={() => commit(Number(quantity) - props.qty_multiple)}
        >
          −
        </button>
        <input
          id={inputId}
          aria-label={name ? `Quantity for ${name}` : "Quantity"}
          inputMode="numeric"
          autoComplete="off"
          spellcheck={false}
          value={quantity}
          disabled={unavailable}
          aria-describedby={messageId}
          onInput={(event) => setQuantity((event.currentTarget as HTMLInputElement).value)}
          onBlur={() => commit(Number(quantity))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(Number((event.currentTarget as HTMLInputElement).value));
            }
          }}
        />
        <button
          type="button"
          aria-label={name ? `Increase ${name}` : "Increase quantity"}
          disabled={unavailable}
          onClick={() => commit(Number(quantity) + props.qty_multiple)}
        >
          +
        </button>
      </div>
      <p id={messageId} class="qty-stepper-note" role="status">{message}</p>
    </div>
  );
}
