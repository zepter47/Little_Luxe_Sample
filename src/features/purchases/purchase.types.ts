import type { z } from 'zod';
import type { TablesInsert } from '../../database.types';
import type { purchaseSchema } from './purchase.schema';

export type newPurchase = TablesInsert<'purchase'>;
export type newPurchaseDetail = TablesInsert<'purchase_details'>;
export type PurchaseFormData = z.infer<typeof purchaseSchema>;
export type CreatePurchaseInput = {
    purchase: Pick<newPurchase, 'supplier_id' | 'invoice_number' | 'purchase_notes' | 'added_on'>;
    lines: Pick<newPurchaseDetail, 'item_id' | 'quantity_bought' | 'cost_price' | 'batch_number' | 'expiry_date'>[];
};

export const purchaseKeys = {
    all: ['stock', 'purchase'] as const,
    details: (id: string) => ['stock-details', 'purchase', id] as const,
};
