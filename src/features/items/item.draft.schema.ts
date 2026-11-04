import { z } from 'zod';
import { draftEnvelopeSchema, unfinishedNumberSchema } from '../../services/drafts/draft.schema';

export const itemDraftSchema = draftEnvelopeSchema.extend({
  values: z.object({
    is_active: z.boolean(), item_name: z.string(), sale_price: unfinishedNumberSchema,
    item_category_id: z.string(), product_notes: z.string(), uom_id: z.string(),
  }),
  extra: z.object({
    savedId: z.string().optional(), profile: z.instanceof(File).optional(),
    profilePath: z.string(), gallery: z.array(z.instanceof(File)), warning: z.string(),
  }),
});
export type ItemDraft = z.infer<typeof itemDraftSchema>;
export type ItemDraftExtra = ItemDraft['extra'];
