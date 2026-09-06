/**
 * @module api
 * Direct Firestore integration for Finkas (Google Firebase Cloud Firestore).
 * Fast, serverless, and 100% free under the Spark tier.
 */

import { FIREBASE_CONFIG } from './config.js';
import { getState, getAdminPassword } from './state.js';
import { fromFirestoreFields, toFirestoreFields, hashText } from './utils.js';

const PROJECT_ID = FIREBASE_CONFIG.projectId;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

let quotaCooldownUntil = 0;

/**
 * Fetch initial data (anggota, kategori, transaksi, settings).
 * @returns {Promise<{status: boolean, data: object, message: string}|null>}
 */
export const fetchInitialData = async () => {
  try {
    if (Date.now() < quotaCooldownUntil) {
      return { status: false, message: 'Batas kuota Firestore tercapai. Menggunakan data cache offline.' };
    }

    const [resAng, resKat, resTrx, resSet] = await Promise.all([
      fetch(`${FIRESTORE_BASE}/anggota?pageSize=300`).then((r) => r.json()),
      fetch(`${FIRESTORE_BASE}/kategori?pageSize=100`).then((r) => r.json()),
      fetch(`${FIRESTORE_BASE}/transaksi?pageSize=300&orderBy=Timestamp%20desc`).then((r) => r.json()),
      fetch(`${FIRESTORE_BASE}/settings/app_config`).then((r) => r.json())
    ]);

    // Check for API errors (e.g. 429 Quota Exceeded)
    if (resAng.error || resKat.error || resTrx.error) {
      const err = resAng.error || resKat.error || resTrx.error;
      if (err.code === 429) quotaCooldownUntil = Date.now() + 600000;
      return {
        status: false,
        message: err.code === 429 ? 'Batas kuota Firestore tercapai. Menggunakan data cache offline.' : (err.message || 'Gagal memuat data dari Firestore.')
      };
    }

    const anggota = (resAng.documents || []).map((d) => fromFirestoreFields(d.fields));
    const kategori = (resKat.documents || []).map((d) => fromFirestoreFields(d.fields));
    const transaksi = (resTrx.documents || []).map((d) => fromFirestoreFields(d.fields));
    const settingsDoc = fromFirestoreFields(resSet.fields);

    return {
      status: true,
      message: 'Data berhasil ditarik dari Firestore.',
      data: { anggota, kategori, transaksi, settings: { skippedMonths: settingsDoc.skippedMonths || [] } }
    };
  } catch (error) {
    console.error('Fetch initial data error:', error);
    return { status: false, message: error?.message || 'Gagal memuat data dari Firestore.', data: null };
  }
};

/**
 * Unified mutation handler for adding, updating, and deleting transactions.
 * @param {object} payload
 * @returns {Promise<{status: boolean, message: string, data: object|null}>}
 */
export const postToBackend = async (payload) => {
  try {
    if (!payload || typeof payload !== 'object') {
      return { status: false, message: 'Payload tidak valid.', data: null };
    }
    const action = payload.action;

    if (action === 'tambahTransaksi') {
      const dataForm = payload.dataForm || {};
      const nominal = Number(dataForm.nominal);
      if (isNaN(nominal) || nominal <= 0) return { status: false, message: 'Nominal transaksi harus lebih besar dari 0.', data: null };
      if (!['Masuk', 'Keluar'].includes(dataForm.tipeArus)) return { status: false, message: 'Tipe arus harus Masuk atau Keluar.', data: null };
      if (!dataForm.idKategori || dataForm.idKategori === '-') return { status: false, message: 'Kategori transaksi harus dipilih.', data: null };

      // Idempotency / Deduplication:
      // If adding an iuran payment, check if the member already paid for the exact same month & year.
      if (dataForm.idAnggota && dataForm.idAnggota !== '-' && dataForm.bulanIuran && dataForm.bulanIuran !== '-' && dataForm.tahunIuran && dataForm.tahunIuran !== '-') {
        const state = getState();
        const isDuplicate = (state.transaksi || []).some((t) => 
          t.ID_Anggota === dataForm.idAnggota &&
          t.Bulan_Iuran === dataForm.bulanIuran &&
          String(t.Tahun_Iuran) === String(dataForm.tahunIuran)
        );
        if (isDuplicate) {
          return {
            status: true,
            data: { duplicate: true },
            message: `Iuran ${dataForm.bulanIuran} ${dataForm.tahunIuran} sudah tercatat sebelumnya.`
          };
        }
      }

      const idTrx = 'TRX-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      const doc = {
        ID_Transaksi: idTrx, Timestamp: new Date().toISOString(), Tipe_Arus: dataForm.tipeArus,
        ID_Kategori: dataForm.idKategori, ID_Anggota: dataForm.idAnggota || '-',
        Bulan_Iuran: dataForm.bulanIuran || '-', Tahun_Iuran: dataForm.tahunIuran || '-',
        Nominal: nominal, Keterangan: dataForm.keterangan || ''
      };

      const res = await fetch(`${FIRESTORE_BASE}/transaksi/${idTrx}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestoreFields(doc) })
      });
      if (res.ok) {
        logAuditEvent('TAMBAH_TRANSAKSI', `${doc.Tipe_Arus} Rp${doc.Nominal} (${doc.Keterangan || doc.Bulan_Iuran})`);
        return { status: true, message: 'Transaksi disimpan ke Firestore.', data: doc };
      }
      return { status: false, message: 'Gagal menyimpan transaksi ke Firestore.', data: null };
    }

    if (action === 'tambahTransaksiMassal') {
      let listTrx = Array.isArray(payload.listTrx) ? payload.listTrx : [];
      if (!listTrx.length && payload.dataForm?.arrIdAnggota) {
        const { arrIdAnggota, tipeArus, idKategori, bulanIuran, tahunIuran, nominal, keterangan } = payload.dataForm;
        listTrx = (arrIdAnggota || []).map((idAng) => ({
          tipeArus: tipeArus || 'Masuk',
          idKategori: idKategori || '-',
          idAnggota: idAng,
          bulanIuran: bulanIuran || '-',
          tahunIuran: tahunIuran || '-',
          nominal: Number(nominal) || 0,
          keterangan: keterangan || 'Iuran Anggota'
        }));
      }

      if (!listTrx.length) {
        return { status: false, message: 'Daftar transaksi massal tidak boleh kosong.', data: null };
      }

      const validList = listTrx.filter((t) => Number(t.nominal) > 0 && t.idAnggota && t.idAnggota !== '-');
      if (!validList.length) {
        return { status: false, message: 'Data transaksi massal tidak valid atau nominal 0.', data: null };
      }

      const state = getState();
      const existingTrx = state.transaksi || [];
      const nonDuplicateList = [];
      const skippedIds = [];

      validList.forEach((dataForm) => {
        const isPaid = existingTrx.some((t) => 
          t.ID_Anggota === dataForm.idAnggota &&
          t.Bulan_Iuran === dataForm.bulanIuran &&
          String(t.Tahun_Iuran) === String(dataForm.tahunIuran)
        );
        if (isPaid) {
          skippedIds.push(dataForm.idAnggota);
        } else {
          nonDuplicateList.push(dataForm);
        }
      });

      if (nonDuplicateList.length === 0) {
        return {
          status: true,
          data: { duplicate: true, inserted: 0, skipped: skippedIds },
          message: 'Semua iuran dalam daftar massal sudah lunas tercatat sebelumnya.'
        };
      }

      const writes = nonDuplicateList.map((dataForm) => {
        const idTrx = 'TRX-' + Math.random().toString(36).substring(2, 9).toUpperCase();
        return {
          update: {
            name: `projects/${PROJECT_ID}/databases/(default)/documents/transaksi/${idTrx}`,
            fields: toFirestoreFields({
              ID_Transaksi: idTrx, Timestamp: new Date().toISOString(), Tipe_Arus: dataForm.tipeArus || 'Masuk',
              ID_Kategori: dataForm.idKategori || '-', ID_Anggota: dataForm.idAnggota || '-',
              Bulan_Iuran: dataForm.bulanIuran || '-', Tahun_Iuran: dataForm.tahunIuran || '-',
              Nominal: Number(dataForm.nominal) || 0, Keterangan: dataForm.keterangan || ''
            })
          }
        };
      });

      const commitRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writes })
      });

      if (!commitRes.ok) return { status: false, message: 'Gagal menyimpan transaksi massal (commit ditolak).', data: null };
      logAuditEvent('TAMBAH_IURAN_MASSAL', `${nonDuplicateList.length} iuran dicatat (atomic commit)`);

      return {
        status: true,
        message: `${nonDuplicateList.length} transaksi massal berhasil disimpan secara atomic.`,
        data: { inserted: nonDuplicateList.length, skipped: skippedIds }
      };
    }

    if (action === 'editTransaksi') {
      const dataForm = payload.dataForm || {};
      const idTarget = (payload.idTransaksi || dataForm.idTransaksi || '').trim();
      const nominal = Number(dataForm.nominal);
      if (!idTarget) return { status: false, message: 'ID transaksi tidak valid.', data: null };
      if (isNaN(nominal) || nominal <= 0) return { status: false, message: 'Nominal transaksi harus lebih dari 0.', data: null };
      if (!['Masuk', 'Keluar'].includes(dataForm.tipeArus)) return { status: false, message: 'Tipe arus harus Masuk atau Keluar.', data: null };
      if (!dataForm.idKategori || dataForm.idKategori === '-') return { status: false, message: 'Kategori transaksi harus dipilih.', data: null };

      const res = await fetch(`${FIRESTORE_BASE}/transaksi/${idTarget}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: toFirestoreFields({
            ID_Transaksi: idTarget, Tipe_Arus: dataForm.tipeArus, ID_Kategori: dataForm.idKategori,
            ID_Anggota: dataForm.idAnggota || '-', Bulan_Iuran: dataForm.bulanIuran || '-',
            Tahun_Iuran: dataForm.tahunIuran || '-', Nominal: nominal, Keterangan: dataForm.keterangan || ''
          })
        })
      });
      if (res.ok) {
        logAuditEvent('EDIT_TRANSAKSI', `ID: ${idTarget}`);
        return { status: true, message: 'Transaksi berhasil diupdate.', data: null };
      }
      return { status: false, message: 'Gagal mengupdate transaksi.', data: null };
    }

    if (action === 'hapusTransaksi') {
      const idTarget = (payload.idTransaksi || '').trim();
      if (!idTarget) return { status: false, message: 'ID transaksi tidak valid untuk dihapus.', data: null };
      const res = await fetch(`${FIRESTORE_BASE}/transaksi/${idTarget}`, { method: 'DELETE' });
      if (res.ok) {
        logAuditEvent('HAPUS_TRANSAKSI', `ID: ${idTarget}`);
        return { status: true, message: 'Transaksi berhasil dihapus.', data: null };
      }
      return { status: false, message: 'Gagal menghapus transaksi.', data: null };
    }

    if (action === 'addSkippedMonth' || action === 'removeSkippedMonth') {
      const month = String(payload.month || '').trim();
      if (!/^\d{2}-\d{4}$/.test(month)) return { status: false, message: 'Format bulan libur harus MM-YYYY.', data: null };
      const cfgRes = await fetch(`${FIRESTORE_BASE}/settings/app_config`).then((r) => r.json());
      const cur = fromFirestoreFields(cfgRes.fields).skippedMonths || [];
      const updated = action === 'addSkippedMonth' ? (!cur.includes(month) ? [...cur, month] : cur) : cur.filter((m) => m !== month);
      await fetch(`${FIRESTORE_BASE}/settings/app_config?updateMask.fieldPaths=skippedMonths`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { skippedMonths: { arrayValue: { values: updated.map((m) => ({ stringValue: m })) } } } })
      });
      logAuditEvent(action === 'addSkippedMonth' ? 'TAMBAH_BULAN_LIBUR' : 'HAPUS_BULAN_LIBUR', month);
      return { status: true, message: 'Pengaturan bulan libur diperbarui.', data: { skippedMonths: updated } };
    }

    if (action === 'tambahAnggota') {
      const nama = (typeof payload.nama === 'string' ? payload.nama : '').trim();
      const noWa = (typeof payload.noWa === 'string' ? payload.noWa : '').trim();
      if (!nama) return { status: false, message: 'Nama anggota wajib diisi.', data: null };
      const idAnggota = 'ANG-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const doc = { ID_Anggota: idAnggota, Nama_Anggota: nama, Nomor_WA: noWa, Status_Aktif: 'Aktif' };
      const res = await fetch(`${FIRESTORE_BASE}/anggota/${idAnggota}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestoreFields(doc) })
      });
      if (res.ok) {
        logAuditEvent('TAMBAH_ANGGOTA', nama);
        return { status: true, message: 'Anggota berhasil ditambahkan.', data: doc };
      }
      return { status: false, message: 'Gagal menambah anggota.', data: null };
    }

    if (action === 'updateStatusAnggota') {
      const idAnggota = (payload.idAnggota || '').trim();
      const statusAktif = payload.statusAktif;
      if (!idAnggota) return { status: false, message: 'ID anggota tidak valid.', data: null };
      if (!['Aktif', 'Nonaktif'].includes(statusAktif)) return { status: false, message: 'Status anggota harus Aktif atau Nonaktif.', data: null };
      const res = await fetch(`${FIRESTORE_BASE}/anggota/${idAnggota}?updateMask.fieldPaths=Status_Aktif`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { Status_Aktif: { stringValue: statusAktif } } })
      });
      if (res.ok) {
        logAuditEvent('STATUS_ANGGOTA', `${idAnggota} -> ${statusAktif}`);
        return { status: true, message: 'Status anggota diperbarui.', data: null };
      }
      return { status: false, message: 'Gagal memperbarui status anggota.', data: null };
    }

    if (action === 'hapusAnggota') {
      const idAnggota = (payload.idAnggota || '').trim();
      if (!idAnggota) return { status: false, message: 'ID anggota tidak valid untuk dihapus.', data: null };
      const res = await fetch(`${FIRESTORE_BASE}/anggota/${idAnggota}`, { method: 'DELETE' });
      if (res.ok) {
        logAuditEvent('HAPUS_ANGGOTA', idAnggota);
        return { status: true, message: 'Anggota berhasil dihapus.', data: null };
      }
      return { status: false, message: 'Gagal menghapus anggota.', data: null };
    }

    if (action === 'tambahKategori') {
      const nama = (typeof payload.nama === 'string' ? payload.nama : '').trim();
      const tipe = payload.tipe;
      if (!nama) return { status: false, message: 'Nama kategori wajib diisi.', data: null };
      if (!['Masuk', 'Keluar'].includes(tipe)) return { status: false, message: 'Tipe kategori harus Masuk atau Keluar.', data: null };
      const prefix = tipe === 'Masuk' ? 'KAT-M' : 'KAT-K';
      const idKategori = prefix + Math.random().toString(36).substring(2, 6).toUpperCase();
      const doc = { ID_Kategori: idKategori, Nama_Kategori: nama, Tipe: tipe };
      const res = await fetch(`${FIRESTORE_BASE}/kategori/${idKategori}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestoreFields(doc) })
      });
      if (res.ok) {
        logAuditEvent('TAMBAH_KATEGORI', `${nama} (${tipe})`);
        return { status: true, message: 'Kategori berhasil ditambahkan.', data: doc };
      }
      return { status: false, message: 'Gagal menambah kategori.', data: null };
    }

    if (action === 'hapusKategori') {
      const idKategori = (payload.idKategori || '').trim();
      if (!idKategori) return { status: false, message: 'ID kategori tidak valid untuk dihapus.', data: null };
      const res = await fetch(`${FIRESTORE_BASE}/kategori/${idKategori}`, { method: 'DELETE' });
      if (res.ok) {
        logAuditEvent('HAPUS_KATEGORI', idKategori);
        return { status: true, message: 'Kategori berhasil dihapus.', data: null };
      }
      return { status: false, message: 'Gagal menghapus kategori.', data: null };
    }

    return { status: false, message: 'Aksi tidak dikenal.', data: null };
  } catch (err) {
    console.error('postToBackend error:', err);
    return { status: false, message: err?.message || 'Terjadi kesalahan pada backend.', data: null };
  }
};

/**
 * Log administrative activity to Firestore audit_log collection.
 * @param {string} aksi - Activity tag
 * @param {string} detail - Description
 */
export const logAuditEvent = (aksi, detail) => {
  const idLog = 'LOG-' + Math.random().toString(36).substring(2, 9).toUpperCase();
  const doc = { ID_Log: idLog, Timestamp: new Date().toISOString(), Aksi: aksi, Detail: detail || '' };
  fetch(`${FIRESTORE_BASE}/audit_log/${idLog}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFirestoreFields(doc) })
  }).catch(() => {});
};

/**
 * Send an authenticated payload.
 * @param {object} payload
 */
export const sendAdminPayload = async (payload) => {
  return await postToBackend({ ...payload, adminPassword: getAdminPassword() });
};

/**
 * Login admin with hybrid serverless auth and direct fallback.
 * @param {string} pwd
 */
export const loginAdminApi = async (pwd) => {
  try {
    const trimmed = (pwd || '').trim();
    if (!trimmed) return { status: false, message: 'Password tidak boleh kosong.', data: null };

    // 1. Coba serverless authentication endpoint (Vercel)
    try {
      const sRes = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed })
      });
      if (sRes.status !== 404) {
        const json = await sRes.json();
        if (json.status) logAuditEvent('LOGIN_ADMIN', 'Login via serverless auth');
        else logAuditEvent('LOGIN_GAGAL', 'Password salah (serverless)');
        return json;
      }
    } catch (_) {}

    // 2. Fallback direct Firestore (jika di host statis murni / offline)
    const inputHash = await hashText(trimmed);
    const cfgRes = await fetch(`${FIRESTORE_BASE}/settings/app_config`).then((r) => r.json());
    const storedHash = fromFirestoreFields(cfgRes.fields).admin_password_hash || '';

    if (storedHash && inputHash === storedHash) {
      logAuditEvent('LOGIN_ADMIN', 'Login Sukses (fallback)');
      return { status: true, message: 'Login Sukses', data: null };
    }
    logAuditEvent('LOGIN_GAGAL', 'Password salah (fallback)');
    return { status: false, message: 'Password Salah!', data: null };
  } catch (error) {
    console.error('Login error:', error);
    return { status: false, message: 'Gagal terhubung ke server autentikasi.', data: null };
  }
};

/**
 * Check if admin session is active.
 */
export const checkAdminSessionApi = async () => {
  const pwd = getAdminPassword();
  return { status: true, data: { isAdmin: !!pwd } };
};

/**
 * Logout admin session.
 */
export const logoutAdminApi = async () => {
  logAuditEvent('LOGOUT_ADMIN', 'Admin logout');
  return { status: true, message: 'Logout Sukses', data: null };
};

/**
 * Fetch audit log from Firestore collection.
 */
export const fetchAuditLogApi = async () => {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/audit_log?pageSize=50`).then((r) => r.json());
    if (res.error) return { status: false, message: 'Gagal memuat log audit.', data: { log: [] } };
    const log = (res.documents || []).map((d) => fromFirestoreFields(d.fields));
    log.sort((a, b) => new Date(b.Timestamp || 0) - new Date(a.Timestamp || 0));
    return { status: true, data: { log } };
  } catch (err) {
    return { status: false, message: 'Gagal memuat log audit.', data: { log: [] } };
  }
};
