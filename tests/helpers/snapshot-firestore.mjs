/** Synthetic Firestore REST adapter: no request may escape to a network. */
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';

process.env.FIREBASE_PROJECT_ID = 'finkas-snapshot-test';
process.env.FINKAS_SESSION_SECRET = 'synthetic-snapshot-session-secret-at-least-32-characters';
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
  client_email: 'synthetic@example.invalid', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' })
});
const { encodeFields, decodeFields, resourceName } = await import('../../api/_sa.js');
const handler = (await import('../../api/data.js')).default;
const { signSession, ROLES, GROUP_SESSION_TTL } = await import('../../api/_session.js');
const response = (data, status = 200) => new Response(JSON.stringify(data), { status });

export class SnapshotFirestore {
  constructor() {
    this.docs = new Map();
    this.snapshots = new Map();
    this.events = [];
    this.pageSize = 2;
    this.sequence = 0;
    this.beforeCommit = null;
    this.afterRead = null;
    this.failList = null;
  }
  path(name) {
    const marker = '/documents/';
    assert.ok(String(name).includes(marker), `Unexpected resource: ${name}`);
    return decodeURIComponent(String(name).split(marker)[1].split('?')[0]);
  }
  wire(path, fields) { return { name: resourceName(path), fields: encodeFields(fields) }; }
  apply(target, write) {
    const path = this.path(write.update?.name || write.delete);
    if (write.delete) { target.delete(path); return; }
    const fields = decodeFields(write.update.fields);
    if (!write.updateMask) { target.set(path, fields); return; }
    const updated = structuredClone(target.get(path) || {});
    for (const key of write.updateMask.fieldPaths) {
      if (Object.hasOwn(fields, key)) updated[key] = fields[key];
      else delete updated[key];
    }
    target.set(path, updated);
  }
  async fetch(input, options = {}) {
    const url = new URL(input);
    const method = options.method || 'GET';
    this.events.push({ url: String(url), method, body: options.body });
    if (url.href === 'https://oauth2.googleapis.com/token') {
      return response({ access_token: 'synthetic-token', expires_in: 3600 });
    }
    assert.equal(url.origin, 'https://firestore.googleapis.com', 'Real network is forbidden');
    assert.ok(url.pathname.includes('/projects/finkas-snapshot-test/'), 'Production project is forbidden');
    const body = options.body ? JSON.parse(options.body) : {};
    if (url.pathname.endsWith(':beginTransaction')) {
      assert.deepEqual(body, { options: { readOnly: {} } });
      const transaction = Buffer.from(`snapshot-${++this.sequence}`).toString('base64');
      this.snapshots.set(transaction, structuredClone(this.docs));
      return response({ transaction });
    }
    if (url.pathname.endsWith(':rollback')) {
      assert.ok(this.snapshots.delete(body.transaction));
      return response({});
    }
    if (url.pathname.endsWith(':commit')) {
      await this.beforeCommit?.(body.writes);
      // Validate the entire batch before changing anything, like Firestore.
      for (const write of body.writes) {
        const path = this.path(write.update?.name || write.delete);
        const exists = write.currentDocument?.exists;
        if (exists !== undefined && exists !== this.docs.has(path)) {
          return response({ error: { status: exists ? 'FAILED_PRECONDITION' : 'ALREADY_EXISTS' } }, 409);
        }
      }
      const next = structuredClone(this.docs);
      for (const write of body.writes) this.apply(next, write);
      this.docs = next;
      return response({ writeResults: body.writes.map(() => ({})) });
    }
    const path = this.path(url);
    if (method === 'PATCH') {
      this.apply(this.docs, {
        update: { name: resourceName(path), fields: body.fields },
        ...(url.searchParams.has('updateMask.fieldPaths')
          ? { updateMask: { fieldPaths: url.searchParams.getAll('updateMask.fieldPaths') } } : {})
      });
      return response(this.wire(path, this.docs.get(path)));
    }
    if (method === 'DELETE') { this.docs.delete(path); return response({}); }
    assert.equal(method, 'GET');
    const token = url.searchParams.get('transaction');
    const source = token ? this.snapshots.get(token) : this.docs;
    assert.ok(source, 'Read must refer to an active transaction');
    let result;
    if (url.searchParams.has('pageSize')) {
      if (this.failList === path) return response({ error: 'injected unavailable page' }, 503);
      const all = [...source].filter(([p]) => p.slice(0, p.lastIndexOf('/')) === path)
        .sort(([a], [b]) => a.localeCompare(b));
      const offset = Number(url.searchParams.get('pageToken') || 0);
      const size = Math.min(Number(url.searchParams.get('pageSize')), this.pageSize);
      result = response({
        documents: all.slice(offset, offset + size).map(([p, f]) => this.wire(p, f)),
        ...(offset + size < all.length ? { nextPageToken: String(offset + size) } : {})
      });
    } else result = source.has(path) ? response(this.wire(path, source.get(path))) : response({}, 404);
    await this.afterRead?.({ path, token, db: this });
    return result;
  }
  reset(gid = 'GRP-SNAPSHOT') {
    this.docs.clear(); this.snapshots.clear(); this.events.length = 0;
    this.beforeCommit = this.afterRead = this.failList = null;
    this.docs.set(`groups/${gid}`, { nama: 'Synthetic snapshot fixture' });
    return gid;
  }
}

let ip = 0;
export async function request(gid, payload, role = ROLES.GROUP_ADMIN) {
  const sessionToken = role ? signSession({ role, gid }, GROUP_SESSION_TTL) : '';
  const res = {
    statusCode: 200, headers: {}, body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
  await handler({
    method: 'POST', headers: { 'x-forwarded-for': `192.0.2.${++ip}` },
    body: JSON.stringify({ groupId: gid, sessionToken, ...payload })
  }, res);
  return res;
}
export async function successful(gid, payload) {
  const result = await request(gid, payload);
  assert.equal(result.statusCode, 200, JSON.stringify(result.body));
  assert.equal(result.body.status, true);
  return result.body;
}
export const PNG = Buffer.from('89504e470d0a1a0a0000000d494844520000000100000001', 'hex');
export const proofFile = { name: 'original.png', type: 'image/png', size: PNG.length, base64: PNG.toString('base64') };
export async function setupLedger(gid) {
  await successful(gid, { action: 'setKasStart', kasStart: '01-2026' });
  await successful(gid, { action: 'addSkippedMonth', month: '02-2026' });
  const member = await successful(gid, { action: 'tambahAnggota', nama: 'Synthetic Member' });
  const category = await successful(gid, { action: 'tambahKategori', nama: 'Synthetic Dues', tipe: 'Masuk' });
  return { tipeArus: 'Masuk', idAnggota: member.data.ID_Anggota, idKategori: category.data.ID_Kategori,
    bulanIuran: 'Maret', tahunIuran: '2026', nominal: 4000, timestamp: '2026-03-01T05:00:00.000Z', keterangan: 'Synthetic installment' };
}
