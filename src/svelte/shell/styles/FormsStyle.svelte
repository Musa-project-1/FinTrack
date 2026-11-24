<style>
  :global {
    /* === MODAL & FORMS — "The Ledger" === */

    /* === PIN 4 kotak (multi-grup) === */
    .pin-row {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin: 16px 0 8px;
    }
    .pin-box {
      width: 56px;
      height: 62px;
      text-align: center;
      font-family: var(--font-mono);
      font-size: 24px;
      font-weight: 700;
      border: 1.5px solid var(--border-strong);
      border-radius: 14px;
      background: var(--surface-2);
      color: var(--text-main);
      outline: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: border-color var(--t-fast), background var(--t-fast), box-shadow var(--t-fast);
    }
    .pin-box:focus,
    .pin-control:focus-within .pin-box {
      border-color: var(--accent);
      background: var(--surface);
      box-shadow: 0 0 0 3px var(--accent-tint);
      outline: none;
    }
    .pin-row.is-error {
      animation: pinShake 0.22s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .pin-row.is-error .pin-box {
      border-color: var(--danger);
    }
    .pin-row.is-unlocked .pin-box {
      border-color: var(--accent);
      background: var(--accent-tint);
      color: var(--accent-strong);
      box-shadow: 0 0 0 3px var(--accent-tint);
    }
    #group-pin-badge.is-unlocked {
      background: var(--accent);
      color: var(--accent-ink);
      border-color: transparent;
      box-shadow: 0 0 0 6px var(--accent-tint);
    }
    @media (prefers-reduced-motion: no-preference) {
      .pin-row.is-unlocked span.pin-box {
        animation: pinUnlockWave 340ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      .pin-row.is-unlocked span.pin-box:nth-of-type(1) { animation-delay: 0ms; }
      .pin-row.is-unlocked span.pin-box:nth-of-type(2) { animation-delay: 55ms; }
      .pin-row.is-unlocked span.pin-box:nth-of-type(3) { animation-delay: 110ms; }
      .pin-row.is-unlocked span.pin-box:nth-of-type(4) { animation-delay: 165ms; }
      #group-pin-badge.is-unlocked {
        animation: pinBadgeUnlock 360ms cubic-bezier(0.22, 1, 0.36, 1) 110ms both;
      }
    }
    @keyframes pinUnlockWave {
      0% { transform: translateY(0) scale(0.95); }
      52% { transform: translateY(-5px) scale(1.05); }
      100% { transform: translateY(0) scale(1); }
    }
    @keyframes pinBadgeUnlock {
      0% { transform: scale(0.88) rotate(-8deg); }
      58% { transform: scale(1.08) rotate(3deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    @keyframes pinShake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-5px); }
      45% { transform: translateX(5px); }
      70% { transform: translateX(-3px); }
      88% { transform: translateX(3px); }
    }
    .pin-msg {
      min-height: 20px;
      text-align: center;
      font-size: 13px;
      font-family: var(--font-mono);
      color: var(--text-muted);
      margin-bottom: 12px;
    }

    /* === MODAL OVERLAY / SURFACE === */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(8, 19, 29, 0.88);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999 !important;
      opacity: 0;
      visibility: hidden;
      /* Close: fade out 180ms, then snap visibility hidden after fade completes */
      transition: opacity 0.18s ease, visibility 0s linear 0.18s;
      padding: 24px;
      overscroll-behavior: contain;
      pointer-events: none;
    }

    /* Keep the existing viewport wrapper and sheet layout in the native top layer. */
    dialog.modal-overlay {
      width: 100%;
      height: 100%;
      max-width: none;
      max-height: none;
      margin: 0;
      border: 0;
      color: inherit;
    }

    dialog:not([open]) { display: none; }
    dialog[open] { display: flex; }

    dialog.modal-overlay::backdrop {
      background: transparent;
      overflow: hidden;
      overscroll-behavior: contain;
    }

    @supports (backdrop-filter: blur(4px)) or (-webkit-backdrop-filter: blur(4px)) {
      .modal-overlay {
        background: rgba(6, 20, 42, 0.58);
        backdrop-filter: blur(14px) saturate(150%);
        -webkit-backdrop-filter: blur(14px) saturate(150%);
      }
    }

    body.dark-mode .modal-overlay {
      background: rgba(3, 8, 20, 0.68);
    }

    .modal-overlay.active {
      opacity: 1 !important;
      visibility: visible !important;
      display: flex !important;
      pointer-events: auto;
      /* Open: visibility instant, fade in 200ms */
      transition: opacity 0.2s ease, visibility 0s linear 0s;
    }

    .modal-content {
      background: var(--surface);
      width: 100%;
      max-width: 800px;
      border-radius: 20px;
      box-shadow: var(--shadow-pop);
      transform: scale(0.97) translateY(8px);
      opacity: 0;
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                  opacity 0.18s ease-out,
                  background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      padding: var(--modal-pad);
      max-height: 95vh;
      overflow-y: auto;
      overflow-x: hidden;
      border: 1px solid var(--border);
    }

    .modal-overlay.active .modal-content {
      transform: scale(1) translateY(0) !important;
      opacity: 1 !important;
    }

    /* Stacked Modal Support */
    #modal-hapus, #modal-edit-transaksi { z-index: 110; }
    #modal-menu { z-index: 10000; }

    /* === SKELETON === */
    .skeleton {
      background: var(--surface-3);
      border-radius: var(--r-sm);
      animation: skeleton-pulse 1.6s ease-in-out infinite;
      pointer-events: none;
    }

    @keyframes skeleton-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .modal-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 600;
      color: var(--text-main);
      letter-spacing: var(--tracking-tight);
    }
    .close-modal {
      background: var(--surface-2);
      border: 1px solid var(--border);
      width: 34px;
      height: 34px;
      border-radius: var(--r-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      cursor: pointer;
      color: var(--text-muted);
      transition: background var(--t-fast), color var(--t-fast);
    }
    .close-modal:hover { background: var(--surface-3); color: var(--text-main); }

    /* === FORM CONTROLS === */
    .form-group { margin-bottom: 14px; }
    .form-group label {
      display: block;
      font-family: var(--font-sans);
      font-size: 12px;
      font-weight: 700;
      text-transform: none;
      letter-spacing: normal;
      margin-bottom: 6px;
      color: var(--text-muted);
    }

    /* Small helper text under an input (e.g. optional-date hint). */
    .form-hint {
      display: block;
      margin-top: 6px;
      font-size: 11.5px;
      line-height: 1.4;
      color: var(--text-muted);
    }

    .form-control {
      width: 100%;
      padding: 10px 13px;
      border: 1px solid var(--border);
      border-radius: 12px;
      font-size: 13.5px;
      font-family: inherit;
      outline: none;
      transition: border-color var(--t-fast), background-color var(--t-fast), box-shadow var(--t-fast);
      background-color: var(--surface);
      color: var(--text-main);
    }
    .form-control::placeholder { color: var(--text-faint); }
    .form-control:hover { border-color: var(--border-strong); }
    .form-control:focus {
      border-color: var(--accent);
      background: var(--surface);
      box-shadow: 0 0 0 3px var(--accent-tint);
    }

    /* Angka, ID, dan PIN memakai monospace */
    input[type="number"].form-control,
    .input-qp-nominal,
    #qp-nominal,
    #edit-nominal,
    #iuran-nominal,
    #ops-nominal,
    #input-group-pin,
    #input-wa-anggota,
    .input-admin-code {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
    }

    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button { display: none; }
    input[type="number"] { -moz-appearance: textfield; }

    /* === SELECT === */
    select.form-control {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237d99ac' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      background-size: 16px;
      padding-right: 40px;
      cursor: pointer;
    }

    body.dark-mode select.form-control {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b8fa6' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    }

    select.form-control:hover { border-color: var(--border-strong); }

    select.form-control:focus {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%230f766e' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    }

    body.dark-mode select.form-control:focus {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%232dd4bf' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    }

    /* === INPUT WITH PREFIX (CURRENCY) === */
    .input-with-prefix { position: relative; display: flex; align-items: center; }
    .input-with-prefix span {
      position: absolute;
      left: 14px;
      font-weight: 500;
      color: var(--text-faint);
      font-size: 13px;
      font-family: var(--font-mono);
      pointer-events: none;
      border-right: 1px solid var(--border);
      padding-right: 10px;
    }
    .input-with-prefix .form-control {
      padding-left: 52px;
      font-weight: 500;
      font-size: 17px;
      color: var(--text-main);
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
    }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-row.form-row-3 { grid-template-columns: 1.2fr 0.8fr 1.1fr; }
    @media (max-width: 640px) {
      .form-row,
      .form-row.form-row-3 { grid-template-columns: 1fr; gap: 0; }
    }

    /* === SEGMENTED TABS (Hybrid Kinetic Pill Track) === */
    .tab-header,
    .tab-buttons,
    .tabs-header,
    .faq-tabs {
      display: flex;
      gap: 4px;
      background: var(--surface-2);
      padding: 4px;
      border-radius: var(--r-pill);
      margin-bottom: 18px;
      border: 1px solid var(--border);
      max-width: 100%;
      margin-left: 0;
      margin-right: 0;
    }
    .tab-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: transparent;
      border: 1px solid transparent;
      min-height: 36px;
      padding: 7px 14px;
      font-weight: 700;
      font-size: 12.5px;
      font-family: var(--font-sans);
      color: var(--text-muted);
      border-radius: var(--r-pill);
      cursor: pointer;
      white-space: nowrap;
      transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast), box-shadow var(--t-fast);
    }
    .tab-btn.active {
      background: var(--surface);
      color: var(--text-main);
      border-color: var(--border);
      box-shadow: var(--hybrid-card-shadow);
    }
    .tab-header .tab-btn { padding: 7px 12px; white-space: nowrap; }
    .tab-btn:hover:not(.active) { color: var(--text-main); background: color-mix(in oklab, var(--surface-3) 65%, transparent); }

    .tab-content:not(.active) { display: none !important; }
    .tab-content.active { display: block; height: auto; }

    select option { background-color: var(--surface); color: var(--text-main); }

    /* === MODAL GRID LAYOUT === */
    .modal-grid { display: grid; grid-template-columns: 320px 1fr; gap: 24px; align-items: stretch; min-height: 480px; }

    .modal-side-info {
      background: var(--surface-2);
      padding: 20px;
      border-radius: 14px;
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .modal-main-selection {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 4px 0;
    }

    .summary-card.impact-box {
      margin-top: 12px;
      padding: 13px 16px;
      border-radius: 12px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      align-items: center;
    }
    .summary-card.impact-box .impact-col {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 2px;
      margin: 0;
      padding: 0;
      border: 0;
      min-width: 0;
    }
    .summary-card.impact-box .impact-col > span {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
    }
    .summary-card.impact-box .impact-col > strong {
      font-family: var(--font-mono);
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .summary-card.impact-box .summary-total.impact-col > strong {
      color: var(--income-strong);
    }

    #modal-transaksi .checkbox-grid {
      max-height: 210px;
    }

    /* === CHIPS (filter) === */
    .chip-group { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px; }
    .chip-btn {
      padding: 8px 16px;
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: var(--r-pill);
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      color: var(--text-muted);
      cursor: pointer;
      transition: border-color var(--t-fast), background var(--t-fast), color var(--t-fast), transform 0.16s cubic-bezier(0.23, 1, 0.32, 1);
      user-select: none;
    }
    .chip-btn:hover { border-color: var(--border-strong); color: var(--text-main); }
    .chip-btn:active:not(:disabled) {
      transform: scale(0.97);
      transition-duration: 0.1s;
    }
    .chip-btn.active {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--accent-ink);
      font-weight: 600;
    }

    /* === CHECKBOX GRID === */
    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 8px;
      max-height: 480px;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 2px;
      align-items: stretch;
      scrollbar-gutter: stable;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 13px;
      cursor: pointer;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      transition: border-color var(--t-fast), background var(--t-fast);
      user-select: none;
      height: 100%;
      min-height: 44px;
    }

    .checkbox-item:hover {
      border-color: var(--border-strong);
      background: var(--surface-2);
    }

    .checkbox-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      margin: 0;
      accent-color: var(--accent);
      cursor: pointer;
      flex-shrink: 0;
      border-radius: var(--r-xs);
    }

    .checkbox-item span {
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-main);
      line-height: 1.4;
      display: block;
    }

    .checkbox-item:has(input:checked) {
      border-color: var(--accent);
      background-color: var(--accent-tint);
    }

    .checkbox-item:has(input:checked) span {
      font-weight: 600;
      color: var(--accent-strong);
    }
  }
</style>
