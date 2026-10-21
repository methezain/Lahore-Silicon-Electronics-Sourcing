import { useEffect, useState } from "preact/hooks";
import { useStore } from '@nanostores/preact';
import { cartStore, isCartDrawerOpen } from '../store/cartStore';

export default function CartButton() {
  const cartItems = useStore(cartStore);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const partCount = ready ? Object.keys(cartItems).length : 0;
  const noun = partCount === 1 ? 'part' : 'parts';

  return (
    <button
      id="cart-button"
      class="cart-btn"
      type="button"
      data-ready={ready ? "true" : undefined}
      onClick={() => isCartDrawerOpen.set(true)}
    >
      <svg width="20" height="20" aria-hidden="true" focusable="false">
        <use href="#bag" />
      </svg>
      <span class="cart-btn-label">Cart </span>
      <span class="cart-count">{partCount}</span>
      <span class="sr-only"> {noun}</span>
    </button>
  );
}
