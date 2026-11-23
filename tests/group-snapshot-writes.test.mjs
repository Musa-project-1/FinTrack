import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreSnapshot } from '../api/_group-write.js';

const GID = 'GRP-AAAA';

test('restoreSnapshot accepts valid snapshot end-to-end with mocked Firestore REST', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      // Mock fsListAll returning empty documents
      if (!options?.method || options.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ documents: [] })
        };
      }
      // Mock fsCommit or fsPatch
      return {
        ok: true,
        status: 200,
        json: async () => ({ writeResults: [{}] })
      };
    };
    const realisticPayload = {
      data: {
        anggota: [
          {
            ID_Anggota: 'ANG-1',
            Nama_Anggota: 'Budi Santoso',
            Nomor_WA: '08123456789',
            Status_Aktif: 'Aktif'
          }
        ],
        kategori: [
          {
            ID_Kategori: 'KAT-1',
            Nama_Kategori: 'Iuran Kas',
            Tipe: 'Masuk'
          }
        ],
        transaksi: [
          {
            ID_Transaksi: 'TRX-101',
            Timestamp: '2026-03-20T10:00:00.000Z',
            Tipe_Arus: 'Masuk',
            ID_Kategori: 'KAT-1',
            ID_Anggota: 'ANG-1',
            Bulan_Iuran: 'Maret',
            Tahun_Iuran: '2026',
            Nominal: 10000,
            Keterangan: 'Iuran Maret'
          }
        ],
        skippedMonths: ['01-2026']
      }
    };

    const result = await restoreSnapshot(GID, realisticPayload, { Authorization: 'Bearer test' });
    assert.equal(result.status, true);
    assert.equal(result.data.transaksi, 1);
    assert.equal(result.data.anggota, 1);
    assert.equal(result.data.kategori, 1);
    assert.match(result.message, /Database berhasil dipulihkan/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('restoreSnapshot writes before deleting and only prunes stale documents (no destructive wipe)', async () => {
  const originalFetch = globalThis.fetch;
  const events = []; // ordered log of {kind, detail}
  try {
    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);
      // fsListAll: the members collection already holds ANG-1 (kept) and ANG-OLD (stale).
      if ((!options?.method || options.method === 'GET') && urlStr.includes('/anggota')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            documents: [
              { name: `projects/p/databases/(default)/documents/groups/${GID}/anggota/ANG-1`, fields: { ID_Anggota: { stringValue: 'ANG-1' } } },
              { name: `projects/p/databases/(default)/documents/groups/${GID}/anggota/ANG-OLD`, fields: { ID_Anggota: { stringValue: 'ANG-OLD' } } }
            ]
          })
        };
      }
      if (!options?.method || options.method === 'GET') {
        return { ok: true, status: 200, json: async () => ({ documents: [] }) };
      }
      if (options.method === 'POST' && urlStr.includes(':commit')) {
        const body = JSON.parse(options.body);
        const isDelete = body.writes?.[0]?.delete !== undefined;
        events.push({ kind: isDelete ? 'delete' : 'write', names: body.writes.map((w) => w.delete || w.update?.name) });
        return { ok: true, status: 200, json: async () => ({ writeResults: [{}] }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };

    const payload = {
      data: {
        anggota: [{ ID_Anggota: 'ANG-1', Nama_Anggota: 'Budi' }],
        kategori: [],
        transaksi: [],
        skippedMonths: []
      }
    };

    const result = await restoreSnapshot(GID, payload, { Authorization: 'Bearer test' });
    assert.equal(result.status, true);

    // The upsert for a collection must be committed before its prune delete.
    const firstWriteIdx = events.findIndex((e) => e.kind === 'write');
    const firstDeleteIdx = events.findIndex((e) => e.kind === 'delete');
    assert.ok(firstWriteIdx !== -1, 'at least one write must happen');
    assert.ok(firstWriteIdx < firstDeleteIdx || firstDeleteIdx === -1, 'writes must precede deletes');

    // Only the stale ANG-OLD is deleted; the kept ANG-1 is never deleted.
    const deletedNames = events.filter((e) => e.kind === 'delete').flatMap((e) => e.names);
    assert.ok(deletedNames.some((n) => n.includes('ANG-OLD')), 'stale doc ANG-OLD must be pruned');
    assert.ok(!deletedNames.some((n) => n.includes('/anggota/ANG-1')), 'kept doc ANG-1 must never be deleted');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
