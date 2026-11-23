# Finkas

Aplikasi manajemen kas anggota dan kas operasional komunitas berbasis web (**Offline-First Progressive Web App / PWA**), dibangun dengan **Svelte 5 + TypeScript + Tailwind CSS v4 + Vite 8** di frontend dan **Vercel Serverless Functions + Google Cloud Firestore** di backend.

> Lihat [`PRD.md`](./PRD.md) untuk spesifikasi produk lengkap dan [`DESIGN.md`](./DESIGN.md) untuk token desain *Hybrid Kinetic*.

---

## ✨ Fitur Utama

- **Portal Onboarding & Multi-Grup Terisolasi** — Halaman showcase publik (`onboarding.html`), pemilih grup instan, transisi arah *View Transitions*, serta isolasi data dan sesi per grup via PIN 4 digit.
- **Dashboard & Bento KPI** — Ringkasan saldo total, pemasukan/pengeluaran, tingkat kepatuhan iuran, pengeluaran terbesar, serta *sparkline* saldo bergulir 12 bulan (`Asia/Jakarta`, WIB).
- **Matriks Iuran 12 Bulan** — Grid 12 bulan per anggota (desktop) dan card adaptif (mobile) dengan dukungan cicilan (`Sebagian`), bulan libur (`Libur`), `Kas Start` grup, pagination, serta seleksi massal.
- **Member Spotlight & Self-Pay** — Sematkan nama anggota untuk pantauan pribadi 12 bulan, buka struk bulan lunas, atau panduan bayar mandiri dengan pratinjau pesan WhatsApp bendahara.
- **Wizard Transaksi, QuickPay & Bukti Lampiran** — Input iuran massal 3 langkah, pencatatan operasional, *QuickPay* satu ketuk, pratinjau selisih saldo saat edit, dan lampiran bukti tervalidasi (JPEG/PNG/WebP/PDF `<= 512 KiB`).
- **Laporan Kas Bulanan (WIB) & Ekspor** — Kalkulasi Saldo Awal → Masuk/Keluar → Saldo Akhir WIB dengan audit integritas 7 invarian (ekspor PDF/CSV otomatis diblokir jika ada baris invalid), sanitasi *formula injection* CSV, cetak rekap tahunan, dan teks pengingat WhatsApp.
- **Master Data, Audit Log & Snapshot JSON v2** — CRUD anggota/kategori/bulan libur/rekening kas, log aktivitas khusus Super Admin, serta backup/restore JSON tervalidasi.
- **Offline-First & Idempotensi** — Transaksi offline disimpan di IndexedDB (`finkas-offline-db`) per `groupId` dan dilengkapi `operationId` idempoten agar sinkronisasi ulang bebas duplikasi.

---

## 🔐 Model Keamanan

Browser **tidak pernah** mengakses Firestore secara langsung; seluruh akses ditolak oleh `firestore.rules`:

```
match /{document=**} { allow read, write: if false; }
```

Seluruh operasi membaca dan menulis melewati Vercel Functions di `api/`:

| Aspek | Implementasi |
|---|---|
| Sesi & Token | Token HMAC bertanda tangan dengan TTL dan pencabutan sisi server (`revokedAfter`) lewat `api/_session.js` |
| Kredensial | Password pengurus, password master, dan PIN grup di-hash dengan `scrypt` (`groups/{gid}/private/config`, `settings/app_config`) |
| Google Super Admin | Verifikasi token Google OAuth terhadap whitelist email server-only (`api/login-google.js`) |
| Pembatasan Percobaan | Rate limiter sisi server di Firestore per grup & per IP (`_ratelimit`) |
| Idempotensi & Integritas | Entropi ID `>= 64-bit`, `fsCreateIfAbsent` untuk cegah duplikat iuran, serta receipt atomik per `operationId` (`api/_transaction-idempotency.js`) |
| Proteksi Klien & HTTP | Sanitasi formula CSV (`=`, `+`, `-`, `@`, `\t`, `\r`), zero `.innerHTML` di handler/renderer/form, plus CSP, HSTS, dan `X-Frame-Options: DENY` di `vercel.json` |

---

## 🛠️ Teknologi

| Layer | Teknologi |
|---|---|
| **UI Islands & Type Safety** | Svelte 5 (`^5.59.1`), TypeScript 7 (`checkJs: true`, `strictNullChecks: true`), Vite 8 (`^8.3.8`) |
| **Styling & Markup** | Tailwind CSS v4 (`^4.0.0`), CSS Design Tokens modular, fragmen HTML rakitan (`scripts/build-html.cjs`), Phosphor Icons |
| **PWA & Offline** | Service Worker (`sw.js`), Web App Manifest (`manifest.json`), IndexedDB (`finkas-offline-db`), View Transitions API |
| **Backend & Database** | Vercel Serverless Functions (Node.js ESM di `api/`), Google Cloud Firestore REST via Service Account |
| **Testing & Verifikasi** | `node --test` (`410` uji kontrak DOM, akuntansi WIB, idempotensi, keamanan, & JSDOM Svelte) + `scripts/verify.mjs` |

---

## 📁 Struktur Direktori

```
├── api/                          # Vercel serverless functions (gateway Firestore)
│   ├── data.js                   # Gateway data terautentikasi (baca/tulis per grup)
│   ├── login.js, login-google.js # Autentikasi pengurus, master admin & Google Super Admin
│   ├── create-group.js           # Manajemen grup (khusus Super Admin)
│   ├── verify-group-pin.js       # Verifikasi PIN 4 digit per grup
│   └── _*.js                     # Modul internal: sa, session, store, read, write-*, idempotency, attachments
├── src/
│   ├── core/                     # Logika murni & sinkronisasi: config, state, dues, cash-report, mutation, offline*, utils
│   ├── handlers/                 # Kontroler fitur & form: auth, groups, group-picker, master, transactions*, quickpay, self-pay, export, backup, cash-report
│   ├── pages/                    # Skrip halaman mandiri: onboarding*, journey, privacy
│   ├── render/                   # Penghubung rendering UI & modal: dashboard, profile, receipt, rekap, transactions
│   ├── svelte/                   # Sumber Svelte 5 & store TypeScript (28 .svelte + 28 .ts/.d.ts)
│   │   ├── dashboard/            # 8 komponen utama workspace (Overview, Bento, Spotlight, Matriks, Riwayat, Statistik)
│   │   ├── modals/               # 14 komponen isi modal (GroupPicker/Admin, Queue, Profil, Struk, SelfPay, Master, Audit, Laporan Kas)
│   │   ├── forms/                # 5 komponen kontrol interaktif (Checklist Iuran, Review Chips, QuickPay, YearGlider, StampPreview)
│   │   ├── onboarding/           # Pulau Svelte mandiri untuk portal onboarding
│   │   ├── stores/               # Store runes Svelte 5 (*.svelte.ts) & view-model murni (*-model.ts)
│   │   └── types/                # Kontrak tipe modul .d.ts untuk alias Rollup/Vite
│   ├── ui/                       # Utilitas UI (cdrop, dpick, mpick, keel, gestures, i18n, modal, theme) + hasil bundle + facade .d.ts
│   ├── types/                    # Tipe domain global (finkas.d.ts)
│   └── app.js                    # Entry aplikasi utama & delegasi aksi DOM
├── html/                         # Template utama & 13 fragmen modal (dirakit -> index.html)
├── css/                          # CSS modular & entry Tailwind (dirakit -> style.css)
├── scripts/                      # build-html.cjs, authored-sourcemaps.mjs, bump.mjs, verify.mjs
├── tests/                        # Suite node:test (410 uji) + fixtures + helpers
├── PRD.md                        # Product Requirements Document resmi Finkas
├── DESIGN.md                     # Spesifikasi sistem desain & palet Hybrid Kinetic
├── firestore.rules               # Menolak seluruh akses langsung klien ke Firestore
└── sw.js                         # Service Worker (precache & lifecycle offline)
```

---

## 🚀 Setup & Deployment

### 1. Environment Variables
- `FIREBASE_SERVICE_ACCOUNT` *(wajib)* — JSON kredensial Service Account Firebase (mentah atau base64). Untuk lokal, simpan di `.service-account.local.json` (masuk `.gitignore`).
- `FIREBASE_PROJECT_ID` *(opsional)* — Default `finkas-kas`.
- `FINKAS_SESSION_SECRET` *(disarankan)* — Secret HMAC min. 32 karakter (bila kosong, diturunkan dari private key).

### 2. Deploy Firestore Rules & Vercel
```bash
firebase deploy --only firestore:rules   # Rilis bersama klien terbaru agar klien lama tidak ditolak sepihak
```
Hosting menggunakan **Vercel** dengan build command `npm run build` di [vercel.json](./vercel.json).

---

## 🧑‍💻 Perintah Pengembangan

```bash
npm run check                  # 1 perintah lengkap: build semua aset + verify (sintaks, precache SW, TypeScript) + 410 uji
npm run release                # Naikkan versi cache/aset & sw.js (bump.mjs), lalu jalankan `npm run check`
npm run build                  # Rakit bundle Svelte dashboard & onboarding + index.html + style.css
npm test                       # Jalankan suite pengujian `node --test`
python3 tests/browser/smoke.py # Jalankan smoke test Playwright (Desktop & Mobile, tanpa koneksi eksternal)
```

> Catatan: `index.html`, `style.css`, [src/ui/svelte-dashboard.js](./src/ui/svelte-dashboard.js), dan [src/ui/svelte-onboarding.js](./src/ui/svelte-onboarding.js) merupakan artefak hasil build. Jalankan `npm run check` setiap selesai mengubah `html/`, `css/`, atau `src/`.
