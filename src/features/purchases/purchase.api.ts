import { supabase } from '../../lib/supabase';
import type { CreatePurchaseInput } from './purchase.types';

export async function createPurchaseAsync({purchase, lines}: CreatePurchaseInput) {
    const {data, error} = await supabase.rpc('create_purchase', {
        p_invoice_number: purchase.invoice_number,
        p_supplier_id: purchase.supplier_id || undefined,
        p_purchase_notes: purchase.purchase_notes || undefined,
        p_added_on: purchase.added_on || undefined,
        p_items_json: lines,
    });
    if (error) throw error;
    if (!data) throw new Error('The purchase could not be saved. Please try again.');
    return data;
}
