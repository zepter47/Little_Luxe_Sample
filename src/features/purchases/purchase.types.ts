import type { z } from 'zod';
import type { Tables, TablesInsert } from '../../database.types';
import type { purchaseSchema } from './purchase.schema';

export type newPurchase = TablesInsert<'purchase'>;
export type newPurchaseDetail = TablesInsert<'purchase_details'>;
export type PurchaseFormData = z.infer<typeof purchaseSchema>;
export type CreatePurchaseInput = {
    purchase: Pick<newPurchase, 'supplier_id' | 'invoice_number' | 'purchase_notes'>;
    lines: Pick<newPurchaseDetail, 'item_id' | 'quantity_bought' | 'cost_price' | 'batch_number' | 'expiry_date'>[];
};

export const purchaseKeys = {
    all: ['purchases'] as const,
    details: (id: string) => ['purchases', 'details', id] as const,
    options: ['purchases', 'options'] as const,
};

export type Purchase = Tables<'purchase'> & {summary: {quantity_bought: number | null}[]};
export type PurchasePerson = Pick<Tables<'customer'>, 'customer_id' | 'first_name' | 'last_name' | 'email'>;
export type PurchaseDetail = Tables<'purchase_details'>;
export type PurchaseHeaderInput = Pick<newPurchase, 'invoice_number' | 'supplier_id' | 'purchase_notes'>;
