<!-- 7. Navigation Menu Modal Sheet (Hybrid Kinetic Command Hub) -->
  <dialog class="modal-overlay hybrid-dialog" id="modal-menu" aria-labelledby="modal-menu-title">
    <div class="modal-content modal-md command-hub-modal">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header command-hub-header">
        <div>
          <h2 id="modal-menu-title">Menu Navigasi</h2>
          <p>Akses cepat seluruh fitur, laporan, dan pengaturan kas</p>
        </div>
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup">
          <i class="ph-bold ph-x" aria-hidden="true"></i>
        </button>
      </div>

      <div class="command-search-wrap">
        <div class="command-search-bar">
          <i class="ph ph-magnifying-glass command-search-icon" aria-hidden="true"></i>
          <input type="search" id="search-nav-menu" name="search-nav-menu" class="command-search-input" placeholder="Cari menu, aksi, atau laporan..." autocomplete="off" spellcheck="false" aria-label="Cari navigasi menu">
          <button type="button" id="btn-clear-nav-search" class="command-clear-btn" aria-label="Hapus pencarian" hidden>
            <i class="ph-bold ph-x" aria-hidden="true"></i>
          </button>
          <span class="command-kbd-pill" aria-hidden="true">Ctrl K</span>
        </div>
      </div>

      <div class="command-hub-body">
        <!-- Sesi Pengurus (Khusus saat belum login admin) -->
        <button type="button" class="nav-item nav-item-featured" id="btn-login-menu-sheet" data-action="open-login" data-keywords="login masuk admin sandi password pengurus otentikasi">
          <span class="nav-ico is-brand"><i class="ph ph-shield-check" aria-hidden="true"></i></span>
          <div class="nav-item-content">
            <span class="nav-txt" data-i18n="nav.login.title">Login Pengurus</span>
            <small class="nav-sub" data-i18n="nav.login.sub">Masuk untuk mencatat transaksi &amp; mengelola data kas</small>
          </div>
          <i class="ph ph-caret-right nav-chev" aria-hidden="true"></i>
        </button>

        <!-- Section: Manajemen & Data Kas -->
        <div class="nav-group" data-group="data">
          <div class="nav-group-label" data-i18n="nav.sec.data">Manajemen &amp; Data Kas</div>
          <div class="nav-group-list">
            <button type="button" class="nav-item admin-only" data-action="open-kelola-master" data-keywords="master data anggota kategori bulan libur hapus tambah">
              <span class="nav-ico is-accent"><i class="ph ph-sliders-horizontal" aria-hidden="true"></i></span>
              <div class="nav-item-content">
                <span class="nav-txt" data-i18n="nav.master.title">Kelola Data Master</span>
                <small class="nav-sub" data-i18n="nav.master.sub">Atur daftar anggota, kategori transaksi &amp; bulan libur</small>
              </div>
              <span class="nav-badge-tag">ADMIN</span>
            </button>

            <button type="button" class="nav-item superadmin-only" data-action="open-group-admin" data-keywords="grup kelompok ruang kelas superadmin pin">
              <span class="nav-ico is-secondary"><i class="ph ph-buildings" aria-hidden="true"></i></span>
              <div class="nav-item-content">
                <span class="nav-txt" data-i18n="nav.groupadmin.title">Manajemen Grup</span>
                <small class="nav-sub" data-i18n="nav.groupadmin.sub">Buat grup kas baru &amp; kelola akses pengurus</small>
              </div>
              <span class="nav-badge-tag is-super">SUPERADMIN</span>
            </button>

            <button type="button" class="nav-item superadmin-only" data-action="open-audit-log" data-keywords="audit log jejak aktivitas histori admin superadmin">
              <span class="nav-ico is-secondary"><i class="ph ph-list-magnifying-glass" aria-hidden="true"></i></span>
              <div class="nav-item-content">
                <span class="nav-txt" data-i18n="nav.audit.title">Log Aktivitas</span>
                <small class="nav-sub" data-i18n="nav.audit.sub">Riwayat perubahan data dan jejak audit pengurus</small>
              </div>
              <span class="nav-badge-tag is-super">SUPERADMIN</span>
            </button>

            <button type="button" class="nav-item" data-action="open-offline-queue" data-keywords="antrean offline pending sinkron koneksi internet database">
              <span class="nav-ico is-warning"><i class="ph ph-cloud-arrow-up" aria-hidden="true"></i></span>
              <div class="nav-item-content">
                <span class="nav-txt" data-i18n="nav.offline.title">Antrean Offline</span>
                <small class="nav-sub" data-i18n="nav.offline.sub">Transaksi tersimpan lokal yang menunggu sinkronisasi</small>
              </div>
              <i class="ph ph-caret-right nav-chev" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <!-- Section: Laporan & Analitik -->
        <div class="nav-group" data-group="laporan">
          <div class="nav-group-label" data-i18n="nav.sec.report">Laporan &amp; Analitik</div>
          <div class="nav-group-list">
            <button type="button" class="nav-item" data-action="open-history" data-keywords="riwayat transaksi mutasi histori tabel pencarian">
              <span class="nav-ico is-income"><i class="ph ph-receipt" aria-hidden="true"></i></span>
              <div class="nav-item-content">
                <span class="nav-txt" data-i18n="nav.history.title">Riwayat Arus Kas</span>
                <small class="nav-sub" data-i18n="nav.history.sub">Daftar lengkap transaksi masuk, keluar &amp; struk digital</small>
              </div>
              <i class="ph ph-caret-right nav-chev" aria-hidden="true"></i>
            </button>

            <button type="button" class="nav-item" data-action="open-statistik" data-keywords="statistik grafik chart tren arus keuangan analisa">
              <span class="nav-ico is-income"><i class="ph ph-chart-line-up" aria-hidden="true"></i></span>
              <div class="nav-item-content">
                <span class="nav-txt" data-i18n="nav.stats.title">Analitik &amp; Grafik Kas</span>
                <small class="nav-sub" data-i18n="nav.stats.sub">Visualisasi tren saldo bulanan &amp; rasio kepatuhan</small>
              </div>
              <i class="ph ph-caret-right nav-chev" aria-hidden="true"></i>
            </button>

            <button type="button" class="nav-item" data-action="open-export" data-keywords="ekspor export unduh download excel csv pdf cetak laporan whatsapp wa">
              <span class="nav-ico is-accent"><i class="ph ph-file-arrow-down" aria-hidden="true"></i></span>
              <div class="nav-item-content">
                <span class="nav-txt" data-i18n="nav.export.title">Laporan &amp; Ekspor Data</span>
                <small class="nav-sub" data-i18n="nav.export.sub">Cetak laporan bulanan, unduh CSV/PDF &amp; rekap WhatsApp</small>
              </div>
              <i class="ph ph-caret-right nav-chev" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <!-- Section: Preferensi & Bantuan -->
        <div class="nav-group" data-group="sistem">
          <div class="nav-group-label" data-i18n="nav.sec.system">Preferensi &amp; Bantuan</div>
          <div class="nav-group-list">
            <button type="button" class="nav-item" data-action="open-tampilan" data-keywords="tampilan tema dark mode gelap terang aksen warna font privasi blur kerapatan bahasa language">
              <span class="nav-ico is-secondary"><i class="ph ph-swatches" aria-hidden="true"></i></span>
              <div class="nav-item-content">
                <span class="nav-txt" data-i18n="nav.tampilan.title">Tampilan &amp; Bahasa</span>
                <small class="nav-sub" data-i18n="nav.tampilan.sub">Bahasa aplikasi, tema warna, mode gelap &amp; format nominal</small>
              </div>
              <i class="ph ph-caret-right nav-chev" aria-hidden="true"></i>
            </button>

            <button type="button" class="nav-item" data-action="open-faq" data-keywords="faq panduan bantuan pertanyaan cara pakai tutorial">
              <span class="nav-ico is-income"><i class="ph ph-book-open-text" aria-hidden="true"></i></span>
              <div class="nav-item-content">
                <span class="nav-txt" data-i18n="nav.faq.title">Panduan &amp; FAQ</span>
                <small class="nav-sub" data-i18n="nav.faq.sub">Penjelasan status iuran dan bantuan penggunaan</small>
              </div>
              <i class="ph ph-caret-right nav-chev" aria-hidden="true"></i>
            </button>

            <button type="button" class="nav-item" id="btn-pwa-install" data-action="install-pwa" style="display: none;" data-keywords="install pasang pwa aplikasi hp home screen">
              <span class="nav-ico is-accent"><i class="ph ph-device-mobile" aria-hidden="true"></i></span>
              <div class="nav-item-content">
                <span class="nav-txt" data-i18n="nav.pwa.title">Instal Aplikasi Finkas</span>
                <small class="nav-sub" data-i18n="nav.pwa.sub">Tambahkan pintasan aplikasi ke layar utama perangkat</small>
              </div>
              <i class="ph ph-caret-right nav-chev" aria-hidden="true"></i>
            </button>

            <button type="button" class="nav-item nav-danger admin-session-only" data-action="logout" data-keywords="logout keluar sesi admin pengurus">
              <span class="nav-ico is-danger"><i class="ph ph-sign-out" aria-hidden="true"></i></span>
              <div class="nav-item-content">
                <span class="nav-txt" data-i18n="nav.logout.title">Keluar Sesi Pengurus</span>
                <small class="nav-sub" data-i18n="nav.logout.sub">Kembali ke mode tampilan anggota</small>
              </div>
              <i class="ph ph-caret-right nav-chev" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div class="nav-search-empty" id="nav-search-empty" hidden>
          <span class="nav-empty-ico" aria-hidden="true"><i class="ph ph-magnifying-glass"></i></span>
          <strong>Menu tidak ditemukan</strong>
          <p>Coba kata kunci lain seperti laporan, tema, atau anggota</p>
        </div>
      </div>

      <div class="hybrid-settings-footer command-hub-footer">
        <div class="command-footer-status">
          <span class="status-indicator-dot" aria-hidden="true"></span>
          <span id="command-footer-group" class="command-footer-text">Finkas Cloud</span>
        </div>
        <div class="command-footer-hints" aria-hidden="true">
          <span class="command-hint-key">↑↓</span>
          <span class="command-hint-label">Navigasi</span>
          <span class="command-hint-sep">·</span>
          <span class="command-hint-key">↵</span>
          <span class="command-hint-label">Buka</span>
          <span class="command-hint-sep">·</span>
          <span class="command-hint-key">ESC</span>
          <span class="command-hint-label">Tutup</span>
        </div>
      </div>
    </div>
  </dialog>

<style>
  :global {
    /* === HYBRID KINETIC NAVIGATION HUB (#modal-menu) === */

    #modal-menu .command-hub-modal {
      width: min(560px, calc(100vw - 28px));
      max-width: 100%;
      padding: 0;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: var(--shadow-pop);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    #modal-menu .command-search-wrap {
      padding: 12px 18px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
      flex-shrink: 0;
    }

    #modal-menu .command-search-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 4px 12px;
      border-radius: 12px;
      background: var(--surface-2);
      border: 1.5px solid var(--border);
      transition: border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
    }

    #modal-menu .command-search-bar:focus-within {
      background: var(--surface);
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-tint);
    }

    #modal-menu .command-search-icon {
      font-size: 17px;
      color: var(--text-faint);
      flex-shrink: 0;
      transition: color 180ms ease;
    }

    #modal-menu .command-search-bar:focus-within .command-search-icon {
      color: var(--accent-strong);
    }

    #modal-menu .command-search-input {
      flex: 1;
      min-width: 0;
      min-height: 42px;
      border: none;
      background: transparent;
      color: var(--text-main);
      font-size: 13.5px;
      font-weight: 600;
      font-family: inherit;
      outline: none;
    }

    #modal-menu .command-search-input::placeholder {
      color: var(--text-faint);
      font-weight: 500;
    }

    #modal-menu .command-search-input::-webkit-search-cancel-button {
      display: none;
    }

    #modal-menu .command-clear-btn {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      border: 0;
      background: var(--surface-3);
      color: var(--text-muted);
      display: grid;
      place-items: center;
      font-size: 12px;
      cursor: pointer;
      flex-shrink: 0;
      transition: background-color 150ms ease, color 150ms ease;
    }

    #modal-menu .command-clear-btn:hover {
      background: var(--border-strong);
      color: var(--text-main);
    }

    #modal-menu .command-clear-btn[hidden] {
      display: none;
    }

    #modal-menu .command-kbd-pill {
      font-family: var(--font-mono);
      font-size: 10.5px;
      font-weight: 700;
      color: var(--text-muted);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 3px 7px;
      line-height: 1.2;
      white-space: nowrap;
      flex-shrink: 0;
    }

    #modal-menu .command-hub-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 14px 18px 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      scrollbar-gutter: stable;
    }

    #modal-menu .nav-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    #modal-menu .nav-group-label {
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--text-muted);
      padding: 0 2px;
    }

    #modal-menu .nav-group-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    #modal-menu .is-search-hidden {
      display: none !important;
    }

    #modal-menu .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 58px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1.5px solid var(--border);
      background: var(--surface-2);
      color: var(--text-main);
      text-align: left;
      cursor: pointer;
      font-family: inherit;
      transition: border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease, transform 140ms ease;
    }

    #modal-menu .nav-item:hover,
    #modal-menu .nav-item.is-selected,
    #modal-menu .nav-item:focus-visible {
      background: var(--surface);
      border-color: var(--accent-border);
      box-shadow: 0 4px 14px -4px color-mix(in srgb, var(--accent) 16%, transparent);
      outline: none;
    }

    #modal-menu .nav-item:active {
      transform: scale(0.992);
    }

    #modal-menu .nav-item-featured {
      background: var(--accent-tint);
      border-color: var(--accent-border);
    }

    #modal-menu .nav-item-featured:hover,
    #modal-menu .nav-item-featured.is-selected,
    #modal-menu .nav-item-featured:focus-visible {
      background: var(--surface);
      border-color: var(--accent);
    }

    #modal-menu .nav-item.nav-danger:hover,
    #modal-menu .nav-item.nav-danger.is-selected,
    #modal-menu .nav-item.nav-danger:focus-visible {
      background: var(--danger-bg);
      border-color: var(--danger-border);
      box-shadow: none;
    }

    /* Palette-aware Hybrid Kinetic icon tiles (zero hardcoded hex, zero green) */
    #modal-menu .nav-ico {
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: var(--surface);
      border: 1px solid var(--border);
      display: grid;
      place-items: center;
      font-size: 18px;
      color: var(--text-muted);
      transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms var(--hybrid-ease-spring, ease);
    }

    #modal-menu .nav-item:hover .nav-ico,
    #modal-menu .nav-item.is-selected .nav-ico {
      transform: scale(1.03);
    }

    #modal-menu .nav-ico.is-brand {
      background: var(--accent);
      border-color: transparent;
      color: var(--accent-ink);
    }

    #modal-menu .nav-ico.is-accent {
      color: var(--accent-strong);
    }

    #modal-menu .nav-item:hover .nav-ico.is-accent,
    #modal-menu .nav-item.is-selected .nav-ico.is-accent {
      background: var(--accent-tint);
      border-color: var(--accent-border);
    }

    #modal-menu .nav-ico.is-income {
      color: var(--income-strong);
    }

    #modal-menu .nav-item:hover .nav-ico.is-income,
    #modal-menu .nav-item.is-selected .nav-ico.is-income {
      background: var(--income-bg);
      border-color: var(--income-border);
    }

    #modal-menu .nav-ico.is-secondary {
      color: var(--secondary);
    }

    #modal-menu .nav-item:hover .nav-ico.is-secondary,
    #modal-menu .nav-item.is-selected .nav-ico.is-secondary {
      background: color-mix(in srgb, var(--secondary) 13%, transparent);
      border-color: color-mix(in srgb, var(--secondary) 34%, transparent);
    }

    #modal-menu .nav-ico.is-warning {
      color: var(--warning);
    }

    #modal-menu .nav-item:hover .nav-ico.is-warning,
    #modal-menu .nav-item.is-selected .nav-ico.is-warning {
      background: var(--warning-bg);
      border-color: var(--warning-border);
    }

    #modal-menu .nav-ico.is-danger {
      color: var(--danger);
      background: var(--danger-bg);
      border-color: var(--danger-border);
    }

    #modal-menu .nav-item:hover .nav-ico.is-danger,
    #modal-menu .nav-item.is-selected .nav-ico.is-danger {
      background: var(--danger);
      border-color: transparent;
      color: var(--danger-ink);
    }

    #modal-menu .nav-item-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    #modal-menu .nav-txt {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.25;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #modal-menu .nav-item.nav-danger .nav-txt {
      color: var(--danger);
    }

    #modal-menu .nav-sub {
      font-size: 11.5px;
      font-weight: 500;
      color: var(--text-muted);
      line-height: 1.35;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #modal-menu .nav-badge-tag {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
      background: var(--accent-tint);
      color: var(--accent-strong);
      border: 1px solid var(--accent-border);
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }

    #modal-menu .nav-badge-tag.is-super {
      background: color-mix(in srgb, var(--secondary) 14%, transparent);
      color: var(--secondary);
      border-color: color-mix(in srgb, var(--secondary) 36%, transparent);
    }

    #modal-menu .nav-chev {
      flex-shrink: 0;
      font-size: 14px;
      color: var(--text-faint);
      transition: color 150ms ease, transform 180ms ease;
    }

    #modal-menu .nav-item:hover .nav-chev,
    #modal-menu .nav-item.is-selected .nav-chev {
      color: var(--accent-strong);
      transform: translateX(2px);
    }

    #modal-menu .nav-item.nav-danger:hover .nav-chev,
    #modal-menu .nav-item.nav-danger.is-selected .nav-chev {
      color: var(--danger);
    }

    #modal-menu .nav-search-empty {
      padding: 28px 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    #modal-menu .nav-search-empty[hidden] {
      display: none;
    }

    #modal-menu .nav-empty-ico {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      display: grid;
      place-items: center;
      font-size: 20px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    #modal-menu .nav-search-empty strong {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-main);
    }

    #modal-menu .nav-search-empty p {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0;
    }

    #modal-menu .command-hub-footer {
      background: var(--surface-2);
      padding: 11px 18px;
    }

    #modal-menu .command-footer-status {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    #modal-menu .status-indicator-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-tint);
      flex-shrink: 0;
    }

    #modal-menu .command-footer-text {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #modal-menu .command-footer-hints {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    #modal-menu .command-hint-key {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 2px 6px;
      border-radius: 5px;
      color: var(--text-main);
      line-height: 1.2;
    }

    #modal-menu .command-hint-sep {
      color: var(--text-faint);
    }

    @media (max-width: 768px) {
      #modal-menu.hybrid-dialog .command-hub-modal {
        width: 100%;
        max-width: 100%;
        max-height: 90dvh;
        border-radius: 20px 20px 0 0;
      }

      #modal-menu .command-hub-header {
        padding-inline: 14px;
      }

      #modal-menu .command-search-wrap {
        padding: 10px 14px;
      }

      #modal-menu .command-hub-body {
        padding: 12px 14px 16px;
      }

      #modal-menu .command-hub-footer {
        padding: 12px 16px;
      }

      #modal-menu .command-kbd-pill,
      #modal-menu .command-footer-hints {
        display: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #modal-menu .nav-item,
      #modal-menu .nav-ico,
      #modal-menu .nav-chev,
      #modal-menu .command-search-bar {
        transition: none;
      }
    }
  }
</style>
