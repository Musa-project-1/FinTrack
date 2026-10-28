/**
 * Full-database snapshot validation, atomic export and restore for a group.
 *
 * `validateSnapshot` is pure and exported so both backup and restore paths can
 * be tested without network calls. `restoreSnapshot` writes new records BEFORE
 * pruning stale ones so a mid-restore failure never empties a collection.
 *
 * Export uses a Firestore read-only transaction when available to ensure an
 * atomic, point-in-time consistent snapshot across all collections.
 */
import {
  FIRESTORE_BASE,
  decodeFields,
  docName,
  encodeFields,
  fsCommit,
  fsListAll,
  fsPatch
} from './_sa.js';
import {
  CATEGORIES_COLLECTION,
  MEMBERS_COLLECTION,
  TRANSACTIONS_COLLECTION,
  col,
  groupDoc,
  isValidDocId,
  memberName,
  nowIso,
  settingsDoc,
  writeAuditLog
} from './_store.js';
import {
  ARUS,
  SKIPPED_MONTH_RE,
  STATUSES,
  cleanDigits,
  cleanText,
  fail,
  ok,
  parseTransactionInput
} from './_write-shared.js';
import {
  PROOFS_COLLECTION,
  validateAttachmentInput
} from './_attachments.js';
import {
  OPERATIONS_COLLECTION,
  isValidOperationId
} from './_transaction-idempotency.js';

/* ── Read-only Transaction Helpers ───────────────────────────────── */

async function beginReadOnlyTx(headers) {
  try {
    const res = await fetch(`${FIRESTORE_BASE}:beginTransaction`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: { readOnly: {} } })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.transaction || null;
  } catch {
    return null;
  }
}

async function rollbackTx(headers, transaction) {
  if (!transaction) return;
  try {
    await fetch(`${FIRESTORE_BASE}:rollback`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction })
    });
  } catch (err) {
    console.warn('[finkas] Rollback transaction failed:', err?.message);
  }
}

async function listAllInTx(colPath, headers, transaction) {
  const docs = [];
  let pageToken = '';
  for (let page = 0; page < 40; page += 1) {
    const txParam = transaction ? `&transaction=${encodeURIComponent(transaction)}` : '';
    const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const query = `?pageSize=300${txParam}${pageParam}`;
    const res = await fetch(`${FIRESTORE_BASE}/${colPath}${query}`, { headers });
    if (!res.ok) {
      throw new Error(`Gagal membaca koleksi (${res.status}): ${colPath}`);
    }
    const json = await res.json();
    (json.documents || []).forEach((doc) => {
      docs.push({ name: doc.name, fields: decodeFields(doc.fields) });
    });
    pageToken = json.nextPageToken || '';
    if (!pageToken) break;
  }
  return docs;
}

async function getDocInTx(docPath, headers, transaction) {
  const txParam = transaction ? `?transaction=${encodeURIComponent(transaction)}` : '';
  const res = await fetch(`${FIRESTORE_BASE}/${docPath}${txParam}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Gagal membaca dokumen (${res.status}): ${docPath}`);
  }
  const json = await res.json();
  return decodeFields(json.fields);
}

/* ── Validation ─────────────────────────────────────────────────── */

/**
 * Validate full snapshot data shape, limits and record integrity before writing.
 *
 * @param {object} raw
 * @returns {{valid: boolean, error?: string, data?: object}}
 */
export function validateSnapshot(raw) {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Format snapshot tidak valid.' };
  }

  const data = (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data))
    ? raw.data
    : raw;

  if (!Array.isArray(data.anggota) || !Array.isArray(data.transaksi)) {
    return { valid: false, error: 'Format snapshot tidak valid.' };
  }
  if (data.kategori !== undefined && !Array.isArray(data.kategori)) {
    return { valid: false, error: 'Format snapshot tidak valid (kategori bukan array).' };
  }
  if (data.skippedMonths !== undefined && !Array.isArray(data.skippedMonths)) {
    return { valid: false, error: 'Format snapshot tidak valid (bulan dilewati bukan array).' };
  }
  if (data.attachments !== undefined && !Array.isArray(data.attachments)) {
    return { valid: false, error: 'Format snapshot tidak valid (lampiran bukan array).' };
  }
  if (data.operations !== undefined && !Array.isArray(data.operations)) {
    return { valid: false, error: 'Format snapshot tidak valid (operasi bukan array).' };
  }

  const anggota = data.anggota;
  const kategori = Array.isArray(data.kategori) ? data.kategori : [];
  const transaksi = data.transaksi;
  const rawSkipped = data.skippedMonths;
  const rawAttachments = Array.isArray(data.attachments) ? data.attachments : [];
  const rawOperations = Array.isArray(data.operations) ? data.operations : [];

  if (anggota.length > 1000) {
    return { valid: false, error: 'Snapshot melebihi batas maksimum anggota (1.000).' };
  }
  if (kategori.length > 200) {
    return { valid: false, error: 'Snapshot melebihi batas maksimum kategori (200).' };
  }
  if (transaksi.length > 10000) {
    return { valid: false, error: 'Snapshot melebihi batas maksimum transaksi (10.000).' };
  }
  if (Array.isArray(rawSkipped) && rawSkipped.length > 120) {
    return { valid: false, error: 'Snapshot melebihi batas maksimum bulan dilewati (120).' };
  }
  if (rawAttachments.length > 10000) {
    return { valid: false, error: 'Snapshot melebihi batas maksimum lampiran (10.000).' };
  }
  if (rawOperations.length > 20000) {
    return { valid: false, error: 'Snapshot melebihi batas maksimum histori operasi (20.000).' };
  }

  const rawKasStart = cleanText(data.kasStart ?? raw.kasStart, 7);
  if (rawKasStart && !SKIPPED_MONTH_RE.test(rawKasStart)) {
    return { valid: false, error: 'Format awal kas di snapshot tidak valid (harus MM-YYYY).' };
  }

  const skippedMonths = Array.isArray(rawSkipped)
    ? rawSkipped.filter((m) => SKIPPED_MONTH_RE.test(m))
    : [];

  const seenMember = new Set();
  for (const a of anggota) {
    const id = cleanText(a?.ID_Anggota ?? a?.idAnggota, 40);
    const nama = cleanText(a?.Nama_Anggota ?? a?.namaAnggota, 80);
    if (!id || !isValidDocId(id) || !nama) {
      return { valid: false, error: 'Data anggota di snapshot tidak valid (ID atau Nama kosong).' };
    }
    if (seenMember.has(id)) {
      return { valid: false, error: `Snapshot mengandung duplikat ID_Anggota: ${id}` };
    }
    seenMember.add(id);
  }

  const seenKat = new Set();
  for (const k of kategori) {
    const id = cleanText(k?.ID_Kategori ?? k?.idKategori, 40);
    const tipe = k?.Tipe ?? k?.tipe;
    if (!id || !isValidDocId(id) || !ARUS.includes(tipe)) {
      return { valid: false, error: 'Data kategori di snapshot tidak valid.' };
    }
    if (seenKat.has(id)) {
      return { valid: false, error: `Snapshot mengandung duplikat ID_Kategori: ${id}` };
    }
    seenKat.add(id);
  }

  const seenTrx = new Set();
  for (const t of transaksi) {
    const parsed = parseTransactionInput(t);
    if (parsed.error) return { valid: false, error: `Transaksi di snapshot tidak valid: ${parsed.error}` };
    const id = cleanText(t?.ID_Transaksi ?? t?.idTransaksi, 40);
    if (!id || !isValidDocId(id)) {
      return { valid: false, error: `Snapshot mengandung ID_Transaksi tidak valid: ${id}` };
    }
    if (seenTrx.has(id)) {
      return { valid: false, error: `Snapshot mengandung duplikat ID_Transaksi: ${id}` };
    }
    seenTrx.add(id);
  }

  const seenProof = new Set();
  const validAttachments = [];
  for (const att of rawAttachments) {
    if (!att || typeof att !== 'object') {
      return { valid: false, error: 'Data lampiran di snapshot tidak valid.' };
    }
    const idTrx = cleanText(att.idTransaksi, 40);
    if (!idTrx || !isValidDocId(idTrx)) {
      return { valid: false, error: `ID transaksi lampiran tidak valid: ${idTrx}` };
    }
    if (!seenTrx.has(idTrx)) {
      return { valid: false, error: `Lampiran bukti mengacu pada transaksi yang tidak ada dalam snapshot: ${idTrx}` };
    }
    if (seenProof.has(idTrx)) {
      return { valid: false, error: `Snapshot mengandung duplikat bukti untuk transaksi: ${idTrx}` };
    }
    seenProof.add(idTrx);

    const check = validateAttachmentInput({ idTransaksi: idTrx, file: att });
    if (!check.valid) {
      return { valid: false, error: `Lampiran untuk transaksi ${idTrx} tidak valid: ${check.error}` };
    }

    validAttachments.push({
      idTransaksi: idTrx,
      name: check.name,
      type: check.detectedType,
      size: check.size,
      base64: check.base64,
      uploadedAt: cleanText(att.uploadedAt, 30) || nowIso()
    });
  }

  const seenOp = new Set();
  const validOperations = [];
  for (const op of rawOperations) {
    if (!op || typeof op !== 'object') {
      return { valid: false, error: 'Data operasi di snapshot tidak valid.' };
    }
    const opId = cleanText(op.operationId, 128);
    if (!isValidOperationId(opId)) {
      return { valid: false, error: `ID operasi tidak valid: ${opId}` };
    }
    if (seenOp.has(opId)) {
      return { valid: false, error: `Snapshot mengandung duplikat operationId: ${opId}` };
    }
    seenOp.add(opId);

    const fingerprint = cleanText(op.fingerprint, 64);
    if (!fingerprint || !/^[a-f0-9]{64}$/i.test(fingerprint)) {
      return { valid: false, error: `Fingerprint operasi tidak valid: ${opId}` };
    }

    validOperations.push({
      operationId: opId,
      fingerprint,
      action: cleanText(op.action, 50),
      status: cleanText(op.status, 20) || 'COMMITTED',
      createdAt: cleanText(op.createdAt, 30) || nowIso(),
      responseStatus: op.responseStatus !== false,
      responseMessage: cleanText(op.responseMessage, 200),
      responseData: (op.responseData && typeof op.responseData === 'object') ? op.responseData : null
    });
  }

  // Normalize Bukti metadata on transactions strictly from included attachments.
  const proofMap = new Map(validAttachments.map((a) => [a.idTransaksi, a]));
  const normalizedTransaksi = transaksi.map((t) => {
    const idTrx = cleanText(t.ID_Transaksi ?? t.idTransaksi, 40);
    const att = proofMap.get(idTrx);
    const copy = { ...t };
    if (att) {
      copy.Bukti = {
        name: att.name,
        type: att.type,
        size: att.size,
        uploadedAt: att.uploadedAt
      };
    } else {
      delete copy.Bukti;
    }
    return copy;
  });

  return {
    valid: true,
    data: {
      anggota,
      kategori,
      transaksi: normalizedTransaksi,
      skippedMonths,
      kasStart: rawKasStart,
      attachments: validAttachments,
      operations: validOperations
    }
  };
}

/* ── Export Snapshot ─────────────────────────────────────────────── */

/**
 * Export an atomic point-in-time snapshot of a group's full ledger and proofs.
 *
 * @param {string} gid
 * @param {object} headers
 * @returns {Promise<{status: boolean, message: string, data?: object}>}
 */
export async function exportSnapshot(gid, payloadOrHeaders, maybeHeaders) {
  const headers = maybeHeaders !== undefined ? maybeHeaders : payloadOrHeaders;
  const transaction = await beginReadOnlyTx(headers);
  const consistency = transaction ? 'firestore-read-only-transaction' : 'best-effort-read';

  try {
    const [
      memberDocs,
      categoryDocs,
      transactionDocs,
      proofDocs,
      operationDocs,
      settings,
      groupDocInfo
    ] = await Promise.all([
      listAllInTx(col(gid, MEMBERS_COLLECTION), headers, transaction),
      listAllInTx(col(gid, CATEGORIES_COLLECTION), headers, transaction),
      listAllInTx(col(gid, TRANSACTIONS_COLLECTION), headers, transaction),
      listAllInTx(col(gid, PROOFS_COLLECTION), headers, transaction),
      listAllInTx(col(gid, OPERATIONS_COLLECTION), headers, transaction),
      getDocInTx(settingsDoc(gid), headers, transaction),
      getDocInTx(groupDoc(gid), headers, transaction)
    ]);

    const anggota = memberDocs.map((d) => d.fields).sort((a, b) => (a.ID_Anggota || '').localeCompare(b.ID_Anggota || ''));
    const kategori = categoryDocs.map((d) => d.fields).sort((a, b) => (a.ID_Kategori || '').localeCompare(b.ID_Kategori || ''));
    const attachments = proofDocs.map((d) => {
      const f = d.fields || {};
      return {
        idTransaksi: f.idTransaksi || d.name.split('/').pop(),
        name: f.name || 'bukti',
        type: f.type || 'application/octet-stream',
        size: Number(f.size) || 0,
        base64: f.base64 || '',
        uploadedAt: f.uploadedAt || ''
      };
    }).sort((a, b) => (a.idTransaksi || '').localeCompare(b.idTransaksi || ''));

    const operations = operationDocs.map((d) => {
      const f = d.fields || {};
      return {
        operationId: f.operationId || d.name.split('/').pop(),
        fingerprint: f.fingerprint || '',
        action: f.action || '',
        status: f.status || 'COMMITTED',
        createdAt: f.createdAt || '',
        responseStatus: f.responseStatus !== false,
        responseMessage: f.responseMessage || '',
        responseData: f.responseData || null
      };
    }).sort((a, b) => (a.operationId || '').localeCompare(b.operationId || ''));

    const proofMap = new Map(attachments.map((a) => [a.idTransaksi, a]));
    const transaksi = transactionDocs.map((d) => {
      const f = { ...d.fields };
      const idTrx = f.ID_Transaksi || d.name.split('/').pop();
      const att = proofMap.get(idTrx);
      if (att) {
        f.Bukti = {
          name: att.name,
          type: att.type,
          size: att.size,
          uploadedAt: att.uploadedAt
        };
      } else {
        delete f.Bukti;
      }
      return f;
    }).sort((a, b) => new Date(b.Timestamp || 0).getTime() - new Date(a.Timestamp || 0).getTime());

    const skippedMonths = Array.isArray(settings?.skippedMonths) ? settings.skippedMonths : [];
    const kasStart = settings?.kasStart || '';
    const gname = groupDocInfo?.nama || gid;

    const snapshot = {
      app: 'Finkas',
      version: 2,
      exportedAt: nowIso(),
      consistency,
      group: { id: gid, nama: gname },
      stats: {
        totalAnggota: anggota.length,
        totalKategori: kategori.length,
        totalTransaksi: transaksi.length,
        totalAttachments: attachments.length,
        totalOperations: operations.length,
        skippedMonthsCount: skippedMonths.length
      },
      data: {
        anggota,
        kategori,
        transaksi,
        skippedMonths,
        kasStart,
        attachments,
        operations
      }
    };

    return ok('Snapshot database berhasil diekspor.', { snapshot });
  } finally {
    if (transaction) {
      await rollbackTx(headers, transaction);
    }
  }
}

/* ── Restore Snapshot ────────────────────────────────────────────── */

/**
 * Restore a full database snapshot into a group.
 *
 * @param {string} gid Target group id
 * @param {object} payload { data, sourceGroupId?, confirmCrossGroup? }
 * @param {object} headers
 */
export async function restoreSnapshot(gid, payload, headers) {
  const sourceGid = cleanText(payload?.sourceGroupId || payload?.data?.group?.id || payload?.data?.groupId, 40);
  if (sourceGid && sourceGid !== gid && !payload?.confirmCrossGroup && !payload?.allowCrossGroup) {
    return fail(`Snapshot berasal dari grup "${sourceGid}", bukan grup tujuan "${gid}". Konfirmasi pemulihan lintas grup diperlukan.`);
  }

  const validated = validateSnapshot(payload?.data || payload);
  if (!validated.valid) {
    return fail(validated.error);
  }

  const { anggota, kategori, transaksi, skippedMonths, kasStart, attachments, operations } = validated.data;
  const timestamp = nowIso();
  const idOf = (doc) => String(doc.name || '').split('/').pop();

  const upsertThenPrune = async (collName, keptIds, buildWrites) => {
    const writes = buildWrites();
    for (let i = 0; i < writes.length; i += 400) {
      await fsCommit(writes.slice(i, i + 400), headers);
    }
    const existing = await fsListAll(col(gid, collName), headers);
    const stale = existing.filter((doc) => !keptIds.has(idOf(doc)));
    for (let i = 0; i < stale.length; i += 400) {
      await fsCommit(stale.slice(i, i + 400).map((doc) => ({ delete: doc.name })), headers);
    }
  };

  // 1. Anggota
  const anggotaIds = new Set();
  await upsertThenPrune(MEMBERS_COLLECTION, anggotaIds, () =>
    anggota.map((a) => {
      const id = cleanText(a.ID_Anggota ?? a.idAnggota, 40);
      anggotaIds.add(id);
      return {
        update: {
          name: memberName(gid, MEMBERS_COLLECTION, id),
          fields: encodeFields({
            ID_Anggota: id,
            Nama_Anggota: cleanText(a.Nama_Anggota ?? a.namaAnggota, 80),
            Nomor_WA: cleanDigits(a.Nomor_WA ?? a.nomorWa, 20),
            Status_Aktif: STATUSES.includes(a.Status_Aktif ?? a.statusAktif) ? (a.Status_Aktif ?? a.statusAktif) : 'Aktif',
            Tanggal_Gabung: cleanText(a.Tanggal_Gabung ?? a.tanggalGabung, 30),
            groupId: gid
          })
        }
      };
    })
  );

  // 2. Kategori
  const kategoriIds = new Set();
  await upsertThenPrune(CATEGORIES_COLLECTION, kategoriIds, () =>
    kategori.map((k) => {
      const id = cleanText(k.ID_Kategori ?? k.idKategori, 40);
      kategoriIds.add(id);
      return {
        update: {
          name: memberName(gid, CATEGORIES_COLLECTION, id),
          fields: encodeFields({
            ID_Kategori: id,
            Nama_Kategori: cleanText(k.Nama_Kategori ?? k.namaKategori, 60),
            Tipe: k.Tipe ?? k.tipe,
            groupId: gid
          })
        }
      };
    })
  );

  // 3. Bukti Lampiran (upserted before transactions so proofs always exist when referenced)
  const attachmentIds = new Set();
  await upsertThenPrune(PROOFS_COLLECTION, attachmentIds, () =>
    attachments.map((att) => {
      attachmentIds.add(att.idTransaksi);
      return {
        update: {
          name: memberName(gid, PROOFS_COLLECTION, att.idTransaksi),
          fields: encodeFields({
            idTransaksi: att.idTransaksi,
            name: att.name,
            type: att.type,
            size: att.size,
            base64: att.base64,
            uploadedAt: att.uploadedAt
          })
        }
      };
    })
  );

  // 4. Operation Receipts (create/delete retry idempotency preserved)
  const operationIds = new Set();
  await upsertThenPrune(OPERATIONS_COLLECTION, operationIds, () =>
    operations.map((op) => {
      operationIds.add(op.operationId);
      return {
        update: {
          name: memberName(gid, OPERATIONS_COLLECTION, op.operationId),
          fields: encodeFields({
            operationId: op.operationId,
            fingerprint: op.fingerprint,
            action: op.action,
            status: op.status,
            createdAt: op.createdAt,
            responseStatus: op.responseStatus,
            responseMessage: op.responseMessage,
            responseData: op.responseData
          })
        }
      };
    })
  );

  // 5. Transaksi
  const transaksiIds = new Set();
  await upsertThenPrune(TRANSACTIONS_COLLECTION, transaksiIds, () =>
    transaksi.map((t) => {
      const idTrx = cleanText(t.ID_Transaksi ?? t.idTransaksi, 40);
      transaksiIds.add(idTrx);
      const fields = {
        ID_Transaksi: idTrx,
        Timestamp: cleanText(t.Timestamp ?? t.timestamp, 30) || timestamp,
        Tipe_Arus: t.Tipe_Arus ?? t.tipeArus,
        ID_Kategori: cleanText(t.ID_Kategori ?? t.idKategori, 40),
        ID_Anggota: cleanText(t.ID_Anggota ?? t.idAnggota, 40) || '-',
        Bulan_Iuran: cleanText(t.Bulan_Iuran ?? t.bulanIuran, 20) || '-',
        Tahun_Iuran: cleanText(t.Tahun_Iuran ?? t.tahunIuran, 4) || '-',
        Nominal: Math.round(Number(t.Nominal ?? t.nominal) || 0),
        Keterangan: cleanText(t.Keterangan ?? t.keterangan, 200),
        groupId: gid
      };
      if (t.operationId) fields.operationId = cleanText(t.operationId, 128);
      if (t.Bukti) fields.Bukti = t.Bukti;

      return {
        update: {
          name: memberName(gid, TRANSACTIONS_COLLECTION, idTrx),
          fields: encodeFields(fields)
        }
      };
    })
  );

  // 6. Settings (skippedMonths + kasStart)
  await fsPatch(
    settingsDoc(gid),
    { skippedMonths, kasStart: kasStart || '' },
    headers,
    ['skippedMonths', 'kasStart']
  );

  await writeAuditLog(
    gid,
    'RESTORE_DATABASE',
    `Snapshot dipulihkan: ${anggota.length} anggota, ${transaksi.length} transaksi, ${attachments.length} bukti, ${operations.length} operasi`,
    headers
  );

  return ok('Database berhasil dipulihkan dari snapshot.', {
    anggota: anggota.length,
    kategori: kategori.length,
    transaksi: transaksi.length,
    attachments: attachments.length,
    operations: operations.length
  });
}
