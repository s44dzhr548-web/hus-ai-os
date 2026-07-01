export const CART_STORAGE_KEY = (tableId: string) => `menuos_cart_${tableId}`;

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export function getCart(tableId: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY(tableId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCart(tableId: string, items: CartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY(tableId), JSON.stringify(items));
}

export function clearCart(tableId: string) {
  localStorage.removeItem(CART_STORAGE_KEY(tableId));
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}
