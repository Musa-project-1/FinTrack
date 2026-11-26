# Finkas

[![CI](https://github.com/Musa-project-1/FinTrack/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Musa-project-1/FinTrack/actions/workflows/ci.yml) · **[Live App — finkas.vercel.app](https://finkas.vercel.app)**

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
| **UI & Type Safety** | Svelte 5 (`^5.59.1`, `46` komponen `.svelte` dengan live root `App.svelte`, `OnboardingShell.svelte`, `PrivacyShell.svelte`), TypeScript strict (`strict: true`, `tsc --noEmit` + `svelte-check --tsgo`), Vite 8 MPA (`^8.3.8`) |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite` + `@theme inline` di `src/styles/app.css`), `31` partial CSS modular di `src/styles/` (`app/` & `onboarding/`), `<style>` komponen Svelte, Phosphor Icons |
| **PWA & Offline** | Service Worker (`sw.js` → `dist/sw.js` dengan injeksi manifest aset ber-hash Vite via `scripts/generate-dist-sw.mjs`), Web App Manifest (`manifest.json`), IndexedDB (`finkas-offline-db`), View Transitions API |
| **Backend & Database** | Vercel Serverless Functions TypeScript (Node.js native TS ESM di `api/`), Google Cloud Firestore REST via Service Account |
| **Testing & Verifikasi** | Dual runner: `node --test` (`541` uji kontrak DOM, akuntansi WIB, idempotensi, keamanan, SW) + **Vitest** (`16` uji live komponen & store Svelte 5) + Playwright smoke (`dist/`) + `scripts/verify.mjs` |

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
│   ├── entries/                  # Vite MPA entrypoints (workspace.ts, onboarding.ts, privacy.ts)
│   ├── styles/                   # Tailwind v4 + 31 partial CSS modular (app.css, onboarding.css, app/, onboarding/)
│   ├── svelte/                   # Sumber Svelte 5 & TypeScript (46 .svelte + 93 .ts)
│   │   ├── App.svelte            # Root SPA workspace (merender WorkspaceShell + 13 komponen modal)
│   │   ├── components/           # Komponen reusable inti (ModalDialog.svelte)
│   │   ├── core/                 # Logika murni & sinkronisasi TS (config, state + subscribeState, dues, cash-report, mutation, offline*, utils)
│   │   ├── dashboard/            # 8 komponen utama workspace (Overview, Bento, Spotlight, Matriks, Riwayat, Statistik)
│   │   ├── modals/               # 14 komponen isi modal (GroupPicker/Admin, Queue, Profil, Struk, SelfPay, Master, Audit, Laporan Kas)
│   │   ├── forms/                # 5 komponen kontrol interaktif (Checklist Iuran, Review Chips, QuickPay, YearGlider, StampPreview)
│   │   ├── shell/                # WorkspaceShell.svelte & 13 komponen modal dengan handler Svelte native
│   │   ├── pages/                # Live root OnboardingShell.svelte, PrivacyShell.svelte, & kontroler pages (.ts)
│   │   ├── handlers/             # Kontroler fitur & form TypeScript (auth, groups, master, profile, receipt, transactions*, quickpay, self-pay, export, backup)
│   │   ├── stores/               # Store runes Svelte 5 (app.svelte.ts, modal.svelte.ts, *.svelte.ts), workspace-sync.ts, & view-model murni (*-model.ts)
│   │   ├── ui/                   # Modul UI TypeScript (cdrop, dpick, mpick, keel, gestures, i18n, modal, theme, kasi*, workspace)
│   │   └── app.ts                # Bootstrap workspace & mediator event
│   ├── pages/                    # Template statis 404.html / offline.html & boot-theme scripts
│   ├── types/                    # Tipe domain global (finkas.d.ts)
│   └── sw-register.js            # Registrasi Service Worker
├── scripts/                      # render-shells.mjs, generate-dist-sw.mjs, authored-sourcemaps.mjs, bump.mjs, verify.mjs
├── tests/                        # Suite node:test (541 uji) + Vitest Svelte (tests/svelte/, 16 uji) + Playwright smoke + helpers
└── sw.js                         # Template Service Worker (precache & lifecycle offline)
```

---

## 🧑‍💻 Perintah Pengembangan

```bash
npm run check                  # 1 perintah lengkap: build MPA + verify + typecheck (tsc strict & svelte-check) + 557 uji
npm run typecheck              # Jalankan `tsc --noEmit` (strict) + `svelte-check --tsgo`
npm run release                # Naikkan versi cache/aset & sw.js (bump.mjs), lalu jalankan `npm run check`
npm run build                  # Build Vite MPA ke `dist/` + generate `dist/sw.js` precache manifest
npm test                       # Jalankan `npm run test:node` (541 uji) + `npm run test:vitest` (16 uji Svelte)
python3 tests/browser/smoke.py # Jalankan smoke test Playwright terhadap `dist/` (Desktop & Mobile)
```

> Catatan: `dist/`, `index.html`, `onboarding.html`, `privacy.html`, `404.html`, `offline.html`, `style.css`, dan `css/` adalah output hasil build yang di-gitignore agar root repo tetap rapi (selalu dihasilkan ulang saat `npm run build` / deploy Vercel). Jalankan `npm run check` setiap selesai mengubah `src/` atau `api/`.
