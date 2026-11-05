import { z } from 'zod';
import { draftEnvelopeSchema, unfinishedNumberSchema } from '../../services/drafts/draft.schema';

export const staffOrderDraftSchema = draftEnvelopeSchema.extend({
  values: z.object({
    customer_id: z.string(), notes: z.string(),
    items: z.array(z.object({
      lineId: z.string().optional(), item_id: z.string(),
      quantity: unfinishedNumberSchema, sale_price: unfinishedNumberSchema,
      original_sale_price: unfinishedNumberSchema.optional(), order_discount: unfinishedNumberSchema.optional(),
    })),
  }),
  extra: z.object({ payload: z.string(), id: z.string() }),
});
export type StaffOrderDraft = z.infer<typeof staffOrderDraftSchema>;
export type StaffOrderDraftRequest = StaffOrderDraft['extra'];
