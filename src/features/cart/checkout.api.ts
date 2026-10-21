import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { requireUser } from '../auth/auth';
import type { CartItem } from './cart.types';
const resultSchema = z.object({
  orderId: z.string().uuid().optional(), total: z.number().finite().nonnegative(),
  lines: z.array(z.object({ itemId: z.string().uuid(), itemName: z.string(), quantity: z.number().int().positive(), salePrice: z.number().finite().nonnegative() })),
});
export class CheckoutRejected extends Error {}
export async function checkout(items: CartItem[], requestId: string, confirm: boolean) {
  const userId = requireUser();
  if (!items.length || items.some(item => item.userId !== userId)) throw new Error('Your account changed. Please review your cart again.');
  const { data, error } = await supabase.rpc('cart_checkout', {
    p_items: items.map(item => ({ itemId: item.itemId, quantity: item.quantity, salePrice: item.salePrice })),
    p_request_id: requestId, p_confirm: confirm,
  });
  if (error) {
    if (error.code === 'P0001') throw new CheckoutRejected(error.message);
    throw new Error(error.message);
  }
  return resultSchema.parse(data);
}
