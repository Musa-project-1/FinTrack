/**
 * @module save-status
 * Truthful, accessible textual save and sync status for Finkas.
 *
 * Differentiates fundamental persistence and sync states without fake certainty:
 *   1. Data cached locally (persisted to device storage via actual saveCache/loadCache)
 *   2. Waiting to send (offline mutation queue in IndexedDB > 0)
 *   3. Server confirmation (write or read acknowledged by gateway)
 *   4. Remote data unread (server has newer changes pending pull)
 *   5. Unverified / unknown storage status (never claims saved without verification)
 *
 * Critical guards:
 *   - If local storage persistence failed (e.g. QuotaExceededError), reports cache failure
 *     truthfully and NEVER claims "all data only in memory" when IndexedDB queue is intact.
 *   - Unknown storage state reports "Penyimpanan belum diverifikasi" rather than "Tersimpan".
 *   - Queue count reflects actual IndexedDB active-group count.
 */

import { getActiveGroupId, getStorageStatus } from '../core/state.js';
import { isOnline } from '../core/utils.js';
import { getSyncStatus } from '../core/sync.js';
import { countQueuedTransactions } from '../core/offline.js';

/* ── Types & State ───────────────────────────────────────────────── */

/**
 * @typedef {'saved' | 'failed' | 'unknown'} StoragePersistenceState
 * @typedef {'idle' | 'queued' | 'sending' | 'failed'} QueueState
 * @typedef {'danger' | 'warning' | 'info' | 'success' | 'offline' | 'loading' | 'neutral'} StatusLevel
 */

let activeContainer = null;
let onChangeCallback = null;

let state = {
  groupId: null,
  storageState: 'unknown', // 'saved' | 'failed' | 'unknown'
  pendingCount: 0,
  queueState: 'idle',
  hasRemoteUpdate: false,
  lastSyncedAt: null,
  lastConfirmedWriteAt: null,
  isOnline: true,
  isSyncing: false
};

/* ── Pure status computation ─────────────────────────────────────── */

/**
 * Compute truthful textual status and accessible metadata.
 *
 * @param {object} s State input
 * @returns {{
 *   level: StatusLevel,
 *   text: string,
 *   ariaLabel: string,
 *   iconClass: string,
 *   actionRequired: boolean
 * }}
 */
export const computeSaveStatus = (s) => {
  const isStorageFailed = s.storageState === 'failed';
  const hasQueue = (s.pendingCount || 0) > 0;
  const isSending = s.queueState === 'sending';
  const online = Boolean(s.isOnline);
  const remoteUnread = Boolean(s.hasRemoteUpdate);

  // 1. Storage failure: never claim local persistence if writing/loading cache failed
  if (isStorageFailed) {
    if (hasQueue) {
      return {
        level: 'danger',
        text: `Penyimpanan cache gagal • ${s.pendingCount} perubahan menunggu kirim`,
        ariaLabel: `Cache pembukuan gagal disimpan. ${s.pendingCount} perubahan berada dalam antrean IndexedDB, terpisah dari cache pembukuan.`,
        iconClass: 'ph-bold ph-warning-octagon text-rose-500',
        actionRequired: true
      };
    }
    if (!online) {
      return {
        level: 'danger',
        text: 'Offline — penyimpanan cache gagal',
        ariaLabel: 'Koneksi terputus dan penyimpanan cache pembukuan gagal.',
        iconClass: 'ph-bold ph-warning-octagon text-rose-500',
        actionRequired: true
      };
    }
    return {
      level: 'danger',
      text: 'Penyimpanan cache gagal',
      ariaLabel: 'Penyimpanan cache pembukuan gagal. Ini tidak berarti antrean mutasi atau data server hilang.',
      iconClass: 'ph-bold ph-warning-octagon text-rose-500',
      actionRequired: true
    };
  }

  // 2. Full data pull in progress
  if (s.isSyncing) {
    return {
      level: 'loading',
      text: 'Sedang memuat data dari server...',
      ariaLabel: 'Sedang memuat data terbaru dari server.',
      iconClass: 'ph-bold ph-spinner animate-spin text-emerald-500',
      actionRequired: false
    };
  }

  // 3. Queue is currently transmitting to server
  if (isSending && hasQueue) {
    return {
      level: 'warning',
      text: `Mengirim ${s.pendingCount} perubahan ke server...`,
      ariaLabel: `Sedang mengirim ${s.pendingCount} perubahan transaksi ke server.`,
      iconClass: 'ph-bold ph-cloud-arrow-up animate-pulse text-amber-500',
      actionRequired: false
    };
  }

  // 4. Offline or pending queue waiting to send
  if (hasQueue) {
    const queueText = `${s.pendingCount} perubahan menunggu kirim`;
    if (!online) {
      return {
        level: 'warning',
        text: `Offline — ${queueText}`,
        ariaLabel: `Koneksi offline. ${s.pendingCount} transaksi tersimpan di perangkat dan menunggu terkirim ke server.`,
        iconClass: 'ph-bold ph-cloud-arrow-up text-amber-500',
        actionRequired: false
      };
    }
    return {
      level: 'warning',
      text: queueText,
      ariaLabel: `${s.pendingCount} transaksi tersimpan lokal dan menunggu dikirim ke server.`,
      iconClass: 'ph-bold ph-cloud-arrow-up text-amber-500',
      actionRequired: false
    };
  }

  // 5. Remote data unread on server
  if (remoteUnread) {
    if (s.lastConfirmedWriteAt) {
      return {
        level: 'info',
        text: 'Perubahan tersimpan • Ada data baru di server',
        ariaLabel: 'Perubahan lokal tersimpan di server. Ada pembaruan data baru di server yang belum dimuat — klik untuk memuat ulang.',
        iconClass: 'ph-bold ph-arrows-clockwise text-rose-500',
        actionRequired: true
      };
    }
    return {
      level: 'info',
      text: 'Ada data baru di server',
      ariaLabel: 'Ada data baru di server — klik untuk memuat ulang.',
      iconClass: 'ph-bold ph-arrows-clockwise text-rose-500',
      actionRequired: true
    };
  }

  // 6. Confirmed write to server without unread remote data
  if (s.lastConfirmedWriteAt && s.lastConfirmedWriteAt >= (s.lastSyncedAt || '')) {
    return {
      level: 'success',
      text: 'Tersimpan di server',
      ariaLabel: 'Semua perubahan berhasil tersimpan dan dikonfirmasi oleh server.',
      iconClass: 'ph-bold ph-check-circle text-emerald-500',
      actionRequired: false
    };
  }

  // 7. Offline, clean queue, cache intact
  if (!online && s.storageState === 'saved') {
    return {
      level: 'offline',
      text: 'Offline — tersimpan di perangkat',
      ariaLabel: 'Koneksi terputus. Data saat ini tersimpan di penyimpanan perangkat lokal.',
      iconClass: 'ph-bold ph-device-mobile text-slate-400',
      actionRequired: false
    };
  }

  // 8. Server confirmed full sync
  if (s.lastSyncedAt) {
    return {
      level: 'success',
      text: 'Tersimpan di server',
      ariaLabel: 'Data mutakhir dan tersimpan di server.',
      iconClass: 'ph-bold ph-check-circle text-emerald-500',
      actionRequired: false
    };
  }

  // 9. Local storage unverified vs confirmed
  if (s.storageState !== 'saved') {
    return {
      level: 'neutral',
      text: 'Penyimpanan belum diverifikasi',
      ariaLabel: 'Belum ada konfirmasi penyimpanan pembukuan saat ini.',
      iconClass: 'ph-bold ph-question text-slate-400',
      actionRequired: false
    };
  }

  return {
    level: 'neutral',
    text: 'Tersimpan di perangkat',
    ariaLabel: 'Data tersimpan di penyimpanan perangkat lokal.',
    iconClass: 'ph-bold ph-device-mobile text-slate-400',
    actionRequired: false
  };
};

/* ── DOM Rendering ───────────────────────────────────────────────── */

const DEFAULT_CONTAINER_ID = 'ui-save-status';

const resolveContainer = (target) => {
  if (typeof target === 'string') {
    return typeof document !== 'undefined' ? document.getElementById(target) : null;
  }
  if (target && typeof target === 'object' && 'setAttribute' in target) {
    return target;
  }
  if (activeContainer) return activeContainer;
  return typeof document !== 'undefined' ? document.getElementById(DEFAULT_CONTAINER_ID) : null;
};

/**
 * Render the computed save status into the container.
 *
 * @param {string|HTMLElement} [target]
 * @returns {object} Computed status descriptor
 */
export const renderSaveStatus = (target) => {
  const container = resolveContainer(target);
  const computed = computeSaveStatus(state);

  if (container) {
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-label', computed.ariaLabel);
    container.title = computed.ariaLabel;
    container.textContent = computed.text;
  }

  onChangeCallback?.(computed);
  return computed;
};

/* ── State Mutation Helper ───────────────────────────────────────── */

/**
 * Update internal status state and trigger re-render.
 * @param {Partial<typeof state>} patch
 */
export const updateSaveStatus = (patch) => {
  state = { ...state, ...patch };
  return renderSaveStatus();
};

export const getSaveStatusState = () => ({ ...state });

/* ── Event Handlers ──────────────────────────────────────────────── */

function handleStorageStatus(e) {
  const detail = e?.detail;
  const activeGroup = getActiveGroupId();
  if (detail?.groupId && activeGroup && detail.groupId !== activeGroup) {
    return;
  }
  state.storageState = detail?.state || 'unknown';
  renderSaveStatus();
}

function handleQueueChanged(e) {
  const detail = e?.detail;
  const activeGroup = getActiveGroupId();
  if (detail?.groupId && activeGroup && detail.groupId !== activeGroup) {
    return;
  }
  state.pendingCount = typeof detail?.pendingCount === 'number' ? detail.pendingCount : 0;
  state.queueState = detail?.state || 'idle';
  renderSaveStatus();
}

function handleSyncStatus(e) {
  const detail = e?.detail;
  const activeGroup = getActiveGroupId();
  if (detail?.groupId && activeGroup && detail.groupId !== activeGroup) {
    return;
  }
  if (typeof detail?.hasRemoteUpdate === 'boolean') {
    state.hasRemoteUpdate = detail.hasRemoteUpdate;
  }
  if (detail?.lastSyncedAt !== undefined) {
    state.lastSyncedAt = detail.lastSyncedAt;
  }
  if (detail?.lastConfirmedWriteAt !== undefined) {
    state.lastConfirmedWriteAt = detail.lastConfirmedWriteAt;
  }
  if (typeof detail?.isOnline === 'boolean') {
    state.isOnline = detail.isOnline;
  }
  renderSaveStatus();
}

function handleMutationSuccess(e) {
  const detail = e?.detail;
  const activeGroup = getActiveGroupId();
  if (detail?.groupId && activeGroup && detail.groupId !== activeGroup) {
    return;
  }
  state.lastConfirmedWriteAt = detail?.updatedAt || new Date().toISOString();
  renderSaveStatus();
}

async function handleGroupChanged(e) {
  const newGroup = e?.detail?.groupId || getActiveGroupId();
  const storageSnapshot = getStorageStatus();
  const syncSnapshot = getSyncStatus(newGroup);

  state = {
    groupId: newGroup,
    storageState: storageSnapshot.groupId === newGroup ? storageSnapshot.state : 'unknown',
    pendingCount: 0,
    queueState: 'idle',
    hasRemoteUpdate: Boolean(syncSnapshot?.hasRemoteUpdate),
    lastSyncedAt: syncSnapshot?.lastSyncedAt || null,
    lastConfirmedWriteAt: syncSnapshot?.lastConfirmedWriteAt || null,
    isOnline: Boolean(isOnline()),
    isSyncing: false
  };

  renderSaveStatus();

  try {
    const count = await countQueuedTransactions(newGroup);
    if (state.groupId === newGroup) {
      state.pendingCount = count;
      renderSaveStatus();
    }
  } catch {}
}

function handleNetworkChange() {
  state.isOnline = Boolean(isOnline());
  renderSaveStatus();
}

/* ── Public API ──────────────────────────────────────────────────── */

/**
 * Initialize save status module and attach listeners.
 *
 * @param {object} [options]
 * @param {string|HTMLElement} [options.container] DOM container or element ID
 * @param {function(object): void} [options.onChange] Callback on status update
 */
export const initSaveStatus = (options = {}) => {
  activeContainer = resolveContainer(options.container);
  onChangeCallback = options.onChange || null;

  const currentGroup = getActiveGroupId();
  const storageSnapshot = getStorageStatus();
  const syncSnapshot = getSyncStatus(currentGroup);

  state = {
    groupId: currentGroup,
    storageState: storageSnapshot.groupId === currentGroup ? storageSnapshot.state : 'unknown',
    pendingCount: 0,
    queueState: 'idle',
    hasRemoteUpdate: Boolean(syncSnapshot?.hasRemoteUpdate),
    lastSyncedAt: syncSnapshot?.lastSyncedAt || null,
    lastConfirmedWriteAt: syncSnapshot?.lastConfirmedWriteAt || null,
    isOnline: Boolean(isOnline()),
    isSyncing: false
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('finkas:storage-status', handleStorageStatus);
    window.addEventListener('finkas:queue-changed', handleQueueChanged);
    window.addEventListener('finkas:mutation-success', handleMutationSuccess);
    window.addEventListener('finkas:group-changed', handleGroupChanged);
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('finkas:sync-status', handleSyncStatus);
  }

  renderSaveStatus(activeContainer);

  // Read actual pending count from IDB asynchronously without blocking initial render
  void countQueuedTransactions(currentGroup).then((count) => {
    if (state.groupId === currentGroup && count > 0) {
      state.pendingCount = count;
      renderSaveStatus(activeContainer);
    }
  }).catch(() => {});
};

/**
 * Tear down listeners and reset state.
 */
export const destroySaveStatus = () => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('finkas:storage-status', handleStorageStatus);
    window.removeEventListener('finkas:queue-changed', handleQueueChanged);
    window.removeEventListener('finkas:mutation-success', handleMutationSuccess);
    window.removeEventListener('finkas:group-changed', handleGroupChanged);
    window.removeEventListener('online', handleNetworkChange);
    window.removeEventListener('offline', handleNetworkChange);
  }

  if (typeof document !== 'undefined') {
    document.removeEventListener('finkas:sync-status', handleSyncStatus);
  }

  activeContainer = null;
  onChangeCallback = null;
  state = {
    groupId: null,
    storageState: 'unknown',
    pendingCount: 0,
    queueState: 'idle',
    hasRemoteUpdate: false,
    lastSyncedAt: null,
    lastConfirmedWriteAt: null,
    isOnline: true,
    isSyncing: false
  };
};
