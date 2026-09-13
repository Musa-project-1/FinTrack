# Finkas

Aplikasi manajemen kas anggota dan kas operasional berbasis web (**Progressive Web App / PWA**), didukung backend **Google Cloud Firestore**.

---

## ✨ Fitur Utama

- **Dashboard Finansial** — Visualisasi saldo kas, total pemasukan, total pengeluaran, serta tren grafik bulanan interaktif (Chart.js).
- **Rekap Matriks Iuran 12 Bulan** — Grid 12 bulan per anggota (desktop) dan card view adaptif dengan progress bar (mobile).
- **Pencatatan Cepat (Quick Pay)** — Bendahara mencatat pembayaran anggota dalam satu klik via modal bottom sheet.
- **Kas Operasional** — Mencatat transaksi masuk/keluar non-iuran dengan kategori kustom.
- **Kelola Master Data (CRUD Khusus Admin)** — Menambah, menonaktifkan, atau menghapus anggota dan kategori kas.
- **Bulan Libur (Skipped Months)** — Mengatur bulan libur agar tidak dihitung sebagai tunggakan.
- **Riwayat & Filter Lengkap** — Pencarian instan, filter bulan/tahun periode iuran, serta preset rentang waktu.
- **Profil & Statistik Anggota** — Riwayat kontribusi dan persentase pembayaran per individu.
- **Ekspor & Pelaporan** — Ekspor CSV/Excel, cetak struk, cetak rekap tahunan, dan generator pesan pengingat tagihan WhatsApp.
- **Offline-First (PWA)** — Dapat diinstall di Android/iOS/Desktop. Saat internet mati, transaksi tetap tersimpan di IndexedDB dan disinkronkan otomatis saat kembali online.
- **Multi-Grup** — Setiap kelompok punya ruang datanya sendiri, dilindungi PIN 4 digit.

---

## 🔐 Model Keamanan

Browser **tidak pernah** mengakses Firestore secara langsung. Firestore rules menolak
seluruh akses dari klien:

```
match /{document=**} { allow read, write: if false; }
```

Semua baca/tulis melewati serverless function di `api/`, yang memakai service account
(Admin SDK). Ringkasnya:

| Aspek | Implementasi |
|---|---|
| Sesi | Token bertanda tangan HMAC dengan masa berlaku (`api/_session.js`), bukan kredensial statis |
| Password | scrypt (memory-hard) dengan salt acak per kredensial |
| Password master | scrypt, dan hash-nya hanya ada di dokumen server-only `settings/app_config` |
| PIN grup | Hash hanya tersimpan di `groups/{gid}/private/config` yang tak bisa dibaca klien |
| Pembatasan percobaan | Dihitung di sisi **server** (per grup dan per IP) lewat koleksi `_ratelimit` |
| Otorisasi | Per-peran: `member` (baca grupnya), `group_admin` (baca dan tulis grupnya), `superadmin` (semua grup) |
| Penyimpanan token di klien | `localStorage` dengan kedaluwarsa waktu nyata (TTL bertanda tangan HMAC) |
| Header | CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |

Data lama tetap kompatibel: hash format lama dibaca sekali, lalu otomatis ditingkatkan
ke scrypt saat login/PIN berhasil pertama kali.

---

## 🛠️ Teknologi

| Layer | Teknologi |
|---|---|
| **Frontend** | HTML5, CSS3 (design tokens), Vanilla JavaScript (ES Modules) |
| **PWA & Mobile** | Service Worker, Web App Manifest, ikon PNG dan SVG maskable, View Transitions API |
| **Backend** | Vercel Serverless Functions (`api/`), Google Cloud Firestore REST via service account |
| **Offline Engine** | IndexedDB (`finkas-offline-db`), Background Synchronization |
| **Grafik & Ikon** | Chart.js, Phosphor Icons |

---

## 📁 Struktur Direktori

```
├── api/                      # Vercel serverless functions (satu-satunya jalur ke Firestore)
│   ├── _sa.js                # Service account, REST Firestore, codec nilai, constant-time compare
│   ├── _session.js           # Token sesi bertanda tangan, scrypt, pembatasan percobaan
│   ├── _store.js             # Tata letak koleksi, path, audit log, hapus grup
│   ├── _group-read.js        # Baca data satu grup
│   ├── _group-write.js       # Semua mutasi data grup (validasi di sisi server)
│   ├── data.js               # Gateway data yang terautentikasi
│   ├── login.js              # Login admin grup dan admin master
│   ├── login-google.js       # Login Google Super Admin dan kelola whitelist
│   ├── create-group.js       # Kelola grup (khusus Super Admin)
│   └── verify-group-pin.js   # Verifikasi PIN grup
├── js/
│   ├── core/                 # config, state, api-client, api, api-auth, offline, utils, analytics
│   ├── handlers/             # auth, groups, transactions, master, navigation, export, backup, offlineQueue
│   ├── render/               # dashboard, rekap, transactions, profile
│   ├── ui/                   # modal, cdrop, mpick, theme
│   └── app.js                # Orkestrasi aplikasi dan event delegation
├── html/                     # Fragmen HTML modal + template
├── css/                      # Design tokens dan modul CSS
├── scripts/                  # build-html.cjs, verify.mjs, utilitas migrasi
├── tests/                    # Suite node:test
├── firestore.rules           # Menolak seluruh akses klien
└── sw.js                     # Service Worker (precache + sinkronisasi offline)
```

---

## 🚀 Setup & Deployment

### 1. Konfigurasi Firebase

1. Buat project di [Firebase Console](https://console.firebase.google.com/) dan aktifkan
   **Cloud Firestore** (mode Native, misalnya `asia-southeast2`).
2. Buat **Service Account** (Project Settings → Service Accounts → Generate new private key).
3. Simpan kredensialnya sebagai environment variable `FIREBASE_SERVICE_ACCOUNT` (JSON mentah
   atau base64 dari JSON tersebut). Untuk pengembangan lokal, letakkan sebagai
   `.service-account.local.json` di root — file ini sudah masuk `.gitignore`.

### 2. Environment Variables

| Variable | Wajib | Keterangan |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Ya | Kredensial service account (JSON atau base64). |
| `FIREBASE_PROJECT_ID` | Tidak | Default `finkas-kas`. |
| `FINKAS_SESSION_SECRET` | Disarankan | Minimal 32 karakter, untuk menandatangani sesi. Bila kosong, diturunkan dari private key service account. |

### 3. Deploy Rules dan Hosting

```bash
firebase deploy --only firestore:rules   # WAJIB, dan harus rilis bersama klien baru
```

> ⚠️ **Deploy rules ini bersama klien, bukan sebelum.** Rules menolak semua akses langsung
> dari browser. Klien versi lama masih membaca Firestore langsung dan akan langsung rusak
> bila rules di-deploy lebih dulu.

Hosting frontend bisa di **Vercel** (disarankan, karena `api/` adalah Vercel Functions),
Netlify, Firebase Hosting, atau hosting statis lain yang mendukung serverless.

---

## 🧑‍💻 Perintah Pengembangan

```bash
npm run verify     # Cek sintaks semua modul, daftar precache SW, dan kesegaran index.html
npm test           # Jalankan suite pengujian
npm run check      # verify + test
npm run build      # Susun index.html dari fragmen, lalu build CSS
npm run dev:css    # Watch CSS
```

`index.html` **dihasilkan** dari `html/index.template.html` dan `html/modals/*.html`.
Setelah mengubah fragmen HTML, jalankan `npm run build:html` — `npm run verify` akan
memberi tahu jika `index.html` sudah tertinggal.
