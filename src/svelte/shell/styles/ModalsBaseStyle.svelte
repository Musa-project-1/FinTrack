<style>
  :global {
    /* One native password control; four decorative cells preserve the PIN layout. */
    .pin-control { position: relative; width: max-content; max-width: 100%; margin-inline: auto; }
    .pin-control > span { display: grid; place-items: center; pointer-events: none; }
    .pin-control > .pin-input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      min-width: 0;
      z-index: 1;
      border: 0;
      background: transparent;
      color: transparent;
      caret-color: transparent;
      font-size: 24px;
      border-radius: 8px;
    }
    .pin-control:focus-within { outline: 2px solid var(--accent, var(--lp-pure)); outline-offset: 3px; }
    .pin-control > .pin-input:focus { outline: none; }
    .pin-control:has([aria-invalid="true"]) > span { border-color: var(--danger, var(--lp-danger)); }

    /* === MODAL COMPONENTS === */

    /* 1. Sizes (Aligned 1:1 with Prototype 540px standard / 680px wide) */
    .modal-sm { width: min(500px, calc(100vw - 28px)); max-width: 100%; }
    .modal-md,
    .modal-lg,
    .modal-xl { width: min(680px, calc(100vw - 28px)); max-width: 100%; }
    .modal-center-dialog { width: min(408px, calc(100vw - 28px)); max-width: 100%; }

    /* 2. Unified Edge-to-Edge Hybrid Header (Matches #modal-tampilan & Prototype .dlg-header) */
    .modal-header-standard,
    .queue-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: calc(-1 * var(--modal-pad)) calc(-1 * var(--modal-pad)) 16px;
      padding: 16px 20px 14px;
      border-bottom: 1px solid var(--border);
      gap: 12px;
      position: sticky;
      top: calc(-1 * var(--modal-pad));
      z-index: 3;
      background: var(--surface);
    }

    .modal-header-left { display: flex; align-items: center; gap: 10px; min-width: 0; }

    .modal-header-standard .modal-badge-icon,
    .queue-head .modal-badge-icon {
      display: none;
    }

    .modal-badge-icon {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: var(--accent-tint);
      color: var(--accent-strong);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 19px;
      border: 1px solid var(--accent-border);
      flex-shrink: 0;
    }

    .modal-badge-icon.danger {
      background: var(--danger-bg);
      color: var(--danger);
      border-color: var(--danger-border);
    }

    .modal-badge-icon.warning {
      background: var(--warning-bg);
      color: var(--warning);
      border-color: var(--warning-border);
    }

    .modal-badge-icon.slate {
      background: var(--surface-2);
      color: var(--text-main);
      border-color: var(--border-strong);
    }

    .modal-title-wrap h2,
    .modal-title-wrap h3 {
      font-family: var(--font-display);
      font-size: 1.0625rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text-main);
      line-height: 1.25;
      margin: 0;
    }

    .modal-title-wrap p {
      font-size: .78125rem;
      font-weight: 500;
      color: var(--text-muted);
      margin-top: 2px;
      margin-bottom: 0;
      line-height: 1.45;
    }

    /* 3. Centered Hybrid Kinetic alert & confirmation dialogs */
    .modal-center-dialog {
      --alert-wash: var(--accent-tint);
      --alert-halo: color-mix(in oklab, var(--accent-tint) 65%, transparent);
      text-align: center;
      padding: 26px 24px 0;
      overflow-x: hidden;
      overflow-y: auto;
      background:
        radial-gradient(120% 90% at 50% 0%, var(--alert-wash) 0%, transparent 62%),
        var(--surface);
    }
    .modal-center-dialog:has(.modal-badge-icon.danger) {
      --alert-wash: var(--danger-bg);
      --alert-halo: color-mix(in oklab, var(--danger-bg) 65%, transparent);
    }
    .modal-center-dialog:has(.modal-badge-icon.warning) {
      --alert-wash: var(--warning-bg);
      --alert-halo: color-mix(in oklab, var(--warning-bg) 65%, transparent);
    }
    .modal-center-dialog:has(.modal-badge-icon.slate) {
      --alert-wash: var(--surface-3);
      --alert-halo: var(--surface-2);
    }
    .modal-center-dialog .modal-badge-icon {
      width: 52px;
      height: 52px;
      font-size: 23px;
      border-radius: 16px;
      margin: 0 auto 15px;
      box-shadow: 0 0 0 5px var(--alert-halo);
    }
    .modal-center-dialog h2 {
      font-family: var(--font-display);
      font-size: 18.5px;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: var(--text-main);
      line-height: 1.25;
      margin: 0 0 7px;
    }
    .modal-center-dialog p {
      font-size: 13.25px;
      color: var(--text-muted);
      line-height: 1.58;
      margin: 0 auto;
      max-width: 34ch;
    }
    .modal-center-dialog .modal-dialog-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin: 22px -24px 0;
      padding: 14px 20px;
      background: var(--surface-2);
      border-top: 1px solid var(--border);
    }
    .modal-center-dialog .modal-dialog-actions .btn {
      min-width: 0;
      min-height: 42px;
      font-size: 13.5px;
      font-weight: 700;
      border-radius: 12px;
      justify-content: center;
    }
    .modal-center-dialog .modal-dialog-actions .btn-secondary {
      background: var(--surface);
      border-color: var(--border-strong);
      color: var(--text-main);
    }
    .modal-center-dialog .modal-dialog-actions .btn-secondary:hover:not(:disabled) {
      background: var(--surface-3);
    }
    .modal-center-dialog .modal-dialog-actions .btn-slate-solid {
      background: var(--text-main);
      border-color: var(--text-main);
      color: var(--surface);
    }
    .modal-center-dialog .modal-dialog-actions .btn-slate-solid:hover:not(:disabled) {
      opacity: 0.9;
    }

    .modal-footer-actions {
      position: sticky;
      bottom: calc(-1 * var(--modal-pad));
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      margin: 18px calc(-1 * var(--modal-pad)) calc(-1 * var(--modal-pad));
      padding: 14px 20px;
      background: var(--surface);
      border-top: 1px solid var(--border);
    }

    .modal-footer-actions:not(:has(.modal-footer-hint, .edit-footer-secondary, #btn-modal-hapus-anggota, #btn-modal-hapus-kategori)) {
      justify-content: flex-end;
    }

    .modal-footer-hint {
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 500;
      margin-inline-end: auto;
    }

    .modal-footer-actions .btn {
      min-width: 0;
      flex: 0 0 auto;
      max-width: none;
      min-height: 40px;
      padding: 0 16px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 12px;
    }

    .modal-data-dialog { display: flex; flex-direction: column; }
    .modal-data-dialog > .tab-content { flex: 1 1 auto; }
    .modal-data-dialog form { min-height: 0; }

    .stack-form-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .split-body { min-width: 0; }
    .split-edit-body { display: flex; flex-direction: column; gap: 14px; }
    .edit-form-fields { min-width: 0; }
    .edit-impact-panel {
      padding: 13px 16px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface-2);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .edit-impact-icon,
    .edit-impact-panel h3,
    .edit-delta-divider,
    .edit-impact-note {
      display: none;
    }
    .edit-delta-rows {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .edit-delta-row {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 2px;
      padding: 0;
      border: 0;
      background: transparent;
      font-size: 12px;
    }
    .edit-delta-row.is-total {
      background: transparent;
      border: 0;
    }
    .edit-delta-label { font-size: 11px; color: var(--text-muted); font-weight: 700; }
    .edit-delta-val { font-family: var(--font-mono); font-weight: 700; font-size: 13.5px; color: var(--text-main); font-variant-numeric: tabular-nums; }
    .edit-delta-val.is-masuk { color: var(--income-strong); }
    .edit-delta-val.is-keluar { color: var(--danger); }

    /* 4. Close button (Hybrid Kinetic 34x34 borderless pill tile) */
    .close-modal-btn {
      background: var(--surface-2);
      border: 1px solid transparent;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      cursor: pointer;
      color: var(--text-muted);
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
      flex-shrink: 0;
    }
    .close-modal-btn:hover { background: var(--surface-3); color: var(--text-main); }

    /* 5. Password peek */
    .btn-pwd-peek {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-faint);
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .input-admin-code {
      text-align: center;
      font-family: var(--font-mono);
      font-size: 15px;
      letter-spacing: 0.14em;
      padding: 12px 42px 12px 14px;
      border-radius: var(--r-md);
    }

    /* 6. Skipped month */
    .td-skipped { background: transparent !important; color: var(--text-faint) !important; cursor: default; pointer-events: none; }
    .td-skipped .skipped-month-label { display: inline-block; width: 100%; text-align: center; font-size: 12px; font-weight: 500; color: var(--text-faint); }
    .th-skipped { background: var(--surface-2) !important; color: var(--text-faint) !important; }

    /* 7. Desktop growth-safe centering */
    @media (min-width: 769px) {
      .modal-overlay { overflow-y: auto; }
      .modal-content { margin: auto; }
    }

    @media (max-width: 859px) {
      .modal-content { width: calc(100vw - 16px); max-width: 100%; }
      .split-body { display: block; }
    }

    @media (max-width: 768px) {
      .modal-header-standard,
      .queue-head {
        margin: 0 calc(-1 * var(--modal-pad)) 14px;
        padding: 4px 16px 12px;
      }
      .edit-delta-rows {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .modal-footer-hint {
        display: none;
      }
    }

    @media (max-width: 599px) {
      .modal-content { width: calc(100vw - 16px); max-width: 100%; }
    }

    /* Confirmation dialog priority */
    #modal-logout, #modal-hapus, #modal-confirm-action { z-index: 1000010 !important; }

    /* Audit Log styles consolidated into css/modules/view-master.css */

    /* === FAQ LIST COMPONENT === */
    .faq-list.active {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 60vh;
      overflow-y: auto;
      padding-right: 2px;
      scrollbar-gutter: stable;
    }

    /* === FAQ ACCORDION === */
    details.faq-item {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface-2);
      transition: border-color var(--t-fast), background-color var(--t-fast), box-shadow var(--t-fast);
      overflow: hidden;
    }

    details.faq-item[open] {
      background: var(--surface);
      border-color: var(--accent-border);
      box-shadow: var(--hybrid-card-shadow);
    }

    details.faq-item:hover {
      border-color: var(--border-strong);
      background: var(--surface);
    }

    details.faq-item[open]:hover {
      border-color: var(--accent-border);
    }
  }
</style>
