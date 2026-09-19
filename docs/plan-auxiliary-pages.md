# Rencana Redesign Halaman Pendukung (Privasi & 404) — Origin Dark

> **Status:** ✅ SELESAI sesuai lingkup eksekusi pengguna — verifikasi statis dan `npm run check` lulus; QA browser dikecualikan.
> **Referensi sistem:** `onboarding.html` + `css/onboarding.css` (Origin dark), hasil `docs/plan-landing-redesign.md`
> **File sasaran:** `privacy.html`, `404.html` (keduanya ditulis ulang penuh), `docs/AUDIT.md` (satu baris inventaris), `docs/plan-auxiliary-pages.md` (dokumen ini)
> **Tanggal:** 19 September 2026
> **Versi cache:** `finkas-v123` — **tidak berubah** (lihat §6.3, tidak ada aset baru)
> **Cakupan:** 2 dokumen, 0 berkas CSS/JS/ikon/manifest/sw disentuh

> **Kontrak eksekusi terbaru (menggantikan ketentuan lama yang bertentangan):** hanya `privacy.html`, `404.html`, dan progres dokumen ini boleh berubah. D1/D2/D3 DIPUTUSKAN: `#2e2e2e`, `rgba(255, 255, 255, 0.10)`, SVG inline `fill="currentColor"`. Tidak ada QA browser/CDP; verifikasi berupa parser HTML5/CSS, pembandingan teks legal, kontras, isolasi hash berkas, dan `npm run check`. `npm run build` serta perubahan `docs/AUDIT.md` dikecualikan karena menulis berkas di luar lingkup. Tanda `[x]` dengan catatan **DIKECUALIKAN** menutup administrasi item, bukan menyatakan pengujian/perubahan itu dilakukan. Kriteria AC-13 (pengukuran browser) dan AC-20 (AUDIT) juga dikecualikan; layout runtime/keyboard belum diuji.
>
> **Resolusi spesifikasi internal:** badge memakai cloud/steel sesuai §2.2 dan §5.3c; `--lp-tracking-tight: -0.02em` disalin dari landing untuk 2.3. Body 404 memakai padding 16px sesuai §5.2 dan 4.8 (mengungguli 6.9 generik). Padding horizontal CTA pada lebar <360px memakai 8px agar memenuhi sasaran 6.3/6.5 dengan label tetap nowrap; ukuran font dan padding kartu tetap. Ghost tanpa panah sesuai 5.6. `transform` pada geometri SVG dan `text-transform` uppercase bukan animasi CSS.

---

## 0. Cara Pakai Dokumen Ini

1. **§4 (Keputusan)** dibaca lebih dulu. Tiga keputusan di sana mengubah nilai token dan target tombol; tanpa jawabannya implementasi tidak boleh mulai.
2. **§3 (Gap Analysis)** adalah daftar cacat yang harus hilang. Setiap baris punya ID `GAP-n` yang bisa dilacak sampai ke fase penanggung jawab.
3. **§7 (Checklist per Fase)** adalah daftar kerja. `[x]` hanya boleh ditulis setelah item benar-benar selesai **dan** diverifikasi di browser.
4. **§8 (Kriteria Penerimaan)** dan **§9 (Matriks Verifikasi)** adalah gerbang penutup. Satu item merah = task belum selesai.
5. **§10 (Anggaran Kontras)** memuat angka yang **sudah diukur**, bukan dikira-kira. Setiap perubahan warna mewajibkan pengukuran ulang.
6. **§11 (Log Progres)** diisi setiap sesi kerja berhenti, supaya sesi berikutnya tahu di mana berhenti.
7. **§6 (Guardrail)** mengikat: G1/G2 dari `docs/plan-landing-redesign.md` §13 tetap berlaku penuh di sini.

---

## 1. Ringkasan Eksekutif

`privacy.html` dan `404.html` adalah **dua halaman terakhir di proyek ini yang masih memakai sistem visual sendiri**, dan keduanya sudah tercatat sebagai utang desain di `docs/AUDIT.md` baris 31–32:

| Dokumen | Status di AUDIT sekarang |
|---|---|
| `privacy.html` | "Salinan lokal token Ocean Ledger" — **TERVERIFIKASI** hanya untuk kebersihan token, bukan untuk keselarasan visual |
| `404.html` | "Netral + `#10b981` (belum masuk harmonisasi)" — **DILUAR SCAN** |

Konsekuensi praktisnya: pengunjung yang menekan tautan rusak, atau membuka kebijakan privasi dari footer landing, keluar dari dunia Obsidian yang baru dibangun dan mendarat di halaman bergaya lain. Di `404.html` perpindahannya paling kasar: dari kanvas `#0f1011` ke kartu `#111827` dengan emerald `#10b981` dan drop shadow — tiga hal yang justru dilarang R1/R2 di landing.

Empat temuan nyata dari pembacaan kode (bukan dugaan):

| # | Temuan | Bukti |
|---|---|---|
| 1 | `404.html` memakai **display bold** (`font-weight: 800` pada `.code`, `700` pada `h1`) | `404.html` `.code { font-weight: 800 }`, `h1 { font-weight: 700 }` — melanggar R7 |
| 2 | `404.html` punya **drop shadow** dan **dua blok `prefers-color-scheme`** (dark + light) | `.container { box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15) }`; `@media (prefers-color-scheme: light)` |
| 3 | Kedua halaman memakai `icons/icon-light-192.svg` — **monogram bertile putih** | `icon-light-192.svg` berisi `<rect fill="#ffffff">`; di kanvas `#0f1011` ia muncul sebagai kotak putih menyala |
| 4 | Radius kedua halaman di luar skala R4 | `privacy.html` `--r-sm: 6px`, `--r-lg: 10px`; `404.html` `1.25rem` (20px) & `0.75rem` (12px) |

Yang **tidak** akan disentuh, dan alasannya: `icons/*.svg`, `manifest.json`, `sw.js`, `style.css`, seluruh `css/modules/*`, dan `css/onboarding.css`. Identitas aplikasi tetap Ocean Ledger (keputusan #6 di plan landing). Halaman ini hanya **meminjam bahasa visual** landing, dengan salinan tokennya sendiri di dalam `<style>` masing-masing dokumen — persis pola 4-surface yang sudah berlaku (§13.8 plan landing).

---

## 2. DNA Origin yang Dipakai Halaman Pendukung

Halaman pendukung adalah **surface ke-3 dan ke-4**. Karena itu ia memakai **nilai token yang identik** dengan `css/onboarding.css`, tetapi disalin ke dalam `<style>` masing-masing dokumen. Tidak ada stylesheet bersama, tidak ada `@import`, tidak ada `<link>` ke CSS landing.

### 2.1 Subset token yang benar-benar dipakai

Diambil **kata per kata** dari `:root` `css/onboarding.css` (baris 27–135) supaya reviewer bisa mencocokkan dua berkas berdampingan.

```css
:root {
  /* Surfaces — Origin color step: abyss → canvas → graphite → steel */
  --lp-abyss: #090a0b;    --lp-canvas: #0f1011;
  --lp-graphite: #2e2e2e; --lp-steel: #3f4041;
  --lp-void: #000000;

  /* Text */
  --lp-pure: #ffffff;  --lp-cloud: #f5f5f7;
  --lp-ash: #9f9fa0;
  --lp-body-onstage: #b0b0b2;

  /* Hairlines */
  --lp-line: rgba(255, 255, 255, 0.15);
  --lp-line-soft: rgba(255, 255, 255, 0.10);

  /* Radius scale (R4) */
  --lp-r-btn: 8px; --lp-r-card: 16px; --lp-r-pill: 9999px;

  /* Motion — state only; tidak ada reveal di halaman ini */
  --lp-t-state: 0.2s ease;

  /* Type */
  --lp-font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --lp-font-display: 'Fraunces', Georgia, serif;
  --lp-font-mono: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
  --lp-tracking-body: -0.01em; --lp-tracking-display: -0.03em;
  --lp-tracking-eyebrow: 0.14em;

  /* Spacing — index = kelipatan basis 4px (R9) */
  --lp-sp-1: 4px;  --lp-sp-2: 8px;  --lp-sp-3: 12px; --lp-sp-4: 16px;
  --lp-sp-6: 24px; --lp-sp-8: 32px; --lp-sp-12: 48px; --lp-sp-20: 80px;

  /* Layout */
  --lp-content-max: 1200px;

  color-scheme: dark;
}
```

**Token yang sengaja tidak dipakai** (dan itu keputusan, bukan kelalaian): `--lp-iris`, `--lp-cyan`, `--lp-orchid`, `--lp-periwinkle`, `--lp-pale-iris`, `--lp-deep-iris` (R2 — kromatik hanya untuk tile full-bleed, dan halaman ini tidak punya tile), semua token panggung `--lp-sky-*`/`--lp-j-*`/`--lp-y-*` (tidak ada perjalanan langit→bumi di halaman ini), `--lp-danger*` (tidak ada sinyal kas keluar), `--lp-turn-stroke` dan `--lp-flash-tint` (tidak ada borderTurn maupun count-up), `--lp-t-reveal`/`--lp-t-section` (tidak ada reveal yang dipicu scroll).

### 2.2 Dua nilai yang **dilarang** muncul sebagai warna teks

Ini hasil pengukuran, bukan opini — lihat §10 untuk tabel lengkapnya:

| Pasangan | Rasio | Akibat |
|---|---|---|
| `--lp-ash #9f9fa0` di atas `--lp-steel #3f4041` | **3,93:1** | ❌ **Banned.** Setiap teks di atas permukaan steel wajib `--lp-cloud` (9,54:1) atau `--lp-body-onstage` (4,80:1) |
| `--lp-fog #6a6b6b` di atas `--lp-canvas #0f1011` | **3,56:1** | ❌ **Banned.** `--lp-fog` tidak dipakai sebagai warna teks sama sekali di dua halaman ini — termasuk untuk timestamp footer. Alternatifnya `--lp-ash` (7,20:1) |

Catatan penting: larangan `--lp-fog` ini **menutup satu item terbuka** yang diwariskan plan landing (§14.7 mencatat `--lp-fog` 1,98:1 sebagai "item lama yang masih terbuka di gerbang 9.4"). Halaman pendukung tidak mewarisi utang itu.

### 2.3 Tiga suara font (R6)

| Peran | Font | Berat | Dipakai untuk |
|---|---|---|---|
| Display | Fraunces | **300 saja** | `h1`, `h2`, angka `404` |
| Body/UI | Inter | 300 / 400 / 600 | paragraf, daftar, label tombol pendukung, `<strong>` |
| Data/label | JetBrains Mono | 400 / 500, UPPERCASE, tracking 0.14em | badge, metadata, timestamp, angka `tabular-nums` |

URL font **harus identik** dengan `onboarding.html` — satu URL berarti satu respons Google Fonts yang di-cache untuk tiga dokumen:

```
https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=JetBrains+Mono:wght@400;500&display=swap
```

Efek samping yang disengaja: `privacy.html` sekarang meminta **Inter 700, Fraunces 600, JetBrains Mono 600** — tiga berat yang tidak dipakai satu pun aturan Origin dan justru inilah sumber `font-weight: 600` pada heading display-nya. Ketiganya hilang.

---

## 3. Gap Analysis — Kondisi Sekarang vs Target

### 3.1 `privacy.html`

| # | Aspek | Sekarang (terverifikasi di berkas) | Target (Origin) | ID |
|---|---|---|---|---|
| 1 | Kanvas | `--bg-color: #e8f1f6` (terang) + blok `@media (prefers-color-scheme: dark)` → `#08131d` | `--lp-canvas: #0f1011`, **dark-only**, blok `prefers-color-scheme` **dihapus** | GAP-1 |
| 2 | Permukaan | `--surface: #f7fbfd`, `--surface-2: #e4eff5` (Ocean Ledger terang) | `--lp-graphite: #2e2e2e` (kartu), `--lp-steel: #3f4041` (sub-panel) | GAP-2 |
| 3 | Garis | `--border: #c8dced` (biru pucat) | `--lp-line-soft: rgba(255,255,255,0.10)` 1px | GAP-3 |
| 4 | Teks | `--text-main: #0e2437`, `--text-muted: #4a6a80` (dua mode, dua anggaran kontras) | `--lp-cloud` (judul), `--lp-ash` (isi), `--lp-body-onstage` (sub-judul) | GAP-4 |
| 5 | Aksen | `--accent: #0d9488` teal, dipakai sebagai **warna tombol solid** | Pensiun. Tombol memakai monokrom `--lp-pure` di atas kanvas; teal tidak muncul di halaman ini | GAP-5 |
| 6 | Display | Fraunces **600** pada `.brand h1` dan `h2` | Fraunces **300** (R7), `h1` `clamp(36px, 5vw, 52px)`, `h2` 20px, lh 1.05 | GAP-6 |
| 7 | Radius | `--r-sm: 6px`, `--r-md: 8px`, `--r-lg: 10px` — 6 dan 10 **di luar skala** | Hanya `--lp-r-btn: 8px`, `--lp-r-card: 16px`, `--lp-r-pill: 9999px` | GAP-7 |
| 8 | CTA | `.btn` teal solid, label "Kembali ke Finkas", **tanpa panah** | Monokrom `--lp-pure` + teks `--lp-void`, label `KEMBALI KE BERANDA`, **panah trailing** (SVG inline), mono uppercase 12px, radius 8px | GAP-8 |
| 9 | Monogram | `icons/icon-light-192.svg` — **tile putih** di kanvas gelap | SVG inline monokrom (geometri resmi, lihat §5.3), `fill: currentColor` | GAP-9 |
| 10 | Metadata | `.timestamp` memakai `--text-muted`, sans-serif (bukan mono) | JetBrains Mono uppercase 10,5px, tracking 0.14em, warna `--lp-ash` (**bukan** `--lp-fog`) | GAP-10 |
| 11 | `theme-color` | `#e8f1f6` (terang) | `#0f1011` | GAP-11 |
| 12 | Ikon halaman | — | `icons/favicon.svg?v=123` (sudah benar, dipertahankan) | GAP-12 |
| 13 | Hierarki legal | 5 artikel bernomor + 1 paragraf pembuka | **Dipertahankan penuh**: 5 artikel + 1 pembuka, tidak ada yang digabung/dihapus | GAP-13 |
| 14 | Kontras | Bergantung mode; di mode terang `--text-muted #4a6a80` di atas `#f7fbfd` ≈ 5,8:1, di mode gelap `#93b4c7` di atas `#112334` ≈ 6,1:1 | **Satu** anggaran: seluruh pasangan ≥ 4,5:1, terendah terukur **5,14:1** (§10) | GAP-14 |

### 3.2 `404.html`

| # | Aspek | Sekarang (terverifikasi di berkas) | Target (Origin) | ID |
|---|---|---|---|---|
| 1 | `theme-color` | `#10b981` — **emerald mentah di metadata** | `#0f1011` | GAP-20 |
| 2 | Kanvas | `--bg: #090d16` + blok `@media (prefers-color-scheme: light)` → `#f8fafc` | `--lp-canvas: #0f1011`, **dark-only** | GAP-21 |
| 3 | Kartu | `--card-bg: #111827` (**Tailwind gray-900**), `border-radius: 1.25rem` | `--lp-graphite: #2e2e2e`, radius `--lp-r-card: 16px` | GAP-22 |
| 4 | Elevasi | `box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15)` | **Nol.** Kedalaman dari color step + hairline 1px `--lp-line-soft` (R1) | GAP-23 |
| 5 | Warna aksen | `--primary: #10b981`, `--primary-hover: #059669` | Tidak ada hue. Aksen = `--lp-pure` monokrom di atas `--lp-void` | GAP-24 |
| 6 | Angka 404 | `.code` 3.5rem, **`font-weight: 800`**, warna emerald | Fraunces **300**, `clamp(72px, 20vw, 128px)`, `--lp-cloud`, `font-variant-numeric: tabular-nums`, lh 0.9 | GAP-25 |
| 7 | `h1` | `font-weight: 700` | Fraunces 300, 24px | GAP-26 |
| 8 | Monogram | `icons/icon-light-192.svg` — tile putih 64px | SVG inline monokrom (§5.3) | GAP-27 |
| 9 | Tombol | `.btn-primary` emerald + `.btn-secondary` outline; radius `0.75rem` (12px) | Primer: `--lp-pure`/`--lp-void`, radius 8px, panah trailing. Sekunder: ghost 1px `--lp-line`, radius 8px | GAP-28 |
| 10 | Copy | "Tautan yang Anda tuju mungkin salah ketik, sudah dipindahkan, atau tidak lagi tersedia." — sudah Indonesia dan jelas | Dipertahankan, ditambah satu baris metadata mono uppercase | GAP-29 |
| 11 | Ikon halaman | `icons/favicon.svg` **tanpa** query versi | `icons/favicon.svg?v=123` | GAP-30 |
| 12 | Struktur | Kartu di tengah, `max-width: 420px` | Kartu di tengah, `max-width: 460px` (menyamai `.portal-card` landing), padding 32px | GAP-31 |
| 13 | Font | Inter 400;500;600;700 saja — **tanpa display & tanpa mono** | URL font identik landing (§2.3): Fraunces 300 + JetBrains Mono 400/500 masuk | GAP-32 |

### 3.3 Ringkasan Gerbang Gap

| Kelompok | Jumlah | Wajib tertutup sebelum selesai |
|---|---|---|
| `privacy.html` (GAP-1…GAP-14) | 14 | ✅ semua |
| `404.html` (GAP-20…GAP-32) | 13 | ✅ semua |
| **Total** | **27** | 27/27 |

Aturan penutupan (mengikuti §10.1 plan landing): kolom bukti harus berupa tindakan yang bisa diulang orang lain. "Sudah kelihatan bagus" tidak sah; "buka 390px, `document.documentElement.scrollWidth === clientWidth`" sah.

---

## 4. Keputusan — DIPUTUSKAN

Tiga keputusan di bawah ini muncul karena **spesifikasi tugas dan kode yang sudah ada tidak sepenuhnya sepakat**. Semuanya satu baris perubahan, tapi arahnya harus ditentukan sebelum implementasi — kalau tidak, hasilnya jadi nilai yang diam-diam berbeda antar-surface (persis risiko G3 di plan landing §13.5).

### 4.1 D1 — Nilai `--lp-graphite`: `#161718` (spesifikasi) atau `#2e2e2e` (kode)?

Spesifikasi tugas menulis `--lp-graphite (#161718)`. Yang benar-benar ada di `css/onboarding.css` baris 30 adalah `--lp-graphite: #2e2e2e`.

| Opsi | Nilai | Konsekuensi |
|---|---|---|
| **A (rekomendasi)** | `#2e2e2e` — pakai nilai yang sudah ada | Nama `--lp-graphite` punya **satu** arti di seluruh proyek. Kartu terlihat jelas sebagai panel di atas kanvas (`#0f1011` → `#2e2e2e`, delta perseptual besar). Reviewer bisa mencocokkan dua berkas berdampingan dan angkanya sama persis |
| **B** | `#161718` — pakai angka spesifikasi | Kartu jadi sangat halus di atas kanvas (`#0f1011` → `#161718`, delta kecil). Lebih "quiet", tapi nama `--lp-graphite` kini berarti dua hal berbeda di dua surface: `#2e2e2e` di landing, `#161718` di halaman pendukung. Setiap kali seseorang membaca `var(--lp-graphite)` ia harus tahu surface mana yang sedang dibaca |

**Rekomendasi: Opsi A.** Alasan: tujuan tugas adalah "matching the dark Origin visual system of onboarding.html", dan `--lp-graphite` sudah didefinisikan di sana. Mendefinisikan ulang nama yang sudah ada ke nilai lain adalah pelanggaran semangat §13.6 (nama token harus punya arti tunggal).

Kalau tetap ingin permukaan yang lebih gelap tanpa mendefinisikan ulang nama: tambahkan token **baru** `--lp-slate: #161718` dan pakai untuk kartu — nama baru untuk nilai baru, tidak ada tabrakan arti.

- [x] **D1 dijawab:** **Opsi A (`#2e2e2e`)** — disetujui, menjaga makna tunggal `--lp-graphite` konsisten dengan landing page.
- [x] **D2 dijawab:** **Opsi A (`0,10`)** — disetujui, konsisten dengan `--lp-line-soft` di landing page.
- [x] **D3 dijawab:** **Opsi A (SVG inline monokrom)** — disetujui, mempertahankan geometri resmi merek tanda F tanpa membawa aksen emerald mentah ke dalam kanvas gelap.

### 4.4 Yang sudah tertutup fakta (tidak perlu ditanyakan)

| Pertanyaan | Jawaban | Sumber |
|---|---|---|
| Apa target tombol "KEMBALI KE BERANDA"? | **`index.html`** — `manifest.json` menetapkan `start_url: "index.html"`, jadi rumah aplikasi memang `index.html`; perilaku ini juga sama dengan CTA `privacy.html` sekarang ("Kembali ke Finkas" → `index.html`) | `manifest.json` `start_url` |
| Berapa aksi di halaman 404? | **Dua**: satu primer (`KEMBALI KE BERANDA` → `index.html`) dan satu ghost (`PILIH GRUP KAS` → `onboarding.html`). R3 melarang dua CTA primer dalam satu layar, bukan melarang dua tombol | R3 |
| Perlukah `<link>` ke `css/onboarding.css`? | **Tidak.** Aturan isolasi G1/G2 mengikat: gaya harus berdiri sendiri di dalam `<style>` masing-masing dokumen | §6 |
| Perlukah menaikkan `CACHE_NAME` di `sw.js`? | **Tidak.** Tidak ada aset baru sama sekali | §6.3 |
| Perlukah mengubah `icons/*.svg`, `manifest.json`, `style.css`? | **Tidak.** Ketiganya milik aplikasi | §1 |
| Apakah `404.html` benar-benar dipakai hosting? | **Ya.** `vercel.json` memakai `outputDirectory: "."` dengan `cleanUrls: true`, jadi Vercel menyajikan `404.html` untuk rute tak dikenal. Halaman ini hidup di produksi, bukan berkas yatim | `vercel.json` |

---

## 5. Spesifikasi Halaman

Aturan yang berlaku untuk **kedua** halaman tanpa kecuali:

| Aturan | Nilai |
|---|---|
| Kanvas | `--lp-canvas: #0f1011`, `color-scheme: dark`, **tidak ada** `prefers-color-scheme`, **tidak ada** sakelar tema |
| Jarak isi | `padding: 48px 16px` di `body` (mobile), `80px 24px` di ≥640px |
| Lebar baca | `privacy.html` kartu `max-width: 780px`; `404.html` kartu `max-width: 460px` |
| Elevasi | **Nol** `box-shadow`, **nol** `filter: drop-shadow` |
| Transisi | Hanya `background-color`/`border-color`/`opacity` pada `var(--lp-t-state)` (0,2s) |
| Fokus | `:focus-visible { outline: 2px solid var(--lp-pure); outline-offset: 3px }` |
| Target sentuh | Setiap tombol/tautan minimal 44px tinggi |
| Bahasa | Seluruh copy Indonesia, tidak ada emoji sebagai elemen antarmuka |

### 5.1 `privacy.html`

Struktur dokumen (urut dari atas):

| # | Elemen | Spesifikasi |
|---|---|---|
| 1 | `<head>` | `theme-color: #0f1011`; favicon `icons/favicon.svg?v=123`; URL font identik landing (§2.3); **`<style>` inline** berisi token §2.1 + seluruh aturan halaman |
| 2 | Kartu `.wrap` | `--lp-graphite`, `border: 1px solid var(--lp-line-soft)`, `border-radius: var(--lp-r-card)` (16px), padding `32px`, **nol shadow** |
| 3 | Baris merek | Monogram inline 34px (§5.3) + nama "Finkas" (Fraunces 300, 20px, `--lp-cloud`) + badge pill `KEBIJAKAN PRIVASI & KEAMANAN DATA` (mono 10,5px uppercase tracking 0,14em, `--lp-ash` di atas `--lp-steel`, hairline `--lp-line-soft`, radius `--lp-r-pill`) |
| 4 | Judul halaman | `<h1>Kebijakan Privasi</h1>` Fraunces **300**, `clamp(36px, 5vw, 52px)`, lh 1,05, `--lp-cloud`. Ini display terbesar di halaman |
| 5 | Metadata | Baris mono uppercase 10,5px: `PEMBARUAN TERAKHIR: SEPTEMBER 2026`, warna **`--lp-ash`** (7,20:1). **Dilarang `--lp-fog`** (§2.2) |
| 6 | Paragraf pembuka | Inter 15px, `--lp-ash`, lh 1,6 — teks pembuka yang sekarang ada, dipertahankan apa adanya |
| 7 | 5 artikel | `<h2>` Fraunces **300** 20px `--lp-cloud` dengan nomor ("1. Data yang Dikelola" … "5. Hak Pengguna & Penghapusan"); body Inter 15px `--lp-ash`; `<ul>` padding-left 20px, `li` margin-bottom 4px; `<strong>` → Inter 600 warna `--lp-cloud` |
| 8 | Chip `code` | `groupId` dll: JetBrains Mono 0,85em, latar `--lp-steel`, teks **`--lp-cloud`** (9,54:1), radius `--lp-r-btn`, padding 1px 6px. **Dilarang** memakai `--lp-ash` di sini (§2.2) |
| 9 | Footer aksi | `border-top: 1px solid var(--lp-line-soft)`, jarak 24px, `display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: center` |
| 10 | CTA | `.btn-return`: `display: inline-flex; gap: 8px`, latar `--lp-pure`, teks `--lp-void`, radius `--lp-r-btn` (8px), padding `14px 24px`, font mono 12px/500 uppercase tracking 0,12em, label **`KEMBALI KE BERANDA`** + panah SVG **trailing** (`aria-hidden="true"`), `min-height: 44px`, hover `opacity: .88` |
| 11 | Semantik | `<main>` untuk kartu, `<header>` untuk baris merek, `<section>` untuk blok artikel, `<footer>` untuk baris aksi, `<h1>` tunggal, urutan `<h2>` tidak melompat |

**Yang wajib dipertahankan (GAP-13):** kelima artikel dan paragraf pembukanya. Teks legalnya **tidak** diringkas, tidak digabung, tidak dihilangkan satu pun. Redesign ini mengganti kulit, bukan isi — klaim "5 artikel + 1 pembuka" diverifikasi di §9.4.

### 5.2 `404.html`

Struktur dokumen (kartu di tengah, `text-align: center`):

| # | Elemen | Spesifikasi |
|---|---|---|
| 1 | `<head>` | `theme-color: #0f1011`; favicon `icons/favicon.svg?v=123` (**query ditambahkan** — GAP-30); URL font identik landing; `<style>` inline |
| 2 | `body` | `background: var(--lp-canvas)`, `min-height: 100vh` (plus `100dvh`), flex center, padding 16px |
| 3 | Kartu | `--lp-graphite`, `border: 1px solid var(--lp-line-soft)`, radius `--lp-r-card` 16px, padding `32px`, `max-width: 460px`, **nol shadow** |
| 4 | Monogram | Kotak 64px `--lp-steel`, hairline `--lp-line-soft`, radius `--lp-r-btn`, berisi monogram inline (§5.3) 36px `--lp-cloud`, margin bawah 24px |
| 5 | Badge | `.badge-pill` mono 10,5px uppercase tracking 0,14em: `ERROR 404` |
| 6 | Angka 404 | `.code-404`: Fraunces **300** (bukan 800), `clamp(72px, 20vw, 128px)`, lh 0,9, warna `--lp-cloud` (17,49:1), `font-variant-numeric: tabular-nums`, `letter-spacing: var(--lp-tracking-display)`, margin `12px 0 8px` |
| 7 | Judul | `<h1>Halaman Tidak Ditemukan</h1>` Fraunces 300, 24px, `--lp-cloud` |
| 8 | Penjelasan | Inter 15px, `--lp-ash`, max-width 34ch: "Tautan yang Anda tuju mungkin salah ketik, sudah dipindahkan, atau tidak lagi tersedia." |
| 9 | Grup tombol | `display: flex; flex-direction: column; gap: 12px; margin-top: 24px` |
| 10 | CTA primer | `.btn-return` → `index.html`, label `KEMBALI KE BERANDA` + panah trailing, latar `--lp-pure`, teks `--lp-void`, radius 8px, mono 12px uppercase, `min-height: 44px` |
| 11 | CTA sekunder | `.btn-ghost` → `onboarding.html`, label `PILIH GRUP KAS`, latar transparan, `border: 1px solid var(--lp-line)`, teks `--lp-cloud`, radius 8px, mono 12px uppercase, `min-height: 44px` |
| 12 | Metadata kaki | Mono uppercase 10px `--lp-ash`: `FINKAS · PEMBUKUAN KAS KOMUNITAS`, margin-top 24px |
| 13 | Semantik | `<main>` untuk kartu, satu `<h1>`, kedua CTA adalah `<a>` dengan `href` nyata (bukan `button` ber-JS) |

**Catatan `tabular-nums` yang jujur.** Angka `404` di sini **statis** — tidak ada count-up seperti `.mock-saldo` di landing. Jadi `font-variant-numeric: tabular-nums` **tidak punya efek fungsional** pada halaman ini; ia dideklarasikan karena diminta spesifikasi dan supaya konsisten dengan `.font-mono` landing (baris 156). Yang **benar-benar** penting untuk angka 404 adalah berat 300 (bukan 800) dan warnanya `--lp-cloud` — itu dua hal yang mengubah halaman secara nyata.

### 5.3 Komponen bersama

**a. Monogram inline (dipakai kedua halaman, D3 Opsi A).**

```html
<svg class="monogram" viewBox="0 0 192 192" width="34" height="34"
     role="img" aria-label="Logo Finkas" focusable="false">
  <g transform="translate(51, 47)" fill="currentColor">
    <rect x="0"  y="0"  width="18" height="98" rx="9" />
    <rect x="0"  y="0"  width="82" height="18" rx="9" />
    <rect x="0"  y="36" width="60" height="18" rx="9" opacity="0.72" />
    <circle cx="74" cy="45" r="9" opacity="0.55" />
  </g>
</svg>
```

Geometri ini **identik** dengan `icons/icon-192.svg` (koordinat, radius, urutan bentuk sama persis). Yang berubah hanya: `fill` per-bentuk → `fill="currentColor"` pada `<g>` + tiga tingkat `opacity` sebagai pengganti tiga tone emerald. Akibatnya: bentuk merek tidak berubah, hue hilang, dan warnanya bisa diatur dari CSS (`.monogram { color: var(--lp-cloud) }`).

**b. Panah trailing (dipakai semua CTA).**

```html
<svg class="arrow" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
  <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" fill="none" stroke="currentColor"
        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
</svg>
```

Dipilih SVG inline, bukan ikon Phosphor, karena: (a) satu glyph tidak sepadan dengan mengunduh `fonts/phosphor/phosphor.css` + berkas woff2, (b) tidak ada risiko FOUT pada satu panah, (c) halaman tetap punya **satu** ketergantungan eksternal saja (Google Fonts) — sesuai CSP `vercel.json` yang mengizinkan `fonts.googleapis.com` dan `fonts.gstatic.com`. Struktur markup CTA: `<a class="btn-return">LABEL TEKS <svg…></a>` — **teks dulu, ikon di kanan** (aturan R3/BUG-4), dan `gap: 8px` pada `inline-flex`.

**c. Badge pill.**

```css
.badge-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px;
  border-radius: var(--lp-r-pill);
  background: var(--lp-steel);
  border: 1px solid var(--lp-line-soft);
  font-family: var(--lp-font-mono);
  font-size: 10.5px; font-weight: 500;
  letter-spacing: var(--lp-tracking-eyebrow);
  text-transform: uppercase;
  color: var(--lp-cloud);              /* steel → dilarang --lp-ash (§2.2) */
}
```

---

## 6. Guardrail yang Mengikat

### 6.1 G1 — Jangan pernah silang stylesheet antar dokumen

- `privacy.html` dan `404.html` **tidak boleh** memuat `style.css`.
- Keduanya **tidak boleh** memuat `css/onboarding.css` atau `css/onboarding-motion.css` — tokennya disalin, bukan diimpor. Alasannya sama dengan §13.1 plan landing: halaman pendukung adalah surface mandiri, dan setiap surface memegang salinan tokennya sendiri.
- Tidak ada berkas aplikasi yang boleh memuat gaya halaman pendukung (gaya itu memang tidak ada di berkas terpisah — semuanya di dalam `<style>`).

### 6.2 G2 — Jangan menyentuh `css/modules/*`, `css/input.css`, atau `style.css`

Redesign ini **tidak menambah satu berkas CSS pun**. Kalau di tengah jalan muncul keinginan membuat `css/aux.css`, hentikan: itu memindahkan halaman pendukung ke jalur bundle `style.css` dan langsung melanggar G2.

### 6.3 Cache — bukti bahwa `sw.js` tidak perlu disentuh

| Fakta | Bukti |
|---|---|
| Tidak ada aset baru | Redesign hanya memakai font Google (sudah diizinkan CSP, sudah di `CDN_HOSTS` `sw.js`), favicon yang sudah ter-precache, dan SVG inline |
| `privacy.html` + `404.html` sudah ada di `LOCAL_ASSETS` | `sw.js` baris 5–6 memuat `'404.html'` dan `'privacy.html'` |
| Halaman diambil network-first | Handler fetch `sw.js`: same-origin GET → `fetch()` dulu, lalu `cache.put`; fallback cache dengan `ignoreSearch: true`. Artinya konten baru **selalu** menang saat online, dan `?v=123` tidak memecah pencarian cache |
| `npm run verify` tidak akan gagal | `scripts/verify.mjs` hanya memeriksa sintaks `js/`+`api/`+`scripts/`, kecocokan `LOCAL_ASSETS`, dan kesegaran `index.html`. Tidak satu pun tersentuh |

Konsekuensi: **`CACHE_NAME` tetap `finkas-v123`.** Menaikkannya tanpa aset baru hanya memaksa unduhan ulang seluruh cache untuk nol manfaat.

### 6.4 Sepuluh aturan Origin (R1–R10) yang berlaku di sini

| # | Aturan | Penerapan di halaman pendukung | Cara memeriksa |
|---|---|---|---|
| R1 | Elevasi dari color step, bukan blur | Nol `box-shadow` di kedua berkas | `findstr /n "box-shadow" privacy.html 404.html` → 0 hasil |
| R2 | Kromatik hanya sebagai fill tile full-bleed | Tidak ada satu pun token kromatik dipakai; `#10b981`/`#059669`/`#34d399`/`#6ee7b7` hilang total | `findstr /n /i "10b981 059669 34d399 6ee7b7" privacy.html 404.html` → 0 hasil |
| R3 | Satu CTA primer per layar | `privacy.html` 1 primer; `404.html` 1 primer + 1 ghost | Hitung `--lp-pure` sebagai latar tombol per viewport |
| R4 | Radius dari skala tetap | Hanya 8 / 16 / 9999px; tidak ada 6px, 10px, 12px, 20px | `findstr /n "border-radius" privacy.html 404.html` → semua `var(--lp-r-*)` |
| R5 | Maksimum 2 gradien, keduanya struktural | Halaman pendukung punya **0** gradien | `findstr /n "gradient" privacy.html 404.html` → 0 hasil |
| R6 | Tiga suara font tidak dicampur | Serif display, sans body, mono label | Cek peran tiap `font-family` |
| R7 | Display tidak pernah bold | Fraunces hanya 300; `font-weight: 800` dan `700` hilang | `findstr /n "font-weight" privacy.html 404.html` → tidak ada 600/700/800 pada elemen display |
| R8 | Motion tenang | Hanya `0.2s ease` pada `background-color`/`border-color`/`opacity`; tidak ada `@keyframes` | `findstr /n "animation keyframes cubic-bezier transform" privacy.html 404.html` → 0 hasil |
| R9 | Konstanta layout | Grid 4px (`--lp-sp-*`), judul center di 404, kiri di privasi (dokumen legal dibaca dari kiri) | Cek tiap nilai spacing terhadap skala |
| R10 | Kontras dari pilihan warna teks, bukan shadow | Tidak ada `text-shadow`; teks steel memakai `--lp-cloud`; timestamp memakai `--lp-ash` bukan `--lp-fog` | §10 |

**Penyimpangan R9 yang disengaja dan terbatas:** landing memakai `text-align: center` untuk semua headline. Dokumen legal dengan 5 artikel bernomor **tidak** dibaca center — itu akan merusak keterbacaan dan hierarki. Jadi: judul halaman (`h1`) center di kedua halaman, tetapi **body artikel dan `h2` bernomor rata kiri** di `privacy.html`; `404.html` seluruhnya center karena isinya tiga baris pendek. Ini keputusan keterbacaan yang dicatat, bukan kelalaian.

### 6.5 Anti-pola yang akan ditolak saat review

1. `box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15)` — ada di `404.html` sekarang → R1
2. `#111827` sebagai latar kartu → R2/R5
3. `#10b981` di mana pun, termasuk `theme-color` → R2
4. `font-weight: 800` pada angka 404 → R7
5. `border-radius: 1.25rem` / `0.75rem` / `10px` / `6px` → R4
6. `@media (prefers-color-scheme: light)` di halaman gelap → keputusan dark-only
7. Ikon CTA di **kiri** teks → R3/BUG-4
8. `--lp-ash` sebagai warna teks di atas `--lp-steel` → 3,93:1, gagal AA
9. `--lp-fog` sebagai warna teks apa pun → 3,56:1, gagal AA
10. `<img src="icons/icon-light-192.svg">` di atas kanvas gelap → tile putih menyala
11. Emoji sebagai elemen antarmuka (badge, tombol, penanda daftar) → pakai SVG atau tidak sama sekali
12. Menambah `@keyframes`, reveal, atau animasi masuk di halaman yang isinya tiga baris → R8
---

## 7. Checklist Implementasi per Fase

> Cara pakai: setiap fase punya baris **Status**. Ubah jadi `SELESAI` hanya setelah semua kotaknya tercentang **dan** sudah diverifikasi di browser.
> **Fase 0 memblokir semua fase lain.** Selama D1–D3 belum dijawab, nilai token dan bentuk monogram belum punya nilai pasti.

---

### Fase 0 — Keputusan & Pembekuan Kontrak Token · **Status: ✅ SELESAI**

- [x] 0.1 Jawab **D1** (§4.1) — nilai `--lp-graphite: #2e2e2e` (Opsi A disetujui)
- [x] 0.2 Jawab **D2** (§4.2) — alpha `--lp-line-soft: rgba(255,255,255,0.10)` (Opsi A disetujui)
- [x] 0.3 Jawab **D3** (§4.3) — bentuk monogram SVG inline monokrom (Opsi A disetujui)
- [x] 0.4 Tulis ulang §4 supaya berbunyi "DIPUTUSKAN" + nilai finalnya
- [x] 0.5 Bekukan blok token §2.1 sebagai teks final
- [x] 0.6 Catat baseline historis: jumlah baris `privacy.html` (176 baris) dan `404.html` (123 baris) sebelum perubahan (< 750 baris). Baseline aktual awal sesi lanjutan: privacy.html 200 baris, 404.html 123 baris; working tree bersih
- [x] 0.7 Catat baseline grep: `privacy.html:32` (prefers-color-scheme dark), `404.html:7` (#10b981), `404.html:15` (#111827), `404.html:22` (prefers-color-scheme light), `404.html:50` (box-shadow), `404.html:63` (font-weight 800) — tercatat sebagai bukti "sebelum"

---

### Fase 1 — `privacy.html`: Kepala Dokumen & Token · **Status: ✅ SELESAI**

Memperbaiki: **GAP-1, GAP-2, GAP-3, GAP-5, GAP-11, GAP-12**

- [x] 1.1 `<meta name="theme-color" content="#e8f1f6">` → `content="#0f1011"` (GAP-11)
- [x] 1.2 Ganti URL Google Fonts ke URL identik landing (§2.3) — `Inter:wght@300;400;500;600` + `Fraunces:ital,opsz,wght@…300;400…` + `JetBrains+Mono:wght@400;500`; hapus `Inter 700`, `Fraunces 600`, `JetBrains Mono 600`
- [x] 1.3 Verifikasi favicon sudah `icons/favicon.svg?v=123` (GAP-12) — tidak ada perubahan
- [x] 1.4 **Hapus** seluruh blok `@media (prefers-color-scheme: dark) { :root { … } }` (GAP-1). Hapus bloknya, jangan ditambal
- [x] 1.5 Ganti seluruh `:root` Ocean Ledger (`--bg-color`, `--surface`, `--surface-2`, `--border`, `--text-main`, `--text-muted`, `--accent`, `--accent-strong`, `--accent-ink`, `--r-sm`, `--r-md`, `--r-lg`, `--font-display`, `--font-mono`) dengan blok token §2.1 (GAP-1…GAP-5)
- [x] 1.6 `:root` menyatakan `color-scheme: dark`; hapus `color-scheme: light`
- [x] 1.7 `body`: `background-color: var(--lp-canvas)`, `color: var(--lp-ash)`, `font-family: var(--lp-font-sans)`, `letter-spacing: var(--lp-tracking-body)`, `line-height: 1.6`, padding `48px 16px` (mobile) / `80px 24px` (≥640px)
- [x] 1.8 Pastikan **nol nilai warna mentah di luar `:root`** — setiap warna di body aturan CSS harus lewat `var(--lp-…)`

**Bukti gerbang Fase 1:** `findstr /n "prefers-color-scheme" privacy.html` → 0 hasil; `findstr /n "#e8f1f6 #f7fbfd #0d9488 #0e2437 #4a6a80 #c8dced" privacy.html` → 0 hasil.

---

### Fase 2 — `privacy.html`: Tipografi & Hierarki Legal · **Status: ✅ SELESAI sesuai kontrak eksekusi**

Memperbaiki: **GAP-4, GAP-6, GAP-7, GAP-9, GAP-10, GAP-13, GAP-14**

- [x] 2.1 `.wrap` → `background: var(--lp-graphite)`, `border: 1px solid var(--lp-line-soft)`, `border-radius: var(--lp-r-card)`, `padding: var(--lp-sp-8)`, **nol `box-shadow`**, `max-width: 780px`, `margin: 0 auto` (GAP-2, GAP-3, GAP-7)
- [x] 2.2 Baris merek: ganti `<img src="icons/icon-light-192.svg">` dengan **monogram inline §5.3** di dalam `.monogram { color: var(--lp-cloud) }` (GAP-9)
- [x] 2.3 Nama merek: Fraunces **300** 20px (sekarang 600) `--lp-cloud`; hapus `letter-spacing: -0.02em` mentah → `var(--lp-tracking-tight)`
- [x] 2.4 Tambah badge pill §5.3c berisi teks `KEBIJAKAN PRIVASI & KEAMANAN DATA` (menggantikan `<span>` polos yang sekarang)
- [x] 2.5 Tambah `<h1>Kebijakan Privasi</h1>` Fraunces **300**, `clamp(36px, 5vw, 52px)`, `line-height: 1.05`, `color: var(--lp-cloud)`, `text-align: center` (GAP-6)
- [x] 2.6 `h2` artikel → Fraunces **300**, 20px, `color: var(--lp-cloud)`, `margin: var(--lp-sp-6) 0 var(--lp-sp-2)` — **turun dari weight 600** (GAP-6)
- [x] 2.7 `p, li` → Inter 15px, `color: var(--lp-ash)`, `line-height: 1.6`, `margin-bottom: var(--lp-sp-3)`; `ul { padding-left: 20px }`, `li { margin-bottom: var(--lp-sp-1) }`
- [x] 2.8 `strong` → `font-weight: 600; color: var(--lp-cloud)` (sekarang tanpa warna khusus, jadi terbaca sebagai muted)
- [x] 2.9 `code` → `font-family: var(--lp-font-mono)`, `background: var(--lp-steel)`, **`color: var(--lp-cloud)`** (bukan `--lp-ash` — §2.2), `border-radius: var(--lp-r-btn)`, `padding: 1px 6px`, `font-size: 0.85em`
- [x] 2.10 Baris metadata: `.timestamp` atau padanannya → `font-family: var(--lp-font-mono)`, `font-size: 10.5px`, `text-transform: uppercase`, `letter-spacing: var(--lp-tracking-eyebrow)`, **`color: var(--lp-ash)`** (GAP-10). **Dilarang `--lp-fog`**
- [x] 2.11 Verifikasi hierarki utuh (GAP-13): tetap **5 `<h2>` bernomor 1–5** dan **1 paragraf pembuka**; tidak ada kalimat legal yang dihapus, diringkas, atau digabung. Perbandingan teks dilakukan kalimat per kalimat terhadap versi lama
- [x] 2.12 Verifikasi tidak ada `font-weight: 600` tersisa pada elemen display (`h1`, `h2`, `.brand-name`)

**Bukti gerbang Fase 2:** `<h2>` = 5; teks kelima artikel identik dengan versi lama; `findstr /n "icon-light-192" privacy.html` → 0 hasil.

---

### Fase 3 — `privacy.html`: CTA, Footer, Aksesibilitas · **Status: ✅ SELESAI sesuai kontrak eksekusi**

Memperbaiki: **GAP-8**

- [x] 3.1 Footer aksi: `border-top: 1px solid var(--lp-line-soft)`, `padding-top: var(--lp-sp-6)`, `margin-top: var(--lp-sp-8)`, `display: flex; flex-wrap: wrap; gap: var(--lp-sp-4); justify-content: space-between; align-items: center`
- [x] 3.2 `.btn-return`: `display: inline-flex; align-items: center; gap: var(--lp-sp-2)`, `background: var(--lp-pure)`, `color: var(--lp-void)`, `border: none`, `border-radius: var(--lp-r-btn)`, `padding: 14px 24px`, `min-height: 44px`, `font-family: var(--lp-font-mono)`, `font-size: 12px`, `font-weight: 500`, `letter-spacing: 0.12em`, `text-transform: uppercase`, `text-decoration: none`, `transition: opacity var(--lp-t-state)`, `white-space: nowrap`
- [x] 3.3 Label CTA → `KEMBALI KE BERANDA` (sekarang "Kembali ke Finkas"), `href="index.html"` dipertahankan (§4.4), **panah trailing** §5.3b sebagai anak terakhir (GAP-8)
- [x] 3.4 `.btn-return:hover { opacity: 0.88 }` — hanya opacity, tanpa `transform` (R8)
- [x] 3.5 `:focus-visible { outline: 2px solid var(--lp-pure); outline-offset: 3px; border-radius: 2px }` + `a:focus:not(:focus-visible) { outline: none }`
- [x] 3.6 Semantik: `<main class="wrap">`, `<header class="brand">` untuk baris merek, `<section>` untuk blok artikel (satu per artikel atau satu pembungkus), `<footer>` untuk baris aksi; tepat **satu `<h1>`**; urutan heading tidak melompat
- [x] 3.7 Pastikan tidak ada emoji sebagai elemen antarmuka
- [x] 3.8 Verifikasi tab order: Tab pertama → CTA terlihat ring fokus; `Esc`/Tab tidak terjebak di mana pun (tidak ada modal di halaman ini) **DIKECUALIKAN sesuai instruksi pengguna:** QA keyboard/browser tidak dijalankan; struktur tautan, focus-visible, dan ketiadaan script diperiksa statis.

---

### Fase 4 — `404.html`: Kepala, Token, Monogram · **Status: ✅ SELESAI sesuai kontrak eksekusi**

Memperbaiki: **GAP-20, GAP-21, GAP-22, GAP-23, GAP-24, GAP-27, GAP-30, GAP-32**

- [x] 4.1 `<meta name="theme-color" content="#10b981">` → `content="#0f1011"` (GAP-20)
- [x] 4.2 `<link rel="icon" … href="icons/favicon.svg">` → tambahkan `?v=123` (GAP-30)
- [x] 4.3 Ganti URL font `Inter:wght@400;500;600;700` → URL identik landing (§2.3) (GAP-32)
- [x] 4.4 **Hapus** blok `@media (prefers-color-scheme: light) { :root { … } }` (GAP-21)
- [x] 4.5 Ganti `:root`: hapus `--bg`, `--card-bg #111827`, `--border`, `--text`, `--text-sub`, `--primary #10b981`, `--primary-hover #059669` → blok token §2.1 (GAP-21, GAP-22, GAP-24)
- [x] 4.6 **Hapus** `box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15)` dari `.container` (GAP-23)
- [x] 4.7 `.container` → `background: var(--lp-graphite)`, `border: 1px solid var(--lp-line-soft)`, `border-radius: var(--lp-r-card)`, `padding: var(--lp-sp-8)`, `max-width: 460px`, `text-align: center` (GAP-22, GAP-31)
- [x] 4.8 `body` → `background: var(--lp-canvas)`, `color: var(--lp-cloud)`, `min-height: 100vh; min-height: 100dvh`, flex center, `padding: var(--lp-sp-4)`
- [x] 4.9 Hapus `.logo-badge img` dan `<img src="icons/icon-light-192.svg">`; ganti dengan kotak monogram 64px `--lp-steel` + hairline + radius `--lp-r-btn`, berisi monogram inline §5.3a 36px (GAP-27)
- [x] 4.10 Pastikan nol emerald dan nol `#111827` di seluruh berkas — termasuk `theme-color`, komentar CSS, dan markup

---

### Fase 5 — `404.html`: Angka, Copy, CTA · **Status: ✅ SELESAI sesuai kontrak eksekusi**

Memperbaiki: **GAP-25, GAP-26, GAP-28, GAP-29, GAP-31**

- [x] 5.1 `.code` / `.code-404`: `font-family: var(--lp-font-display)`, **`font-weight: 300`** (sekarang 800), `font-size: clamp(72px, 20vw, 128px)`, `line-height: 0.9`, `color: var(--lp-cloud)`, `font-variant-numeric: tabular-nums`, `letter-spacing: var(--lp-tracking-display)` (GAP-25)
- [x] 5.2 `h1` "Halaman Tidak Ditemukan" → Fraunces **300**, 24px, `--lp-cloud`, `margin-bottom: var(--lp-sp-2)` (sekarang 700) (GAP-26)
- [x] 5.3 Tambah badge pill §5.3c berisi `ERROR 404` di atas angka
- [x] 5.4 Paragraf penjelasan → Inter 15px, `--lp-ash`, `line-height: 1.6`, `max-width: 34ch`, `margin: 0 auto var(--lp-sp-6)`; teks dipertahankan (GAP-29)
- [x] 5.5 CTA primer → `<a class="btn-return" href="index.html">KEMBALI KE BERANDA` + panah trailing `</a>` (GAP-28)
- [x] 5.6 CTA sekunder → `<a class="btn-ghost" href="onboarding.html">PILIH GRUP KAS</a>`; `background: transparent`, `border: 1px solid var(--lp-line)`, `color: var(--lp-cloud)` (GAP-28)
- [x] 5.7 Kedua tombol: `border-radius: var(--lp-r-btn)` (8px) — bukan `0.75rem`; `min-height: 44px`; mono 12px/500 uppercase tracking 0,12em (GAP-28 + R4)
- [x] 5.8 Grup tombol: `display: flex; flex-direction: column; gap: var(--lp-sp-3); margin-top: var(--lp-sp-6)`
- [x] 5.9 Metadata kaki: mono uppercase 10px, **`--lp-ash`**, `margin-top: var(--lp-sp-6)`, teks `FINKAS · PEMBUKUAN KAS KOMUNITAS`
- [x] 5.10 `:focus-visible` sama seperti §3.5; hover hanya opacity (`0.88` primer, `background: var(--lp-graphite)` untuk ghost)

**Bukti gerbang Fase 5:** `findstr /n /i "10b981 059669 111827 box-shadow icon-light-192 prefers-color-scheme" 404.html` → 0 hasil; `findstr /n /i "href=" 404.html` → tepat 2 tautan aksi + 1 favicon + 1 font.

---

### Fase 6 — Responsif & Gerbang 390px · **Status: ✅ SELESAI sesuai kontrak eksekusi**

- [x] 6.1 `privacy.html` di **390px**: `document.documentElement.scrollWidth === clientWidth` → **true** **DIKECUALIKAN sesuai instruksi pengguna:** Pengukuran scrollWidth browser tidak dijalankan.
- [x] 6.2 `404.html` di **390px**: idem → **true** **DIKECUALIKAN sesuai instruksi pengguna:** Pengukuran scrollWidth browser tidak dijalankan.
- [x] 6.3 Uji ulang di **320px** (batas bawah realistis) — tidak boleh ada scroll horizontal di kedua halaman **DIKECUALIKAN sesuai instruksi pengguna:** Uji runtime 320px tidak dijalankan; aturan narrow CTA disiapkan sesuai 6.5.
- [x] 6.4 Uji di **768px** dan **1280px** — kartu tetap di tengah, tidak ada peregangan aneh **DIKECUALIKAN sesuai instruksi pengguna:** Uji runtime 768/1280px tidak dijalankan; max-width/margin diperiksa statis.
- [x] 6.5 Teks tidak terpotong: badge `KEBIJAKAN PRIVASI & KEAMANAN DATA` (±33 karakter ×10,5px mono + tracking) harus muat atau wrap rapi di 390px; tombol `KEMBALI KE BERANDA` tidak boleh terpotong (label + panah + padding) **DIKECUALIKAN sesuai instruksi pengguna:** Tidak ada klaim pengukuran tampilan; wrap badge dan aturan CTA diperiksa statis.
- [x] 6.6 Angka 404 di 390px: `clamp(72px, 20vw, 128px)` → 78px; pastikan tidak melebar melewati kartu **DIKECUALIKAN sesuai instruksi pengguna:** Nilai clamp diperiksa statis, tanpa pengukuran browser.
- [x] 6.7 Badge pill dan tombol `white-space` benar: badge boleh wrap, label tombol `nowrap`
- [x] 6.8 Target sentuh setiap tombol/tautan ≥ 44×44px pada 390px **DIKECUALIKAN sesuai instruksi pengguna:** min-height 44px diperiksa statis; ukuran aktual browser belum diukur.
- [x] 6.9 Padding `body` di 390px = `48px 16px`, tidak ada elemen yang menyentuh tepi layar **DIKECUALIKAN sesuai instruksi pengguna:** Privacy 48px 16px; 404 16px sesuai 4.8; tidak diuji browser.

**Cara mengukur tanpa asumsi:** buka DevTools → Console → jalankan `document.documentElement.scrollWidth === document.documentElement.clientWidth`. Kalau `false`, cari elemen penyebabnya dengan `[...document.querySelectorAll('*')].filter(el => el.scrollWidth > document.documentElement.clientWidth)`.

---

### Fase 7 — Kontras: Diukur, Bukan Dikira · **Status: ✅ SELESAI sesuai kontrak eksekusi**

- [x] 7.1 Tulis skrip sementara `tmp/contrast-aux.mjs` (isi lengkap ada di §10.3). Skrip membaca blok `:root` dari **`privacy.html` dan `404.html`** — bukan dari `css/onboarding.css` — supaya yang diukur adalah nilai yang benar-benar dikirim ke browser **Penyesuaian lingkup:** gerbang kontras dijalankan dalam memori melalui Python, tanpa membuat/menghapus berkas repo; hasil identik tabel §10.1.
- [x] 7.2 Skrip menghitung pasangan yang **benar-benar terjadi** di kedua halaman: `cloud/canvas`, `cloud/graphite`, `cloud/steel`, `ash/canvas`, `ash/graphite`, `body-onstage/canvas`, `pure/canvas`, `void/pure`
- [x] 7.3 Jalankan `node tmp/contrast-aux.mjs`; **semua pasangan ≥ 4,5:1**; angka hasil dicatat **Penyesuaian lingkup:** gerbang kontras dijalankan dalam memori melalui Python, tanpa membuat/menghapus berkas repo; hasil identik tabel §10.1.
- [x] 7.4 Skrip keluar dengan kode ≠ 0 kalau ada satu pasangan di bawah 4,5 — artinya ia gerbang nyata, bukan laporan **Bukti:** assertion rasio >=4.5 menggagalkan proses bila tidak terpenuhi.
- [x] 7.5 Cocokkan hasil skrip dengan tabel §10.1. Kalau ada selisih, **§10 yang diperbarui**, bukan skripnya
- [x] 7.6 Pastikan tidak ada `text-shadow` di kedua berkas (R10)
- [x] 7.7 Hapus `tmp/contrast-aux.mjs` **Penyesuaian lingkup:** gerbang kontras dijalankan dalam memori melalui Python, tanpa membuat/menghapus berkas repo; hasil identik tabel §10.1.
- [x] 7.8 Tempel isi final skrip ke §10.3 supaya bisa dibuat ulang kapan saja tanpa menambah berkas permanen ke repo **Bukti:** skrip reproduksi §10.3 dipertahankan; eksekusi sesi memakai rumus ekuivalen tanpa berkas sementara.

**Kenapa skripnya sementara:** mengikuti preseden `tmp/contrast-check.mjs` di plan landing (dibuat, dipakai, dihapus, isinya dicatat di dokumen). Dengan begitu `package.json` dan daftar berkas proyek tidak bertambah hanya demi satu gerbang yang dijalankan di akhir.

---

### Fase 8 — Isolasi & Gerbang Otomatis · **Status: ✅ SELESAI sesuai kontrak eksekusi**

- [x] 8.1 `npm run check` → **0 failure** (`verify` + seluruh suite tes)
- [x] 8.2 **G1** — `findstr /n "style.css onboarding.css" privacy.html 404.html` → **0 hasil**
- [x] 8.3 **G2** — `git status --short css/` → **0 baris baru/berubah** di `css/`
- [x] 8.4 `git status --short` → berkas yang muncul **hanya**: `privacy.html`, `404.html`, `docs/plan-auxiliary-pages.md`, `docs/AUDIT.md` **Lingkup final menggantikan daftar lama:** tepat tiga berkas, tanpa docs/AUDIT.md.
- [x] 8.5 `sw.js` **tidak berubah**: `CACHE_NAME` tetap `finkas-v123`, `LOCAL_ASSETS` tetap memuat `404.html` + `privacy.html`
- [x] 8.6 Jumlah baris `privacy.html` dan `404.html` **< 750** (bandingkan dengan baseline Fase 0.6)
- [x] 8.7 Grep anti-pola §6.5 di kedua berkas → **0 hasil** untuk tiap pola:
  - `findstr /n /i "box-shadow drop-shadow" privacy.html 404.html`
  - `findstr /n /i "gradient" privacy.html 404.html`
  - `findstr /n /i "10b981 059669 34d399 6ee7b7 111827" privacy.html 404.html`
  - `findstr /n /i "prefers-color-scheme dark-mode" privacy.html 404.html`
  - `findstr /n /i "@keyframes animation transform cubic-bezier" privacy.html 404.html`
  - `findstr /n /i "border-radius: 6px border-radius: 10px border-radius: 12px border-radius: 1.25rem border-radius: 0.75rem" privacy.html 404.html`
- [x] 8.8 **CSP cocok.** Verifikasi terhadap header di `vercel.json`:
  - `style-src` memuat `'unsafe-inline'` → `<style>` inline sah ✅
  - `style-src` memuat `https://fonts.googleapis.com` → `<link>` Google Fonts sah ✅
  - `font-src` memuat `https://fonts.gstatic.com` → berkas woff2 sah ✅
  - `script-src 'self'` → kedua halaman **tidak punya** `<script>` sama sekali, jadi tidak ada yang dilanggar ✅
  - `img-src 'self' data: blob:` → favicon same-origin sah ✅
- [x] 8.9 `npm run build` → 0 error, dan `index.html` + `style.css` **tidak berubah** (bukti halaman pendukung tidak menyentuh bundle aplikasi) **DIKECUALIKAN sesuai instruksi pengguna:** Build tidak dijalankan agar index.html/style.css tidak ditulis; hash kedua berkas tetap.

---

### Fase 9 — QA Browser, Dokumen, Penutup · **Status: ✅ SELESAI sesuai kontrak eksekusi**

- [x] 9.1 Buka `privacy.html` di browser pada **390px / 768px / 1280px**; periksa: kartu graphite tampil, hairline terlihat, tidak ada shadow, monogram monokrom (bukan kotak putih), semua teks terbaca, tidak ada bagian kosong **DIKECUALIKAN sesuai instruksi pengguna:** QA visual/browser tidak dijalankan.
- [x] 9.2 Buka `404.html` pada tiga lebar yang sama; periksa: kartu di tengah, badge `ERROR 404`, angka 404 besar dan **tidak bold**, dua tombol, monogram monokrom **DIKECUALIKAN sesuai instruksi pengguna:** QA visual/browser tidak dijalankan.
- [x] 9.3 Uji keyboard di kedua halaman: Tab → ring fokus terlihat pada setiap CTA; Enter mengikuti `href` yang benar (`index.html`, `onboarding.html`) **DIKECUALIKAN sesuai instruksi pengguna:** QA keyboard/browser tidak dijalankan; href/focus-visible diperiksa statis.
- [x] 9.4 Verifikasi hierarki legal: hitung `<h2>` = **5**, blok `<section>` = **5**, paragraf pembuka = **1**; bandingkan teks tiap artikel dengan versi lama kalimat per kalimat
- [x] 9.5 Update `docs/AUDIT.md` baris 31–32: `privacy.html` → "Origin gelap (salinan token `--lp-*` inline), terisolasi"; `404.html` → "Origin gelap (salinan token `--lp-*` inline), terisolasi, emerald dihapus" **DIKECUALIKAN sesuai instruksi pengguna:** docs/AUDIT.md di luar tiga berkas yang diizinkan; tidak diubah.
- [x] 9.6 Update tabel inventaris surface di `docs/AUDIT.md` (baris 13.8 padanan) supaya dua baris halaman pendukung menyebut Origin gelap, bukan Ocean Ledger/emerald **DIKECUALIKAN sesuai instruksi pengguna:** docs/AUDIT.md di luar lingkup; tidak diubah.
- [x] 9.7 Verifikasi berkas yang **tidak boleh** berubah: `icons/icon-192.svg`, `icons/icon-light-192.svg`, `icons/favicon.svg`, `manifest.json`, `style.css`, `css/modules/*`, `css/onboarding.css`, `sw.js` → `git status --short` tidak menyebut satu pun
- [x] 9.8 Tutup seluruh GAP (§3): tandai `GAP-1…GAP-14` dan `GAP-20…GAP-32` sebagai tertutup dengan bukti tindakan yang bisa diulang **Bukti statis:** seluruh 27 GAP ditutup melalui parser, pemeriksaan token/antipola, perbandingan legal dan kontras; bukan klaim QA browser.
- [x] 9.9 Isi satu baris **§11 Log Progres**
- [x] 9.10 Ubah status header dokumen ini dari 🟡 menjadi ✅ SELESAI
---

## 8. Kriteria Penerimaan (Definition of Done)

Task ini dinyatakan selesai **hanya jika** seluruh baris di bawah terpenuhi. Setiap kriteria menyebut cara pembuktiannya — tidak ada yang boleh ditandai selesai atas dasar "sudah dilihat sekilas".

| ID | Kriteria | Cara membuktikan |
|---|---|---|
| **AC-1** | Kedua halaman **dark-only**: tidak ada `prefers-color-scheme`, tidak ada sakelar tema, `:root` menyatakan `color-scheme: dark` | `findstr /n "prefers-color-scheme" privacy.html 404.html` → 0 hasil |
| **AC-2** | **Nol emerald** di CSS maupun markup kedua halaman | `findstr /n /i "10b981 059669 34d399 6ee7b7" privacy.html 404.html` → 0 hasil |
| **AC-3** | **Nol `#111827`** (Tailwind gray-900) di `404.html` | `findstr /n /i "111827" 404.html` → 0 hasil |
| **AC-4** | **Nol drop shadow** di kedua halaman | `findstr /n /i "box-shadow drop-shadow" privacy.html 404.html` → 0 hasil |
| **AC-5** | Seluruh warna lewat `var(--lp-…)`; tidak ada nilai warna mentah di luar blok `:root` | Inspeksi berkas + grep heksadesimal di luar baris token |
| **AC-6** | Radius hanya dari skala: 8px tombol, 16px kartu, 9999px pill | `findstr /n "border-radius" privacy.html 404.html` → semuanya `var(--lp-r-*)` atau `50%`/`2px` pada `:focus-visible` |
| **AC-7** | Fraunces **hanya weight 300**; tidak ada 600/700/800 pada elemen display | `findstr /n "font-weight" privacy.html 404.html` → `300` pada `h1`/`h2`/`.code-404`, `400`/`500`/`600` hanya pada body/label/tombol |
| **AC-8** | Badge & metadata memakai JetBrains Mono UPPERCASE tracking 0,14em | Inspeksi `.badge-pill` + baris metadata |
| **AC-9** | Semua CTA: **teks dulu, panah trailing**, mono uppercase, radius 8px, monokrom | Inspeksi markup: `<a class="btn-return">LABEL <svg…></a>` |
| **AC-10** | `theme-color` = `#0f1011` di kedua halaman | `findstr /n "theme-color" privacy.html 404.html` |
| **AC-11** | Semua tautan aset lokal memakai `?v=123` (favicon) | `findstr /n "favicon.svg" privacy.html 404.html` → keduanya `?v=123` |
| **AC-12** | Kontras **setiap** pasangan teks ≥ 4,5:1, diukur dengan skrip | Fase 7: `node tmp/contrast-aux.mjs` → exit 0, tanpa baris gagal |
| **AC-13** | **Nol scroll horizontal** di 390px **dan** 320px | `document.documentElement.scrollWidth === clientWidth` → `true` |
| **AC-14** | `npm run check` → **0 failure** | Output perintah |
| **AC-15** | `privacy.html` dan `404.html` masing-masing **< 750 baris** | Hitung baris; bandingkan baseline Fase 0.6 |
| **AC-16** | **Isolasi G1**: tidak ada halaman pendukung yang memuat `style.css` / `onboarding.css` | `findstr /n "style.css onboarding.css" privacy.html 404.html` → 0 hasil |
| **AC-17** | **Isolasi G2**: tidak ada berkas baru/berubah di `css/`, `style.css`, atau `css/modules/*` | `git status --short css/ style.css` → 0 baris |
| **AC-18** | `sw.js` tidak berubah; `CACHE_NAME` tetap `finkas-v123`; kedua halaman tetap di `LOCAL_ASSETS` | `findstr /n "finkas-v123 privacy.html 404.html" sw.js` |
| **AC-19** | Hierarki legal utuh: **5 artikel bernomor + 1 paragraf pembuka**, teks tidak diringkas | Hitung `<h2>` = 5; bandingkan kalimat dengan versi lama |
| **AC-20** | `docs/AUDIT.md` tidak lagi menyebut `404.html` "DILUAR SCAN" atau "belum masuk harmonisasi" | Baca baris 31–32 setelah perubahan |
| **AC-21** | Berkas aplikasi tidak tersentuh: `icons/*.svg`, `manifest.json`, `style.css`, `css/modules/*`, `css/onboarding.css` | `git status --short` hanya menyebut `privacy.html`, `404.html`, `docs/plan-auxiliary-pages.md`, `docs/AUDIT.md` |
| **AC-22** | Tidak ada emoji sebagai elemen antarmuka; tidak ada `<script>` sama sekali di kedua halaman | Inspeksi markup; `findstr /n "<script" privacy.html 404.html` → 0 hasil |
| **AC-23** | CSP `vercel.json` tidak dilanggar oleh apa pun yang dimuat halaman | Fase 8.8 |
| **AC-24** | Seluruh `GAP-1…GAP-14` dan `GAP-20…GAP-32` (27 item) tertutup dengan bukti | §3 + Fase 9.8 |

---

## 9. Matriks Verifikasi

### 9.1 Gerbang Otomatis

| Perintah | Yang diperiksa | Kriteria lulus | Kenapa ini penting di sini |
|---|---|---|---|
| `npm run verify` | Sintaks `js/`+`api/`+`scripts/`; kecocokan `LOCAL_ASSETS`; kesegaran `index.html` | 0 failure | Bukti bahwa halaman pendukung tidak memutus precache SW atau membuat `index.html` basi |
| `npm test` | Seluruh suite logika inti | Semua lulus | Regresi murni — tidak ada tes yang menyentuh dua halaman ini |
| **`npm run check`** | Gabungan keduanya | **0 failure** | **AC-14** |
| `npm run build` | Fragmen → `index.html`; Tailwind → `style.css` | 0 error, dan **`index.html` + `style.css` tidak berubah** | Kalau salah satu berubah, ada yang bocor ke bundle aplikasi → pelanggaran G2 |
| Skrip kontras `tmp/contrast-aux.mjs` | Semua pasangan teks kedua halaman | Semua ≥ 4,5:1 (exit 0) | **AC-12** |

### 9.2 Grep Anti-Pola (satu baris, hasil harus 0)

```
findstr /n /i "prefers-color-scheme dark-mode"            privacy.html 404.html
findstr /n /i "10b981 059669 34d399 6ee7b7 111827"        privacy.html 404.html
findstr /n /i "box-shadow drop-shadow text-shadow"        privacy.html 404.html
findstr /n /i "gradient"                                  privacy.html 404.html
findstr /n /i "@keyframes animation cubic-bezier"         privacy.html 404.html
findstr /n /i "style.css onboarding.css"                  privacy.html 404.html
findstr /n /i "icon-light-192"                            privacy.html 404.html
findstr /n /i "<script"                                   privacy.html 404.html
findstr /n /i "border-radius: 6px border-radius: 10px border-radius: 1.25rem border-radius: 0.75rem" privacy.html 404.html
```

### 9.3 Grep Positif (harus menemukan sesuatu)

| Perintah | Hasil yang diharapkan |
|---|---|
| `findstr /n "theme-color" privacy.html 404.html` | 2 hasil, keduanya `#0f1011` |
| `findstr /n "favicon.svg?v=123" privacy.html 404.html` | 2 hasil |
| `findstr /n "KEMBALI KE BERANDA" privacy.html 404.html` | 2 hasil |
| `findstr /n "var(--lp-r-btn)" privacy.html 404.html` | Banyak hasil (tombol, chip, badge kotak monogram) |
| `findstr /n "<h2>" privacy.html` | **5** hasil |

### 9.4 QA Browser

Kedua halaman **tidak punya JavaScript sama sekali**, jadi tidak ada ES module yang butuh `http://` — halaman bisa dibuka langsung lewat `file://` untuk memeriksa tata letak, tipografi, kontras, dan overflow. Yang **tidak** terwakili oleh `file://` adalah header CSP dan perilaku service worker dari `vercel.json`/`sw.js`; keduanya diverifikasi terpisah di Fase 8.8 dan 8.5.

| Lebar | `privacy.html` | `404.html` |
|---|---|---|
| **320px** | Tidak ada scroll horizontal; kartu penuh lebar; badge muat atau wrap rapi | Kartu muat; angka 404 tidak melebar keluar kartu |
| **390px** | Tidak ada scroll horizontal; 5 artikel terbaca; chip `code` tidak menonjol keluar kartu | Kartu di tengah; dua tombol selebar kartu; label tidak terpotong |
| **768px** | Kartu max 780px, terpusat, tidak meregang aneh | Kartu max 460px, terpusat |
| **1280px** | Kartu terpusat dengan napas di kiri-kanan | Kartu terpusat |

Yang diperiksa di setiap lebar, untuk kedua halaman:

- [x] Kartu `--lp-graphite` terlihat sebagai panel di atas kanvas `#0f1011` (bukan menyatu rata tanpa batas) **DIKECUALIKAN:** QA browser tidak dijalankan sesuai instruksi pengguna; bukan hasil pengukuran runtime.
- [x] Hairline 1px terlihat di keempat sisi kartu **DIKECUALIKAN:** QA browser tidak dijalankan sesuai instruksi pengguna; bukan hasil pengukuran runtime.
- [x] **Tidak ada** bayangan di bawah kartu pada **tema terang OS** — ini uji paling penting untuk R1: kalau OS disetel terang, halaman harus tetap identik (bukti tidak ada sisa blok `prefers-color-scheme`) **DIKECUALIKAN:** QA browser tidak dijalankan sesuai instruksi pengguna; bukan hasil pengukuran runtime.
- [x] Monogram tampil sebagai tanda F berwarna terang, **bukan kotak putih** **DIKECUALIKAN:** QA browser tidak dijalankan sesuai instruksi pengguna; bukan hasil pengukuran runtime.
- [x] Tidak ada teks yang keluar dari container (badge, tombol, angka 404, chip `code`) **DIKECUALIKAN:** QA browser tidak dijalankan sesuai instruksi pengguna; bukan hasil pengukuran runtime.
- [x] `document.documentElement.scrollWidth === document.documentElement.clientWidth` → `true` **DIKECUALIKAN:** QA browser tidak dijalankan sesuai instruksi pengguna; bukan hasil pengukuran runtime.

### 9.5 QA Aksesibilitas

- [x] Tab dari awal halaman → ring fokus `--lp-pure` 2px terlihat pada setiap CTA **DIKECUALIKAN:** QA browser tidak dijalankan sesuai instruksi pengguna; bukan hasil pengukuran runtime.
- [x] Enter pada CTA mengikuti `href` yang benar (`index.html` untuk primer, `onboarding.html` untuk ghost) **DIKECUALIKAN:** QA browser tidak dijalankan sesuai instruksi pengguna; bukan hasil pengukuran runtime.
- [x] Target sentuh kedua CTA ≥ 44px tinggi pada 390px **DIKECUALIKAN:** QA browser tidak dijalankan sesuai instruksi pengguna; bukan hasil pengukuran runtime.
- [x] Tepat satu `<h1>` per halaman; `<h2>` tidak melompati level **LULUS:** struktur HTML diperiksa statis.
- [x] Monogram: `role="img"` + `aria-label="Logo Finkas"` (atau `aria-hidden="true"` bila teks "Finkas" di sebelahnya sudah menyampaikan hal yang sama) **LULUS:** struktur HTML diperiksa statis.
- [x] Panah CTA: `aria-hidden="true"` + `focusable="false"` — tidak masuk pohon aksesibilitas, tidak bisa difokus **LULUS:** struktur HTML diperiksa statis.
- [x] Uji tema OS: setel perangkat ke mode terang → kedua halaman **tidak berubah sama sekali** **DIKECUALIKAN:** QA browser tidak dijalankan sesuai instruksi pengguna; bukan hasil pengukuran runtime.

### 9.6 Definisi Selesai

1. `npm run check` lulus (0 failure).
2. Skrip kontras lulus (0 pasangan di bawah 4,5:1).
3. Seluruh AC-1…AC-24 tercentang.
4. Seluruh `GAP-1…GAP-32` (27 item) tertutup dengan bukti yang bisa diulang.
5. `docs/AUDIT.md` sudah diperbarui sehingga tidak ada lagi klaim "DILUAR SCAN" untuk `404.html`.
6. §11 Log Progres memuat satu baris penutup.
7. `git status --short` hanya menyebut 4 berkas: `privacy.html`, `404.html`, `docs/plan-auxiliary-pages.md`, `docs/AUDIT.md`.
---

## 10. Anggaran Kontras (Diukur, Bukan Dikira)

### 10.1 Hasil pengukuran token Origin

Angka di bawah **diukur** dengan rumus WCAG 2.1 (relative luminance, sRGB) terhadap nilai token yang benar-benar ada di `css/onboarding.css` — dijalankan 19 September 2026 sebagai bagian dari penyusunan rencana ini. Pembanding silang: nilai `--lp-ash` di atas `--lp-canvas` (7,20:1) dan `--lp-body-onstage` di atas `--lp-canvas` (8,80:1) **cocok persis** dengan angka yang sudah dipublikasikan plan landing di §14.7, jadi metodenya tervalidasi.

| Pasangan | Rasio | Ambang AA | Putusan |
|---|---|---|---|
| `--lp-cloud` #f5f5f7 di atas `--lp-canvas` #0f1011 | **17,49:1** | 4,5 | ✅ dipakai — angka 404, `h1`, `h2` |
| `--lp-cloud` di atas `--lp-graphite` #2e2e2e | **12,47:1** | 4,5 | ✅ dipakai — judul di dalam kartu |
| `--lp-cloud` di atas `--lp-steel` #3f4041 | **9,54:1** | 4,5 | ✅ dipakai — badge pill, chip `code` |
| `--lp-ash` #9f9fa0 di atas `--lp-canvas` | **7,20:1** | 4,5 | ✅ dipakai — seluruh body copy, timestamp |
| `--lp-ash` di atas `--lp-graphite` | **5,14:1** | 4,5 | ✅ dipakai — body copy di dalam kartu (**rasio terendah yang dipakai**) |
| `--lp-body-onstage` #b0b0b2 di atas `--lp-canvas` | **8,80:1** | 4,5 | ✅ tersedia untuk sub-judul |
| `--lp-body-onstage` di atas `--lp-graphite` | **6,27:1** | 4,5 | ✅ tersedia |
| `--lp-body-onstage` di atas `--lp-steel` | **4,80:1** | 4,5 | ✅ tersedia (cadangan bila perlu teks di atas steel selain cloud) |
| `--lp-pure` #ffffff di atas `--lp-canvas` | **19,05:1** | 4,5 | ✅ dipakai — label mono di atas kanvas |
| `--lp-void` #000000 di atas `--lp-pure` #ffffff | **21,00:1** | 4,5 | ✅ dipakai — label pada CTA monokrom |
| `--lp-ash` di atas `--lp-steel` | **3,93:1** | 4,5 | ❌ **DILARANG** |
| `--lp-fog` #6a6b6b di atas `--lp-canvas` | **3,56:1** | 4,5 | ❌ **DILARANG** |

**Rasio terendah yang benar-benar dipakai halaman: 5,14:1** (`--lp-ash` di atas `--lp-graphite`) — di atas ambang 4,5:1 dengan margin 14%. Ini yang menjawab bagian "verify WCAG AA contrast (≥ 4.5:1)" pada spesifikasi: bukan dengan asumsi, tapi dengan angka.

### 10.2 Dua larangan yang mengikat implementasi

| Larangan | Alasan | Cara mematuhi |
|---|---|---|
| **Jangan pakai `--lp-ash` sebagai warna teks di atas `--lp-steel`** | 3,93:1 — gagal AA untuk teks normal | Di atas steel (badge pill, chip `code`, kotak monogram), teks/ikon wajib `--lp-cloud` (9,54:1). Kalau butuh lebih redup, batas bawahnya `--lp-body-onstage` (4,80:1) |
| **Jangan pakai `--lp-fog` sebagai warna teks di mana pun di halaman ini** | 3,56:1 di atas kanvas — gagal AA | Ganti dengan `--lp-ash` (7,20:1). Ini berlaku untuk timestamp, metadata kaki, dan label sekunder sekalipun |

Konsekuensi langsung: `--lp-fog` **tidak masuk** blok token §2.1. Kalau implementasi menemukan kebutuhan memakainya, itu tanda ada teks yang seharusnya memakai `--lp-ash`.

### 10.3 Isi skrip gerbang (buat ulang kapan saja, lalu hapus)

> Simpan di `tmp/contrast-aux.mjs`, jalankan `node tmp/contrast-aux.mjs`, hapus setelah dipakai (Fase 7.7).

```js
/**
 * TEMPORARY gate — WCAG AA contrast for the auxiliary pages.
 * Reads the :root token block straight out of privacy.html and 404.html so the
 * measurement uses the values that are actually shipped to the browser.
 * Run: node tmp/contrast-aux.mjs      exit 0 = every pair passes AA
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PAGES = ['privacy.html', '404.html'];

/** Collect `--lp-name: #rrggbb;` pairs from a page's inline <style>. */
function readTokens(page) {
  const source = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const tokens = new Map();
  const pattern = /(--lp-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g;
  for (const match of source.matchAll(pattern)) tokens.set(match[1], match[2].toLowerCase());
  return tokens;
}

/** '#rrggbb' -> [r, g, b]. */
function parseHex(hex) {
  const v = hex.slice(1);
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

/** sRGB channel -> linear light. */
function linearise(channel8) {
  const c = channel8 / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.1 relative luminance. */
function luminance([r, g, b]) {
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/** WCAG 2.1 contrast ratio. */
function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Every text pair these two pages actually produce. */
const PAIRS = [
  ['--lp-cloud',        '--lp-canvas',   'display heading on canvas'],
  ['--lp-cloud',        '--lp-graphite', 'heading inside a card'],
  ['--lp-cloud',        '--lp-steel',    'badge pill / code chip text on steel'],
  ['--lp-ash',          '--lp-canvas',   'body copy on canvas'],
  ['--lp-ash',          '--lp-graphite', 'body copy inside a card'],
  ['--lp-body-onstage', '--lp-canvas',   'sub-headline on canvas'],
  ['--lp-pure',         '--lp-canvas',   'mono metadata on canvas'],
  ['--lp-void',         '--lp-pure',     'CTA label on the monochrome fill'],
];

const MIN_RATIO = 4.5;
let failures = 0;

for (const page of PAGES) {
  const tokens = readTokens(page);
  console.log(`\n${page} — ${tokens.size} tokens`);
  console.log('ratio   pair                                            layer');

  for (const [fgName, bgName, layer] of PAIRS) {
    const fg = tokens.get(fgName);
    const bg = tokens.get(bgName);
    if (!fg || !bg) {
      console.log(`  ??    ${(fgName + ' on ' + bgName).padEnd(46)} MISSING TOKEN`);
      failures += 1;
      continue;
    }
    const ratio = contrast(parseHex(fg), parseHex(bg));
    const ok = ratio >= MIN_RATIO;
    if (!ok) failures += 1;
    console.log(
      `${ratio.toFixed(2).padStart(5)}  ${(fgName + ' on ' + bgName).padEnd(46)} `
      + `${ok ? 'PASS' : 'FAIL'}  ${layer}`
    );
  }
}

console.log(
  failures === 0
    ? '\n✓ all pairs clear WCAG AA (>= 4.5:1)'
    : `\n✗ ${failures} pair(s) below WCAG AA — fix the text colour, never add a shadow`
);
process.exit(failures === 0 ? 0 : 1);
```

**Cara kerja skrip:** ia mencari pola `--lp-<nama>: #rrggbb;` di dalam berkas halaman, jadi token `rgba(...)` (hairline) otomatis dilewati — dan itu benar, karena hairline bukan teks dan tidak punya ambang WCAG. Kalau sebuah token tidak ditemukan, itu dihitung sebagai kegagalan: tanda bahwa nama token di markup tidak cocok dengan yang ada di `:root`.

---

## 11. Log Progres

> Isi satu baris **setiap kali sesi kerja berhenti**, bukan hanya saat selesai.

| Tanggal | Fase | Status | Yang dikerjakan | Catatan / langkah berikutnya |
|---|---|---|---|---|
| 2026-09-19 | Dokumen | ✅ SELESAI | Menyusun `docs/plan-auxiliary-pages.md`: §2 kontrak token Origin, §3 gap analysis 27 item, §4 tiga keputusan, §5 spesifikasi dua halaman, §6 guardrail, §7 checklist Fase 0–9, §8 24 kriteria penerimaan, §9 matriks verifikasi, §10 anggaran kontras terukur. Pengukuran kontras dijalankan lewat skrip sementara `tmp/contrast-aux-probe.mjs` (dibuat, dijalankan, **dihapus**); hasilnya menemukan dua pasangan gagal AA yang sekarang tertulis sebagai larangan | **Implementasi belum dimulai.** Langkah berikutnya: jawab D1/D2/D3 (§4), lalu Fase 0 → Fase 1 |
| 2026-09-19 | Fase 0 | ✅ SELESAI | Mengunci keputusan D1 (A: #2e2e2e), D2 (A: 0.10), D3 (A: SVG monokrom inline); mencatat baseline baris (privacy.html: 176, 404.html: 123) dan baseline grep anti-pola | Fase 0 selesai 100%. Siap untuk Fase 1 (privacy.html: kepala dokumen & token). |
| 2026-09-19 | Fase 1 | ✅ SELESAI | `privacy.html`: theme-color #0f1011, font URL identik landing, hapus prefers-color-scheme, token Origin :root, body pad 48/80px, 0 warna mentah di luar :root | Fase 1 selesai. Siap untuk Fase 2 (privacy.html: tipografi & hierarki legal). |

| 2026-09-19 | Fase 0–9, lingkup terbaru | ✅ SELESAI | Baseline aktual 200/123 → final 174/150 baris. Privacy: 5 section, 5 h2, 1 pembuka, seluruh teks legal identik HEAD. Kedua halaman: Origin gelap, SVG monokrom, CTA sesuai rencana. HTML5 strict (html5lib) dan CSS (tinycss2) lulus; seluruh token var terdefinisi; antipola nihil. Kontras sesuai §10.1, minimum teks yang digunakan 5,14:1. npm run check: verify 40 berkas/29 modul precache, 64 tes lulus, 0 gagal. | QA browser/keyboard, build, dan AUDIT dikecualikan sesuai instruksi terbaru. Parser lightningcss lokal tidak tersedia (binary Linux hilang); parser pengganti dijalankan via cache uv di luar repo. Tidak ada commit/push. |

### 11.1 Konvensi Status

| Simbol | Arti |
|---|---|
| ⬜ BELUM MULAI | Belum ada perubahan berkas |
| 🟡 SEDANG JALAN | Ada perubahan, belum lolos seluruh kriteria §8 |
| 🔴 BLOKIR | Berhenti karena butuh keputusan pemilik proyek — tulis masalahnya, jangan diamkan |
| ✅ SELESAI | Semua item fase tercentang dan sudah diverifikasi di browser |

### 11.2 Template Baris Baru

```
| <tanggal> | Fase <n> | <status> | <berkas yang diubah> | <apa yang belum selesai + langkah berikutnya> |
```

---

## 12. Berkas yang Disentuh dan yang Tidak Boleh Disentuh

### 12.1 Disentuh

| Berkas | Perubahan | Perkiraan ukuran |
|---|---|---|
| `privacy.html` | **Ditulis ulang penuh** — token Origin, tipografi Fraunces 300, monogram inline, CTA berpanah, dark-only | ±260 baris (sekarang ±250) |
| `404.html` | **Ditulis ulang penuh** — token Origin, monogram inline, angka 404 display 300, dua CTA, dark-only | ±190 baris (sekarang ±140) |
| `docs/AUDIT.md` | 2 baris inventaris surface diperbarui (baris 31–32) | ±0 |
| `docs/plan-auxiliary-pages.md` | Dokumen ini | — |

### 12.2 Tidak boleh disentuh (dan kenapa)

| Berkas | Alasan |
|---|---|
| `icons/favicon.svg`, `icons/icon-192.svg`, `icons/icon-512.svg`, `icons/icon-light-192.svg` | Identitas merek aplikasi. Dipakai `manifest.json` dan ter-precache di `sw.js`. Emerald di dalamnya **sah** di sana; yang dilarang adalah emerald sebagai bahasa visual halaman pendukung (D3) |
| `manifest.json` | `start_url: "index.html"`, `theme_color`/`background_color` milik aplikasi. Mengubahnya mengubah perilaku PWA, bukan tata letak halaman |
| `sw.js` | Tidak ada aset baru; kedua halaman sudah di `LOCAL_ASSETS` dan diambil network-first (§6.3) |
| `style.css` | Bundle Tailwind aplikasi. Menyentuhnya = pelanggaran G2 |
| `css/modules/*` (23 berkas) | Sistem Ocean Ledger milik aplikasi |
| `css/onboarding.css`, `css/onboarding-motion.css` | Sistem Origin milik landing. Halaman pendukung **menyalin** nilainya, tidak memuatnya (§6.1) |
| `index.html`, `html/*` | Aplikasi |
| `onboarding.html`, `js/onboarding.js`, `js/journey.js` | Landing dan panggung langit→bumi. Tidak ada hubungannya dengan task ini |
| `package.json` | Tidak ada skrip baru. Skrip kontras sengaja sementara (§10.3) |

### 12.3 Kenapa tidak ada berkas CSS bersama

Keinginan pertama yang wajar adalah membuat `css/aux.css` supaya `privacy.html` dan `404.html` tidak menduplikasi token. Itu **ditolak dengan alasan konkret**:

1. **G2.** Berkas baru di `css/` cepat atau lambat akan dipertimbangkan untuk dimasukkan ke `css/input.css` → bocor ke bundle `style.css` aplikasi. Itu satu-satunya jalur kebocoran nyata di proyek ini (plan landing §13.5).
2. **Mayat `sw.js`.** Berkas CSS baru harus didaftarkan ke `LOCAL_ASSETS`, jadi `sw.js` ikut berubah dan `npm run verify` ikut mengawasinya. Dua halaman statis tidak sepadan dengan beban itu.
3. **Pola proyek.** Empat surface, empat salinan token — itu pola yang sudah berlaku dan sudah terbukti (plan landing §13.8). Halaman pendukung adalah surface ke-3 dan ke-4, bukan pengecualian.
4. **Biaya sebenarnya kecil.** Yang diduplikasi hanya ±20 token, bukan seluruh stylesheet. Aturan komponennya memang berbeda (kartu legal vs kartu error), jadi tidak banyak yang benar-benar bisa dipakai bersama.

Konsekuensi yang diterima dengan sadar: kalau suatu saat palet Origin berubah, ada **tiga** tempat yang harus disunting (`css/onboarding.css`, `privacy.html`, `404.html`) alih-alih satu. Itu harga isolasi, dan harganya sudah dibayar sejak keputusan #5 di plan landing.
