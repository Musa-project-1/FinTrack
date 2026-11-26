import { describe, expect, it, afterEach, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import QuickPayModal from '../../src/svelte/shell/modals/QuickPayModal.svelte';
import TransactionsModals from '../../src/svelte/shell/modals/TransactionsModals.svelte';
import * as dashboardComponents from '../../src/svelte/components';
import { registerComponents } from '../../src/svelte/mount';
import { setState, setAdminSession, setActiveGroupId, getState } from '../../src/svelte/core/state';
import { openQuickPaySheet, submitQuickPay } from '../../src/svelte/handlers/quickpay';
import { executeConfirmAction } from '../../src/svelte/ui/modal';

registerComponents(dashboardComponents);

describe('Quick Pay Rapel (Multi-Bulan)', () => {
  let host: HTMLDivElement | null = null;
  let qpInst: ReturnType<typeof mount> | null = null;
  let trxInst: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    vi.restoreAllMocks();
    if (qpInst) { unmount(qpInst); qpInst = null; }
    if (trxInst) { unmount(trxInst); trxInst = null; }
    host?.remove();
    host = null;
    setAdminSession('');
  });

  function setupFixture(transactions: Array<Record<string, unknown>> = []) {
    host = document.createElement('div');
    document.body.appendChild(host);
    qpInst = mount(QuickPayModal, { target: host });
    trxInst = mount(TransactionsModals, { target: host });
    flushSync();

    setActiveGroupId('GRP-RAPEL');
    setAdminSession('tok-admin-rapel');
    setState({
      anggota: [
        { ID_Anggota: 'ANG-1', Nama_Anggota: 'Budi Santoso', Status_Aktif: 'Aktif', Tanggal_Gabung: '2026-01-01' },
      ],
      kategori: [
        { ID_Kategori: 'KAT-1', Nama_Kategori: 'Iuran Bulanan', Tipe: 'Masuk' },
      ],
      transaksi: [
        {
          ID_Transaksi: 'TRX-JAN',
          Timestamp: '2026-01-05T08:00:00Z',
          Tipe_Arus: 'Masuk',
          ID_Kategori: 'KAT-1',
          ID_Anggota: 'ANG-1',
          Bulan_Iuran: 'Januari',
          Tahun_Iuran: '2026',
          Nominal: 10000,
          Keterangan: 'Iuran Jan',
        },
        ...transactions,
      ] as any,
      groupMeta: { nominalIuran: 10000, kasMulai: '2026-01' },
      bulanLibur: [],
    } as any);
  }

  it('shows rapel strip when >1 payable month exists, locks nominal on multi-month, and supports partial + full mix', () => {
    setupFixture([
      {
        ID_Transaksi: 'TRX-FEB-1',
        Timestamp: '2026-02-05T08:00:00Z',
        Tipe_Arus: 'Masuk',
        ID_Kategori: 'KAT-1',
        ID_Anggota: 'ANG-1',
        Bulan_Iuran: 'Februari',
        Tahun_Iuran: '2026',
        Nominal: 5000,
        Keterangan: 'Cicilan Feb',
      },
    ]);

    openQuickPaySheet('ANG-1', 'Februari', '2026');

    const wrap = document.getElementById('qp-rapel-wrap')!;
    const nominal = document.getElementById('qp-nominal') as HTMLInputElement;
    const presets = document.getElementById('qp-presets')!;
    const lockHint = document.getElementById('qp-rapel-lock-hint')!;

    expect(wrap.hidden).toBe(false);
    expect(nominal.readOnly).toBe(false);
    expect(nominal.value).toBe('5.000');
    expect(presets.hidden).toBe(false);
    expect(lockHint.hidden).toBe(true);
    expect(document.getElementById('qp-status-badge')?.textContent).toBe('SEBAGIAN');

    // Tap Maret & April pills to enter 3-month rapel mode (5.000 + 10.000 + 10.000 = 25.000)
    (document.querySelector('[data-qp-month="Maret"]') as HTMLButtonElement).click();
    (document.querySelector('[data-qp-month="April"]') as HTMLButtonElement).click();

    expect(nominal.readOnly).toBe(true);
    expect(nominal.value).toBe('25.000');
    expect(presets.hidden).toBe(true);
    expect(lockHint.hidden).toBe(false);
    expect(document.getElementById('qp-periode')?.textContent).toBe('Rapel 3 Bulan · Feb, Mar, Apr 2026');
    expect(document.getElementById('qp-status-badge')?.textContent).toBe('3 BULAN');
    expect(document.getElementById('qp-impact-status')?.textContent).toBe('3 Bulan Akan Lunas');
    expect(document.getElementById('qp-impact-label')?.textContent).toBe('Kas masuk (3 trx)');
    expect(document.getElementById('qp-submit-label')?.textContent).toContain('Simpan 3 Bulan');

    // Deselecting back to 1 month restores editable nominal & presets
    (document.querySelector('[data-qp-month="Maret"]') as HTMLButtonElement).click();
    (document.querySelector('[data-qp-month="April"]') as HTMLButtonElement).click();
    expect(nominal.readOnly).toBe(false);
    expect(nominal.value).toBe('5.000');
    expect(presets.hidden).toBe(false);
  });

  it('hides rapel strip when member only has 1 payable month left in the year', () => {
    const paidMonths = [
      'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November',
    ].map((bulan, i) => ({
      ID_Transaksi: `TRX-P-${i}`,
      Timestamp: '2026-06-01T08:00:00Z',
      Tipe_Arus: 'Masuk',
      ID_Kategori: 'KAT-1',
      ID_Anggota: 'ANG-1',
      Bulan_Iuran: bulan,
      Tahun_Iuran: '2026',
      Nominal: 10000,
      Keterangan: 'Lunas',
    }));
    setupFixture(paidMonths);

    openQuickPaySheet('ANG-1', 'Desember', '2026');
    expect(document.getElementById('qp-rapel-wrap')?.hidden).toBe(true);
  });

  it('submits multi-month rapel as one atomic tambahTransaksiMassal batch with exact per-month amounts', async () => {
    setupFixture([
      {
        ID_Transaksi: 'TRX-FEB-1',
        Timestamp: '2026-02-05T08:00:00Z',
        Tipe_Arus: 'Masuk',
        ID_Kategori: 'KAT-1',
        ID_Anggota: 'ANG-1',
        Bulan_Iuran: 'Februari',
        Tahun_Iuran: '2026',
        Nominal: 5000,
        Keterangan: 'Cicilan Feb',
      },
    ]);

    let capturedBody: Record<string, any> | null = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, opts) => {
      capturedBody = JSON.parse(String(opts?.body || '{}'));
      const rows = (capturedBody?.listTrx || []).map((item: any, idx: number) => ({
        ID_Transaksi: `TRX-SRV-${idx + 1}`,
        Timestamp: '2026-11-26T10:00:00Z',
        Tipe_Arus: item.tipeArus,
        ID_Kategori: item.idKategori,
        ID_Anggota: item.idAnggota,
        Bulan_Iuran: item.bulanIuran,
        Tahun_Iuran: item.tahunIuran,
        Nominal: item.nominal,
        Keterangan: item.keterangan,
      }));
      return Response.json({ status: true, data: { inserted: rows.length, transactions: rows } });
    });

    openQuickPaySheet('ANG-1', 'Februari', '2026');
    (document.querySelector('[data-qp-month="Maret"]') as HTMLButtonElement).click();
    (document.querySelector('[data-qp-month="April"]') as HTMLButtonElement).click();

    await submitQuickPay({ preventDefault() {} } as Event);
    expect(document.getElementById('confirm-title')?.textContent).toBe('Catat Rapel 3 Bulan?');

    await executeConfirmAction();
    await new Promise((r) => setTimeout(r, 850));

    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.action).toBe('tambahTransaksiMassal');
    expect(typeof capturedBody!.operationId).toBe('string');
    expect(capturedBody!.listTrx).toHaveLength(3);
    expect(capturedBody!.listTrx.map((r: any) => [r.bulanIuran, r.nominal])).toEqual([
      ['Februari', 5000],
      ['Maret', 10000],
      ['April', 10000],
    ]);

    const ids = new Set(getState().transaksi.map((t) => t.ID_Transaksi));
    expect(ids.has('TRX-SRV-1')).toBe(true);
    expect(ids.has('TRX-SRV-2')).toBe(true);
    expect(ids.has('TRX-SRV-3')).toBe(true);
  });
});
