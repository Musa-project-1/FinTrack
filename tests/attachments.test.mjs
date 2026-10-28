import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { encodeFields, decodeFields } from '../api/_sa.js';

process.env.FINKAS_SESSION_SECRET = 'test-session-secret-value-long-enough-1234567890';

// Mock MemoryFirestore for isolated testing
class MemoryFirestore {
  constructor(projectId = 'finkas-kas') {
    this.projectId = projectId;
    this.docs = new Map();
  }

  docPath(url) {
    const prefix = `projects/${this.projectId}/databases/(default)/documents/`;
    let str = String(url).replace(/^\//, '');
    const idx = str.indexOf(prefix);
    if (idx === -1) return null;
    let path = str.slice(idx + prefix.length);
    const qIdx = path.indexOf('?');
    return decodeURIComponent(qIdx !== -1 ? path.slice(0, qIdx) : path);
  }

  handleFetch(url, opts) {
    const urlStr = String(url);
    const method = (opts?.method || 'GET').toUpperCase();

    if (urlStr.includes('oauth2.googleapis.com')) {
      return new Response(JSON.stringify({ access_token: 'mock-sa-token', expires_in: 3600 }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (urlStr.includes(':commit') && method === 'POST') {
      const writes = JSON.parse(opts.body || '{}').writes || [];
      const writeResults = [];
      for (const w of writes) {
        if (w.currentDocument?.exists === false && this.docs.has(this.docPath(w.update.name))) {
          return new Response(JSON.stringify({ error: { code: 409, status: 'ALREADY_EXISTS' } }), {
            status: 409, headers: { 'Content-Type': 'application/json' }
          });
        }
        if (w.currentDocument?.exists === true && !this.docs.has(this.docPath(w.update?.name || w.delete))) {
          return new Response(JSON.stringify({ error: { code: 404, status: 'NOT_FOUND' } }), {
            status: 404, headers: { 'Content-Type': 'application/json' }
          });
        }
        if (w.update) {
          const path = this.docPath(w.update.name);
          const current = this.docs.get(path) || {};
          const decoded = decodeFields(w.update.fields || {});
          let merged = { ...current };
          if (w.updateMask?.fieldPaths) {
            for (const fp of w.updateMask.fieldPaths) {
              if (decoded[fp] === undefined) delete merged[fp];
              else merged[fp] = decoded[fp];
            }
          } else {
            merged = { ...current, ...decoded };
          }
          this.docs.set(path, merged);
          writeResults.push({ updateTime: new Date().toISOString() });
        } else if (w.delete) {
          this.docs.delete(this.docPath(w.delete));
          writeResults.push({});
        }
      }
      return new Response(JSON.stringify({ writeResults }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (method === 'GET') {
      const path = this.docPath(urlStr);
      if (urlStr.includes('pageSize=')) {
        const results = [];
        for (const [docPath, fields] of this.docs.entries()) {
          const lastSlash = docPath.lastIndexOf('/');
          const parentCol = lastSlash !== -1 ? docPath.slice(0, lastSlash) : '';
          if (parentCol === path) {
            results.push({
              name: `projects/${this.projectId}/databases/(default)/documents/${docPath}`,
              fields: encodeFields(fields)
            });
          }
        }
        return new Response(JSON.stringify({ documents: results }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      }
      if (this.docs.has(path)) {
        return new Response(JSON.stringify({
          name: `projects/${this.projectId}/databases/(default)/documents/${path}`,
          fields: encodeFields(this.docs.get(path))
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('{"error": "NOT_FOUND"}', {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (method === 'PATCH') {
      const path = this.docPath(urlStr);
      const decoded = decodeFields(JSON.parse(opts.body || '{}').fields || {});
      const merged = { ...(this.docs.get(path) || {}), ...decoded };
      this.docs.set(path, merged);
      return new Response(JSON.stringify({
        name: `projects/${this.projectId}/databases/(default)/documents/${path}`,
        fields: encodeFields(merged)
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'DELETE') {
      this.docs.delete(this.docPath(urlStr));
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}

const mockDb = new MemoryFirestore();
const realFetch = globalThis.fetch;
globalThis.fetch = (url, opts) => mockDb.handleFetch(url, opts);
after(() => { globalThis.fetch = realFetch; });

const mockRes = () => ({
  statusCode: 200,
  headers: {},
  body: null,
  setHeader(k, v) { this.headers[k] = v; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; }
});

const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const WEBP_HEADER = Buffer.concat([
  Buffer.from('RIFF'), Buffer.from([0x24, 0x00, 0x00, 0x00]), Buffer.from('WEBP'), Buffer.from('VP8 ')
]);
const PDF_HEADER = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n');

const {
  validateAttachmentInput,
  detectFileSignature,
  uploadAttachment,
  deleteAttachment,
  readAttachment,
  exportAttachments,
  MAX_ATTACHMENT_BYTES
} = await import('../api/_attachments.js');

const handler = (await import('../api/data.js')).default;
const { ROLES, signSession, GROUP_SESSION_TTL } = await import('../api/_session.js');

const GID_A = 'GRP-ALPHA';
const GID_B = 'GRP-BETA';
const TRX_ID = 'TRX-TEST-ATTACH-001';

mockDb.docs.set(`groups/${GID_A}`, { nama: 'Group Alpha' });
mockDb.docs.set(`groups/${GID_B}`, { nama: 'Group Beta' });
mockDb.docs.set(`groups/${GID_A}/transaksi/${TRX_ID}`, {
  ID_Transaksi: TRX_ID, Tipe_Arus: 'Masuk', Nominal: 100000, Keterangan: 'Pembayaran Dues'
});

test('MAX_ATTACHMENT_BYTES is strictly 512 KiB (524288 bytes)', () => {
  assert.equal(MAX_ATTACHMENT_BYTES, 512 * 1024);
});

/* ── Validation slice ────────────────────────────────────────────── */

test('detectFileSignature identifies JPEG, PNG, WebP, PDF correctly and rejects others', () => {
  assert.equal(detectFileSignature(JPEG_HEADER), 'image/jpeg');
  assert.equal(detectFileSignature(PNG_HEADER), 'image/png');
  assert.equal(detectFileSignature(WEBP_HEADER), 'image/webp');
  assert.equal(detectFileSignature(PDF_HEADER), 'application/pdf');

  assert.equal(detectFileSignature(Buffer.from('GIF89a')), null);
  assert.equal(detectFileSignature(Buffer.from('MZ\x90\x00\x03\x00\x00\x00')), null);
  assert.equal(detectFileSignature(Buffer.from('Plain text file content')), null);
  assert.equal(detectFileSignature(Buffer.alloc(0)), null);
});

test('validateAttachmentInput accepts valid JPEG base64 and detects type', () => {
  const base64 = JPEG_HEADER.toString('base64');
  const res = validateAttachmentInput({
    idTransaksi: TRX_ID, file: { name: 'struk_kas.jpg', type: 'image/jpeg', base64 }
  });
  assert.equal(res.valid, true);
  assert.equal(res.detectedType, 'image/jpeg');
  assert.equal(res.size, JPEG_HEADER.length);
  assert.equal(res.buffer.equals(JPEG_HEADER), true);
});

test('validateAttachmentInput strips data URL prefix correctly', () => {
  const base64 = `data:image/png;base64,${PNG_HEADER.toString('base64')}`;
  const res = validateAttachmentInput({
    idTransaksi: TRX_ID, file: { name: 'bukti.png', type: 'image/png', base64 }
  });
  assert.equal(res.valid, true);
  assert.equal(res.detectedType, 'image/png');
  assert.equal(res.size, PNG_HEADER.length);
});

test('validateAttachmentInput rejects oversized files (> 512 KiB)', () => {
  const largeBuf = Buffer.concat([JPEG_HEADER, Buffer.alloc(512 * 1024)]);
  const res = validateAttachmentInput({
    idTransaksi: TRX_ID, file: { name: 'large.jpg', type: 'image/jpeg', base64: largeBuf.toString('base64') }
  });
  assert.equal(res.valid, false);
  assert.match(res.error, /512 KiB/i);
});

test('validateAttachmentInput rejects zero-byte / empty files', () => {
  const res = validateAttachmentInput({
    idTransaksi: TRX_ID, file: { name: 'empty.jpg', type: 'image/jpeg', base64: '' }
  });
  assert.equal(res.valid, false);
  assert.match(res.error, /kosong/i);
});

test('validateAttachmentInput rejects non-canonical or corrupted base64', () => {
  const corrupted = JPEG_HEADER.toString('base64').slice(0, -2) + 'a=';
  const res = validateAttachmentInput({
    idTransaksi: TRX_ID, file: { name: 'corrupt.jpg', type: 'image/jpeg', base64: corrupted }
  });
  assert.equal(res.valid, false);
  assert.match(res.error, /base64/i);
});

test('validateAttachmentInput rejects mismatch between declared MIME and file signature', () => {
  const res = validateAttachmentInput({
    idTransaksi: TRX_ID, file: { name: 'document.pdf', type: 'image/png', base64: PDF_HEADER.toString('base64') }
  });
  assert.equal(res.valid, false);
  assert.match(res.error, /tidak sesuai/i);
});

/* ── Backend write / read handler slice ─────────────────────────── */

test('uploadAttachment rejects upload for non-existent transaction', async () => {
  const headers = { Authorization: 'Bearer mock-sa-token' };
  const result = await uploadAttachment(GID_A, {
    idTransaksi: 'TRX-NON-EXISTENT',
    file: { name: 'bukti.jpg', type: 'image/jpeg', base64: JPEG_HEADER.toString('base64') }
  }, headers);
  assert.equal(result.status, false);
  assert.match(result.message, /Transaksi tidak ditemukan/i);
});

test('uploadAttachment stores proof doc and updates Bukti metadata atomically', async () => {
  const headers = { Authorization: 'Bearer mock-sa-token' };
  const base64 = PDF_HEADER.toString('base64');
  const result = await uploadAttachment(GID_A, {
    idTransaksi: TRX_ID,
    file: { name: 'transfer_receipt.pdf', type: 'application/pdf', base64 }
  }, headers);

  assert.equal(result.status, true);
  assert.equal(result.data.bukti.name, 'transfer_receipt.pdf');
  assert.equal(result.data.bukti.type, 'application/pdf');
  assert.equal(result.data.bukti.size, PDF_HEADER.length);

  const proofDoc = mockDb.docs.get(`groups/${GID_A}/transaction_proofs/${TRX_ID}`);
  assert.ok(proofDoc, 'proof document must exist');
  assert.equal(proofDoc.idTransaksi, TRX_ID);
  assert.equal(proofDoc.base64, base64);

  const txDoc = mockDb.docs.get(`groups/${GID_A}/transaksi/${TRX_ID}`);
  assert.ok(txDoc.Bukti, 'transaksi must have Bukti metadata');
  assert.equal(txDoc.Bukti.name, 'transfer_receipt.pdf');
  assert.equal(txDoc.Bukti.base64, undefined);
  assert.equal(txDoc.base64, undefined);
});

test('readAttachment returns proof document with original base64 and exact download bytes', async () => {
  const headers = { Authorization: 'Bearer mock-sa-token' };
  const result = await readAttachment(GID_A, { idTransaksi: TRX_ID }, headers);
  assert.equal(result.status, true);
  assert.equal(result.data.idTransaksi, TRX_ID);
  assert.equal(result.data.base64, PDF_HEADER.toString('base64'));

  const restored = Buffer.from(result.data.base64, 'base64');
  assert.equal(restored.equals(PDF_HEADER), true);
});

test('exportAttachments returns list of all attachments in group with idTransaksi, name, type, size, base64', async () => {
  const headers = { Authorization: 'Bearer mock-sa-token' };
  const result = await exportAttachments(GID_A, headers);
  assert.equal(result.status, true);
  assert.ok(Array.isArray(result.data.attachments));
  assert.equal(result.data.attachments.length, 1);
  const item = result.data.attachments[0];
  assert.equal(item.idTransaksi, TRX_ID);
  assert.equal(item.name, 'transfer_receipt.pdf');
  assert.equal(item.type, 'application/pdf');
  assert.equal(item.size, PDF_HEADER.length);
  assert.equal(item.base64, PDF_HEADER.toString('base64'));
});

test('deleteAttachment removes proof doc and clears Bukti metadata atomically', async () => {
  const headers = { Authorization: 'Bearer mock-sa-token' };
  const result = await deleteAttachment(GID_A, { idTransaksi: TRX_ID }, headers);
  assert.equal(result.status, true);

  assert.equal(mockDb.docs.get(`groups/${GID_A}/transaction_proofs/${TRX_ID}`), undefined);
  const txDoc = mockDb.docs.get(`groups/${GID_A}/transaksi/${TRX_ID}`);
  assert.equal(txDoc.Bukti, null);
});

test('deleteAttachment on already deleted proof returns error', async () => {
  const headers = { Authorization: 'Bearer mock-sa-token' };
  const result = await deleteAttachment(GID_A, { idTransaksi: TRX_ID }, headers);
  assert.equal(result.status, false);
  assert.match(result.message, /Bukti transaksi tidak ditemukan/i);
});

/* ── Gateway authorization & security slice ───────────────────────── */

test('gateway rejects unauthenticated attachment operations with 401', async () => {
  for (const action of ['uploadAttachment', 'deleteAttachment', 'readAttachment', 'exportAttachments']) {
    const res = mockRes();
    await handler({ method: 'POST', body: { action, groupId: GID_A, idTransaksi: TRX_ID } }, res);
    assert.equal(res.statusCode, 401);
  }
});

test('gateway rejects member trying to uploadAttachment with 403', async () => {
  const memberToken = signSession({ role: ROLES.MEMBER, gid: GID_A }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST',
    body: {
      action: 'uploadAttachment', groupId: GID_A, sessionToken: memberToken, idTransaksi: TRX_ID,
      file: { name: 'test.jpg', type: 'image/jpeg', base64: JPEG_HEADER.toString('base64') }
    }
  }, res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /Hanya admin grup/i);
});

test('gateway rejects member trying to deleteAttachment with 403', async () => {
  const memberToken = signSession({ role: ROLES.MEMBER, gid: GID_A }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST', body: { action: 'deleteAttachment', groupId: GID_A, sessionToken: memberToken, idTransaksi: TRX_ID }
  }, res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /Hanya admin grup/i);
});

test('gateway rejects member trying to exportAttachments with 403', async () => {
  const memberToken = signSession({ role: ROLES.MEMBER, gid: GID_A }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST', body: { action: 'exportAttachments', groupId: GID_A, sessionToken: memberToken }
  }, res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /Hanya admin/i);
});

test('gateway allows member of the same group to readAttachment', async () => {
  const adminToken = signSession({ role: ROLES.GROUP_ADMIN, gid: GID_A }, GROUP_SESSION_TTL);
  const uploadRes = mockRes();
  await handler({
    method: 'POST',
    body: {
      action: 'uploadAttachment', groupId: GID_A, sessionToken: adminToken, idTransaksi: TRX_ID,
      file: { name: 'member_readable.png', type: 'image/png', base64: PNG_HEADER.toString('base64') }
    }
  }, uploadRes);
  assert.equal(uploadRes.statusCode, 200);

  const memberToken = signSession({ role: ROLES.MEMBER, gid: GID_A }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST',
    body: { action: 'readAttachment', groupId: GID_A, sessionToken: memberToken, idTransaksi: TRX_ID }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, true);
  assert.equal(res.body.data.name, 'member_readable.png');
});

test('gateway rejects cross-group access: member of Group B cannot readAttachment in Group A (403)', async () => {
  const memberBToken = signSession({ role: ROLES.MEMBER, gid: GID_B }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST',
    body: { action: 'readAttachment', groupId: GID_A, sessionToken: memberBToken, idTransaksi: TRX_ID }
  }, res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /Tidak memiliki akses/i);
});

test('gateway rejects cross-group write: admin of Group B cannot uploadAttachment in Group A (403)', async () => {
  const adminBToken = signSession({ role: ROLES.GROUP_ADMIN, gid: GID_B }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST',
    body: {
      action: 'uploadAttachment', groupId: GID_A, sessionToken: adminBToken, idTransaksi: TRX_ID,
      file: { name: 'cross.jpg', type: 'image/jpeg', base64: JPEG_HEADER.toString('base64') }
    }
  }, res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /Hanya admin grup/i);
});

test('gateway enforces session revocation for attachment operations', async () => {
  const revokedTime = Math.floor(Date.now() / 1000) + 10;
  mockDb.docs.set(`groups/${GID_A}`, { nama: 'Group Alpha', revokedAfter: revokedTime });
  const oldAdminToken = signSession({ role: ROLES.GROUP_ADMIN, gid: GID_A }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST',
    body: { action: 'deleteAttachment', groupId: GID_A, sessionToken: oldAdminToken, idTransaksi: TRX_ID }
  }, res);
  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /tidak berlaku setelah perubahan kredensial/i);
  mockDb.docs.set(`groups/${GID_A}`, { nama: 'Group Alpha' });
});

test('gateway allows admin of group to exportAttachments (200)', async () => {
  const adminToken = signSession({ role: ROLES.GROUP_ADMIN, gid: GID_A }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST', body: { action: 'exportAttachments', groupId: GID_A, sessionToken: adminToken }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(Array.isArray(res.body.data.attachments));
  assert.equal(res.body.data.attachments[0].idTransaksi, TRX_ID);
});

test('gateway uploadAttachment stamps touchGroupUpdated and returns updatedAt', async () => {
  const adminToken = signSession({ role: ROLES.GROUP_ADMIN, gid: GID_A }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST',
    body: {
      action: 'uploadAttachment', groupId: GID_A, sessionToken: adminToken, idTransaksi: TRX_ID,
      file: { name: 'webp_proof.webp', type: 'image/webp', base64: WEBP_HEADER.toString('base64') }
    }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.updatedAt, 'response must include updatedAt');
});

/* ── Client helper slice (js/handlers/attachments.js) ───────────── */

const {
  validateClientAttachment,
  formatFileSize,
  base64ToBlob,
  uploadAttachmentApi,
  deleteAttachmentApi,
  initAttachmentControls
} = await import('../js/handlers/attachments.js');

test('client formatFileSize formats bytes accurately', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(500), '500 B');
  assert.equal(formatFileSize(2048), '2.0 KB');
  assert.equal(formatFileSize(512 * 1024), '512 KB');
});

test('client validateClientAttachment validates size and type before network', () => {
  assert.equal(validateClientAttachment(null).valid, false);
  assert.equal(validateClientAttachment({ size: 0, type: 'image/jpeg' }).valid, false);

  const oversized = validateClientAttachment({ size: 512 * 1024 + 1, type: 'image/jpeg' });
  assert.equal(oversized.valid, false);
  assert.match(oversized.error, /512 KiB/i);

  const badType = validateClientAttachment({ size: 1000, type: 'text/plain', name: 'notes.txt' });
  assert.equal(badType.valid, false);
  assert.match(badType.error, /tidak didukung/i);

  assert.equal(validateClientAttachment({ size: 50000, type: 'image/jpeg', name: 'photo.jpg' }).valid, true);
  assert.equal(validateClientAttachment({ size: 50000, type: 'image/png', name: 'photo.png' }).valid, true);
  assert.equal(validateClientAttachment({ size: 50000, type: 'image/webp', name: 'photo.webp' }).valid, true);
  assert.equal(validateClientAttachment({ size: 50000, type: 'application/pdf', name: 'receipt.pdf' }).valid, true);
  assert.equal(validateClientAttachment({ size: 50000, type: '', name: 'photo.jpg' }).valid, true);
});

test('client base64ToBlob converts base64 string to a valid Blob', () => {
  const b64 = Buffer.from('hello attachment').toString('base64');
  const blob = base64ToBlob(b64, 'text/plain');
  assert.ok(blob);
  assert.equal(blob.size, 'hello attachment'.length);
  assert.equal(blob.type, 'text/plain');
});

test('client uploadAttachmentApi and deleteAttachmentApi enforce online-only guard', async () => {
  const originalNav = globalThis.window?.navigator;
  if (!globalThis.window) globalThis.window = {};
  globalThis.window.navigator = { onLine: false };

  try {
    const uploadRes = await uploadAttachmentApi({
      idTransaksi: TRX_ID, file: { name: 'test.jpg', size: 100, type: 'image/jpeg' }
    });
    assert.equal(uploadRes.status, false);
    assert.match(uploadRes.message, /online/i);

    const deleteRes = await deleteAttachmentApi({ idTransaksi: TRX_ID });
    assert.equal(deleteRes.status, false);
    assert.match(deleteRes.message, /online/i);
  } finally {
    if (originalNav) globalThis.window.navigator = originalNav;
    else delete globalThis.window.navigator;
  }
});

test('initAttachmentControls safely runs without throwing when DOM elements are missing', () => {
  assert.doesNotThrow(() => {
    initAttachmentControls();
    initAttachmentControls({ container: null });
    initAttachmentControls({ container: '#non-existent-selector' });
  });
});
