import { useStore } from '@nanostores/preact';
import { cartStore, isCartDrawerOpen, updateQuantity, removeFromCart } from '../store/cartStore';

export default function CartDrawer() {
  const isOpen = useStore(isCartDrawerOpen);
  const cartItems = useStore(cartStore);
  
  const items = Object.values(cartItems);
  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        class="absolute inset-0 bg-brand-900/50 backdrop-blur-sm transition-opacity" 
        onClick={() => isCartDrawerOpen.set(false)}
      ></div>
      
      {/* Drawer */}
      <div class="relative w-full max-w-md bg-brand-50 h-full shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div class="flex items-center justify-between p-6 border-b border-brand-200 bg-white">
          <h2 class="text-xl font-black uppercase tracking-tight text-brand-900">Your Cart</h2>
          <button 
            onClick={() => isCartDrawerOpen.set(false)}
            class="text-brand-900/50 hover:text-brand-900 transition-colors p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Items */}
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div class="h-full flex flex-col items-center justify-center text-center opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-4"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              <p class="font-bold">Your cart is empty</p>
              <p class="text-sm">Add components from the catalog.</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.part_number} class="flex gap-4 bg-white p-4 rounded-xl border border-brand-200">
                <div class="w-16 h-16 bg-brand-50 rounded-lg flex items-center justify-center border border-brand-200 flex-shrink-0 p-1">
                  {item.image ? (
                    <img src={item.image} alt={item.name} class="w-full h-full object-contain mix-blend-multiply" />
                  ) : (
                    <span class="text-[10px] font-black text-brand-900/20">{item.part_number}</span>
                  )}
                </div>
                
                <div class="flex-1 flex flex-col">
                  <div class="flex justify-between items-start mb-1">
                    <p class="font-bold text-sm text-brand-900 leading-tight">{item.part_number}</p>
                    <button onClick={() => removeFromCart(item.part_number)} class="text-red-500 hover:text-red-700 p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                  <p class="text-xs text-brand-900/70 truncate mb-3">{item.name}</p>
                  
                  <div class="flex items-center justify-between mt-auto">
                    <div class="flex items-center border border-brand-200 rounded-lg bg-brand-50 overflow-hidden">
                      <button 
                        onClick={() => updateQuantity(item.part_number, item.quantity - 1)}
                        class="px-2.5 py-1 text-brand-900 font-bold hover:bg-brand-200 transition-colors"
                      >-</button>
                      <span class="px-2 text-sm font-mono font-bold bg-white h-full border-x border-brand-200 min-w-[2rem] text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.part_number, item.quantity + 1)}
                        class="px-2.5 py-1 text-brand-900 font-bold hover:bg-brand-200 transition-colors"
                      >+</button>
                    </div>
                    <p class="font-mono font-bold text-sm">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div class="p-6 bg-white border-t border-brand-200 space-y-4">
            <div class="flex justify-between items-center text-lg">
              <span class="font-bold text-brand-900/70">Subtotal</span>
              <span class="font-black font-mono text-xl text-brand-900">Rs. {total.toLocaleString()}</span>
            </div>
            <p class="text-xs text-brand-900/50 text-center">Shipping calculated at checkout</p>
            <a 
              href="/checkout"
              class="block w-full text-center bg-brand-500 text-brand-50 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-brand-900 transition-colors shadow-sm"
              onClick={() => isCartDrawerOpen.set(false)}
            >
              Proceed to Checkout
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
