/**
 * Entity write handlers for a single group: members, categories, skipped
 * (holiday) months, the kas-start override and client-reported audit events.
 *
 * Every handler validates its input, writes the change and appends an audit
 * entry. Handlers return `{status, message, data}` for business-level
 * rejections and throw for infrastructure failures.
 */
import { fsGet, fsPatch } from './_sa.js';
import {
  CATEGORIES_COLLECTION,
  MEMBERS_COLLECTION,
  col,
  isValidDocId,
  newId,
  nowIso,
  settingsDoc,
  writeAuditLog
} from './_store.js';
import {
  SKIPPED_MONTH_RE,
  ARUS,
  STATUSES,
  fail,
  ok,
  cleanText,
  cleanDigits
} from './_write-shared.js';

/* ── Skipped months ──────────────────────────────────────────────── */

export async function changeSkippedMonth(gid, payload, headers, shouldAdd) {
  const month = cleanText(payload?.month, 7);
  if (!SKIPPED_MONTH_RE.test(month)) return fail('Format bulan libur harus MM-YYYY.');

  const settings = await fsGet(settingsDoc(gid), headers);
  const current = settings?.skippedMonths || [];
  const updated = shouldAdd
    ? (current.includes(month) ? current : [...current, month])
    : current.filter((m) => m !== month);

  await fsPatch(settingsDoc(gid), { skippedMonths: updated }, headers, ['skippedMonths']);
  await writeAuditLog(gid, shouldAdd ? 'TAMBAH_BULAN_LIBUR' : 'HAPUS_BULAN_LIBUR', month, headers);
  return ok('Pengaturan bulan libur diperbarui.', { skippedMonths: updated });
}

/**
 * Set the month a group starts billing dues (the arrears window origin).
 *
 * Stored on the settings document as `kasStart` (MM-YYYY) so it costs no extra
 * read — readGroupData already fetches that document. An empty string clears it,
 * which makes the client fall back to the legacy GROUP_START constant. A future
 * month is rejected so the arrears window can never start after "now".
 */
export async function setKasStart(gid, payload, headers) {
  const raw = cleanText(payload?.kasStart, 7);

  // Empty clears the override (revert to the legacy fallback).
  if (raw !== '') {
    if (!SKIPPED_MONTH_RE.test(raw)) return fail('Format awal kas harus MM-YYYY.');
    const [mm, yyyy] = raw.split('-').map(Number);
    const start = new Date(yyyy, mm - 1, 1).getTime();
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    if (start > thisMonth) return fail('Awal kas tidak boleh melewati bulan berjalan.');
  }

  await fsPatch(settingsDoc(gid), { kasStart: raw }, headers, ['kasStart']);
  await writeAuditLog(gid, 'UBAH_AWAL_KAS', raw || '(dikosongkan)', headers);
  return ok('Awal mulai kas diperbarui.', { kasStart: raw });
}

/* ── Members ─────────────────────────────────────────────────────── */

export async function addMember(gid, payload, headers) {
  const nama = cleanText(payload?.nama, 80);
  if (!nama) return fail('Nama anggota wajib diisi.');
  if (nama.length < 2) return fail('Nama anggota minimal 2 karakter.');

  const idAnggota = newId('ANG');
  const doc = {
    ID_Anggota: idAnggota,
    Nama_Anggota: nama,
    Nomor_WA: cleanDigits(payload?.noWa, 20),
    Status_Aktif: 'Aktif',
    // Records the join month so dues are billed only from when a member joined,
    // not retroactively to the group's start.
    Tanggal_Gabung: nowIso(),
    groupId: gid
  };

  await fsPatch(`${col(gid, MEMBERS_COLLECTION)}/${idAnggota}`, doc, headers);
  await writeAuditLog(gid, 'TAMBAH_ANGGOTA', nama, headers);
  return ok('Anggota berhasil ditambahkan.', doc);
}

export async function updateMemberStatus(gid, payload, headers) {
  const idAnggota = cleanText(payload?.idAnggota, 40);
  const statusAktif = payload?.statusAktif;
  if (!idAnggota || !isValidDocId(idAnggota)) return fail('ID anggota tidak valid.');
  if (!STATUSES.includes(statusAktif)) return fail('Status anggota harus Aktif atau Nonaktif.');

  const existing = await fsGet(`${col(gid, MEMBERS_COLLECTION)}/${idAnggota}`, headers);
  if (!existing) return fail('Anggota tidak ditemukan.');

  const patchData = { Status_Aktif: statusAktif };
  const updateMask = ['Status_Aktif'];

  const nama = cleanText(payload?.nama, 80);
  if (nama && nama.length >= 2) {
    patchData.Nama_Anggota = nama;
    updateMask.push('Nama_Anggota');
  }

  if (payload?.noWa !== undefined && payload?.noWa !== null) {
    patchData.Nomor_WA = cleanDigits(payload.noWa, 20);
    updateMask.push('Nomor_WA');
  }

  await fsPatch(`${col(gid, MEMBERS_COLLECTION)}/${idAnggota}`, patchData, headers, updateMask);
  await writeAuditLog(gid, 'STATUS_ANGGOTA', `${idAnggota} diperbarui (${statusAktif})`, headers);
  return ok('Data anggota diperbarui.');
}

/* ── Categories ──────────────────────────────────────────────────── */

export async function addCategory(gid, payload, headers) {
  const nama = cleanText(payload?.nama, 60);
  const tipe = payload?.tipe;
  if (!nama) return fail('Nama kategori wajib diisi.');
  if (!ARUS.includes(tipe)) return fail('Tipe kategori harus Masuk atau Keluar.');

  const idKategori = newId(tipe === 'Masuk' ? 'KAT-M' : 'KAT-K');
  const doc = { ID_Kategori: idKategori, Nama_Kategori: nama, Tipe: tipe, groupId: gid };

  await fsPatch(`${col(gid, CATEGORIES_COLLECTION)}/${idKategori}`, doc, headers);
  await writeAuditLog(gid, 'TAMBAH_KATEGORI', `${nama} (${tipe})`, headers);
  return ok('Kategori berhasil ditambahkan.', doc);
}

/* ── Client-reported activities ──────────────────────────────────── */

/** Low-risk events the browser is allowed to record itself. */
const CLIENT_AUDIT_ACTIONS = new Set([
  'BACKUP_DATABASE',
  'RESTORE_DATABASE',
  'OFFLINE_SYNC',
  'LOGOUT_ADMIN'
]);

export async function noteClientAudit(gid, payload, headers) {
  const aksi = cleanText(payload?.aksi, 40);
  if (!CLIENT_AUDIT_ACTIONS.has(aksi)) return fail('Aksi audit tidak diizinkan.');
  await writeAuditLog(gid, aksi, cleanText(payload?.detail, 200), headers);
  return ok('Aktivitas dicatat.');
}
