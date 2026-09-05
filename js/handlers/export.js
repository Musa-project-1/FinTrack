import { NAMA_BULAN, GROUP_START_YEAR, GROUP_START_MONTH } from "../config.js";
import { getState, currentRekapYear } from "../state.js";
import { formatRp, showToast, escapeHtml } from "../utils.js";
import { closeModal } from "../modal.js";

export const cetakStruk = (idTrx) => {
  const state = getState();
  const trx = state.transaksi.find((t) => t.ID_Transaksi === idTrx);
  if (!trx) return;
  const tglStr = new Date(trx.Timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const objKategori = state.kategori.find((k) => k.ID_Kategori === trx.ID_Kategori);
  const namaKat = objKategori ? objKategori.Nama_Kategori : '-';
  const objAng = state.anggota.find((a) => a.ID_Anggota === trx.ID_Anggota);
  const namaAnggota = objAng ? objAng.Nama_Anggota : '-';

  const html = `<html><head><title>Struk Transaksi</title><style>body{font-family:'Courier New',monospace;font-size:14px;color:#000;padding:20px;width:300px;margin:0 auto}.header{text-align:center;border-bottom:1px dashed #000;padding-bottom:10px;margin-bottom:10px}.row{display:flex;justify-content:space-between;margin-bottom:5px}.footer{text-align:center;border-top:1px dashed #000;padding-top:10px;margin-top:10px;font-size:12px}h2{margin:0;font-size:18px}</style></head><body><div class="header"><h2>FINKAS</h2><div>Bukti Transaksi</div><div style="font-size:11px;margin-top:4px;">ID: ${escapeHtml(trx.ID_Transaksi)}</div></div><div style="margin-bottom:15px;font-size:12px;">Waktu: ${escapeHtml(tglStr)}</div><div class="row"><span>Tipe Arus:</span><span><b>${escapeHtml(trx.Tipe_Arus.toUpperCase())}</b></span></div><div class="row"><span>Kategori:</span><span>${escapeHtml(namaKat)}</span></div><div class="row"><span>Anggota:</span><span>${escapeHtml(namaAnggota)}</span></div><div class="row" style="margin-top:10px;padding-top:10px;border-top:1px dashed #ccc;"><span><b>NOMINAL:</b></span><span style="font-size:16px;"><b>${formatRp(trx.Nominal)}</b></span></div><div style="margin-top:15px;">Catatan:<br><i>${escapeHtml(trx.Keterangan || '-')}</i></div><div class="footer">Dicetak oleh Sistem<br><i>Terima kasih</i></div></body></html>`;

  const pw = window.open('', '_blank', 'width=400,height=600');
  pw.document.write(html);
  pw.document.close();
  pw.focus();
  setTimeout(() => { pw.print(); pw.close(); }, 500);
};

export const cetakLaporanTahunan = () => {
  const state = getState();
  if (state.anggota.length === 0) return showToast('Tidak ada data anggota untuk dicetak.', 'error');
  closeModal('modal-export');

  const skipSet = new Set(state.skippedMonths || []);
  const mapPembayaran = {};
  state.transaksi.forEach((t) => {
    if (t.Tahun_Iuran && t.Tahun_Iuran.toString() === currentRekapYear) {
      mapPembayaran[`${t.ID_Anggota}_${t.Bulan_Iuran}`] = true;
    }
  });

  const monthTotals = Array(NAMA_BULAN.length).fill(0);
  let tbodyHTML = '';
  let index = 1;
  state.anggota.forEach((ang) => {
    if (ang.Status_Aktif === 'Aktif') {
      let tr = `<tr><td style="text-align:center;">${index++}</td><td style="text-align:left;padding-left:8px;">${escapeHtml(ang.Nama_Anggota)}</td>`;
      NAMA_BULAN.forEach((bulan, idx) => {
        const monthKey = `${(idx + 1).toString().padStart(2, '0')}-${currentRekapYear}`;
        if (skipSet.has(monthKey)) {
          tr += '<td style="text-align:center;color:#999;">-</td>';
        } else if (mapPembayaran[`${ang.ID_Anggota}_${bulan}`]) {
          monthTotals[idx]++;
          tr += '<td style="text-align:center;color:#059669;font-weight:700;">&#10003;</td>';
        } else {
          tr += '<td style="text-align:center;"></td>';
        }
      });
      tbodyHTML += tr + '</tr>';
    }
  });

  const totalsRow = `<tr style="background:#f1f5f9;font-weight:700;"><td colspan="2" style="text-align:left;padding-left:8px;">Jumlah Lunas / Bulan</td>${monthTotals.map((n) => `<td style="text-align:center;">${n}</td>`).join('')}</tr>`;
  const skippedList = Array.from(skipSet)
    .filter((k) => k.endsWith(`-${currentRekapYear}`))
    .map((k) => NAMA_BULAN[parseInt(k.split('-')[0], 10) - 1])
    .join(', ');
  const skippedNote = skippedList ? `<p style="text-align:center;color:#555;font-size:12px;margin-top:8px;">Bulan libur (${currentRekapYear}): <b>${escapeHtml(skippedList)}</b></p>` : '';

  const html = `<html><head><title>Laporan Rekap Iuran ${currentRekapYear}</title><style>body{font-family:'Segoe UI',sans-serif;padding:20px;color:#111}h2{text-align:center;margin-bottom:5px}p{text-align:center;margin-top:0;color:#555;font-size:14px;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}th,td{border:1px solid #aaa;padding:8px 4px}th{background-color:#eee;text-transform:uppercase;font-size:11px;text-align:center}@media print{@page{size:landscape;margin:15mm}}</style></head><body><h2>Laporan Rekap Iuran Anggota</h2><p>Tahun: <b>${currentRekapYear}</b> | Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p><table><thead><tr><th style="width:30px;">No</th><th style="text-align:left;padding-left:8px;width:180px;">Nama Anggota</th><th>Jan</th><th>Feb</th><th>Mar</th><th>Apr</th><th>Mei</th><th>Jun</th><th>Jul</th><th>Agu</th><th>Sep</th><th>Okt</th><th>Nov</th><th>Des</th></tr></thead><tbody>${tbodyHTML}${totalsRow}</tbody></table>${skippedNote}<p style="text-align:center;color:#777;font-size:11px;margin-top:10px;">Keterangan: &#10003; = Lunas &nbsp;|&nbsp; - = Bulan libur (tidak dihitung tunggakan)</p><div style="margin-top:50px;text-align:right;padding-right:60px;"><p style="text-align:right;color:#111;">Mengetahui,</p><br><br><br><p style="text-align:right;color:#111;"><b>Pengurus Kas</b></p></div></body></html>`;

  const pw = window.open('', '_blank');
  pw.document.write(html);
  pw.document.close();
  pw.focus();
  setTimeout(() => { pw.print(); pw.close(); }, 500);
};

/* ══════════════════════════════════════════════════════════════════
   MONTHLY RECAP FOR WHATSAPP
   ══════════════════════════════════════════════════════════════════ */

export const copyMonthlyRecap = async () => {
  const state = getState();
  const now = new Date();
  const bulan = NAMA_BULAN[now.getMonth()];
  const tahun = now.getFullYear();
  const monthKey = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${tahun}`;
  const isSkipped = (state.skippedMonths || []).includes(monthKey);

  const inMonth = (t) => {
    const d = new Date(t.Timestamp);
    return d.getMonth() === now.getMonth() && d.getFullYear() === tahun;
  };

  const masuk = state.transaksi.filter((t) => t.Tipe_Arus === 'Masuk' && inMonth(t)).reduce((s, t) => s + (Number(t.Nominal) || 0), 0);
  const keluar = state.transaksi.filter((t) => t.Tipe_Arus === 'Keluar' && inMonth(t)).reduce((s, t) => s + (Number(t.Nominal) || 0), 0);
  const totalMasuk = state.transaksi.filter((t) => t.Tipe_Arus === 'Masuk').reduce((s, t) => s + (Number(t.Nominal) || 0), 0);
  const totalKeluar = state.transaksi.filter((t) => t.Tipe_Arus === 'Keluar').reduce((s, t) => s + (Number(t.Nominal) || 0), 0);

  const paidSet = new Set(
    state.transaksi
      .filter((t) => t.Tipe_Arus === 'Masuk' && t.Bulan_Iuran === bulan && String(t.Tahun_Iuran) === String(tahun) && t.ID_Anggota !== '-')
      .map((t) => t.ID_Anggota)
  );
  const active = state.anggota.filter((a) => a.Status_Aktif === 'Aktif');
  const belum = active.filter((a) => !paidSet.has(a.ID_Anggota)).map((a) => a.Nama_Anggota);

  const lines = [
    `*Rekap Kas ${bulan} ${tahun}*`,
    `Masuk: ${formatRp(masuk)} (${paidSet.size}/${active.length} anggota)`,
    `Keluar: ${formatRp(keluar)}`,
    `Saldo kas: ${formatRp(totalMasuk - totalKeluar)}`
  ];
  if (isSkipped) {
    lines.push('(Bulan libur — tidak ada iuran)');
  } else if (belum.length > 0) {
    lines.push(`Belum bayar: ${belum.join(', ')}`);
  } else {
    lines.push('Semua anggota sudah lunas. Terima kasih!');
  }

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    showToast('Rekap bulanan disalin! Tempel di grup WA.', 'success');
    closeModal('modal-export');
  } catch (err) {
    showToast('Gagal menyalin. Izinkan akses clipboard.', 'error');
  }
};

/* ══════════════════════════════════════════════════════════════════
    CSV EXPORT
   ══════════════════════════════════════════════════════════════════ */

export const exportToCSV = () => {
  const state = getState();
  if (state.transaksi.length === 0) return showToast('Tidak ada data untuk diunduh', 'error');
  closeModal('modal-export');

  const q = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
  const header = ['ID Transaksi', 'Waktu', 'Tipe Arus', 'Kategori', 'Anggota', 'Bulan Iuran', 'Tahun Iuran', 'Nominal', 'Keterangan'];
  const lines = [header.map(q).join(';')];

  [...state.transaksi]
    .sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp))
    .forEach((row) => {
      const waktu = new Date(row.Timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const kat = state.kategori.find((k) => k.ID_Kategori === row.ID_Kategori);
      const ang = row.ID_Anggota && row.ID_Anggota !== '-' ? state.anggota.find((a) => a.ID_Anggota === row.ID_Anggota) : null;
      lines.push([
        row.ID_Transaksi,
        waktu,
        row.Tipe_Arus,
        kat ? kat.Nama_Kategori : (row.ID_Kategori || '-'),
        ang ? ang.Nama_Anggota : '-',
        row.Bulan_Iuran || '-',
        row.Tahun_Iuran || '-',
        row.Nominal,
        row.Keterangan || ''
      ].map(q).join(';'));
    });

  // BOM (\uFEFF) agar Excel membaca UTF-8 dengan benar; ';' sesuai locale Excel Indonesia
  const blob = '\uFEFF' + lines.join('\r\n');
  const link = document.createElement('a');
  link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(blob));
  link.setAttribute('download', `Laporan_Kas_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('File Excel (CSV) diunduh!');
};

/* ══════════════════════════════════════════════════════════════════
   WHATSAPP REMINDER MESSAGE
   ══════════════════════════════════════════════════════════════════ */

export const createGroupReminderMessage = async () => {
  const startYear = GROUP_START_YEAR;
  const startMonth = GROUP_START_MONTH;
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  const monthlyFee = DEFAULT_MONTHLY_FEE;

  const monthsRange = [];
  let y = startYear, m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    monthsRange.push(`${m.toString().padStart(2, '0')}-${y}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }

  const monthsSet = new Set(monthsRange);
  const skippedSet = new Set(getState().skippedMonths || []);
  const skippedNames = monthsRange.filter((k) => skippedSet.has(k)).map((k) => NAMA_BULAN[parseInt(k.split('-')[0], 10) - 1]);

  const trxByMember = {};
  getState().transaksi.forEach((t) => {
    if (!t.ID_Anggota) return;
    trxByMember[t.ID_Anggota] = trxByMember[t.ID_Anggota] || [];
    trxByMember[t.ID_Anggota].push(t);
  });

  const results = [];
  getState().anggota
    .filter((a) => a.Status_Aktif === 'Aktif')
    .sort((a, b) => a.Nama_Anggota.localeCompare(b.Nama_Anggota))
    .forEach((ang) => {
      let expectedTotal = 0;
      monthsRange.forEach((k) => { if (!skippedSet.has(k)) expectedTotal += monthlyFee; });
      let paidTotal = 0;
      (trxByMember[ang.ID_Anggota] || []).forEach((t) => {
        if (t.Tipe_Arus !== 'Masuk' || !t.Tahun_Iuran || !t.Bulan_Iuran) return;
        const idx = NAMA_BULAN.indexOf(t.Bulan_Iuran);
        if (idx === -1) return;
        const key = `${(idx + 1).toString().padStart(2, '0')}-${t.Tahun_Iuran}`;
        if (monthsSet.has(key)) paidTotal += Number(t.Nominal) || 0;
      });
      const arrears = expectedTotal - paidTotal;
      if (arrears > 0) {
        results.push({ name: ang.Nama_Anggota, unpaidMonths: Math.floor(arrears / monthlyFee), amountRp: formatRp(arrears) });
      }
    });

  if (results.length === 0) return showToast('Semua iuran sudah lunas untuk periode ini.', 'success');

  const endMonthName = NAMA_BULAN[endMonth - 1];
  const header = `Halo teman-teman, pengingat uang kas kelas sampai bulan ${endMonthName} ${endYear} ya! \u{1F4B8}`;
  let skippedNote = '';
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
    alert('Message copied successfully! Please paste it in the Class WA Group.');
    showToast('Pesan berhasil disalin ke clipboard.', 'success');
  } catch (err) {
    console.error('copy failed', err);
    showToast('Gagal menyalin pesan. Silakan izinkan akses clipboard.', 'error');
  }
};

/* ══════════════════════════════════════════════════════════════════
   INIT APP
   ══════════════════════════════════════════════════════════════════ */

let isLoading = false;

