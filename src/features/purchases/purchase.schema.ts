import { z } from 'zod';

export const purchaseSchema = z.object({
    invoice_number: z.string().trim().min(1, 'Please enter an invoice number.'),
    supplier_id: z.union([z.literal(''), z.uuid('Please select a valid supplier.')]),
    purchase_notes: z.string().trim(),
    document_date: z.iso.date('Select a valid document date.'),
    lines: z.array(z.object({
        item_id: z.uuid('Select an item.'),
        quantity: z.string().regex(/^\d+$/, 'Quantity must be a positive whole number.')
            .refine(value => Number(value) >= 1 && Number(value) <= 2147483647, 'Quantity must be between 1 and 2147483647.'),
        unit_price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a nonnegative price with up to two decimal places.')
            .refine(value => Number(value) <= 9999999999.99, 'Cost price is too large.'),
        batch_number: z.string().trim(),
        expiry_date: z.union([z.literal(''), z.iso.date('Enter a valid expiry date.')]),
    })).min(1, 'Add at least one item before saving.'),
});
