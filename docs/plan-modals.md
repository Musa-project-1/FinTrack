# Finkas — Rencana Redesain MODAL & DIALOG OVERLAY (Modal-Only)
**Arah Desain:** Trust-first Fintech × Tactile Precision — dijalankan di atas sistem token **"Ocean Ledger"**
**Ruang Lingkup (STRICT MODAL-ONLY):** HANYA seluruh komponen **modal & dialog overlay**. Dashboard hero, Header, Rekap Iuran (matriks 12 bulan), dan Onboarding **DI LUAR CAKUPAN** dan dilarang disentuh.
**Referensi anatomi:** Column, Ramp, Mercury, Stripe, Linear (fintech/engineering tools presisi).
**Status:** Rencana (belum dieksekusi). Seluruh sub-butir di Bab 4 & Bab 5 berformat checklist `- [ ]` dan **WAJIB** di-update menjadi `- [x]` secara real-time begitu satu berkas/modal selesai diubah & diverifikasi.

---

## ATURAN EKSEKUSI WAJIB (baca sebelum mengeksekusi Bab 4)

1. **Checklist real-time.** Setiap sub-butir di Bab 4 & Bab 5 memakai `- [ ]`. Begitu satu berkas fragmen modal **atau** satu CSS modul selesai diubah **dan** diverifikasi (`_qa-modal.html` / `npm run check`), checklist pada dokumen ini **HARUS langsung** diubah ke `- [x]` **sebelum** melangkah ke sub-butir berikutnya. Dilarang menumpuk update checklist di akhir.
2. **Strict modal-only.** Dilarang menyentuh Dashboard hero, Header, Rekap Iuran, Bottom nav, atau Onboarding. Bila sebuah aturan global (mis. `base.css`) diperlukan, ubah **hanya** bagian yang terisolasi ke modal — bukan properti kanvas global.
3. **Kontrak fungsional JavaScript terkunci.** Dilarang mengubah/menghapus `id`, `data-action`, `data-tab`, `data-style`, `data-lang`, `name` input, atribut `type`/`required`/`min`/`max`/`maxlength`/`inputmode`, atau hirarki DOM (parent-child dari elemen ber-`id`) yang dibaca `js/app.js`, `js/ui/modal.js`, dan modul `js/handlers/*` + `js/render/*`. Rujukan lengkap di §1.4.
4. **Penjagaan build & precache.** Setiap perubahan fragmen (`html/modals/*.html`) atau CSS (`css/**`) **wajib** melalui `npm run build` (regenerasi `index.html` + `style.css`). Setelah itu `npm run check` wajib 0 failure. Bila daftar aset berubah, `sw.js` **wajib** disinkronkan (bump `CACHE_NAME`).
5. **Satu perubahan fokus, satu verifikasi.** Ubah satu modal → verifikasi → centang → lanjut. Jangan batch banyak modal tanpa verifikasi.

**Cara memakai checklist:** seluruh bullet `- [ ]` di Bab 4 & Bab 5 adalah unit kerja. Setiap unit punya **kriteria lulus** yang eksplisit. Hanya centang bila kriteria lulus terbukti (bukan "tampak benar").

---

## Bab 1 — Ringkasan Pemahaman & Inventaris Lengkap Modal

### 1.1 Konteks produk & peran modal
**Finkas** adalah PWA pembukuan kas & iuran kelompok (kas RT/RW, arisan, kas kelas). Arsitektur: client **tidak pernah** menyentuh Firestore langsung — semua lewat Vercel Serverless Functions (`api/`) dengan token sesi HMAC + PIN grup 4 digit. Frontend: **Vanilla JS ES Modules** + CSS modular (Tailwind v4 sebagai builder). Dua peran antarmuka: **anggota** (read-only) dan **Pengurus/Admin** (`body.admin-mode`) serta **superadmin** (`body.superadmin-mode`).

Modal adalah **permukaan kerja utama** aplikasi ini — hampir semua aksi tulis (catat, edit, hapus, kelola master, ekspor, konfigurasi grup) terjadi di dalam overlay. Modal bukan sekadar "pop-up": modal adalah tempat pengguna menghabiskan sebagian besar waktu interaktif. Karena itu modal mendapat standar presisi tertinggi, setara "financial instrument".

### 1.2 Cara kerja mekanisme modal (kontrak runtime yang harus dijaga)
- **Overlay & toggle.** Setiap dialog dibungkus `<div class="modal-overlay" id="...">` berisi `<div class="modal-content ...">`. Membuka = `el.classList.add('active')`; menutup = `closeModal(id)` di `js/ui/modal.js` (menghapus `active`). CSS `.modal-overlay.active { opacity:1; visibility:visible; display:flex }` menggerakkan animasi. **Jangan mengubah nama kelas `.modal-overlay` / `.modal-content` / `.active`.**
- **Body lock & focus.** `openModal` menambah `body.modal-open` (mengunci scroll kanvas via `base.css`) lalu mengunci fokus (focus-trap pada `Tab`). Auto-focus ke elemen `input/select/button` pertama setelah 50ms. **Struktur fokus-first harus tetap terpenuhi.**
- **A11y.** Tiap dialog memakai `role="dialog" aria-modal="true"` dan `aria-labelledby` menunjuk `id` judul. **Pertahankan `id` judul** (`modal-*-title`, `confirm-title`, `group-pin-name`, `p-nama-anggota`).
- **Stacking.** `#modal-hapus`, `#modal-edit-transaksi` `z-index:110`; `#modal-menu` `z-index:10000`; `#modal-logout`, `#modal-hapus`, `#modal-confirm-action` `z-index:1000010 !important`. `#modal-edit-anggota` adalah overlay **bersarang** di dalam `#modal-kelola-master`. **Pertahankan z-index bertingkat** agar dialog konfirmasi selalu di atas.
- **Sticky internal.** `.modal-header-standard` sticky `top:-24px`; `.modal-footer-actions` sticky `bottom:-24px`; tabel audit & riwayat memakai `thead` sticky. Sticky ini bergantung pada nilai `padding:24px` `.modal-content` dan `top/bottom:-24px`. **Bila padding berubah, offset sticky ikut disesuaikan.**

### 1.3 Inventaris Lengkap (11 berkas fragmen, 23 overlay dialog)
> **Catatan rekonsiliasi jumlah.** Ringkasan tugas menyebut "18 dialog". Audit definitif atas 11 fragmen menghasilkan **23 id overlay unik** (`_qa-view.html` juga mendaftarkan tepat 23). Selisih muncul karena 5 overlay tambahan bukan "layar" penuh melainkan **varian konfirmasi/akses/kredensial** (`modal-confirm-action`, `modal-logout`, `modal-about`, `modal-group-credentials`, `modal-edit-anggota`). Bab ini mendokumentasikan **seluruh 23** agar rencana tidak meninggalkan celah.

| # | Berkas fragmen | ID dialog | Kelas ukuran | Peran / isi inti |
|---|---|---|---|---|
| 1 | `html/modals/auth.html` | `#modal-login` | Standard (540) `modal-sm auth-dialog` | Form akses pengurus (email + password, peek) |
| 2 | `html/modals/auth.html` | `#modal-logout` | Small Center (380) `modal-center-dialog` | Konfirmasi keluar sesi admin |
| 3 | `html/modals/auth.html` | `#modal-about` | Small Center (380) `about-sheet` | Kartu About (logo, versi, platform, backend, privasi) |
| 4 | `html/modals/groups.html` | `#modal-groups` | Standard (540) `group-picker-dialog` | Pilih grup (daftar grup + aksi masuk/keluar grup) |
| 5 | `html/modals/group-pin.html` | `#modal-group-pin` | Small Center (380) `pin-dialog` | Input PIN 4 angka (`#pin0..#pin3`) |
| 6 | `html/modals/group-admin.html` | `#modal-group-admin` | Data (840) `group-admin-modal` | Kelola grup: buat grup, daftar grup, whitelist superadmin |
| 7 | `html/modals/group-admin.html` | `#modal-group-credentials` | Standard (540) `credentials-dialog` | Kartu kredensial grup siap kirim WA |
| 8 | `html/modals/navigation.html` | `#modal-menu` | Bottom-sheet (`modal-sm menu-sheet nav-sheet`) | Menu navigasi + pencarian menu |
| 9 | `html/modals/navigation.html` | `#modal-quickpay` | Bottom-sheet (`modal-sm quickpay-sheet`) | Bayar iuran kilat (hero nominal) |
| 10 | `html/modals/master.html` | `#modal-audit-log` | Data (840) `modal-data-dialog` | Log aktivitas admin (tabel waktu/aksi/detail) |
| 11 | `html/modals/master.html` | `#modal-kelola-master` | Data (960) `modal-xl modal-data-dialog` | 3 tab: Anggota / Kategori / Bulan Libur |
| 12 | `html/modals/master.html` | `#modal-edit-anggota` | Standard (540) `member-editor-dialog` (nested) | Editor anggota (bersarang di kelola-master) |
| 13 | `html/modals/master.html` | `#modal-offline-queue` | Small (`queue-sheet`) | Antrean transaksi offline (status + aksi sync) |
| 14 | `html/modals/reports.html` | `#modal-export` | Data (840) `modal-data-dialog` | Export & cetak (WA/print/CSV/backup) |
| 15 | `html/modals/reports.html` | `#modal-statistik` | Data (960) `modal-xl modal-data-dialog` | Statistik & kesehatan kas (hero % + chart) |
| 16 | `html/modals/reports.html` | `#modal-profil-anggota` | Data (840) `profile-modal-card` | Profil anggota (kontribusi, bulan terajin, linimasa) |
| 17 | `html/modals/riwayat.html` | `#modal-riwayat` | Data (960) `modal-xl riwayat-modal-content` | Buku besar transaksi (filter rail + tabel + load more) |
| 18 | `html/modals/transactions.html` | `#modal-transaksi` | Data (960) `modal-xl modal-data-dialog` | Catat transaksi (tab Iuran / Operasional) |
| 19 | `html/modals/transactions.html` | `#modal-edit-transaksi` | Data (840) `modal-md modal-data-dialog` | Edit transaksi + panel dampak koreksi |
| 20 | `html/modals/transactions.html` | `#modal-hapus` | Small Center (380) `modal-center-dialog` | Konfirmasi hapus transaksi (ringkasan target) |
| 21 | `html/modals/transactions.html` | `#modal-confirm-action` | Small Center (380) `modal-center-dialog` | Konfirmasi mutasi database generik |
| 22 | `html/modals/faq.html` | `#modal-faq` | Data (840) `faq-dialog` | Panduan & FAQ (`<details>` akordeon) |
| 23 | `html/modals/tampilan.html` | `#modal-tampilan` | Data (840) `appearance-dialog` | Tampilan: gaya indikator iuran + bahasa |

### 1.4 Kontrak Fungsional yang TIDAK BOLEH Diubah
Sumber kebenaran: `scripts/verify-markup-contract.mjs` (membandingkan `id`, `data-action`, `data-tab`, `data-style`, `data-lang`, dan `name` form-control terhadap baseline git). Bila salah satu hilang, guard gagal.

**a) `data-action` yang wajib tetap ada (event target `js/app.js` delegasi):**
- Navigasi/buka: `open-login`, `open-kelola-master`, `open-audit-log`, `open-group-admin`, `open-tampilan`, `open-history`, `open-statistik`, `open-export`, `open-faq`, `open-offline-queue`, `open-groups`, `install-pwa`, `logout`, `toggle-header-stats`.
- Modal umum: `close-modal`, `switch-tab` (`data-tab="iuran"` / `"operasional"` / `"tab-master-anggota"` / `"tab-master-kategori"` / `"tab-master-skipped"`).
- Auth/stealth: `stealth-badge-click` (badge login).
- Konfirmasi: `cancel-delete`, `confirm-delete`, `cancel-confirm-action`, `cancel-logout`, `confirm-logout`.
- Transaksi: `cetak` (print struk), `hapus` (dari modal edit).
- Master: `refresh-audit-log`, `add-skip`.
- Riwayat: `set-riwayat-preset` (`data-preset`), `set-history-filter` (`data-filter`), `load-more`.
- Export: `copy-monthly-recap`, `print-annual`, `export-csv`, `export-json-backup`.
- Statistik: `action-salin-tagihan-wa` (kartu menunggak).
- Offline: `refresh-offline`, `sync-now`.
- Grup: `submit-group-pin`, `exit-group`, `copy-cred-wa`.
- Tampilan: `select-indicator-style` (`data-style`), `select-language` (`data-lang`).

**b) `id` yang wajib tetap ada (dibaca `js/ui/modal.js`, `js/handlers/*`, `js/render/*`):**
- Judul & a11y: `modal-transaksi-title`, `modal-edit-transaksi-title`, `modal-hapus-title`, `confirm-title`, `confirm-message`, `confirm-icon`, `confirm-badge-icon`, `modal-menu-title`, `modal-quickpay-title`, `modal-audit-log-title`, `modal-kelola-master-title`, `modal-edit-anggota-title`, `modal-offline-queue-title`, `modal-export-title`, `modal-statistik-title`, `p-nama-anggota`, `modal-riwayat-title`, `badge-admin-login`.
- Form & nilai transaksi: `form-iuran`, `iuran-kategori`, `iuran-nominal`, `iuran-bulan`, `iuran-tahun`, `iuran-checkbox-anggota`, `count-terpilih`, `btn-pilih-semua`, `summary-count`, `summary-nominal`, `summary-total`, `search-anggota-iuran`, `form-operasional`, `ops-tipe`, `ops-kategori`, `ops-nominal`, `ops-anggota`, `ops-keterangan`, `summary-ops-tipe`, `summary-ops-label`, `summary-ops-total`, `summary-ops-nominal`.
- Edit & hapus: `form-edit-transaksi`, `edit-id`, `edit-tipe`, `edit-kategori`, `edit-nominal`, `edit-anggota`, `edit-bulan`, `edit-tahun`, `edit-keterangan`, `hapus-id-target`, `btn-hapus`, `btn-confirm-action-submit`, `confirm-title`.
- QuickPay: `form-quickpay`, `qp-id-anggota`, `qp-bulan`, `qp-tahun`, `qp-avatar`, `qp-nama`, `qp-periode`, `qp-nominal`.
- Master: `form-tambah-anggota`, `input-nama-anggota`, `input-wa-anggota`, `table-master-anggota`, `master-anggota-tbody`, `form-tambah-kategori`, `input-tipe-kategori`, `input-nama-kategori`, `table-master-kategori`, `master-kategori-tbody`, `input-skip-month`, `skipped-months-list`, `edit-anggota-body`, `audit-log-tbody`.
- Riwayat: `search-trx`, `filter-bulan`, `filter-tahun`, `history-filter-chips`, `riwayat-summary-bar`, `rw-count`, `rw-masuk`, `rw-keluar`, `table-riwayat`, `table-riwayat-data`, `btn-load-more`.
- Statistik: `stat-health-pct`, `stat-health-label`, `stat-health-fill`, `stat-health-note`, `stat-fully-paid`, `stat-with-arrears`, `stat-uncollected`, `card-stat-menunggak`, `last-update`, `cashFlowChart`, `expenseChart`, `expense-chart-title`.
- Profil: `p-id-anggota`, `p-status-anggota`, `p-total-kontribusi`, `p-bulan-terajin`, `p-list-transaksi`.
- Grup/offline/tampilan: `group-picker-list`, `group-pin-name`, `pin0`..`pin3`, `group-pin-msg`, `form-create-group`, `input-group-nama`, `input-group-pin`, `input-group-admin-email`, `input-group-admin-pwd`, `chk-group-admin-auto`, `group-admin-list`, `group-admin-count`, `superadmin-emails-list`, `form-add-superadmin`, `input-add-superadmin`, `cred-disp-nama`, `cred-disp-pin`, `cred-disp-email`, `cred-disp-pwd`, `offline-queue-list`, `indicator-style-picker`, `language-picker`, `modal-faq`.

**c) `name` form-control & tipe input.** Tidak ada perubahan `name`, `type`, `required`, `min`, `max`, `maxlength`, `inputmode`, `autocomplete`, `data-search`. Ini terjaga oleh guard; jangan "merapikan" atribut ini.

**d) Hirarki DOM yang dijaga.** Elemen ber-`id` di atas harus tetap berada di dalam `.modal-content` pada overlay yang sama; jangan memindahkan form keluar dari overlay-nya. Tab-content tetap bersaudara dengan `.tab-header`/`.tab-buttons` di modal yang sama.

### 1.5 Berkas yang akan disentuh
- **CSS (sumber → di-build ke `style.css`):** `css/modules/modals.css` (utama), didukung `tokens.css`, `typography.css`, `forms.css`, `buttons.css`, `base.css` (hanya bagian overlay/scrollbar terkait modal), `tables.css` (thead sticky modal), `navmenu.css` (menu sheet & quickpay), `widgets.css` (stat-card modal statistik), `helpers.css` (metric-pill/riwayat-summary-bar), `queue.css`, `cdrop.css`, `mpick.css`, `responsive-mobile.css`, `responsive-tablet.css`, `rtl.css`.
- **HTML fragmen (→ di-build ke `index.html`):** seluruh 11 berkas di `html/modals/`.
- **Artefak build (jangan diedit tangan):** `index.html`, `style.css`.
- **Pipeline:** `sw.js` (sinkron precache bila perlu), `html/index.template.html` (bump `style.css?v=N` di `<head>`).

### 1.6 Artefak & harness pendukung (sudah ada — pakai, jangan bikin baru)
- `tests/qa/_qa-modal.html?m=<id>&theme=dark|light` — isolasi satu modal, meng-`fetch('../../index.html')`, mengimpor node, mengisi fixture teks (outline magenta), dan mengaktifkan tombol tutup. **Harus dijalankan lewat HTTP** (mis. `python3 -m http.server 8099`) karena `fetch` diblokir pada `file://`.
- `tests/qa/_qa-view.html` — viewport harness (preset lebar 390/430/600/768/900/1280) dengan daftar 23 id modal; membersihkan service worker sebelum render.
- `scripts/verify.mjs` — sintaks JS/MJS, kecocokan `LOCAL_ASSETS` `sw.js`, kesegaran `index.html`.
- `scripts/verify-markup-contract.mjs` — penjaga kontrak `id`/`data-action`/`data-tab`/`data-style`/`data-lang`/`name`.
- `tests/qa/_qa-shell.html`, `tests/qa/_qa.html` — shell & galeri komponen (referensi visual non-modal, untuk konsistensi token).
---

## Bab 2 — Audit Masalah Visual Modal Saat Ini

Audit ini dilakukan pada kondisi build `v120` (`css/modules/modals.css`, `forms.css`, `tables.css`, `navmenu.css`, `base.css`, dan 11 fragmen `html/modals/*.html`). Temuan dikelompokkan per tingkat: **Blocker** (merusak arah/prinsip utama), **Major** (menyimpang dari standar anatomi), **Minor** (poles).

### 2.1 Temuan Blocker

| ID | Lokasi | Masalah | Dampak | Perbaikan (Bab 4) |
|---|---|---|---|---|
| **M-01** | `forms.css` `.modal-overlay` `@supports (backdrop-filter: blur(4px))` | Overlay memakai `backdrop-filter: blur(4px)` (kaca berat) + latar `rgba(6,17,26,0.72)` | Melanggar "hapus backdrop blur berat"; kanvas di belakang jadi kabur, bukan kontras permukaan murni | Ganti jadi latar solid `rgba(8,19,29,0.80)` tanpa `backdrop-filter` (FASE 0) |
| **M-02** | `modals.css` / `forms.css` segmented tabs | `.tab-btn.active` memakai `box-shadow: inset 0 -2px 0 0 var(--accent)` + `background: var(--surface)` di dalam kontainer `--surface-2` → kesan "pil melayang" + garis 2px | Menyimpang dari "flat segmented control bergaris pembatas **1px**, bukan tombol pil melayang" | Ratakan: kontainer hairline 1px, segmen terpisah divider 1px, aktif = permukaan + teks accent-strong + 1px accent line (FASE 0/1) |
| **M-03** | `forms.css` `.chip-btn` / `forms.css` | Chips riwayat (`set-riwayat-preset`, `set-history-filter`) memakai `border-radius: var(--r-pill)` dan aktif = `background: var(--accent)` penuh (pil hijau solid) | Anti-pola pill; melanggar disiplin satu bentuk tegas | Ubah ke segmen persegi radius `--r-sm`, aktif = `--accent-tint` + border accent (FASE 3) |
| **M-04** | `modals.css` `.modal-center-dialog .modal-badge-icon` | Badge ikon dialog tengah = `52×52px` `border-radius: --r-md` (bubble besar) + `padding: 30px 26px` | "rounded bubble berlebih" pada konfirmasi; tidak konsisten dengan badge 40×40 header | Standarkan badge ikon ke 36/40px radius 6px; rapikan padding dialog tengah (FASE 0/1) |
| **M-05** | `buttons.css` `.btn-slate-solid` dipakai `#modal-logout` | Tombol konfirmasi logout memakai slate solid (`background: var(--text-muted)`), bukan coral | Melanggar peta warna fungsional (Logout = Ocean Coral) | Ganti tombol konfirmasi logout ke gaya destruktif coral (FASE 2) |

### 2.2 Temuan Major

| ID | Lokasi | Masalah | Perbaikan |
|---|---|---|---|
| **M-06** | `html/modals/*.html` `.modal-header-standard` | Tidak ada **mono eyebrow** kategori di atas judul (banding: Mercury/Stripe). Judul langsung `<h2>` + subtitle | Tambah `<span class="eyebrow">KATEGORI // AKSI</span>` di dalam `.modal-title-wrap` tiap modal (Bab 4, semua fase) |
| **M-07** | `forms.css` `.input-with-prefix` | Prefix "Rp" hanya `position:absolute; left:14px` dengan `border-right` — bukan bagian dari border input; ukuran font `17px` (bukan hero) | Jadikan field nominal sebagai **hero input**: mono besar (~24–28px), `tabular-nums`, prefix terintegrasi ke dalam border input (FASE 1) |
| **M-08** | `modals.css` `.modal-header-standard` `top:-24px` & `.modal-content { padding:24px }` | Offset sticky terikat erat ke padding; rapuh bila padding diubah, dan belum tentu "terkunci" jelas saat scroll (header bisa terlihat setengah) | Definisikan ulang sticky header standar dengan latar `--surface` + border-bawah 1px, offset konsisten, dan variabel padding terpusat (FASE 0) |
| **M-09** | `tables.css` — modal master/riwayat/audit | Hanya audit (`thead sticky top:0`) & riwayat (`.sticky-thead`) yang sticky; tabel master (`table-master-anggota`, `table-master-kategori`) **tidak** sticky header di dalam modal | Terapkan sticky table header pada **semua** tabel di dalam modal (FASE 3) |
| **M-10** | seluruh area scroll modal | Tidak ada `scrollbar-gutter: stable` pada `.modal-content`, `.table-responsive`, checkbox-grid, riwayat table wrapper (hanya `.faq-list` yang punya) | Tambahkan `scrollbar-gutter: stable` agar layout tidak bergeser saat data dimuat (FASE 0/3) |
| **M-11** | `.close-modal-btn` (32px) vs `.nav-close-btn` (34px) | Ukuran tombol tutup tidak konsisten & < 44px (target sentuh mobile) | Standarkan ke satu ukuran (mis. 32–34px desktop, area sentuh ≥44px via padding pada mobile) (FASE 0) |
| **M-12** | `modals.css` `.modal-center-dialog .modal-dialog-actions .btn { flex:1 }` + `.modal-footer-actions .btn { min-width:180px }` | Pada dialog kecil, `min-width:180px` bisa memaksa tombol melebihi lebar dialog; aksi tidak simetris | Batasi `min-width` responsif; pastikan Batal (outline) + Eksekusi (coral) seimbang (FASE 1) |
| **M-13** | `navmenu.css` `.quickpay-sheet .qp-member { border-left:3px solid var(--accent) }` | Kartu anggota quickpay memakai aksen kiri tebal 3px (bubble); bukan hairline | Ubah ke kartu hairline `--surface-2`, identitas lewat avatar/eyebrow, bukan bar warna (FASE 1) |
| **M-14** | `modals.css` `.table-card::before` legacy & gradient sisa | Perlu pastikan tidak ada sisa garis/gradient lama di kartu dalam modal | Audit & hapus (Bab 5) |

### 2.3 Temuan Minor

| ID | Lokasi | Masalah | Perbaikan |
|---|---|---|---|
| **m-01** | `modals.css` `.modal-content { transform: scale(0.97) translateY(8px) }` | Animasi scale+bounce halus; bisa terasa "AI-generated" | Ganti ke fade + translateY kecil tanpa scale (FASE 0) |
| **m-02** | `modals.css` `.style-option-card.active { box-shadow: inset 2px 0 0 0 var(--accent) }` | Indikator bar 2px, bukan 1px | Ganti ke 1px accent line + check indicator (FASE 4) |
| **m-03** | `modals.css` `.summary-total { color: var(--accent) }` | "TOTAL KAS" memakai aksen penuh; aksen harus langka | Batasi aksen pada angka total saja, label netral (FASE 1) |
| **m-04** | `modals.css` `.faq-item summary { color: var(--accent-strong) }` | Semua ringkasan FAQ aksen → aksen tidak langka | Ringkasan netral `--text-main`, ikon/penanda aksen (FASE 4) |
| **m-05** | konsistensi radius | Campuran `--r-sm`/`--r-md`/`--r-lg` pada badge/ikon/kartu dalam modal | Kunci radius: input & tombol 8px, badge ikon 6px, pill hanya badge teks (FASE 0) |
| **m-06** | `#modal-hapus`, `#modal-logout`, `#modal-group-pin` | Belum dipaksa jadi bottom-sheet < 768px (kini overlay tengah dengan padding) | Terapkan transformasi bottom-sheet otomatis (<768px): radius atas 12px (FASE 0) |

### 2.4 Ringkasan yang Sudah Baik (dipertahankan)
- `.table-card`/`.modal-content` sudah hairline (`border: 1px solid var(--border) !important`) dan `.modal-content` memakai `--shadow-pop` tunggal (bukan blur berlapis). **Pertahankan.**
- Kartu/tabel kanvas sudah `box-shadow: none`. **Pertahankan.**
- `.close-modal-btn` sudah netral (tanpa merah, tanpa rotate). **Pertahankan & konsistenkan.**
- `.modal-badge-icon.danger/.warning/.slate` sudah memakai token (`--danger-bg`, `--surface-2`). **Pertahankan.**
- `nav-ico.is-blue/is-amber/is-slate` sudah diredam netral. **Pertahankan.**
- `navmenu.css` `scrollbar-gutter: stable` pada `.faq-list` — jadikan contoh untuk area scroll modal lain.

---

## Bab 3 — Referensi Desain & Standar Anatomi Modal "Ocean Ledger"

Filozofi: **Trust-first** (tenang, institusional, dapat dipercaya) × **Tactile Precision** (padat, terukur, border tegas). Referensi dipetakan langsung ke komponen modal.

### 3.A Layout Frame & Elevasi (Benchmark: Column & Linear)
- **Hairline frame.** Modal = permukaan `--surface` dengan `border: 1px solid var(--border)`. Elevasi dihasilkan **murni** dari kontras kanvas (`--bg-color`) ke modal (`--surface`) + **satu** shadow `--shadow-pop`. **Dilarang**: inset glow (`inset 0 3px 0 0 #10b981`), glow emerald, gradient tepi.
- **Tanpa backdrop blur berat.** Overlay = warna solid `rgba(8,19,29,0.80)`. Hapus `backdrop-filter`. Bila ingin sedikit redup, cukup opacity solid (bukan blur).
- **Responsif adaptif:**
  - **Mobile `< 768px`** → **Bottom Sheet**: menempel bawah, `border-radius: 12px 12px 0 0`, hairline atas, **swipe affordance netral** (`--border-strong`, bukan warna aksen). Drag handle (`.quickpay-handle`) dipertahankan sebagai penanda, warnanya netral.
  - **Desktop `≥ 769px`** → **Dialog tengah** berbatas lebar presisi:
    - **Small Center Dialog (max 380px):** `#modal-hapus`, `#modal-logout`, `#modal-group-pin`.
    - **Standard Dialog (max 540px):** `#modal-transaksi`, `#modal-login`, `#modal-quickpay` (quickpay di desktop tetap 540; di mobile jadi bottom sheet).
    - **Data Dialog (max 840–960px):** `#modal-kelola-master`, `#modal-riwayat`, `#modal-statistik`.
  - Lebar lain: `#modal-about`/`#modal-groups`/`#modal-group-credentials`/`#modal-edit-anggota` = Standard (≤540); `#modal-export`/`#modal-profil-anggota`/`#modal-faq`/`#modal-tampilan` = Data (≤840); `#modal-audit-log` = Data (≤840); `#modal-menu` & `#modal-tampilan` = sheet.
- **Kedalaman.** Border header (hairline) + permukaan header (`--surface`) memberi "frame terkunci"; isi menggulir di antaranya.

### 3.B Anatomi Header & Eyebrow (Benchmark: Mercury & Stripe)
- **Sticky header.** Header terkunci di atas saat scroll: latar `--surface`, `border-bottom: 1px solid var(--border)`, `position: sticky; top:0` **relatif terhadap padding konten modal**. Saat isi menggulir, header tetap; isi lewat di bawahnya.
- **Mono eyebrow.** Di atas judul: `<span class="eyebrow">` mono uppercase ber-tracking, warna `--text-faint`. Format: `KATEGORI // AKSI`, contoh:
  - `TRANSAKSI // CATAT BARU` (`#modal-transaksi`)
  - `TRANSAKSI // KOREKSI` (`#modal-edit-transaksi`)
  - `DATA MASTER // ANGGOTA` (`#modal-kelola-master`)
  - `BUKU BESAR // RIWAYAT` (`#modal-riwayat`)
  - `AKSES // PENGURUS` (`#modal-login`)
- **Badge ikon fungsional.** `36×36px` **atau** `40×40px`, radius **6px** (`--r-sm`), latar tint aksen halus (`--accent-tint`) + border `--accent-border`, glif Phosphor. Varian fungsional: `.danger` (coral), `.warning` (amber), `.slate` (netral). **Tanpa gradient pelangi.**
- **Close button netral.** Bersih, ikon `ph-x`, hover hanya mengubah **tone permukaan** (`--surface-2` → `--surface-3`) dan warna ikon ke `--text-main`. **Tanpa** border merah, **tanpa** rotasi 90°.

### 3.C Area Input & Focal Point (Benchmark: Ramp & Brex)
- **Hero Input Amount.** Pada `#modal-transaksi` (tab operasional & iuran) dan `#modal-quickpay`, field nominal menjadi **pusat visual**:
  - Font **monospace** (`--font-mono`) besar (~24–28px), `tabular-nums`, bobot 600.
  - **Prefix "Rp" terintegrasi ke dalam border input** (bukan elemen melayang dengan border sendiri): satu kotak input dengan prefix mono muted di sisi kiri, dipisah hairline internal 1px.
  - Label di atas (`eyebrow`/label form) mono uppercase muted.
- **Form precision.** `.form-control` radius **8px**, border 1px padat, state `:focus` = **ring aksen 2px tajam** (`outline`/`box-shadow: 0 0 0 2px` tanpa blur glow besar; hindari `3px` diffuse). Placeholder `--text-faint`.
- **Segmented Tabs.** Tab (`data-tab`, daftar Anggota/Kategori/Bulan Libur) memakai **flat segmented control**: satu kontainer hairline 1px, segmen dipisah **divider 1px**, segmen aktif = permukaan `--surface` + teks `--accent-strong` + garis aksen 1px (bukan pil melayang, bukan fill accent penuh).

### 3.D Area Data & Tabel dalam Modal (Benchmark: Column Ledger)
- **Sticky Table Header.** `thead` di dalam modal mengunci di bawah header modal saat scroll (`position: sticky; top:0; z-index` cukup, latar `--surface-2`). Berlaku untuk: audit log, riwayat, master anggota, master kategori.
- **Monospace Data Alignment.** Nominal, tanggal, ID anggota, persentase → `--font-mono` + `tabular-nums`, **rata kanan**. Kolom deskripsi/keterangan → Inter, **rata kiri**. Badge/kode → mono.
- **Scrollbar gutter.** `scrollbar-gutter: stable` pada semua area scroll modal (konten, tabel, checkbox-grid, riwayat) agar tidak bergeser saat data dimuat.
- **Zebra/hover.** Hover baris = `--surface-2` (halus), tanpa warna aksen penuh baris.

### 3.E Dialog Konfirmasi & Destruktif (Benchmark: Stripe Safety Confirmation)
- **Summary Box.** Dialog `#modal-hapus` & `#modal-logout` memuat ringkasan data terdampak dalam kotak `.delete-target-summary`/`.confirm-impact-note`: latar `--surface-2`, border tegas `--border`, radius `--r-md`, label mono uppercase `--text-faint`, isi teks `--text-main`.
- **Tombol destruktif.** Coral (`--danger` / `--danger-hover`) dipakai **eksklusif** untuk tombol eksekusi hapus/logout. Tombol **Batal** memakai gaya **outline netral** (`--border-strong`, teks `--text-main`). Susunan: Batal (kiri) → Eksekusi coral (kanan).

### 3.F Sistem Token "Ocean Ledger" (dari `css/modules/tokens.css` — jangan bikin token baru di luar ini)
**Dark Mode (Navy Ocean) — tema unggulan:**
| Peran | Token | Nilai |
|---|---|---|
| Kanvas overlay | `--bg-color` @ 0.80 | `#08131d` |
| Modal surface | `--surface` | `#112334` |
| Header & sub-card | `--surface-2` | `#193147` |
| Active / hover row | `--surface-3` | `#223f5b` |
| Hairline border | `--border` | `rgba(56,189,248,0.16)` |
| Border penegas | `--border-strong` | `rgba(56,189,248,0.28)` |
| Teks utama | `--text-main` | `#e9f4f8` |
| Teks muted | `--text-muted` | `#93b4c7` |
| Teks eyebrow/faint | `--text-faint` | `#5d7f94` |
| Aksen utama | `--accent` | `#2dd4bf` (Ocean Teal) |

**Light Mode (Paper Ocean):**
| Peran | Token | Nilai |
|---|---|---|
| Modal surface | `--surface` | `#edf6fa` |
| Header & raised | `--surface-2` | `#dfedf4` |
| Border | `--border` | `#b8d7e6` |
| Teks utama | `--text-main` | `#0e2437` |
| Aksen utama | `--accent` | `#0d9488` |

**Aksen fungsional (satu fungsi = satu warna):**
- Positif / Simpan / Bayar → **Ocean Teal** (`--accent`).
- Bahaya / Hapus / Logout → **Ocean Coral** (`--danger` `#fb7185` dark / `#e11d48` light).
- Info → **Ocean Cyan** (`--secondary` `#38bdf8`).
- Peringatan/amber → **Ocean Amber** (`--warning` `#fbbf24`).
- **Aksen langka:** teal hanya untuk aksi utama, state aktif, focus ring, dan **satu** angka/total per dialog.

### 3.G Tipografi
| Peran | Font (token) | Pemakaian di modal |
|---|---|---|
| Judul modal & hero stat | **Fraunces** (`--font-display`) | `h2`/`h3` judul modal, judul kartu, angka hero (Kesehatan Kas %) |
| Nominal, kode transaksi/ID, tanggal, badge | **JetBrains Mono** (`--font-mono`) | hero amount, sel nominal, `ID: AGT-…`, tanggal audit, `metric-pill`, eyebrow, kode kredensial |
| Form label, body, tombol | **Inter** (`--font-sans`) | label form, deskripsi, tombol, nav |

Aturan: angka finansial **selalu** `tabular-nums`; eyebrow mono uppercase `letter-spacing ~0.14em`; judul serif `letter-spacing -0.02em`.

### 3.H Radius, Spacing, Elevasi
- **Radius:** `--r-xs 4` · `--r-sm 6` (badge ikon) · `--r-md 8` (input, tombol, kartu, modal) · `--r-lg 8` · bottom-sheet atas `12px` · `--r-pill` **hanya** badge/tag teks.
- **Spacing (base 4px):** `4·8·12·16·24·32·48` (`--sp-*`). Padding modal 20–24px; jarak antar-seksi 24–32px.
- **Elevasi:** modal = hairline + `--shadow-pop` tunggal. Kartu dalam modal = hairline, `box-shadow:none`.

### 3.I Peta Warna per Komponen Modal
| Komponen | Warna |
|---|---|
| Tombol simpan/bayar/submit | Teal solid (`--accent`) |
| Tombol batal/outline/sekunder | Netral outline (`--border-strong`) |
| Tombol hapus/logout (eksekusi) | Coral solid (`--danger`) |
| Tombol hapus (opsi di dalam edit) | Coral outline (`btn-danger-outline`) |
| Badge ikon default | Tint teal |
| Badge ikon warning (offline queue, edit) | Amber/neutral |
| Badge ikon danger (hapus) | Tint coral |
| Info sync/offline | Cyan (`--secondary`) |
| Angka total/positif | Teal (satu titik) |
| Angka keluar/negatif | `--text-main` + tanda `−` |
| Row menunggak/danger | Netral + badge outline, bukan amber penuh |
---

## Bab 4 — Fase Eksekusi Bertahap (Checklist)

> Semua sub-butir berformat `- [ ]`. **Update ke `- [x]` segera** setelah unit selesai & diverifikasi. Urutan sengaja: fondasi → transaksi → akses/grup → data-heavy → laporan/utilitas → packaging, agar tiap langkah bisa langsung diverifikasi.

### FASE 0 — Standardisasi Frame Modal Dasar
**Berkas utama:** `css/modules/modals.css`. **Pendukung:** `forms.css` (overlay/segmented), `base.css` (hanya blok terkait modal/scrollbar), `buttons.css` (varian tombol modal), `typography.css` (kelas eyebrow — hanya bila perlu tambahan kelas modal).
**Tujuan:** menyatukan kerangka semua modal (frame hairline, overlay solid, header sticky standar, close button, token binding, responsif bottom-sheet) **sebelum** menyentuh isi modal.

- [ ] **F0.1 — Overlay solid tanpa blur.** Hapus blok `@supports (backdrop-filter: blur(4px))` pada `.modal-overlay`; set `background: rgba(8, 19, 29, 0.80)` (dark) dan padanan light yang kokoh. Hapus `backdrop-filter`/`-webkit-backdrop-filter` di seluruh selector terkait modal. *Lulus bila:* grep `backdrop-filter` di `css/modules/*` = 0 untuk konteks modal; overlay tetap memisahkan kanvas dari modal.
- [ ] **F0.2 — Frame hairline + shadow tunggal.** Pastikan `.modal-content { border: 1px solid var(--border); box-shadow: var(--shadow-pop); border-radius: var(--r-md) }` tanpa inset glow / gradient tepi. Hapus semua sisa `inset 0 3px 0 0 …` bila ada. *Lulus bila:* `grep 'inset 0 3px'` = 0.
- [ ] **F0.3 — Animasi masuk tanpa scale berlebih.** Ganti `transform: scale(0.97) translateY(8px)` → `translateY(6px)` + `opacity` (tanpa `scale`). *Lulus bila:* modal muncul dengan fade+dorongan halus, bukan "pop".
- [ ] **F0.4 — Sticky header standar.** Definisikan satu `.modal-header-standard` dengan `position:sticky; top:calc(-1 * var(--modal-pad)); background:var(--surface); border-bottom:1px solid var(--border); z-index:3`. Perkenalkan `--modal-pad` (default 24px) agar offset sticky tidak rapuh. Sesuaikan `.modal-footer-actions` `bottom:calc(-1 * var(--modal-pad))`. *Lulus bila:* saat konten panjang (mis. `#modal-riwayat`, `#modal-kelola-master`), header tetap terkunci dan footer aksi tetap terlihat.
- [ ] **F0.5 — Badge ikon seragam.** Standarkan `.modal-badge-icon` ke `36px`/`40px`, radius `6px` (`--r-sm`), tint aksen + border aksen. Kecilkan `.modal-center-dialog .modal-badge-icon` dari 52px → 40px. Pastikan varian `.danger`/`.warning`/`.slate` tetap token-based. *Lulus bila:* semua modal header memakai badge ukuran identik; dialog tengah tidak "bubble".
- [ ] **F0.6 — Close button netral & konsisten.** Standarkan `.close-modal-btn` (dan `.nav-close-btn`) ke ukuran sama (mis. 32px desktop); hover = perubahan tone permukaan + ikon `--text-main`; tanpa border merah/rotate. Tambahkan area sentuh ≥44px pada `@media (max-width:768px)`. *Lulus bila:* semua tombol tutup tampil identik; mudah diklik di mobile.
- [ ] **F0.7 — Responsif bottom-sheet otomatis (<768px).** Tambah aturan `@media (max-width:767px)` yang mengubah `.modal-content` (kecuali sheet yang sudah sheet) menjadi menempel bawah: `border-radius:12px 12px 0 0`, lebar penuh, hairline atas, padding bawah aman (safe-area). Terapkan pada minimal `#modal-hapus`, `#modal-logout`, `#modal-group-pin`, `#modal-about`, `#modal-group-credentials` dan modal standar. *Lulus bila:* di 390px, modal muncul dari bawah dengan radius atas 12px.
- [ ] **F0.8 — Swipe affordance netral.** Pastikan `.quickpay-handle` dan handle sheet memakai `background: var(--border-strong)` (netral), bukan aksen. Tambah handle serupa untuk sheet yang belum punya bila perlu. *Lulus bila:* handle abu netral.
- [ ] **F0.9 — Segmented tabs flat 1px.** Tulis ulang `.tab-header`/`.tab-buttons`/`.tab-btn`: kontainer hairline 1px; segmen aktif = `--surface` + teks `--accent-strong` + garis aksen **1px** (bukan `inset 0 -2px`); hover = `--surface-3`. *Lulus bila:* tab `#modal-transaksi` & `#modal-kelola-master` tampak sebagai segmen garis, bukan pil.
- [ ] **F0.10 — Scrollbar gutter stable.** Tambah `scrollbar-gutter: stable` pada `.modal-content`, `.table-responsive.table-scrollable`, `.checkbox-grid`, wrapper tabel riwayat, `.faq-list` (sudah ada), dan area `.modal-main-selection`. *Lulus bila:* memuat data tidak menggeser layout (tanpa lompatan horizontal).
- [ ] **F0.11 — Binding token audit.** Pastikan seluruh warna modal lewat `var(--*)`. Ganti semua hex mentah (mis. `#10b981`, `#8b93a1`, `rgba(...)` hardcoded non-token) di selector modal → token. *Lulus bila:* `grep -rE '#[0-9a-fA-F]{3,6}' css/modules/modals.css` menyisakan 0 (kecuali di komentar/token import).
- [ ] **F0.12 — Focus ring tajam.** Set `.form-control:focus` (modal) = ring aksen 2px tajam (`box-shadow: 0 0 0 2px` atau `outline`), hilangkan glow `3px` diffuse pada konteks modal. *Lulus bila:* fokus input terlihat sebagai garis tajam di dark & light.
- [ ] **F0.13 — Verifikasi FASE 0.** Jalankan `npm run build`, lalu buka `_qa-modal.html?m=modal-transaksi&theme=dark` & `theme=light` via server lokal; periksa frame/header/close/tabs. Centang bila bersih.

### FASE 1 — Modal Transaksi & Pembayaran (prioritas trust)
**Berkas fragmen:** `html/modals/transactions.html`, `html/modals/navigation.html` (bagian `#modal-quickpay`). **Berkas CSS:** `modals.css`, `forms.css`, `navmenu.css`.

- [ ] **F1.1 — Eyebrow `#modal-transaksi`.** Tambah `.eyebrow` "TRANSAKSI // CATAT BARU" di `.modal-title-wrap`. *Lulus bila:* tampil mono muted di atas judul.
- [ ] **F1.2 — Segmented tabs Iuran/Operasional.** Terapkan segmented flat 1px pada tab-header modal transaksi (F0.9). Pastikan `data-tab="iuran"`/`"operasional"` dan `id="btn-tab-iuran"`/`"btn-tab-operasional"` tidak berubah. *Lulus bila:* switch tab berfungsi & tampak segmen garis.
- [ ] **F1.3 — Hero input nominal (Iuran & Operasional).** Ubah `.input-with-prefix` di `#iuran-nominal` & `#ops-nominal` jadi hero: input mono besar (~24–28px, `tabular-nums`), prefix "Rp" terintegrasi dalam border input (divider internal 1px). *Lulus bila:* nominal adalah elemen paling menonjol di panel sisi kiri.
- [ ] **F1.4 — Summary card ledger.** Rapikan `.summary-card`: label netral, `#summary-total` mono teal (satu titik aksen), `#summary-ops-tipe` mengikuti warna fungsional (Masuk teal / Keluar netral+`−`). *Lulus bila:* hanya total yang beraksen.
- [ ] **F1.5 — Checkbox grid ledger.** Rapikan `.checkbox-grid`/`.checkbox-item`: hairline, terpilih = border aksen + `--accent-tint` (sudah ada) + label mono untuk badge PAID/belum. Pastikan `#iuran-checkbox-anggota`, `.chk-iuran` tak berubah. *Lulus bila:* grid rapi, tidak overflow, target ≥44px di mobile.
- [ ] **F1.6 — Verifikasi `#modal-transaksi`.** `_qa-modal.html?m=modal-transaksi&theme=dark|light` @390 & @1280. Cek: hero nominal, tabs, checkbox, summary, tombol simpan teal. *Lulus bila:* tidak ada teks terpotong/overflow; kontrak `data-action`/`id` utuh.
- [ ] **F1.7 — Eyebrow + panel dampak `#modal-edit-transaksi`.** Tambah eyebrow "TRANSAKSI // KOREKSI". Rapikan `.edit-impact-panel` (hairline, `--surface-2`), tombol `data-action="cetak"` (outline netral) & `data-action="hapus"` (coral outline `btn-danger-outline`). *Lulus bila:* tombol hapus satu-satunya coral di modal ini; simpan = teal.
- [ ] **F1.8 — Verifikasi `#modal-edit-transaksi`.** Isolasi modal; cek `#edit-*` field utuh, panel dampak, footer aksi tidak meluber di 390px. *Lulus bila:* `btn-submit-edit` tetap `id` sama & simpan berfungsi.
- [ ] **F1.9 — Dialog hapus `#modal-hapus`.** Pastikan badge ikon 40px `.danger`, `.delete-target-summary` (kotak ringkasan `--surface-2` + border tegas + label mono `data-i18n="del.target"`), tombol Batal outline netral + "Ya, Hapus" coral solid (`btn-danger-solid`, `data-action="confirm-delete"`, `id="btn-hapus"`). *Lulus bila:* coral hanya di tombol eksekusi; `#hapus-id-target` utuh.
- [ ] **F1.10 — Dialog konfirmasi `#modal-confirm-action`.** Rapikan `.confirm-impact-note` (kotak `--surface-2`), badge ikon dinamis (`#confirm-badge-icon`, `#confirm-icon`), teks (`#confirm-title`, `#confirm-message`), tombol Batal (`data-action="cancel-confirm-action"`) + Lanjut (`id="btn-confirm-action-submit"`). *Lulus bila:* `showConfirmDialog()` di `js/ui/modal.js` mengisi semua node tanpa error.
- [ ] **F1.11 — QuickPay `#modal-quickpay`.** Eyebrow "PEMBAYARAN // KILAT"; kartu anggota `.qp-member` → hairline `--surface-2` (hapus `border-left:3px`), avatar mono; hero input `#qp-nominal`; tombol simpan teal (`id="btn-submit-quickpay"`). Pertahankan `#qp-*` & `form-quickpay`. *Lulus bila:* nominal hero jelas, `#qp-nama`/`#qp-avatar` terisi JS.
- [ ] **F1.12 — Verifikasi `#modal-hapus`, `#modal-confirm-action`, `#modal-quickpay`.** Isolasi ketiganya (dark & light, 390 & 1280). *Lulus bila:* dialog tengah rapi, quickpay bottom-sheet di mobile, tak ada overflow.
- [ ] **F1.13 — Build & centang.** `npm run build` → `npm run check` 0 failure, lalu centang sub-butir FASE 1 yang lolos.
### FASE 2 — Modal Akses & Kelola Grup
**Berkas fragmen:** `html/modals/auth.html`, `html/modals/groups.html`, `html/modals/group-pin.html`, `html/modals/group-admin.html`. **Berkas CSS:** `modals.css`, `forms.css`, `buttons.css`.

- [ ] **F2.1 — Login `#modal-login`.** Eyebrow "AKSES // PENGURUS". Form: `#input-admin-email` (ikon amplop), `#input-admin-pwd` (+ `.btn-pwd-peek` `#btn-toggle-pwd`), submit `#btn-submit-login` teal. Badge `#badge-admin-login` tetap membawa `data-action="stealth-badge-click"`. *Lulus bila:* badge klik tetap berfungsi; field mono/`type=email`/`type=password` tak berubah; autofocus password terjaga.
- [ ] **F2.2 — Verifikasi `#modal-login`.** Isolasi (dark & light, 390 & 1280). *Lulus bila:* input + peek + submit rapi; toggle password mengubah `type` tanpa error.
- [ ] **F2.3 — Logout `#modal-logout`.** Badge ikon `.slate`; teks (`#modal-logout-title`); tombol Batal (`data-action="cancel-logout"`) outline netral + konfirmasi (`data-action="confirm-logout"`, `id="btn-logout-confirm"`) → **coral** (ganti dari `.btn-slate-solid`; jika perlu buat `.btn-danger-solid` dipakai). *Lulus bila:* tombol keluar coral, bukan slate; z-index dialog tetap di atas.
- [ ] **F2.4 — About `#modal-about`.** Rapikan `.about-sheet`: logo (light/dark), `.about-meta` (baris versi/platform/backend) mono untuk nilai; tautan privasi tetap `#modal-about` `target="_blank"`, warna aksen `var(--accent)`. Badge ikon & padding konsisten standar Small Center. *Lulus bila:* kartu About 380px rapi, tanpa gradient.
- [ ] **F2.5 — Grup picker `#modal-groups`.** Eyebrow "GRUP // PILIH". Rapikan `#group-picker-list` (`.group-item`/`.group-card-item`): hairline, item aktif = `--accent-tint` + 1px accent line (bukan 2px inset). Aksi: `data-action="exit-group"` (outline) + tautan onboarding (outline). Pertahankan `#group-picker-list`. *Lulus bila:* daftar grup rapi; item aktif jelas tanpa bubble.
- [ ] **F2.6 — Verifikasi `#modal-groups`.** Isolasi. *Lulus bila:* tidak ada overflow; tombol keluar grup mudah diklik.
- [ ] **F2.7 — PIN grup `#modal-group-pin`.** `.pin-row`/`.pin-box` (4 input `#pin0..#pin3`, `data-pin`) mono besar, kotak hairline tegas, fokus = ring aksen; `#group-pin-msg` mono muted; tombol `data-action="submit-group-pin"` teal + `data-action="open-groups"` outline; catatan kunci netral. Paksa bottom-sheet < 768px. *Lulus bila:* 4 kotak sejajar, fokus rapi, pesan error terbaca, bottom-sheet di mobile.
- [ ] **F2.8 — Kelola grup `#modal-group-admin`.** Eyebrow "GRUP // KELOLA". Rapikan `.group-admin-create-box` (form `#form-create-group` + `#input-group-nama` + `#input-group-pin` + submit + opsi `#chk-group-admin-auto` & `#input-group-admin-email`/`#input-group-admin-pwd` + refresh `#btn-refresh-admin-pwd`). Daftar `#group-admin-list` + `#group-admin-count`. Kartu superadmin `.group-superadmin-card` (`#superadmin-emails-list`, `#form-add-superadmin`, `#input-add-superadmin`). *Lulus bila:* semua id form utuh; kartu hairline; tombol chip (`.btn-group-chip`) rapi; `data-action` baris tidak berubah.
- [ ] **F2.9 — Kredensial `#modal-group-credentials`.** Rapikan `.cred-card-box` (baris `#cred-disp-nama/-pin/-email/-pwd`, kode mono), tombol `data-action="copy-cred-wa"` teal + tombol tutup outline. *Lulus bila:* kode mono jelas; salin WA berfungsi.
- [ ] **F2.10 — Verifikasi `#modal-group-admin`, `#modal-group-credentials`.** Isolasi. *Lulus bila:* form grup tidak meluber, kartu superadmin rapi, kredensial mono.
- [ ] **F2.11 — Build & centang.** `npm run build` → `npm run check`; centang sub-butir FASE 2 yang lolos.

### FASE 3 — Modal Data-Heavy & Ledger
**Berkas fragmen:** `html/modals/master.html`, `html/modals/riwayat.html`. **Berkas CSS:** `modals.css`, `tables.css`, `forms.css`, `helpers.css`, `queue.css`.

- [ ] **F3.1 — Kelola master `#modal-kelola-master`.** Eyebrow "DATA MASTER // ANGGOTA". Terapkan segmented tabs flat 1px pada `.tab-buttons` (3 tab: anggota/kategori/skipped) — `data-tab` & `data-action="switch-tab"` utuh. *Lulus bila:* tab bergaris, switch berfungsi.
- [ ] **F3.2 — Tab Anggota.** Rapikan form `#form-tambah-anggota` (`#input-nama-anggota`, `#input-wa-anggota`, submit) + tabel `#table-master-anggota` (`#master-anggota-tbody`): thead monospace `--surface-2` **sticky**, kolom status rata tengah mono, aksi. *Lulus bila:* header tabel menempel saat scroll; ID/status mono; tidak overflow.
- [ ] **F3.3 — Tab Kategori.** Rapikan `#form-tambah-kategori` (`#input-tipe-kategori`, `#input-nama-kategori`) + tabel `#table-master-kategori` (`#master-kategori-tbody`): kolom ID mono rata kiri, tipe arus mono. Sticky thead. *Lulus bila:* ID kategori mono; sticky header aktif.
- [ ] **F3.4 — Tab Bulan Libur.** Rapikan panel skip (`#input-skip-month`, tombol `data-action="add-skip"`) + `#skipped-months-list` (kartu `.skipped-month`/`.master-skipped-card-panel` hairline, indeks mono, badge netral). *Lulus bila:* tombol tambah tidak meluber; daftar bulan rapi.
- [ ] **F3.5 — Editor anggota `#modal-edit-anggota` (nested).** Rapikan `#edit-anggota-body` (konten digenerate JS — pastikan class hairline & mono cocok dengan output `js/handlers/master.js`), badge ikon default, subtitle `#edit-anggota-subtitle`. *Lulus bila:* nested overlay tampil di atas master; konten JS tetap terbaca.
- [ ] **F3.6 — Verifikasi `#modal-kelola-master` + `#modal-edit-anggota`.** Isolasi (dark & light, 390 & 1280). *Lulus bila:* 3 tab rapi, tabel sticky, nested editor tidak memotong.
- [ ] **F3.7 — Riwayat `#modal-riwayat`.** Eyebrow "BUKU BESAR // RIWAYAT". Konversi chips (`.chip-btn`, `data-action="set-riwayat-preset"`/`"set-history-filter"`) dari **pil** → segmen persegi `--r-sm`; aktif = `--accent-tint` + border aksen. Rapikan `.riwayat-filter-rail`, `.riwayat-toolbar` (search `#search-trx`, `#filter-bulan`, `#filter-tahun`), `.riwayat-summary-bar` (`#rw-count` mono, `.metric-pill.metric-in` teal, `.metric-pill.metric-out` netral + `−`). *Lulus bila:* chips persegi; `metric-in`/`metric-out` sesuai; `data-preset`/`data-filter` tak berubah.
- [ ] **F3.8 — Tabel riwayat.** Tabel `#table-riwayat` (`#table-riwayat-data`): thead sticky (`.sticky-thead`), kolom Waktu (mono, rata kiri/atau tetap), Keterangan (rata kiri Inter), Nominal (mono rata kanan), Tipe Arus (badge `.badge-masuk`/`.badge-keluar`), Aksi. Footer `.riwayat-footer` + `#btn-load-more`. *Lulus bila:* nominal mono sejajar kanan; tanggal mono; sticky thead; load-more berfungsi.
- [ ] **F3.9 — Verifikasi `#modal-riwayat`.** Isolasi. *Lulus bila:* filter rail + tabel + summary rapi, tanpa overflow horizontal; klik chip mengubah filter.
- [ ] **F3.10 — Audit log `#modal-audit-log`.** Eyebrow "AUDIT // AKTIVITAS". Rapikan `.audit-filter-rail` (`.audit-filter-kicker` mono aksen, tombol `data-action="refresh-audit-log"`) + `.audit-table-column` (`#audit-log-tbody`): kolom Waktu (mono rata kanan) / Aksi / Detail (rata kiri). thead sticky. *Lulus bila:* waktu mono; rail + tabel rapi; refresh berfungsi.
- [ ] **F3.11 — Offline queue `#modal-offline-queue`.** Badge ikon `.warning`. Rapikan `.queue-status-bar` (info cyan `--secondary`), `.queue-actions` (`data-action="refresh-offline"` outline, `data-action="sync-now"` teal), `#offline-queue-list` (payload mono, hairline). *Lulus bila:* aksi sync jelas; item antrean mono; tidak overflow.
- [ ] **F3.12 — Verifikasi `#modal-audit-log` + `#modal-offline-queue`.** Isolasi. *Lulus bila:* tabel audit sticky, queue rapi di 390px.
- [ ] **F3.13 — Build & centang.** `npm run build` → `npm run check`; centang sub-butir FASE 3 yang lolos.
### FASE 4 — Modal Laporan & Utilitas
**Berkas fragmen:** `html/modals/reports.html`, `html/modals/faq.html`, `html/modals/tampilan.html`. **Berkas CSS:** `modals.css`, `widgets.css`, `helpers.css`.

- [ ] **F4.1 — Export `#modal-export`.** Eyebrow "LAPORAN // EKSPOR". Rapikan `.export-format-rail` (kartu aksi `.export-card-btn`): tombol `data-action="copy-monthly-recap"` (primary teal, ikon). `data-action="print-annual"` (outline), `data-action="export-csv"` (link subtle), panel backup (`data-action="export-json-backup"` + label restore + `#input-restore-json`). Panel pratinjau `.export-preview-panel` hairline `--surface-2`. *Lulus bila:* ikon WhatsApp netral/aksen (bukan hijau WA mentah); dua tombol copy tidak duplikatif berlebihan; semua `data-action` utuh.
- [ ] **F4.2 — Verifikasi `#modal-export`.** Isolasi. *Lulus bila:* rail + pratinjau rapi, tidak overflow, tombol mudah diklik.
- [ ] **F4.3 — Statistik `#modal-statistik`.** Eyebrow "LAPORAN // STATISTIK". Jadikan **Kesehatan Kas %** (`#stat-health-pct`) sebagai **hero serif Fraunces** (angka aksen teal), label/note sebagai penjelas. Kartu lain (`#stat-fully-paid`, `#stat-with-arrears`, `#stat-uncollected`) mono; `.progress-bar`/`#stat-health-fill` aksen tunggal; kartu `#card-stat-menunggak` tetap `data-action="action-salin-tagihan-wa"`. Chart section: `#cashFlowChart` & `#expenseChart` (warna diatur `js/render/dashboard.js`, bukan di sini) — pastikan kontainer & judul (`expense-chart-title`, `last-update`) rapi. *Lulus bila:* % jadi hero; hanya satu angka aksen kuat; kartu stat hairline; tidak menyentuh logika chart JS.
- [ ] **F4.4 — Verifikasi `#modal-statistik`.** Isolasi (dark & light). *Lulus bila:* hero % tampil serif, kartu mono netral, chart kontainer rapi, tidak overflow di 390px.
- [ ] **F4.5 — Profil anggota `#modal-profil-anggota`.** Eyebrow "ANGGOTA // PROFIL". Rapikan `.profile-modal-card`: `#p-nama-anggota` (Fraunces), `#p-id-anggota` (mono), `#p-status-anggota` (badge), metrik `#p-total-kontribusi` (mono aksen), `#p-bulan-terajin` (mono/plain), linimasa `#p-list-transaksi` (item hairline, tanggal mono, nominal mono rata kanan). *Lulus bila:* ID & nominal mono; nama anggota serif; linimasa rapi.
- [ ] **F4.6 — Verifikasi `#modal-profil-anggota`.** Isolasi. *Lulus bila:* kartu profil rapi; item linimasa tidak overflow; nominal rata kanan.
- [ ] **F4.7 — FAQ `#modal-faq`.** Eyebrow "BANTUAN // FAQ". Rapikan `.faq-list`/`.faq-item`: ringkasan **netral `--text-main`** (bukan aksen penuh; penanda `+`/`-` mono `--text-faint`), ikon per-item netral/aksen halus, `scrollbar-gutter: stable` (sudah ada). *Lulus bila:* hanya penanda yang beraksen kecil; akordeon `open`/tutup bekerja.
- [ ] **F4.8 — Verifikasi `#modal-faq`.** Isolasi. *Lulus bila:* akordeon rapi, tidak overflow, teks jawaban terbaca di kedua tema.
- [ ] **F4.9 — Tampilan `#modal-tampilan`.** Eyebrow "PENGATURAN // TAMPILAN". Rapikan 5 opsi gaya indikator (`data-action="select-indicator-style"`, `data-style` grid `#indicator-style-picker`) & 3 bahasa (`data-action="select-language"`, `data-lang` grid `#language-picker`). Aktif: **1px accent line** + check indicator (bukan `inset 2px`). Preview `.style-preview-wrap` satu aksen (keluarga tile-* sudah satu aksen — pertahankan). *Lulus bila:* grid garis bersih, aktif = garis 1px + check; `data-style`/`data-lang` tak berubah.
- [ ] **F4.10 — Verifikasi `#modal-tampilan`.** Isolasi (dark & light). *Lulus bila:* 5 gaya + 3 bahasa render konsisten; memilih opsi mengubah state aktif tanpa error.
- [ ] **F4.11 — Menu navigasi `#modal-menu`.** Eyebrow "NAVIGASI // MENU". Rapikan `.nav-sheet`: `#modal-menu-title`, kotak pencarian `.nav-search-box`, group label mono, item `.nav-item` (ikon tile satu aksen; `.is-red` hanya untuk logout). Pertahankan `data-action` tiap menu. *Lulus bila:* menu rapi, tile netral (kecuali logout coral), press feedback halus, tidak overflow.
- [ ] **F4.12 — Verifikasi `#modal-menu`.** Isolasi (bottom-sheet mobile). *Lulus bila:* item ≥44px, scroll rapi, tak ada teks terpotong.
- [ ] **F4.13 — Build & centang.** `npm run build` → `npm run check`; centang sub-butir FASE 4 yang lolos.

### FASE 5 — Packaging & Verifikasi Pipeline
**Berkas:** `html/index.template.html` (bump versi CSS), `sw.js` (cache sync), artefak `index.html` + `style.css` (regenerasi via build).

- [ ] **F5.1 — Regenerasi build.** Jalankan `npm run build` (build:html menyusun `index.html` dari 11 fragmen; build:css menyusun `style.css` via Tailwind v4). *Lulus bila:* build sukses tanpa error; `index.html` 11 fragmen terinjeksi (tanpa placeholder `@@INJECT_MODALS@@`).
- [ ] **F5.2 — Bump versi stylesheet.** Naikkan `style.css?v=N` di `html/index.template.html` (dan `onboarding.html` bila menyentuh) ke N+1 (mis. `?v=121`). *Lulus bila:* seluruh referensi `style.css?v=` konsisten di satu nilai baru. **Catatan:** hanya sentuh `<head>` template (bukan header UI).
- [ ] **F5.3 — Sinkronisasi `sw.js`.** Bila tidak ada aset baru, cukup bump `CACHE_NAME` (mis. `finkas-v121`) agar cache lama terpurge. Bila ada modul CSS baru (mis. kelas eyebrow ditambahkan di modul baru), daftarkan di `LOCAL_ASSETS`. *Lulus bila:* `npm run verify` melaporkan `LOCAL_ASSETS` lengkap & 0 failure.
- [ ] **F5.4 — Jalankan gerbang wajib.** `npm run build` → `npm run verify` → `npm test` → `npm run check`. *Lulus bila:* keempat perintah 0 failure.
- [ ] **F5.5 — Guard kontrak markup.** `node scripts/verify-markup-contract.mjs` (baseline `HEAD~17` atau tag sebelum fase). *Lulus bila:* semua `id`/`data-action`/`data-tab`/`data-style`/`data-lang`/`name` baseline terjaga (0 missing).
- [ ] **F5.6 — QA visual penuh.** Buka `tests/qa/_qa-modal.html` untuk **setiap** 23 id × 2 tema via server lokal; catat temuan. *Lulus bila:* semua modal render tanpa blank/overflow.
- [ ] **F5.7 — Tutup temuan.** Bila ada bug: perbaiki di modul/fragmen sumber → `npm run build` → ulangi `npm run check` → baru centang. *Lulus bila:* tak ada temuan blocker/major terbuka.

---

## Bab 5 — Checklist Verifikasi & QA

> Semua item `- [ ]`. Diverifikasi berurutan setelah FASE 5. Ini adalah **gerbang penerimaan** (definition of done) redesain modal.

### 5.1 Pengujian Isolasi Modal per ID
Harness: `tests/qa/_qa-modal.html?m=<id>&theme=dark|light` (jalankan via HTTP server lokal, mis. `python3 -m http.server 8099`). Untuk tiap ID, periksa: frame hairline, header sticky + eyebrow, close netral, tidak ada overflow/teks terpotong, tombol ≥44px, angka mono rata kanan.

- [ ] `modal-login` — dark & light, 390 & 1280.
- [ ] `modal-logout` — dark & light; tombol keluar coral.
- [ ] `modal-about` — dark & light; kartu 380px.
- [ ] `modal-groups` — dark & light; item aktif 1px line.
- [ ] `modal-group-pin` — dark & light; 4 pin-box sejajar, bottom-sheet <768px.
- [ ] `modal-group-admin` — dark & light; form grup + superadmin rapi.
- [ ] `modal-group-credentials` — dark & light; kode mono.
- [ ] `modal-menu` — bottom-sheet; item ≥44px.
- [ ] `modal-quickpay` — hero nominal; kartu anggota hairline.
- [ ] `modal-audit-log` — thead sticky; waktu mono.
- [ ] `modal-kelola-master` — 3 tab; tabel sticky; nested editor.
- [ ] `modal-edit-anggota` — nested overlay tampil di atas master.
- [ ] `modal-offline-queue` — payload mono; aksi sync.
- [ ] `modal-export` — rail + pratinjau; ikon WA netral.
- [ ] `modal-statistik` — hero % Fraunces; kartu mono; chart kontainer.
- [ ] `modal-profil-anggota` — nama serif; ID/nominal mono; linimasa.
- [ ] `modal-riwayat` — chips persegi; summary metric; tabel sticky.
- [ ] `modal-transaksi` — hero nominal; segmented tabs; checkbox grid.
- [ ] `modal-edit-transaksi` — panel dampak; hapus coral outline.
- [ ] `modal-hapus` — summary box; eksekusi coral; batal outline.
- [ ] `modal-confirm-action` — badge dinamis; dua tombol.
- [ ] `modal-faq` — akordeon; ringkasan netral.
- [ ] `modal-tampilan` — 5 gaya + 3 bahasa; aktif 1px line.

### 5.2 Audit Statis (pembersihan pola lama) — cakupan `css/**` & `html/modals/**`
- [ ] **Warna hex mentah (harus 0):** `#3b82f6`, `#6366f1`, `#f43f5e`, `#f59e0b`, `#25d366`, `#8b5cf6`, `#a855f7`, serta emerald mentah `#10b981`/`#059669`/`#34d399` **di luar `tokens.css`**. Semua wajib lewat `var(--…)`.
- [ ] **`linear-gradient` dekoratif** pada komponen modal → 0 (kecuali shimmer skeleton & chart JS).
- [ ] **`box-shadow`** selain `var(--shadow-pop)` pada konten modal → kartu `none`.
- [ ] **`backdrop-filter`** pada overlay/komponen modal → 0.
- [ ] **`border-radius` > 10px** di modal (di luar badge/pill/bottom-sheet-atas-12) → kembalikan ke 8/10px.
- [ ] **Hover mengangkat** (`translateY`/`translateX`/`scale` pada `.btn`/`.nav-item`/`.chip-btn`/`.style-option-card`) → hanya perubahan permukaan/border.
- [ ] **Glow lama:** `inset 0 3px`, `inset 0 -2px 0 0 var(--accent)` pada tab. → 0.
- [ ] **Angka tanpa mono:** `#summary-total`, `.metric-pill`, `#stat-health-pct`, `#p-total-kontribusi`, sel nominal riwayat/audit/master, `#qp-nominal` → `--font-mono` + `tabular-nums`.
- [ ] **`scrollbar-gutter: stable`** ada pada semua area scroll modal.
- [ ] **z-index stacking** (`#modal-hapus`, `#modal-edit-transaksi`, `#modal-menu`, dialog konfirmasi) tidak berubah/berkonflik.

### 5.3 Gerbang Otomatis (WAJIB lulus)
| Perintah | Memeriksa | Kriteria lulus |
|---|---|---|
| `npm run build` | regenerasi `index.html` (11 fragmen) + `style.css` (Tailwind v4) | tanpa error; `?v=` ter-bump bila CSS berubah |
| `npm run verify` | 1) sintaks `.js`/`.mjs` di `js/`+`api/`+`scripts/`; 2) `LOCAL_ASSETS` `sw.js` ↔ modul nyata; 3) kesegaran `index.html` vs fragmen + placeholder `@@INJECT_MODALS@@` hilang | 0 failure |
| `npm test` | 7 suite: analytics, encoding, group-write, i18n, session, state-session, utils | semua lulus |
| `npm run check` | gabungan verify + test | 0 failure |
| `node scripts/verify-markup-contract.mjs` | `id`/`data-action`/`data-tab`/`data-style`/`data-lang`/`name` vs baseline | 0 missing |

- [ ] `npm run build` → 0 error.
- [ ] `npm run verify` → 0 failure.
- [ ] `npm test` → semua suite lulus.
- [ ] `npm run check` → 0 failure.
- [ ] `node scripts/verify-markup-contract.mjs` → 0 missing.

### 5.4 Aksesibilitas, Kontras & RTL (khusus modal)
- [ ] Kontras teks body modal ≥ 4.5:1, teks besar ≥ 3:1 (dua tema). `--text-faint` hanya untuk eyebrow/label non-esensial.
- [ ] `:focus-visible` = ring aksen 2px tajam, terlihat di kedua tema pada input/tombol modal.
- [ ] `aria-label`/`data-i18n-aria` pada tombol ikon modal (close, peek, refresh, copy); target sentuh ≥44×44px (mobile).
- [ ] RTL (`lang-ar`): pin-box, `input-with-prefix`, close button, tabel modal — arah & makna `+`/`−` tidak rusak (`css/modules/rtl.css` disesuaikan **hanya** untuk konteks modal bila diperlukan).
- [ ] Bottom-sheet <768px tidak menutupi kontrol krusial & aman terhadap safe-area (notch).

### 5.5 Checklist Progres Eksekusi (ringkasan centang fase)
- [ ] FASE 0 selesai & terverifikasi.
- [ ] FASE 1 selesai & terverifikasi.
- [ ] FASE 2 selesai & terverifikasi.
- [ ] FASE 3 selesai & terverifikasi.
- [ ] FASE 4 selesai & terverifikasi.
- [ ] FASE 5 selesai & terverifikasi.
- [ ] Bab 5.1 (23 modal × 2 tema) selesai.
- [ ] Bab 5.2 (audit statis) selesai.
- [ ] Bab 5.3 (gerbang otomatis) lulus.
- [ ] Bab 5.4 (a11y/RTL) selesai.

---

## Bab 6 — Ringkasan Keputusan yang Membutuhkan Persetujuan

1. **Ruang lingkup benar-benar modal-only.** Dashboard hero, Header, Rekap Iuran, Bottom nav, dan Onboarding **tidak disentuh**. Bila ada aturan global yang harus diubah di `base.css`/`forms.css`, perubahan dibatasi pada blok yang terisolasi ke modal. — *Setuju?*
2. **Jumlah dialog aktual 23 (bukan 18).** Rencana mencakup **seluruh 23** id overlay pada 11 fragmen; selisih 5 berasal dari varian konfirmasi/akses/kredensial (`confirm-action`, `logout`, `about`, `group-credentials`, `edit-anggota`). — *Setuju mencakup 23, atau batasi ke 18 inti?*
3. **Overlay tanpa backdrop blur.** Overlay jadi solid `rgba(8,19,29,0.80)` dan menghapus `backdrop-filter` (efek kaca dihilangkan). — *Setuju?*
4. **Aksen teal dipertahankan sebagai satu warna aksen** (positif/simpan/bayar/aktif/fokus), sedangkan **coral** jadi satu-satunya warna destruktif (hapus **dan** logout). Logout pindah dari slate → coral. — *Setuju?*
5. **Bottom-sheet otomatis <768px** untuk semua modal (bukan hanya sheet), radius atas 12px, swipe affordance netral. — *Setuju?*
6. **Hero input nominal** (font mono besar ~24–28px) dipakai di `#modal-transaksi` (iuran & operasional) dan `#modal-quickpay`. — *Setuju ukuran hero-nya (24–28px)?*
7. **Segmented control 1px & chips persegi** menggantikan tab underline 2px dan chips pil di riwayat. — *Setuju?*
8. **Tokoh typografi:** judul modal tetap **Fraunces** (serif); nominal/ID/tanggal **JetBrains Mono**; body/label/tombol **Inter**. Tanpa menambah keluarga font baru. — *Setuju?*
9. **Sinkronisasi `sw.js` dengan bump `CACHE_NAME`** (mis. `finkas-v121`) setiap rilis fase, dan bump `style.css?v=N` bila CSS berubah. — *Setuju?*

> Setelah Bab 6 disetujui, eksekusi dimulai dari **FASE 0**, dan setiap sub-butir dicentang **real-time** pada dokumen ini sebelum melanjutkan ke sub-butir berikutnya.
