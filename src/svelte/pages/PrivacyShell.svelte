  <header class="privacy-topbar">
    <div class="privacy-topbar-inner">
      <a href="index.html" class="privacy-brand-link">
        <img src="icons/icon-light-192.svg" alt="Logo Finkas" class="brand-logo-light">
        <img src="icons/icon-192.svg" alt="Logo Finkas" class="brand-logo-dark">
        <span class="privacy-brand-name">Finkas</span>
        <span class="privacy-brand-sep" aria-hidden="true">/</span>
        <span class="privacy-brand-crumb" data-i18n="crumb">Privasi</span>
      </a>

      <div class="privacy-topbar-actions">
        <div class="privacy-lang-switch" role="group" aria-label="Pilihan bahasa" data-i18n-aria="langGroup">
          <button type="button" class="privacy-lang-btn" data-privacy-lang="id" aria-pressed="true">ID</button>
          <button type="button" class="privacy-lang-btn" data-privacy-lang="en" aria-pressed="false">EN</button>
        </div>

        <button type="button" class="privacy-icon-btn" id="btn-privacy-theme" aria-label="Ganti tema terang atau gelap" aria-pressed="false">
          <i class="ph ph-moon" id="privacy-theme-icon" aria-hidden="true"></i>
        </button>

        <a href="index.html" class="privacy-back-btn">
          <i class="ph-bold ph-arrow-left" aria-hidden="true"></i>
          <span data-i18n="backApp">Kembali ke Aplikasi</span>
        </a>
      </div>
    </div>
  </header>

  <section class="privacy-hero">
    <div class="privacy-hero-inner">
      <span class="privacy-eyebrow">
        <i class="ph ph-shield-check" aria-hidden="true"></i>
        <span data-i18n="eyebrow">Kebijakan Privasi &amp; Keamanan Data</span>
      </span>

      <h1 data-i18n="title">Kebijakan Privasi</h1>

      <p class="privacy-lead" data-i18n="lead">Finkas berkomitmen menjaga privasi dan integritas data keuangan kelompok Anda dengan prinsip sederhana, transparan, dan terisolasi.</p>

      <div class="privacy-meta-strip">
        <span class="privacy-meta-chip"><i class="ph ph-calendar-check" aria-hidden="true"></i><span data-i18n="metaUpdated">Pembaruan terakhir: September 2026</span></span>
        <span class="privacy-meta-chip"><i class="ph ph-list-checks" aria-hidden="true"></i><span data-i18n="metaSections">5 bagian ringkas</span></span>
        <span class="privacy-meta-chip"><i class="ph ph-clock" aria-hidden="true"></i><span data-i18n="metaRead">~2 menit baca</span></span>
      </div>

      <div class="privacy-pillars">
        <article class="privacy-pillar-card">
          <span class="privacy-pillar-ico" aria-hidden="true"><i class="ph ph-lock-key"></i></span>
          <div>
            <h2 data-i18n="pillar1Title">Terisolasi Per Grup</h2>
            <p data-i18n="pillar1Desc">Data setiap grup terpisah ketat berdasarkan ID grup aktif.</p>
          </div>
        </article>
        <article class="privacy-pillar-card">
          <span class="privacy-pillar-ico" aria-hidden="true"><i class="ph ph-prohibit"></i></span>
          <div>
            <h2 data-i18n="pillar2Title">Tanpa Pelacak Iklan</h2>
            <p data-i18n="pillar2Desc">Tidak pernah menjual atau membagikan data ke pihak ketiga.</p>
          </div>
        </article>
        <article class="privacy-pillar-card">
          <span class="privacy-pillar-ico" aria-hidden="true"><i class="ph ph-sliders-horizontal"></i></span>
          <div>
            <h2 data-i18n="pillar3Title">Kendali Penuh Admin</h2>
            <p data-i18n="pillar3Desc">Ekspor Excel/CSV/JSON, perbarui, atau hapus data kapan saja.</p>
          </div>
        </article>
      </div>
    </div>
  </section>

  <div class="privacy-layout">
    <aside class="privacy-aside">
      <nav class="privacy-toc-nav" aria-label="Daftar isi kebijakan privasi" data-i18n-aria="tocAria">
        <span class="privacy-toc-title" data-i18n="tocTitle">Daftar Isi</span>
        <a href="#data-dikelola" class="privacy-toc-link" aria-current="true">
          <span class="privacy-toc-num">01</span>
          <span data-i18n="toc1">Data yang Dikelola</span>
        </a>
        <a href="#penyimpanan-isolasi" class="privacy-toc-link">
          <span class="privacy-toc-num">02</span>
          <span data-i18n="toc2">Penyimpanan &amp; Isolasi</span>
        </a>
        <a href="#autentikasi-google" class="privacy-toc-link">
          <span class="privacy-toc-num">03</span>
          <span data-i18n="toc3">Autentikasi Google</span>
        </a>
        <a href="#tanpa-pelacak" class="privacy-toc-link">
          <span class="privacy-toc-num">04</span>
          <span data-i18n="toc4">Ketiadaan Pelacak</span>
        </a>
        <a href="#hak-pengguna" class="privacy-toc-link">
          <span class="privacy-toc-num">05</span>
          <span data-i18n="toc5">Hak &amp; Penghapusan</span>
        </a>
      </nav>

      <div class="privacy-trust-box">
        <dl class="privacy-trust-list">
          <div class="privacy-trust-row">
            <dt data-i18n="trustStorageLabel">Penyimpanan</dt>
            <dd>Cloud Firestore</dd>
          </div>
          <div class="privacy-trust-row">
            <dt data-i18n="trustPinLabel">Verifikasi PIN</dt>
            <dd data-i18n="trustPinVal">Hash scrypt</dd>
          </div>
        </dl>
        <button type="button" class="privacy-print-btn" id="btn-privacy-print">
          <i class="ph ph-printer" aria-hidden="true"></i>
          <span data-i18n="printBtn">Cetak Halaman</span>
        </button>
      </div>
    </aside>

    <main class="privacy-article">
      <section id="data-dikelola" tabindex="-1" class="privacy-section">
        <span class="privacy-sec-tag" data-i18n="sec1Tag">01 · Inventaris Data</span>
        <h2 data-i18n="sec1Title">1. Data yang Dikelola</h2>
        <p data-i18n="sec1Intro">Finkas hanya menyimpan informasi yang diperlukan pengurus dan anggota untuk menjalankan pembukuan kas kelompok secara akurat.</p>

        <ul class="privacy-item-list">
          <li class="privacy-item-card">
            <span class="privacy-item-ico" aria-hidden="true"><i class="ph ph-receipt"></i></span>
            <div>
              <strong data-i18n="sec1Item1Title">Informasi Kas</strong>
              <p data-i18n="sec1Item1Desc">Catatan transaksi pemasukan, pengeluaran, saldo, bukti lampiran opsional, dan rekap iuran bulanan yang dimasukkan oleh pengurus kelompok.</p>
            </div>
          </li>
          <li class="privacy-item-card">
            <span class="privacy-item-ico" aria-hidden="true"><i class="ph ph-users"></i></span>
            <div>
              <strong data-i18n="sec1Item2Title">Data Anggota</strong>
              <p data-i18n="sec1Item2Desc">Nama atau inisial anggota serta nomor WhatsApp opsional untuk memudahkan konfirmasi rekap pembayaran dan pengingat iuran.</p>
            </div>
          </li>
          <li class="privacy-item-card">
            <span class="privacy-item-ico" aria-hidden="true"><i class="ph ph-key"></i></span>
            <div>
              <strong data-i18n="sec1Item3Title">Data Kredensial</strong>
              <p data-i18n="sec1Item3Desc">PIN akses kelompok (4 digit) dan kata sandi pengurus disimpan sebagai hash kriptografis scrypt satu arah di sisi server.</p>
            </div>
          </li>
        </ul>
      </section>

      <section id="penyimpanan-isolasi" tabindex="-1" class="privacy-section">
        <span class="privacy-sec-tag" data-i18n="sec2Tag">02 · Arsitektur Cloud</span>
        <h2 data-i18n="sec2Title">2. Penyimpanan &amp; Isolasi Data</h2>
        <p>
          <span data-i18n="sec2Part1">Seluruh rekaman kas disimpan pada infrastruktur Google Cloud Firestore dalam skema isolasi ketat per kelompok (</span><code class="privacy-code">groupId</code><span data-i18n="sec2Part2">). Data satu kelompok tidak dapat diakses atau bercampur dengan kelompok lain.</span>
        </p>
        <div class="privacy-callout">
          <span class="privacy-callout-ico" aria-hidden="true"><i class="ph ph-shield-check"></i></span>
          <div>
            <strong data-i18n="sec2CalloutTitle">Otorisasi Terbatas Sesi</strong>
            <p data-i18n="sec2CalloutDesc">Setiap permintaan baca dan tulis diperiksa ulang di server memakai token sesi bertanda tangan yang terikat pada ID grup terkait.</p>
          </div>
        </div>
      </section>

      <section id="autentikasi-google" tabindex="-1" class="privacy-section">
        <span class="privacy-sec-tag" data-i18n="sec3Tag">03 · Kontrol OAuth</span>
        <h2 data-i18n="sec3Title">3. Autentikasi Google</h2>
        <p data-i18n="sec3Body">Fitur autentikasi Google Sign-In digunakan terbatas untuk memverifikasi identitas pemilik atau Super Admin utama terhadap daftar email resmi.</p>

        <div class="privacy-scope-grid">
          <div class="privacy-scope-card is-allow">
            <div class="privacy-scope-head">
              <i class="ph-fill ph-check-circle" aria-hidden="true"></i>
              <span data-i18n="sec3AllowTitle">Yang Diakses</span>
            </div>
            <ul>
              <li data-i18n="sec3Allow1">Alamat email terverifikasi untuk pencocokan hak akses Super Admin</li>
              <li data-i18n="sec3Allow2">Profil dasar akun untuk konfirmasi sesi aktif</li>
            </ul>
          </div>
          <div class="privacy-scope-card is-deny">
            <div class="privacy-scope-head">
              <i class="ph-fill ph-x-circle" aria-hidden="true"></i>
              <span data-i18n="sec3DenyTitle">Tidak Pernah Diakses</span>
            </div>
            <ul>
              <li data-i18n="sec3Deny1">Daftar kontak atau buku alamat Google Anda</li>
              <li data-i18n="sec3Deny2">Isi kotak masuk Gmail maupun berkas Google Drive</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="tanpa-pelacak" tabindex="-1" class="privacy-section">
        <span class="privacy-sec-tag" data-i18n="sec4Tag">04 · Prinsip Netralitas</span>
        <h2 data-i18n="sec4Title">4. Ketiadaan Pelacak Komersial</h2>
        <p data-i18n="sec4Body">Finkas tidak menjual, menyewakan, atau membagikan data pengguna maupun data transaksi kepada pihak ketiga untuk periklanan. Seluruh sistem ditujukan murni demi efisiensi pembukuan kas komunitas.</p>
      </section>

      <section id="hak-pengguna" tabindex="-1" class="privacy-section">
        <span class="privacy-sec-tag" data-i18n="sec5Tag">05 · Kendali Pemilik Data</span>
        <h2 data-i18n="sec5Title">5. Hak Pengguna &amp; Penghapusan</h2>
        <p data-i18n="sec5Body">Pengurus grup memegang hak penuh untuk memperbarui catatan, mengekspor arsip pembukuan kapan saja dalam format Excel/CSV maupun JSON, serta menghapus data grup secara permanen.</p>
      </section>

      <footer class="privacy-footer-card">
        <p class="privacy-footer-copy" data-i18n="footerCopy">&copy; 2025–2026 Finkas · Pembukuan kas kelompok yang sederhana, transparan, dan terisolasi.</p>
        <div class="privacy-footer-actions">
          <a class="privacy-cta-primary" href="index.html">
            <i class="ph-bold ph-arrow-left" aria-hidden="true"></i>
            <span data-i18n="backApp">Kembali ke Aplikasi</span>
          </a>
          <a class="privacy-cta-secondary" href="onboarding.html">
            <i class="ph ph-house" aria-hidden="true"></i>
            <span data-i18n="welcomePage">Halaman Utama</span>
          </a>
        </div>
      </footer>
    </main>
  </div>

<style>
  :global {
    body[data-palette] .table-card {
      background: color-mix(in srgb, var(--surface) 90%, transparent) !important;
    }

    body[data-palette] .header {
      background: color-mix(in srgb, var(--surface) 94%, transparent);
      gap: 6px;
      padding: 4px 8px;
      border-radius: 12px;
      box-shadow: none;
    }

    .header .header-left,
    .header .header-right,
    .header .header-actions {
      gap: 4px;
    }

    .header .header-actions {
      width: auto;
      padding: 0;
      overflow: visible;
    }

    .header .header-actions .btn,
    .header .group-name {
      min-height: 38px;
      height: 38px;
      padding-block: 0;
    }

    .header .header-actions .btn {
      min-width: 38px;
      gap: 5px;
    }

    .header .header-actions [data-action="open-login"] {
      width: auto;
    }

    .header .group-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header .brand-link {
      flex: 0 0 auto;
    }

    .hybrid-topbar-role {
      display: flex;
      justify-content: center;
      align-items: center;
      min-width: 0;
    }

    .role-switcher-track {
      position: relative;
      isolation: isolate;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--border);
      border-radius: var(--r-pill);
      background: var(--surface-2);
    }

    .role-switcher-track .workspace-glider {
      border-color: transparent;
      background: var(--text-main);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.16);
      transition:
        translate 420ms var(--hybrid-ease-spring),
        width 340ms var(--hybrid-ease-spring),
        background-color 220ms ease,
        box-shadow 220ms ease;
    }

    html[data-role="admin"] .role-switcher-track .workspace-glider {
      background: var(--nav-brand-cta, var(--accent-strong));
      box-shadow: 0 2px 10px color-mix(in srgb, var(--nav-brand-cta, var(--accent-strong)) 30%, transparent);
    }

    .role-switcher-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 30px;
      height: 30px;
      padding: 0 14px;
      border: 0;
      background: transparent;
      border-radius: inherit;
      font-size: 13px;
      font-weight: 700;
      line-height: normal;
      color: var(--text-muted);
      white-space: nowrap;
      cursor: pointer;
      transition: color 200ms ease;
    }

    .role-switcher-btn i {
      font-size: 15px;
      flex-shrink: 0;
    }

    .role-switcher-btn:hover:not([aria-selected="true"]) {
      color: var(--text-main);
    }

    .role-switcher-btn[aria-selected="true"],
    .role-switcher-btn[aria-selected="true"]:hover {
      color: var(--surface);
      background: var(--text-main);
    }

    html[data-role="admin"] .role-switcher-btn[aria-selected="true"],
    html[data-role="admin"] .role-switcher-btn[aria-selected="true"]:hover {
      color: var(--nav-on-brand, #ffffff);
      background: var(--accent-strong);
    }

    .role-switcher-btn:focus-visible {
      outline: 2px solid var(--accent-strong);
      outline-offset: 2px;
    }

    .header [data-action="toggle-privacy"][aria-pressed="true"] { color: var(--accent-strong); }

    .workspace-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      --workspace-action-width: 11.5rem;
      min-height: 38px;
      margin-bottom: 14px;
    }
    .workspace-tabs-scroll { max-width: 100%; overflow-x: auto; scrollbar-width: none; }
    @media (min-width: 769px) {
      .workspace-tabs-scroll {
        --fade-size: 2rem;
        scroll-padding-inline: var(--fade-size);
        mask:
          linear-gradient(black, black) no-clip subtract,
          linear-gradient(to right, black, transparent) 0 0 / var(--fade-start) 100% no-repeat no-clip,
          linear-gradient(to right, transparent, black) 100% 0 / var(--fade-end) 100% no-repeat no-clip;
        animation: reveal-fade-start linear both, hide-fade-end linear both;
        animation-timeline: scroll(self inline);
        animation-range: 0 var(--fade-size), calc(100% - var(--fade-size)) 100%;
      }

      @supports not (animation-timeline: scroll()) {
        .workspace-tabs-scroll {
          transition: --fade-start 180ms ease, --fade-end 180ms ease;
        }

        .workspace-tabs-scroll.more-start {
          --fade-start: var(--fade-size);
        }

        .workspace-tabs-scroll.more-end {
          --fade-end: var(--fade-size);
        }
      }
    }
    .workspace-tabs, .workspace-status-filter {
      position: relative;
      isolation: isolate;
      display: inline-flex;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--border);
      border-radius: var(--r-pill);
      background: var(--surface-2);
    }

    .workspace-glider {
      position: absolute;
      z-index: -1;
      inset: 3px auto 3px 0;
      width: var(--glider-width, 0px);
      translate: var(--glider-left, 0px);
      transition: translate 280ms var(--hybrid-ease-out), width 280ms var(--hybrid-ease-out);
      border: 1px solid var(--border);
      border-radius: inherit;
      background: var(--surface);
      box-shadow: 0 2px 8px rgba(24, 20, 18, .08);
      pointer-events: none;
    }
    .workspace-tabs button, .workspace-status-filter button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 30px;
      padding: 0 14px;
      border-radius: inherit;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 700;
      line-height: normal;
      white-space: nowrap;
      cursor: pointer;
    }
    .workspace-tabs [aria-selected="true"], .workspace-status-filter [aria-pressed="true"] { color: var(--text-main); }
    .workspace-label-mobile { display: none; }
    :is(.workspace-matrix-tools, .workspace-history-tools) { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .workspace-head:not(:has(#workspace-tab-history[aria-selected="true"])) .workspace-history-tools { display: none; }
    .workspace-head:not(:has(#workspace-tab-iuran[aria-selected="true"])) .workspace-matrix-tools { display: none; }
    :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-search { position: relative; display: inline-flex; align-items: center; margin: 0; }
    :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-search i { position: absolute; left: 11px; font-size: 15px; pointer-events: none; color: var(--text-muted); }
    :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-search.workspace-mobile-search { display: none; }
    :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-search .search-member-input {
      width: 238px;
      max-width: 100%;
      min-height: 38px;
      height: 38px;
      padding: 0 12px 0 33px;
      border-radius: 12px;
      background: var(--surface);
      font-size: 13px;
      font-weight: 600;
    }
    .workspace-status-filter button { padding-inline: 11px; font-size: 12px; font-variant-numeric: tabular-nums; }
    :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-jump {
      min-height: 38px;
      min-width: var(--workspace-action-width);
      padding: 0 12px;
      border-radius: 12px;
      background: var(--surface);
      font-size: 12px;
      font-weight: 700;
      gap: 6px;
      white-space: nowrap;
    }
    .workspace-kbd-hint {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 5px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--text-muted);
    }

    @media (max-width: 768px) {
      .workspace-head { --workspace-action-width: 8rem; }
      .workspace-tabs-scroll { width: 100%; overflow: visible; }
      .workspace-tabs, .workspace-status-filter { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .workspace-tabs button, .workspace-status-filter button { min-height: 44px; padding-inline: 4px; font-size: 12px; }
      .workspace-label-desktop, .workspace-kbd-hint, :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-search.workspace-desktop-search { display: none; }
      .workspace-label-mobile { display: inline; }
      :is(.workspace-matrix-tools, .workspace-history-tools) { display: grid; grid-template-columns: minmax(0, 1fr) auto; width: 100%; }
      :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-search.workspace-mobile-search { display: inline-flex; min-width: 0; grid-column: 1; grid-row: 1; }
      .workspace-matrix-tools .workspace-mobile-search .search-member-input { width: 100%; min-height: 44px; }
      :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-jump { grid-column: 2; grid-row: 1; min-height: 44px; }
      .workspace-history-tools .workspace-search { min-width: 0; }
      .workspace-history-tools .workspace-search .search-member-input { width: 100%; min-height: 44px; }
      .workspace-status-filter { grid-column: 1 / -1; }
      .workspace-status-filter button { font-size: 11.5px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .workspace-glider { transition: none; }
    }

    .workspace-panels {
      --workspace-scroll-offset: 78px;
      overflow-anchor: none;
    }

    .workspace-panel {
      min-width: 0;
      scroll-margin-top: var(--workspace-scroll-offset, 78px);
    }

    .workspace-panel[hidden] { display: none; }

    .workspace-panel .modal-content {
      width: auto;
      max-width: none;
      max-height: none;
      opacity: 1;
      transform: none;
      overflow: visible;
      box-shadow: var(--shadow-card) !important;
    }

    .workspace-panel .modal-header-standard { display: none; }

    .workspace-panel > .modal-content .table-card {
      margin-inline: 0;
      min-width: 0;
    }

    @media (max-width: 768px) {
      .header .header-actions .btn,
      .header .group-name,
      .header .brand-link {
        min-height: 44px;
      }

      .header .header-actions .btn,
      .header .brand-link {
        min-width: 44px;
      }

      .role-switcher-track { width: 100%; display: grid; grid-template-columns: 1fr 1fr; }
      .role-switcher-btn { min-height: 44px; height: 44px; padding: 0 10px; font-size: 13px; }
      .workspace-panel > .modal-content { margin-inline: 8px; }
    }
  }
</style>
