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

  <!-- 8. Quick Pay Hybrid Kinetic Sheet -->
  <dialog class="modal-overlay hybrid-dialog dues-dialog" id="modal-quickpay" aria-labelledby="modal-quickpay-title">
    <div class="modal-content quickpay-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header qp-sheet-header">
        <div class="qp-header-main">
          <div class="qp-header-emblem" aria-hidden="true">
            <i class="ph-fill ph-hand-coins"></i>
          </div>
          <div class="qp-header-copy">
            <h2 id="modal-quickpay-title">Bayar Iuran Kilat</h2>
            <p id="qp-periode"></p>
          </div>
        </div>
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup dialog"><i class="ph-bold ph-x" aria-hidden="true"></i></button>
      </div>
      <form id="form-quickpay" class="qp-form">
        <input type="hidden" id="qp-id-anggota">
        <input type="hidden" id="qp-bulan">
        <input type="hidden" id="qp-tahun">
        <div class="qp-sheet-body">
          <div class="qp-member-card">
            <span class="qp-avatar" id="qp-avatar" aria-hidden="true">?</span>
            <div class="qp-member-info">
              <strong id="qp-nama" class="qp-member-name">-</strong>
              <span id="qp-dues-meta" class="qp-member-meta">-</span>
            </div>
            <span class="qp-status-pill" id="qp-status-badge">BELUM BAYAR</span>
          </div>

          <div class="form-group">
            <div class="qp-label-row">
              <label for="qp-nominal">Nominal Pembayaran</label>
              <div class="qp-preset-chips" id="qp-presets" role="group" aria-label="Nominal cepat"></div>
            </div>
            <div class="input-with-prefix">
              <span>Rp</span>
              <input type="text" id="qp-nominal" name="qp-nominal" class="form-control input-qp-nominal font-mono tabular-nums" inputmode="numeric" enterkeyhint="done" required>
            </div>
          </div>

          <div class="form-row qp-row-meta">
            <div class="form-group">
              <label for="qp-tanggal">Tanggal Bayar (Opsional)</label>
              <input type="date" id="qp-tanggal" name="qp-tanggal" class="form-control dpick" data-placeholder="Pilih tanggal..." aria-label="Tanggal Bayar Kilat">
            </div>
            <div class="form-group">
              <label for="qp-keterangan">Catatan (Opsional)</label>
              <input type="text" id="qp-keterangan" name="qp-keterangan" class="form-control" placeholder="Contoh: Transfer / Tunai" enterkeyhint="done" autocomplete="off">
            </div>
          </div>

          <div class="qp-impact-callout is-inflow" id="qp-impact-callout" aria-live="polite" aria-atomic="true">
            <div class="qp-impact-meta">
              <strong id="qp-impact-status">Akan Lunas</strong>
              <span id="qp-impact-sub">-</span>
            </div>
            <div class="qp-impact-val">
              <span>Kas masuk</span>
              <strong id="qp-impact-amount">Rp 0</strong>
            </div>
          </div>
        </div>

        <div class="hybrid-settings-footer qp-sheet-footer">
          <button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button>
          <button type="submit" class="btn btn-primary btn-liquid" id="btn-submit-quickpay">
            <span class="keel-fill" aria-hidden="true"></span>
            <span class="keel-label">Simpan Pembayaran</span>
            <span class="keel-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"></path></svg></span>
          </button>
        </div>
      </form>
    </div>
  </dialog>

<style>
  :global {
    /* === LAYOUT — header, bottom navigation, sheets ===
       Global chrome only: hairline surfaces, flat elevation, one accent for the
       active state. Nothing here casts a shadow except genuinely floating sheets. */

    /* === HEADER === */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      flex-wrap: nowrap;
      gap: var(--sp-3);
      position: sticky;
      top: 12px;
      background: rgba(255, 255, 255, 0.80);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--shadow-card);
      padding: 12px 18px;
      z-index: 100;
    }

    body.dark-mode .header {
      background: rgba(14, 23, 42, 0.78);
    }

    .header h1 {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 600;
      letter-spacing: var(--tracking-tight);
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      min-width: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      min-width: 0;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
    }

    .header-actions {
      display: flex;
      gap: var(--sp-2);
      align-items: center;
    }

    #header-actions {
      transition: opacity var(--t-fast);
    }

    /* Deprecated: header-mobile-top removed from template (kept hidden for stale SW cache) */
    .header-mobile-top {
      display: none !important;
    }

    .mobile-menu-btn {
      display: none;
    }

    .brand-icon-box i {
      font-size: 20px;
      color: var(--accent);
    }

    /* === HEADER DROPDOWN === */
    .header-dropdown {
      position: relative;
      display: inline-block;
    }

    .header-dropdown.open .dropdown-menu {
      display: block !important;
      transform-origin: top right;
      animation: dropdownFadeIn 0.15s cubic-bezier(0.23, 1, 0.32, 1);
    }

    @keyframes dropdownFadeIn {
      from { opacity: 0; transform: translateY(-4px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .header-dropdown .dropdown-menu {
      position: absolute;
      right: 0;
      top: calc(100% + 8px);
      min-width: 240px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      box-shadow: var(--shadow-pop);
      padding: var(--sp-2);
      z-index: 9999;
      display: none;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px 10px;
      border-radius: var(--r-sm);
      background: transparent;
      border: none;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      font-family: inherit;
      color: var(--text-main);
      cursor: pointer;
      transition: background var(--t-fast), color var(--t-fast);
    }

    .dropdown-item i {
      font-size: 18px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .dropdown-item i.icon-danger { color: var(--danger); }
    .dropdown-item i.icon-warning { color: var(--warning); }
    .dropdown-item i.icon-muted { color: var(--text-muted); }

    .dropdown-item:hover {
      background: var(--surface-2);
      color: var(--text-main);
    }

    /* === ICON BUTTONS (theme / layout / menu) ===
       Hover moves surface tone only — no lift, no shadow. */
    .btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 var(--sp-3);
      min-width: 40px;
      height: 40px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      color: var(--text-main);
      font-size: 18px;
      cursor: pointer;
      transition: background var(--t-fast), border-color var(--t-fast), color var(--t-fast), transform 0.18s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .btn-icon:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--surface-3);
      border-color: var(--border-strong);
      color: var(--text-main);
    }

    .btn-icon:active:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      transform: scale(0.97);
      transition-duration: 0.1s;
    }

    /* Icon buttons use the neutral surface; colour only on hover/active.
       Previous per-button hue overrides removed to quiet the header row. */
    [data-action="toggle-theme"],
    #btn-theme-toggle {
      color: var(--text-main);
      background: var(--surface-2);
      border: 1px solid var(--border);
    }
    body.dark-mode [data-action="toggle-theme"],
    body.dark-mode #btn-theme-toggle {
      color: #fbbf24 !important;
      background: var(--surface-2) !important;
      border: 1px solid var(--border) !important;
    }
    [data-action="toggle-theme"]:hover,
    #btn-theme-toggle:hover {
      background: rgba(251, 191, 36, 0.18) !important;
      border-color: rgba(251, 191, 36, 0.50) !important;
      color: #fbbf24 !important;
    }

    #btn-toggle-stats-header {
      color: var(--text-main) !important;
      background: var(--surface-2) !important;
      border: 1px solid var(--border) !important;
    }
    #btn-toggle-stats-header:hover {
      background: var(--accent-tint) !important;
      border-color: var(--accent-border) !important;
      color: var(--accent) !important;
    }

    #btn-header-menu {
      color: var(--text-main) !important;
      background: var(--surface-2) !important;
      border: 1px solid var(--border) !important;
    }
    #btn-header-menu:hover {
      background: var(--accent-tint) !important;
      border-color: var(--accent-border) !important;
      color: var(--accent) !important;
    }

    .btn-icon.is-active {
      color: var(--accent-strong);
      border-color: var(--accent-border);
      background: var(--accent-tint);
    }

    /* === BOTTOM NAVIGATION (mobile only) === */
    .bottom-nav {
      display: none;
    }

    /* === QUICK PAY / MENU SHEETS === */
    .quickpay-sheet {
      max-width: 420px;
      padding: var(--sp-4) var(--sp-4) var(--sp-6);
    }

    .quickpay-handle {
      display: none;
      width: 44px;
      height: 4px;
      border-radius: var(--r-pill);
      background: var(--border-strong);
      margin: 0 auto var(--sp-4);
    }

    .qp-member {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      padding: var(--sp-3);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      background: var(--surface-2);
      margin-bottom: var(--sp-4);
    }

    .menu-sheet {
      max-width: 380px;
      width: 92%;
      border-radius: var(--r-lg);
      padding: var(--sp-4);
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-pop);
    }

    .menu-sheet-list {
      display: grid;
      gap: 2px;
      margin-top: var(--sp-2);
    }

    .menu-sheet-list .dropdown-item {
      padding: var(--sp-3);
      font-size: 14px;
      border-radius: var(--r-md);
      background: transparent;
      border: 1px solid transparent;
      transition: background var(--t-fast), border-color var(--t-fast), color var(--t-fast);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .menu-sheet-list .dropdown-item:hover {
      background: var(--surface-2);
      border-color: var(--border);
      color: var(--text-main);
    }

    .menu-sheet-list .dropdown-item.is-active {
      background: var(--accent-tint);
      border-color: var(--accent-border);
      color: var(--accent-strong);
    }

    /* === DESKTOP: modals centre on both axes === */
    .modal-overlay.modal-top {
      align-items: center;
      justify-content: center;
    }

    .modal-overlay.modal-top .modal-content {
      max-height: 90vh;
    }

    /* === MOBILE === */
    @media (max-width: 768px) {
      .modal-overlay:has(.quickpay-sheet),
      .modal-overlay:has(.menu-sheet) {
        align-items: flex-end;
        padding: 0;
      }

      .quickpay-sheet,
      .menu-sheet,
      .modal-overlay .modal-content.quickpay-sheet,
      .modal-overlay .modal-content.menu-sheet {
        max-width: 100%;
        border-radius: var(--r-lg) var(--r-lg) 0 0;
        border-bottom: none;
        box-shadow: var(--shadow-pop);
        transform: translateY(100%);
        opacity: 1;
        transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
        padding-bottom: calc(var(--sp-6) + env(safe-area-inset-bottom, 0px));
      }

      .modal-overlay.active .quickpay-sheet,
      .modal-overlay.active .menu-sheet,
      .modal-overlay.active .modal-content.quickpay-sheet,
      .modal-overlay.active .modal-content.menu-sheet {
        transform: translateY(0) !important;
        opacity: 1 !important;
      }

      .quickpay-handle {
        display: block;
        width: 44px;
        height: 5px;
        border-radius: var(--r-pill);
        background: var(--border-strong);
        margin: 0 auto var(--sp-4);
        touch-action: pan-y;
        cursor: grab;
      }

      .quickpay-handle:active {
        cursor: grabbing;
      }

      .menu-sheet-list .dropdown-item {
        padding: var(--sp-3);
        font-size: 15px;
      }

      /* Hamburger is replaced by the bottom nav on mobile */
      .mobile-menu-btn {
        display: none !important;
      }

      /* Duplicate of the bottom-nav [+ Catat] CTA */
      .btn-catat-mobile {
        display: none !important;
      }

      body {
        padding-bottom: 76px;
      }

      .modal-overlay.modal-top {
        align-items: flex-start;
        padding-top: max(10px, env(safe-area-inset-top, 0px));
      }

      .modal-overlay.modal-top .modal-content {
        max-height: 88vh;
      }

      /* Charts stack vertically — an inline minmax(400px) overflows phones */
      :is(#modal-statistik, #workspace-stats) .chart-section {
        grid-template-columns: 1fr !important;
      }

      /* Stat cards: two per row, health card full width */
      :is(#modal-statistik, #workspace-stats) .stats-overview {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      :is(#modal-statistik, #workspace-stats) .stat-card {
        padding: var(--sp-3);
      }

      /* Large rupiah values must fit the narrow cards */
      :is(#modal-statistik, #workspace-stats) .stat-card-value {
        font-size: 20px;
        overflow-wrap: anywhere;
      }

      :is(#modal-statistik, #workspace-stats) .stat-card-title {
        font-size: 12px;
      }

      :is(#modal-statistik, #workspace-stats) .stat-card.health-card,
      :is(#modal-statistik, #workspace-stats) .stat-card:last-child {
        grid-column: 1 / -1;
      }
    }

    .quickpay-sheet .modal-header-standard { touch-action: pan-y; }
  }
</style>
