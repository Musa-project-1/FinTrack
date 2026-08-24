# FinTrack (DemoKas)

Aplikasi kas anggota berbasis web (PWA) untuk mencatat iuran, kas operasional, dan rekap pembayaran — tanpa framework, backend Google Sheets via Apps Script.

## Fitur

- **Dashboard** — total masuk, keluar, saldo, dan grafik arus kas bulanan (Chart.js)
- **Iuran Anggota** — catat pembayaran massal banyak anggota sekaligus, cepat via quick-pay di rekap
- **Kas Operasional** — transaksi masuk/keluar non-anggota dengan kategori
- **Riwayat Transaksi** — pencarian, filter bulan/tahun (berdasarkan periode iuran), filter kategori
- **Rekap Matriks** — grid 12 bulan per anggota, tandai bulan libur (skipped months)
- **Profil Anggota** — riwayat, total kontribusi, statistik pembayaran
- **Ekspor & Cetak** — CSV/Excel, struk transaksi, laporan tahunan, pesan pengingat WhatsApp
- **Offline Mode (PWA)** — bisa dipasang, transaksi offline disimpan di IndexedDB dan disinkronkan otomatis
- **Admin** — login password (hash SHA-256, sesi server 24 jam), proteksi duplikat iuran per anggota-bulan-tahun

## Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | HTML, CSS, JavaScript (ES Modules, tanpa framework) |
| PWA | Service Worker, Web App Manifest, IndexedDB |
| Backend | Google Apps Script (`doGet`/`doPost`) |
| Database | Google Sheets (sheet: `Anggota`, `Kategori`, `Transaksi`, `Settings`) |

## Struktur

```
├── index.html          # UI utama
├── style.css           # Semua style (desktop + mobile)
├── sw.js               # Service worker (cache + sync offline)
├── manifest.json       # Manifest PWA
├── icons/              # Ikon aplikasi (SVG)
└── js/
    ├── config.js       # GAS_URL & konstanta
    ├── utils.js        # Format rupiah, toast, hash, dll
    ├── state.js        # State terpusat + cache localStorage
    ├── api.js          # Komunikasi dengan backend GAS
    ├── offline.js      # Antrean offline (IndexedDB)
    ├── theme.js        # Dark/light mode
    ├── modal.js        # Modal, tab, checkbox iuran
    ├── render.js       # Render tabel, kartu, grafik
    └── app.js          # Event delegation & inisialisasi
```

Backend Apps Script (`backend_api.gs`, `Kode.gs`) tidak disertakan di repo — dikelola langsung di editor Apps Script.

## Setup

### 1. Backend (Google Apps Script)

1. Buat Google Spreadsheet dengan sheet `Anggota`, `Kategori`, `Transaksi` (header sesuai field: `ID_Transaksi`, `Timestamp`, `Tipe_Arus`, `ID_Kategori`, `ID_Anggota`, `Bulan_Iuran`, `Tahun_Iuran`, `Nominal`, `Keterangan`).
2. Buat project Apps Script, tempel `backend_api.gs`, sesuaikan `SPREADSHEET_ID`.
3. Jalankan sekali di editor: `setupAdminPassword('password-anda')`.
4. **Deploy → New deployment → Web app**, akses: *Anyone*.
5. Salin URL `/exec` yang dihasilkan.

### 2. Frontend

1. Ganti `GAS_URL` di `js/config.js` dan `sw.js` dengan URL dari langkah di atas.
2. Host file statis (GitHub Pages, Netlify, atau hosting apa pun).
3. Selesai — buka di browser, login admin lewat menu.

## Catatan

- Setiap deploy frontend sebaiknya menaikkan `CACHE_NAME` di `sw.js` agar pengguna mendapat file terbaru (service worker cache-first).
- Backend menolak iuran duplikat: satu anggota hanya bisa tercatat sekali per bulan + tahun iuran.
