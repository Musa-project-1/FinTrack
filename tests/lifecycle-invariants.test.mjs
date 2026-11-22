import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  setKasStart,
  changeSkippedMonth,
  addMember,
  updateMemberStatus,
  addCategory,
  addBulkTransactions,
  addTransaction,
  editTransaction,
  deleteDocument,
  WRITE_HANDLERS,
  validateSnapshot,
  restoreSnapshot
} from '../api/_group-write.js';
import { createDuesLedger } from '../src/core/dues.js';
import {
  calculateMemberContribution,
  calculateMemberRekapProgress,
  calculateCompliance
} from '../src/core/utils.js';
import { decodeFields, encodeFields } from '../api/_sa.js';

process.env.FINKAS_SESSION_SECRET = 'test-session-secret-value-long-enough-1234567890';

class MemoryFirestore {
  constructor(projectId = 'finkas-kas') {
    this.projectId = projectId;
    this.docs = new Map(); // path -> fields object
  }

  docPath(url) {
    const prefix = `projects/${this.projectId}/databases/(default)/documents/`;
    let str = String(url);
    if (str.startsWith('/')) str = str.slice(1);
    const idx = str.indexOf(prefix);
    if (idx === -1) return null;
    let path = str.slice(idx + prefix.length);
    const queryIdx = path.indexOf('?');
    if (queryIdx !== -1) path = path.slice(0, queryIdx);
    return decodeURIComponent(path);
  }

  handleFetch(url, opts) {
    const urlStr = String(url);
    const method = (opts?.method || 'GET').toUpperCase();

    // 1. OAuth token mock
    if (urlStr.includes('oauth2.googleapis.com')) {
      return new Response(JSON.stringify({ access_token: 'mock-sa-token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Commit batch writes
    if (urlStr.includes(':commit') && method === 'POST') {
      const body = JSON.parse(opts.body || '{}');
      const writes = body.writes || [];
      const writeResults = [];
      for (const w of writes) {
        if (w.currentDocument?.exists === false) {
          const path = this.docPath(w.update.name);
          if (this.docs.has(path)) {
            return new Response(JSON.stringify({
              error: {
                code: 409,
                status: 'ALREADY_EXISTS',
                message: 'Document already exists'
              }
            }), { status: 409, headers: { 'Content-Type': 'application/json' } });
          }
        }
        if (w.update) {
          const path = this.docPath(w.update.name);
          const current = this.docs.get(path) || {};
          const updated = { ...current, ...(w.update.fields || {}) };
          this.docs.set(path, updated);
          writeResults.push({ updateTime: new Date().toISOString() });
        } else if (w.delete) {
          const path = this.docPath(w.delete);
          this.docs.delete(path);
          writeResults.push({});
        }
      }
      return new Response(JSON.stringify({ writeResults }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Document or Collection GET
    if (method === 'GET') {
      const path = this.docPath(urlStr);
      // fsListAll (collection listing)
      if (urlStr.includes('pageSize=')) {
        const results = [];
        for (const [docPath, fields] of this.docs.entries()) {
          const lastSlash = docPath.lastIndexOf('/');
          const parentCol = lastSlash !== -1 ? docPath.slice(0, lastSlash) : '';
          if (parentCol === path) {
            results.push({
              name: `projects/${this.projectId}/databases/(default)/documents/${docPath}`,
              fields
            });
          }
        }
        return new Response(JSON.stringify({ documents: results }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Single doc GET
      if (this.docs.has(path)) {
        return new Response(JSON.stringify({
          name: `projects/${this.projectId}/databases/(default)/documents/${path}`,
          fields: this.docs.get(path)
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else {
        return new Response('{"error": "NOT_FOUND"}', {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 4. Document PATCH
    if (method === 'PATCH') {
      const path = this.docPath(urlStr);
      const body = JSON.parse(opts.body || '{}');
      const current = this.docs.get(path) || {};
      const newFields = body.fields || {};
      const merged = { ...current, ...newFields };
      this.docs.set(path, merged);
      return new Response(JSON.stringify({
        name: `projects/${this.projectId}/databases/(default)/documents/${path}`,
        fields: merged
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 5. Document DELETE
    if (method === 'DELETE') {
      const path = this.docPath(urlStr);
      this.docs.delete(path);
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  getAllAsJsObjects(colPrefix) {
    const out = [];
    for (const [docPath, fields] of this.docs.entries()) {
      const lastSlash = docPath.lastIndexOf('/');
      const parent = lastSlash !== -1 ? docPath.slice(0, lastSlash) : '';
      if (parent === colPrefix) {
        out.push(decodeFields(fields));
      }
    }
    return out;
  }
}

test('E2E lifecycle: from zero setup through mutations, disaster backup, and restore with 0 invariant drift', async () => {
  const memDb = new MemoryFirestore();
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => memDb.handleFetch(url, opts);

  const GID = 'GRP-LIFECYCLE';
  const HEADERS = { Authorization: 'Bearer mock-token' };

  try {
    /* ── Phase 1: Setup Master Data & Settings ────────────── */
    const resKasStart = await setKasStart(GID, { kasStart: '01-2026' }, HEADERS);
    assert.equal(resKasStart.status, true);

    const resSkip = await changeSkippedMonth(GID, { month: '04-2026' }, HEADERS, true);
    assert.equal(resSkip.status, true);
    assert.deepEqual(resSkip.data.skippedMonths, ['04-2026']);

    const resKatIuran = await addCategory(GID, { nama: 'Iuran Wajib', tipe: 'Masuk' }, HEADERS);
    const resKatOps = await addCategory(GID, { nama: 'Konsumsi Acara', tipe: 'Keluar' }, HEADERS);
    const resKatDonasi = await addCategory(GID, { nama: 'Sumbangan Donatur', tipe: 'Masuk' }, HEADERS);
    assert.equal(resKatIuran.status, true);
    assert.equal(resKatOps.status, true);
    assert.equal(resKatDonasi.status, true);

    const katIuranId = resKatIuran.data.ID_Kategori;
    const katOpsId = resKatOps.data.ID_Kategori;
    const katDonasiId = resKatDonasi.data.ID_Kategori;

    const resAng1 = await addMember(GID, { nama: 'Ali Pratama' }, HEADERS);
    const resAng2 = await addMember(GID, { nama: 'Budi Santoso' }, HEADERS);
    const resAng3 = await addMember(GID, { nama: 'Citra Dewi' }, HEADERS);
    const resAng4 = await addMember(GID, { nama: 'Dedi Kurniawan' }, HEADERS);
    const resAng5 = await addMember(GID, { nama: 'Eka Wijaya' }, HEADERS);

    const ang1Id = resAng1.data.ID_Anggota;
    const ang2Id = resAng2.data.ID_Anggota;
    const ang3Id = resAng3.data.ID_Anggota;
    const ang4Id = resAng4.data.ID_Anggota;
    const ang5Id = resAng5.data.ID_Anggota;

    // Set staggered join dates directly in doc
    const pathAng2 = `groups/${GID}/anggota/${ang2Id}`;
    const pathAng3 = `groups/${GID}/anggota/${ang3Id}`;
    memDb.docs.get(pathAng2).Tanggal_Bergabung = { stringValue: '2026-03-01' };
    memDb.docs.get(pathAng3).Tanggal_Bergabung = { stringValue: '2026-05-01' };

    // Update Dedi to Nonaktif
    const resDeact = await updateMemberStatus(GID, { idAnggota: ang4Id, statusAktif: 'Nonaktif' }, HEADERS);
    assert.equal(resDeact.status, true);

    /* ── Phase 2: Operations & Complex Transactions ──────── */
    // Bulk dues payment for Jan 2026 (Ali, Dedi, Eka)
    const bulkPayload = {
      listTrx: [
        {
          tipeArus: 'Masuk',
          idAnggota: ang1Id,
          idKategori: katIuranId,
          nominal: 20000,
          bulanIuran: 'Januari',
          tahunIuran: '2026',
          keterangan: 'Iuran Jan Ali'
        },
        {
          tipeArus: 'Masuk',
          idAnggota: ang4Id,
          idKategori: katIuranId,
          nominal: 20000,
          bulanIuran: 'Januari',
          tahunIuran: '2026',
          keterangan: 'Iuran Jan Dedi'
        },
        {
          tipeArus: 'Masuk',
          idAnggota: ang5Id,
          idKategori: katIuranId,
          nominal: 20000,
          bulanIuran: 'Januari',
          tahunIuran: '2026',
          keterangan: 'Iuran Jan Eka'
        }
      ]
    };
    const resBulk = await addBulkTransactions(GID, bulkPayload, HEADERS);
    assert.equal(resBulk.status, true);
    assert.equal(resBulk.data.inserted, 3);

    // Ali pays Feb, Mar, Mei, Jun, Jul, Agt, Sep (7 months x 20,000 = 140,000)
    const aliMonths = ['Februari', 'Maret', 'Mei', 'Juni', 'Juli', 'Agustus', 'September'];
    for (const bln of aliMonths) {
      const res = await addTransaction(GID, {
        dataForm: {
          tipeArus: 'Masuk',
          idKategori: katIuranId,
          idAnggota: ang1Id,
          nominal: 20000,
          bulanIuran: bln,
          tahunIuran: '2026',
          keterangan: `Iuran ${bln} Ali`
        }
      }, HEADERS);
      assert.equal(res.status, true);
    }

    // Budi pays Mar, Mei, Jun (3 months x 20,000 = 60,000)
    for (const bln of ['Maret', 'Mei', 'Juni']) {
      const res = await addTransaction(GID, {
        dataForm: {
          tipeArus: 'Masuk',
          idKategori: katIuranId,
          idAnggota: ang2Id,
          nominal: 20000,
          bulanIuran: bln,
          tahunIuran: '2026',
          keterangan: `Iuran ${bln} Budi`
        }
      }, HEADERS);
      assert.equal(res.status, true);
    }

    // Citra pays Mei, Jun, Jul (3 months x 20,000 = 60,000)
    let citraJulTrxId = null;
    for (const bln of ['Mei', 'Juni', 'Juli']) {
      const res = await addTransaction(GID, {
        dataForm: {
          tipeArus: 'Masuk',
          idKategori: katIuranId,
          idAnggota: ang3Id,
          nominal: 20000,
          bulanIuran: bln,
          tahunIuran: '2026',
          keterangan: `Iuran ${bln} Citra`
        }
      }, HEADERS);
      assert.equal(res.status, true);
      if (bln === 'Juli') citraJulTrxId = res.data.ID_Transaksi;
    }

    // Operational Income: Donasi Rp 500,000
    const resDonasi = await addTransaction(GID, {
      dataForm: {
        tipeArus: 'Masuk',
        idKategori: katDonasiId,
        nominal: 500000,
        keterangan: 'Donasi Pembina'
      }
    }, HEADERS);
    assert.equal(resDonasi.status, true);

    // Operational Expenses: Konsumsi Rp 150,000 & Rp 75,000
    const resOps1 = await addTransaction(GID, {
      dataForm: {
        tipeArus: 'Keluar',
        idKategori: katOpsId,
        nominal: 150000,
        keterangan: 'Snack Rapat Bulanan'
      }
    }, HEADERS);
    const resOps2 = await addTransaction(GID, {
      dataForm: {
        tipeArus: 'Keluar',
        idKategori: katOpsId,
        nominal: 75000,
        keterangan: 'Aqua Galon & Kopi'
      }
    }, HEADERS);
    assert.equal(resOps1.status, true);
    assert.equal(resOps2.status, true);

    // Verify duplicate dues prevention (Ali Jan 2026)
    const dupRes = await addTransaction(GID, {
      dataForm: {
        tipeArus: 'Masuk',
        idKategori: katIuranId,
        idAnggota: ang1Id,
        nominal: 20000,
        bulanIuran: 'Januari',
        tahunIuran: '2026',
        keterangan: 'Iuran Jan Ali Duplikat'
      }
    }, HEADERS);
    assert.equal(dupRes.data?.duplicate, true);
    assert.match(dupRes.message, /sudah tercatat/i);

    // Edit transaction: Move Citra's July payment to August (2026)
    assert.ok(citraJulTrxId, 'citraJulTrxId should exist');
    const resEdit = await editTransaction(GID, {
      idTransaksi: citraJulTrxId,
      dataForm: {
        idTransaksi: citraJulTrxId,
        tipeArus: 'Masuk',
        idKategori: katIuranId,
        idAnggota: ang3Id,
        nominal: 20000,
        bulanIuran: 'Agustus',
        tahunIuran: '2026',
        keterangan: 'Koreksi: Iuran Agt Citra'
      }
    }, HEADERS);
    assert.equal(resEdit.status, true);

    /* ── Phase 3: Pre-Disaster Baseline Invariants ───────── */
    const preMembers = memDb.getAllAsJsObjects(`groups/${GID}/anggota`);
    const preCategories = memDb.getAllAsJsObjects(`groups/${GID}/kategori`);
    const preTransactions = memDb.getAllAsJsObjects(`groups/${GID}/transaksi`);
    const preSettings = decodeFields(memDb.docs.get(`groups/${GID}/settings/app_config`));

    // Calculate baseline balances
    const preTotalMasuk = preTransactions
      .filter((t) => t.Tipe_Arus === 'Masuk')
      .reduce((sum, t) => sum + Number(t.Nominal || 0), 0);
    const preTotalKeluar = preTransactions
      .filter((t) => t.Tipe_Arus === 'Keluar')
      .reduce((sum, t) => sum + Number(t.Nominal || 0), 0);
    const preSaldo = preTotalMasuk - preTotalKeluar;

    // Expected balances:
    // Masuk: Bulk 3x20k (60k) + Ali 7x20k (140k) + Budi 3x20k (60k) + Citra 3x20k (60k) + Donasi (500k) = 820,000
    // Keluar: 150k + 75k = 225,000
    // Saldo: 820,000 - 225,000 = 595,000
    assert.equal(preTotalMasuk, 820000, 'Pre-disaster total masuk should match');
    assert.equal(preTotalKeluar, 225000, 'Pre-disaster total keluar should match');
    assert.equal(preSaldo, 595000, 'Pre-disaster saldo should match 595,000');

    // Calculate baseline per-member contributions
    const preContributions = {};
    for (const ang of preMembers) {
      preContributions[ang.ID_Anggota] = calculateMemberContribution(preTransactions, ang.ID_Anggota);
    }
    assert.equal(preContributions[ang1Id], 160000, 'Ali should have paid 8 months x 20k = 160k');
    assert.equal(preContributions[ang2Id], 60000, 'Budi should have paid 3 months x 20k = 60k');
    assert.equal(preContributions[ang3Id], 60000, 'Citra should have paid 3 months x 20k = 60k');
    assert.equal(preContributions[ang4Id], 20000, 'Dedi should have paid 1 month x 20k = 20k');
    assert.equal(preContributions[ang5Id], 20000, 'Eka should have paid 1 month x 20k = 20k');

    /* ── Phase 4: Full Export & Disaster Simulation ──────── */
    const realisticSnapshot = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      group: { id: GID, nama: 'Grup Lifecycle E2E' },
      anggota: preMembers,
      kategori: preCategories,
      transaksi: preTransactions,
      skippedMonths: preSettings.skippedMonths || [],
      kasStart: preSettings.kasStart || '',
      settings: preSettings
    };

    const validated = validateSnapshot(realisticSnapshot);
    assert.equal(validated.valid, true, 'Exported snapshot must pass validation');

    // SIMULATE DISASTER: Wipe entire database
    memDb.docs.clear();
    assert.equal(memDb.docs.size, 0, 'Database should be completely wiped');

    // RESTORE FROM DISASTER SNAPSHOT
    const resRestore = await restoreSnapshot(GID, { data: realisticSnapshot }, HEADERS);
    assert.equal(resRestore.status, true, 'Restore must succeed');

    /* ── Phase 5: Post-Disaster Zero-Drift Invariants ─────── */
    const postMembers = memDb.getAllAsJsObjects(`groups/${GID}/anggota`);
    const postCategories = memDb.getAllAsJsObjects(`groups/${GID}/kategori`);
    const postTransactions = memDb.getAllAsJsObjects(`groups/${GID}/transaksi`);
    const postSettings = decodeFields(memDb.docs.get(`groups/${GID}/settings/app_config`));

    // 1. Master Data Count Invariant
    assert.equal(postMembers.length, preMembers.length, 'Member count must match exactly');
    assert.equal(postCategories.length, preCategories.length, 'Category count must match exactly');
    assert.equal(postTransactions.length, preTransactions.length, 'Transaction count must match exactly');

    // 2. Financial Balance Invariant (0 Rupiah drift)
    const postTotalMasuk = postTransactions
      .filter((t) => t.Tipe_Arus === 'Masuk')
      .reduce((sum, t) => sum + Number(t.Nominal || 0), 0);
    const postTotalKeluar = postTransactions
      .filter((t) => t.Tipe_Arus === 'Keluar')
      .reduce((sum, t) => sum + Number(t.Nominal || 0), 0);
    const postSaldo = postTotalMasuk - postTotalKeluar;

    assert.equal(postTotalMasuk, preTotalMasuk, 'Post-restore total masuk has ZERO drift');
    assert.equal(postTotalKeluar, preTotalKeluar, 'Post-restore total keluar has ZERO drift');
    assert.equal(postSaldo, preSaldo, 'Post-restore saldo has ZERO drift (Rp 0 difference)');

    // 3. Member Contribution Invariant
    for (const ang of postMembers) {
      const postContrib = calculateMemberContribution(postTransactions, ang.ID_Anggota);
      assert.equal(
        postContrib,
        preContributions[ang.ID_Anggota],
        `Member ${ang.Nama_Anggota} contribution has ZERO drift`
      );
    }

    // 4. Settings & Holiday Invariant
    assert.deepEqual(postSettings.skippedMonths, preSettings.skippedMonths, 'Skipped months match 100%');
    assert.equal(postSettings.kasStart, preSettings.kasStart, 'Kas start setting matches 100%');

    // 5. Referential Integrity Invariant (No orphan transactions)
    const memberIdSet = new Set(postMembers.map((m) => m.ID_Anggota));
    const categoryIdSet = new Set(postCategories.map((c) => c.ID_Kategori));

    for (const t of postTransactions) {
      if (t.ID_Anggota && t.ID_Anggota !== '-') {
        assert.ok(
          memberIdSet.has(t.ID_Anggota),
          `Transaction ${t.ID_Transaksi} must point to a valid member ${t.ID_Anggota}`
        );
      }
      if (t.ID_Kategori && t.ID_Kategori !== '-') {
        assert.ok(
          categoryIdSet.has(t.ID_Kategori),
          `Transaction ${t.ID_Transaksi} must point to a valid category ${t.ID_Kategori}`
        );
      }
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('E2E lifecycle: partial dues installment, transaction deletion, and compliance parity across disaster restore', async () => {
  const memDb = new MemoryFirestore();
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => memDb.handleFetch(url, opts);

  const GID = 'GRP-LIFECYCLE-PARTIAL';
  const HEADERS = { Authorization: 'Bearer mock-token' };
  const NOW = new Date('2026-06-15T12:00:00Z');
  const FEE = 20000;

  try {
    await setKasStart(GID, { kasStart: '01-2026' }, HEADERS);
    await changeSkippedMonth(GID, { month: '04-2026' }, HEADERS, true);

    const katIuran = await addCategory(GID, { nama: 'Iuran Wajib', tipe: 'Masuk' }, HEADERS);
    const katOps = await addCategory(GID, { nama: 'Operasional', tipe: 'Keluar' }, HEADERS);
    const angSiti = await addMember(GID, { nama: '🌟 Siti Aminah' }, HEADERS);
    const angBudi = await addMember(GID, { nama: 'Budi' }, HEADERS);

    const katIuranId = katIuran.data.ID_Kategori;
    const katOpsId = katOps.data.ID_Kategori;
    const sitiId = angSiti.data.ID_Anggota;
    const budiId = angBudi.data.ID_Anggota;

    // 1. Partial payment on Jan (10k of 20k) remains partial ('Sebagian')
    const p1 = await addTransaction(GID, {
      operationId: 'cicilan-siti-jan-1',
      dataForm: {
        tipeArus: 'Masuk', idKategori: katIuranId, idAnggota: sitiId,
        nominal: 10000, bulanIuran: 'Januari', tahunIuran: '2026', keterangan: 'Cicilan 1 Jan'
      }
    }, HEADERS);
    assert.equal(p1.status, true);

    // 2. Two partial installments on Feb (10k + 10k) sum to Lunas (20k)
    const p2a = await addTransaction(GID, {
      operationId: 'cicilan-siti-feb-1',
      dataForm: {
        tipeArus: 'Masuk', idKategori: katIuranId, idAnggota: sitiId,
        nominal: 10000, bulanIuran: 'Februari', tahunIuran: '2026', keterangan: 'Cicilan 1 Feb'
      }
    }, HEADERS);
    const p2b = await addTransaction(GID, {
      operationId: 'cicilan-siti-feb-2',
      dataForm: {
        tipeArus: 'Masuk', idKategori: katIuranId, idAnggota: sitiId,
        nominal: 10000, bulanIuran: 'Februari', tahunIuran: '2026', keterangan: 'Pelunasan Feb'
      }
    }, HEADERS);
    assert.equal(p2a.status, true);
    assert.equal(p2b.status, true);

    // 3. Budi pays Maret in full (20k)
    const pBudi = await addTransaction(GID, {
      operationId: 'iuran-budi-mar-1',
      dataForm: {
        tipeArus: 'Masuk', idKategori: katIuranId, idAnggota: budiId,
        nominal: 20000, bulanIuran: 'Maret', tahunIuran: '2026', keterangan: 'Iuran Mar Budi'
      }
    }, HEADERS);
    assert.equal(pBudi.status, true);

    // 4. Add two expenses, then permanently delete the wrong one
    const expKeep = await addTransaction(GID, {
      operationId: 'ops-keep-1',
      dataForm: { tipeArus: 'Keluar', idKategori: katOpsId, nominal: 15000, keterangan: 'ATK' }
    }, HEADERS);
    const expDel = await addTransaction(GID, {
      operationId: 'ops-del-1',
      dataForm: { tipeArus: 'Keluar', idKategori: katOpsId, nominal: 35000, keterangan: 'Salah Input' }
    }, HEADERS);
    assert.equal(expKeep.status, true);
    assert.equal(expDel.status, true);

    const delRes = await WRITE_HANDLERS.hapusTransaksi(GID, { idTransaksi: expDel.data.ID_Transaksi }, HEADERS);
    assert.equal(delRes.status, true);
    const verifyDel = await deleteDocument(GID, { targetCollection: 'transaksi', id: expDel.data.ID_Transaksi }, HEADERS);
    assert.equal(verifyDel.status, false);

    // Pre-disaster ledger & balance baseline
    const preState = {
      anggota: memDb.getAllAsJsObjects(`groups/${GID}/anggota`),
      kategori: memDb.getAllAsJsObjects(`groups/${GID}/kategori`),
      transaksi: memDb.getAllAsJsObjects(`groups/${GID}/transaksi`),
      ...decodeFields(memDb.docs.get(`groups/${GID}/settings/app_config`))
    };
    const preLedger = createDuesLedger(preState, { now: NOW, year: 2026, monthlyFee: FEE });
    const preCompliance = calculateCompliance(preLedger.members);
    const preTotalMasuk = preState.transaksi.filter((t) => t.Tipe_Arus === 'Masuk').reduce((s, t) => s + Number(t.Nominal || 0), 0);
    const preTotalKeluar = preState.transaksi.filter((t) => t.Tipe_Arus === 'Keluar').reduce((s, t) => s + Number(t.Nominal || 0), 0);

    assert.equal(preTotalMasuk, 50000);
    assert.equal(preTotalKeluar, 15000);
    assert.equal(preLedger.getMonth({ ID_Anggota: sitiId }, 0, 2026).status, 'partial');
    assert.equal(preLedger.getMonth({ ID_Anggota: sitiId }, 1, 2026).status, 'paid');
    assert.equal(preLedger.getMonth({ ID_Anggota: sitiId }, 3, 2026).status, 'exempt');
    assert.equal(preState.transaksi.some((t) => t.ID_Transaksi === expDel.data.ID_Transaksi), false);

    // Disaster wipe & restore
    const snapshot = {
      version: '1.0',
      exportedAt: NOW.toISOString(),
      group: { id: GID, nama: 'Grup Partial & Delete' },
      anggota: preState.anggota,
      kategori: preState.kategori,
      transaksi: preState.transaksi,
      skippedMonths: preState.skippedMonths || [],
      kasStart: preState.kasStart || '',
      settings: { kasStart: preState.kasStart, skippedMonths: preState.skippedMonths || [] }
    };
    assert.equal(validateSnapshot(snapshot).valid, true);
    memDb.docs.clear();
    const resRestore = await restoreSnapshot(GID, { data: snapshot }, HEADERS);
    assert.equal(resRestore.status, true);

    // Post-restore zero-drift assertions
    const postState = {
      anggota: memDb.getAllAsJsObjects(`groups/${GID}/anggota`),
      kategori: memDb.getAllAsJsObjects(`groups/${GID}/kategori`),
      transaksi: memDb.getAllAsJsObjects(`groups/${GID}/transaksi`),
      ...decodeFields(memDb.docs.get(`groups/${GID}/settings/app_config`))
    };
    const postLedger = createDuesLedger(postState, { now: NOW, year: 2026, monthlyFee: FEE });
    const postCompliance = calculateCompliance(postLedger.members);
    const postTotalMasuk = postState.transaksi.filter((t) => t.Tipe_Arus === 'Masuk').reduce((s, t) => s + Number(t.Nominal || 0), 0);
    const postTotalKeluar = postState.transaksi.filter((t) => t.Tipe_Arus === 'Keluar').reduce((s, t) => s + Number(t.Nominal || 0), 0);

    assert.equal(postTotalMasuk, preTotalMasuk);
    assert.equal(postTotalKeluar, preTotalKeluar);
    assert.equal(postTotalMasuk - postTotalKeluar, 35000);
    assert.equal(postCompliance.totalExpected, preCompliance.totalExpected);
    assert.equal(postCompliance.totalCollected, preCompliance.totalCollected);
    assert.equal(postCompliance.healthPct, preCompliance.healthPct);
    assert.equal(postLedger.unpaidCount, preLedger.unpaidCount);
    assert.equal(postLedger.arrears, preLedger.arrears);
    assert.equal(postLedger.getMonth({ ID_Anggota: sitiId }, 0, 2026).status, 'partial');
    assert.equal(postLedger.getMonth({ ID_Anggota: sitiId }, 1, 2026).status, 'paid');
    assert.equal(calculateMemberContribution(postState.transaksi, sitiId), 30000);
    assert.equal(calculateMemberContribution(postState.transaksi, budiId), 20000);
    assert.equal(postState.transaksi.some((t) => t.ID_Transaksi === expDel.data.ID_Transaksi), false);
    assert.equal(calculateMemberRekapProgress(budiId, {}, postState.skippedMonths, '2026', ['Januari']).totalOwedMonths, 1);
  } finally {
    globalThis.fetch = realFetch;
  }
});
