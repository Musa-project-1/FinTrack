# Finkas

Aplikasi manajemen kas anggota dan kas operasional komunitas berbasis web (**Offline-First Progressive Web App / PWA**), dibangun dengan **Svelte 5 + TypeScript + Tailwind CSS v4 + Vite 8** di frontend dan **Vercel Serverless Functions + Google Cloud Firestore** di backend.

> Lihat [`PRD.md`](./.github/PRD.md) untuk spesifikasi produk lengkap dan [`DESIGN.md`](./.github/DESIGN.md) untuk token desain *Hybrid Kinetic*.

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

Browser **tidak pernah** mengakses Firestore secara langsung; seluruh akses ditolak oleh `.github/firestore.rules`:

```
match /{document=**} { allow read, write: if false; }
```

Seluruh operasi membaca dan menulis melewati Vercel Functions di `api/`:

| Aspek | Implementasi |
|---|---|
| Sesi & Token | Token HMAC bertanda tangan dengan TTL dan pencabutan sisi server (`revokedAfter`) lewat `api/_session.ts` |
| Kredensial | Password pengurus, password master, dan PIN grup di-hash dengan `scrypt` (`groups/{gid}/private/config`, `settings/app_config`) |
| Google Super Admin | Verifikasi token Google OAuth terhadap whitelist email server-only (`api/login-google.ts`) |
| Pembatasan Percobaan | Rate limiter sisi server di Firestore per grup & per IP (`_ratelimit`) |
| Idempotensi & Integritas | Entropi ID `>= 64-bit`, `fsCreateIfAbsent` untuk cegah duplikat iuran, serta receipt atomik per `operationId` (`api/_transaction-idempotency.ts`) |
| Proteksi Klien & HTTP | Sanitasi formula CSV (`=`, `+`, `-`, `@`, `\t`, `\r`), zero `.innerHTML` di handler/renderer/form, plus CSP, HSTS, dan `X-Frame-Options: DENY` di `vercel.json` |

---

## 🛠️ Teknologi

| Layer | Teknologi |
|---|---|
| **UI & Type Safety** | Svelte 5 (`^5.59.1`, `55` komponen `.svelte`), TypeScript 7 ketat (`noImplicitAny: true`, `strictNullChecks: true`), Vite 8 (`^8.3.8`) |
| **Styling & Shells** | Tailwind CSS v4 (`^4.0.0`, `@theme inline` di `src/input.css`), `<style>` Svelte terekstrak (`css/*-scoped.css`), Svelte HTML shells (`scripts/render-shells.mjs`), Phosphor Icons |
| **PWA & Offline** | Service Worker (`sw.js`), Web App Manifest (`manifest.json`), IndexedDB (`finkas-offline-db`), View Transitions API |
| **Backend & Database** | Vercel Serverless Functions TypeScript (Node.js native TS ESM di `api/`), Google Cloud Firestore REST via Service Account |
| **Testing & Verifikasi** | `node --test` (`412` uji kontrak DOM, akuntansi WIB, idempotensi, keamanan, & JSDOM Svelte) + Playwright smoke + `scripts/verify.mjs` |

---

## 📁 Struktur Direktori

```
├── .github/                      # CI workflow, PRD.md, DESIGN.md, & firestore.rules
├── api/                          # Vercel serverless functions TypeScript (gateway Firestore)
│   ├── data.ts                   # Gateway data terautentikasi (baca/tulis per grup)
│   ├── login.ts, login-google.ts # Autentikasi pengurus, master admin & Google Super Admin
│   ├── create-group.ts           # Manajemen grup (khusus Super Admin)
│   ├── verify-group-pin.ts       # Verifikasi PIN 4 digit per grup
│   └── _*.ts                     # Modul internal: sa, http, session, store, read, write-*, idempotency, attachments
├── src/
│   ├── svelte/                   # Sumber Svelte 5 & TypeScript (55 .svelte + 87 .ts)
│   │   ├── core/                 # Logika murni & sinkronisasi TS (config, state, dues, cash-report, mutation, offline*, utils)
│   │   ├── dashboard/            # 8 komponen utama workspace (Overview, Bento, Spotlight, Matriks, Riwayat, Statistik)
│   │   ├── modals/               # 14 komponen isi modal (GroupPicker/Admin, Queue, Profil, Struk, SelfPay, Master, Audit, Laporan Kas)
│   │   ├── forms/                # 5 komponen kontrol interaktif (Checklist Iuran, Review Chips, QuickPay, YearGlider, StampPreview)
│   │   ├── shell/                # WorkspaceShell.svelte, 12 kerangka modal, & 6 modul fondasi CSS di styles/
│   │   ├── pages/                # OnboardingShell/PrivacyShell, 6 modul CSS di onboarding/, & kontroler pages (.ts)
│   │   ├── handlers/             # 15 kontroler fitur & form TypeScript (auth, groups*, master, transactions*, quickpay, self-pay, export, backup)
│   │   ├── render/               # 5 modul orkestrasi render UI TypeScript (index, dashboard, profile, receipt, rekap)
│   │   ├── stores/               # Store runes Svelte 5 (*.svelte.ts) & view-model murni (*-model.ts)
│   │   ├── ui/                   # 21 modul UI TypeScript (cdrop, dpick, mpick, keel, gestures, i18n, modal, theme, kasi*, workspace)
│   │   └── app.ts                # Router aksi DOM & bootstrap workspace TypeScript
│   ├── ui/                       # Hasil bundle (svelte-dashboard.js, svelte-onboarding.js) & deklarasi .d.ts
│   ├── pages/                    # Entrypoint tipis onboarding/privacy JS & template 404.html / offline.html
│   ├── types/                    # Tipe domain global (finkas.d.ts)
│   ├── input.css                 # Entry Tailwind v4 (@theme inline & @import CSS terekstrak)
│   └── app.js                    # Entrypoint modul utama aplikasi
├── scripts/                      # render-shells.mjs, authored-sourcemaps.mjs, bump.mjs, verify.mjs
├── tests/                        # Suite node:test (412 uji) + Playwright smoke + fixtures + helpers
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
npm run check                  # 1 perintah lengkap: build semua aset + verify (sintaks, precache SW, TypeScript) + 412 uji
npm run release                # Naikkan versi cache/aset & sw.js (bump.mjs), lalu jalankan `npm run check`
npm run build                  # Rakit bundle Svelte + HTML shells + css/*-scoped.css + style.css
npm test                       # Jalankan suite pengujian `node --test`
python3 tests/browser/smoke.py # Jalankan smoke test Playwright (Desktop & Mobile, tanpa koneksi eksternal)
```

> Catatan: `index.html`, `onboarding.html`, `privacy.html`, `404.html`, `offline.html`, `style.css`, dan `css/*-scoped.css` adalah output hasil build yang di-gitignore agar root repo tetap rapi (selalu dihasilkan ulang saat `npm run build` / deploy Vercel). Jalankan `npm run check` setiap selesai mengubah `src/` atau `api/`.
