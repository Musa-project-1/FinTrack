# Finkas — Rencana Redesign UI/UX
**Arah:** Trust-first Fintech × Tactile Precision (dark-first ledger)
**Status:** FASE 0–8 **SELESAI 100% dan terverifikasi** (build `v121`). Laporan audit lengkap tersedia di `docs/AUDIT.md`.

---

## 1. Ringkasan Pemahaman Project

### 1.1 Apa produknya
**Finkas** adalah **PWA pembukuan kas & iuran kelompok** (kas RT/RW, arisan, kas kelas). Dua peran utama:
- **Anggota (member)** — hanya membaca saldo & status iuran (transparansi).
- **Pengurus (group_admin / superadmin)** — mencatat & mengedit transaksi.

Arsitektur: client **tidak pernah** menyentuh Firestore. Semua lewat Vercel Serverless Functions (`api/`) dengan token sesi HMAC + PIN grup 4 digit. Frontend: **Vanilla JS ES Modules** + CSS modular (Tailwind v4 sebagai builder). Multi-grup: tiap grup punya ruang data terisolasi.

### 1.2 Alur pengguna
```
Onboarding (onboarding.html)          Aplikasi utama (index.html)
  [1] Welcome + fitur + FAQ   ──►     Header (logo, nama grup, ringkasan kas, aksi)
  [2] Pilih grup              ──►     Dashboard (Saldo / Masuk / Keluar)
  [3] Masuk PIN 4 angka       ──►     Rekap "Status Iuran" (matriks 12 bulan)
      ↓ pilih grup + PIN              Bottom nav (Beranda · Riwayat · Catat · Rekap · Menu)
      └─► masuk index.html            Modal-modal (login, transaksi, riwayat, master, dst.)
```

### 1.3 Daftar layar & data yang ditampilkan
| # | Layar / Modal | Data inti | Berkas markup |
|---|---|---|---|
| 1 | **Onboarding** (welcome, pilih grup, PIN) | daftar grup, PIN | `onboarding.html` + `css/onboarding.css` |
| 2 | **Header** | nama grup, saldo/masuk/keluar (pill), status online | `html/index.template.html` |
| 3 | **Dashboard** | Saldo Kas, Total Pemasukan, Total Pengeluaran | `html/index.template.html` |
| 4 | **Rekap Status Iuran** | matriks 12 bulan × anggota, tahun, cari anggota | `html/index.template.html` |
| 5 | **Bottom nav** (mobile) | 5 tujuan navigasi | `html/index.template.html` |
| 6 | Login / Logout / **About** | email, password, versi | `html/modals/auth.html` |
| 7 | Grup: pilih / PIN / kelola / kredensial | grup, PIN, email admin, super-admin whitelist | `html/modals/groups.html`, `group-pin.html`, `group-admin.html` |
| 8 | **Menu navigasi** + **Quick Pay** | daftar fitur, nominal bayar, anggota | `html/modals/navigation.html` |
| 9 | **Data Master** + Audit Log + Offline Queue | anggota (ID/nama/WA/status), kategori, bulan libur, log aksi | `html/modals/master.html` |
| 10 | **Export & Cetak** + **Statistik** + **Profil Anggota** + **Riwayat** | kesehatan kas %, lunas, menunggak, potensi belum tertagih, chart, kontribusi anggota | `html/modals/reports.html`, `riwayat.html` |
| 11 | **Catat Transaksi** + Edit + Konfirmasi | kategori, nominal, bulan/tahun, pilih anggota, keterangan | `html/modals/transactions.html` |
| 12 | **FAQ** | 5 pertanyaan | `html/modals/faq.html` |
| 13 | **Tampilan** | 5 gaya indikator + 3 bahasa | `html/modals/tampilan.html` |

### 1.4 Masalah visual saat ini (yang akan diperbaiki)
- **Dashboard "flat 3 kartu"** — Saldo, Masuk, Keluar berukuran sama; tidak ada angka yang dominan.
- **Warna berlebihan** — emerald + biru `#3b82f6` + indigo `#6366f1` + rose `#f43f5e` + amber `#f59e0b` + WhatsApp green `#25d366` dipakai bersamaan (gradients, glow, border-atas berwarna).
- **Soft-UI generik** — `box-shadow` blur berlapis, radius seragam besar (10–24px), banyak bentuk pill, inset glow emerald di atas tiap modal → kesan "AI-generated".
- **Tipografi datar** — semua Inter, angka tidak monospace, tidak ada karakter serif.
- **Semua data tampil sekaligus** — minim hierarki & progressive disclosure.

### 1.5 Berkas yang akan disentuh
**CSS (sumber, di-build ke `style.css`):**
`css/modules/tokens.css`, `base.css`, `layout.css`, `cards.css`, `buttons.css`, `tables.css`, `forms.css`, `modals.css`, `toasts.css`, `widgets.css`, `helpers.css`, `view-iuran.css`, `view-riwayat.css`, `view-riwayat-mobile.css`, `view-master.css`, `cdrop.css`, `mpick.css`, `navmenu.css`, `queue.css`, `responsive-mobile.css`, `responsive-tablet.css`, `rtl.css`, `css/input.css` (+ modul baru `css/modules/typography.css`), `css/onboarding.css`.

**HTML (fragmen, di-build ke `index.html`):**
`html/index.template.html`, `html/modals/*.html`, `onboarding.html`.

**JS (minimal, hanya yang dibutuhkan desain):**
`js/core/config.js` (palet chart), `js/render/dashboard.js` (warna chart), `js/ui/theme.js` (meta theme-color), `sw.js` (bump cache), `manifest.json`.

**Artefak build (jangan diedit tangan):** `index.html`, `style.css` → dihasilkan via `npm run build`.

**Kontrak build yang HARUS dijaga:** `npm run build:html` menyusun `index.html` dari fragmen; `npm run build:css` menyusun `style.css`; `scripts/verify.mjs` gagal jika `index.html` lebih lama dari fragmen atau daftar precache `sw.js` tidak lengkap.

**Harness QA (di root, bukan bagian produk):** `_qa.html` (galeri komponen), `_qa-modal.html` (isolasi satu modal via `?m=…&theme=…`), `_qa-view.html` (viewport iframe 390–1280px), `_qa-shell.html` (kosong).


</path>
---

## 2. Referensi Visual dari Refero Styles

Sumber: `https://styles.refero.design/design-styles/fintech-websites` (24 referensi fintech terkurasi). Saya membedah dua DESIGN.md penuh, lalu memilih **dua arah** yang paling relevan untuk *kas komunitas* — tenang & fungsional, bukan "editorial/mewah ala wealth management".

### 2.1 Referensi primer — **Column** (deep navy ledger under cool dawn)
`styles.refero.design/style/a76ec6ba-…`

**Alasan memilih:**
- Konsepnya persis domain kita: **"ledger"** (buku kas/ledger), bukan marketing page.
- **Deep navy institusional** (`#111a4a`, substrate gelap `#011821`) — bukan pitch-black, memberi kesan bank yang tenang dan tepercaya. Ini juga **selaras dengan logo Finkas** yang memang navy-gelap + monogram.
- **Angka & data hidup di monospace** ("a visual signal that this is a bank built by engineers") — langsung menjawab kebutuhan tabel iuran, ID anggota, tanggal.
- **Hairline `1px`** (Silver Lining `#e3e4e8`) sebagai pemisah struktur, bukan shadow.
- **Radius kecil & tegas** (8px) — "the 9999px pill is reserved exclusively for badges and tags" → anti-pola soft-UI.
- **Satu aksen high-signal** yang dirancang langka per halaman.

### 2.2 Referensi sekunder — **Brex** (white concrete, single ember)
`styles.refero.design/style/b58d92f6-…`

**Alasan memilih:**
- Aturan "**Don't use shadows for card elevation … rely on Paper/Fog contrast and 1px Mist borders**" — literally prinsip *tactile precision* yang diminta (border padat, bukan blur).
- **Disiplin satu aksen**: "Don't introduce a second accent color. Adding blue, green, or purple breaks the visual contract." → peta langsung untuk membersihkan 5 warna jadi 1.
- **Tracking negatif agresif** pada Inter (compressed, "engineered rather than airy").
- Presisi sebagai *"financial instrument"*, bukan dekorasi.

### 2.3 Referensi yang saya tolak (dan kenapa)
- **Jeton, Midday, Compound, Titan, Wealthsimple, Fey (broadsheet)** — terlalu *editorial / warm-marble / wealth-management*; tidak cocok untuk bendahara RT/RW yang butuh kepadatan data, bukan kemewahan.
- **Origin, Slash, Letter, Atlas Card** — "midnight vault / gilded / iridescent" terlalu *premium-crypto*; berisiko terasa tidak jujur untuk kas warga.
- **Arah yang saya ambil:** kedisiplinan **Brex** + bahasa *ledger* & monospace **Column**, dijalankan **dark-first**.

---

## 3. Arah Desain Final

**Nama arah: "Buku Kas / The Ledger"** — presisi instrumen finansial, tenang, kontras tinggi, tanpa glow.

### 3.1 Prinsip eksekusi (peta ke 6 prinsip tugas)
1. **Satu angka utama per layar** — Saldo jadi *hero* Fraunces besar; Masuk/Keluar diturunkan jadi strip sekunder kompak.
2. **Dark mode + SATU aksen** — emerald saja (lihat 3.2); tidak ada gradient multi-warna; prioritas kontras bg↔fg.
3. **Border solid 1px, tanpa drop-shadow blur** — semua elevasi kartu = hairline + kontras permukaan; shadow hanya untuk elemen melayang (modal/dropdown/sheet).
4. **Tipografi berkarakter** — neo-serif **Fraunces** (judul & angka besar) + **JetBrains Mono** (data, tanggal, ID) + Inter (body).
5. **Progressive disclosure** — hero dulu → detail di klik/scroll (akordeon rekap mobile, tab, sheet menu) + eyebrows mono.
6. **Anti "AI-generated"** — radius tegas 8px (bukan seragam 20px), ikon Phosphor yang ada konteksnya, grid/aturan hairline (bukan spacing "aman" tanpa identitas), motif *ledger* (garis aturan, label mono, tanda ± , stempel PAID).

### 3.2 Palet warna + alasan
**Keputusan aksen: tetap EMERALD (bukan warna baru).**
Alasan: logo Finkas adalah monogram **emerald di atas navy gelap** — jadi "emerald-on-navy" *sudah* bahasa brand itu sendiri. Mengganti aksen (mis. ember oranye ala Brex) akan memaksa ganti semua ikon/logo dan memutus kontinuitas brand. Jadi: **pertahankan emerald sebagai SATU aksen**, lalu *hapus semua warna lain* (biru/indigo/rose/amber/WA-green) dari peran dekoratif. Ini penerapan paling jujur dari "satu warna aksen".
> *Alternatif yang ditawarkan bila disetujui:* aksen **ember `#FF5A1F`** (ala Brex) — lebih mencolok, tetapi perlu update `icons/*.svg` juga. Default rencana ini: **emerald**.

**Dark — "Navy Ledger" (tema unggulan / paling digarap)**
| Peran | Nilai | Catatan |
|---|---|---|
| `--bg` kanvas | `#070C16` | ink-navy hampir hitam, bukan pitch black |
| `--surface` | `#0D1626` | kartu/sheet |
| `--surface-2` | `#131F33` | raised: input, header, thead |
| `--surface-3` | `#1A273D` | hover/aktif |
| `--border` | `rgba(255,255,255,0.10)` | hairline struktural |
| `--border-strong` | `rgba(255,255,255,0.18)` | pemisah tegas |
| `--text-main` | `#EEF2F8` | kontras tinggi |
| `--text-muted` | `#8794A8` | sekunder |
| `--text-faint` | `#5A6678` | tersier/label |
| `--accent` | `#34D399` | emerald 400 (keterbacaan di gelap) |
| `--accent-strong` | `#10B981` | hover/border |
| `--accent-tint` | `rgba(52,211,153,0.12)` | wash terbatas |

**Light — "Paper Ledger" (tema terang, tetap dipertahankan)**
| Peran | Nilai | Catatan |
|---|---|---|
| `--bg` | `#F2F4F7` | Fog |
| `--surface` | `#FFFFFF` | Paper |
| `--surface-2` | `#F7F8FA` | surface-2 |
| `--border` | `#E2E5EA` | hairline |
| `--border-strong` | `#CDD2DA` | |
| `--text-main` | `#0A1220` | ink-navy, **bukan** pure black |
| `--text-muted` | `#5A6473` | Graphite |
| `--text-faint` | `#8B93A1` | Steel |
| `--accent` | `#059669` | emerald 600 (kontras di putih) |
| `--accent-strong` | `#047857` | |

**Satu fungsi satu warna (aturan disiplin):**
- **Aksen emerald** = HANYA untuk: aksi utama, state aktif/terpilih, focus ring, sinyal **"Masuk"**, dan *satu* momen aksen pada angka hero (aturan 1px di bawah saldo).
- **Neutral (fg/steel/mist)** = seluruh sisa UI.
- **"Keluar"/minus** = `--text-main` (kontras tinggi) + tanda `−` + panah ↓ — **bukan warna baru**.
- **Menunggak/danger/❌** = neutral + badge outline + glyph; **tidak** pakai amber.
- **Satu-satunya pengecualian fungsional:** `--danger #E5484D` untuk tombol **hapus/konfirmasi destruktif** saja (konvensi universal demi keamanan). Didokumentasikan sebagai fungsi, bukan bagian sistem aksen.

### 3.3 Tipografi
| Peran | Font | Bobot | Pemakaian |
|---|---|---|---|
| Display / judul / angka besar | **Fraunces** (neo-serif, variabel) | 400/500/600 | angka hero saldo, H2 seksi, judul modal, statistik besar, hero onboarding |
| Data / mono | **JetBrains Mono** | 400/500/600 | semua nominal di tabel/list, tanggal, ID anggota, no. WA, label eyebrow, badge "PAID", singkatan bulan |
| Body / UI | **Inter** (sudah terpasang) | 400/500/600 | teks body, label form, tombol, nav, deskripsi |

- **Tracking:** Inter `-0.01em` (≤24px) / `-0.02em` (36px+); Fraunces `-0.02em`–`-0.03em` di ukuran besar (kesan padat & "engineered").
- **Angka:** `tabular-nums` di semua angka finansial (sudah sebagian ada; diperluas).
- **Konsep pairing:** **satu angka besar = serif (manusiawi & tegas)**; **data tabel = mono (presisi & mesin)** → membentuk hierarki yang jelas.
- Font dimuat via Google Fonts di `<head>` `index.template.html` **dan** `onboarding.html`.

### 3.4 Spacing & bentuk (tactile precision)
- **Base unit 4px.** Skala: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 72`.
- **Radius tegas:** `--r-xs 4 · --r-sm 6 · --r-md 8 · --r-lg 10 · --r-pill 999`.
  - Kartu / input / tombol / modal = **8px** (`--r-md`; modal 10px).
  - Pill **hanya** untuk badge/tag/chip.
- **Elevasi:** kartu = `1px hairline` + kontras permukaan (**shadow: none**). `--shadow-pop` (satu shadow lembut) **hanya** untuk modal, dropdown, sheet, toast.
- **Kerapatan:** card padding 20–24px; jarak antar-seksi 32–48px; gap elemen 8–16px.
- **Motif "ledger":** `eyebrow` mono huruf besar kecil ber-tracking, garis aturan horizontal tipis, label kolom mono, tanda `+ / −` eksplisit, badge "PAID" persegi-tegas.
---

## 4. Daftar Perubahan per Layar / Berkas (urutan pengerjaan)

Urutan sengaja dari **fondasi → global → per-layar → packaging**, supaya tiap langkah bisa langsung diverifikasi.

### FASE 0 — Fondasi (tokens & tipografi)
**Berkas:** `css/modules/tokens.css` (tulis ulang), `css/modules/typography.css` (baru), `css/input.css` (+import), `css/modules/base.css`.

- `tokens.css`: ganti seluruh Custom Properties → palet 3.2 (dark & light), radius tegas (3.4), hapus `--shadow-card*` / `--shadow-sm/md/lg` blur → `--shadow-pop` tunggal, tambah token spacing & tipe (eyebrow, mono, display).
- `typography.css` (baru): definisi `--font-display` (Fraunces), `--font-mono` (JetBrains Mono); kelas `.eyebrow` (mono, uppercase, tracking, `--text-faint`), `.font-display`, `.mono`, `.text-hero`, aturan `tabular-nums` global untuk angka.
- `base.css`: body → kanvas + kontras, **hapus `radial-gradient` dot pattern** (motif AI) atau ganti jadi grid halus tipis (opsional, gaya "ledger"); scrollbar ramping tanpa warna warni; `::selection` pakai aksen; `:focus-visible` → ring aksen 2px.
- `input.css`: tambahkan `@import "./modules/typography.css";` setelah `tokens.css`.

### FASE 1 — Kerangka global
**Berkas:** `css/modules/layout.css`, `buttons.css`, `forms.css`, `cdrop.css`, `mpick.css`, `navmenu.css`, `queue.css`, `toasts.css`.

- `layout.css`: **Header** → permukaan hairline, tanpa shadow, tinggi efisien; kelompok `header-left/right`; **Bottom nav** → border-atas hairline, item aktif = aksen (bukan pill hijau), CTA "Catat" = kotak radius 8px (bukan lingkaran); sheet menu/quickpay → radius atas 10px, hairline atas, `--shadow-pop`.
- `buttons.css`: semua `.btn` → radius 8px, **tanpa** `translateY`/`box-shadow` (hover = perubahan permukaan/border + `--surface-2`); `.btn-primary` = aksen solid; `.btn-outline` = hairline `--border-strong`; `.btn-danger*` = satu-satunya merah; **`.btn-wa-reminder-icon`** → netral hairline (bukan `#25D366`), aksen saat hover; hapus `linear-gradient` pada hover.
- `forms.css`: `.form-control` → hairline, radius 8px, fokus = ring aksen **tanpa** glow blur; angka/ID/WA pakai mono; `.pin-box` → kotak tegas; checkbox grid → item hairline, terpilih = outline aksen.
- `cdrop.css` & `mpick.css`: dropdown/popover → hairline + `--shadow-pop`, item terpilih = aksen, chevron netral.
- `navmenu.css`: menu sheet → flat, eyebrow mono, item aktif/aksen, radius 8px, tanpa `translateX(4px)` berlebih.
- `queue.css`: kartu antrean offline → flat hairline, payload mono.
- `toasts.css`: flat, hairline, **garis kiri aksen** (bukan multi-warna success/error/warning/info), hapus `backdrop-filter` blur.

### FASE 2 — Dashboard (angka hero) ★ inti "satu angka utama"
**Berkas:** `html/index.template.html` (restruktur blok `.dashboard`), `css/modules/cards.css`.

- Markup baru (mempertahankan ID `ui-saldo` / `ui-masuk` / `ui-keluar` → **nol perubahan JS**):
  ```
  <section class="dashboard">
    <div class="balance-hero">
      <span class="eyebrow">SALDO KAS SAAT INI</span>
      <div id="ui-saldo" class="balance-hero__value">…</div>
      <div class="balance-hero__rule"></div>   <!-- satu momen aksen -->
    </div>
    <div class="flow-strip">
      <div class="flow-strip__item flow-in">  Masuk  <span id="ui-masuk">…</span></div>
      <div class="flow-strip__item flow-out"> Keluar <span id="ui-keluar">…</span></div>
    </div>
  </section>
  ```
  Kelas `.dashboard` dipertahankan agar `body.header-stats-active .dashboard{display:none}` tetap bekerja.
- `cards.css`: tulis ulang → `.balance-hero` (Fraunces besar, tabular-nums, clamp responsif, aturan aksen 1px), `.flow-strip` (mono, hairline pemisah vertikal, `Masuk` aksen, `Keluar` netral + `−`), hapus border-atas berwarna & ikon blok 3 warna, hapus semua `box-shadow` kartu.

### FASE 3 — Rekap "Status Iuran"
**Berkas:** `css/modules/tables.css`, `view-iuran.css`, `responsive-mobile.css`, `responsive-tablet.css`.

- `tables.css`: header kolom → eyebrow mono, latar `--surface-2`, border hairline (bukan 2px + uppercase Inter); sel angka → mono `tabular-nums`; kolom nama sticky dengan hairline kanan; hover baris halus; `.table-card::before` (garis emerald atas) → diganti aturan hairline aksen tipis atau dihapus.
- `view-iuran.css`: indikator "PAID" & 4 varian lain → keluarga satu aksen (bukan emerald+biru+amber+ungu); sel libur netral; kartu mobile → hairline, indeks mono, progress bar aksen tunggal, badge pill.
- `responsive-mobile.css` / `responsive-tablet.css`: sesuaikan toolbar sticky, ukuran tahun/search, tombol aksi; pastikan **tidak ada overflow** dan target sentuh ≥44px.

### FASE 4 — Modal (kerangka + isi)
**Berkas:** `css/modules/modals.css`, `widgets.css`, `helpers.css`, lalu fragmen `html/modals/*.html`.

- `modals.css`: hapus `inset 0 3px 0 0 #10b981` glow di `.modal-content` → ganti hairline + `--shadow-pop`; radius 10px; `.modal-header-standard` hairline; `.modal-badge-icon` → netral/aksen tunggal (varian danger/warning/slate disederhanakan); `.close-modal-btn` hover netral (tidak merah + rotate 90°); daftar "Tampilan" (5 gaya indikator + bahasa) → kartu hairline, preview satu aksen.
- `widgets.css`: `.stat-card` → hairline, **Kesehatan Kas % jadi angka hero** (Fraunces, aksen), kartu lain mono netral; `.progress-bar` aksen tunggal.
- `helpers.css`: `.riwayat-summary-bar`, `.metric-pill` (in/out) → mono + netral + aksen untuk "in"; `.trx-period`, `.master-id-pill`, dsb → mono.
- Fragmen `html/modals/*.html`: penyesuaian struktur ringan (tambah `.eyebrow`, kelas mono pada nilai, hero pada Profil/QuickPay/Statistik). **Tidak menyentuh `data-action` / `id`** yang dipakai `js/app.js`.
- Per modal: `auth.html` (login/about), `groups.html` + `group-pin.html` + `group-admin.html`, `master.html` (tab, tabel anggota/kategori mono, bulan libur), `reports.html` (export list, statistik, profil anggota), `riwayat.html` (toolbar, chips, tabel mono), `transactions.html` (tab, summary aksen, checkbox), `faq.html`, `tampilan.html`, `navigation.html` (menu + quickpay — nominal jadi hero input).

### FASE 5 — Chart & warna data (JS minimal)
**Berkas:** `js/core/config.js`, `js/render/dashboard.js`.
- `CHART_COLORS` → ramp **satu aksen + netral** (emerald → slate), bukan pelangi 10 warna.
- Garis chart: "Masuk" = aksen, "Keluar" = netral fg; doughnut pengeluaran pakai ramp mono-aksen; grid/teks chart mengikuti token gelap/terang.
- Tidak mengubah logika perhitungan; hanya warna.

### FASE 6 — Onboarding
**Berkas:** `onboarding.html`, `css/onboarding.css`.
- Muat Fraunces + JetBrains Mono; hero judul serif; kartu hairline; **hapus `icon-gradient-purple-blue/-blue/-emerald`** → ikon satu aksen netral; tombol & input sesuai FASE 1; langkah PIN → kotak digit tegas; tipografi mono untuk label.

### FASE 7 — Packaging & verifikasi
**Berkas:** `html/index.template.html` (head: Google Fonts Fraunces+JetBrains Mono, bump `style.css?v=120`), `onboarding.html` (head + `?v=120`), `js/ui/theme.js` (meta theme-color → kanvas baru), `manifest.json` (`theme_color`, `background_color`), `sw.js` (`CACHE_NAME` → `finkas-v120`).
- Jalankan `npm run build` (build:html + build:css) → regenerasi `index.html` & `style.css`.
- **Verifikasi wajib:** `npm run verify` (sintaks JS, precache SW, kesegaran `index.html`) dan `npm test`.
- **QA browser** (mobile ~390px & desktop ~1280px; dark & light): dashboard hero, rekap (tabel & akordeon), tiap modal, bottom nav, quickpay, onboarding. Cek: tidak ada teks terpotong, tidak ada overflow horizontal, kontras memadai, angka tabular rapi, RTL (Arab) tidak rusak.

### FASE 8 — Audit & QA (pasca-implementasi)
**Tujuan:** membuktikan FASE 0–7 benar-benar bersih — bukan hanya "tampak benar" — lewat gerbang otomatis, audit statis sisa pola lama, dan QA visual per layar. Output akhir: laporan **`AUDIT.md`**.

**Berkas:** tidak mengubah desain (kecuali menutup bug temuan). Harness bukti sudah ada di root: `_qa.html`, `_qa-modal.html`, `_qa-view.html`. Laporan baru: `AUDIT.md`.

#### 8.1 Gerbang otomatis (WAJIB lulus sebelum QA dinyatakan selesai)
| Perintah | Memeriksa | Kriteria lulus |
|---|---|---|
| `npm run build` | regenerasi `index.html` (fragmen → tunggal) + `style.css` (Tailwind) | tanpa error; naikkan `?v=` bila CSS berubah |
| `npm run verify` | 1) sintaks semua `.js/.mjs` di `js/` + `api/` + `scripts/`; 2) daftar `LOCAL_ASSETS` di `sw.js` ↔ modul yang benar-benar ada; 3) kesegaran `index.html` vs fragmen + placeholder `@@INJECT_MODALS@@` hilang | 0 failure |
| `npm test` | 7 suite: analytics, encoding, group-write, i18n, session, state-session, utils | semua lulus |
| `npm run check` | gabungan verify + test | 0 failure |

> `verify` akan **gagal** bila CSS/fragmen diubah tetapi `index.html` belum di-rebuild, atau modul baru belum masuk precache `sw.js` — jadi selalu jalankan `npm run build` lebih dulu.

#### 8.2 Harness QA visual (sudah tersedia — pakai, jangan bikin baru)
- **`_qa.html` — galeri komponen.** Merender header, dashboard hero, tombol (primary/outline/danger/WA), badge Masuk/Keluar, `metric-pill`, 5 gaya indikator lunas + `status-skipped-dot`, form + `input-with-prefix`, `pin-box`, tabel rekap, tabel riwayat, bottom nav. Ada toggle tema + tombol buka modal login. Deep-link `_qa.html#light` memaksa tema terang.
- **`_qa-modal.html?m=<id>&theme=<dark|light>` — isolasi modal.** Meng-`fetch('index.html')`, mengimpor modal asli (node `.active`), lalu mengisi *fixture* teks statis untuk nilai yang biasanya dirender JS (nominal panjang, nama panjang, ID) agar QA melihat lebar teks realistis — fixture ditandai outline magenta (`.qa-fixture`).
- **`_qa-view.html` — viewport harness.** Iframe satu target (index.html, onboarding.html, `_qa.html`, atau **tiap** modal dari daftar 22 ID), preset lebar **390 · 430 · 600 · 768 · 900 · 1280**, tinggi bebas, toggle theme & `header-stats`, tombol Reload; otomatis membersihkan service worker + cache sebelum render (mencegah CSS basi).
- **`_qa-shell.html`** — masih **kosong**. Keputusan yang perlu diambil: isi sebagai shell bersama, atau hapus agar tidak menjadi sampah repo.

#### 8.3 Audit statis — cari sisa pola lama
Telusuri **seluruh** `css/**` dan `html/**` (bukan hanya modul yang diedit) agar kebocoran tidak tersisa:
- **Warna lama (harus 0 pemakaian):** `#3b82f6`, `#6366f1`, `#f43f5e`, `#f59e0b`, `#25d366`, `#8b5cf6`, `#a855f7`, serta emerald mentah `#10b981`/`#059669`/`#34d399` **di luar `tokens.css`** (wajib lewat `var(--…)`).
- **`linear-gradient`** dekoratif (kecuali shimmer skeleton & chart) → aksen solid / hairline.
- **`box-shadow`** selain `var(--shadow-pop)` → kartu harus `none`.
- **`backdrop-filter`** (kaca/blur) → hapus.
- **`border-radius` > 10px** di luar badge/pill → kembalikan ke 8/10px.
- **Hover mengangkat** (`translateY`, `translateX`, `scale` pada `.btn`) → hanya perubahan permukaan/border.
- **Glow lama:** `inset 0 3px`, `icon-gradient-purple-blue`, `icon-gradient-blue`, `icon-gradient-emerald`.
- **Angka tanpa mono:** pastikan `#ui-saldo`, `#ui-masuk`, `#ui-keluar`, `.nominal-val`, sel nominal tabel, `.metric-pill` memakai `--font-mono` + `tabular-nums`.

#### 8.4 QA per layar (dark & light; 390px & 1280px)
- [ ] **Header** — hairline tanpa shadow; 3 pill ringkas tidak meluber saat nama grup panjang; tombol tema/layout/menu/catat sejajar; target ≥44px.
- [ ] **Dashboard hero** — Saldo satu-satunya angka dominan (Fraunces), `clamp` tidak overflow di 390px; strip Masuk (aksen) / Keluar (netral + `−`); ID `ui-saldo/ui-masuk/ui-keluar` tetap terisi JS.
- [ ] **Rekap (desktop)** — thead mono `--surface-2`, kolom nama sticky + hairline kanan, sel angka mono sejajar, baris libur netral.
- [ ] **Rekap (mobile)** — akordeon kartu, progress bar satu aksen, badge pill, **tanpa scroll horizontal**.
- [ ] **Bottom nav** — border-atas hairline, item aktif aksen (bukan pill hijau), CTA "Catat" kotak radius 8px.
- [ ] **Riwayat** — summary bar mono; baris masuk/keluar; kolom waktu & ID mono.
- [ ] **Modal (tiap ID)** — header hairline + `--shadow-pop`, radius 10px, tanpa inset glow; `.close-modal-btn` hover netral; konten tidak terpotong; tombol destruktif = satu-satunya merah.
- [ ] **Master** — tab, tabel anggota (ID mono), kategori, bulan libur; tombol aksi tidak meluber.
- [ ] **Reports / Statistik / Profil** — Kesehatan Kas % jadi hero serif; kartu lain mono netral; chart memakai ramp satu aksen (lihat 8.5).
- [ ] **Transaksi & QuickPay** — nominal jadi hero input (mono), checkbox grid hairline, summary aksen.
- [ ] **Tampilan** — 5 gaya indikator render satu aksen; pilihan bahasa ID/EN/AR berfungsi.
- [ ] **Onboarding** — hero serif, tanpa gradient ungu-biru, langkah grup & PIN kotak tegas.
- [ ] **Toast** — flat, garis kiri aksen, tanpa blur.

#### 8.5 Chart (verifikasi FASE 5)
- Garis "Masuk" = aksen, "Keluar" = netral `--text-main`; doughnut = ramp mono-aksen (`--chart-1..5`).
- Grid/label chart mengikuti tema terang/gelap; tidak ada warna pelangi.
- Uji: buka Statistik di dark & light — warna harus berubah tanpa reload paksa.

#### 8.6 Aksesibilitas & kontras
- Kontras teks body ≥ **4.5:1**, teks besar ≥ **3:1** (ukur `--text-main`/`--text-muted`/`--text-faint` di atas `--bg`/`--surface`/`--surface-2`, dua tema).
- `--text-faint` **hanya** untuk eyebrow/label non-esensial — jangan untuk isi.
- `:focus-visible` = ring aksen 2px, terlihat di kedua tema.
- `aria-label`/`data-i18n-aria` pada tombol ikon; `alt` pada logo; target sentuh ≥44×44px.

#### 8.7 RTL (Bahasa Arab)
- Buka dengan `lang-ar`; periksa `css/modules/rtl.css` masih cocok dengan radius/hairline baru: kolom nama rekap, chevron dropdown, `input-with-prefix`, dan makna tanda `+ / −` tidak terbalik.

#### 8.8 Offline / PWA
- `sw.js` = `finkas-v120`; setelah reload, cache lama terpurge.
- Uji offline: app shell termuat, kartu antrean offline (`queue.css`) tampil hairline + payload mono, sinkron saat kembali online.
- `manifest.json` `theme_color`/`background_color` = kanvas baru.

#### 8.9 Deliverable
- **`AUDIT.md`** di root: tabel temuan (ID · layar/berkas · tingkat: blocker/major/minor · status) + hasil `npm run check` + observasi/screenshot QA. Semua temuan **blocker/major** harus ditutup atau dicatat dengan alasan eksplisit.
- Bila ada bug: perbaiki di modul sumbernya → `npm run build` → ulangi `npm run check` → baru tutup temuan.

---

## 5. Ringkasan Keputusan yang Butuh Approval
1. **Aksen tetap emerald** (bukan ganti ke ember oranye). — *Setuju / minta ember?*
2. **Dark mode jadi tema unggulan** yang paling digarap (light tetap ada & rapi). — *Setuju?*
3. **Satu-satunya warna non-aksen** = merah `--danger` khusus tombol hapus/konfirmasi destruktif. — *Setuju?*
4. **Dashboard diubah** dari 3 kartu setara → 1 angka Saldo hero + strip Masuk/Keluar (ID/JS dijaga). — *Setuju?*
5. **Font baru**: Fraunces + JetBrains Mono dimuat dari Google Fonts (menambah 2 keluarga font). — *Setuju, atau ingin sistem font saja?*

---

## 6. Rencana Reorganisasi Struktur Folder Root

### 6.1 Pemetaan Seluruh Berkas di Root
1. **Berkas Konfigurasi Tooling & Hosting (Wajib Tetap di Root):**
   - `package.json`, `package-lock.json`: Manifest dependensi npm dan skrip build.
   - `vercel.json`: Konfigurasi Vercel deployment, cleanUrls, outputDirectory: ".", header CSP/PWA.
   - `firebase.json`: Konfigurasi Firebase CLI yang mengarahkan rules ke `firestore.rules`.
   - `firestore.rules`: Aturan keamanan Cloud Firestore (dibaca perintah `firebase deploy`).
   - `.firebaserc`: Konfigurasi project ID Firebase (`finkas-kas`).
   - `.gitignore`: Pola berkas yang diabaikan git.
   - `.service-account.local.json`: Kredensial lokal admin Firebase (gitignored).
   - `skills-lock.json`: Lockfile plugin/skills Hermes agent.

2. **Berkas Entry Point Produksi & PWA (Wajib Tetap di Root):**
   - `index.html`: Entry point aplikasi utama Finkas, start_url PWA, precached di `sw.js` ('/', 'index.html').
   - `onboarding.html`: Entry point halaman sambutan & pemilihan grup, tujuan redirect saat grup belum dipilih.
   - `privacy.html`: Entry point kebijakan privasi (dibuka via target="_blank" dan terdaftar di `sw.js`).
   - `404.html`: Fallback error page standar Vercel dan Service Worker offline fallback.
   - `sw.js`: Service Worker PWA. Wajib di root domain agar memiliki scope penuh (`/`).
   - `manifest.json`: Web App Manifest PWA dengan scope `/` dan start_url `index.html`.
   - `style.css`: Hasil kompilasi Tailwind v4 yang diimpor oleh `index.html`, `onboarding.html`, dan `sw.js`.

3. **Berkas Dokumentasi (Diusulkan Pindah ke `docs/`):**
   - `CHANGELOG.md` -> `docs/CHANGELOG.md` (riwayat rilis).
   - `CODE-REVIEW.md` -> `docs/CODE-REVIEW.md` (catatan audit & checklist review kode).
   - `HARDENING-CHECKLIST.md` -> `docs/HARDENING-CHECKLIST.md` (checklist pengerasan aplikasi).
   - `AUDIT.md` -> `docs/AUDIT.md` (laporan audit desain Fase 8).
   - `plan.md` -> `docs/plan.md` (rencana kerja arsitektur & redesign).
   - *`README.md` tetap di root* sebagai standar repositori di GitHub.

4. **Berkas Harness Pengujian QA (Diusulkan Pindah ke `tests/qa/`):**
   - `_qa-shell.html` -> `tests/qa/_qa-shell.html` (interactive standalone app shell).
   - `_qa.html` -> `tests/qa/_qa.html` (galeri komponen UI).
   - `_qa-modal.html` -> `tests/qa/_qa-modal.html` (harness isolasi modal).
   - `_qa-view.html` -> `tests/qa/_qa-view.html` (harness pengujian viewport responsif).
   *Alasan pindah (bukan dihapus):* Berkas `_qa*.html` terbukti sangat berguna untuk visual regression testing dan simulasi interaktif tanpa API, namun tidak boleh terekspos langsung di root produksi Vercel. Memindahkannya ke `tests/qa/` memisahkan kode pengujian dari produksi secara bersih.

### 6.2 Struktur Folder Baru yang Diusulkan
```
Finkas/
├── .firebaserc
├── .gitignore
├── .service-account.local.json
├── 404.html
├── index.html
├── onboarding.html
├── privacy.html
├── style.css
├── sw.js
├── manifest.json
├── package.json
├── package-lock.json
├── firebase.json
├── firestore.rules
├── vercel.json
├── skills-lock.json
├── README.md
├── docs/                      <-- Direktori baru dokumentasi
│   ├── AUDIT.md
│   ├── CHANGELOG.md
│   ├── CODE-REVIEW.md
│   ├── HARDENING-CHECKLIST.md
│   └── plan.md
├── tests/
│   ├── *.test.mjs             <-- Unit test node eksis
│   └── qa/                    <-- Direktori baru visual QA harness
│       ├── _qa-shell.html
│       ├── _qa.html
│       ├── _qa-modal.html
│       └── _qa-view.html
├── api/
├── css/
├── html/
├── icons/
├── js/
└── scripts/
```

### 6.3 Rincian Referensi yang Perlu Diperbarui
Bila file `_qa*.html` dipindah ke `tests/qa/`:
- Path stylesheet: `href="style.css?v=120"` -> `href="../../style.css?v=120"`
- Path ikon: `icons/favicon.svg` -> `../../icons/favicon.svg`
- Path target di `_qa-view.html`: `index.html` -> `../../index.html`, `onboarding.html` -> `../../onboarding.html`.
- Path fetch di `_qa-modal.html`: `fetch('index.html')` -> `fetch('../../index.html')`.
- `scripts/verify.mjs` & `sw.js`: Tidak terpengaruh karena berkas `_qa` dan `docs` tidak masuk precache `LOCAL_ASSETS` maupun modul client JS.

---

## 7. Desain Sistem Final: "Ocean Ledger"

- **Arah Palet:** Abyssal Deep Sea (Dark, 208° Hue) & Glacial Blue (Light, 201° Hue).
- **Karakter:** Satu spektrum rona biru laut yang harmonis dengan transisi mulus 0.32s cubic-bezier.
- **Pemasukan:** Seafoam Teal (`#2DD4BF` / `#0D9488`).
- **Pengeluaran:** Reef Coral (`#FB7185` / `#E11D48`).
- **Kategori & Brand:** Electric Cyan (`#38BDF8` / `#0284C7`).
- **Tunggakan:** Sunlit Amber (`#FBBF24` / `#B45309`).
- **Status:** Diimplementasikan di `tokens.css`, `base.css`, `cards.css`, dan lulus verifikasi `npm run check`.


