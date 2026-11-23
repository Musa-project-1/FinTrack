<!-- 9. Modal Export Data & Cetak (Hybrid Kinetic) -->
  <dialog class="modal-overlay hybrid-dialog" id="modal-export" aria-labelledby="modal-export-title">
    <div class="modal-content modal-md modal-data-dialog export-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header export-sheet-header">
        <div class="export-header-main">
          <div class="export-header-emblem" aria-hidden="true">
            <i class="ph-fill ph-file-text"></i>
          </div>
          <div class="export-header-copy">
            <h2 id="modal-export-title">Laporan &amp; Ekspor Kas</h2>
            <p class="export-subtitle">Buku kas bulanan, rekapitulasi, cetak dokumen, dan cadangan data</p>
          </div>
        </div>
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup">
          <i class="ph ph-x" aria-hidden="true"></i>
        </button>
      </div>

      <div class="export-tabs-bar">
        <div class="export-tab-track" role="tablist" aria-label="Laporan &amp; Ekspor Kas">
          <span class="export-glider-pill" aria-hidden="true"></span>
          <button type="button" class="tab-btn active" role="tab" aria-selected="true" data-action="switch-tab" data-tab="laporan-kas" id="btn-tab-laporan-kas">
            <i class="ph ph-calendar-check" aria-hidden="true"></i> <span>Laporan Bulanan</span>
          </button>
          <button type="button" class="tab-btn" role="tab" aria-selected="false" data-action="switch-tab" data-tab="ekspor-lain" id="btn-tab-ekspor-lain">
            <i class="ph ph-export" aria-hidden="true"></i> <span>Ekspor &amp; Backup</span>
          </button>
        </div>
      </div>

      <div class="export-sheet-body">
        <!-- Tab 1: Laporan Kas Bulanan (Buku Kas) -->
        <div class="tab-content active" id="tab-laporan-kas">
          <div class="report-filter-card">
            <div class="report-filter-row">
              <div class="report-filter-field">
                <label for="cash-report-month" class="form-label report-filter-label">Periode Bulan (WIB)</label>
                <input type="month" id="cash-report-month" name="cash-report-month" class="form-control report-month-input mpick" data-placeholder="Pilih periode bulan..." aria-label="Pilih Periode Bulan">
              </div>
              <div class="report-filter-actions">
                <button type="button" class="btn btn-primary report-action-btn" id="btn-print-monthly-report" data-action="print-monthly-report">
                  <i class="ph-bold ph-printer" aria-hidden="true"></i> <span>Cetak Laporan</span>
                </button>
                <button type="button" class="btn btn-outline btn-secondary report-action-btn" id="btn-export-monthly-csv" data-action="export-monthly-csv">
                  <i class="ph-bold ph-file-csv" aria-hidden="true"></i> <span>Unduh CSV</span>
                </button>
              </div>
            </div>
            <div class="report-filter-hint">
              Dihitung berdasarkan tanggal kalender transaksi (Asia/Jakarta, UTC+7), bukan periode iuran.
            </div>
          </div>

          <div id="cash-report-alert" style="display: none;" role="alert" aria-live="polite"></div>

          <div class="report-stat-grid" aria-live="polite">
            <div class="report-stat-card">
              <div class="report-stat-title">Saldo Awal</div>
              <div id="cash-report-saldo-awal" class="font-mono report-stat-val">Rp 0</div>
            </div>
            <div class="report-stat-card">
              <div class="report-stat-title">Pemasukan (+)</div>
              <div id="cash-report-pemasukan" class="font-mono report-stat-val is-income">Rp 0</div>
            </div>
            <div class="report-stat-card">
              <div class="report-stat-title">Pengeluaran (-)</div>
              <div id="cash-report-pengeluaran" class="font-mono report-stat-val is-danger">Rp 0</div>
            </div>
            <div class="report-stat-card is-closing">
              <div class="report-stat-title">Saldo Akhir</div>
              <div id="cash-report-saldo-akhir" class="font-mono report-stat-val">Rp 0</div>
            </div>
          </div>

          <div class="report-ledger-card">
            <div class="report-ledger-header">
              <div class="report-ledger-title">
                <i class="ph ph-receipt" aria-hidden="true"></i> <span>Rincian Arus Kas</span>
              </div>
              <span class="report-ledger-badge">Urutan Kronologis (WIB)</span>
            </div>
            <div class="table-responsive report-ledger-scroll">
              <table class="report-ledger-table">
                <thead>
                  <tr>
                    <th class="col-no">No</th>
                    <th class="col-waktu">Waktu</th>
                    <th class="col-ket">Keterangan / Transaksi</th>
                    <th class="col-amt">Masuk</th>
                    <th class="col-amt">Keluar</th>
                    <th class="col-saldo">Saldo</th>
                  </tr>
                </thead>
                <tbody id="cash-report-details">
                  <tr>
                    <td colspan="6" class="td-muted-center">Memuat data laporan kas...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab 2: Ekspor Lain & Backup -->
        <div class="tab-content" id="tab-ekspor-lain">
          <div class="export-section-label">Rekap &amp; Cetak</div>
          <div class="export-actions-list">
            <button type="button" class="export-card-btn admin-only" data-action="copy-monthly-recap">
              <span class="export-icon-box is-income" aria-hidden="true"><i class="ph-bold ph-whatsapp-logo"></i></span>
              <div class="export-card-copy">
                <div class="export-btn-title">Salin Rekap Bulan Ini (WA)</div>
                <div class="export-btn-desc">Ringkasan masuk/keluar + daftar yang belum bayar siap tempel ke grup WA.</div>
              </div>
              <i class="ph ph-caret-right export-card-chev" aria-hidden="true"></i>
            </button>
            <button type="button" class="export-card-btn" data-action="print-annual">
              <span class="export-icon-box is-secondary" aria-hidden="true"><i class="ph-bold ph-printer"></i></span>
              <div class="export-card-copy">
                <div class="export-btn-title">Cetak Rekap Tahunan</div>
                <div class="export-btn-desc">Cetak matriks status iuran anggota ke format PDF (A4 Landscape).</div>
              </div>
              <i class="ph ph-caret-right export-card-chev" aria-hidden="true"></i>
            </button>
            <button type="button" class="export-card-btn" data-action="export-csv">
              <span class="export-icon-box is-accent" aria-hidden="true"><i class="ph-bold ph-file-csv"></i></span>
              <div class="export-card-copy">
                <div class="export-btn-title">Unduh CSV spreadsheet lengkap</div>
                <div class="export-btn-desc">Ekspor seluruh riwayat transaksi grup ke berkas .csv</div>
              </div>
              <i class="ph ph-caret-right export-card-chev" aria-hidden="true"></i>
            </button>
          </div>

          <div class="export-backup-card admin-only">
            <div class="export-backup-head">
              <div class="export-section-label">Cadangan &amp; Pemulihan Database</div>
              <p class="export-backup-desc">Simpan atau pulihkan seluruh data grup dalam format JSON</p>
            </div>
            <div class="export-backup-actions">
              <button type="button" class="btn btn-outline btn-secondary export-backup-btn" data-action="export-json-backup" title="Download snapshot JSON database">
                <i class="ph ph-floppy-disk" aria-hidden="true"></i> <span>Backup JSON</span>
              </button>
              <label class="btn btn-outline btn-secondary export-backup-btn export-restore-label" for="input-restore-json" title="Restore snapshot JSON database">
                <i class="ph ph-upload-simple" aria-hidden="true"></i> <span>Restore JSON</span>
                <input type="file" id="input-restore-json" name="restore-json" accept=".json" class="sr-only">
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="hybrid-settings-footer export-sheet-footer">
        <span class="export-footer-hint"><i class="ph ph-clock" aria-hidden="true"></i> Laporan dihitung otomatis berdasarkan zona waktu WIB.</span>
        <button type="button" class="btn btn-secondary" data-action="close-modal">Tutup</button>
      </div>
    </div>
  </dialog>

  <!-- 11. Modal Profil Anggota (Personal Card Style) -->
  <dialog class="modal-overlay hybrid-dialog dues-dialog" id="modal-profil-anggota" aria-labelledby="passbook-modal-title">
    <div class="modal-content hybrid-passbook">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="dlg-header hybrid-settings-header">
        <div>
          <h2 class="dlg-title" id="passbook-modal-title">Buku Iuran Digital Anggota</h2>
          <p class="dlg-subtitle" id="profil-subtitle">Riwayat setoran &amp; kartu iuran 12 bulan</p>
        </div>
        <button type="button" class="dlg-close-btn close-modal-btn" data-action="close-modal" autofocus aria-label="Tutup dialog">
          <i class="ph-bold ph-x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="dlg-body">
        <div class="profil-hero">
          <div class="profil-hero-top">
            <div class="profil-hero-left">
              <div>
                <strong class="profil-name-heading" id="p-nama-anggota">-</strong>
                <span class="profil-meta-line" id="passbook-meta">-</span>
              </div>
            </div>
            <div class="profil-total-box">
              <span class="profil-total-lbl">Total Kontribusi</span>
              <span class="profil-total-val mono tnum sensitive-amt" id="p-total-kontribusi">Rp 0</span>
            </div>
          </div>
          <div class="profil-chips-row">
            <span class="meta-chip paid tnum" id="passbook-paid-chip">0/12 Lunas</span>
            <span class="meta-chip amber tnum" id="passbook-unpaid-chip" hidden>0 Tunggakan</span>
          </div>
        </div>

        <div class="field-group">
          <div class="passbook-head-row">
            <span class="field-label" id="passbook-year">Kartu Cap Iuran 2026</span>
            <button type="button" class="btn btn-secondary btn-compact-34" id="passbook-style" data-action="open-stamp-settings">
              <i class="ph ph-seal-check" aria-hidden="true"></i>
              <span>Gaya Stempel</span>
            </button>
          </div>
          <div class="profil-passbook-grid" id="passbook-months"></div>
        </div>

        <div class="field-group">
          <span class="field-label">Riwayat Setoran Pribadi</span>
          <div class="profil-history-list" id="p-list-transaksi" aria-live="polite"></div>
        </div>
      </div>
      <div class="dlg-footer">
        <div class="passbook-member-actions non-admin-only">
          <button type="button" class="btn btn-primary" id="passbook-pay" data-action="open-self-pay">
            <i class="ph-bold ph-hand-coins" aria-hidden="true"></i>
            <span>Bayar / Lapor</span>
          </button>
          <button type="button" class="btn btn-secondary" id="passbook-pin" data-action="toggle-member-pin" aria-pressed="false">
            <i class="ph ph-push-pin" aria-hidden="true"></i>
            <span id="passbook-pin-label">Sematkan</span>
          </button>
          <button type="button" class="btn btn-secondary" id="passbook-copy" data-action="passbook-copy">
            <i class="ph ph-copy" aria-hidden="true"></i>
            <span>Salin Ringkasan</span>
          </button>
        </div>
        <button type="button" class="btn btn-secondary dlg-close-footer-desktop" data-action="close-modal">Tutup</button>
      </div>
    </div>
  </dialog>

<style>
  :global {
    /* === BUTTONS ===
       Tactile precision: hover changes surface/border tone, it never lifts the
       element. No gradients, no drop shadows, one accent, one danger. */

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      border: 1px solid transparent;
      border-radius: var(--r-md);
      cursor: pointer;
      text-align: center;
      min-height: 40px;
      transition: background var(--t-fast), border-color var(--t-fast), color var(--t-fast), transform 0.18s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .btn:active:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      transform: scale(0.97);
      transition-duration: 0.1s;
    }

    .btn:disabled,
    .btn[aria-disabled="true"],
    .btn[aria-busy="true"] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn:disabled:hover,
    .btn[aria-disabled="true"]:hover,
    .btn[aria-busy="true"]:hover,
    .btn:disabled:active,
    .btn[aria-disabled="true"]:active,
    .btn[aria-busy="true"]:active {
      transform: none !important;
    }

    /* --- Primary: the single accent, solid --- */
    .btn-primary {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--accent-ink);
    }

    .btn-primary:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--accent-strong);
      border-color: var(--accent-strong);
    }

    /* --- Secondary: raised neutral --- */
    .btn-secondary {
      background: var(--surface-2);
      border-color: var(--border);
      color: var(--text-main);
    }

    .btn-secondary:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--surface-3);
      border-color: var(--border-strong);
    }

    /* --- Outline: hairline frame --- */
    .btn-outline {
      background: transparent;
      border-color: var(--border-strong);
      color: var(--text-main);
    }

    .btn-outline:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--surface-2);
      border-color: var(--text-muted);
    }

    /* --- Destructive, inline: coral outline (e.g. inside the edit modal) --- */
    .btn-danger {
      background: transparent;
      border-color: var(--danger-border);
      color: var(--danger);
      padding: 6px 12px;
      font-size: 13px;
    }

    .btn-danger:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--danger-bg);
      border-color: var(--danger);
    }

    .btn-danger-outline {
      background: transparent;
      border-color: var(--danger-border);
      color: var(--danger);
    }

    .btn-danger-outline:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--danger-bg);
      border-color: var(--danger);
    }

    /* --- Destructive, terminal: coral solid. The ONLY filled coral in the app. --- */
    .btn-danger-solid {
      background: var(--danger);
      border-color: var(--danger);
      color: var(--danger-ink);
    }

    .btn-danger-solid:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--danger-strong);
      border-color: var(--danger-strong);
    }

    /* --- Hold to Confirm on Destructive Terminal Actions --- */
    .btn-hold-to-confirm {
      position: relative;
      overflow: hidden;
      isolation: isolate;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
    }

    .btn-hold-to-confirm .hold-fill {
      position: absolute;
      inset: 0;
      background: var(--danger-strong);
      clip-path: inset(0 100% 0 0);
      transition: clip-path 0.2s cubic-bezier(0.23, 1, 0.32, 1);
      z-index: 1;
      pointer-events: none;
    }

    .btn-hold-to-confirm.is-holding .hold-fill {
      clip-path: inset(0 0 0 0);
      transition: clip-path 1.1s linear;
    }

    .btn-hold-to-confirm .hold-label {
      position: relative;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      pointer-events: none;
      width: 100%;
    }

    @media (prefers-reduced-motion: reduce) {
      .btn-hold-to-confirm .hold-fill {
        transition: none !important;
      }
    }

    .btn-slate-solid {
      background: var(--surface-3);
      border-color: var(--border-strong);
      color: var(--text-main);
    }

    .btn-slate-solid:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--surface-2);
    }

    .btn-full-submit {
      width: 100%;
    }

    /* --- Password peek: a quiet in-field affordance --- */
    .btn-pwd-peek {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: var(--r-sm);
      color: var(--text-muted);
      cursor: pointer;
      transition: color var(--t-fast), background var(--t-fast);
    }

    .btn-pwd-peek:hover {
      color: var(--text-main);
      background: var(--surface-2);
    }

    /* === WHATSAPP REMINDER ===
       Deliberately NOT WhatsApp green — the glyph carries the meaning, and the
       neutral hairline keeps the single-accent discipline intact. */
    .btn-wa-reminder {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--surface-2);
      color: var(--text-main);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      cursor: pointer;
      font-weight: 600;
      transition: background var(--t-fast), border-color var(--t-fast), color var(--t-fast), transform 0.18s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .btn-wa-reminder i {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
    }

    .btn-wa-reminder:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--accent-tint);
      border-color: var(--accent-border);
      color: var(--accent-strong);
    }

    .btn-wa-reminder:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) i {
      color: var(--accent-strong);
    }

    .btn-wa-reminder:active:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      transform: scale(0.97);
      transition-duration: 0.1s;
    }

    /* Compact icon-only variant (card header) */
    .btn-wa-reminder-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
      width: 40px;
      height: 40px;
      flex: 0 0 40px;
      box-sizing: border-box;
      background: var(--surface-2);
      color: var(--text-muted);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      cursor: pointer;
      transition: background var(--t-fast), border-color var(--t-fast), color var(--t-fast), transform 0.18s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .btn-wa-reminder-icon:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--accent-tint);
      border-color: var(--accent-border);
      color: var(--accent-strong);
    }

    .btn-wa-reminder-icon:active:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      transform: scale(0.97);
      transition-duration: 0.1s;
    }

    .btn-wa-reminder-icon i {
      font-size: 18px;
      line-height: 1;
    }

    /* === QUIET TEXT LINKS === */
    .btn-stealth-link,
    .btn-stealth-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      padding: 6px 14px;
      border-radius: var(--r-pill);
      transition: color var(--t-fast), background var(--t-fast), border-color var(--t-fast);
      opacity: 0.85;
      text-decoration: none;
    }

    .btn-stealth-link:hover,
    .btn-stealth-pill:hover {
      opacity: 1;
      color: var(--text-main);
      background: var(--surface-2);
      border-color: var(--border);
    }

    /* === ROLE VISIBILITY === */
    body:not(.admin-session) .admin-session-only { display: none !important; }
    body:not(.admin-mode) .admin-only { display: none !important; }
    body:not(.superadmin-mode) .superadmin-only { display: none !important; }

    /* === TABLE CARD HEADER ===
       Kept here so the single-row header layout wins over the responsive
       overrides in tables.css / responsive-*.css. */
    .table-card .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .table-header-controls {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      flex-wrap: nowrap;
      flex-shrink: 0;
    }

    /* === LIQUID SAVE BUTTON (keel) ===
       Teal liquid rises during the save, tops off + draws a check on success,
       recedes on failure. Progress lives in the registered custom property --p
       (0..1) so a single JS write animates via CSS transition — no rAF loop. */
    @property --p {
      syntax: "<number>";
      inherits: true;
      initial-value: 0;
    }

    .btn-liquid {
      position: relative;
      overflow: hidden;
      isolation: isolate;
      --p: 0;
      --keel-dur: 600ms;
    }

    .btn-liquid .keel-label {
      position: relative;
      z-index: 2;
    }

    /* One box with a percentage top-radius domes across both walls like a meniscus. */
    .btn-liquid .keel-fill {
      position: absolute;
      left: -30%;
      right: -30%;
      bottom: 0;
      height: 100%;
      z-index: 1;
      background: linear-gradient(180deg, var(--accent-strong), var(--accent));
      border-radius: 44% 44% 0 0 / 20px 20px 0 0;
      transform: translateY(calc((1 - var(--p)) * 100%));
      transition: transform var(--keel-dur) cubic-bezier(0.32, 0.72, 0, 1);
      pointer-events: none;
    }

    /* Bright surface line riding the meniscus. */
    .btn-liquid .keel-fill::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      top: 4px;
      height: 6px;
      background: rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      filter: blur(1px);
    }

    /* Label + spinner glyph flip to ink-on-teal once the liquid is rising. */
    .btn-liquid.is-saving .keel-label,
    .btn-liquid.is-filled .keel-label {
      color: var(--accent-ink);
    }

    /* Drawn checkmark on success. */
    .btn-liquid .keel-check {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 22px;
      height: 22px;
      z-index: 3;
      transform: translate(-50%, -50%) scale(0.92);
      opacity: 0;
      transition: opacity 0.2s ease-out, transform 0.2s cubic-bezier(0.23, 1, 0.32, 1);
      pointer-events: none;
    }
    .btn-liquid .keel-check svg {
      width: 100%;
      height: 100%;
    }
    .btn-liquid .keel-check path {
      fill: none;
      stroke: var(--accent-ink);
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 24;
      stroke-dashoffset: 24;
    }
    .btn-liquid.is-done .keel-label {
      opacity: 0;
    }
    .btn-liquid.is-done .keel-check {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    .btn-liquid.is-done .keel-check path {
      animation: keel-draw 0.4s 0.08s ease forwards;
    }
    @keyframes keel-draw {
      to { stroke-dashoffset: 0; }
    }

    /* Reduced motion: no rise, no draw — jump straight to final states. */
    @media (prefers-reduced-motion: reduce) {
      .btn-liquid .keel-fill { transition: none; }
      .btn-liquid .keel-check,
      .btn-liquid .keel-check path { transition: none; animation: none; }
      .btn-liquid.is-done .keel-check path { stroke-dashoffset: 0; }
    }
  }
</style>
