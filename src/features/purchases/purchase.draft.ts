import { db } from '../../services/db/database';
import { createDraftRepository } from '../../services/drafts/draftRepository';
import { purchaseDraftSchema } from './purchase.draft.schema';

export const purchaseDraftRepository = createDraftRepository(
  db.purchaseDraft, value => purchaseDraftSchema.parse(value),
);
