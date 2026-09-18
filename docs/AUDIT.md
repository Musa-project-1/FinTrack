# Finkas — Laporan Audit & QA Desain

**Arah Desain:**
- Surface Aplikasi (`index.html` + `html/*`): Trust-first Fintech × Tactile Precision ("Ocean Ledger")
- Surface Landing (`onboarding.html`): Modern Fintech Showpiece ("Origin" kanvas Obsidian gelap)
**Tanggal Audit:** 18 September 2026  
**Status Build:** v123 (`finkas-v123`)  
**Hasil Akhir:** LULUS 100% (Seluruh gerbang otomatis & isolasi arsitektur bersih)

---

## 1. Status Gerbang Otomatis (Automated Gates)

| Pengujian | Perintah | Target Verifikasi | Hasil |
|---|---|---|---|
| Build HTML & CSS | `npm run build` | Kompilasi 11 fragmen modal ke `index.html` + Tailwind v4 build `style.css` | **LULUS** (0 error, index.html 2041 baris) |
| Verifikasi Integritas | `npm run verify` | Sintaks JS/MJS, keselarasan `LOCAL_ASSETS` `sw.js` (29 modul), kesegaran `index.html` | **LULUS** (40 files parsed, 29 precached) |
| Unit Test | `node --test` | 7 suite pengujian logika inti, firestore codec, token sesi, dan otorisasi | **LULUS** (64 pass, 0 fail, durasi ~550ms) |
| Gabungan Pemeriksaan | `npm run check` | Gerbang commit & rilis terpadu | **LULUS** (0 failure) |

---

## 2. Cakupan Audit Per Surface & Isolasi Desain

Arsitektur Finkas sengaja memisahkan surface visual untuk menjaga performa dan integritas:

| Surface | Berkas Utama | Sumber Gaya / Token | Sistem Visual | Status Audit |
|---|---|---|---|---|
| **Aplikasi Utama** | `index.html`, `html/modals/*` | `css/modules/tokens.css` → `style.css` | Ocean Ledger (Paper Ocean light & Navy Ocean dark) | **TERVERIFIKASI** (0 kebocoran style landing) |
| **Landing & Onboarding** | `onboarding.html` | `css/onboarding.css`, `css/onboarding-motion.css` | Origin Gelap (Obsidian `#0f1011`, token `--lp-*`) | **TERVERIFIKASI** (100% terisolasi via G1 & G2) |
| **Halaman Privasi** | `privacy.html` | `<style>` inline terisolasi | Salinan lokal token Ocean Ledger | **TERVERIFIKASI** (Bumped ke `?v=123`) |
| **Halaman 404** | `404.html` | `<style>` inline terisolasi | Netral + `#10b981` (belum masuk harmonisasi) | **DILUAR SCAN** (Pekerjaan terpisah di luar landing redesign) |

---

## 3. Hasil Audit Statis (Pembersihan Pola Lama)

Audit statis pada surface aplikasi dan landing:

| Parameter Audit | Kriteria | Hasil Audit | Status |
|---|---|---|---|
| **Palet Warna Lama** | 0 pemakaian `#3b82f6`, `#6366f1`, `#f43f5e`, `#f59e0b`, `#25d366`, `#8b5cf6`, `#a855f7` di aplikasi | **0 temuan** — seluruh warna aplikasi dipetakan ke token Ocean Ledger | **RESOLVED** |
| **Raw Emerald di luar tokens** | Wajib menggunakan token `var(--accent)`, `var(--accent-strong)`, `var(--accent-tint)` di aplikasi | **0 temuan** — warna mentah di reports, faq, group-admin sudah diganti token | **RESOLVED** |
| **Glow & Gradient Lama** | Hapus inset glow modal dan `.icon-gradient-*` | **0 temuan** — kelas gradien lama dihapus, menggunakan styling aksen netral | **RESOLVED** |
| **Elevasi Kartu** | Hairline border 1px solid, tanpa `box-shadow` blur | **0 temuan** — kartu datar, shadow hanya `--shadow-pop` pada modal/sheet | **RESOLVED** |
| **Hover Transform** | Tanpa `translateY`/`translateX` mengangkat pada hover tombol | **0 temuan** — feedback hover murni transisi warna, latar, dan border | **RESOLVED** |
| **Tipografi & Angka Tabular** | Judul Fraunces, angka & data JetBrains Mono tabular-nums | **LULUS** — Saldo hero Fraunces, tabel/nominal JetBrains Mono | **RESOLVED** |
| **Palet Chart Data** | Ramp harmonis Ocean Ledger | **LULUS** — Masuk teal, Keluar coral, doughnut ramp 6 warna token | **RESOLVED** |
| **Klaim Inline Style** | 0 inline style dekoratif pada markup produksi landing & template aplikasi | **LULUS** — seluruh aturan visual berada di stylesheet terisolasi | **RESOLVED** |

---

## 4. Hasil Pengujian Responsif & Komponen

1. **Header & Brand (Aplikasi):**
   - Logo SVG Finkas dengan status online dot solid teal.
   - 3 pill statistik ringkas sejajar rapi.

2. **Dashboard Hero Saldo (Aplikasi):**
   - Saldo Kas tampil dominan menggunakan font neo-serif Fraunces dengan hairline rule aksen.
   - Flow strip Masuk (teal +) dan Keluar (coral -) sejajar dengan angka tabular mono.

3. **Rekap Matriks Iuran (Aplikasi & Landing):**
   - Kolom nama sticky dengan hairline kanan di aplikasi.
   - Matriks 12 bulan (JAN–DES) dengan horizontal scroll mandiri di mobile tanpa merusak viewport di landing page.

4. **Komponen Modal & Dialog (Aplikasi):**
   - Header standar dengan mono eyebrow kategori.
   - Tombol tutup netral tanpa putaran atau border merah.
   - Input nominal hero jelas dan bergaris tegas.

5. **Landing Page Modern (Onboarding):**
   - Menggantikan alur sempit onboarding 3 langkah konvensional menjadi full Web2 fintech landing page:
     - Sticky glass navigation dengan drawer mobile dan progress bar scroll.
     - Split hero center-aligned dengan mockup frame dan live simulator interaktif.
     - Bento grid 6 tile kromatik terkalibrasi ke kanvas gelap Obsidian.
     - Panggung visual langit-ke-bumi (sky stage) dengan transisi 4 lapisan berbasis posisi scroll.
     - Portal pemilihan grup dan verifikasi 4-digit PIN terintegrasi mulus.
     - FAQ accordion dua arah berbasis CSS grid row `0fr` ↔ `1fr`.
   - Service worker aktif di versi `finkas-v123` dengan cache busting terpadu dan guard anti-broken `.js-motion`.
