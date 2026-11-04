export interface FormDraft<Values, Extra = undefined> {
  userId: string;
  formatVersion: 1;
  updatedAt: number;
  status: 'editing' | 'completed';
  values: Values;
  extra: Extra;
}

export interface DraftRepository<Values, Extra = undefined> {
  load(userId: string): Promise<FormDraft<Values, Extra> | undefined>;
  save(draft: FormDraft<Values, Extra>): Promise<void>;
  remove(userId: string): Promise<void>;
}
