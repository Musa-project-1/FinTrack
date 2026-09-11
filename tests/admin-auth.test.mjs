import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

function hashGroupAdminPassword(groupId, password) {
  return crypto.createHash('sha256').update(`finkas-admin:${groupId}:${password}`).digest('hex');
}

function generateRandomPassword(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#@!';
  let res = '';
  for (let i = 0; i < len; i += 1) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

test('Hash password admin grup terisolasi per groupId (salt-per-group)', () => {
  const pwd = 'PasswordRahasia123';
  const hashGrupA = hashGroupAdminPassword('GRP-A', pwd);
  const hashGrupB = hashGroupAdminPassword('GRP-B', pwd);

  assert.equal(hashGrupA.length, 64);
  assert.equal(hashGrupB.length, 64);
  // Password sama tetapi grup beda menghasilkan hash yang mutlak berbeda
  assert.notEqual(hashGrupA, hashGrupB);
});

test('Generator password acak admin menghasilkan 8 karakter unik', () => {
  const p1 = generateRandomPassword(8);
  const p2 = generateRandomPassword(8);
  assert.equal(p1.length, 8);
  assert.equal(p2.length, 8);
  assert.notEqual(p1, p2);
});

test('Superadmin whitelist mengenali email pemilik utama dan email tambahan', () => {
  const PRIMARY_SUPERADMIN = 'musabakhtiar0@gmail.com';
  const whitelist = [PRIMARY_SUPERADMIN, 'partner@gmail.com'];

  const isSuperAdmin = (email) => {
    const clean = String(email || '').trim().toLowerCase();
    return clean === PRIMARY_SUPERADMIN || whitelist.includes(clean);
  };

  assert.equal(isSuperAdmin('musabakhtiar0@gmail.com'), true);
  assert.equal(isSuperAdmin('partner@gmail.com'), true);
  assert.equal(isSuperAdmin('random.user@gmail.com'), false);
  assert.equal(isSuperAdmin(''), false);
});
