export interface CashReportInvalidItem {
  id: string;
  reason: string;
}

export interface CashReportRow {
  key: string;
  isIn: boolean;
  dateStr: string;
  timeStr: string;
  keterangan: string;
  metaText: string;
  nominalFormatted: string;
  balanceFormatted: string;
}

export interface CashReportInput {
  month: string;
  hasErrors: boolean;
  invalidCount: number;
  invalidSample: CashReportInvalidItem[];
  moreCount: number;
  details: CashReportRow[];
}

function emptyReport(): CashReportInput {
  return { month: '', hasErrors: false, invalidCount: 0, invalidSample: [], moreCount: 0, details: [] };
}

export const cashReportStore = $state<CashReportInput>(emptyReport());

export function updateCashReportStore(input: CashReportInput) {
  Object.assign(cashReportStore, input);
}

export function resetCashReportState() {
  updateCashReportStore(emptyReport());
}
