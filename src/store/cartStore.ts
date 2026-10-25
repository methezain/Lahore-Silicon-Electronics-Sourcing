import { atom, map } from 'nanostores';
import { persistentMap } from '@nanostores/persistent';

export type CartItem = {
  part_number: string;
  name: string;
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

/** Bumps on every add so a second add of the same part still announces. */
export const addedNotice = atom<{ partNumber: string; nonce: number; label?: string } | null>(null);

let addedNonce = 0;

export const isCartDrawerOpen = atom(false);

function publishAdded(partNumbers: readonly string[], open: boolean) {
  const unique = [...new Set(partNumbers)];
  if (unique.length === 0) return;
  const partNumber = unique[unique.length - 1];
  const label = unique.length === 1 ? partNumber : `${unique.length} parts`;
  addedNonce += 1;
  addedNotice.set({ partNumber, label, nonce: addedNonce });
  if (open) isCartDrawerOpen.set(true);
}

/** Correction messages for a line. Not persisted. */
export const quantityNotes = map<Record<string, string>>({});

export function setQuantityNote(partNumber: string, message?: string) {
  const next = { ...quantityNotes.get() };
  if (message) next[partNumber] = message;
  else delete next[partNumber];
  quantityNotes.set(next);
}

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1) {
  const existing = cartStore.get()[item.part_number];
  const nextQuantity = (existing?.quantity ?? 0) + quantity;
  cartStore.setKey(item.part_number, {
    part_number: item.part_number,
    name: item.name,
    image: item.image ?? existing?.image,
    quantity: nextQuantity,
  });

  addedNonce += 1;
  addedNotice.set({ partNumber: item.part_number, nonce: addedNonce });
  isCartDrawerOpen.set(true);
}

/** Adds every line, then opens the cart once. */
export function addLinesToCart(items: readonly CartItem[]) {
  const current = { ...cartStore.get() };
  const touched: string[] = [];
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) continue;
    const existing = current[item.part_number];
    const image = item.image ?? existing?.image;
    current[item.part_number] = {
      part_number: item.part_number,
      name: item.name || existing?.name || item.part_number,
      quantity: (existing?.quantity ?? 0) + item.quantity,
      ...(image ? { image } : {}),
    };
    touched.push(item.part_number);
  }
  if (touched.length === 0) return;
  cartStore.set(current);
  publishAdded(touched, true);
}

/** Replaces the cart with these lines. Does not open the sheet. */
export function replaceCart(items: readonly CartItem[]) {
  const next: Record<string, CartItem> = {};
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) continue;
    next[item.part_number] = {
      part_number: item.part_number,
      name: item.name,
      quantity: item.quantity,
      ...(item.image ? { image: item.image } : {}),
    };
  }
  cartStore.set(next);
  quantityNotes.set({});
  if (Object.keys(next).length === 0) {
    addedNotice.set(null);
    return;
  }
  publishAdded(Object.keys(next), false);
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
      part_number: existing.part_number,
      name: existing.name,
      image: existing.image,
      quantity,
    });
  }
}
