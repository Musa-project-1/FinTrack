import type { Transaksi } from '../../types/finkas';
import { getReceiptData, renderReceiptHtml } from './receipt';
import { NAMA_BULAN } from "finkas/core/config";
import { getState, currentRekapYear } from "finkas/core/state";
import { formatRp, showToast, escapeHtml } from "finkas/core/utils";
import { createDuesLedger, billingPeriod } from "finkas/core/dues";
import { escapeCsvFormula } from "finkas/core/cash-report";
import { closeModal } from "../ui/modal";
import { flashCopyFeedback } from "../ui/keel";
import { flashDownloadRing, isReducedMotion } from "../ui/ui-moments";
import { trackEvent } from "finkas/core/analytics";

export const cetakStruk = (idTrx: string) => {
  const receipt = getReceiptData(idTrx);
  if (!receipt) return;
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Struk Transaksi</title>
    <style>
      body{font:14px/1.45 monospace;color:#111;padding:20px;max-width:320px;margin:auto}
      header{text-align:center;border-bottom:1px dashed;padding-bottom:10px}
      h1{font-size:18px;margin:0}.receipt-amount{font-size:22px;font-weight:bold}
      .receipt-rows{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:6px 12px}
      .receipt-rows dd{margin:0;overflow-wrap:anywhere}.receipt-footer{border-top:1px dashed;padding-top:8px}
      .receipt-seal{display:flex;align-items:center;gap:8px;border:1.5px solid;padding:7px;width:fit-content;margin:12px auto 0;border-radius:8px}
      .receipt-seal-ico svg{width:34px;height:34px}.receipt-seal-copy{display:grid;gap:2px}
      .seal-halo,.seal-track-ring,.seal-core-ring{fill:none;stroke:currentColor}.seal-core{fill:currentColor}
      .seal-check{fill:none;stroke:white;stroke-width:2.3}
      .receipt-seal[data-tone="verified"]{color:#174ea6}
    </style></head><body><header><h1>Finkas · Bukti Transaksi</h1><p>${escapeHtml(receipt.group)} · ${escapeHtml(receipt.transaction.ID_Transaksi)}</p></header>
    ${renderReceiptHtml(receipt)}</body></html>`;

  const pw = window.open('', '_blank', 'width=400,height=600');
  if (!pw) return showToast('Izinkan pop-up untuk mencetak bukti transaksi.', 'warning');
  pw.document.open();
  pw.document.write(html);
  pw.document.close();
  try { pw.opener = null; } catch (_) {}
  pw.focus();
  pw.addEventListener('afterprint', () => {
    try { pw.close(); } catch (_) {}
  });
  setTimeout(() => {
    try { pw.print(); } catch (_) {}
  }, 250);
};

export const cetakLaporanTahunan = () => {
  const state = getState();
  if (state.anggota.length === 0) return showToast('Tidak ada data anggota untuk dicetak.', 'error');
  closeModal('modal-export');

  const ledger = createDuesLedger(state, { year: currentRekapYear });
  const skipSet = new Set(state.skippedMonths || []);

  const monthTotals = Array(NAMA_BULAN.length).fill(0);
  let tbodyHTML = '';
  let index = 1;
  state.anggota.forEach((ang) => {
    if (ang.Status_Aktif === 'Aktif') {
      let tr = `<tr><td style="text-align:center;">${index++}</td><td style="text-align:left;padding-left:8px;">${escapeHtml(ang.Nama_Anggota)}</td>`;
      NAMA_BULAN.forEach((bulan, idx) => {
        const month = ledger.getMonth(ang, idx, currentRekapYear);
        if (!month.owed) {
          tr += '<td style="text-align:center;color:#999;">-</td>';
        } else if (month.status === 'paid') {
          monthTotals[idx]++;
          tr += '<td style="text-align:center;color:#059669;font-weight:700;">&#10003;</td>';
        } else if (month.status === 'partial') {
          tr += '<td style="text-align:center;color:#b45309;font-weight:600;">Sebagian</td>';
        } else {
          tr += '<td style="text-align:center;"></td>';
        }
      });
      tbodyHTML += tr + '</tr>';
    }
  });

  const totalsRow = `<tr style="background:#f1f5f9;font-weight:700;"><td colspan="2" style="text-align:left;padding-left:8px;">Jumlah Lunas / Bulan</td>${monthTotals.map((n) => `<td style="text-align:center;">${n}</td>`).join('')}</tr>`;
  const safeYear = escapeHtml(currentRekapYear);
  const skippedList = Array.from(skipSet)
    .filter((k) => k.endsWith(`-${currentRekapYear}`))
    .map((k) => NAMA_BULAN[parseInt(k.split('-')[0], 10) - 1])
    .join(', ');
  const skippedNote = skippedList ? `<p style="text-align:center;color:#555;font-size:12px;margin-top:8px;">Bulan libur (${safeYear}): <b>${escapeHtml(skippedList)}</b></p>` : '';

  const html = `<html><head><title>Laporan Rekap Iuran ${safeYear}</title><style>body{font-family:'Segoe UI',sans-serif;padding:20px;color:#111}h2{text-align:center;margin-bottom:5px}p{text-align:center;margin-top:0;color:#555;font-size:14px;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}th,td{border:1px solid #aaa;padding:8px 4px}th{background-color:#eee;text-transform:uppercase;font-size:11px;text-align:center}@media print{@page{size:landscape;margin:15mm}}</style></head><body><h2>Laporan Rekap Iuran Anggota</h2><p>Tahun: <b>${safeYear}</b> | Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p><table><thead><tr><th style="width:30px;">No</th><th style="text-align:left;padding-left:8px;width:180px;">Nama Anggota</th><th>Jan</th><th>Feb</th><th>Mar</th><th>Apr</th><th>Mei</th><th>Jun</th><th>Jul</th><th>Agu</th><th>Sep</th><th>Okt</th><th>Nov</th><th>Des</th></tr></thead><tbody>${tbodyHTML}${totalsRow}</tbody></table>${skippedNote}<p style="text-align:center;color:#777;font-size:11px;margin-top:10px;">Keterangan: &#10003; = Lunas &nbsp;|&nbsp; - = Bulan libur (tidak dihitung tunggakan)</p><div style="margin-top:50px;text-align:right;padding-right:60px;"><p style="text-align:right;color:#111;">Mengetahui,</p><br><br><br><p style="text-align:right;color:#111;"><b>Pengurus Kas</b></p></div></body></html>`;

  const pw = window.open('', '_blank');
  if (!pw) return showToast('Izinkan pop-up untuk mencetak laporan rekap.', 'warning');
  pw.document.open();
  pw.document.write(html);
  pw.document.close();
  try { pw.opener = null; } catch (_) {}
  pw.focus();
  pw.addEventListener('afterprint', () => {
    try { pw.close(); } catch (_) {}
  });
  setTimeout(() => {
    try { pw.print(); } catch (_) {}
  }, 250);
};

/* ══════════════════════════════════════════════════════════════════
   MONTHLY RECAP FOR WHATSAPP
   ══════════════════════════════════════════════════════════════════ */

export const copyMonthlyRecap = async (btn?: HTMLElement | null) => {
  const state = getState();
  const now = new Date();
  const bulan = NAMA_BULAN[now.getMonth()];
  const tahun = now.getFullYear();
  const monthKey = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${tahun}`;
  const isSkipped = (state.skippedMonths || []).includes(monthKey);

  const inMonth = (t: Transaksi) => {
    const d = new Date(t.Timestamp);
    return d.getMonth() === now.getMonth() && d.getFullYear() === tahun;
  };

  const masuk = state.transaksi.filter((t) => t.Tipe_Arus === 'Masuk' && inMonth(t)).reduce((s, t) => s + (Number(t.Nominal) || 0), 0);
  const keluar = state.transaksi.filter((t) => t.Tipe_Arus === 'Keluar' && inMonth(t)).reduce((s, t) => s + (Number(t.Nominal) || 0), 0);
  const totalMasuk = state.transaksi.filter((t) => t.Tipe_Arus === 'Masuk').reduce((s, t) => s + (Number(t.Nominal) || 0), 0);
  const totalKeluar = state.transaksi.filter((t) => t.Tipe_Arus === 'Keluar').reduce((s, t) => s + (Number(t.Nominal) || 0), 0);

  const monthIdx = NAMA_BULAN.indexOf(bulan);
  const ledger = createDuesLedger(state, { now });
  const active = (state.anggota || []).filter((a) => a.Status_Aktif === 'Aktif');
  const paidMembers = active.filter((a) => ledger.getMonth(a, monthIdx, tahun).status === 'paid');
  const belum = active.filter((a) => ledger.getMonth(a, monthIdx, tahun).remaining > 0).map((a) => a.Nama_Anggota);

  const lines = [
    `*Rekap Kas ${bulan} ${tahun}*`,
    `Masuk: ${formatRp(masuk)} (${paidMembers.length}/${active.length} anggota)`,
    `Keluar: ${formatRp(keluar)}`,
    `Saldo kas: ${formatRp(totalMasuk - totalKeluar)}`
  ];
  if (isSkipped) {
    lines.push('(Bulan libur: tidak ada iuran)');
  } else if (belum.length > 0) {
    lines.push(`Belum lunas: ${belum.join(', ')}`);
  } else {
    lines.push('Semua anggota sudah lunas. Terima kasih!');
  }

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    trackEvent('copy_wa_rekap', { bulan, tahun });
    flashCopyFeedback(btn, null, 'Rekap Tersalin (WA)');
    showToast('Rekap bulanan disalin! Tempel di grup WA.', 'success');
    if (
      btn &&
      globalThis.window?.matchMedia?.('(prefers-reduced-motion: no-preference)')?.matches &&
      typeof globalThis.setTimeout === 'function'
    ) {
      await new Promise<void>((resolve) => { globalThis.setTimeout(resolve, 460); });
    }
    closeModal('modal-export');
  } catch (err) {
    showToast('Gagal menyalin. Izinkan akses clipboard.', 'error');
  }
};

/* ══════════════════════════════════════════════════════════════════
    CSV EXPORT
   ══════════════════════════════════════════════════════════════════ */

export const exportToCSV = (btn?: HTMLElement | null) => {
  const state = getState();
  if (state.transaksi.length === 0) return showToast('Tidak ada data untuk diunduh', 'error');

  const header = ['ID Transaksi', 'Waktu', 'Tipe Arus', 'Kategori', 'Anggota', 'Bulan Iuran', 'Tahun Iuran', 'Nominal', 'Keterangan'];
  const lines = [header.map((h) => escapeCsvFormula(h, false)).join(';')];

  [...state.transaksi]
    .sort((a, b) => Date.parse(a.Timestamp) - Date.parse(b.Timestamp))
    .forEach((row) => {
      const waktu = new Date(row.Timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const kat = state.kategori.find((k) => k.ID_Kategori === row.ID_Kategori);
      const ang = row.ID_Anggota && row.ID_Anggota !== '-' ? state.anggota.find((a) => a.ID_Anggota === row.ID_Anggota) : null;
      lines.push([
        escapeCsvFormula(row.ID_Transaksi),
        escapeCsvFormula(waktu),
        escapeCsvFormula(row.Tipe_Arus),
        escapeCsvFormula(kat ? kat.Nama_Kategori : (row.ID_Kategori || '-')),
        escapeCsvFormula(ang ? ang.Nama_Anggota : '-'),
        escapeCsvFormula(row.Bulan_Iuran || '-'),
        escapeCsvFormula(row.Tahun_Iuran || '-'),
        escapeCsvFormula(row.Nominal, true),
        escapeCsvFormula(row.Keterangan || '')
      ].join(';'));
    });

  // BOM (\uFEFF) agar Excel membaca UTF-8 dengan benar; ';' sesuai locale Excel Indonesia
  const content = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Laporan_Kas_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  flashDownloadRing(btn, 'Terunduh');
  trackEvent('export_csv', { count: state.transaksi.length });
  showToast('File Excel (CSV) diunduh!');
  if (btn?.closest?.('#modal-export') && !isReducedMotion()) {
    const t = setTimeout(() => closeModal('modal-export'), 520);
    (t as unknown as { unref?: () => void })?.unref?.();
  } else {
    closeModal('modal-export');
  }
};

/* ══════════════════════════════════════════════════════════════════
   WHATSAPP REMINDER MESSAGE
   ══════════════════════════════════════════════════════════════════ */

let isCreatingReminder = false;
export const createGroupReminderMessage = async (btn?: HTMLElement | null) => {
  if (isCreatingReminder) return;
  isCreatingReminder = true;
  try {
    await doCreateGroupReminderMessage(btn);
  } finally {
    setTimeout(() => { isCreatingReminder = false; }, 800);
  }
};

const doCreateGroupReminderMessage = async (btn?: HTMLElement | null) => {
  const now = new Date();
  const ledger = createDuesLedger(getState(), { now });
  const results = ledger.members
    .filter((m) => m.arrears > 0)
    .sort((a, b) => a.ang.Nama_Anggota.localeCompare(b.ang.Nama_Anggota))
    .map((m) => ({
      name: m.ang.Nama_Anggota,
      unpaidMonths: m.unpaidMonths,
      amountRp: formatRp(m.arrears)
    }));

  if (results.length === 0) return showToast('Semua iuran sudah lunas untuk periode ini.', 'success');

  const current = billingPeriod(now);
  const endMonthName = NAMA_BULAN[current.monthIndex];
  const endYear = current.year;
  const header = `Halo teman-teman, pengingat uang kas kelas sampai bulan ${endMonthName} ${endYear} ya! \u{1F4B8}`;
  let skippedNote = '';
  const skippedNames = (getState().skippedMonths || []).map((k) => NAMA_BULAN[parseInt(k.split('-')[0], 10) - 1]).filter(Boolean);
  if (skippedNames.length > 0) {
    const uniq = Array.from(new Set(skippedNames));
    const last = uniq.pop();
    skippedNote = `(Catatan: Kas bulan ${uniq.length ? uniq.join(', ') + ' dan ' : ''}${last} libur)`;
  }
  const lines = results.map((r, i) => `${i + 1}. ${r.name} - ${r.amountRp} (kurang ${r.unpaidMonths} bulan)`);
  const parts = [header];
  if (skippedNote) parts.push(skippedNote);
  parts.push('Berikut daftar yang masih ada tunggakan:\n');
  parts.push(lines.join('\n'));
  parts.push('\nYuk segera dilunasin ke bendahara! Terima kasih \u{1F64F}');

  try {
    await navigator.clipboard.writeText(parts.join('\n'));
    trackEvent('copy_wa_reminder', { count: results.length });
    flashCopyFeedback(btn, null, 'Tagihan Tersalin');
    showToast('Pesan pengingat disalin! Siap ditempel ke grup WA.', 'success');
  } catch (err) {
    console.error('copy failed', err);
    showToast('Gagal menyalin pesan. Silakan izinkan akses clipboard.', 'error');
  }
};

