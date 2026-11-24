export interface MasterAnggotaRow {
  id: string;
  name: string;
  initials: string;
  isAktif: boolean;
  rawWa: string;
  waHref: string;
  searchText: string;
}

export interface MasterKategoriRow {
  id: string;
  name: string;
  tipe: string;
  isMasuk: boolean;
}

export interface AuditLogRow {
  key: string;
  timestampText: string;
  label: string;
  tone: string;
  icon: string;
  detail: string;
}

export interface SkippedMonthItem {
  mm: string;
  label: string;
}

export interface AuditLogInput {
  status: 'idle' | 'loading' | 'error' | 'ready';
  errorMessage?: string;
  totalCount?: number;
  rows?: AuditLogRow[];
}

export const masterAnggotaStore = $state<{ rows: MasterAnggotaRow[]; query: string; savedId: string }>({ rows: [], query: '', savedId: '' });
export const masterKategoriStore = $state<{ rows: MasterKategoriRow[]; savedId: string }>({ rows: [], savedId: '' });
export const auditLogStore = $state<Required<AuditLogInput>>({ status: 'idle', errorMessage: '', totalCount: 0, rows: [] });
export const skippedMonthsStore = $state<{ items: SkippedMonthItem[] }>({ items: [] });

let anggotaSavedTimer: ReturnType<typeof setTimeout> | undefined;
let kategoriSavedTimer: ReturnType<typeof setTimeout> | undefined;

export function updateMasterAnggotaStore(input: { rows: MasterAnggotaRow[]; query?: string }) {
  masterAnggotaStore.rows = input.rows;
  if (input.query !== undefined) setMasterAnggotaQuery(input.query);
}

export function setMasterAnggotaQuery(query: string) {
  masterAnggotaStore.query = query;
}

export function updateMasterKategoriStore(input: { rows: MasterKategoriRow[] }) {
  masterKategoriStore.rows = input.rows;
}

export function flashMasterAnggotaSaved(id: string) {
  masterAnggotaStore.savedId = '';
  masterAnggotaStore.savedId = id;
  clearTimeout(anggotaSavedTimer);
  anggotaSavedTimer = setTimeout(() => {
    if (masterAnggotaStore.savedId === id) masterAnggotaStore.savedId = '';
  }, 1100);
  (anggotaSavedTimer as { unref?: () => void })?.unref?.();
}

export function flashMasterKategoriSaved(id: string) {
  masterKategoriStore.savedId = '';
  masterKategoriStore.savedId = id;
  clearTimeout(kategoriSavedTimer);
  kategoriSavedTimer = setTimeout(() => {
    if (masterKategoriStore.savedId === id) masterKategoriStore.savedId = '';
  }, 1100);
  (kategoriSavedTimer as { unref?: () => void })?.unref?.();
}

export function updateAuditLogStore({ status, errorMessage = '', totalCount = 0, rows = [] }: AuditLogInput) {
  Object.assign(auditLogStore, { status, errorMessage, totalCount, rows });
}

export function updateSkippedMonthsStore(input: { items: SkippedMonthItem[] }) {
  skippedMonthsStore.items = input.items;
}

export function resetMasterState() {
  clearTimeout(anggotaSavedTimer);
  clearTimeout(kategoriSavedTimer);
  masterAnggotaStore.savedId = '';
  masterKategoriStore.savedId = '';
  updateMasterAnggotaStore({ rows: [], query: '' });
  updateMasterKategoriStore({ rows: [] });
  updateAuditLogStore({ status: 'idle' });
  updateSkippedMonthsStore({ items: [] });
}
