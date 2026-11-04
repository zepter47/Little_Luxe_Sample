import { db } from '../../services/db/database';
import { createDraftRepository } from '../../services/drafts/draftRepository';
import { itemDraftSchema } from './item.draft.schema';

export const itemDraftRepository = createDraftRepository(
  db.itemsDraft, value => itemDraftSchema.parse(value),
);
