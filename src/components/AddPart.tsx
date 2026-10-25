import { addToCart, cartStore, isCartDrawerOpen, setQuantityNote } from "../store/cartStore";
import { connectHaptic } from "../lib/connect";
import { correctQuantity } from "../lib/quantity";

type Props = {
  partNumber: string;
  name: string;
  minQty: number;
  qtyMultiple: number;
  stockQty: number;
};

/** Table "Add" control. Opens the cart sheet. Does not add past stock. */
export default function AddPart(props: Props) {
  const unavailable = props.stockQty < 1;

  function add() {
    if (unavailable) return;
    const rule = {
      min_qty: props.minQty,
      qty_multiple: props.qtyMultiple,
      stock_qty: props.stockQty,
    };
    const existing = cartStore.get()[props.partNumber]?.quantity ?? 0;
    const corrected = correctQuantity(existing + props.qtyMultiple, rule);
    const delta = corrected.quantity - existing;
    setQuantityNote(props.partNumber, corrected.message);
    if (delta > 0) {
      addToCart({ part_number: props.partNumber, name: props.name }, delta);
      connectHaptic();
      return;
    }
    isCartDrawerOpen.set(true);
  }

  return (
    <button
      type="button"
      class="catalog-add"
      disabled={unavailable}
      aria-label={unavailable ? `${props.partNumber} is out of stock` : `Add ${props.partNumber} to cart`}
      onClick={add}
    >
      {unavailable ? "Out of stock" : "Add"}
    </button>
  );
}
