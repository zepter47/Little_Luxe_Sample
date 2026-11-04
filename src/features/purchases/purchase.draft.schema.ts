import { z } from 'zod';
import { draftEnvelopeSchema } from '../../services/drafts/draft.schema';

// Recovery validation deliberately accepts incomplete input. Submission still
// uses purchaseSchema, including its UUID, quantity and price rules.
export const purchaseDraftSchema = draftEnvelopeSchema.extend({
  values: z.object({
    invoice_number: z.string(), supplier_id: z.string(), purchase_notes: z.string(),
    lines: z.array(z.object({
      lineId: z.string().optional(), item_id: z.string(), quantity: z.string(),
      unit_price: z.string(), batch_number: z.string(), expiry_date: z.string(),
    })),
  }),
  extra: z.undefined(),
});
export type PurchaseDraft = z.infer<typeof purchaseDraftSchema>;
