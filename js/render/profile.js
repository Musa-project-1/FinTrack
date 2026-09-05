import { NAMA_BULAN } from "../config.js";
import { getState } from "../state.js";
import { formatRp, escapeHtml } from "../utils.js";
import { openModal } from "../modal.js";

/* ── Member profile modal ──────────────────────────────────────── */

export const bukaProfilAnggota = (idAnggota) => {
  const state = getState();
  const ang = state.anggota.find((a) => a.ID_Anggota === idAnggota);
  if (!ang) return;

  document.getElementById('p-nama-anggota').innerText = ang.Nama_Anggota;
  document.getElementById('p-id-anggota').innerText = `ID: ${ang.ID_Anggota}`;
  const statusBadge = document.getElementById('p-status-anggota');
  statusBadge.innerText = ang.Status_Aktif;
  statusBadge.className = ang.Status_Aktif === 'Aktif' ? 'badge badge-masuk' : 'badge badge-keluar';

  const userTrx = state.transaksi.filter((t) => t.ID_Anggota === idAnggota).reverse();
  let totalKontribusi = 0;
  const bulanCount = {};
  const tahunSet = new Set();

  userTrx.forEach((t) => {
    totalKontribusi += Number(t.Nominal) || 0;
    if (t.Bulan_Iuran && t.Bulan_Iuran !== '-') {
      bulanCount[t.Bulan_Iuran] = (bulanCount[t.Bulan_Iuran] || 0) + 1;
    }
    const year = new Date(t.Timestamp).getFullYear();
    tahunSet.add(year);
  });

  let bulanTerajin = '-';
  let maxCount = 0;
  for (const bln in bulanCount) {
    if (bulanCount[bln] > maxCount) {
      maxCount = bulanCount[bln];
      bulanTerajin = bln;
    }
  }

  document.getElementById('p-total-kontribusi').innerText = formatRp(totalKontribusi);
  document.getElementById('p-bulan-terajin').innerText = bulanTerajin;
  document.getElementById('p-tahun-aktif').innerText = Array.from(tahunSet).sort((a, b) => b - a).join(', ') || '-';

  const tbody = document.getElementById('p-table-transaksi');
  tbody.innerHTML = '';

  if (userTrx.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="td-muted-center">Belum ada riwayat transaksi.</td></tr>';
  } else {
    userTrx.forEach((t) => {
      const tgl = new Date(t.Timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const tr = document.createElement('tr');
      const cat = state.kategori.find((k) => k.ID_Kategori === t.ID_Kategori);
      const namaKat = cat ? cat.Nama_Kategori : '-';
      const ket = t.Bulan_Iuran !== '-' ? `Iuran ${t.Bulan_Iuran} ${t.Tahun_Iuran}` : namaKat;
      tr.innerHTML = `
        <td class="td-audit-time">${tgl}</td>
        <td class="td-desc-text">${ket}</td>
        <td class="td-nom-primary">${formatRp(t.Nominal)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  openModal('modal-profil-anggota');
};

