interface OfflineQueueItem {
  id: number | string;
  label: string;
  tone: string;
  icon: string;
  nominal: number;
  formattedTime: string;
  summary: string;
}

export interface OfflineQueueInput {
  status: 'loading' | 'error' | 'ready';
  groupId: string;
  items: OfflineQueueItem[];
  otherGroupCount: number;
  unscopedCount: number;
}

function emptyQueue(): OfflineQueueInput {
  return { status: 'loading', groupId: '', items: [], otherGroupCount: 0, unscopedCount: 0 };
}

export const offlineQueueStore = $state(emptyQueue());

export function updateOfflineQueueStore(input: OfflineQueueInput) {
  Object.assign(offlineQueueStore, input);
}

export function resetOfflineQueueState() {
  updateOfflineQueueStore(emptyQueue());
}
