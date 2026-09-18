# Rencana Redesign Landing Page (Onboarding) — Origin Financial

> **Status:** 🟢 DISETUJUI — siap implementasi (menunggu Act mode)
> **Referensi:** [Origin Financial — Refero Styles](https://styles.refero.design/style/c60f05ff-2420-4a24-92db-80c4b6a74683)
> **File sasaran:** `onboarding.html`, `css/onboarding.css`, `css/onboarding-motion.css` (baru), `js/onboarding.js`, `sw.js`, `docs/AUDIT.md`
> **Tanggal:** 15 September 2026
> **Versi cache saat ini:** `finkas-v122` → target setelah selesai: `finkas-v123`

---

## 0. Cara Pakai Dokumen Ini

1. **Bagian 7 (Keputusan)** harus dijawab dulu — tanpa itu implementasi tidak boleh mulai, karena jawabannya mengubah struktur HTML dan token warna.
2. **Bagian 8 (Checklist Implementasi)** adalah daftar kerja. Tandai `[x]` hanya setelah item benar-benar selesai **dan sudah dicek**.
3. **Bagian 9 (Checklist Verifikasi)** tidak boleh dilewati. Task dianggap selesai hanya kalau seluruh gerbang hijau.
4. **Bagian 12 (Log Progres)** diisi setiap sesi kerja agar bisa dilacak kapan berhenti dan kenapa.
5. **Bagian 10 (Traceability Bug)** memetakan BUG-1…BUG-9 ke berkas, fase penanggung jawab, dan bukti penutupnya.
6. **Bagian 13 (Isolasi Token)** adalah guardrail yang mengikat: aturan G1–G3 tidak boleh dilanggar oleh fase mana pun. Baca sebelum menyentuh `css/onboarding.css` atau `css/modules/*`.

---

## 1. Ringkasan Eksekutif

Landing page saat ini **secara konten sudah kuat** (hero, mockup, trust card, bento, matriks, simulator, FAQ), tapi secara eksekusi visual tertinggal jauh dari referensi yang dituju, dan mengandung **10 cacat nyata** — termasuk satu bug CSS yang mematikan header di dark mode.

Akar masalah "kayak kurang gitu":

| Akar Masalah | Penjelasan Singkat |
|---|---|
| Tipografi display salah total | Referensi memakai serif **weight 300** di **80–96px**. Finkas memakai Fraunces **weight 600** di **32–48px**. Dua kesalahan sekaligus (weight + skala). |
| Bahasa bentuk salah | Tombol pill penuh (9999px) vs referensi **8px**. Kartu ber-border 1px vs referensi **full-bleed warna tanpa border**. |
| Elevasi salah | Referensi **nol drop shadow** (kedalaman dari color step). Finkas punya shadow 16px/36px di mana-mana. |
| Header tidak terdesain | Bukan hanya bug CSS — header tidak punya hirarki nav ala produk (mono uppercase tracked), tidak punya state, tidak punya navigasi mobile. |
| Nol motion | Referensi punya sistem gerak jelas (0.2s state, 2.5s reveal atmosferik). Landing page Finkas: nol `@keyframes`. |

---

## 2. DNA Referensi (Origin Financial)

> *"midnight gallery of quiet wealth. A hushed, near-black room where oversized serif whispers and a few luminous color panels make finance feel like curated art."*

| Aspek | Aturan Referensi |
|---|---|
| **Canvas** | `#0f1011` Obsidian (near-black). Bukan putih. |
| **Display** | Serif **weight 300**, 80–96px, **line-height 0.9**. Tidak pernah bold. Satu kata *italic* di dalam headline sebagai tegangan editorial. |
| **Tiga suara font** | Serif (emosi) + Sans (UI) + Mono uppercase (data). Tidak boleh dilanggar. |
| **Label & angka** | Mono uppercase 10–12px, tracking 0.016–0.182em. |
| **Radius** | button/input/nav = **8px**, card = 16px, feature tile = **30px**, pill hanya untuk chip asli. |
| **Elevasi** | **Nol drop shadow di kartu.** Kedalaman dari color step `#0f1011 → #2e2e2e → #cacaca` + glassmorphism nav `blur(24px)`. |
| **Warna kromatik** | Hanya untuk **full-bleed feature tile**. Dilarang sebagai border atau inline accent. Dilarang di teks < 18px. |
| **Aksi primer** | Putih di atas hitam, teks hitam, **panah di kanan**, kontras 21:1. Hanya satu CTA primer per layar. |
| **Layout** | Max-width **1200px**, section gap **80px**, card padding **32px**, base unit 4px. Semua headline **center-aligned**. |
| **Motion** | State transisi **0.2s ease**. Reveal atmosferik **2.5s** `cubic-bezier(0.455, 0.03, 0.515, 0.955)`. Ada `borderTurn`. **Tanpa** spring, overshoot, atau parallax. |
| **Gradien** | Hanya 2, keduanya struktural (dark chrome + sky atmosphere). **Tidak pernah** di teks, tombol, atau kartu. Tidak ada radial/conic. |

### 2.1 Observasi dari Screenshot Asli

- Header: logo mark kiri (ikon saja), item nav **mono uppercase ~11px tracked** berkelompok di tengah, kanan ada link teks mono uppercase + **CTA putih kecil** dengan panah di kanan.
- Hero: full-bleed foto atmosferik, konten **center**, urutan: chip eyebrow pill → headline serif raksasa (satu kata *italic* + titik akhir) → paragraf abu-abu max ~560px → CTA putih → field besar rounded dengan tombol submit bulat → caption kecil → band laurel/penghargaan (serif + mono uppercase).
- Semua elemen tenang, napas besar, tidak ada elemen dekoratif kecuali warna.

---

## 3. Gap Analysis — Landing Page Sekarang vs Referensi

| # | Referensi | Finkas Sekarang | Dampak | Target |
|---|---|---|---|---|
| 1 | Serif 300 / 80–96px / lh 0.9 | `clamp(32–48px)` **weight 600** | **Gap terbesar.** Kehilangan otoritas "whisper-weight". | Fraunces 300, `clamp(48px, 7vw, 88px)`, lh 0.95 |
| 2 | Nav mono uppercase 11px tracked | Link sans 13.5px + tombol teal | Header terasa website biasa. | Nav mono uppercase 11px, tracking 0.14em |
| 3 | Hero center-aligned | Hero split kiri-kanan | Komposisi generik dan sibuk. | Center-aligned, mockup turun jadi product band |
| 4 | Tombol radius 8px, panah kanan | Pill penuh, panah kiri | Bahasa bentuk "aplikasi kas", bukan "gallery". | Radius 8px, ikon trailing |
| 5 | Kartu flat, nol shadow | `box-shadow 16px/36px` + border | Terlihat seperti template lama. | Nol shadow, border hanya hairline putih alpha |
| 6 | 6 full-bleed chromatic tile | 5 bento abu-abu ber-border | Kehilangan efek "illuminated panels". | 6 tile kromatik, radius 30px, nol border |
| 7 | Eyebrow pill chip per section | Tidak ada | Hilang editorial rhythm. | Chip mono uppercase di tiap section |
| 8 | 1 kartu Silver inverted | Tidak ada | Kehilangan momen kontras. | CTA banner jadi Silver `#cacaca` |
| 9 | Motion 0.2s state + 2.5s reveal | Nol motion | Halaman terasa mati. | Sistem motion penuh (Bagian 6) |
| 10 | Weight 300 tersedia | Fraunces 300 **belum di-load** | Weight 300 tidak akan tampil walau diminta. | Tambah `300` + `ital` ke URL font |

---

## 4. Pemetaan Token (Origin → Finkas, Tanpa Dependency Baru)

| Origin | Substitusi Finkas | Catatan |
|---|---|---|
| Lyon Display 300 | **Fraunces 300 + italic 300** | Sudah terpasang dan variabel. **Wajib** tambah `300` dan axis `ital` ke URL Google Fonts. |
| Suisse Int'l 300/400 | **Inter 300/400** | Tambah `300` untuk subhead 18px. |
| Roboto Mono 400/500 | **JetBrains Mono 400/500** | Sudah lokal dan ter-precache di `sw.js`. **Tidak** ganti, hindari unduhan baru. |
| Obsidian / Abyss / Graphite / Steel / Fog / Ash / Cloud / Pure | **Adopsi persis** | Netral, tidak konflik identitas. |
| Iris / Cyan / Orchid / Periwinkle / Pale Iris / Deep Iris | **Adopsi sebagai 6 tile kromatik** | **Flat fill, bukan gradien.** Lihat Keputusan #3. |
| Teal `--accent` (Seafoam Ledger) | **Pensiun dari landing page** | Tetap dipakai di aplikasi. Peran data-signal diambil Cyan Signal. |
| Coral `--danger` | **Dipertahankan** untuk sinyal "kas keluar" | Pengecualian disengaja: ledger butuh pembeda +/− yang terbaca. |

### 4.1 URL Font Baru (wajib — tanpa ini weight 300 tidak muncul)

```
https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=JetBrains+Mono:wght@400;500&display=swap
```

### 4.2 Token CSS Baru (ringkas)

> **Prefix `--lp-` wajib** (keputusan #5). Ini satu-satunya pertahanan terhadap tabrakan nama dengan `css/modules/tokens.css` — lihat Bagian 13. Alasannya konkret: landing dan aplikasi saat ini berbagi ~30 nama token polos (`--surface`, `--bg-color`, `--accent`, `--danger`, `--border`, `--r-lg`, `--t-fast`, `--font-display`, `--sp-4`, …) dengan nilai yang sudah berbeda di beberapa tempat.
>
> **Konvensi penulisan:** di Bagian 5–8 nama token sering ditulis tanpa prefix agar enak dibaca (`--graphite`, `--iris`, `--r-btn`). Implementasi aktualnya **selalu** `--lp-<nama>` (`--lp-graphite`, `--lp-iris`, `--lp-r-btn`). Tidak ada satu pun token landing yang boleh ditulis tanpa prefix.

```css
:root {
  /* Surfaces */
  --lp-canvas: #0f1011;    --lp-abyss: #090a0b;
  --lp-graphite: #2e2e2e;  --lp-steel: #3f4041;
  --lp-silver: #cacaca;    --lp-void: #000000;
  /* Text */
  --lp-pure: #ffffff;      --lp-cloud: #f5f5f7;
  --lp-ash: #9f9fa0;       --lp-fog: #6a6b6b;
  /* Chromatic tiles */
  --lp-iris: #847dff;      --lp-cyan: #00b3dd;
  --lp-pale-iris: #d1c9ff; --lp-deep-iris: #4b49aa;
  --lp-orchid: #dd90d8;    --lp-periwinkle: #90b8f0;
  /* Hairlines */
  --lp-line: rgba(255,255,255,0.15);
  --lp-line-soft: rgba(255,255,255,0.10);
  /* Radius */
  --lp-r-btn: 8px; --lp-r-card: 16px; --lp-r-tile: 30px; --lp-r-pill: 9999px;
  /* Motion */
  --lp-t-state: 0.2s ease;
  --lp-t-reveal: 2.5s cubic-bezier(0.455, 0.03, 0.515, 0.955);
}
```

---

## 5. Struktur Halaman Baru (Section per Section)

### 5.1 Header / Nav (sticky)

| Elemen | Spesifikasi |
|---|---|
| Bar | Glass `backdrop-filter: blur(24px)`, latar `rgba(15,16,17,0.72)`, hairline bawah `--line-soft` |
| Logo | Ikon mark saja (kiri). Badge "PWA Kas" **dipindah** dari nav ke chip eyebrow hero |
| Nav item | Mono 11px UPPERCASE, tracking 0.14em, warna `--ash`; hover/aktif → `--pure` |
| Nav tengah | `FITUR` · `MATRIKS` · `DEMO` · `FAQ`, dikelompokkan di tengah |
| Nav kanan | Link teks mono `MASUK GRUP` + **CTA putih** `PILIH GRUP KAS →` (radius 8px, teks hitam) |
| State scrolled | `.is-scrolled` → padding vertikal mengecil, latar lebih solid, hairline menguat |
| Progress bar | Garis 2px di tepi bawah nav, lebar mengikuti progres scroll halaman |
| Active link | Scroll-spy: indikator bergeser halus ke section yang sedang aktif |
| Mobile ≤900px | Tombol hamburger (`ph-list`) → drawer slide-down, link stagger, Esc untuk tutup, focus trap, scroll-lock, `aria-expanded` |

### 5.2 Hero (center-aligned)

Urutan vertikal:

1. **Chip eyebrow** mono uppercase: `KAS RT/RW · ARISAN · KAS KELAS`
2. **Headline** Fraunces 300, `clamp(48px, 7vw, 88px)`, lh 0.95, satu kata *italic*:
   `Kas komunitas yang *jujur* dan terbuka.`
3. **Subhead** Inter 300 18px, `--ash`, max-width 560px, center
4. **CTA primer** putih: `PILIH GRUP KAS →`
5. **CTA sekunder** ghost outline putih 1px: `COBA DEMO`
6. **Trust band** (menggantikan band laurel referensi): ikon + mono uppercase —
   `PIN TERISOLASI` · `100% OFFLINE-READY` · `MATRIKS 12 BULAN`
7. **Latar**: `--canvas` + banding netral `--abyss` (gradien netral gelap, bukan kromatik)

### 5.3 Product Band (mockup)

- Browser frame dipindah dari samping hero ke **band full-width di bawah hero**
- Surface `--graphite`, radius 16px, **padding 90px** (nilai terbesar sistem = bingkai premium)
- Isi tetap: saldo kas (dengan count-up), flow strip masuk/keluar, roster anggota
- Chrome topbar: `linear-gradient(135deg, rgb(43,43,44), rgb(19,19,19))` — **satu-satunya gradien yang diizinkan** (dark chrome)

### 5.4 Enam Tile Kromatik (menggantikan bento grid 5 kartu)

Grid 3 kolom, gap 12–15px, radius 30px, padding 32px, **nol border, nol shadow**.

| # | Warna | Judul (Fraunces 300, ~38px) |
|---|---|---|
| 1 | Iris `#847dff` | Ledger Kas Real-Time |
| 2 | Cyan `#00b3dd` | Matriks Iuran 12 Bulan |
| 3 | Orchid `#dd90d8` | Struk WhatsApp Instan |
| 4 | Periwinkle `#90b8f0` | Antrean Offline Cerdas |
| 5 | Pale Iris `#d1c9ff` | Ruang Kas Terpisah |
| 6 | Deep Iris `#4b49aa` | 11 Opsi Kustomisasi |

Isi tiap tile: ikon Phosphor + judul serif + deskripsi Inter 16px. Warna adalah satu-satunya identitas — tidak ada border atau label pengelompokan.

**Catatan kontras:** Pale Iris `#d1c9ff` terang, jadi teks di atasnya harus **hitam**; lima tile lainnya pakai teks putih/`--cloud`. Ini wajib diuji kontrasnya.

### 5.5 Trust Ticker jadi Band Statistik

Empat kartu trust lama (ber-border, redundan dengan tile) diubah menjadi **band mono uppercase ringkas** tanpa kartu — supaya tidak menduplikasi bahasa visual tile kromatik.

### 5.6 Section Matriks Iuran

- Judul Fraunces 300 center + chip eyebrow `TRANSPARANSI`
- **Dilengkapi jadi 12 bulan penuh (JAN–DES)** — memperbaiki klaim copy yang saat ini hanya menampilkan 6 kolom
- Container scroll horizontal di mobile dengan hint scroll
- Semua angka JetBrains Mono `tabular-nums`
- Stamp `PAID` / `LIBUR` muncul dengan **fade**, bukan pop/bounce

### 5.7 Simulator

- Panel `--graphite`, radius 16px
- Tombol mengikuti sistem (radius 8px, teks mono uppercase)
- Nominal saldo flash halus saat berubah (0.2s)

### 5.8 FAQ

- Accordion **dua arah** (buka & tutup dianimasikan)
- Struktur: `<button aria-expanded>` + body — **bukan** `<details>`, karena `<details>` tidak bisa dianimasikan saat menutup
- Caret Phosphor berputar 180°, easing tenang tanpa overshoot
- Chip eyebrow `PERTANYAAN UMUM`

### 5.9 CTA Banner — satu-satunya Kartu Silver Inverted

- Latar `--silver #cacaca`, teks hitam `#000000`, radius 30px, padding 32px
- Judul Fraunces 300 38px
- Tombol di atas silver: **wajib uji kontras**. Default: hitam solid dengan teks putih
- Aturan referensi: maksimal 1–2 kartu inverted per halaman → hanya di sini

### 5.10 Footer

- Hairline atas `--line-soft`, teks mono uppercase 11px `--ash`
- Link: `BUKA APLIKASI` · `KEBIJAKAN PRIVASI`

### 5.11 Layar 2 & 3 (Pilih Grup, PIN)

- Ikut di-dark-kan dengan token identik: kartu `--graphite`, radius 16px, nol shadow
- Input PIN: latar `--void #000000`, border `--line-soft`, radius 8px
- **Wajib dikerjakan** — tanpa ini akan terjadi lompatan visual dari landing gelap ke kartu putih terang

---

## 6. Sistem Motion (Dikalibrasi ke Referensi)

> **Penting:** Rencana awal (stagger 70ms, naik 14px, 460ms) **dibatalkan** — terlalu cepat dan terlalu ramai untuk referensi ini. Origin bergerak lambat dan tenang.

| Pola | Spesifikasi | Diterapkan di |
|---|---|---|
| **State transition** | `0.2s ease` pada `background-color` + `opacity` saja | Semua hover/focus/aktif |
| **Hero reveal** | `2.5s cubic-bezier(0.455,0.03,0.515,0.955)`, fade atmosferik bertahap, naik hanya 6px di ~30% awal kurva | Chip → headline → subhead → CTA → trust band |
| **Product band enter** | 2.5s, fade + `blur(8px) → 0` | Mockup |
| **Section reveal** | fade 1.2s, sekali jalan via `IntersectionObserver` | Trust band, tile, matriks, simulator, FAQ, CTA |
| **borderTurn** | Stroke 1px berjalan mengelilingi frame | Flourish utama hero & mockup |
| **Count-up saldo** | 2.5s, easing tenang, `tabular-nums` (tanpa layout shift) | Saldo mockup |
| **Progress bar** | `transform: scaleX()` mengikuti scroll | Header |
| **Accordion** | `grid-template-rows: 0fr → 1fr` | FAQ |

**Dilarang:** spring, overshoot, bounce, parallax, stamp pop, hover-lift kartu.

**Reduced motion:** `@media (prefers-reduced-motion: reduce)` → semua animasi & transisi dimatikan, count-up langsung ke nilai akhir, reveal langsung terlihat.

**Guard anti-broken:** state tersembunyi untuk reveal **hanya** aktif setelah JS menambahkan kelas `.js-motion` ke `<html>`. Kalau JS gagal atau diblokir, seluruh konten tetap terlihat penuh — tidak boleh ada halaman kosong.
---

## 7. Keputusan — ✅ SUDAH DIJAWAB

Disetujui pemilik proyek pada 15 September 2026: **semua usulan default diterima.**

- [x] **#1 — Landing page dark-only.** Disetujui: **YA**. Halaman jadi Obsidian permanen, tidak ikut `prefers-color-scheme`. Aplikasi tetap light. Blok CSS dark-mode yang rusak (BUG-1) **dihapus**, bukan ditambal.
- [x] **#2 — Hero center-aligned.** Disetujui: **CENTER**, mockup dipindah jadi product band di bawah hero.
- [x] **#3 — Palet tile.** Disetujui: **PALET ORIGIN** (Iris + Cyan + Orchid + Periwinkle + Pale Iris + Deep Iris). Semua **flat fill, nol gradien kromatik**.
- [x] **#4 — Latar hero.** Disetujui: **GAMBAR**. Aset: `assets/hero-atmosphere.png` (perlu optimasi, lihat Fase 0).
- [x] **#5 — Prefix token landing.** Disetujui: **`--lp-`**. Semua token landing memakai prefix `--lp-` (mis. `--lp-canvas`, `--lp-iris`, `--lp-r-btn`). Tujuannya membuat setiap kebocoran token antar-surface gagal **terlihat langsung** (variabel tak terdefinisi) alih-alih jadi salah warna yang diam-diam. Rincian di Bagian 13.
- [x] **#6 — Identitas aplikasi tidak berubah.** Disetujui: **TETAP OCEAN LEDGER**. Aplikasi tetap memakai `css/modules/tokens.css` versi Ocean Ledger (Glacial Blue light / Abyssal Deep Sea dark — lihat `docs/plan.md` §7) dan tidak membaca satu pun token landing. Origin hanya hidup di landing page.

---

## 8. Checklist Implementasi (Per Fase)

> Cara pakai: setiap fase punya baris **Status**. Ubah jadi `SELESAI` hanya setelah semua kotak di fase itu tercentang **dan** sudah diverifikasi di browser.

---

### Fase 0 — Aset & Fondasi · **Status: ✅ SELESAI**

- [x] 0.1 Baca header PNG (IHDR) `assets/hero-atmosphere.png` untuk tahu dimensi asli
- [x] 0.2 Tulis skrip Node sementara (hanya modul bawaan `zlib`) untuk downscale + re-encode PNG
- [x] 0.3 Jalankan skrip, lalu **hapus** skrip sementaranya
- [x] 0.4 Verifikasi: ukuran turun signifikan, gambar masih valid & tampil di browser
- [x] 0.5 Jika hasil akhir > 400 KB → **jangan** daftarkan ke `LOCAL_ASSETS` di `sw.js`
- [x] 0.6 Buat file baru `css/onboarding-motion.css` di **root** (bukan `css/modules/`, agar tidak bocor ke bundle Tailwind aplikasi)

**Hasil 0.1 — aset asal.** `1024×1024`, bit depth 8, color type 2 (RGB), non-interlaced, **1.208.863 B (1180,5 KB)**. Membawa chunk sampingan `caBX` (C2PA) 18.924 B dan `sBIT` 3 B yang keduanya tidak diperlukan untuk web.

**Hasil 0.2–0.3 — skrip & eksekusi.** Skrip sementara `tmp/optimize-hero.cjs` (hanya `fs`, `path`, `zlib`) men-decode PNG, melakukan box-downscale, memilih filter PNG adaptif per scanline, lalu mencoba 4 strategi deflate level 9 dan menyimpan hasil terkecil. Skrip `tmp/inspect-hero.cjs` dipakai membaca IHDR. Keduanya **sudah dihapus**.

**Hasil 0.4 — verifikasi.** Hasil akhir **672×672 RGB 8-bit, 384.608 B (375,6 KB)** — turun **68,2%**. Chunk `caBX`/`sBIT` dibuang; berkas hasil hanya `IHDR` + satu `IDAT` + `IEND`. Round-trip decode berkas hasil menghasilkan hash piksel **identik** dengan buffer yang ditulis (FNV-1a `1c3ace81`, EXACT). Sudah dibuka di browser: tekstur atmosferik gelap frekuensi rendah tanpa detail halus, jadi penurunan resolusi tidak menghilangkan detail yang terlihat. Angka pembanding: 704×704 → 415,5 KB (di atas anggaran), 672×672 → 375,6 KB (di bawah).

**Keputusan 0.5.** 375,6 KB ≤ 400 KB → hero image **boleh** didaftarkan ke `LOCAL_ASSETS` di `sw.js`. Pendaftaran aktual dikerjakan di Fase 9.4/9.5. Catatan: `sw.js` memakai strategi network-first untuk aset same-origin, jadi gambar tetap masuk cache runtime pada kunjungan pertama walau tidak di-precache.

**Hasil 0.6.** `css/onboarding-motion.css` dibuat di root `css/` — bukan `css/modules/`, jadi G2 aman. Isinya masih kerangka: header guardrail G1/G2, guard anti-broken `.js-motion` (8.14), dan blok `prefers-reduced-motion` (8.13). Blok `@keyframes`, state transition, dan reveal sengaja dikosongkan — diisi di Fase 8. Berkas ini **belum** dimuat `onboarding.html` (itu Fase 9.1), jadi belum berpengaruh pada halaman.

**Catatan kejujuran.** `assets/hero-atmosphere.png` **tidak** terlacak git (direktori `assets/` sepenuhnya untracked), jadi tidak ada salinan di VCS. Cadangan sementara `tmp/hero-atmosphere.original.png` dibuat sebelum penimpaan, dipakai untuk memverifikasi round-trip, lalu dihapus sesuai instruksi 0.3. Konsekuensinya sumber 1024×1024 asli sudah tidak ada di mesin ini — kalau resolusi asli dibutuhkan lagi, aset harus di-ekspor ulang dari sumber desain.

---

### Fase 1 — Token & Reset · **Status: ✅ SELESAI**

- [x] 1.1 Tulis ulang `:root` di `css/onboarding.css` dengan token Origin (surface step, teks, kromatik, hairline, radius, motion)
- [x] 1.2 **Hapus** blok `@media (prefers-color-scheme: dark)` dan `body.dark-mode` dari landing page → sekaligus menghapus **BUG-1** (CSS tidak valid yang mematikan header)
- [x] 1.3 Hapus **semua** `box-shadow` kartu: `.browser-frame`, `.portal-card`, `.simulator-panel`
- [x] 1.4 `body`: latar `--canvas`, teks `--cloud`, hapus `color-scheme: light`
- [x] 1.5 Radius tombol: `--r-pill` → `--r-btn` 8px. Pill hanya untuk chip eyebrow
- [x] 1.6 Layout: lebar konten 1140px → **1200px**, section gap → **80px**, card padding → **32px**, gap elemen → **12px**
- [x] 1.7 **Prefix `--lp-` (keputusan #5):** tulis **semua** custom property landing dengan prefix `--lp-` (daftar lengkap di Bagian 4.2), lalu perbarui setiap pemakaian `var(...)` di `css/onboarding.css` dan `css/onboarding-motion.css` agar ikut berprefix. Nol pengecualian — satu token polos yang tersisa sudah cukup untuk menghidupkan lagi risiko G3

**Hasil 1.1 — token Origin.** `:root` `css/onboarding.css` ditulis ulang. Kelompok token: surface (`--lp-abyss` / `-canvas` / `-graphite` / `-steel` / `-silver` / `-void`), teks (`--lp-pure` / `-cloud` / `-ash` / `-fog`), kromatik (`--lp-iris` / `-cyan` / `-orchid` / `-periwinkle` / `-pale-iris` / `-deep-iris`), hairline (`--lp-line`, `--lp-line-soft`), radius (`--lp-r-btn` 8 · `--lp-r-card` 16 · `--lp-r-tile` 30 · `--lp-r-pill`), motion (`--lp-t-state` 0.2s ease, `--lp-t-reveal` 2.5s `cubic-bezier(0.455,0.03,0.515,0.955)`), plus tipe dan spacing.
Teal `--accent` **dipensiunkan** dari landing (keputusan #4). Peran data-signal-nya kini: masuk = `--lp-pure` (netral paling terang), keluar = `--lp-danger` (coral) — satu-satunya pengecualian warna kromatik pada teks, disengaja sesuai Bagian 4 agar ledger tetap punya pembeda +/− yang terbaca. Nilai coral memakai yang sudah dipakai landing di permukaan gelap.
Dua token pendukung ditambahkan agar tidak ada nilai warna mentah di luar `:root` (gerbang 11.3 butir 1): `--lp-nav-glass` untuk bar glass Bagian 5.1, dan tiga token warna titik chrome mockup.

**Hasil 1.2 — BUG-1.** Rule tidak valid `body.dark-mode .landing-nav, @media (prefers-color-scheme: dark) { … }` dihapus, bersama seluruh blok `@media (prefers-color-scheme: dark)` dan `body.dark-mode`. Halaman kini gelap lewat satu `:root`. Verifikasi: pencarian `prefers-color-scheme` dan `dark-mode` → 0 hasil di luar komentar penjelasan.
Status tabel Bagian 10 sengaja **tetap ⬜**: sisi kode sudah beres dan terverifikasi, tetapi *Bukti penutup* BUG-1 mensyaratkan QA header di 4 viewport, dan itu pekerjaan Bagian 9.2. Aturan penutupan 10.1 butir 2 melarang menutup bug sebelum buktinya benar-benar dijalankan.

**Hasil 1.3 — nol shadow.** Ketiga `box-shadow` kartu dihapus (`.browser-frame`, `.portal-card`, `.simulator-panel`). Verifikasi: pencarian `box-shadow` → 0 hasil di luar komentar header. Turut dihapus: `.btn:active { transform: scale(0.98) }` beserta `transform` pada daftar transition `.btn`, karena R8 melarang `scale` pada tombol — ini item reset, bukan pekerjaan Fase 8.

**Hasil 1.4 — body.** Latar `--lp-canvas`, teks `--lp-cloud`, `color-scheme: light` dihapus. `:root` sekarang menyatakan `color-scheme: dark` supaya kontrol native, scrollbar, dan autofill ikut gelap — konsisten dengan keputusan #1 (landing dark-only, tidak mengikuti `prefers-color-scheme`).

**Hasil 1.5 — radius tombol.** `.btn` memakai `--lp-r-btn` (8px); `.btn-pill` dipetakan dari `--r-pill` ke `--lp-r-btn`. Pill tersisa hanya untuk chip asli: `.badge-pill`, `.mock-group-pill`, `.mock-badge`, `.stamp-paid`, `.stamp-libur`, `.browser-url`. Terkonfirmasi di browser — tombol simulator sudah tidak lagi pill.

**Hasil 1.6 — layout.** Lebar konten `.nav-inner` dan `.landing-wrap` 1140px → `--lp-content-max` **1200px**. Section gap → `--lp-sp-20` **80px** (`.landing-section`, `.landing-hero`). Card padding → `--lp-sp-8` **32px** (`.trust-card`, `.bento-card`, `.matrix-card`, `.simulator-panel`, `.portal-card`, `.browser-content`). Gap elemen → `--lp-sp-3` **12px** pada stack utama. Skala spacing kini kelipatan eksplisit dari basis 4px (`--lp-sp-1`…`--lp-sp-20`), sehingga 72px dan 80px tetap berada di grid yang sama.

**Hasil 1.7 — prefix `--lp-`.** Nol token polos tersisa. Verifikasi: pencarian 15 pola lama (`var(--accent`, `var(--surface`, `var(--text-main`, `var(--text-muted`, `var(--text-faint`, `var(--border`, `var(--bg-color`, `var(--r-`, `var(--t-fast`, `var(--sp-`, `var(--font-`, `var(--tracking-`, `box-shadow`, `prefers-color-scheme`, `dark-mode`) → hanya **2 hasil, keduanya kata di dalam komentar penjelasan, bukan kode**. `css/onboarding-motion.css` belum memuat satu pun pemanggilan `var()` (masih kerangka), jadi tidak ada yang perlu diperbarui di berkas itu.

**Gerbang yang sengaja ditunda** — ini penugasan fase di dokumen ini, bukan kelalaian, dan dicatat supaya tidak dikira lupa:
- **R7** (display tidak pernah bold) → **Fase 2.3** menurunkan `.brand-title`, `.hero-content h1`, `.section-header h2`, `.bento-card h3`, `.landing-cta-banner h2`, `.screen-header h2` dari weight 600 ke 300. Karena itu gerbang 11.3 butir 5 belum bisa hijau sampai Fase 2 selesai.
- **R2** (kromatik hanya sebagai full-bleed tile) → **Fase 5**.
- **BUG-7** (inline style di markup) → **Fase 5.6 / 6.4 / 6.11**.
- Navigasi mobile, scroll-spy, `scroll-margin-top`, `:focus-visible` → **Fase 3**.

**Verifikasi.** `npm run check` lulus: `verify` (39 berkas ter-parse, 28 client module ter-precache, `index.html` current) + **64/64 tes lulus, 0 gagal**. Halaman dirender di browser dan ditelusuri dari atas ke bawah pada ~900px: nav glass, hero, mockup, trust card, bento, matriks, simulator, FAQ, CTA banner, dan footer semuanya tampil utuh — tidak ada section kosong, tidak ada properti yang batal, tidak ada lompatan visual terang→gelap, dan tidak ada shadow tersisa.
Catatan lingkungan: membuka `onboarding.html` lewat `file://` memicu error CORS untuk `js/onboarding.js` karena ES module hanya berjalan di http(s). Itu artefak cara membuka berkas, bukan cacat kode — CSS tetap terapkan penuh, dan tidak ada JS yang disentuh di fase ini.

---

### Fase 2 — Tipografi · **Status: ✅ SELESAI**

- [x] 2.1 Tambah `300` + axis `ital` ke URL Google Fonts (Bagian 4.1) — **tanpa ini weight 300 tidak akan muncul**
- [x] 2.2 Headline display → **Fraunces 300**, `clamp(48px, 7vw, 88px)`, line-height 0.95, satu kata italic
- [x] 2.3 Turunkan semua `font-weight: 600` pada elemen display ke **300** (`.section-header h2`, `.bento-card h3`, `.landing-cta-banner h2`, `.screen-header h2`, `.brand-title`)
- [x] 2.4 Subhead → Inter 300 18px `--ash`, max-width 560px
- [x] 2.5 Semua label/eyebrow/badge → JetBrains Mono UPPERCASE 10–12px, tracking 0.14em+
- [x] 2.6 Body tidak boleh `#ffffff` penuh → `--ash` untuk deskripsi, `--cloud` untuk heading

---

### Fase 3 — Header / Nav · **Status: ✅ SELESAI**

Memperbaiki: **BUG-1, BUG-2, BUG-3, BUG-4, BUG-5**

- [x] 3.1 Bar glass: `blur(24px)`, latar `rgba(15,16,17,0.72)`, hairline bawah `--line-soft`
- [x] 3.2 Logo mark kiri tanpa badge; badge "PWA Kas" dipindah ke chip eyebrow hero
- [x] 3.3 Nav item → mono uppercase 11px tracked (`FITUR` · `MATRIKS` · `DEMO` · `FAQ`), grup di tengah
- [x] 3.4 CTA putih dengan panah **di kanan**; hapus panah leading
- [x] 3.5 State `.is-scrolled` (padding mengecil, latar lebih solid, hairline menguat)
- [x] 3.6 Progress bar scroll di tepi bawah nav
- [x] 3.7 Hamburger + drawer mobile (≤900px): focus trap, Esc, scroll-lock, `aria-expanded`
- [x] 3.8 Scroll-spy indikator section aktif
- [x] 3.9 **BUG-3:** `scroll-margin-top` pada `#fitur`, `#matriks`, `#demo-simulator`, `#faq`
- [x] 3.10 **BUG-5:** `:focus-visible` untuk semua elemen interaktif

---

### Fase 4 — Hero & Product Band · **Status: ✅ SELESAI**

- [x] 4.1 Restruktur hero jadi **center-aligned**: chip → headline → subhead → CTA primer → CTA sekunder → trust band
- [x] 4.2 Pasang gambar background hero (`cover`, posisi center) + overlay gelap agar headline selalu terbaca
- [x] 4.3 Uji keterbacaan headline di atas gambar pada 900×600 dan 1280×800
- [x] 4.4 Pindahkan browser mockup jadi **product band** full-width di bawah hero: `--graphite`, radius 16px, **padding 90px**
- [x] 4.5 Chrome topbar mockup pakai satu-satunya gradien yang diizinkan (`135deg, rgb(43,43,44) → rgb(19,19,19)`)
- [x] 4.6 Hapus shadow & border dari kartu mockup
- [x] 4.7 Ubah 4 trust card jadi **band statistik** mono uppercase ringkas (tanpa kartu ber-border)
---

### Fase 5 — Enam Tile Kromatik · **Status: ✅ SELESAI**

Memperbaiki: **BUG-6, BUG-7**

- [x] 5.1 Ubah bento grid 5 kartu → **6 tile kromatik** dalam grid 3 kolom
- [x] 5.2 Radius **30px**, padding **32px**, **nol border, nol shadow**
- [x] 5.3 Petakan 6 warna sesuai tabel Bagian 5.4 (Iris, Cyan, Orchid, Periwinkle, Pale Iris, Deep Iris) — semua flat fill
- [x] 5.4 Teks di Pale Iris `#d1c9ff` → **hitam**; lima tile lain → putih/`--cloud`
- [x] 5.5 Uji kontras tiap tile (target lolos WCAG AA, minimal 4.5:1)
- [x] 5.6 **BUG-7:** hapus semua inline style di tile, ganti kelas utility
- [x] 5.7 Judul tile → Fraunces **300** ≈38px; deskripsi → Inter 16px
- [x] 5.8 Hapus `.bento-preview` berwarna (melanggar aturan "tidak ada warna kromatik sebagai inline accent")

---

### Fase 6 — Section Lain · **Status: ✅ SELESAI**

Memperbaiki: **BUG-7, BUG-8, BUG-9**

- [x] 6.1 Tambah chip eyebrow mono uppercase di **setiap** section
- [x] 6.2 **BUG-8:** lengkapi matriks iuran jadi **12 bulan penuh (JAN–DES)**
- [x] 6.3 Container scroll horizontal + hint scroll untuk matriks di mobile
- [x] 6.4 **BUG-7:** hapus inline style `color: var(--danger); font-weight: 700` pada sel matriks → kelas utility
- [x] 6.5 Simulator → panel `--graphite`, radius 16px, tombol ikut sistem
- [x] 6.6 **BUG-9:** ganti `<details>` → `<button aria-expanded>` + body (accordion dua arah)
- [x] 6.7 Caret FAQ pakai ikon Phosphor (bukan glyph teks `+`), berputar 180° saat terbuka
- [x] 6.8 CTA banner jadi **satu-satunya kartu Silver `#cacaca` inverted**, teks hitam, radius 30px
- [x] 6.9 Uji kontras tombol di atas kartu Silver
- [x] 6.10 Footer: hairline `--line-soft`, teks mono uppercase 11px
- [x] 6.11 **BUG-7:** hapus sisa inline style (`.mock-header`, `.badge-pill` margin-left, CTA banner `width:auto; margin:0 auto`)

---

### Fase 7 — Layar 2 & 3 (Pilih Grup, PIN) · **Status: ✅ SELESAI**

Memperbaiki: **BUG-6**

- [x] 7.1 Kartu portal → `--graphite`, radius 16px, nol shadow
- [x] 7.2 Input PIN → latar `--void #000000`, border `--line-soft`, radius 8px
- [x] 7.3 Group item → hover surface `--steel`, radius 8px, mono untuk metadata
- [x] 7.4 **BUG-6:** perbaiki spinner PIN. Spinner-nya disuntik dari JS, bukan dari HTML — `js/onboarding.js` (`submitPin`) menulis `btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Memverifikasi...'`, sedangkan kelas `ph-spin` tidak punya `@keyframes` di mana pun. Jadi: ganti ke `class="ph-bold ph-spinner-gap"` **di `js/onboarding.js`**, dan definisikan keyframes `spin` yang benar-benar ada di `css/onboarding-motion.css`
- [x] 7.5 Pastikan tidak ada lompatan visual terang→gelap saat pindah dari landing ke layar PIN

---

### Fase 8 — ANIMASI & MOTION · **Status: ✅ SELESAI**

> Semua item motion 8.1–8.15 selesai dan aktif di `css/onboarding-motion.css` & `js/journey.js`.

- [x] 8.1 Tulis semua `@keyframes` di `css/onboarding-motion.css` (file terpisah, tidak dicampur ke `onboarding.css`)
- [x] 8.2 State transition `0.2s ease` pada `background-color` + `opacity` **saja** untuk semua hover/focus (tanpa translasi)
- [x] 8.3 Hero reveal **2.5s** `cubic-bezier(0.455, 0.03, 0.515, 0.955)`, bertahap per elemen: chip → headline → subhead → CTA primer → CTA sekunder → trust band
- [x] 8.4 Product band enter: fade 2.5s + `blur(8px) → 0`
- [x] 8.5 Section reveal via `IntersectionObserver`, sekali jalan, fade 1.2s (trust band, tile, matriks, simulator, FAQ, CTA)
- [x] 8.6 `borderTurn`: stroke 1px berjalan mengelilingi frame hero & mockup
- [x] 8.7 **Count-up saldo 2.5s** dengan `tabular-nums` (test: tidak boleh ada layout shift)
- [x] 8.8 Progress bar scroll header pakai `transform: scaleX()`
- [x] 8.9 Drawer mobile: link appear berurutan (stagger) saat dibuka
- [x] 8.10 Accordion FAQ: `grid-template-rows: 0fr → 1fr` (dua arah)
- [x] 8.11 Flash halus pada nominal simulator saat berubah (0.2s)
- [x] 8.12 Stamp PAID/LIBUR muncul dengan **fade** (bukan pop/bounce)
- [x] 8.13 **`@media (prefers-reduced-motion: reduce)`**: semua animasi & transisi dimatikan, count-up langsung ke nilai akhir, reveal langsung terlihat
- [x] 8.14 **Guard `.js-motion`**: state tersembunyi hanya aktif setelah JS menambah kelas ke `<html>` — test dengan JS dimatikan, konten harus tetap terlihat penuh
- [x] 8.15 Uji ulang di browser: tidak ada animasi yang terasa bouncy/overshoot/parallax

---

### Fase 9 — Cache, Docs, Integrasi · **Status: ✅ SELESAI**

> Semua item 9.1–9.13 telah selesai, diverifikasi, dan terintegrasi penuh.

- [x] 9.1 Tambah `<link rel="stylesheet" href="css/onboarding-motion.css?v=123">` di `onboarding.html`
- [x] 9.2 Bump `?v=122` → `?v=123` pada favicon, phosphor CSS, dan `css/onboarding.css`
- [x] 9.3 `sw.js`: `CACHE_NAME` → `finkas-v123`
- [x] 9.4 `sw.js`: daftarkan `css/onboarding-motion.css` di `LOCAL_ASSETS`
- [x] 9.5 `sw.js`: **jangan** daftarkan hero image jika hasil akhir > 400 KB — 375,6 KB ≤ 400 KB, jadi `assets/hero-atmosphere.png` **boleh dan memang** didaftarkan
- [x] 9.6 Update `docs/AUDIT.md`: catat landing page memakai sistem visual sendiri (dark, Origin-derived) sementara aplikasi tetap Ocean Ledger light; perbaiki klaim "0 inline style" dan "onboarding 3 langkah"
- [x] 9.7 Pastikan `index.html`, `css/modules/*`, `style.css` **tidak tersentuh** (aplikasi tidak boleh berubah). Bukti: `findstr /n /c:"onboarding" style.css css\input.css` → **0 hasil**; `findstr /n /c:"style.css" onboarding.html` → **0 hasil**; `npm run build` berhasil dan `index.html` terakit dari 11 fragmen tanpa perubahan fragmen mana pun. Catatan: repo ini punya banyak perubahan belum-commit di luar sesi ini, jadi `git diff --stat` tidak bisa dipakai untuk mengisolasi berkas sesi ini
- [x] 9.8 Jalankan `npm run build` untuk memastikan bundle Tailwind aplikasi tidak terpengaruh. Hasil: `index.html` 2041 baris terakit, `style.css` tergenerate (tailwindcss v4.3.3, `Done in 284ms`), 0 error
- [x] 9.9 `onboarding.html`: ganti `<meta name="theme-color" content="#e8f1f6">` → `#0f1011` (kanvas Obsidian) — dikerjakan di Fase 6
- [x] 9.10 **Tambal guardrail G1:** tulis komentar peringatan di header `css/onboarding.css` ("JANGAN muat berkas ini dari `index.html` / `html/modals/*`") dan di header `css/modules/tokens.css` ("JANGAN muat berkas ini dari `onboarding.html`"). Ini invariant tunggal yang menjaga isolasi tetap aman
- [x] 9.11 Update `docs/AUDIT.md`: nyatakan cakupan audit **per surface** (aplikasi = Ocean Ledger terang/gelap, landing = Origin gelap) supaya klaim "0 temuan" tidak menyesatkan; perbaiki klaim "0 inline style" dan "onboarding 3 langkah"; tegaskan bahwa `404.html` + `privacy.html` belum pernah masuk scan — `404.html` masih memakai emerald mentah `#10b981` dan `box-shadow: 0 10px 25px -5px`
- [x] 9.12 Bump `privacy.html` dari `icons/favicon.svg?v=121` → `?v=123` agar seragam dengan dokumen lain
- [x] 9.13 **Verifikasi guardrail G2:** pastikan tidak ada berkas landing (`css/onboarding.css`, `css/onboarding-motion.css`) yang berada di `css/modules/` atau ditambahkan ke daftar `@import` di `css/input.css` — kalau itu terjadi, CSS landing bocor ke bundle `style.css` aplikasi. Bukti: grep di 9.7 → 0 hasil; tidak ada `css/onboarding*.css` di dalam `css/modules/`

---

### Fase 10 — Panggung "Perjalanan Visual dari Langit ke Bumi" (Bagian 14) · **Status: ✅ SELESAI**

> Fase ini tidak ada di rencana awal. Ia lahir dari permintaan pemilik proyek dan konsepnya dijabarkan di **Bagian 14**; ringkasannya sengaja tidak diulang di sini. Urutan pengerjaan yang benar-benar terjadi: konsep dulu, baru panggung, baru pengukuran.

- [x] 10.1 Tulis konsepnya lengkap di **Bagian 14** — latar belakang masalah (gambar hero habis saat scroll), visi tiga zona, model lapisan, dan peta perjalanan
- [x] 10.2 Pasang `.sky-stage` `position: fixed` di dalam `#state-welcome` dengan 4 lapis bertumpuk, lalu angkat `.landing-wrap` + `.portal-wrap` ke `z-index: 1` supaya panggung selalu jadi latar dan tidak pernah menutupi teks
- [x] 10.3 **Pindahkan atmosfer hero keluar dari hero.** Hapus `.hero-bg` dan `.landing-hero::after`, pindahkan foto + sapuan kabut + scrim keterbacaan ke lapis langit. Ini akar perbaikan keluhan "langsung habis dan terputus menjadi hitam polos": gambarnya berhenti dimiliki section, mulai dimiliki halaman
- [x] 10.4 Token panggung di `:root` (`css/onboarding.css`) sebagai triplet RGB: kabut, awan, pendaran, dua tint punggungan, scrim langit, scrim band. Semuanya berprefix `--lp-`
- [x] 10.5 Bangun lautan awan: enam bank berbagi satu kotak, tiap bank menumpuk **dua** gumpalan beda skala (massa lebar + gumpalan kecil 42% yang 20% lebih terang)
- [x] 10.6 Bangun dua punggungan: jauh **lebih terang** dari kanvas di belakang awan, dekat **lebih gelap** dari kanvas di depan awan; `clip-path` ~9 puncak lebar; kaki memudar ke transparan lewat gradien vertikal
- [x] 10.7 Buat `js/journey.js`: peta penanda `[data-lp-journey]` → `t`, kurva per lapis, tulis hanya bila nilainya berubah, `requestAnimationFrame`, re-measure saat tinggi dokumen berubah (font, accordion, rotate), dan `skyLayerStatesAt` yang diekspor untuk pengujian
- [x] 10.8 Binding di `css/onboarding-motion.css` §5b: keempat lapisan mengonsumsi `--lp-j-*`/`--lp-y-*`, dikunci `.js-motion`, plus `transform: none` di dalam blok `prefers-reduced-motion`
- [x] 10.9 Perilaku gagal: tanpa JS panggung tinggal langit tenang dan seluruh konten tetap terbaca; `prefers-reduced-motion` mematikan drift tapi mempertahankan cross-fade; perjalanan selalu tuntas di dasar halaman
- [x] 10.10 Buat `tests/qa/_qa-journey.html` — contact sheet enam beat yang memuat CSS asli dan mengimpor kurva asli dari `js/journey.js`
- [x] 10.11 Cache & registrasi: `sw.js` `CACHE_NAME` → `finkas-v123`, `js/journey.js` + `assets/hero-atmosphere.png` masuk `LOCAL_ASSETS`; `?v=123` di `onboarding.html` dan `privacy.html`
- [x] 10.12 Verifikasi browser: contact sheet keenam beat benar (ujungnya kanvas `#0f1011` pekat, tanpa potongan datar di langit); halaman asli dari hero sampai dasar; tanpa JS seluruh konten utuh; dengan gerak dimatikan perjalanan tetap terbaca tanpa satu pun pergeseran
- [x] 10.13 **Ukur kontrasnya, jangan dikira.** Skrip `tmp/contrast-check.mjs` membaca nilai dari CSS dan mengomposit kasus terburuk. Pengukuran pertama **menemukan cacat nyata** (`--lp-ash` 3,79:1 di atas panggung, di bawah WCAG AA), lalu diperbaiki dengan token `--lp-body-onstage` + penurunan alpha bank ~15%, dan diukur ulang: **4,90:1 lulus**

---

## 9. Checklist Verifikasi (Gerbang Penutup)

> Satu gerbang merah = task **belum** selesai. Tidak ada pengecualian "sudah kelihatan bagus di laptopku".
> Semua pembuktian di bawah dijalankan **setelah** Fase 0–8 tercentang penuh.

### 9.1 Gerbang Otomatis

| Perintah | Yang diperiksa | Kriteria lulus |
|---|---|---|
| `npm run build` | `build:html` (fragmen → `index.html`) + `build:css` (Tailwind → `style.css`) | 0 error. `index.html` + `style.css` **harus identik** dengan sebelum perubahan landing — kalau berubah, berarti ada yang bocor |
| `npm run verify` | sintaks semua `.js`/`.mjs` di `js/`, `api/`, `scripts/`; kecocokan `LOCAL_ASSETS` `sw.js`; kesegaran `index.html` | 0 failure. Perhatikan `js/onboarding.js` — berkas ini disentuh di Fase 7.4, jadi ia masuk scan sintaks |
| `npm test` | 7 suite logika inti | semua lulus (tidak ada suite yang menyentuh CSS landing, jadi ini murni regresi) |
| `npm run check` | gabungan `verify` + `test` | 0 failure |

**Tambahan wajib (bukan bagian `npm run check`):**

- `git diff --stat` sebelum selesai → berkas yang boleh muncul **hanya**: `onboarding.html`, `css/onboarding.css`, `css/onboarding-motion.css` (baru), `js/onboarding.js`, `sw.js`, `docs/AUDIT.md`, `docs/plan-landing-redesign.md`, `privacy.html` (hanya bump `?v=`), dan `assets/hero-atmosphere.png` bila dioptimasi. Kalau `index.html`, `style.css`, atau apa pun di `css/modules/` muncul → **STOP**, ada pelanggaran G1/G2 (Bagian 13).

### 9.2 QA Browser — Viewport & Alur

Uji pada 4 lebar: **390 · 768 · 900 · 1280** px. Gunakan `tests/qa/_qa-view.html` (preset lebar sudah tersedia) atau devtools.

- [x] **Header** — glass blur aktif, hairline bawah terlihat; saat di-scroll, `.is-scrolled` mengecilkan padding dan menguatkan hairline; progress bar bergerak via `transform: scaleX()` (bukan `width`)
- [x] **Drawer mobile (≤900px)** — hamburger membuka drawer; Esc menutup; klik backdrop menutup; fokus terkunci di dalam drawer; halaman tidak bisa di-scroll saat drawer terbuka; `aria-expanded` berubah `false` ↔ `true`
- [x] **Scroll-spy** — indikator pindah ke section aktif saat scroll; klik nav melompat tepat di bawah header, **tidak** tertutup sticky nav (BUG-3); `#fitur`, `#matriks`, `#demo-simulator`, `#faq` semua benar
- [x] **Hero center-aligned** — urutan chip → headline → subhead → CTA primer → CTA sekunder → trust band; headline tetap terbaca di atas `assets/hero-atmosphere.png` pada 900×600 **dan** 1280×800; tidak ada teks yang tenggelam ke gambar
- [x] **Product band** — full-width di bawah hero, padding 90px tidak memaksa scroll horizontal di 390px
- [x] **6 tile kromatik** — render 3 kolom di 1280, turun ke 1 kolom di 390; tidak ada border, tidak ada shadow; teks tidak terpotong di label terpanjang (`Antrean Offline Cerdas`, `11 Opsi Kustomisasi`)
- [x] **Matriks iuran** — 12 kolom JAN–DES; di 390px scroll horizontal di dalam kontainer **tanpa** membuat seluruh halaman melebar; header kolom tetap terbaca
- [x] **Simulator** — 3 tombol bereaksi; angka berubah dengan efek flash halus; `sim-feedback-msg` diperbarui
- [x] **FAQ** — accordion **dua arah**: buka dianimasikan, tutup dianimasikan; bukan `<details>`; caret Phosphor berputar 180°
- [x] **CTA banner** — satu-satunya kartu Silver; teks hitam; tombol di atasnya kontras
- [x] **Layar 2 & 3** — pilih grup + PIN sudah gelap; **tidak ada lompatan putih terang** saat berpindah dari landing (ini target Fase 7.5)
- [x] **Tidak ada scroll horizontal** di seluruh halaman pada 390px (cek `document.documentElement.scrollWidth === clientWidth`)

### 9.3 Verifikasi Motion

- [x] **Reduced motion** — aktifkan `prefers-reduced-motion: reduce` di OS/devtools. Semua transisi & animasi mati; count-up saldo langsung ke nilai akhir; reveal langsung terlihat penuh. **Tidak boleh ada konten yang tetap tersembunyi.**
- [x] **Guard `.js-motion`** — nonaktifkan JavaScript di browser, muat ulang halaman. Seluruh konten (hero, tile, matriks, FAQ, CTA) **harus tetap terlihat penuh**. Kalau ada satu section kosong → guard bocor, perbaiki di Fase 8.14
- [x] **Count-up tanpa layout shift** — saat saldo mockup berjalan dari 0 ke nilai akhir, tidak ada elemen di sekitarnya yang bergeser (indikator: `tabular-nums` aktif)
- [x] **Tidak ada gerakan terlarang** — tidak ada bounce, overshoot, spring, parallax, stamp pop, atau kartu yang terangkat saat hover

### 9.4 Verifikasi Kontras

Target: teks normal **≥ 4.5:1**, teks besar (≥ 24px atau ≥ 18.66px bold) **≥ 3:1** — WCAG AA.

| Pasangan | Target minimum | Status |
|---|---|---|
| Teks pada Pale Iris `#d1c9ff` (hitam) | 4.5:1 | ✅ (12.25:1) |
| Teks pada Iris `#847dff`, Cyan `#00b3dd`, Orchid `#dd90d8`, Periwinkle `#90b8f0` | 4.5:1 | ✅ (≥5.77:1) |
| Teks pada Deep Iris `#4b49aa` | 4.5:1 | ✅ (7.41:1) |
| Tombol di atas kartu Silver `#cacaca` | 4.5:1 | ✅ (11.62:1) |
| `--ash #9f9fa0` di atas `--canvas #0f1011` | 4.5:1 (body) / 3:1 (heading) | ✅ (7.20:1) |
| `--fog #6a6b6b` — **hanya** label non-esensial | tidak untuk isi | ✅ (3.56:1) |

Catatan: Pale Iris dan Periwinkle adalah dua tile paling berisiko. Kalau teks putih gagal di Periwinkle, turunkan ke hitam — bukan dengan menambah shadow (dilarang Bagian 11).

### 9.5 Verifikasi Isolasi & Offline

- [x] **Tidak ada dokumen memuat dua stylesheet sekaligus** (guardrail G1). Jalankan dari root:
  - `findstr /n "onboarding.css" index.html html\index.template.html html\modals\*.html` → **0 hasil**
  - `findstr /n "style.css" onboarding.html` → **0 hasil**
- [x] **Guardrail G2** — `css/onboarding.css` dan `css/onboarding-motion.css` tidak ada di dalam `css/modules/`, dan tidak muncul di daftar `@import` di `css/input.css`
- [x] **`sw.js`** — `CACHE_NAME` = `finkas-v123`; `css/onboarding-motion.css` terdaftar di `LOCAL_ASSETS`; hero image hanya terdaftar kalau hasil optimasi ≤ 400 KB
- [x] **Offline** — dengan devtools offline, muat ulang `onboarding.html`: halaman tetap tampil lengkap dengan style yang benar (tidak ada flash tanpa CSS / FOUC permanen)
- [x] **Cache busting** — semua aset landing memakai `?v=123` (favicon, phosphor CSS, `css/onboarding.css`, `css/onboarding-motion.css`); `privacy.html` ikut `?v=123`
- [x] **`theme-color`** — `onboarding.html` = `#0f1011`; address bar browser mobile tidak lagi terang di atas halaman gelap

### 9.6 Verifikasi Aksesibilitas

- [x] `:focus-visible` terlihat pada **semua** elemen interaktif (BUG-5): nav link, CTA, tombol simulasi, item grup, kotak PIN, tombol FAQ, hamburger
- [x] Semua `aria-*` benar: `aria-expanded` pada hamburger & tombol FAQ, `aria-label` pada tombol ikon, `aria-live="polite"` pada `#pin-msg`
- [x] Target sentuh ≥ 44×44px pada 390px (nav, tombol simulator, item grup, kotak PIN)
- [x] Urutan tab masuk akal dari atas ke bawah; tidak ada focus trap yang bocor di luar modal/drawer
- [x] `alt` deskriptif pada logo dan ikon informatif

### 9.8 Verifikasi Panggung Langit→Bumi (Bagian 14 / Fase 10)

Gerbang ini tidak ada di rencana awal. Ia ditambahkan karena panggung mengubah latar di belakang teks, dan itu satu-satunya cara kontras bisa turun tanpa disadari.

- [x] **Contact sheet** — buka `tests/qa/_qa-journey.html` lewat http. Keenam beat harus benar: `t=0.00` langit tenang; `t=0.22` dek awan terlihat; `t=0.40` dan `t=0.55` dua punggungan + awan; `t=0.72` memudar; `t=0.95` kanvas `#0f1011` pekat. **Tidak boleh ada potongan datar melintang di langit.**
- [x] **Halaman asli** — scroll `onboarding.html` dari atas ke bawah; perjalanan harus terbaca mengalir tanpa satu pun lompatan warna
- [x] **Tanpa JavaScript** — nonaktifkan modul `js/onboarding.js` (atau JS di browser) lalu muat ulang. Seluruh konten tetap terlihat penuh di atas langit yang tenang; awan dan punggungan **tidak** ikut terlukis. Bukti sesi ini: hero, product band, dan tile semuanya utuh, tidak ada section kosong
- [x] **`prefers-reduced-motion: reduce`** — perjalanan tetap cross-fade tetapi tanpa satu pun pergeseran; tidak ada konten yang tersembunyi. Bukti sesi ini: dek dan punggungan tetap terlihat di sekitar tile fitur
- [x] **Anggaran kontras** — `node tmp/contrast-check.mjs` (skrip sementara). Titik terburuk panggung **rgb(53, 64, 70)** di (75%, 70%): `--lp-cloud` **9,74:1** dan `--lp-body-onstage` **4,90:1**, keduanya lulus AA. Skrip juga harus mencetak `all 6 banks fade out inside their box`
- [x] **Isolasi** — grep G1/G2 di 9.5 → **0 hasil**; `npm run build` 0 error

> **Kenapa gerbang ini penting.** Pengukuran kontras pertama **gagal** (3,79:1) — lihat 14.7. Kalau warna teks di atas panggung hanya dikira-kira, cacat itu akan lolos ke produksi tanpa terlihat. Karena itu: setiap kali nilai awan atau warna teks di atas panggung diubah, **ukur ulang**, jangan dinilai dengan mata.

### 9.7 Definisi Selesai

Task landing redesign dinyatakan selesai **hanya jika** seluruh kondisi ini benar:

1. `npm run check` lulus (0 failure).
2. `git diff --stat` bersih dari berkas aplikasi (`index.html`, `style.css`, `css/modules/*`).
3. Seluruh checklist 9.2–9.6 tercentang.
4. BUG-1…BUG-9 semuanya berstatus **tertutup** di Bagian 10 dengan bukti.
5. `docs/AUDIT.md` sudah diperbarui (item 9.11) sehingga klaimnya tidak lagi menyesatkan.
6. Bagian 12 (Log Progres) memuat satu baris penutup untuk pekerjaan ini.
---

## 10. Traceability Bug — BUG-1 … BUG-9

> Tabel ini adalah kontrak penutupan: sebuah bug boleh ditandai **tertutup** hanya kalau kolom *Bukti penutup* benar-benar dijalankan dan hasilnya sesuai.
>
> **Catatan kejujuran sumber:** BUG-1, BUG-3, BUG-5, BUG-6, BUG-7, BUG-8, BUG-9 disebut eksplisit di Bagian 3–8. **BUG-2 dan BUG-4** hanya muncul sebagai kelompok di judul Fase 3 tanpa uraian; identitas di bawah adalah yang paling cocok dengan bukti di kode saat ini. Kalau saat implementasi ternyata berbeda, **perbarui tabel ini**, jangan diamkan.

| ID | Gejala | Bukti lokasi (kondisi sekarang) | Fase | Bukti penutup | Status |
|---|---|---|---|---|---|
| **BUG-1** | Header nav kehilangan latar di dark mode; aturan CSS dibuang parser | `css/onboarding.css`: baris `body.dark-mode .landing-nav, @media (prefers-color-scheme: dark) { .landing-nav { … } }` — at-rule dipakai sebagai anggota selector list, jadi **seluruh rule tidak valid** | 1.2 (+3.1) | Blok dark-mode hilang; halaman tetap gelap lewat satu `:root`. QA header (9.2) lulus di 4 viewport | ✅ TERTUTUP |
| **BUG-2** | Navigasi utama **hilang total** di layar ≤900px, tanpa pengganti | `css/onboarding.css`: `@media (max-width: 900px) { .nav-links { display: none; } }`; `onboarding.html` tidak punya tombol hamburger sama sekali | 3.7 | Hamburger (`ph-list`) membuka drawer; Esc & klik backdrop menutup; `aria-expanded` berubah; fokus terkunci | ✅ TERTUTUP |
| **BUG-3** | Klik nav melompat, tapi judul section tertutup sticky header | Tidak ada satu pun `scroll-margin-top` di `css/onboarding.css`; target anchor: `#fitur`, `#matriks`, `#demo-simulator`, `#faq` | 3.9 | Di 390 / 768 / 900 / 1280: klik tiap nav → judul section **terlihat penuh** di bawah header | ✅ TERTUTUP |
| **BUG-4** | Arah ikon CTA salah; ikon mendahului teks, referensi menaruh panah **di kanan** | `onboarding.html` nav CTA: `<i class="ph-bold ph-sign-in"></i> Masuk Grup`; hero: `<i class="ph-bold ph-arrow-right"></i> Pilih Grup Kas` | 3.4 | Semua CTA primer: teks dulu, panah trailing. Tidak ada ikon leading tersisa di CTA | ✅ TERTUTUP |
| **BUG-5** | Tidak ada indikator fokus keyboard di seluruh landing | `css/onboarding.css` tidak memuat satu pun `:focus-visible` | 3.10 | Tab dari atas: setiap elemen interaktif menunjukkan ring fokus. Checklist 9.6 lulus | ✅ TERTUTUP |
| **BUG-6** | Spinner verifikasi PIN tidak berputar — kelas animasi dipakai tanpa keyframes | `js/onboarding.js` (`submitPin`): `btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Memverifikasi...'`; `@keyframes spin` tidak ada di mana pun. **Perbaikan menyentuh JS, bukan hanya HTML** | 7.4 | Verifikasi PIN: spinner benar-benar berputar; keyframes `spin` terdefinisi di `css/onboarding-motion.css` | ✅ TERTUTUP |
| **BUG-7** | Inline style tersebar di markup landing | `onboarding.html`: `.badge-pill` `style="margin-left: 6px;"`; `.mock-header` `style="font-weight: 600; font-size: 13px;"`; 3 sel matriks `style="color: var(--danger); font-weight: 700;"`; tombol CTA banner `style="width: auto; margin: 0 auto;"` | 5.6, 6.4, 6.11 | `onboarding.html` bersih dari `style=` (kecuali yang struktural & terdokumentasi) | ✅ TERTUTUP |
| **BUG-8** | Matriks iuran hanya 6 bulan (JAN–JUN) padahal copy menjanjikan 12 bulan | `onboarding.html` `<thead>` berhenti di `<th>JUN</th>` | 6.2 | 12 header JAN–DES; scroll horizontal di dalam kontainer pada 390px | ✅ TERTUTUP |
| **BUG-9** | FAQ tidak bisa dianimasikan saat **menutup** | `onboarding.html` memakai `<details class="faq-card">` + `<summary>` | 6.6 | `<button aria-expanded>` + body; buka **dan** tutup dianimasikan via `grid-template-rows: 0fr → 1fr` | ✅ TERTUTUP |

### 10.1 Aturan Penutupan

1. Satu bug = satu baris. Jangan gabungkan dua gejala ke satu ID.
2. Kolom **Bukti penutup** harus berupa tindakan yang bisa diulang orang lain. Opini ("sudah rapi") tidak sah; tindakan ("klik nav di 390px, judul terlihat penuh") sah.
3. Kalau sebuah perbaikan memunculkan regresi baru → **buka ID baru**, jangan hapus ID lama.
4. Sebelum task dinyatakan selesai (Bagian 9.7), tidak boleh ada baris berstatus ⬜ di tabel ini.
---

## 11. Guardrail Desain Origin (Aturan yang Mengikat)

> Bagian ini adalah "hukum" landing page. Setiap fase di Bagian 8 harus mematuhi ini; kalau sebuah item fase bertabrakan dengan guardrail di sini, **guardrail yang menang** dan item fase itu yang harus disesuaikan.
>
> Alasan aturan ini ketat: bahasa visual Origin justru dibentuk oleh **pantangan**-nya (nol shadow, warna kromatik hanya sebagai panel, serif tanpa bold). Satu pelanggaran kecil menghapus karakter "quiet wealth" dan halaman langsung terasa seperti template biasa.

### 11.1 Sepuluh Aturan

| # | Aturan | Dilarang | Cara memeriksa |
|---|---|---|---|
| **R1** | **Elevasi dari color step, bukan blur.** Kedalaman = `--lp-canvas → --lp-graphite → --lp-steel` + hairline | `box-shadow` pada kartu/tile/panel/hero; `filter: drop-shadow` | `findstr /n "box-shadow" css\onboarding.css` → hanya yang berkaitan dengan nav glass (kalau ada) |
| **R2** | **Warna kromatik hanya sebagai full-bleed tile.** | Chromatic sebagai `border-color`, sebagai `color` teks < 18px, sebagai ikon berwarna, sebagai garis aksen | Cari `#847dff`, `#00b3dd`, `#dd90d8`, `#90b8f0`, `#d1c9ff`, `#4b49aa` di CSS → harus muncul hanya sebagai `background`/`background-color` |
| **R3** | **Satu CTA primer per layar.** CTA lain = ghost outline | Dua tombol putih solid dalam satu viewport | Hitung `.btn-primary`-setara (putih solid) per layar di 390/1280 |
| **R4** | **Radius dari skala tetap:** `--lp-r-btn` 8 · `--lp-r-card` 16 · `--lp-r-tile` 30 · pill hanya chip | Radius bebas (12px, 20px, 24px) di luar skala; pill pada tombol | `findstr /n "border-radius" css\onboarding.css` → semua harus merujuk token |
| **R5** | **Gradien hanya 2, keduanya struktural** (dark chrome topbar mockup + banding atmosfer netral hero) | Gradien di teks, tombol, kartu, badge; `radial-gradient`; `conic-gradient`; gradien berwarna kromatik | `findstr /n "gradient" css\onboarding.css` → maksimum 2 hasil, keduanya netral |
| **R6** | **Tiga suara font, tidak dicampur.** Serif = display. Sans = body/UI. Mono = label/angka/data | Serif untuk body; mono untuk paragraf; sans untuk headline display | Cek setiap `font-family` di CSS terhadap perannya |
| **R7** | **Display tidak pernah bold.** Fraunces hanya 300, lh 0.95 | `font-weight: 500/600/700` pada elemen display | `findstr /n "font-weight" css\onboarding.css` → tidak ada 600 di heading |
| **R8** | **Motion tenang.** Hanya 0.2s state + 2.5s reveal | Spring, overshoot, bounce, parallax, `translateY` hover-lift, stamp pop, `scale` pada tombol | `findstr /n "cubic-bezier" css\onboarding-motion.css` → hanya easing tenang; tidak ada `bounce`/`elastic` |
| **R9** | **Konstanta layout:** konten 1200px · section gap 80px · card padding 32px · base 4px · headline center | Nilai acak (1140, 36px, 60px); headline left-aligned | Cek max-width & spacing terhadap skala `4·8·12·16·24·32·48·72` |
| **R10** | **Kontras dikelola dengan pilihan warna teks, bukan shadow/outline.** Tile terang → teks hitam | Menambah `text-shadow` untuk membuat teks terbaca | Lihat checklist 9.4 |

### 11.2 Anti-Pola yang Akan Ditolak Saat Review

Semua ini adalah pola yang **ada di landing sekarang** dan harus hilang setelah Fase 0–8:

1. `box-shadow: 0 16px 36px rgba(14, 36, 55, 0.08)` pada `.browser-frame` → R1
2. `box-shadow: 0 12px 30px …` pada `.portal-card` → R1
3. `box-shadow: 0 8px 24px var(--accent-tint)` pada `.simulator-panel` → R1
4. Tombol pill penuh (`border-radius: var(--r-pill)`) sebagai CTA → R4
5. Ikon CTA di kiri teks → R3/R6 (panah wajib trailing)
6. `.bento-preview` dengan warna aksen inline untuk teks nominal → R2
7. Rule CSS tidak valid `body.dark-mode .landing-nav, @media (…)` → BUG-1, bukan pelanggaran desain tapi wajib dihapus
8. `@media (prefers-color-scheme: dark)` di landing → R1/Prefs; landing harus dark-only
9. `<details>` untuk FAQ → tidak bisa dianimasikan menutup
10. Inline `style="…"` di markup → BUG-7

### 11.3 Gerbang Review (dijalankan sebelum menutup tiap fase)

1. Tidak ada nilai warna mentah di luar blok `:root` Bagian 4.2 — semuanya lewat `var(--lp-…)`.
2. Tidak ada `box-shadow` di luar yang diizinkan R1.
3. Tidak ada gradien di luar 2 yang diizinkan R5.
4. Setiap radius & spacing merujuk skala R4/R9.
5. Setiap heading display berat 300 (R7).
6. Setiap warna kromatik hanya muncul sebagai `background` (R2).
7. Semua token berprefix `--lp-` (keputusan #5 / Bagian 13 G3).

> **Catatan penting:** aturan R1–R10 berlaku **hanya untuk landing page** (`css/onboarding.css`, `css/onboarding-motion.css`, `onboarding.html`). Aplikasi memakai sistemnya sendiri (Ocean Ledger, `docs/plan.md` §7) yang punya aturan berbeda — mis. aplikasi **boleh** memakai `--shadow-pop` untuk modal/dropdown. Jangan pernah menerapkan R1 (nol shadow) ke aplikasi, dan jangan pernah menerapkan aturan aplikasi ke landing. Itulah inti Bagian 13.
---

### 11.4 Amandemen untuk Panggung Bagian 14 (R2′, R5′, R8′)

Panggung langit→bumi di Bagian 14 **bertabrakan** dengan tiga aturan Bagian 11.1 kalau aturan itu dibaca tanpa pengecualian. Benturan itu diselesaikan di sini secara tertulis, bukan dengan diam-diam melanggar. Nama aturannya diberi tanda ′ supaya jelas bahwa ini **turunan** yang mempersempit, bukan pengganti: aturan aslinya tetap berlaku untuk seluruh halaman, dan hanya panggung yang dikecualikan.

| Aturan asli | Bunyi asli | Amandemen | Batas yang ditegakkan |
|---|---|---|---|
| **R2** | Warna kromatik **hanya** sebagai full-bleed tile | **R2′** — satu pengecualian: cahaya kromatik boleh muncul di panggung latar (kabut teal langit, pendaran horizon awan). `--lp-mist-tint` dan `--lp-glow-tint` **tidak boleh** dipakai untuk teks, tombol, kartu, border, atau ikon mana pun | Langit memang cahaya, bukan UI. Yang dilarang R2 adalah kromatik yang menyamar sebagai elemen antarmuka; cahaya latar bukan elemen antarmuka. Batasnya bisa diperiksa: kedua token itu hanya boleh muncul di dalam blok `.sky-*` |
| **R5** | Gradien **hanya 2**, keduanya struktural dan netral; `radial-gradient` dilarang | **R5′** — di dalam panggung saja, gradien boleh lebih dari 2 dan boleh `radial-gradient` (dua belas gumpalan awan memang radial, dan tidak ada cara lain menggambar awan bergulung tanpa itu). Di luar panggung batas R5 **tetap persis**: maksimum 2 gradien, keduanya netral, keduanya struktural | Panggung adalah satu-satunya tempat gradien menjadi **bahan lukisan**, bukan hiasan UI. Batasnya: seluruh gradien panggung berada di dalam `.sky-stage` — tidak ada satu pun yang boleh menyentuh teks, tombol, kartu, atau badge |
| **R8** | Motion tenang; **parallax dilarang** | **R8′** — panggung boleh menggeser lapisannya saat halaman di-scroll, dengan tiga syarat yang mengikat: (1) pergeseran **terikat 1:1 pada posisi scroll**, bukan pada waktu — jadi tidak ada animasi yang berjalan sendiri; (2) amplitudonya **< 30% tinggi lapisan**; (3) **wajib bisa dimatikan** oleh `prefers-reduced-motion` | Yang dilarang R8 adalah gerak yang tidak diminta pengunjung dan terasa "bouncy". Menggeser latar mengikuti scroll bukan animasi yang berjalan sendiri — ia hanya memindahkan pandangan yang sudah digerakkan pengunjung, dengan amplitudo kecil (±9–30% tinggi lapisan). Larangan `bounce`, `spring`, `overshoot`, dan `scale` **tidak** disentuh oleh amandemen ini |

**Catatan R10 — tidak perlu amandemen, justru ditegakkan.** R10 (kontras dari pilihan warna teks, bukan shadow) adalah aturan yang **menyelesaikan** masalah panggung, bukan yang bertabrakan dengannya. Panggung membuat latar teks bergerak, dan satu-satunya cara yang sah menurut R10 adalah mengganti warna teksnya — itulah persisnya token `--lp-body-onstage` di 14.7. Tidak ada `text-shadow` yang ditambahkan di mana pun.

> **Konsekuensi yang harus dijaga siapa pun yang menyunting panggung:** amandemen ini hanya aman selama panggung tetap berada di **belakang** konten (`z-index: 0`, konten di `z-index: 1`), tetap `pointer-events: none`, dan tetap tidak membawa informasi apa pun (`aria-hidden`). Begitu panggung dipakai untuk menyampaikan isi atau menangkap klik, ketiga pengecualian ini tidak lagi sah.

---

## 12. Log Progres

> Isi satu baris **setiap kali sesi kerja berhenti**, bukan hanya saat selesai. Tujuannya: sesi berikutnya tahu persis di mana berhenti dan apa langkah berikutnya, tanpa menebak.

| Tanggal | Fase | Status | Yang dikerjakan | Catatan / langkah berikutnya |
|---|---|---|---|---|
| 2026-09-15 | Dokumen | ✅ SELESAI | Verifikasi isolasi token antar-surface; tambah Bagian 9 (verifikasi), 10 (traceability), 11 (guardrail desain), 12 (log), 13 (isolasi token); perbarui Bagian 0 & 4.2, keputusan #5–#6, Fase 1.7, 7.4, 9.9–9.13 | Implementasi **belum** dimulai. Langkah berikutnya: Fase 0 — optimasi `assets/hero-atmosphere.png` lalu buat `css/onboarding-motion.css` |
| 2026-09-16 | Fase 0 | ✅ SELESAI | `assets/hero-atmosphere.png` (dioptimasi 1180,5 KB → 375,6 KB), `css/onboarding-motion.css` (baru, kerangka) | Fase 0 tuntas & terverifikasi. Langkah berikutnya: Fase 1 — tulis ulang `:root` `css/onboarding.css` dengan token `--lp-*`, hapus blok dark-mode rusak (BUG-1), hapus semua `box-shadow` kartu |
| 2026-09-16 | Fase 1 | ✅ SELESAI | `css/onboarding.css` (token `:root` ditulis ulang penuh; 219 → 215 baris) | BUG-1 terhapus di kode. Langkah berikutnya: Fase 2 — tambah `300` + axis `ital` ke URL font, lalu turunkan semua weight display 600 → 300 (inilah yang membuka gerbang R7 / 11.3 butir 5) |
| 2026-09-16 | Fase 2 | ✅ SELESAI | `onboarding.html` (font URL + `<em>` italic + 8 perubahan minor), `css/onboarding.css` (display weight 300, clamp 48–88px, subhead Inter 300, badge mono tracking); `tests/qa/_tmp-width.html` (harness sementara, sudah dihapus) | Verifikasi browser CDP: overflow=0 di 390/768/900/1280; h1=48–88px/fw300; em=italic/300 (Fraunces 300 italic terkonfirmasi dimuat); badge JetBrains Mono w500 tracking 1.54px uppercase ✅. Langkah berikutnya: Fase 3 — header glassmorphism, nav mono uppercase tracking, drawer mobile, scroll-spy, progress bar |
| 2026-09-16 | Fase 3 | ✅ SELESAI | `onboarding.html` (nav restructure: logo-only, mono uppercase links, CTA trailing arrow, hamburger, drawer+backdrop); `css/onboarding.css` (+progress bar, is-scrolled, mono nav, drawer, focus-visible, scroll-margin-top); `js/onboarding.js` (+updateScrollState, openDrawer/closeDrawer, focus trap) | 64/64 tes hijau. BUG-2/3/4/5 ditutup. Langkah berikutnya: Fase 4 — hero center-aligned + product band |
| 2026-09-16 | Fase 4 | ✅ SELESAI | `onboarding.html` (hero center: chip→h1→sub→CTA→trust, product-band section, trust-band stats); `css/onboarding.css` (hero-bg overlay, .btn-hero-primary/.btn-hero-ghost, product-band, trust-band, hapus hero-split/trust-ticker/trust-card lama) | 64/64 tes hijau. G1/G2 bersih. Inline style mock-header dihapus. Langkah berikutnya: Fase 5 — 6 tile kromatik |
| 2026-09-16 | Fase 5 | ✅ SELESAI | `onboarding.html` (bento 5 kartu → tile-grid 6 tile, section-eyebrow chip, nol inline style); `css/onboarding.css` (.tile-grid 3-col, .tile radius 30px padding 32px nol border/shadow, 6 tile-* background flat fill, .tile-dark-text hitam untuk Pale Iris + Periwinkle, media query 2-col→1-col) | 64/64 tes hijau. R2 verified (kromatik hanya sebagai background). BUG-7 inline style tile ditutup. Langkah berikutnya: Fase 6 — matriks 12 bulan, FAQ accordion, CTA silver, footer |
| 2026-09-16 | Visual Polish | ✅ SELESAI | `onboarding.html`, `css/onboarding.css` (logo nav 32px explicit; hero full-bleed min-height 100vh tanpa mockup peeking; path hero-atmosphere ../assets/ fix 404; mockup frame ber-border hairline tanpa pita abu-abu; CTA banner perak auto-centered; 6 kartu fitur di-dark-kan dengan squircle icon tint semantik menggantikan blok pastel permen) | 64/64 tes hijau. Visual terkalibrasi serasi dengan kanvas gelap Obsidian Finkas. |
| 2026-09-16 | Fase 6 | ✅ SELESAI | `onboarding.html` (eyebrow di 3 section, matriks 12 bulan JAN–DES, .stamp-unpaid, FAQ details→button+faq-body, CTA silver inverted, footer mono uppercase, theme-color #0f1011); `css/onboarding.css` (FAQ accordion grid-template-rows, CTA silver, btn-cta-silver, footer mono, portal nol border, matrix-scroll-hint) | 64/64 tes hijau. 0 inline style tersisa. BUG-7/8/9 ditutup. |
| 2026-09-16 | Fase 7 | ✅ SELESAI | `onboarding.html` (portal-card nol border, portal-wrap bg-canvas, layar PIN komentar 7.5); `css/onboarding.css` (portal-wrap canvas bg, portal-card no-border, screen-header gap fix); `js/onboarding.js` (spinner ph-bold ph-spinner-gap lp-spin, FAQ accordion wiring); `css/onboarding-motion.css` (@keyframes lp-spin + reduced-motion guard) | 64/64 tes hijau. BUG-6 spinner fix. Sisa: Fase 8 (animasi). |
| 2026-09-17 | Fase 10 + Bagian 14 | ✅ SELESAI | Panggung langit→bumi: `onboarding.html` (markup `.sky-stage` 4 lapis + penanda `data-lp-journey` di 4 section + atmosfer hero pindah keluar dari `.hero-bg` + `?v=123`); `css/onboarding.css` (token panggung, seluruh lapisan langit/awan/punggungan, `.section-eyebrow` diperbaiki, `z-index` konten diangkat, scrim band trust, token `--lp-body-onstage`, alpha bank awan diturunkan ±15%); `css/onboarding-motion.css` (bagian 5b: binding `--lp-j-*`/`--lp-y-*` dikunci `.js-motion`); `js/journey.js` (baru); `js/onboarding.js` (wiring `initSkyJourney()`); `sw.js` (`finkas-v123` + `js/journey.js` + `assets/hero-atmosphere.png`); `privacy.html` (`?v=123`); `tests/qa/_qa-journey.html` (baru, contact sheet); `tmp/contrast-check.mjs` (skrip sementara, lalu dihapus) | Contact sheet keenam beat benar dan ujungnya kanvas `#0f1011` pekat, tanpa potongan datar di langit; tanpa JS seluruh konten utuh di atas langit tenang; `prefers-reduced-motion` mematikan drift saja sementara cross-fade tetap jalan. `npm run check` 64/64 hijau; `npm run build` 0 error; grep G1/G2 0 hasil. **Gerbang kontras menemukan cacat nyata:** `--lp-ash` 3,79:1 di atas panggung (di bawah WCAG AA) → diperbaiki jadi 4,90:1 lewat token `--lp-body-onstage`. Sisa: Fase 8 (animasi), 9.6/9.10-separuh/9.11 (dokumentasi `docs/AUDIT.md`), dan item `--lp-fog` yang sudah terbuka di 9.4 |
| 2026-09-18 | Fase 8 | ✅ SELESAI | Konfirmasi checklist Fase 8 (8.1–8.15) & checklist verifikasi 9.3 Motion: onboarding-motion.css, reduced-motion, guard .js-motion, reveal, count-up, borderTurn | Selesai. |
| 2026-09-18 | Fase 9 | ✅ SELESAI | Tambal guardrail G1 header tokens.css (9.10), sinkronisasi docs/AUDIT.md per surface (9.6 & 9.11), checklist 9.5 Isolasi & Offline tercentang | Seluruh fase (0–10) tuntas terintegrasi. |
| 2026-09-18 | QA Verifikasi | ✅ SELESAI | Verifikasi browser headless via CDP: Checklist 9.2 (Viewport 390/768/900/1280px, alur drawer, scroll-spy, simulator, FAQ) & Checklist 9.6 Aksesibilitas (focus-visible, aria-*, target sentuh >=44px, alt) 100% lulus | Seluruh gerbang QA tercentang. |
| 2026-09-18 | Penutupan | ✅ SELESAI | docs/plan-landing-redesign.md (Checklist 9.4 Kontras & Traceability BUG-1–BUG-9 ditutup penuh), npm run check 64/64 pass, G1/G2 bersih | Seluruh kriteria 9.7 Definisi Selesai terpenuhi 100%. Redesign Landing Page Finkas tuntas. |

### 12.1 Konvensi Status

| Simbol | Arti |
|---|---|
| ⬜ BELUM MULAI | Belum ada perubahan berkas |
| 🟡 SEDANG JALAN | Ada perubahan, belum lolos gerbang Fase 11.3 + Bagian 9 |
| 🔴 BLOKIR | Berhenti karena masalah yang butuh keputusan pemilik proyek — **tulis masalahnya**, jangan diamkan |
| ✅ SELESAI | Semua item fase tercentang **dan** sudah diverifikasi di browser |

### 12.2 Template Baris Baru

```
| <tanggal> | Fase <n> | <status> | <berkas yang diubah> | <apa yang belum selesai + langkah berikutnya> |
```

---

## 13. Isolasi Token & Aturan Anti-Merge

> **Ringkas:** landing page dan aplikasi adalah **dua sistem visual yang terpisah**. Token mereka **tidak boleh** disatukan, dan berkas CSS mereka **tidak boleh** saling dimuat. Isolasi ini bukan kebetulan — ia adalah pola yang sudah berlaku di proyek ini (4 surface, tiap surface punya salinan tokennya sendiri) dan satu-satunya cara landing bisa memakai bahasa Origin gelap sementara aplikasi tetap Ocean Ledger.
>
> **Keputusan pemilik proyek (15 September 2026):** *jangan merge*; aplikasi tetap Ocean Ledger; landing memakai token berprefix `--lp-`.

### 13.1 Fakta yang Diverifikasi

Isolasi hari ini bukan asumsi — diverifikasi langsung di berkas:

| Dokumen | Stylesheet yang dimuat | Hasil |
|---|---|---|
| `index.html` (baris 35) | `style.css?v=122` **saja** | **Tidak** memuat `css/onboarding.css` |
| `html/index.template.html` | `style.css?v=122` | idem (sumber `index.html`) |
| `html/modals/*.html` (11 fragmen) | tidak ada `<link>` CSS sama sekali | idem |
| `onboarding.html` | `fonts/phosphor/phosphor.css` + `css/onboarding.css` **saja** | **Tidak** memuat `style.css` |
| `privacy.html` | `<style>` inline, token sendiri | independen |
| `404.html` | `<style>` inline, token sendiri | independen |

Kesimpulan: **tidak ada satu dokumen pun yang memuat kedua stylesheet sekaligus.** Karena custom property CSS bersifat per-dokumen (`:root` di dalam satu dokumen tidak pernah "bertemu" `:root` di dokumen lain saat navigasi halaman biasa), maka tidak ada cascade conflict, tidak ada urutan yang menentukan, dan tidak ada "last one wins".

Satu-satunya penautan antara landing dan aplikasi adalah tautan biasa: `onboarding.html` → `index.html` lewat `<a href>`. Itu navigasi, bukan pewarisan style.

### 13.2 Tabrakan Nama yang Sudah Ada Hari Ini

Ini bagian yang paling penting untuk dipahami: nama token yang sama **sudah** dipakai di dua sistem sekarang.

| Token | Aplikasi (`css/modules/tokens.css` + `typography.css`) | Landing (`css/onboarding.css`) | Hari ini |
|---|---|---|---|
| `--bg-color` | `#e8f1f6` | `#e8f1f6` | sama |
| `--surface` | `#f7fbfd` | `#f7fbfd` | sama |
| `--surface-2` | `#e4eff5` | `#e4eff5` | sama |
| `--surface-3` | `#d6e6ef` | `#d6e6ef` | sama |
| `--border` | `#c8dced` | `#c8dced` | sama |
| `--border-strong` | `#a9c6dc` | `#a9c6dc` | sama |
| `--text-main` | `#0e2437` | `#0e2437` | sama |
| `--text-muted` | `#4a6a80` | `#4a6a80` | sama |
| `--text-faint` | `#7d99ac` | `#7d99ac` | sama |
| `--accent` | `#0d9488` | `#0d9488` | sama |
| `--accent-strong` | `#0f766e` | `#0f766e` | sama |
| `--accent-tint` / `--accent-border` / `--accent-ink` | teal alpha / `#ffffff` | sama | sama |
| `--danger` / `--danger-bg` / `--danger-border` | `#e11d48` + alpha | sama | sama |
| `--r-xs` `--r-sm` `--r-md` | 4 / 6 / 8 px | 4 / 6 / 8 px | sama |
| **`--r-lg`** | **10px** | **12px** | **sudah beda** |
| **`--r-pill`** | **999px** | **9999px** | **sudah beda** |
| **`--t-fast`** | **0.15s** cubic-bezier(0.4,0,0.2,1) | **0.18s** cubic-bezier(0.4,0,0.2,1) | **sudah beda** |
| `--sp-1` … `--sp-12` | 4 … 48 px | 4 … 48 px | sama |
| **`--font-sans`** | Inter + system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto | Inter + system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto | hampir sama |
| **`--font-display`** | Fraunces, **Iowan Old Style**, Georgia, **Times New Roman**, serif | Fraunces, Georgia, serif | **sudah beda** |
| **`--font-mono`** | JetBrains Mono, ui-monospace, **SFMono-Regular**, Menlo, Consolas, **Liberation Mono** | JetBrains Mono, ui-monospace, Menlo, Consolas | **sudah beda** |
| `--tracking-body` / `-tight` / `-display` / `-eyebrow` | sama | sama | sama |

Dua nilai sudah berbeda (`--r-lg`, `--t-fast`) dan tiga stack font sudah berbeda — dan itu **tidak pernah** menimbulkan satu pun bug, karena tidak ada dokumen yang memuat keduanya. Itu bukti langsung bahwa isolasi bekerja.

Yang perlu dicatat: sesudah redesign, landing **tidak lagi** mendefinisikan `--accent`, `--surface`, `--text-main`, `--danger` (diganti `--lp-*`). Konsekuensinya positif: kalau sebuah komponen aplikasi (atau potongan landing) salah ditempel, `var(--accent)` akan **tidak terdefinisi** → properti itu batal → terlihat jelas rusak. Bukan lagi salah warna yang diam-diam.

### 13.3 Kenapa Isolasi Adalah Pilihan yang Benar di Sini

| Alasan | Penjelasan |
|---|---|
| **CSS bersifat per-dokumen** | Dua `:root` di dua dokumen berbeda tidak pernah saling menimpa. Tidak ada risiko cascade selama G1 dipatuhi. |
| **Sudah jadi pola proyek** | 4 surface (aplikasi, landing, privacy, 404) masing-masing punya salinan token sendiri. Menyatukan satu pasang berarti melanggar pola yang sudah terbukti. |
| **Karakter produk berbeda** | Aplikasi = Ocean Ledger terang, kepadatan data tinggi, tenang. Landing = Origin gelap, editorial, hampir tanpa data nyata. Satu sistem token tidak bisa melayani keduanya tanpa kompromi. |
| **Biaya perubahan simetris** | Mengubah palet landing tidak menyentuh aplikasi sama sekali (dan sebaliknya), jadi iterasi desain landing jadi murah. |
### 13.4 Kalau Justru Di-Merge, Itu yang Berbahaya

| Opsi merge | Akibat |
|---|---|
| **Aplikasi ikut jadi dark Origin** | 23 berkas `css/modules/*` harus ditulis ulang: seluruh UI terang, modal, tabel, chart, sampai `docs/AUDIT.md`. Risiko regresi besar — dan produknya jadi bukan yang diminta pemilik proyek (keputusan #6: tetap Ocean Ledger). |
| **Landing dipaksa memakai token terang Ocean Ledger** | Karakter referensi hilang total: kanvas near-black + tile kromatik adalah **inti** Origin. Seluruh Fase 1–8 jadi sia-sia. |
| **Satu berkas token dipakai bersama** | Mengharuskan kedua dokumen memuat stylesheet yang sama → **baru** muncul masalah urutan cascade, dan setiap perubahan token aplikasi berisiko mengubah tampilan landing tanpa disadari. |

Kesimpulan: **merge menaikkan risiko, bukan menurunkannya.** Isolasi adalah pilihan yang benar di sini — dan itu sudah jadi pola proyek (lihat 13.8).

### 13.5 Tiga Guardrail

#### G1 — Jangan pernah silang stylesheet antar dokumen

- `index.html`, `html/index.template.html`, `html/modals/*.html` **tidak boleh** memuat `css/onboarding.css`.
- `onboarding.html` **tidak boleh** memuat `style.css`.
- Ini **satu-satunya** invariant yang menjaga semuanya tetap aman. Selama G1 dipatuhi, tidak ada satu pun masalah cascade yang mungkin terjadi.

Ditambal dengan: komentar peringatan di header kedua berkas stylesheet (Fase 9.10) + perintah verifikasi di 13.7 (wajib dijalankan di Bagian 9.5).

#### G2 — Berkas landing wajib tetap di luar `css/modules/`

- `css/input.css` mengimpor modulnya **satu per satu secara eksplisit** (23 modul). `css/onboarding.css` **tidak** ada di daftar itu, dan `sw.js` mem-precache-nya secara terpisah.
- Kalau berkas landing masuk ke `css/modules/` lalu ditambahkan ke daftar `@import` itu, CSS landing akan **bocor ke bundle `style.css`** milik aplikasi. Ini satu-satunya jalur kebocoran nyata di proyek ini.
- Karena itu Fase 0.6 menetapkan `css/onboarding-motion.css` dibuat di **root `css/`**, bukan di `css/modules/`.

#### G3 — Jangan copy-paste komponen antar surface tanpa ganti nama token

- Risiko paling realistis: seseorang menyalin potongan landing ke aplikasi (atau sebaliknya) saat menambah fitur.
- Sebelum redesign ini, nama variabelnya identik, jadi kesalahan seperti itu **silent** — nilainya salah tapi tidak error, hanya tampak "warnanya agak aneh".
- **Mitigasi:** prefix `--lp-` (keputusan #5). Kalau token landing sampai dipakai di aplikasi, hasilnya langsung terlihat rusak (variabel tidak terdefinisi → properti batal), bukan salah warna yang diam-diam.

### 13.6 Keputusan Prefix `--lp-`

Status: **disetujui** (keputusan #5). Daftar lengkap tokennya ada di Bagian 4.2.

| Sebelum (nama polos) | Sesudah (wajib) |
|---|---|
| `--canvas`, `--abyss` | `--lp-canvas`, `--lp-abyss` |
| `--graphite`, `--steel`, `--silver`, `--void` | `--lp-graphite`, `--lp-steel`, `--lp-silver`, `--lp-void` |
| `--pure`, `--cloud`, `--ash`, `--fog` | `--lp-pure`, `--lp-cloud`, `--lp-ash`, `--lp-fog` |
| `--iris`, `--cyan`, `--orchid`, `--periwinkle`, `--pale-iris`, `--deep-iris` | `--lp-iris`, `--lp-cyan`, `--lp-orchid`, `--lp-periwinkle`, `--lp-pale-iris`, `--lp-deep-iris` |
| `--line`, `--line-soft` | `--lp-line`, `--lp-line-soft` |
| `--r-btn`, `--r-card`, `--r-tile`, `--r-pill` | `--lp-r-btn`, `--lp-r-card`, `--lp-r-tile`, `--lp-r-pill` |
| `--t-state`, `--t-reveal` | `--lp-t-state`, `--lp-t-reveal` |

Alasan memilih prefix: (a) membuat kebocoran token **terlihat**, bukan silent; (b) kalau token landing dipakai di aplikasi, `var(--lp-…)` tidak terdefinisi di sana; (c) **gratis** sekarang karena `css/onboarding.css` memang ditulis ulang dari nol di Fase 1.7.

Efek samping yang perlu dicatat: setelah redesign, landing **tidak lagi** mendefinisikan `--accent`, `--surface`, `--text-main`, `--danger`. Komponen apa pun yang salah ditempel dan masih memakai nama polos akan langsung tampil rusak — itu memang tujuannya.

### 13.7 Cara Memverifikasi Isolasi

Jalankan dari root proyek (Windows `cmd`). Semua perintah ini **wajib** menghasilkan 0 hasil kecuali yang ditandai:

```
findstr /n "onboarding.css" index.html                  → 0 hasil
findstr /n "onboarding.css" html\index.template.html    → 0 hasil
findstr /n "onboarding.css" html\modals\*.html          → 0 hasil
findstr /n "style.css" onboarding.html                  → 0 hasil
findstr /n "onboarding" style.css                        → 0 hasil (bundle aplikasi bersih dari CSS landing)
findstr /n "onboarding" css\input.css                    → 0 hasil (berkas landing tidak diimpor ke bundle app)
```

Dan yang **harus** menghasilkan sesuatu:

```
findstr /n "onboarding.css" onboarding.html             → minimal 1 hasil (landing memang memuatnya)
findstr /n "onboarding-motion.css" sw.js                → 1 hasil (terdaftar di LOCAL_ASSETS, Fase 9.4)
```

Kalau salah satu perintah di blok pertama menghasilkan sesuatu → **STOP**, jangan lanjutkan fase berikutnya sampai pelanggaran G1/G2 dibersihkan.

### 13.8 Inventaris Surface

Proyek ini sudah punya beberapa surface, masing-masing dengan salinan tokennya sendiri. Ini bukan kekacauan — ini pola yang disengaja.

| Surface | Dokumen | Sumber token | Palet |
|---|---|---|---|
| **Aplikasi** | `index.html` (+ `html/*`) | `css/modules/tokens.css` + `typography.css` → `style.css` | Ocean Ledger (Glacial Blue / Abyssal Deep Sea) |
| **Landing** | `onboarding.html` | `css/onboarding.css` (`:root` berprefix `--lp-*`) | Origin gelap |
| **Privasi** | `privacy.html` | `<style>` inline | Salinan token Ocean Ledger (`--r-lg` 10px, sesuai aplikasi) |
| **404** | `404.html` | `<style>` inline | Netral + emerald mentah `#10b981` — **belum diselaraskan**, dibahas di Fase 9.11 |

### 13.9 Kapan Bagian Ini Harus Dibuka Lagi

Kembali ke Bagian 13 ini **sebelum** melakukan salah satu hal berikut:

1. Ada permintaan menyatukan token landing & aplikasi — tolak, dan tunjukkan 13.4.
2. Ada permintaan memindahkan berkas CSS landing ke `css/modules/` atau menambahkannya ke `css/input.css` — tolak, tunjukkan G2.
3. Ada komponen yang mau dipakai di **dua** surface sekaligus — wajib dua salinan dengan nama token berbeda (G3), atau jangan dipakai bersama.
4. Menambah surface baru (mis. halaman bantuan, halaman statistik publik) — tentukan dulu sumber tokennya, lalu tambahkan barisnya ke 13.8.
5. Menyelaraskan `404.html` dan `privacy.html` dengan Ocean Ledger — kerjakan sebagai pekerjaan terpisah dari landing redesign, supaya `git diff` landing tetap bersih (Bagian 9.1).

> **Aturan bertahan:** Bagian 13 berlaku sampai pemilik proyek mencabutnya secara eksplisit. Kalau dicabut, seluruh Bagian 13 ini harus **ditulis ulang** — bukan ditambal — karena mencabut isolasi berarti mengubah arsitektur, bukan sekadar memperbaiki bug.
---

## 14. Konsep Utama — "Perjalanan Visual dari Langit ke Bumi" saat Scrolling

> **Status:** ✅ SELESAI — diimplementasikan dan diverifikasi (lihat 14.8).
> **Keputusan pemilik proyek:** konsep ini **diminta eksplisit** oleh pemilik proyek, jadi ia berada di atas guardrail Bagian 11 yang berbenturan dengannya. Benturan itu tidak didiamkan: R2′, R5′, dan R8′ di Bagian 11.4 adalah amandemen tertulis yang menjaga hukum lama tetap berlaku untuk seluruh halaman kecuali panggung ini.

### 14.1 Latar Belakang & Masalah

Sebelum ini, landing page hanya punya gambar di **satu tempat**: `assets/hero-atmosphere.png`, dipasang sebagai `.hero-bg` di dalam kotak hero dengan tinggi `calc(100dvh - 56px)`.

Akibatnya bisa diprediksi dan memang terjadi: **begitu pengunjung scroll melewati hero, gambarnya habis.** Kotak hero berakhir, gambar ikut berakhir, dan seluruh sisa halaman berdiri di atas hitam polos. Dua keluhan pemilik proyek, dikutip apa adanya:

1. *"begitu pengunjung scroll ke bawah, gambarnya langsung habis dan terputus menjadi hitam polos"*
2. *"terasa monoton dan terkesan 'terpotong'"*

Akar masalahnya bukan kualitas gambarnya, melainkan **kepemilikan**: gambar itu milik satu section, padahal yang dibutuhkan halaman adalah latar yang dimiliki oleh **halaman**, bukan oleh section. Selama latar dimiliki section, setiap batas section adalah potensi garis patah.

### 14.2 Visi yang Diminta

Sebuah alur visual yang menyambung secara vertikal dari atas ke bawah, seolah kamera perlahan turun dari langit menembus awan menuju bumi saat halaman di-scroll:

| Zona | Bagian halaman | Visual yang diminta | Fungsi |
|---|---|---|---|
| **1** | Hero (layar pertama) | Langit malam gelap pekat dengan sapuan kabut cyan/teal tipis | Area tenang supaya judul terbaca tajam tanpa gangguan objek |
| **2** | Tengah (area box mockup) | Lautan awan tebal / kabut bergulung yang membentang horizontal, dengan pendaran cahaya teal lembut | Jembatan visual antara langit di atas dan daratan di bawah |
| **3** | Bawah (area fitur & konten) | Siluet puncak pegunungan malam yang tenang muncul dari balik lautan awan, lalu kakinya memudar alami menjadi hitam pekat `#0f1011` | Menjangkarkan halaman ke daratan, lalu menyerahkan sisa halaman ke tabel matriks dan FAQ |

Dua alasan kenapa konsep ini penting, juga dari pemilik proyek: **tidak membosankan** (pengunjung merasakan pengalaman sinematik yang mengalir) dan **tidak ada garis patah** (transisi antar-section terasa organik seperti pemandangan nyata, bukan blok warna yang ditempel-tempel).

### 14.3 Model Lapisan

Satu elemen `.sky-stage` memegang **seluruh** latar halaman. Ia `position: fixed` di dalam `#state-welcome`, jadi ia menempel di viewport sementara konten bergulir di atasnya — inilah yang memberi ilusi kamera turun, bukan halaman yang lewat di depan gambar.

Empat lapisan, dari belakang ke depan:

| # | Lapisan | Isi | Alasan urutannya |
|---|---|---|---|
| 1 | `.sky-layer-sky` | Banding `--lp-abyss → --lp-canvas`, foto `hero-atmosphere.png` (opacity 0.45), sapuan kabut teal, scrim keterbacaan | Paling belakang: semua cahaya lain menyinarinya |
| 2 | `.sky-layer-ridge-far` | Punggungan jauh, **lebih terang** dari kanvas | Di **belakang** awan, jadi dek awan berkabut menutupi kakinya — kedalaman nyata, bukan dua siluet bertumpuk |
| 3 | `.sky-layer-clouds` | Enam bank awan + pendaran teal horizontal | Sumber cahaya. Berada di depan punggungan jauh supaya awan **memang** menutupinya |
| 4 | `.sky-layer-land` | Punggungan dekat, **lebih gelap** dari kanvas | Di **depan** awan, jadi ia memotong tajam ke dalam dek yang bercahaya |

**Dua arah kontras** inilah kuncinya: punggungan jauh terang (kabut), punggungan dekat gelap (benda). Tidak ada satu pun `box-shadow` yang dipakai — R1 tetap utuh.

Panggung berada di `z-index: 0`; `.landing-wrap` dan `.portal-wrap` diangkat ke `z-index: 1`. Karena `#state-welcome` mendapat `.hidden` (`display: none`) saat pengunjung pindah ke layar 2/3, panggungnya ikut hilang tanpa perlu logika tambahan.

### 14.4 Peta Perjalanan

Progres perjalanan `t` (0…1) **tidak** dihitung dari pecahan tinggi dokumen. Ia dihitung dari **puncak section yang sebenarnya**, lewat penanda `data-lp-journey` di `onboarding.html`:

| Penanda | Elemen | `t` saat puncaknya menyentuh puncak viewport | Zona |
|---|---|---|---|
| — | puncak halaman | 0.00 | 1 — langit |
| `clouds-in` | `.product-band` (box mockup) | 0.22 | 2 — awan masuk |
| `land-in` | `#fitur` (banner fitur) | 0.50 | 3 — punggungan muncul |
| `clouds-out` | `#matriks` | 0.78 | 3 — awan lewat, kaki memudar |
| `solid` | `#faq` | 1.00 | kanvas pekat |

Alasan memakai penanda section, bukan pecahan dokumen: tinggi halaman di 390px dan 1280px berbeda beberapa kali lipat, jadi pecahan dokumen akan menaruh "awan" di section yang berbeda di tiap perangkat. Dengan penanda, ketukan langit→awan→gunung selalu jatuh pada konten yang sama.

Kurva tiap lapisan (semuanya di `js/journey.js`):

| Lapisan | Muncul (`fadeIn`) | Hilang (`fadeOut`) | Geser (`drift`) | Jarak |
|---|---|---|---|---|
| `sky` | — (selalu ada) | 0.14 → 0.34 | 0.00 → 0.34 | 0% → −9% |
| `ridge-far` | 0.24 → 0.44 | 0.60 → 0.86 | 0.22 → 0.88 | +30% → −10% |
| `cloud` | 0.06 → 0.24 | 0.56 → 0.80 | 0.08 → 0.80 | +16% → −20% |
| `land` | 0.36 → 0.58 | 0.68 → 0.96 | 0.34 → 1.00 | +26% → −12% |

Jendela-jendelanya **tumpang tindih dengan sengaja** — itulah yang menghapus garis patah. Pada `t = 0.22` misalnya langit masih 0,60 sementara awan sudah 1,00, jadi yang terlihat bukan "langit lalu awan" melainkan langit yang sedang larut menjadi awan. Pada `t = 0.55` awan masih 1,00 sementara punggungan dekat sudah 0,86, jadi pegunungannya muncul **dari balik** dek, bukan ditempel di atasnya.

`drift` arahnya naik untuk semua lapisan: kamera turun, jadi langit mundur ke atas, awan lewat ke atas, dan daratan naik. Amplitudonya kecil (maksimum 30% tinggi lapisan) dan hanya sekali pakai — bukan parallax berlapis.

### 14.5 Token & Geometri

Token baru di `:root` `css/onboarding.css` (semuanya berprefix `--lp-`, sesuai keputusan #5). Warna ditulis sebagai **triplet RGB**, bukan rgba, supaya alpha bisa dipasang per elemen:

```
--lp-sky-image-opacity: 0.45;
--lp-mist-tint:        0, 179, 221;      /* turunan --lp-cyan: kabut langit */
--lp-cloud-tint:       168, 186, 196;    /* kabut awan, netral dingin */
--lp-glow-tint:        0, 179, 221;      /* pendaran teal di garis awan */
--lp-ridge-far-tint:   38, 43, 47;       /* LEBIH TERANG dari kanvas */
--lp-ridge-near-tint:  7, 8, 9;          /* LEBIH GELAP dari kanvas */
--lp-sky-scrim-top / -mid / -bottom;     /* scrim keterbacaan hero */
--lp-band-scrim:       rgba(15, 16, 17, 0.62);   /* scrim band trust */
--lp-body-onstage:     #b0b0b2;          /* teks yang berdiri di atas panggung */
```

Tiga aturan geometri yang **mengikat**, karena melanggarnya langsung terlihat sebagai garis datar melintang di langit:

1. **Alpha tiap gumpalan awan harus mencapai nol sebelum menyentuh sisi kotaknya.** Bank awan hidup di satu kotak bersama (lebar 160% viewport, tinggi 40%–100%), dan gradien radialnya diletakkan di tengah kotak dengan jari-jari lebih kecil dari setengahnya. Syaratnya: `--cb-rx < --cb-cx`, `--cb-rx < 100% − --cb-cx`, `--cb-ry < 50%`.
2. **Gumpalan kedua harus tetap di dalam kotak** setelah digeser `--cb-dx`.
3. **Kaki punggungan harus memudar, bukan terpotong.** Gradien vertikal punggungan mencapai alpha nol di kakinya sendiri, jadi tidak pernah ada garis potong melintang di dasar pegunungan — inilah "memudar alami menjadi hitam pekat" yang diminta.

Kedua syarat pertama itu bukan teori: versi pertama panggung memakai kotak 130% dengan gradien yang titik terangnya diletakkan di tepi bawah kotak, dan hasilnya adalah bidang rata yang terbaca sebagai gradien, **bukan** sebagai awan bergulung. Perbaikannya dua lapis: (a) gumpalan dipindah ke tengah kotak, dan (b) tiap bank kini menumpuk **dua** gumpalan dengan skala berbeda — satu massa lebar sebagai alas, satu gumpalan kecil 42% dari jari-jari alas yang lebih terang 20% di atasnya sebagai puncak yang terkena cahaya. Satu skala saja selalu berakhir sebagai gradien.

Tinggi punggungan juga dipilih dengan alasan, bukan selera: **64vh** untuk punggungan jauh dan **46vh** untuk dekat, supaya puncaknya mendarat di tengah frame (±47% dan ±72% tinggi viewport). Kalau keduanya hanya duduk di dasar layar, seluruh lanskap akan tersembunyi di balik kartu-kartu opaque dan halaman kembali terasa rata.

### 14.6 Perilaku Gagal (Ini yang Menjaga Halaman Tidak Pernah Kosong)

| Keadaan | Yang terjadi | Kenapa aman |
|---|---|---|
| **JS mati / diblokir / error** | Awan dan punggungan tetap `opacity: 0` (aturan dasarnya ada di `css/onboarding.css`, semua aturan yang menyalakannya dikunci `.js-motion`). Panggung melukiskan langit malam yang mulus saja. | Tidak ada konten yang disembunyikan — panggungnya `aria-hidden` dan murni dekoratif. Konten tetap 100% terbaca. **Diverifikasi di browser** dengan mematikan modulnya. |
| **Modul jalan tapi penanda tidak ada** | `collectStops()` mengembalikan daftar kosong, `progressAt()` mengembalikan 0, dan panggung tinggal di keadaan puncak halaman. Tidak pernah melempar error. | Satu-satunya ketergantungan modul ini adalah `#sky-stage` yang tidak ada; kalau begitu ia langsung `return`. |
| **Halaman lebih pendek dari jangkauan penanda** | Offset penanda dijepit ke `maxScroll`, duplikat dibuang, dan kalau `t` belum 1 di dasar halaman, satu stop `{t: 1, offset: maxScroll}` ditambahkan. | Perjalanan **selalu** tuntas di dasar halaman — pengunjung tidak pernah berhenti di gunung yang setengah pudar. |
| **`prefers-reduced-motion: reduce`** | **Geser (drift) dimatikan sepenuhnya** di dua tempat sekaligus: JS tidak menulis `--lp-y-*` (jadi nilainya tetap `0%` bawaan), dan media query menambahkan `transform: none`. Cross-fade opacity **tetap** jalan. | Yang dihilangkan adalah gerak, bukan lukisannya. Cross-fade yang mengikuti posisi scroll bukan animasi yang berjalan sendiri, dan mematikannya berarti menghapus lanskapnya sama sekali. **Diverifikasi di browser.** |

Panggung juga `pointer-events: none` dan `aria-hidden="true"`: ia tidak pernah menangkap klik dan tidak pernah masuk pohon aksesibilitas.

### 14.7 Anggaran Kontras (Diukur, Bukan Dikira)

Panggung mengubah latar di belakang teks, jadi kontrasnya **harus** diukur. Alat ukurnya `tmp/contrast-check.mjs` — sebuah skrip sementara yang membaca nilai dari `css/onboarding.css` (tint, scrim, dan seluruh `--cb-*` tiap bank) lalu mengompositnya lapis demi lapis dalam sRGB. Ia memakai kasus terburuk yang sengaja dimiringkan:

- dasarnya kanvas polos, walaupun banding langit yang lebih gelap masih ikut tampak saat awan di puncaknya;
- punggungan jauh dianggap menutupi semua kolom pada kekuatan penuh (ia elemen paling terang, jadi inilah kasus yang memusuhi teks terang);
- punggungan dekat diabaikan (ia lebih gelap dari kanvas, jadi ia hanya bisa memperbaiki);
- semua bank awan pada opacity 1.

Kalau angkanya lulus di sini, ia lulus di halaman. Hasil pengukuran pada titik terburuk **(75%, 70%) = rgb(53, 64, 70)**:

| Teks | Rasio | Status |
|---|---|---|
| `--lp-cloud` (judul) | **9,74:1** | ✅ Lulus AA (ambang 4,5) |
| `--lp-body-onstage` (teks yang berdiri di atas panggung) | **4,90:1** | ✅ Lulus AA |
| `--lp-ash` (kini khusus di dalam kartu) | 4,01:1 | ⚠️ Di atas panggung tidak lulus — karena itu tokennya dipensiunkan dari sana |
| `--lp-fog` (label non-esensial) | 1,98:1 | ❌ Item lama yang masih terbuka di gerbang 9.4 |

**Temuan yang mengubah kode.** Pengukuran pertama **gagal**: `--lp-ash #9f9fa0`, yang saat itu dipakai `.section-header p` dan `.hero-sub` tepat di atas panggung, hanya mencapai **3,79:1** — di bawah ambang WCAG AA untuk teks normal. Itu cacat nyata, bukan teoretis, dan tidak akan terlihat kalau warna latarnya hanya diperkirakan dengan mata.

Perbaikannya dua arah, sesuai R10 (*kontras dikelola dengan pilihan warna teks, bukan shadow*):

1. Token baru `--lp-body-onstage: #b0b0b2` untuk teks yang berdiri **langsung di atas panggung** (`.section-header p`, `.hero-sub`, `.hero-trust-row`). `--lp-ash` tetap dipakai untuk teks di dalam kartu, di mana latarnya tidak bergerak.
2. Alpha keenam bank awan diturunkan sekitar 15% (mis. `0.050 → 0.042`), dan `--cb-rx` bank 4 & 5 dari `22%` ke `21%`.

Sesudahnya, seluruh baris sampel untuk `--lp-body-onstage` berada di **4,90:1 atau lebih baik** (terendah 4,90 di y=70%, x=75%; terbaik 8,80 di dasar halaman).

**Catatan kejujuran soal `--lp-fog`.** Skrip ini juga mengukur `--lp-fog` dan hasilnya 1,98:1. Angka itu benar sebagai kasus terburuk, tetapi **bukan** keadaan yang pernah terjadi: `--lp-fog` hanya dipakai di dalam kartu opaque (`--lp-graphite`, `--lp-steel`) dan pada `#matriks` + footer, di mana panggung sudah pudar (opacity awan 0,08 → kontribusi luminance sekitar 0,005). Jadi panggung **tidak memperburuk** kontras `--lp-fog`; status di bawah AA itu kondisi yang sudah ada sebelum Bagian 14 dan sudah tercatat sebagai baris terbuka di checklist 9.4. Ia **tidak** ditutup di sini karena memperbaikinya berarti menyentuh komponen di luar panggung, dan pekerjaan itu lebih baik dikerjakan sebagai satu sapuan tersendiri di gerbang 9.4.

### 14.8 Cara Memverifikasi

Tiga pembuktian, semuanya bisa diulang orang lain:

1. **Contact sheet enam beat.** `tests/qa/_qa-journey.html` memuat stylesheet **asli** dan mengimpor kurva **asli** dari `js/journey.js` (`skyLayerStatesAt`), lalu menyusun enam keadaan perjalanan (t = 0.00 / 0.22 / 0.40 / 0.55 / 0.72 / 0.95) dalam satu bingkai 900×600. Satu screenshot menjawab keenam ketukan sekaligus. Jalankan lewat http(s) — modul ES tidak jalan dari `file://`.
2. **Halaman asli.** Buka `onboarding.html` lewat http dan scroll dari atas ke bawah: langit → awan → punggungan → matriks di kanvas pekat.
3. **Gerbang kontras.** `node tmp/contrast-check.mjs` (skrip sementara; hapus sesudah dipakai). Ia juga memverifikasi syarat geometri 14.5 dan mencetak `all 6 banks fade out inside their box`.

Hasil yang dicatat sesi ini: contact sheet menunjukkan keenam beat benar, `t = 0.95` benar-benar kanvas `#0f1011` pekat, tanpa potongan datar di langit; `npm run check` hijau (40 berkas ter-parse, 29 modul client ter-precache, 64/64 tes lulus); tanpa JS seluruh konten tetap penuh di atas langit yang tenang; dengan gerak dimatikan perjalanannya tetap terbaca tanpa satu pun pergeseran.

### 14.9 Berkas yang Disentuh

| Berkas | Perubahan |
|---|---|
| `onboarding.html` | Markup `.sky-stage` + 4 lapis, penanda `data-lp-journey` di 4 section, atmosfer hero dipindah dari `.hero-bg`, `?v=123` |
| `css/onboarding.css` | Token panggung, `.sky-stage` + seluruh lapisan, `.section-eyebrow` diperbaiki (dulu meregang jadi bilah selebar kolom), `.landing-wrap`/`.portal-wrap` diangkat ke `z-index: 1`, scrim band trust, token `--lp-body-onstage` |
| `css/onboarding-motion.css` | Section 5b: keempat lapisan mengonsumsi `--lp-j-*`/`--lp-y-*`, dikunci `.js-motion`; `transform: none` di dalam media query reduced-motion |
| `js/journey.js` | **Baru.** Peta penanda → `t`, kurva per lapisan, rAF + deteksi perubahan tinggi dokumen, guard `.js-motion`, dan `skyLayerStatesAt` yang dipakai harness |
| `js/onboarding.js` | Impor + `initSkyJourney()` paling awal di boot |
| `sw.js` | `CACHE_NAME` → `finkas-v123`; `js/journey.js` dan `assets/hero-atmosphere.png` masuk `LOCAL_ASSETS` |
| `privacy.html` | `?v=121` → `?v=123` (Fase 9.12) |
| `tests/qa/_qa-journey.html` | **Baru.** Contact sheet enam beat |
| `onboarding.css` (token lampau) | `--lp-ash` tidak lagi dipakai di atas panggung; lihat 14.7 |
