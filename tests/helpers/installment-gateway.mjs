// Synthetic, network-blocked adapter for the approved API gateway seam.
// Commits stage every write, enforce preconditions, and only publish on success.
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';

process.env.FIREBASE_PROJECT_ID = 'synthetic-installments';
process.env.FINKAS_SESSION_SECRET = 'synthetic-installments-session-secret-not-production';
process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
  client_email: 'synthetic@example.invalid',
  private_key: generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' })
});
const { WRITE_HANDLERS } = await import('../../api/_group-write.js');
const { ATTACHMENT_WRITE_HANDLERS, readAttachment } = await import('../../api/_attachments.js');
const { readGroupData } = await import('../../api/_group-read.js');
const { ROLES, signSession, GROUP_SESSION_TTL } = await import('../../api/_session.js');
const { FIRESTORE_BASE, resourceName } = await import('../../api/_sa.js');
const json = (data, status = 200) => new Response(JSON.stringify(data), { status });
let nextGroup = 0;

export const payment = (overrides = {}) => ({
  tipeArus: 'Masuk', idKategori: 'KAT-DUES', idAnggota: 'ANG-1',
  bulanIuran: 'Januari', tahunIuran: '2026', nominal: 5000,
  keterangan: 'Synthetic installment', timestamp: '2026-01-10T05:00:00.000Z', ...overrides
});
export const pdf = (name = 'synthetic.pdf') => ({ name, type: 'application/pdf', base64: Buffer.from('%PDF-synthetic proof').toString('base64') });

export function gateway(t) {
  const docs = new Map();
  const commits = [];
  let version = 0;
  let request = 0;
  const gid = `GRP-SYNTHETIC-${++nextGroup}`;
  const token = signSession({ role: ROLES.GROUP_ADMIN, gid }, GROUP_SESSION_TTL);
  const db = { commits, beforeCommit: null, failCommit: false, loseResponse: false };
  const pathOf = (name) => {
    assert.ok(name.startsWith(`${resourceName('')}`), `Foreign resource blocked: ${name}`);
    return name.slice(resourceName('').length);
  };
  const apply = (write, staged) => {
    const path = pathOf(write.update?.name || write.delete);
    const previous = staged.get(path);
    const pre = write.currentDocument;
    if ((pre?.exists === false && previous) || (pre?.exists === true && !previous) ||
        (pre?.updateTime && pre.updateTime !== previous?.updateTime)) {
      return json({ error: { status: 'FAILED_PRECONDITION', message: 'Synthetic precondition failure' } }, 409);
    }
    if (write.delete) staged.delete(path);
    else {
      const fields = write.updateMask ? { ...(previous?.fields || {}) } : {};
      const keys = write.updateMask?.fieldPaths || Object.keys(write.update.fields);
      for (const key of keys) {
        if (Object.hasOwn(write.update.fields, key)) fields[key] = write.update.fields[key];
        else delete fields[key];
      }
      staged.set(path, { name: resourceName(path), fields, updateTime: `2026-01-01T00:00:00.${String(++version).padStart(9, '0')}Z` });
    }
    return null;
  };
  t.mock.method(globalThis, 'fetch', async (url, opts = {}) => {
    const target = String(url);
    const method = opts.method || 'GET';
    if (target === 'https://oauth2.googleapis.com/token') return json({ access_token: 'synthetic-only', expires_in: 3600 });
    assert.ok(target.startsWith(FIRESTORE_BASE), `Unexpected network blocked: ${target}`);
    if (target === `${FIRESTORE_BASE}:commit` && method === 'POST') {
      const { writes } = JSON.parse(opts.body);
      assert.ok(writes.length <= 500, 'Firestore commit write limit');
      commits.push(structuredClone(writes));
      const hook = db.beforeCommit;
      db.beforeCommit = null;
      if (hook) await hook(writes);
      if (db.failCommit) { db.failCommit = false; return json({ error: { status: 'UNAVAILABLE' } }, 503); }
      const staged = new Map(docs);
      for (const write of writes) {
        const error = apply(write, staged);
        if (error) return error;
      }
      docs.clear();
      staged.forEach((value, key) => docs.set(key, value));
      if (db.loseResponse) { db.loseResponse = false; throw new Error('Synthetic response lost after commit'); }
      return json({ writeResults: writes.map(() => ({})) });
    }
    const parsed = new URL(target);
    const path = decodeURIComponent(parsed.pathname.split('/documents/')[1] || '');
    if (method === 'GET') {
      if (parsed.searchParams.has('pageSize')) {
        return json({ documents: [...docs.entries()].filter(([key]) => key.slice(0, key.lastIndexOf('/')) === path).map(([, doc]) => doc) });
      }
      return docs.has(path) ? json(docs.get(path)) : json({ error: { status: 'NOT_FOUND' } }, 404);
    }
    if (method === 'PATCH') {
      const fields = JSON.parse(opts.body).fields;
      const mask = parsed.searchParams.getAll('updateMask.fieldPaths');
      apply({ update: { name: resourceName(path), fields }, ...(mask.length ? { updateMask: { fieldPaths: mask } } : {}) }, docs);
      return json(docs.get(path));
    }
    if (method === 'DELETE') { docs.delete(path); return json({}); }
    throw new Error(`Unexpected network blocked: ${method} ${target}`);
  });
  db.call = async (payload) => {
    const action = payload.action;
    if (action === 'read') {
      const data = await readGroupData(gid, { Authorization: 'Bearer synthetic' });
      return { code: 200, body: { status: true, data } };
    }
    if (action === 'readAttachment') {
      const result = await readAttachment(gid, payload, { Authorization: 'Bearer synthetic' });
      return { code: result.status ? 200 : (result.notFound ? 404 : 400), body: result };
    }
    const handlerFn = WRITE_HANDLERS[action] || ATTACHMENT_WRITE_HANDLERS[action];
    if (!handlerFn) throw new Error(`Unknown handler: ${action}`);
    try {
      const result = await handlerFn(gid, payload, { Authorization: 'Bearer synthetic' });
      return { code: result.status ? 200 : 400, body: result };
    } catch (err) {
      return { code: 500, body: { status: false, message: err.message } };
    }
  };
  db.rows = async () => {
    const result = await db.call({ action: 'read' });
    assert.equal(result.code, 200);
    return result.body.data.transaksi;
  };
  db.add = (operationId, dataForm = payment()) => db.call({ action: 'tambahTransaksi', ...(operationId ? { operationId } : {}), dataForm });
  db.remove = (id, operationId) => db.call({ action: 'hapusTransaksi', idTransaksi: id, ...(operationId ? { operationId } : {}) });
  return db;
}
