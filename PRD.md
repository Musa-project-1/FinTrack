# Product Requirements Document (PRD) — Finkas

> **Status:** Aktif & Terimplementasi (`main`, `v308`)  
> **Domain:** Pembukuan Kas Komunitas & Manajemen Iuran (*Offline-First Progressive Web App*)  
> **Zona Waktu Akuntansi:** `Asia/Jakarta` (WIB, UTC+7)  
> **Dokumen Pendamping:** [`README.md`](./README.md) · [`DESIGN.md`](./DESIGN.md) · [`GLOSSARY.md`](./GLOSSARY.md)

---

## 1. Ringkasan Produk & Tujuan
**Finkas** adalah aplikasi web **PWA offline-first** untuk pencatatan kas kelompok (RT/RW, arisan, kas kelas, organisasi warga) secara transparan, jujur, dan terisolasi per grup. Browser tidak pernah terhubung langsung ke Firestore; seluruh akses data melewati gateway API serverless terautentikasi agar saldo kas, status iuran, dan otorisasi tetap utuh walaupun digunakan di lapangan dengan koneksi tidak stabil.

### Sasaran Utama
1. **Transparansi real-time tanpa manipulasi:** Anggota dapat melihat saldo, arus kas, dan status iuran 12 bulan dengan zona waktu WIB deterministik.
2. **Keandalan offline-first:** Pengurus dapat tetap mencatat transaksi saat offline (tersimpan di IndexedDB) tanpa duplikasi saat sinkronisasi ulang.
3. **Isolasi & keamanan multi-grup:** Satu instalasi mendukung banyak grup dengan data terisolasi penuh lewat PIN grup, hash `scrypt`, dan token sesi HMAC.

---

## 2. Persona & Matriks Hak Akses

| Peran | Jalur Autentikasi | Ruang Lingkup & Kemampuan |
|---|---|---|
| **Member (Anggota)** | Verifikasi PIN 4 angka grup (`api/verify-group-pin.ts`) | Melihat dashboard, riwayat transaksi, matriks iuran 12 bulan, statistik grafik, menyematkan profil pribadi (**Spotlight**), membuka struk transaksi, mengunduh bukti, melihat **Self-Pay** & konfirmasi WhatsApp bendahara. Tidak dapat mengubah data. |
| **Group Admin (Bendahara/Pengurus)** | Login email + kata sandi pengurus grup (`api/login.ts`) | Semua hak baca grup + mencatat transaksi iuran/operasional, QuickPay, edit/hapus transaksi, unggah/hapus bukti lampiran (`<= 512 KiB`), kelola anggota/kategori/bulan libur/**Kas Start**/rekening kas, backup/restore **Snapshot** JSON, kirim ulang **Sync Queue**, serta toggle mode pratinjau **Anggota** (`adminViewMode`). |
| **Super Admin (Pemilik Platform)** | Login kata sandi master (`api/login.ts`) atau Google OAuth whitelist (`api/login-google.ts`) | Semua hak Admin di semua grup + membuat/mengganti nama/mereset PIN/menghapus grup (`api/create-group.ts`), kelola daftar email whitelist Super Admin, kelola kredensial admin grup, dan membaca **Audit Log** global/grup. |

---

## 3. Kebutuhan Fungsional (Fitur Produk)

### 3.1 Portal Onboarding & Multi-Grup Terisolasi
- **Portal Publik (`onboarding.html`, `src/pages/onboarding.js`, `src/ui/svelte-onboarding.js`):** Landing showcase interaktif (simulasi matriks & struk), pemilih daftar grup dengan pencarian instan (`OnboardingGroupList.svelte`), dan masukan PIN 4 digit.
- **Pemilih & Admin Grup (`GroupPickerList.svelte`, `GroupAdminList.svelte`, `SuperAdminList.svelte`):** Switching grup memicu `finkas:group-changed`, membersihkan state memori & seluruh pulau Svelte, menutup modal scoped, lalu menjalankan **View Transition API** terarah (`css/modules/group-transition.css`).
- **Batasan Keamanan Switch:** Perpindahan antar grup menjaga isolasi token sesi per grup dan antrean offline per `groupId`.

### 3.2 Dashboard Ringkas & Analisis Statistik
- **Group Overview & Bento KPI (`GroupOverview.svelte`, `BentoDashboard.svelte`):** Menampilkan nama grup, saldo kas total, total pemasukan, total pengeluaran, persentase kepatuhan iuran jatuh tempo, pengeluaran terbesar, serta scrub sparkline saldo bergulir 12 bulan.
- **Statistik Arus Kas (`WorkspaceStats.svelte`, `stats-model.ts`):** Ringkasan perbandingan arus masuk/keluar per bulan dalam tahun berjalan dengan pemilihan bulan interaktif.

### 3.3 Matriks Iuran, Spotlight & Self-Pay
- **Matriks Iuran 12 Bulan (`DuesMatrix.svelte`, `DuesMobileCards.svelte`):** Status per anggota tiap bulan dalam satu tahun: `Lunas`, `Sebagian` (cicilan parsial), `Belum` (tunggakan), `Nanti` (bulan mendatang), dan `Libur` (sebelum tanggal gabung anggota, sebelum `Kas Start` grup, atau bulan dalam `skippedMonths`).
- **Filter, Pagination & Mode Kolektif:** Pencarian anggota, filter status (`all`/`paid`/`partial`/`unpaid`), pemilihan tahun rekap (`YearGlider.svelte`), pagination sinkron desktop/mobile, serta bulk dues selection.
- **Member Spotlight (`MemberSpotlight.svelte`):** Anggota menyematkan namanya (disimpan per grup), melihat ringkasan kepatuhan & daftar tunggakan 12 bulan, membuka struk bulan lunas, atau membuka panduan **Self-Pay** (`SelfPayMonths.svelte`) dengan pesan WhatsApp otomatis + data rekening bendahara.
- **Kustomisasi Tampilan (`StampStylePreview.svelte`):** Pilihan stempel indikator (`seal`, `shield`, `leaf`, dll.), format nominal penuh/ringkas, tema terang/gelap, dan mode privasi.

### 3.4 Pencatatan Transaksi, Edit & Lampiran Bukti
- **Wizard Transaksi 3-Langkah (`src/ui/transaction-form.js`, `IuranMemberChecklist.svelte`, `IuranReviewChips.svelte`):**
  - *Tab Iuran Massal:* pilih periode/nominal/kategori, centang banyak anggota sekaligus (anggota `Lunas` & `Tidak ditagih` otomatis terkunci, anggota `Sebagian` tetap dapat dicicil), filter daftar tanpa menghapus centang berjalan, lalu tinjau ringkasan akhir.
  - *Tab Operasional:* pencatatan pemasukan/pengeluaran non-iuran dengan opsi kaitkan anggota dan tanggal kalender.
- **QuickPay Sheet (`QuickPayPresets.svelte`, `src/handlers/quickpay.js`):** Pembayaran cepat satu anggota + satu bulan langsung dari sel matriks/profil dengan chip nominal cepat (*Lunasi* / *Lunasi Sisa* dan *50%*).
- **Edit Transaksi & Saldo Delta (`updateEditDelta`):** Mengubah tipe arus, nominal, anggota, kategori, periode, atau tanggal dengan pratinjau selisih saldo sebelum disimpan dan deteksi konflik iuran atomik (`excludeId`).
- **Bukti Lampiran (`api/_attachments.ts`, `src/handlers/attachments.js`):** Unggah, baca, unduh Blob asli, dan hapus bukti JPEG/PNG/WebP/PDF tervalidasi tanda tangan file maks **512 KiB**.

### 3.5 Laporan Kas Bulanan, Riwayat, Ekspor & Struk
- **Laporan Kas Bulanan WIB (`api/` + `src/core/cash-report.js`, `CashReportAlert.svelte`, `CashReportRows.svelte`):** Menghitung *Saldo Awal*, *Pemasukan*, *Pengeluaran*, dan *Saldo Akhir* murni berdasarkan tanggal kalender `Asia/Jakarta` (mematuhi 7 invarian akuntansi). Jika ditemukan baris invalid/korup, tampilkan banner peringatan (`CashReportAlert`) dan blokir ekspor PDF/CSV demi integritas pembukuan.
- **Riwayat & Struk (`HistoryLedger.svelte`, `ReceiptBody.svelte`):** Filter histori masuk/keluar, pencarian teks, pratinjau struk resmi (`TERVERIFIKASI · KAS SAH` / `MENUNGGU SINKRON` / `TERCATAT · ARSIP KAS`), unduh gambar struk, salin rekap/pengingat tagihan WhatsApp, cetak laporan tahunan, dan ekspor CSV terlindung dari *formula injection*.

### 3.6 Master Data, Audit Log, Snapshot & Offline Engine
- **Master Data (`MasterAnggotaRows.svelte`, `MasterKategoriRows.svelte`, `SkippedMonthsList.svelte`):** CRUD anggota (nama, WhatsApp, status Aktif/Nonaktif), kategori Masuk/Keluar, aturan **Kas Start**, bulan libur, serta rekening kas grup.
- **Audit Log (`AuditLogRows.svelte`):** Riwayat terfilter kategori (*Transaksi*, *Data Master*, *Keamanan & Akses*, *Grup & Backup*) khusus Super Admin.
- **Snapshot JSON v2 (`api/_write-snapshot.ts`):** Ekspor cadangan penuh terstruktur dan restore terkontrol (validasi sebelum hapus/tulis).
- **Antrean Offline (`src/core/offline-store.js`, `OfflineQueueList.svelte`):** Mutasi offline disimpan di IndexedDB (`finkas-offline-db`) beserta `groupId` dan `operationId` idempoten agar replay ulang tidak menggandakan baris transaksi di server.

---

## 4. Kebutuhan Non-Fungsional & Keamanan

| Aspek | Ketentuan Sistem |
|---|---|
| **Isolasi Database** | `firestore.rules` menolak 100% akses langsung klien (`allow read, write: if false`). Semua akses via API server dengan Service Account (`api/_sa.ts`). |
| **Autentikasi & Anti-Bruteforce** | Hash kata sandi/PIN dengan `scrypt` (`crypto.randomInt` untuk generator kredensial), token sesi bertanda tangan HMAC dengan TTL & pencabutan (`revokedAfter`), serta rate limiter Firestore per grup & per IP (`_ratelimit`). |
| **Integritas & Idempotensi Mutasi** | Setiap penulisan mutasi menyertakan `operationId` unik & fingerprinting payload (`api/_transaction-idempotency.ts`) dalam batch atomik `fsCommit` + `fsCreateIfAbsent` untuk mencegah duplikat iuran. |
| **Keamanan XSS & Header HTTP** | Rendering HTML bebas string interpolasi berisiko (`0` `.innerHTML`/`.outerHTML` di `handlers/`, `render/`, `pages/onboarding.js`, `transaction-form.js`); `vercel.json` menerapkan CSP ketat, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, dan `Referrer-Policy`. |
| **Arsitektur & Pemeliharaan** | Batas ketat `< 750` baris per file sumber authored, full TypeScript static checking (`checkJs: true`, `strictNullChecks: true`), sinkronisasi precache Service Worker 100% terverifikasi (`scripts/verify.mjs`). |

---

## 5. Arsitektur Teknis & Gerbang Kualitas
- **Frontend UI Islands:** 28 komponen **Svelte 5** terorganisasi di `src/svelte/` (`dashboard/`, `modals/`, `forms/`, `onboarding/`, `stores/`, `types/`), dibundel dengan **Vite 8** (`vite.config.ts`) ke [src/ui/svelte-dashboard.js](src/ui/svelte-dashboard.js) dan [src/ui/svelte-onboarding.js](src/ui/svelte-onboarding.js).
- **Styling & Markup:** **Tailwind CSS v4** (`style.css`) + CSS modular (`css/`) + template HTML terpecah (`html/index.template.html` & `html/modals/*.html` dirakit oleh `scripts/build-html.cjs`).
- **Offline PWA:** Service Worker (`sw.js`) mem-precache 70 modul klien & mem-bypass `/api/`.
- **Quality Gates (`package.json`):**
  - `npm run check`: build produksi (2 bundle Svelte + `index.html` + `style.css`), cek sintaks, precache SW, dan TypeScript (`tsc --noEmit` lewat `scripts/verify.mjs`), lalu menjalankan seluruh **410 pengujian otomatis** (`node --test` + JSDOM).
  - `npm run release`: menaikkan nomor versi cache/aset (`scripts/bump.mjs`) lalu menjalankan `npm run check`.
