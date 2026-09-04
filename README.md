# Finkas

Aplikasi manajemen kas anggota dan kas operasional berbasis web (**Progressive Web App / PWA**) dengan arsitektur modern tanpa framework berat, didukung oleh backend **Google Cloud Firestore**.

---

## ✨ Fitur Utama

- **Dashboard Finansial** — Visualisasi saldo kas, total pemasukan, total pengeluaran, serta tren grafik bulanan interaktif (Chart.js) dengan format numerik monospaced (`tabular-nums`).
- **Rekap Matriks Iuran 12 Bulan** — Grid 12 bulan per anggota (desktop) dan card view adaptif dengan progress bar (mobile).
- **Pencatatan Cepat (Quick Pay)** — Bendahara dapat mencatat pembayaran anggota dalam 1 kali klik via modal bottom sheet.
- **Kas Operasional** — Mencatat transaksi masuk/keluar non-iuran dengan kategori kustom.
- **Kelola Master Data (CRUD Khusus Admin)** — Menambah, menonaktifkan, atau menghapus anggota dan kategori kas secara langsung dari modal admin.
- **Bulan Libur (Skipped Months)** — Mengatur bulan libur agar tidak dihitung sebagai tunggakan.
- **Riwayat & Filter Lengkap** — Pencarian instan berdasarkan nama/kategori, filter bulan & tahun periode iuran, serta preset rentang waktu.
- **Profil & Statistik Anggota** — Riwayat kontribusi dan persentase pembayaran per individu.
- **Ekspor & Pelaporan** — Ekspor data ke CSV/Excel, cetak struk transaksi formal, cetak rekap tahunan siap arsip, dan generator pesan pengingat tagihan WhatsApp otomatis.
- **Offline-First (PWA)** — Dapat diinstall di Android/iOS/Desktop. Saat internet mati, transaksi tetap tersimpan di IndexedDB dan disinkronkan otomatis saat kembali online.
- **Keamanan Admin** — Autentikasi dengan hash password SHA-256 tersimpan di Firestore, proteksi menu sensitif, dan pencegahan duplikasi data iuran.

---

## 🛠️ Teknologi

| Layer | Teknologi |
|---|---|
| **Frontend** | HTML5, CSS3 (Modern Tokens, Zero AI Slop), Vanilla JavaScript (ES Modules) |
| **PWA & Mobile** | Service Worker, Web App Manifest, High-Res PNG & Maskable SVG Icons, GPU View Transitions API |
| **Backend & Database** | Google Cloud Firestore (REST API murni tanpa SDK berat, Region: Jakarta `asia-southeast2`) |
| **Offline Engine** | IndexedDB (`finkas-offline-db`), Background Synchronization |
| **Grafik & Ikon** | Chart.js, Phosphor Icons Web, Custom Minimal Monogram Brand Vectors |

---

## 📁 Struktur Direktori

```
├── index.html          # Halaman utama aplikasi (UI & Bottom Nav Mobile)
├── style.css           # Design tokens, responsive CSS, View Transitions, dan tema dark/light
├── sw.js               # Service Worker (caching aset v25 & sinkronisasi offline Firestore)
├── manifest.json       # Konfigurasi PWA installable (PNG 192/512 + SVG maskable)
├── icons/              # Set ikon aplikasi (icon-512.png/svg, icon-192.png/svg, favicon.svg)
└── js/
    ├── config.js       # Konfigurasi Firebase Firestore & konstanta bisnis
    ├── utils.js        # Format rupiah, sanitasi escapeHtml, hash SHA-256, toast, dsb.
    ├── state.js        # Manajemen state terpusat & cache localStorage
    ├── api.js          # Integrasi langsung ke Google Cloud Firestore REST API
    ├── offline.js      # Antrean antarmuka offline (IndexedDB)
    ├── theme.js        # Logika tema Dark / Light mode (GPU hardware-accelerated crossfade)
    ├── modal.js        # Pengendali modal, tab, dan filter checkbox anggota
    ├── render.js       # Render reaktif (dashboard, matriks, kartu mobile, tabel riwayat)
    └── app.js          # Inisialisasi aplikasi & event delegation
```

---

## 🚀 Setup & Deployment

### 1. Konfigurasi Firebase
Aplikasi ini sudah terhubung ke Google Cloud Firestore project `finkas-kas`. Jika ingin menggunakan project sendiri:
1. Buat project baru di [Firebase Console](https://console.firebase.google.com/).
2. Aktifkan **Cloud Firestore Database** (Mode Native, pilih lokasi misal: `asia-southeast2`).
3. Daftarkan Web App dan salin konfigurasi ke `js/config.js` (`FIREBASE_CONFIG`).
4. Jalankan script inisialisasi dokumen `settings/app_config` dengan field `admin_password_hash` (default SHA-256 hash).

### 2. Hosting Frontend
Karena Finkas merupakan aplikasi web statis murni tanpa server build yang rumit, Anda bisa langsung menghosting folder ini ke:
- **GitHub Pages**
- **Netlify / Vercel**
- **Firebase Hosting**

Buka halaman web di browser, lalu login sebagai pengurus melalui menu dropdown untuk mulai mengelola kas.
