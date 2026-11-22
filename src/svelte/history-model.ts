import type { Anggota, AppState, Kategori, Transaksi } from '../types/finkas';
import { byNewestTimestamp } from '../core/config.js';
import { formatDisplayRp } from '../core/utils.js';

type Options = { filter: string; searchQuery: string; isAdmin: boolean };

export function computeHistoryViewModel(state: AppState, { filter, searchQuery, isAdmin }: Options) {
  const anggotaById = new Map(state.anggota.map(a => [a.ID_Anggota, a]));
  const kategoriById = new Map(state.kategori.map(k => [k.ID_Kategori, k]));
  const query = searchQuery.toLowerCase();
  const flowCounts = { semua: 0, masuk: 0, keluar: 0 };
  const filteredTrx = [...state.transaksi].sort(byNewestTimestamp).filter(trx => {
    const isIuran = Boolean(trx.ID_Anggota) && trx.ID_Anggota !== '-';
    if (query) {
      const fields = [isIuran && anggotaById.get(trx.ID_Anggota)?.Nama_Anggota, trx.Keterangan,
        kategoriById.get(trx.ID_Kategori)?.Nama_Kategori, trx.Bulan_Iuran, trx.Tahun_Iuran, trx.ID_Transaksi];
      if (!fields.some(field => String(field || '').toLowerCase().includes(query))) return false;
    }
    const flow = trx.Tipe_Arus?.toLowerCase();
    flowCounts.semua++;
    if (flow === 'masuk' || flow === 'keluar') flowCounts[flow]++;
    return filter === 'semua' || ((filter === 'masuk' || filter === 'keluar') && filter === flow)
      || (filter === 'iuran' && isIuran) || (filter === 'operasional' && !isIuran);
  });
  const hint = isAdmin ? 'Koreksi / Struk' : 'Lihat Struk';
  return { flowCounts, filteredTrx, hint, anggotaById, kategoriById };
}

export function formatLedgerRows(rows: Transaksi[], anggotaById: Map<string, Anggota>,
  kategoriById: Map<string, Kategori>, hint: string) {
  return rows.map(trx => {
    const inflow = trx.Tipe_Arus === 'Masuk';
    const category = kategoriById.get(trx.ID_Kategori)?.Nama_Kategori || 'Operasional';
    const member = anggotaById.get(trx.ID_Anggota)?.Nama_Anggota;
    const title = member && trx.Bulan_Iuran && trx.Bulan_Iuran !== '-'
      ? `Iuran ${trx.Bulan_Iuran} · ${member}` : trx.Keterangan?.trim() || category;
    const date = new Date(trx.Timestamp);
    const dateLabel = Number.isFinite(date.valueOf()) ? date.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric'
    }) : '—';
    return { id: trx.ID_Transaksi, inflow, flow: inflow ? 'inflow' : 'outflow', category, title,
      dateLabel, amountText: (inflow ? '+' : '−') + formatDisplayRp(trx.Nominal), hint };
  });
}

export type HistoryRowVM = ReturnType<typeof formatLedgerRows>[number];
