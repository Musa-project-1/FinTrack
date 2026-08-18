/**
 * ============================================================================
 * BACKEND API v5 — DemoKas Professional
 * 
 * Changes from v4:
 * - ADMIN_PASSWORD stored in PropertiesService (no longer hardcoded in source)
 * - loginAdmin() only validates against stored hash (removed plaintext fallback)
 * - requireAdminAuth() simplified: server session OR client hash — no double-valid
 * - Dispatch table pattern replaces long if/else chain
 * - Input validation added to every handler
 * - setupAdminPassword() function for first-run credential setup
 * ============================================================================
 */

const SPREADSHEET_ID = "1_cvppK9zmuXXQ9oZcH66zwOzwCYWJ_nP411M9W09zGo";
const ADMIN_SESSION_LAST_LOGIN_KEY = 'ADMIN_LAST_LOGIN';
const ADMIN_SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/* ── Password helpers ──────────────────────────────────────────── */

/**
 * Hash a password using SHA-256.
 * @param {string} password
 * @returns {string} Hex-encoded hash.
 */
function hashPassword(password) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password || '', Utilities.Charset.UTF_8);
  return digest.map(function(byte) {
    const value = byte < 0 ? byte + 256 : byte;
    return value.toString(16).padStart(2, '0');
  }).join('');
}

function getScriptProps() {
  return PropertiesService.getScriptProperties();
}

/**
 * Get the stored admin password hash from Script Properties.
 * Returns empty string if not set.
 */
function getStoredPasswordHash() {
  return getScriptProps().getProperty('ADMIN_PASSWORD_HASH') || '';
}

/* ── Session management ────────────────────────────────────────── */

function getAdminLastLogin() {
  const value = getScriptProps().getProperty(ADMIN_SESSION_LAST_LOGIN_KEY) || '0';
  return parseInt(value, 10) || 0;
}

function isAdminSessionActive() {
  const lastLogin = getAdminLastLogin();
  return lastLogin > 0 && (Date.now() - lastLogin) < ADMIN_SESSION_TIMEOUT_MS;
}

function checkAdminSession() {
  return isAdminSessionActive();
}

/**
 * Login admin. Only accepts plaintext password (client sends raw password).
 * Backend hashes it and compares to stored hash.
 * @param {string} password - The plaintext password from the client.
 * @returns {boolean}
 */
function loginAdmin(password) {
  const storedHash = getStoredPasswordHash();
  if (!storedHash) return false;
  const providedHash = hashPassword(password);
  if (providedHash !== storedHash) return false;
  getScriptProps().setProperty(ADMIN_SESSION_LAST_LOGIN_KEY, String(Date.now()));
  return true;
}

function logoutAdmin() {
  getScriptProps().deleteProperty(ADMIN_SESSION_LAST_LOGIN_KEY);
  return true;
}

/**
 * Require admin auth: either active server session OR valid hash sent by client.
 * @param {string} providedAdminHash - SHA-256 hash of password from client.
 * @returns {boolean}
 */
function requireAdminAuth(providedAdminHash) {
  if (isAdminSessionActive()) return true;
  const storedHash = getStoredPasswordHash();
  if (providedAdminHash && storedHash && providedAdminHash === storedHash) return true;
  return false;
}

/* ── First-run setup function ──────────────────────────────────── */

/**
 * Run this ONCE to set the admin password.
 * After setting, this function can be removed or left dormant.
 * Usage: In Apps Script editor, run setupAdminPassword('yourpassword')
 */
function setupAdminPassword(plaintextPassword) {
  if (!plaintextPassword || plaintextPassword.length < 4) {
    Logger.log('ERROR: Password must be at least 4 characters.');
    return;
  }
  const hash = hashPassword(plaintextPassword);
  getScriptProps().setProperty('ADMIN_PASSWORD_HASH', hash);
  Logger.log('Admin password hash stored successfully.');
}

/* ── Spreadsheet helpers ───────────────────────────────────────── */

function getDB() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSettingsSheet(db) {
  let sheet = db.getSheetByName('Settings');
  if (!sheet) {
    sheet = db.insertSheet('Settings');
    sheet.getRange(1,1,1,2).setValues([['Key','Value']]);
  }
  return sheet;
}

function getSettingValue(db, key) {
  const sheet = getSettingsSheet(db);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if ((values[i][0] || '') === key) return values[i][1] || '';
  }
  return '';
}

function setSettingValue(db, key, value) {
  const sheet = getSettingsSheet(db);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if ((values[i][0] || '') === key) {
      sheet.getRange(i+1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function getSkippedMonths(db) {
  try {
    const raw = getSettingValue(db, 'SKIPPED_MONTHS') || '[]';
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
    return [];
  } catch (e) { return []; }
}

function addSkippedMonth(db, mmYYYY) {
  const arr = getSkippedMonths(db);
  if (arr.indexOf(mmYYYY) === -1) {
    arr.push(mmYYYY);
    setSettingValue(db, 'SKIPPED_MONTHS', JSON.stringify(arr));
  }
  return arr;
}

function removeSkippedMonth(db, mmYYYY) {
  const arr = getSkippedMonths(db);
  const idx = arr.indexOf(mmYYYY);
  if (idx !== -1) {
    arr.splice(idx, 1);
    setSettingValue(db, 'SKIPPED_MONTHS', JSON.stringify(arr));
  }
  return arr;
}

/* ── Response & sheet helpers ──────────────────────────────────── */

function responseJSON(status, message, data) {
  if (data === undefined) data = null;
  return ContentService
    .createTextOutput(JSON.stringify({ status: status, message: message, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetToJSON(sheet) {
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  const jsonData = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    jsonData.push(obj);
  }
  return jsonData;
}

/* ── Input validators ──────────────────────────────────────────── */

function validateNominal(nominal) {
  const n = Number(nominal);
  return !isNaN(n) && n > 0;
}

function validateTipeArus(tipe) {
  return tipe === 'Masuk' || tipe === 'Keluar';
}

function validateMonth(month) {
  if (!month || typeof month !== 'string') return false;
  const parts = month.split('-');
  if (parts.length !== 2) return false;
  const mm = parseInt(parts[0], 10);
  return mm >= 1 && mm <= 12;
}

/* ── Action handlers ───────────────────────────────────────────── */

function handleLoginAdmin(payload) {
  const password = payload.adminPassword || payload.password || '';
  if (loginAdmin(password)) {
    return responseJSON(true, 'Login Sukses', null);
  }
  return responseJSON(false, 'Password Salah!', null);
}

function handleCheckSession() {
  return responseJSON(true, 'Status sesi admin.', { isAdmin: checkAdminSession() });
}

function handleLogoutAdmin() {
  logoutAdmin();
  return responseJSON(true, 'Logout Sukses', null);
}

function handleTambahTransaksi(db, payload) {
  const sheetTrx = db.getSheetByName('Transaksi');
  const { idKategori, tipeArus, idAnggota, bulanIuran, tahunIuran, nominal, keterangan } = payload.dataForm || {};

  if (!validateTipeArus(tipeArus)) return responseJSON(false, 'Tipe arus tidak valid (Masuk/Keluar).');
  if (!validateNominal(nominal)) return responseJSON(false, 'Nominal harus bilangan positif.');
  if (!idKategori) return responseJSON(false, 'Kategori harus diisi.');

  const idTransaksi = 'TRX-' + Utilities.getUuid().substring(0, 8).toUpperCase();
  sheetTrx.appendRow([
    idTransaksi, new Date(), tipeArus, idKategori,
    idAnggota || '-', bulanIuran || '-', tahunIuran || '-',
    Number(nominal), keterangan || ''
  ]);
  return responseJSON(true, 'Transaksi disimpan.', null);
}

function handleHapusTransaksi(db, payload) {
  const sheetTrx = db.getSheetByName('Transaksi');
  const idTarget = payload.idTransaksi;
  if (!idTarget) return responseJSON(false, 'ID Transaksi harus diisi.');

  const data = sheetTrx.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === idTarget) {
      sheetTrx.deleteRow(i + 1);
      return responseJSON(true, 'Transaksi dihapus.', null);
    }
  }
  return responseJSON(false, 'Data tidak ditemukan.', null);
}

function handleTambahTransaksiMassal(db, payload) {
  const sheetTrx = db.getSheetByName('Transaksi');
  const { idKategori, tipeArus, bulanIuran, tahunIuran, nominal, keterangan, arrIdAnggota } = payload.dataForm || {};

  if (!validateTipeArus(tipeArus)) return responseJSON(false, 'Tipe arus tidak valid.');
  if (!validateNominal(nominal)) return responseJSON(false, 'Nominal harus bilangan positif.');
  if (!idKategori) return responseJSON(false, 'Kategori harus diisi.');
  if (!arrIdAnggota || !arrIdAnggota.length) return responseJSON(false, 'Pilih minimal 1 anggota.');

  const timestamp = new Date();
  const newRows = [];
  arrIdAnggota.forEach(function(idAng) {
    const idTransaksi = 'TRX-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    newRows.push([
      idTransaksi, timestamp, tipeArus, idKategori, idAng,
      bulanIuran || '-', tahunIuran || '-', Number(nominal), keterangan || ''
    ]);
  });

  if (newRows.length > 0) {
    const lastRow = sheetTrx.getLastRow();
    sheetTrx.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }
  return responseJSON(true, (newRows.length || 0) + ' Iuran berhasil dicatat sekaligus!', null);
}

function handleEditTransaksi(db, payload) {
  const sheetTrx = db.getSheetByName('Transaksi');
  const { idTransaksi, idKategori, tipeArus, idAnggota, bulanIuran, tahunIuran, nominal, keterangan } = payload.dataForm || {};

  if (!idTransaksi) return responseJSON(false, 'ID Transaksi harus diisi.');
  if (!validateTipeArus(tipeArus)) return responseJSON(false, 'Tipe arus tidak valid.');
  if (!validateNominal(nominal)) return responseJSON(false, 'Nominal harus bilangan positif.');

  const data = sheetTrx.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === idTransaksi) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) return responseJSON(false, 'Data transaksi tidak ditemukan untuk diedit.', null);

  sheetTrx.getRange(rowIndex, 3, 1, 7).setValues([[
    tipeArus, idKategori, idAnggota || '-',
    bulanIuran || '-', tahunIuran || '-',
    Number(nominal), keterangan || ''
  ]]);
  return responseJSON(true, 'Transaksi berhasil diupdate.', null);
}

function handleTambahAnggota(db, payload) {
  const sheetAnggota = db.getSheetByName('Anggota');
  const namaAnggota = (payload.dataForm && payload.dataForm.namaAnggota || '').trim();
  if (!namaAnggota) return responseJSON(false, 'Nama anggota harus diisi.');

  const idAnggota = 'ANG-' + Utilities.getUuid().substring(0, 6).toUpperCase();
  sheetAnggota.appendRow([idAnggota, namaAnggota, 'Aktif']);
  return responseJSON(true, 'Anggota baru berhasil ditambahkan.', null);
}

function handleTambahKategori(db, payload) {
  const sheetKategori = db.getSheetByName('Kategori');
  const tipe = payload.dataForm && payload.dataForm.tipe || '';
  const namaKategori = payload.dataForm && payload.dataForm.namaKategori || '';
  if (!validateTipeArus(tipe)) return responseJSON(false, 'Tipe tidak valid (Masuk/Keluar).');
  if (!namaKategori) return responseJSON(false, 'Nama kategori harus diisi.');

  const idKategori = 'KAT-' + Utilities.getUuid().substring(0, 6).toUpperCase();
  sheetKategori.appendRow([idKategori, tipe, namaKategori]);
  return responseJSON(true, 'Kategori baru berhasil ditambahkan.', null);
}

function handleAddSkippedMonth(db, payload) {
  const month = (payload.month || '').toString();
  if (!validateMonth(month)) return responseJSON(false, 'Parameter bulan tidak valid (format: MM-YYYY).');
  const updated = addSkippedMonth(db, month);
  return responseJSON(true, 'Bulan libur ditambahkan.', { skippedMonths: updated });
}

function handleRemoveSkippedMonth(db, payload) {
  const month = (payload.month || '').toString();
  if (!month) return responseJSON(false, 'Parameter bulan tidak valid.');
  const updated = removeSkippedMonth(db, month);
  return responseJSON(true, 'Bulan libur dihapus.', { skippedMonths: updated });
}

/* ── Dispatch table ────────────────────────────────────────────── */

const ACTION_HANDLERS = {
  tambahTransaksi:         { requiresAuth: true,  handler: handleTambahTransaksi },
  hapusTransaksi:          { requiresAuth: true,  handler: handleHapusTransaksi },
  tambahTransaksiMassal:   { requiresAuth: true,  handler: handleTambahTransaksiMassal },
  editTransaksi:           { requiresAuth: true,  handler: handleEditTransaksi },
  tambahAnggota:           { requiresAuth: true,  handler: handleTambahAnggota },
  tambahKategori:          { requiresAuth: true,  handler: handleTambahKategori },
  addSkippedMonth:         { requiresAuth: true,  handler: handleAddSkippedMonth },
  removeSkippedMonth:      { requiresAuth: true,  handler: handleRemoveSkippedMonth },
  loginAdmin:              { requiresAuth: false, handler: handleLoginAdmin },
  cekLoginAdmin:           { requiresAuth: false, handler: handleLoginAdmin },
  verifyAdminPassword:     { requiresAuth: false, handler: handleLoginAdmin },
  checkAdminSession:       { requiresAuth: false, handler: handleCheckSession },
  logoutAdmin:             { requiresAuth: false, handler: handleLogoutAdmin },
};

/* ── Entry points ──────────────────────────────────────────────── */

function doGet(e) {
  try {
    const action = e.parameter.action;
    const db = getDB();

    if (action === 'getDataAwal') {
      return responseJSON(true, 'Data berhasil ditarik.', {
        anggota: sheetToJSON(db.getSheetByName('Anggota')),
        kategori: sheetToJSON(db.getSheetByName('Kategori')),
        transaksi: sheetToJSON(db.getSheetByName('Transaksi')),
        settings: { skippedMonths: getSkippedMonths(db) }
      });
    }
    return responseJSON(false, 'Aksi GET tidak valid.', null);
  } catch (error) {
    return responseJSON(false, 'Error Server (GET): ' + error.message, null);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    if (!e.parameter || !e.parameter.data) {
      return responseJSON(false, 'Payload tidak ditemukan.', null);
    }

    const payload = JSON.parse(e.parameter.data);
    const action = payload.action;
    const db = getDB();
    const providedAdminHash = (payload.adminPassword || '').toString();

    const handler = ACTION_HANDLERS[action];
    if (!handler) {
      return responseJSON(false, 'Aksi POST tidak valid: ' + action, null);
    }

    if (handler.requiresAuth && !requireAdminAuth(providedAdminHash)) {
      return responseJSON(false, 'Ditolak: Password Admin Salah atau sesi Admin tidak aktif.', null);
    }

    return handler.handler(db, payload);
  } catch (error) {
    return responseJSON(false, 'Error Server: ' + error.message, null);
  } finally {
    lock.releaseLock();
  }
}
