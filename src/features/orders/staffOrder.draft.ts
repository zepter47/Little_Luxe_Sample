import { db } from '../../services/db/database';
import { createDraftRepository } from '../../services/drafts/draftRepository';
import { staffOrderDraftSchema } from './staffOrder.draft.schema';

export const staffOrderDraftRepository = createDraftRepository(
  db.staffOrderDraft, value => staffOrderDraftSchema.parse(value),
);
