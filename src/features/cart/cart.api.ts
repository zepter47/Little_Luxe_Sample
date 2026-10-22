import { db } from '../../services/db/database';
import { requireUser } from '../auth/auth';
import type { CartProduct } from '../items/item.types';
import type { CartItem } from './cart.types';

export async function addToCart(product: CartProduct) {
  const userId = requireUser();
  if (!product.is_active || !product.is_stocked) throw new Error('This product is unavailable.');
  return db.transaction('rw', db.cartItems, async () => {
    const key: [string, string] = [userId, product.item_id];
    if (await db.cartItems.get(key)) return false;
    await db.cartItems.add({ userId, itemId: product.item_id, itemName: product.item_name,
      salePrice: product.sale_price, quantity: 1, imagePath: product.image_path });
    return true;
  });
}
export async function changeQuantity(itemId: string, delta: number) {
  const userId = requireUser();
  if (delta !== 1 && delta !== -1) throw new Error('Invalid quantity change.');
  await db.transaction('rw', db.cartItems, async () => {
    const row = await db.cartItems.get([userId, itemId]);
    if (!row) throw new Error('This item is no longer in your cart.');
    const quantity = row.quantity + delta;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) throw new Error('Quantity must be between 1 and 999.');
    await db.cartItems.update([userId, itemId], { quantity });
  });
}
export async function removeCartItem(itemId: string) {
  await db.cartItems.delete([requireUser(), itemId]);
}
export async function clearPurchasedItems(userId: string, purchased: CartItem[], requestId: string) {
  await db.transaction('rw', db.cartItems, db.checkoutAttempts, async () => {
    const pending = await db.checkoutAttempts.get(userId);
    if (pending?.requestId !== requestId) return;
    for (const item of purchased) {
      const key: [string, string] = [userId, item.itemId];
      const current = await db.cartItems.get(key);
      if (!current) continue;
      if (current.quantity > item.quantity) await db.cartItems.update(key, { quantity: current.quantity - item.quantity });
      else await db.cartItems.delete(key);
    }
    await db.checkoutAttempts.delete(userId);
  });
}
