import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreSnapshot } from '../api/_group-write.ts';

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

test('restoreSnapshot aborts without mutating any collection when pre-read fsListAll fails (SEC-07)', async () => {
  const originalFetch = globalThis.fetch;
  const commits = [];
  try {
    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);
      if ((!options?.method || options.method === 'GET') && urlStr.includes('/operations')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            documents: Array.from({ length: 300 }, (_, i) => ({
              name: `projects/p/databases/(default)/documents/groups/${GID}/operations/OP-${i}`,
              fields: {}
            })),
            nextPageToken: 'overflow-token'
          })
        };
      }
      if (!options?.method || options.method === 'GET') {
        return { ok: true, status: 200, json: async () => ({ documents: [] }) };
      }
      if (options?.method === 'POST' && urlStr.includes(':commit')) {
        commits.push(JSON.parse(options.body));
        return { ok: true, status: 200, json: async () => ({ writeResults: [{}] }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };

    const payload = {
      data: {
        anggota: [{ ID_Anggota: 'ANG-1', Nama_Anggota: 'Budi' }],
        kategori: [],
        transaksi: []
      }
    };

    await assert.rejects(() => restoreSnapshot(GID, payload, { Authorization: 'Bearer test' }), /40 halaman/);
    assert.equal(commits.length, 0, 'no commit batch may run when pre-read fails');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('restoreSnapshot splits large attachment commits below 4 MiB byte budget (SEC-07)', async () => {
  const originalFetch = globalThis.fetch;
  const commitBatches = [];
  try {
    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);
      if (!options?.method || options.method === 'GET') {
        return { ok: true, status: 200, json: async () => ({ documents: [] }) };
      }
      if (options?.method === 'POST' && urlStr.includes(':commit')) {
        commitBatches.push(options.body);
        return { ok: true, status: 200, json: async () => ({ writeResults: [{}] }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };

    // 8 attachments of ~500 KiB (~667 KB base64 each -> ~5.3 MB total) must split into >1 batch, each <= 4 MiB
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const bigPng = Buffer.concat([pngHeader, Buffer.alloc(500 * 1024, 1)]).toString('base64');
    const transaksi = Array.from({ length: 8 }, (_, i) => ({
      ID_Transaksi: `TRX-BIG-${i}`,
      Nominal: 10000,
      Tipe_Arus: 'Masuk',
      ID_Kategori: 'KAT-1'
    }));
    const attachments = transaksi.map((t) => ({
      idTransaksi: t.ID_Transaksi,
      name: `${t.ID_Transaksi}.png`,
      type: 'image/png',
      base64: bigPng
    }));

    const result = await restoreSnapshot(GID, {
      data: {
        anggota: [],
        kategori: [{ ID_Kategori: 'KAT-1', Nama_Kategori: 'Iuran', Tipe: 'Masuk' }],
        transaksi,
        attachments
      }
    }, { Authorization: 'Bearer test' });
    assert.equal(result.status, true);

    const proofCommits = commitBatches.filter((b) => b.includes('transaction_proofs'));
    assert.ok(proofCommits.length >= 2, 'large proof commits must split across multiple batches');
    for (const batchBody of proofCommits) {
      assert.ok(Buffer.byteLength(batchBody, 'utf8') <= 4 * 1024 * 1024 + 1024, 'each batch must stay <= 4 MiB');
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
