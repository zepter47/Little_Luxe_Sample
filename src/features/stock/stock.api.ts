import type { Database } from '../../database.types';
import { supabase } from '../../lib/supabase';
import type { adminRecord } from '../admin/components/adminRecordManager';

export type Entity = 'order' | 'purchase' | 'item_return';
export const entityInfo = {
    order: {title: 'Orders', singular: 'order', id: 'order_id', notes: 'order_notes', details: 'order_details', detailId: 'order_details_id', quantity: 'quantity_sold', price: 'sale_price'},
    purchase: {title: 'Purchases', singular: 'purchase', id: 'purchase_id', notes: 'purchase_notes', details: 'purchase_details', detailId: 'purchase_details_id', quantity: 'quantity_bought', price: 'cost_price'},
    item_return: {title: 'Item returns', singular: 'item return', id: 'return_id', notes: 'return_notes', details: 'return_details', detailId: 'return_details_id', quantity: 'quantity_returned', price: null},
} as const;

function normalize(row: object, id: string): adminRecord {
    const values = Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value == null ? '' : String(value)]));
    return {...values, id: values[id]};
}

export async function getStockRecords(entity: Entity): Promise<adminRecord[]> {
    const {data, error} = await supabase.from(entity).select('*').order('added_on', {ascending: false});
    if (error) throw error;
    const ids = [...new Set(data.flatMap(row => row.added_by ? [row.added_by] : []))];
    const authors = ids.length ? await supabase.rpc('stock_author_emails', {author_ids: ids}) : {data: [], error: null};
    if (authors.error) throw authors.error;
    const emails = new Map(authors.data?.map(author => [author.user_id, author.email]));
    return data.map(row => ({...normalize(row, entityInfo[entity].id), author_email: row.added_by ? emails.get(row.added_by) || 'Email unavailable' : 'Not recorded'}));
}

export async function getStockDetails(entity: Entity, parentId: string) {
    const config = entityInfo[entity];
    const {data, error} = entity === 'order'
        ? await supabase.from('order_details').select('*').eq('order_id', parentId)
        : entity === 'purchase'
            ? await supabase.from('purchase_details').select('*').eq('purchase_id', parentId)
            : await supabase.from('return_details').select('*').eq('return_id', parentId);
    if (error) throw error;
    return data.map(row => normalize(row, config.detailId));
}

export async function getStockOptions() {
    const [items, suppliers, orders] = await Promise.all([
        supabase.from('item').select('item_id,item_name').order('item_name'),
        supabase.from('supplier').select('supplier_id,supplier_name').order('supplier_name'),
        supabase.from('order').select('order_id').order('added_on', {ascending: false}),
    ]);
    for (const result of [items, suppliers, orders]) if (result.error) throw result.error;
    return {items: items.data || [], suppliers: suppliers.data || [], orders: orders.data || []};
}

export async function saveStockRecord(entity: Entity, values: Record<string, string>, id?: string) {
    const {data: {user}, error: authError} = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Please sign in to save stock records.');
    const audit: {updated_by?: string; updated_on?: string; added_by?: string; is_active?: boolean} = id ? {updated_by: user.id, updated_on: new Date().toISOString()} : {added_by: user.id, is_active: true};
    let result;
    if (entity === 'order') {
        const payload: Database['public']['Tables']['order']['Insert'] = {...audit, order_notes: values.order_notes || null, order_status: values.order_status as Database['public']['Enums']['order_status']};
        result = await (id ? supabase.from('order').update(payload).eq('order_id', id) : supabase.from('order').insert(payload)).select('order_id').single();
    } else if (entity === 'purchase') {
        const payload: Database['public']['Tables']['purchase']['Insert'] = {...audit, invoice_number: values.invoice_number, supplier_id: values.supplier_id || null, purchase_notes: values.purchase_notes || null};
        result = await (id ? supabase.from('purchase').update(payload).eq('purchase_id', id) : supabase.from('purchase').insert(payload)).select('purchase_id').single();
    } else {
        const payload: Database['public']['Tables']['item_return']['Insert'] = {...audit, order_id: values.order_id || null, return_notes: values.return_notes || null, return_status: values.return_status as Database['public']['Enums']['return_status']};
        result = await (id ? supabase.from('item_return').update(payload).eq('return_id', id) : supabase.from('item_return').insert(payload)).select('return_id').single();
    }
    if (result.error) throw result.error;
    return result.data;
}

export async function saveStockDetail(entity: Entity, parentId: string, values: Record<string, string>, id?: string) {
    const config = entityInfo[entity];
    const quantity = Number(values[config.quantity]);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Quantity must be a positive whole number.');
    const price = config.price ? Number(values[config.price]) : 0;
    if (!Number.isFinite(price) || price < 0) throw new Error('Price must be zero or greater.');
    const common = {item_id: values.item_id, batch_number: values.batch_number || null, expiry_date: values.expiry_date || null};
    let result;
    if (entity === 'order') {
        const payload = {...common, order_id: parentId, quantity_sold: quantity, sale_price: price};
        result = await (id ? supabase.from('order_details').update(payload).eq('order_details_id', id).eq('order_id', parentId) : supabase.from('order_details').insert(payload)).select('order_details_id').single();
    } else if (entity === 'purchase') {
        const payload = {...common, purchase_id: parentId, quantity_bought: quantity, cost_price: price};
        result = await (id ? supabase.from('purchase_details').update(payload).eq('purchase_details_id', id).eq('purchase_id', parentId) : supabase.from('purchase_details').insert(payload)).select('purchase_details_id').single();
    } else {
        // return_details_id has no database default.
        const payload = {...common, return_id: parentId, quantity_returned: quantity};
        result = await (id ? supabase.from('return_details').update(payload).eq('return_details_id', id).eq('return_id', parentId) : supabase.from('return_details').insert({...payload, return_details_id: crypto.randomUUID()})).select('return_details_id').single();
    }
    if (result.error) throw result.error;
    return result.data;
}
