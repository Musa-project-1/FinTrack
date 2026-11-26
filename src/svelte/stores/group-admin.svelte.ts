export interface GroupAdminInput {
  emptyReason: 'none' | 'search' | '';
  rows: { id: string; nama: string; initial: string; isActive: boolean; colorIndex: number }[];
}

export interface SuperAdminInput {
  status: 'loading' | 'error' | 'ready';
  items: { email: string; isPrimary: boolean }[];
}

export type GroupAdminFlowMode = 'list' | 'create' | 'rename' | 'pin' | 'remove';

export interface GroupAdminFlowState {
  mode: GroupAdminFlowMode;
  createStep: 1 | 2;
  targetId: string;
  targetName: string;
  busy: boolean;
}

export const groupAdminStore = $state<GroupAdminInput>({ emptyReason: 'none', rows: [] });
export const superAdminStore = $state<SuperAdminInput>({ status: 'loading', items: [] });

export const groupAdminFlow = $state<GroupAdminFlowState>({
  mode: 'list',
  createStep: 1,
  targetId: '',
  targetName: '',
  busy: false
});

export function updateGroupAdminStore(input: GroupAdminInput) {
  Object.assign(groupAdminStore, input);
}

export function updateSuperAdminStore(input: SuperAdminInput) {
  Object.assign(superAdminStore, input);
}

export function openGroupAdminFlow(mode: GroupAdminFlowMode, targetId = '', targetName = '') {
  groupAdminFlow.mode = mode;
  groupAdminFlow.createStep = 1;
  groupAdminFlow.targetId = targetId;
  groupAdminFlow.targetName = targetName;
  groupAdminFlow.busy = false;
}

export function setGroupCreateStep(step: 1 | 2) {
  groupAdminFlow.createStep = step;
}

export function setGroupFlowBusy(busy: boolean) {
  groupAdminFlow.busy = busy;
}

export function resetGroupAdminFlow() {
  openGroupAdminFlow('list');
}
