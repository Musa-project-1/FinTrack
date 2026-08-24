# DemoKas Professional

Aplikasi PWA (Progressive Web App) untuk manajemen kas dan iuran anggota, dengan backend Google Apps Script + Google Sheets sebagai database.

## 1. Ringkasan

| Item | Keterangan |
|---|---|
| Nama Aplikasi | DemoKas Professional |
| Jenis | Progressive Web App (PWA), offline-first |
| Frontend | HTML + CSS + Vanilla JS (tanpa framework) |
| Backend | Google Apps Script (Web App) |
| Database | Google Sheets |
| Autentikasi | Password admin tunggal (hash SHA-256), session 24 jam |
| Grafik | Chart.js |
| Ikon | Phosphor Icons |

## 2. Struktur File

```
├── index.html        # Struktur halaman & seluruh modal UI
├── style.css          # Styling (tema terang/gelap, responsive)
├── script.js          # Seluruh logika aplikasi (state, render, API call)
├── manifest.json       # Konfigurasi PWA (nama, ikon, warna tema)
├── sw.js               # Service Worker (cache offline + antrian sinkronisasi)
├── Kode.gs              # Script setup awal struktur Google Sheet
└── backend_api.gs      # Web App API (doGet/doPost) untuk CRUD data
```

## 3. Alur Arsitektur

```
Browser (PWA)
   │
   ├── index.html + script.js  →  render UI, kelola state lokal
   │
   ├── fetch() ──────────────►  Google Apps Script Web App (backend_api.gs)
   │                                   │
   │                                   ▼
   │                          Google Sheets (SPREADSHEET_ID)
   │                          Sheet: Anggota, Kategori, Transaksi, Settings
   │
   └── Service Worker (sw.js)
          ├── Cache-first untuk aset lokal (HTML/CSS/JS/manifest)
          └── IndexedDB "demokas-offline-db" → antrian transaksi saat offline,
              disinkron otomatis via Background Sync / pesan SYNC_OFFLINE
```

## 4. Fitur Utama

### Dashboard
- Ringkasan Kas Masuk, Kas Keluar, dan Saldo saat ini.
- Grafik arus kas (`renderChart`) dan grafik pengeluaran per kategori (`renderExpenseChart`) menggunakan Chart.js.
- Matriks rekap iuran anggota per bulan (`renderTableRekap`), dengan pemilihan tahun (`gantiTahunRekap`, `populateTahunRekap`).
- Pengaturan "Bulan Libur" — bulan yang dikecualikan dari kewajiban iuran (`openSkippedMonthsModal`, `addSkippedMonth`, `removeSkippedMonth`).

### Transaksi
- Modal transaksi dengan 2 tab: **Iuran Anggota** dan **Kas Operasional** (`switchTab`).
- Catat iuran per anggota (`submitIuran`) atau iuran massal untuk banyak anggota sekaligus (`pilihSemuaIuran`, checkbox multi-anggota).
- Catat transaksi operasional keluar/masuk (`submitOperasional`).
- Quick pay per anggota langsung dari kartu (`quickPay`, `quickPayFromCard`) dan pilihan nominal cepat (`pilihNominalCepat`).
- Edit transaksi (`bukaModalEdit`, `submitEditTransaksi`) dan hapus transaksi dengan konfirmasi (`konfirmasiHapus`, `eksekusiHapus`).
- Cetak struk transaksi (`cetakStruk`) dan cetak laporan tahunan (`cetakLaporanTahunan`).
- Ekspor data ke CSV (`exportToCSV`).

### Riwayat & Filter
- Daftar riwayat transaksi dengan filter kategori, tipe arus, dan tahun (`filterRiwayat`, `filterKategori`, `populateFilterTahunHistory`).
- Pagination "muat lebih banyak" (`loadMoreHistory`).

### Manajemen Anggota & Kategori
- Tambah anggota baru (`tambahAnggota` di backend).
- Tambah kategori transaksi baru, tipe Masuk/Keluar (`tambahKategori` di backend).
- Profil anggota menampilkan riwayat iuran per anggota (`bukaProfilAnggota`, `progressPercent`).
- Pesan pengingat kelompok untuk anggota yang belum bayar (`createGroupReminderMessage`) — biasanya dikirim manual via WhatsApp.

### Login Admin
- Semua aksi yang mengubah data (tambah/edit/hapus transaksi, tambah anggota/kategori, atur bulan libur) memerlukan status admin aktif.
- Login (`submitLoginAdmin` → `loginAdmin` di backend) memverifikasi password polos atau hash SHA-256-nya.
- Sesi admin disimpan di Script Properties backend dan berlaku 24 jam (`ADMIN_SESSION_TIMEOUT_MS`).
- Logout (`logoutAdminAction` → `logoutAdmin`).

### Mode Offline
- Service Worker meng-cache aset lokal (`index.html`, `style.css`, `script.js`, `manifest.json`) dengan strategi cache-first.
- Saat offline, transaksi disimpan ke IndexedDB (`addOfflineTransaction`, `queueOfflinePayload`).
- Saat online kembali, antrian otomatis dikirim ke backend (`syncOfflineTransactions` di frontend, `sendQueuedOfflineTransactions` di service worker, dipicu Background Sync tag `demokas-sync-offline` atau pesan `SYNC_OFFLINE`).
- Indikator status koneksi di header (`setConnectionStatus`, `isOnline`) dan badge jumlah antrian offline (`updateOfflineQueueBadge`, `openOfflineQueueModal`).

### Tampilan
- Tema terang/gelap yang tersimpan di local state (`toggleTheme`, `applyTheme`).
- Layout responsif: menu mobile (`toggleMobileMenu`), dropdown header (`toggleHeaderDropdown`), kartu iuran versi mobile (`renderIuranMobileCards`, `toggleIuranCard`).
- Notifikasi toast (`showToast`).

## 5. Struktur Data (Google Sheets)

Dibuat otomatis oleh `Kode.gs` → fungsi `setupDatabase()`.

### Sheet `Anggota`
| Kolom | Keterangan |
|---|---|
| ID_Anggota | contoh: `ANG-001` |
| Nama_Anggota | Nama lengkap |
| Nomor_WA | Nomor WhatsApp |
| Status_Aktif | `Aktif` / non-aktif |

### Sheet `Kategori`
| Kolom | Keterangan |
|---|---|
| ID_Kategori | contoh: `KAT-M01` |
| Tipe | `Masuk` atau `Keluar` |
| Nama_Kategori | Nama kategori transaksi |

Kategori default yang dibuat otomatis:
- Masuk: Iuran Bulanan Wajib, Donasi/Sumbangan
- Keluar: Konsumsi Rapat, Operasional/Fotokopi

### Sheet `Transaksi`
| Kolom | Keterangan |
|---|---|
| ID_Transaksi | contoh: `TRX-XXXXXXXX` (UUID) |
| Timestamp | Waktu transaksi dicatat |
| Tipe_Arus | `Masuk` atau `Keluar` |
| ID_Kategori | Relasi ke sheet Kategori |
| ID_Anggota | Relasi ke sheet Anggota (`-` jika bukan iuran) |
| Bulan_Iuran | Bulan iuran terkait (`-` jika bukan iuran) |
| Tahun_Iuran | Tahun iuran terkait (`-` jika bukan iuran) |
| Nominal | Jumlah uang |
| Keterangan | Catatan tambahan |

### Sheet `Settings`
Key-value store, digunakan untuk menyimpan `SKIPPED_MONTHS` (daftar bulan yang dikecualikan dari kewajiban iuran, format JSON array, mis. `["01-2026"]`) dan session login admin (`ADMIN_LAST_LOGIN`).

## 6. API Backend (`backend_api.gs`)

Base URL: Google Apps Script Web App deployment URL (`GAS_URL` di `script.js` dan `sw.js`).

### GET
| Action | Deskripsi |
|---|---|
| `getDataAwal` | Mengambil seluruh data awal: anggota, kategori, transaksi, dan settings (bulan libur) |

### POST
Payload dikirim sebagai form-urlencoded dengan field `data` berisi JSON string `{ action, ... }`.

| Action | Perlu Admin? | Deskripsi |
|---|---|---|
| `loginAdmin` / `cekLoginAdmin` / `verifyAdminPassword` | Tidak | Verifikasi password admin & mulai sesi |
| `checkAdminSession` | Tidak | Cek status sesi admin aktif |
| `logoutAdmin` | Tidak | Akhiri sesi admin |
| `tambahTransaksi` | Ya | Tambah 1 transaksi |
| `tambahTransaksiMassal` | Ya | Tambah transaksi iuran untuk banyak anggota sekaligus |
| `editTransaksi` | Ya | Edit transaksi berdasarkan `idTransaksi` |
| `hapusTransaksi` | Ya | Hapus transaksi berdasarkan `idTransaksi` |
| `tambahAnggota` | Ya | Tambah anggota baru |
| `tambahKategori` | Ya | Tambah kategori baru |
| `addSkippedMonth` | Ya | Tambah bulan libur iuran |
| `removeSkippedMonth` | Ya | Hapus bulan libur iuran |

Setiap respons berbentuk JSON: `{ status: boolean, message: string, data: object|null }`.

Aksi yang mengubah data (`mutatingActions`) diproteksi `requireAdminAuth()`, yang menerima **baik** sesi admin aktif di server **maupun** hash password admin yang dikirim langsung dari klien (`adminPassword`).

## 7. Keamanan

- Password admin di-hardcode di `backend_api.gs` (`ADMIN_PASSWORD`) dan dibandingkan dengan hash SHA-256.
- `LockService` digunakan pada `doPost` untuk mencegah race condition saat penulisan sheet bersamaan.
- Sesi admin server-side disimpan di `PropertiesService` dengan batas waktu 24 jam.

> **Catatan risiko:** Password admin tersimpan sebagai teks polos di source `.gs` dan URL Web App (`GAS_URL`) bersifat publik di kode frontend. Siapa pun yang memiliki akses ke source dapat melihat/menebak kredensial ini. Untuk penggunaan produksi, sebaiknya password dipindah ke `PropertiesService` (bukan hardcode di kode) dan akses spreadsheet dibatasi lebih ketat.

## 8. Deployment Singkat

1. Buat Google Spreadsheet baru, salin ID-nya ke `SPREADSHEET_ID` pada `backend_api.gs`.
2. Buka Apps Script pada spreadsheet tersebut, tempel isi `Kode.gs` dan `backend_api.gs`.
3. Jalankan fungsi `setupDatabase()` sekali untuk membuat struktur sheet otomatis.
4. Deploy `backend_api.gs` sebagai **Web App** (akses: "Siapa saja"), salin URL deployment.
5. Tempel URL tersebut ke `GAS_URL` pada `script.js` dan `sw.js`.
6. Ganti `ADMIN_PASSWORD` di `backend_api.gs` sesuai kebutuhan.
7. Hosting frontend (`index.html`, `style.css`, `script.js`, `manifest.json`, `sw.js`) di layanan statis apa pun (GitHub Pages, Netlify, dsb.) — pastikan file-file tersebut berada di root yang sama karena path relatif digunakan di `sw.js` dan `manifest.json`.
