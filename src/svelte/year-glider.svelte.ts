export interface YearGliderSlotState {
  years: string[];
  activeYear: string;
}

export type YearSlot = 'desktop' | 'mobile';
export const yearGliderStore = $state<Record<YearSlot, YearGliderSlotState>>({
  desktop: { years: [], activeYear: '' },
  mobile: { years: [], activeYear: '' }
});

export function updateYearGliderSlot(slot: YearSlot, state: YearGliderSlotState) {
  yearGliderStore[slot] = state;
}

export function resetYearGliderState() {
  yearGliderStore.desktop = { years: [], activeYear: '' };
  yearGliderStore.mobile = { years: [], activeYear: '' };
}
