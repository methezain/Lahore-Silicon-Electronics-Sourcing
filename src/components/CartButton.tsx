import { useStore } from '@nanostores/preact';
import { cartStore, isCartDrawerOpen } from '../store/cartStore';

export default function CartButton() {
  const cartItems = useStore(cartStore);
  const totalItems = Object.values(cartItems).reduce((acc, item) => acc + item.quantity, 0);

  return (
    <button
      id="cart-button"
      class="cart-button"
      type="button"
      onClick={() => isCartDrawerOpen.set(true)}
    >
      {totalItems > 0 ? `Cart ${totalItems}` : "Cart"}
    </button>
  );
}
