import { useState } from "preact/hooks";
import { addToCart } from "../store/cartStore";
import { correctQuantity, type QtyRule } from "../lib/quantity";

type Props = {
  part_number: string;
  name: string;
  image?: string;
} & QtyRule;

export default function ProductPurchase(props: Props) {
  const rule = { min_qty: props.min_qty, qty_multiple: props.qty_multiple, stock_qty: props.stock_qty };
  const [quantity, setQuantity] = useState(String(props.min_qty));
  const [message, setMessage] = useState("");

  if (props.stock_qty < 1) return null;

  function commit(next: number) {
    const corrected = correctQuantity(next, rule);
    setQuantity(String(corrected.quantity || props.min_qty));
    setMessage(corrected.message ?? "");
    return corrected.quantity;
  }

  function add() {
    const amount = commit(Number(quantity));
    if (amount < 1) return;
    addToCart({ part_number: props.part_number, name: props.name, image: props.image }, amount);
    const status = document.getElementById("cart-status");
    if (status) status.textContent = "Added";
  }

  return (
    <div class="purchase">
      <div class="stepper">
        <button type="button" aria-label="Decrease quantity" onClick={() => commit(Number(quantity) - props.qty_multiple)}>−</button>
        <input
          aria-label="Quantity"
          inputMode="numeric"
          value={quantity}
          onInput={(event) => setQuantity((event.currentTarget as HTMLInputElement).value)}
          onBlur={() => commit(Number(quantity))}
        />
        <button type="button" aria-label="Increase quantity" onClick={() => commit(Number(quantity) + props.qty_multiple)}>+</button>
      </div>
      <button type="button" class="add-button" onClick={add}>Add to cart</button>
      <p class="caption" role="status">{message}</p>
    </div>
  );
}
