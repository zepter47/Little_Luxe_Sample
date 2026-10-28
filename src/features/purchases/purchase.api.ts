import { supabase } from '../../lib/supabase';
import type { CreatePurchaseInput, PurchaseHeaderInput } from './purchase.types';

export async function getPurchasePeopleAsync(ids: string[]) {
    if (!ids.length) return [];
    const {data, error} = await supabase.from('customer')
        .select('customer_id,first_name,last_name,email').in('customer_id', ids);
    if (error) throw error;
    return data;
}

export async function getPurchasesAsync() {
    const {data, error} = await supabase.from('purchase')
        .select('*, summary:purchase_details(quantity_bought)').order('added_on', {ascending: false});
    if (error) throw error;
    return data;
}

export async function getPurchaseDetailsAsync(id: string) {
    const {data, error} = await supabase.from('purchase_details').select('*').eq('purchase_id', id);
    if (error) throw error;
    return data;
}

export async function getPurchaseOptionsAsync() {
    const [items, suppliers] = await Promise.all([
        supabase.from('item').select('item_id,item_name').order('item_name'),
        supabase.from('supplier').select('supplier_id,supplier_name').order('supplier_name'),
    ]);
    if (items.error) throw items.error;
    if (suppliers.error) throw suppliers.error;
    return {items: items.data, suppliers: suppliers.data};
}

export async function updatePurchaseAsync({id, purchase}: {id: string; purchase: PurchaseHeaderInput}) {
    const {data: {user}, error: authError} = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Please sign in to save purchases.');
    const {data, error} = await supabase.from('purchase').update({
        invoice_number: purchase.invoice_number, supplier_id: purchase.supplier_id || null,
        purchase_notes: purchase.purchase_notes || null, updated_by: user.id, updated_on: new Date().toISOString(),
    }).eq('purchase_id', id).select('purchase_id').single();
    if (error) throw error;
    return data;
}

export async function createPurchaseAsync({purchase, lines}: CreatePurchaseInput) {
    const {data, error} = await supabase.rpc('create_purchase', {
        p_invoice_number: purchase.invoice_number,
        p_supplier_id: purchase.supplier_id || undefined,
        p_purchase_notes: purchase.purchase_notes || undefined,
        p_items_json: lines,
    });
    if (error) throw error;
    if (!data) throw new Error('The purchase could not be saved. Please try again.');
    return data;
}
