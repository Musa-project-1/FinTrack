import { getActiveIndicatorStyle, renderPassbookEmblem } from 'finkas/dues-status';

export { renderPassbookEmblem };

export interface ReceiptInput {
  pending: boolean;
  incoming: boolean;
  dateLabel: string;
  amount: string;
  rows: Array<[string, string]>;
  footer: string;
  group: string;
  year: string;
}

function emptyReceipt(): ReceiptInput {
  return { pending: false, incoming: false, dateLabel: '', amount: '', rows: [], footer: '', group: '', year: '' };
}

export const receiptStore = $state({ ...emptyReceipt(), stampStyle: getActiveIndicatorStyle() });

export function updateReceiptStore(input: ReceiptInput) {
  Object.assign(receiptStore, input, { stampStyle: getActiveIndicatorStyle() });
}

export function resetReceiptState() {
  updateReceiptStore(emptyReceipt());
}
