export type GroupId = string;
export type ArusTipe = 'Masuk' | 'Keluar';
export type StatusAktif = 'Aktif' | 'Nonaktif';

export interface Anggota {
  ID_Anggota: string;
  Nama_Anggota: string;
  Status_Aktif: StatusAktif;
  Tanggal_Gabung?: string;
  Tanggal_Bergabung?: string;
  Nomor_WA?: string;
  groupId?: GroupId;
}

export interface Kategori {
  ID_Kategori: string;
  Nama_Kategori: string;
  Tipe: ArusTipe;
  groupId?: GroupId;
}

interface ProofMetadata {
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export interface Transaksi {
  ID_Transaksi: string;
  Timestamp: string;
  Tipe_Arus: ArusTipe;
  ID_Kategori: string;
  ID_Anggota: string;
  Bulan_Iuran: string;
  Tahun_Iuran: string | number;
  Nominal: number;
  Keterangan: string;
  Bukti?: ProofMetadata | null;
  groupId?: GroupId;
  operationId?: string;
}

export interface PaymentAccount {
  bank?: string;
  number?: string;
  holder?: string;
  whatsapp?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  qrisPayload?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface GroupSettings {
  skippedMonths: string[];
  kasStart: string;
  paymentAccount?: PaymentAccount | null;
}

export interface AppState extends GroupSettings {
  anggota: Anggota[];
  kategori: Kategori[];
  transaksi: Transaksi[];
  paymentAccount: PaymentAccount | null;
}

export interface DuesMonth {
  monthIndex: number;
  year: number;
  paid: number;
  owed: boolean;
  skipped: boolean;
  due: boolean;
  remaining: number;
  credited: number;
  status: 'exempt' | 'paid' | 'partial' | 'unpaid';
}

export interface DuesMemberSummary {
  ang: Anggota;
  months: DuesMonth[];
  expectedTotal: number;
  paidTotal: number;
  arrears: number;
  unpaidMonths: number;
  partialMonths: number;
}

export interface DuesLedger {
  getMonth(member: Anggota, monthIndex: number, year: number | string): DuesMonth;
  summarize(member: Anggota): DuesMemberSummary;
  members: DuesMemberSummary[];
  monthlyFee: number;
  unpaidCount: number;
  arrears: number;
}

export interface SnapshotData extends GroupSettings {
  anggota: Anggota[];
  kategori: Kategori[];
  transaksi: Transaksi[];
  attachments: (ProofMetadata & { idTransaksi: string; base64: string })[];
  operations: {
    operationId: string;
    fingerprint: string;
    action: string;
    status: string;
    createdAt: string;
    responseStatus: boolean;
    responseMessage: string;
    responseData: object | null;
  }[];
}

export interface SnapshotEnvelope {
  app: 'Finkas';
  version: 2;
  exportedAt: string;
  consistency: 'firestore-read-only-transaction' | 'best-effort-read';
  group: { id: GroupId; nama: string };
  stats: {
    totalAnggota: number;
    totalKategori: number;
    totalTransaksi: number;
    totalAttachments: number;
    totalOperations: number;
    skippedMonthsCount: number;
  };
  data: SnapshotData;
}

export interface MutationFields {
  duplicate?: boolean;
  isReplay?: boolean;
  inserted?: number;
  skipped?: string[];
  transactions?: Transaksi[];
  rows?: Transaksi[];
  transaction?: Transaksi;
  idTransaksi?: string;
  skippedMonths?: string[];
  kasStart?: string;
}

export type MutationData = MutationFields & (Transaksi | { ID_Transaksi?: undefined });

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

interface GoogleOAuth2 {
  initTokenClient(options: {
    client_id: string;
    scope: string;
    callback(response: { access_token?: string; error?: string; error_description?: string }): void;
    error_callback(error: { message?: string }): void;
  }): { requestAccessToken(options: { prompt: string }): void };
}

declare global {
  interface DocumentEventMap {
    'finkas:modal-opened': CustomEvent<{ id: string }>;
  }
  interface WindowEventMap {
    beforeinstallprompt: InstallPromptEvent;
    'finkas:queue-changed': CustomEvent<{ groupId: GroupId; pendingCount: number; state: 'idle' | 'queued' | 'sending' | 'failed' }>;
    'finkas:group-changed': CustomEvent<{groupId: GroupId; previousGroupId: GroupId}>;
  }
  interface Window {
    __pwaPrompt?: InstallPromptEvent;
    google?: { accounts?: { oauth2?: GoogleOAuth2 } };
    dataLayer: IArguments[];
    gtag?: (...args: unknown[]) => void;
  }
  interface ServiceWorkerRegistration {
    sync?: { register(tag: string): Promise<void> };
  }
}

export interface ApiRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string };
}

export type ApiResponse = VercelResponse | Pick<import('node:http').ServerResponse, 'statusCode' | 'setHeader' | 'end'>;

interface VercelResponse {
  status(code: number): VercelResponse;
  json(payload: unknown): ApiResponse | void;
  setHeader(name: string, value: string | string[]): void;
  end?(chunk?: unknown): void;
}

export type FirestoreHeaders = Record<string, string>;

export type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

export interface FirestoreDoc {
  name?: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

export interface SessionClaims {
  role: string;
  gid: string;
  email: string;
  exp: number;
  iat?: number;
}

export interface ApiHandlerResult<T = unknown> {
  code: number;
  payload: { status: boolean; message?: string; data?: T };
}

export interface GroupRecord {
  id: string;
  nama: string;
  dibuat?: string;
  [key: string]: unknown;
}
