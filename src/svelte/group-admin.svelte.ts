export interface GroupAdminInput {
  emptyReason: 'none' | 'search' | '';
  rows: { id: string; nama: string; initial: string; isActive: boolean; colorIndex: number }[];
}

export interface SuperAdminInput {
  status: 'loading' | 'error' | 'ready';
  items: { email: string; isPrimary: boolean }[];
}

export const groupAdminStore = $state<GroupAdminInput>({ emptyReason: 'none', rows: [] });
export const superAdminStore = $state<SuperAdminInput>({ status: 'loading', items: [] });

export function updateGroupAdminStore(input: GroupAdminInput) {
  Object.assign(groupAdminStore, input);
}

export function updateSuperAdminStore(input: SuperAdminInput) {
  Object.assign(superAdminStore, input);
}
