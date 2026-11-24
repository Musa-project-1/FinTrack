<style>
  :global {
    .faq-item-title {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 13px 16px;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-main);
      cursor: pointer;
      list-style: none;
      user-select: none;
    }

    .faq-item-title::-webkit-details-marker { display: none; }
    .faq-item-title:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: 13px; }

    .faq-item-title > span {
      flex: 1;
      min-width: 0;
    }

    .faq-item-title > i:first-child {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--accent-tint);
      color: var(--accent-strong);
      display: inline-grid;
      place-items: center;
      font-size: 15px;
      flex-shrink: 0;
    }

    .faq-chevron {
      font-size: 13px;
      color: var(--text-faint);
      flex-shrink: 0;
      transition: transform 220ms var(--hybrid-ease-out), color 150ms ease;
    }

    @media (prefers-reduced-motion: reduce) {
      .faq-chevron { transition: none; }
    }

    details.faq-item[open] .faq-chevron {
      transform: rotate(180deg);
      color: var(--accent-strong);
    }

    details.faq-item[open] .faq-item-title {
      color: var(--accent-strong);
      border-bottom: 1px solid var(--border);
    }

    .faq-item-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.6;
      margin: 0;
      padding: 12px 16px 14px;
    }

    details.faq-item[open] .faq-item-desc {
      opacity: 1;
      transform: translateY(0);
    }

    /* === TOUCH TARGETS ===
       The close affordances reach 44px on touch widths (WCAG 2.5.5). */
    @media (max-width: 768px) {
      .close-modal-btn,
      .close-modal,
      .nav-close-btn {
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
        font-size: 18px;
      }

      .hybrid-dialog > .modal-content:not(:has(> .hybrid-settings, > .self-pay-sheet, > .hybrid-passbook, > .receipt-drawer)):not(.command-hub-modal):not(.quickpay-sheet):not(.auth-login-sheet):not(.groups-picker-sheet):not(.about-sheet):not(.trx-record-sheet):not(.master-sheet):not(.master-edit-sheet):not(.audit-sheet):not(.queue-sheet):not(.export-sheet):not(.group-admin-sheet):not(.group-creds-sheet):not(.modal-center-dialog) > .hybrid-sheet-handle {
        margin: -12px auto 6px;
      }

      .hybrid-alert-dialog > .modal-center-dialog {
        padding: 6px 20px 0;
        border-radius: 22px 22px 0 0;
      }
      .modal-center-dialog > .hybrid-sheet-handle {
        margin: 0 auto 10px;
      }
      .modal-center-dialog .modal-dialog-actions {
        margin: 20px -20px 0;
        padding: 14px 16px calc(14px + env(safe-area-inset-bottom, 0px));
      }
      .modal-center-dialog .modal-dialog-actions .btn {
        min-height: 44px;
        height: 44px;
      }
    }

    /* === HYBRID KINETIC UNIVERSAL MODAL HARMONIZATION === */
    .hybrid-dialog .modal-content .btn {
      border-radius: 12px;
      font-weight: 700;
    }

    .hybrid-dialog .modal-content :is(
      .master-form-card,
      .master-table-wrapper,
      .edit-member-meta-bar,
      .edit-master-card,
      .cred-card-box,
      .group-superadmin-card,
      .group-admin-create-box,
      .queue-status-bar,
      .export-card-btn,
      .stat-card,
      .chart-container-card,
      .riwayat-filter-rail,
      .riwayat-table-wrapper,
      .dues-legend
    ) {
      border-radius: 14px;
    }

    /* QuickPay styles consolidated into css/modules/trx-modal.css */

    /* === HYBRID KINETIC REPORTS & EXPORT SHEET (#modal-export) === */
    #modal-export:modal, #modal-export::backdrop { overscroll-behavior: contain; }
    #modal-export::backdrop { overflow: hidden; }

    #modal-export > .export-sheet {
      width: min(760px, calc(100vw - 28px)); max-width: 760px; max-height: min(92dvh, 740px); padding: 0;
      border-radius: 20px; border: 1px solid var(--border);
      background: var(--surface); box-shadow: var(--shadow-pop);
      display: flex; flex-direction: column; overflow: visible; gap: 0;
    }

    #modal-export .export-sheet-header {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 14px 20px 12px; border-radius: 20px 20px 0 0; border-bottom: 1px solid var(--border); flex-shrink: 0;
      background: radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 58%), var(--surface);
    }
    .export-header-main { display: flex; align-items: center; gap: 11px; min-width: 0; }
    .export-header-emblem {
      width: 38px; height: 38px; min-width: 38px; min-height: 38px; border-radius: 12px;
      background: var(--accent-tint); border: 1px solid var(--accent-border); color: var(--accent-strong);
      display: grid; place-items: center; font-size: 18px; flex-shrink: 0;
    }
    .export-header-copy { min-width: 0; }
    #modal-export .export-header-copy h2 {
      font-family: var(--font-display); font-size: 1.0625rem; font-weight: 800;
      letter-spacing: -0.02em; line-height: 1.25; color: var(--text-main); margin: 0;
    }
    #modal-export .export-subtitle { margin: 2px 0 0; font-size: 0.78125rem; font-weight: 500; color: var(--text-muted); line-height: 1.4; }
    #modal-export .export-sheet-header .close-modal-btn { min-width: 34px; min-height: 34px; width: 34px; height: 34px; border-radius: 10px; }

    .export-tabs-bar { padding: 11px 20px 0; flex-shrink: 0; }
    .export-tab-track {
      position: relative; isolation: isolate; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
      padding: 3px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-pill);
    }
    .export-glider-pill {
      position: absolute; z-index: -1; inset: 3px auto 3px 3px; width: calc((100% - 6px) / 2);
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-pill);
      box-shadow: var(--hybrid-card-shadow); translate: 0 0;
      transition: translate 280ms var(--hybrid-ease-spring); pointer-events: none;
    }
    .export-tab-track:has([data-tab="ekspor-lain"].active) .export-glider-pill { translate: 100% 0; }
    .export-tab-track .tab-btn {
      background: transparent; border: 0; box-shadow: none; min-height: 33px; padding: 5px 10px;
      font-size: 12.5px; font-weight: 700; color: var(--text-muted); border-radius: var(--r-pill);
      display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; cursor: pointer;
    }
    .export-tab-track .tab-btn.active { color: var(--text-main); background: transparent; box-shadow: none; border-color: transparent; }
    .export-tab-track .tab-btn:hover:not(.active) { color: var(--text-main); background: transparent; }
    .export-tab-track .tab-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

    #modal-export .export-sheet-body {
      padding: 12px 20px 14px; display: flex; flex-direction: column; gap: 10px;
      flex: 1 1 auto; min-height: 0; overflow: visible;
    }
    #modal-export .tab-content:not(.active) { display: none; }
    #modal-export .tab-content.active { display: flex; flex-direction: column; gap: 10px; }

    .report-filter-card {
      padding: 11px 13px; background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 14px; position: relative; overflow: visible; flex-shrink: 0;
    }
    .report-filter-card:has(.mpick.open) { z-index: 80; }
    .report-filter-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
    .report-filter-field { flex: 1 1 200px; min-width: 0; }
    .report-filter-label {
      display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
      color: var(--text-muted); margin-bottom: 5px; font-weight: 800;
    }
    #modal-export .mpick-field { min-height: 38px; height: 38px; padding: 6px 12px; font-size: 13px; border-radius: 10px; }
    .report-filter-actions { display: flex; gap: 8px; flex-shrink: 0; }
    #modal-export .report-action-btn {
      min-height: 38px; height: 38px; padding: 0 14px; font-size: 12.5px; font-weight: 700;
      border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    }
    #modal-export .report-action-btn.disabled { opacity: 0.55; }
    .report-filter-hint { margin-top: 7px; font-size: 11px; color: var(--text-faint); line-height: 1.35; }

    .report-invalid-alert {
      padding: 10px 13px; border-radius: 12px;
      background: var(--danger-bg); border: 1px solid var(--danger-border); color: var(--danger);
    }
    .report-invalid-head { font-weight: 700; font-size: 12.5px; display: flex; align-items: center; gap: 6px; }
    .report-invalid-sub { margin-top: 3px; font-size: 11.5px; color: var(--text-main); }
    .report-invalid-list { margin: 5px 0 0 18px; padding: 0; font-size: 11px; color: var(--text-muted); }

    .report-stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; flex-shrink: 0; }
    .report-stat-card {
      padding: 9px 11px; border-radius: 12px; background: var(--surface-2);
      border: 1px solid var(--border); min-width: 0;
    }
    .report-stat-card.is-closing { background: var(--accent-tint); border-color: var(--accent-border); }
    .report-stat-title { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 3px; }
    .report-stat-val { font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--text-main); overflow-wrap: anywhere; }
    .report-stat-val.is-income { color: var(--income-strong); }
    .report-stat-val.is-danger { color: var(--danger); }
    .report-stat-card.is-closing .report-stat-val { color: var(--accent-strong); }

    .report-ledger-card {
      border: 1px solid var(--border); border-radius: 14px; background: var(--surface);
      overflow: hidden; display: flex; flex-direction: column; min-height: 0;
    }
    .report-ledger-header {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 9px 13px; border-bottom: 1px solid var(--border); background: var(--surface);
    }
    .report-ledger-title { font-size: 13px; font-weight: 700; color: var(--text-main); display: inline-flex; align-items: center; gap: 6px; }
    .report-ledger-badge { font-family: var(--font-mono); font-size: 11px; color: var(--text-faint); font-variant-numeric: tabular-nums; }
    #modal-export .report-ledger-scroll {
      max-height: 225px; overflow-y: auto; overflow-x: hidden; scrollbar-gutter: stable; overscroll-behavior: contain;
    }
    .report-ledger-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; }
    .report-ledger-table thead th {
      background: var(--table-header-bg); border-bottom: 1px solid var(--border); padding: 8px 9px;
      font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
      text-transform: uppercase; color: var(--text-faint); position: sticky; top: 0; z-index: 2; text-align: left;
    }
    .report-ledger-table .col-no { width: 34px; text-align: center; }
    .report-ledger-table .col-waktu { width: 106px; }
    .report-ledger-table .col-amt { width: 96px; text-align: right; }
    .report-ledger-table .col-saldo { width: 102px; text-align: right; }
    .report-ledger-table tbody td { padding: 8px 9px; border-bottom: 1px solid var(--border); vertical-align: middle; text-align: left; color: var(--text-main); }
    .report-ledger-table tbody tr:last-child td { border-bottom: none; }
    .report-ledger-table tbody tr:hover td { background: var(--surface-2); }
    .report-ledger-table tbody td.report-row-num { text-align: center; color: var(--text-faint); font-family: var(--font-mono); font-size: 11px; font-variant-numeric: tabular-nums; }
    .report-ledger-table tbody td.report-row-amt,
    .report-ledger-table tbody td.report-row-saldo { text-align: right; font-family: var(--font-mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .report-ledger-table tbody td.report-row-amt.is-income { color: var(--income-strong); font-weight: 700; }
    .report-ledger-table tbody td.report-row-amt.is-danger { color: var(--danger); font-weight: 700; }
    .report-ledger-table tbody td.report-row-amt.is-muted { color: var(--text-faint); }
    .report-ledger-table tbody td.report-row-saldo { font-weight: 700; }
    .report-ledger-table tbody td.td-muted-center { text-align: center; padding: 20px 10px; color: var(--text-muted); }
    .report-row-date { font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .report-row-clock,
    .report-row-meta { font-size: 11px; color: var(--text-faint); }
    .report-row-clock { font-variant-numeric: tabular-nums; }

    /* Tab 2: Ekspor & Backup */
    .export-section-label { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-muted); }
    .export-actions-list { display: flex; flex-direction: column; gap: 8px; }
    .export-card-btn {
      width: 100%; display: flex; align-items: center; gap: 12px; text-align: left; cursor: pointer;
      padding: 12px 14px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border);
      transition: border-color 0.16s ease, background 0.16s ease;
    }
    .export-card-btn:hover { background: var(--surface-2); border-color: var(--accent-border); }
    .export-card-btn:focus-visible,
    #modal-export .export-restore-label:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
    .export-icon-box {
      width: 40px; height: 40px; min-width: 40px; border-radius: 11px;
      display: grid; place-items: center; font-size: 20px; border: 1px solid var(--border);
    }
    .export-icon-box.is-income { background: var(--income-bg); border-color: var(--income-border); color: var(--income-strong); }
    .export-icon-box.is-secondary { background: var(--surface-2); border-color: var(--border-strong); color: var(--secondary); }
    .export-icon-box.is-accent { background: var(--accent-tint); border-color: var(--accent-border); color: var(--accent-strong); }
    .export-card-copy { flex: 1 1 auto; min-width: 0; }
    .export-btn-title { font-size: 13.5px; font-weight: 700; color: var(--text-main); margin-bottom: 2px; }
    .export-btn-desc { font-size: 12px; color: var(--text-muted); line-height: 1.35; }
    .export-card-chev { font-size: 16px; color: var(--text-faint); flex-shrink: 0; }

    .export-backup-card {
      margin-top: 2px; padding: 12px 14px; border-radius: 14px;
      background: var(--surface-2); border: 1px dashed var(--border-strong);
      display: flex; flex-direction: column; gap: 10px;
    }
    .export-backup-desc { margin: 2px 0 0; font-size: 11.5px; color: var(--text-muted); }
    .export-backup-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    #modal-export .export-backup-btn {
      min-height: 38px; height: 38px; padding: 0 12px; font-size: 12.5px; font-weight: 700;
      border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      cursor: pointer; background: var(--surface);
    }

    #modal-export .export-sheet-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 11px 20px; border-radius: 0 0 20px 20px; margin: 0; flex-shrink: 0;
    }
    .export-footer-hint { font-size: 11.5px; font-weight: 500; color: var(--text-muted); display: inline-flex; align-items: center; gap: 5px; }
    #modal-export .export-sheet-footer .btn { min-width: 0; min-height: 36px; height: 36px; padding: 0 16px; font-size: 13px; font-weight: 700; border-radius: 11px; }

    @media (max-height: 750px) and (min-width: 769px) {
      #modal-export > .export-sheet { max-height: calc(100dvh - 24px); }
      #modal-export .export-sheet-body { gap: 8px; padding: 10px 20px 12px; }
      #modal-export .report-ledger-scroll { max-height: 155px; }
    }

    @media (max-width: 768px) {
      #modal-export > .export-sheet {
        width: 100%; max-width: 100%; max-height: 92dvh; border-radius: 20px 20px 0 0; overflow: hidden;
      }
      #modal-export .hybrid-sheet-handle { flex-shrink: 0; }
      #modal-export .export-sheet-header { padding: 4px 14px 10px; border-radius: 0; gap: 8px; }
      #modal-export .export-header-emblem { width: 34px; height: 34px; min-width: 34px; min-height: 34px; font-size: 16px; }
      #modal-export .export-header-copy h2 { font-size: 15px; }
      #modal-export .export-subtitle { font-size: 11px; line-height: 1.3; }
      #modal-export .export-sheet-header .close-modal-btn { width: 44px; min-width: 44px; height: 44px; min-height: 44px; }
      .export-tabs-bar { padding: 8px 14px 0; }
      #modal-export .export-sheet-body { padding: 10px 14px 12px; overflow-y: auto; overscroll-behavior: contain; }
      .report-filter-row { flex-direction: column; align-items: stretch; gap: 8px; }
      .report-filter-field { flex: 0 0 auto; }
      .report-filter-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      #modal-export .mpick-field,
      #modal-export .report-action-btn,
      #modal-export .export-backup-btn { min-height: 44px; height: 44px; }
      .report-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      #modal-export .report-ledger-scroll { max-height: none; overflow: visible; padding: 8px; background: var(--surface-2); }
      #modal-export .report-ledger-table { min-width: 0; width: 100%; display: block; }
      #modal-export .report-ledger-table thead,
      #modal-export .report-ledger-table tbody td.report-row-num,
      #modal-export .report-ledger-table tbody tr[data-type="in"] td.report-row-out,
      #modal-export .report-ledger-table tbody tr[data-type="out"] td.report-row-in { display: none; }
      #modal-export .report-ledger-table tbody { display: flex; flex-direction: column; gap: 8px; width: 100%; }
      #modal-export .report-ledger-table tbody tr {
        display: grid; grid-template-columns: minmax(0, 1fr) auto; row-gap: 4px; column-gap: 10px;
        width: 100%; box-sizing: border-box; background: var(--surface); border: 1px solid var(--border);
        border-radius: 12px; padding: 10px 12px;
      }
      #modal-export .report-ledger-table tbody td { padding: 0; border: 0; }
      #modal-export .report-ledger-table tbody td.report-row-time { grid-column: 1; grid-row: 1; display: flex; align-items: baseline; gap: 6px; }
      #modal-export .report-ledger-table tbody td.report-row-amt { grid-column: 2; grid-row: 1; justify-self: end; font-size: 12.5px; }
      #modal-export .report-ledger-table tbody td.report-row-desc { grid-column: 1; grid-row: 2; min-width: 0; font-size: 12.5px; }
      #modal-export .report-ledger-table tbody td.report-row-saldo { grid-column: 2; grid-row: 2; justify-self: end; align-self: end; font-size: 11px; color: var(--text-muted); }
      #modal-export .report-ledger-table tbody td.td-muted-center { grid-column: 1 / -1; text-align: center; padding: 14px 8px; }
      #modal-export .export-footer-hint { display: none; }
      #modal-export .export-sheet-footer { padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); border-radius: 0; }
      #modal-export .export-sheet-footer .btn { width: 100%; min-height: 44px; height: 44px; justify-content: center; }
    }

    @media (prefers-reduced-motion: reduce) {
      .export-glider-pill, .export-card-btn { transition: none; }
    }
  }
</style>
