import { useStore } from '@nanostores/preact';
import { cartStore, isCartDrawerOpen } from '../store/cartStore';

export default function CartButton() {
  const cartItems = useStore(cartStore);
  
  // Calculate total items (sum of quantities)
  const totalItems = Object.values(cartItems).reduce((acc, item) => acc + item.quantity, 0);

  return (
    <button 
      onClick={() => isCartDrawerOpen.set(true)}
      class="bg-brand-500 text-brand-50 rounded-full px-6 py-2.5 text-sm font-bold border border-brand-500 uppercase tracking-tight hover:bg-brand-900 transition-colors shadow-sm relative"
    >
      Cart ({totalItems})
      {totalItems > 0 && (
        <span class="absolute -top-1 -right-1 flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-amber opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-accent-amber border-2 border-brand-50"></span>
        </span>
      )}
    </button>
  );
}
