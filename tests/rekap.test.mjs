import { test } from 'node:test';
import assert from 'node:assert/strict';

test('Iuran payment status logic identifies paid vs unpaid correctly', () => {
  const transactions = [
    { ID_Anggota: 'ANG-01', Bulan_Iuran: 'Januari', Tahun_Iuran: '2026', Tipe_Arus: 'Masuk', Nominal: 10000 },
    { ID_Anggota: 'ANG-01', Bulan_Iuran: 'Februari', Tahun_Iuran: '2026', Tipe_Arus: 'Masuk', Nominal: 10000 },
    { ID_Anggota: 'ANG-02', Bulan_Iuran: 'Januari', Tahun_Iuran: '2026', Tipe_Arus: 'Masuk', Nominal: 10000 }
  ];

  const checkLunas = (idAnggota, bulan, tahun) => {
    return transactions.some(
      (t) => t.ID_Anggota === idAnggota && t.Bulan_Iuran === bulan && String(t.Tahun_Iuran) === String(tahun) && t.Tipe_Arus === 'Masuk'
    );
  };

  assert.equal(checkLunas('ANG-01', 'Januari', '2026'), true);
  assert.equal(checkLunas('ANG-01', 'Februari', '2026'), true);
  assert.equal(checkLunas('ANG-01', 'Maret', '2026'), false);
  assert.equal(checkLunas('ANG-02', 'Februari', '2026'), false);
});

test('Skipped months logic correctly exempts members from contribution requirements', () => {
  const skippedMonths = ['06-2026', '07-2026']; // MM-YYYY

  const isSkipped = (monthIndex, year) => {
    const key = `${String(monthIndex + 1).padStart(2, '0')}-${year}`;
    return skippedMonths.includes(key);
  };

  assert.equal(isSkipped(5, 2026), true, 'Bulan Juni (index 5) harus libur');
  assert.equal(isSkipped(6, 2026), true, 'Bulan Juli (index 6) harus libur');
  assert.equal(isSkipped(0, 2026), false, 'Bulan Januari (index 0) tidak libur');
  assert.equal(isSkipped(5, 2025), false, 'Bulan Juni 2025 tidak libur');
});
