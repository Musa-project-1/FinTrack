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
  Bukti?: ProofMetadata;
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

declare global {
  interface WindowEventMap {
    'finkas:group-changed': CustomEvent<{groupId: GroupId; previousGroupId: GroupId}>;
  }
  interface Window {
    dataLayer: IArguments[];
    gtag?: (...args: unknown[]) => void;
  }
  interface ServiceWorkerRegistration {
    sync?: { register(tag: string): Promise<void> };
  }
}
