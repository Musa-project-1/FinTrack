export interface GroupPickerRowVM {
  id: string;
  nama: string;
  initial: string;
  isActive: boolean;
  subText: string;
  pendingCount: number;
  badgeKind: 'active' | 'direct' | 'unlocked' | 'pin';
}

export interface GroupPickerInput {
  mode: 'loading' | 'empty' | 'list';
  rows: GroupPickerRowVM[];
}

export const groupPickerStore = $state<GroupPickerInput>({ mode: 'empty', rows: [] });

export function updateGroupPickerStore(input: GroupPickerInput) {
  Object.assign(groupPickerStore, input);
}

export function resetGroupPickerState() {
  updateGroupPickerStore({ mode: 'empty', rows: [] });
}
