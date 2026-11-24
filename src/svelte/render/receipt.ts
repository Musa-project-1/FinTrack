import type { Transaksi } from '../../types/finkas';
import type { ReceiptInput } from '../stores/receipt.svelte';

type ReceiptData = ReceiptInput & { transaction: Transaksi; groupId: string };
import { syncReceiptBody } from '../mount';
import { NAMA_BULAN, byNewestTimestamp } from 'finkas/core/config';
import { getActiveGroupId, getGroupName, getState } from 'finkas/core/state';
import { escapeHtml, formatRp, showToast } from 'finkas/core/utils';
import { isUnsyncedTempId } from 'finkas/core/offline';
import { downloadAttachmentBlob, triggerBlobDownload } from '../handlers/attachments';
import { renderPassbookEmblem } from '../ui/dues-status';
import { flashCopyFeedback } from '../ui/keel';
import { flashDownloadRing } from '../ui/ui-moments';
import { openModal, closeModal } from '../ui/modal';

export const getReceiptData = (id?: string): ReceiptData | null => {
  const state = getState();
  const transaction = state.transaksi.find((item) => item.ID_Transaksi === id);
  if (!transaction) return null;
  const groupId = getActiveGroupId();
  if (transaction.groupId && transaction.groupId !== groupId) return null;
  const incoming = transaction.Tipe_Arus === 'Masuk';
  const pending = isUnsyncedTempId(transaction.ID_Transaksi);
  const date = new Date(transaction.Timestamp);
  const dateLabel = Number.isFinite(date.valueOf())
    ? date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' }) + ' WIB'
    : '—';
  return {
    transaction, groupId, incoming, pending, dateLabel,
    group: document.getElementById('app-group-name')?.textContent || getGroupName(groupId) || 'Finkas',
    amount: formatRp(transaction.Nominal),
    year: Number.isFinite(date.valueOf()) ? date.toLocaleDateString('id-ID', { year: 'numeric', timeZone: 'Asia/Jakarta' }) : '',
    footer: pending ? 'MENUNGGU SINKRON' : incoming ? 'TERVERIFIKASI · KAS SAH' : 'TERCATAT · ARSIP KAS',
    rows: [
      ['Keterangan', transaction.Keterangan || '—'],
      ['Kategori', state.kategori.find((category) => category.ID_Kategori === transaction.ID_Kategori)?.Nama_Kategori || '—'],
      ...(transaction.ID_Anggota && transaction.ID_Anggota !== '-' ? [['Anggota', state.anggota.find((member) => member.ID_Anggota === transaction.ID_Anggota)?.Nama_Anggota || '—'] as [string, string]] : []),
      ...(transaction.Bulan_Iuran && transaction.Bulan_Iuran !== '-' ? [['Periode', `${transaction.Bulan_Iuran} ${transaction.Tahun_Iuran}`] as [string, string]] : []),
      ['Dicatat Oleh', pending ? 'Antrean perangkat' : 'Pengurus kas'],
      ['No. Referensi', transaction.ID_Transaksi]
    ]
  };
};

export const renderReceiptHtml = (receipt: ReceiptData) => `
  <div class="receipt-meta">
    <span class="meta-chip${receipt.pending ? '' : ' paid'}"><i class="${receipt.pending ? 'ph ph-clock' : 'ph-fill ph-check-circle'}" aria-hidden="true"></i> ${receipt.pending ? 'Menunggu sinkron' : 'Tercatat Sah'}</span>
    <span>${escapeHtml(receipt.dateLabel)}</span>
  </div>
  <p class="receipt-amount nominal-val" data-flow="${receipt.incoming ? 'in' : 'out'}">${receipt.incoming ? '+' : '−'}${escapeHtml(receipt.amount)}</p>
  <dl class="receipt-rows">${receipt.rows.map(([name, value]) => `<dt>${name}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl>
  <footer class="receipt-footer">
    <div class="receipt-seal" data-tone="${receipt.incoming && !receipt.pending ? 'verified' : 'neutral'}">
      <span class="receipt-seal-ico">${receipt.pending
        ? '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="16" cy="16" r="13"/><path d="M16 9v7l5 3"/></svg>'
        : renderPassbookEmblem('paid')}</span>
      <span class="receipt-seal-copy">
        <strong>${receipt.footer}</strong>
        <span>${receipt.pending ? 'Antrean perangkat' : 'Segel Digital Bendahara'} · ${escapeHtml(receipt.group)}</span>
      </span>
      <span class="receipt-seal-year">${escapeHtml(receipt.year)}</span>
    </div>
  </footer>`;

const fillReceipt = (receipt: ReceiptData) => {
  const id = receipt.transaction.ID_Transaksi;
  const label = document.getElementById('receipt-group');
  if (label) label.textContent = `${id} · ${receipt.group}`;
  const copyField = (document.getElementById('receipt-copy-text') as HTMLTextAreaElement | null);
  if (copyField) {
    copyField.hidden = true;
    copyField.value = '';
  }
  const { pending, incoming, dateLabel, amount, rows, footer, group, year } = receipt;
  syncReceiptBody({ pending, incoming, dateLabel, amount, rows, footer, group, year });
  for (const buttonId of ['receipt-print', 'receipt-edit']) {
    const button = document.getElementById(buttonId);
    if (button) button.dataset.id = id;
  }
  const attachment = document.getElementById('receipt-attachment');
  if (!attachment) return;
  attachment.dataset.id = id;
  attachment.hidden = !receipt.transaction.Bukti || receipt.pending;
};

export const copyReceipt = async (btn?: HTMLElement | null) => {
  const id = document.getElementById('receipt-print')?.dataset?.id;
  if (!id) return;
  const receipt = getReceiptData(id);
  if (!receipt) return;
  const text = [receipt.group, receipt.transaction.ID_Transaksi, receipt.dateLabel, receipt.transaction.Tipe_Arus, receipt.amount, ...receipt.rows.map(([label, value]) => `${label}: ${value}`), receipt.footer].join('\n');
  try {
    await navigator.clipboard.writeText(text);
    flashCopyFeedback(btn, document.getElementById('receipt-body'));
    showToast('Struk disalin.');
  } catch {
    const field = (document.getElementById('receipt-copy-text') as HTMLTextAreaElement | null);
    if (!field) return;
    field.value = text;
    field.hidden = false;
    field.focus();
    field.select();
  }
};

export const openReceipt = (id: string) => {
  const receipt = getReceiptData(id);
  if (!receipt) return;
  fillReceipt(receipt);
  const bodyEl = document.getElementById('receipt-body');
  if (bodyEl?.classList) {
    bodyEl.classList.remove('is-stamping');
    void bodyEl.offsetWidth;
    bodyEl.classList.add('is-stamping');
  }
  openModal('modal-struk');
};

export const openMonthReceipt = (memberId: string, month: number, year: number) => {
  const transaction = getState().transaksi.filter((row) => (
    row.ID_Anggota === memberId && row.Tipe_Arus === 'Masuk' &&
    row.Bulan_Iuran === NAMA_BULAN[month] && Number(row.Tahun_Iuran) === year && Number(row.Nominal) > 0
  )).sort(byNewestTimestamp)[0];
  if (transaction) openReceipt(transaction.ID_Transaksi);
};

export const downloadReceiptAttachment = async (button: HTMLButtonElement) => {
  const receipt = getReceiptData(button.dataset.id);
  if (!receipt || receipt.pending || !receipt.transaction.Bukti) return;
  button.disabled = true;
  try {
    const file = await downloadAttachmentBlob({ idTransaksi: receipt.transaction.ID_Transaksi, groupId: receipt.groupId });
    if (getActiveGroupId() === receipt.groupId) {
      triggerBlobDownload(file.blob, file.name);
      flashDownloadRing(button, 'Terunduh');
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
};

export const initReceipt = () => {
  const dialog = (document.getElementById('modal-struk') as HTMLDialogElement | null);
  if (!dialog) return;
  dialog.addEventListener('close', () => {
    document.getElementById('receipt-body')?.classList?.remove('is-stamping');
  });
  document.addEventListener('finkas:state-changed', () => {
    if (!dialog.open) return;
    const receipt = getReceiptData(document.getElementById('receipt-print')?.dataset.id);
    if (receipt) fillReceipt(receipt);
    else closeModal('modal-struk');
  });
  window.addEventListener('finkas:group-changed', () => { if (dialog.open) closeModal('modal-struk'); });
};
