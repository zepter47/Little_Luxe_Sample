import { z } from 'zod';

export const draftEnvelopeSchema = z.object({
  userId: z.string().min(1),
  formatVersion: z.literal(1),
  updatedAt: z.number().finite(),
  status: z.enum(['editing', 'completed']),
});

// Empty numeric fields in existing forms are represented by NaN. IndexedDB's
// structured clone preserves it; JSON serialization would turn it into null.
export const unfinishedNumberSchema = z.union([z.number(), z.nan()]);
