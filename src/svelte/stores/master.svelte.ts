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

export const masterAnggotaStore = $state<{ rows: MasterAnggotaRow[]; query: string }>({ rows: [], query: '' });
export const masterKategoriStore = $state<{ rows: MasterKategoriRow[] }>({ rows: [] });
export const auditLogStore = $state<Required<AuditLogInput>>({ status: 'idle', errorMessage: '', totalCount: 0, rows: [] });
export const skippedMonthsStore = $state<{ items: SkippedMonthItem[] }>({ items: [] });

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

export function updateAuditLogStore({ status, errorMessage = '', totalCount = 0, rows = [] }: AuditLogInput) {
  Object.assign(auditLogStore, { status, errorMessage, totalCount, rows });
}

export function updateSkippedMonthsStore(input: { items: SkippedMonthItem[] }) {
  skippedMonthsStore.items = input.items;
}

export function resetMasterState() {
  updateMasterAnggotaStore({ rows: [], query: '' });
  updateMasterKategoriStore({ rows: [] });
  updateAuditLogStore({ status: 'idle' });
  updateSkippedMonthsStore({ items: [] });
}
