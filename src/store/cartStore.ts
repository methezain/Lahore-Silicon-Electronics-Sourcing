import { persistentMap } from '@nanostores/persistent';

export type CartItem = {
  part_number: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

// Key is part_number
export const cartStore = persistentMap<Record<string, CartItem>>(
  'lahore_silicon_cart:',
  {},
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

export function addToCart(item: Omit<CartItem, 'quantity'>) {
  const existing = cartStore.get()[item.part_number];
  if (existing) {
    cartStore.setKey(item.part_number, {
      ...existing,
      quantity: existing.quantity + 1
    });
  } else {
    cartStore.setKey(item.part_number, {
      ...item,
      quantity: 1
    });
  }
  
  // Also open the drawer when an item is added
  isCartDrawerOpen.set(true);
}

export function removeFromCart(part_number: string) {
  const current = cartStore.get();
  const next = { ...current };
  delete next[part_number];
  cartStore.set(next);
}

export function updateQuantity(part_number: string, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(part_number);
    return;
  }
  const existing = cartStore.get()[part_number];
  if (existing) {
    cartStore.setKey(part_number, {
      ...existing,
      quantity
    });
  }
}

import { atom } from 'nanostores';
export const isCartDrawerOpen = atom(false);
