export interface IuranChecklistItem {
  id: string;
  name: string;
  initials: string;
  variant: 'lunas' | 'not-owed' | 'partial' | 'unpaid';
  statusLabel: string;
  disabled: boolean;
  defaultChecked: boolean;
}

export interface IuranReviewChip {
  key: string;
  initials: string;
  name: string;
}

export interface QuickPayPreset {
  amount: number;
  label: string;
}

interface ChecklistInput { items: IuranChecklistItem[]; query?: string }
interface ReviewInput { visible: IuranReviewChip[]; extraCount: number; moreLabel: string }
interface PresetsInput { chips: QuickPayPreset[] }

export const iuranChecklistStore = $state<{ renderSeq: number; items: IuranChecklistItem[]; query: string }>({
  renderSeq: 0, items: [], query: ''
});
export const iuranReviewChipsStore = $state<ReviewInput>({ visible: [], extraCount: 0, moreLabel: '' });
export const quickPayPresetsStore = $state<PresetsInput>({ chips: [] });

export function updateIuranChecklistStore(input: ChecklistInput) {
  iuranChecklistStore.renderSeq++;
  iuranChecklistStore.items = input.items;
  if (input.query !== undefined) setIuranChecklistQuery(input.query);
}

export function setIuranChecklistQuery(query: string) {
  iuranChecklistStore.query = query;
}

export function updateIuranReviewChipsStore(input: ReviewInput) {
  Object.assign(iuranReviewChipsStore, input);
}

export function updateQuickPayPresetsStore(input: PresetsInput) {
  quickPayPresetsStore.chips = input.chips;
}

export function resetTransactionFormState() {
  updateIuranChecklistStore({ items: [], query: '' });
  updateIuranReviewChipsStore({ visible: [], extraCount: 0, moreLabel: '' });
  updateQuickPayPresetsStore({ chips: [] });
}
