<style>
  :global {
    @media (max-width: 480px) {
    body { padding: 6px 0 100px 0; }

      .header { 
        margin-bottom: 12px;
        padding: 6px 4px;
      }
      .header h1 { display: none; }

      .status-text { display: none; }

      .header-actions { 
        width: 100%;
        flex-wrap: nowrap;
        overflow-x: auto;
        gap: 4px;
        padding: 0 4px 4px;
      }
      .header-actions .btn span { display: none; }
      .header-actions .btn { 
        padding: 6px;
        width: 44px;
        height: 44px;
        min-width: 44px;
        border-radius: var(--r-md);
        flex-shrink: 0;
        font-size: 16px;
      }
      .header-actions .btn-primary { 
        border-radius: var(--r-md);
        width: auto;
        height: 44px;
        padding: 6px 12px;
        font-size: 12px;
      }
      .header-actions .btn-primary span { display: inline; }

      /* Dashboard: unified cash-summary panel, tightened for small screens */
      .dashboard { 
        gap: 8px;
        margin: 0 8px 12px;
      }
      .balance-hero__value {
        font-size: 1.75rem;
      }
      .flow-strip__item { padding: 10px 12px; }
      .flow-strip__value { font-size: 13px; }
      .flow-strip__label { font-size: 11px; }
      .card { 
        padding: 8px 10px;
        gap: 8px;
      }
      .card-icon { 
        width: 32px;
        height: 32px;
        font-size: 14px;
      }
      .card-info h3 { font-size: 10px; }
      .nominal-val { font-size: 13px; }

      /* Table on very small screens - Card Layout */
      .table-card { 
        border-radius: var(--r-lg);
        margin: 0 8px 16px;
        width: auto;
      }
      .table-header {
        padding: 12px;
      }
      .table-title {
        font-size: 16px !important;
      }
      .table-title i {
        font-size: 18px;
      }

      /* Better modal for small screens: centered, not bottom-anchored */
      .modal-overlay {
        padding: 8px;
        align-items: center;
        justify-content: center;
      }
      .modal-content {
        width: calc(100vw - 16px);
        max-width: 420px;
        max-height: 90vh;
        --modal-pad: 16px;
        border-radius: var(--r-lg);
        padding: var(--modal-pad);
      }
      .modal-title { 
        font-size: 16px;
        margin-bottom: 12px;
      }
      .close-modal {
        width: 32px;
        height: 32px;
        font-size: 16px;
      }

      .modal-side-info {
        padding: 12px;
        border-radius: var(--r-md);
      }
      .summary-card { margin-top: 16px; }

      .form-group label { 
        font-size: 13px;
      }
      .form-group { margin-bottom: 10px; }
      .form-control {
        padding: 10px 14px;
        font-size: 16px;
        border-radius: 10px;
      }
      .form-control:focus { 
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent-tint);
      }

      .btn { 
        padding: 10px 14px;
        font-size: 13px;
        min-height: 40px;
        border-radius: 10px;
        touch-action: manipulation;
      }

      .chip-group { 
        gap: 8px;
      }
      .chip-btn { 
        padding: 8px 16px;
        font-size: 12px;
      }

      .checkbox-grid { 
        grid-template-columns: 1fr;
        max-height: 350px;
        gap: 10px;
      }
      .checkbox-item {
        padding: 12px;
        border-radius: var(--r-md);
      }

      .checkbox-item input[type="checkbox"] {
        width: 18px;
        height: 18px;
      }

      .checkbox-item span { 
        font-size: 13px;
      }

      .chart-wrapper { height: 240px; }

      .year-pill {
        font-size: 12px;
        padding: 4px 12px;
        height: 40px;
      }

      /* Mobile Table Header: Row 1 Title, Row 2 Search beside compact Year Pill */
      .table-header.mobile-only {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .table-header.mobile-only .table-header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }
      .table-header.mobile-only .table-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1 1 auto;
        min-width: 0;
      }
      .table-header.mobile-only .table-title {
        font-size: 16px !important;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .table-header.mobile-only .table-header-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        margin: 0;
      }
      .table-header.mobile-only .member-search-wrapper {
        flex: 1 1 auto;
        min-width: 0;
        width: auto;
        position: relative;
        display: flex;
        align-items: center;
        margin: 0 !important;
      }
      .table-header.mobile-only .search-member-input {
        width: 100% !important;
        max-width: none;
        height: 40px;
        padding-left: 34px !important;
        padding-right: 12px !important;
        font-size: 13px;
        box-sizing: border-box;
      }
      .table-header.mobile-only .year-pill {
        flex: 0 0 auto;
        width: auto;
        max-width: none;
        height: 40px;
        padding: 4px 10px;
        gap: 4px;
        display: inline-flex;
        align-items: center;
      }
      .table-header.mobile-only .year-pill label {
        display: none;
      }

      .tab-header {
        max-width: 100%;
        margin-left: 0;
        margin-right: 0;
      }

      /* Search wrapper for mobile */
      .search-wrapper i { font-size: 16px; }
      .search-wrapper input { 
        padding-left: 36px;
        font-size: 14px;
        border-radius: 8px;
      }

      /* Input with prefix mobile */
      .input-with-prefix span { 
        font-size: 12px;
        left: 12px;
      }
      .input-with-prefix .form-control { 
        padding-left: 50px;
        font-size: 16px;
      }
    .table-matriks th,
      .table-matriks td {
        padding: 6px 4px;
        font-size: 11px;
      }

      .table-matriks th {
        font-size: 9px;
      }

      .table-matriks td:first-child,
      .table-matriks th:first-child {
        min-width: 100px;
      }

      .table-matriks td.text-center {
        padding: 4px;
        min-width: 32px;
      }

      /* Mobile Iuran Cards View */
      .table-card .table-responsive {
        display: none !important;
      }

      .table-card .iuran-cards-container {
        display: block !important;
      }

      .iuran-month-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
      }

      .iuran-member-card {
        padding: 8px 10px;
        margin-bottom: 6px;
      }


      .iuran-progress-subtext {
        font-size: 10px;
      }

      .iuran-month-item {
        padding: 8px 4px;
        font-size: 11px;
        min-height: 44px;
      }

      .iuran-action-buttons {
        gap: 6px;
      }

      .iuran-btn-pay,
      .iuran-btn-detail {
        padding: 8px;
        font-size: 11px;
      }
    .checkbox-grid { grid-template-columns: 1fr; }
      .badge {
        padding: 4px 10px;
        font-size: 10px;
      }

      .badge i {
        font-size: 11px;
      }
    }

    /* === AUDIT LOG MOBILE CARD VIEW & STATISTIK COMPACT (<= 768px) === */
    @media (max-width: 768px) {
      /* Audit Log mobile card view consolidated into css/modules/view-master.css */

      /* === MODAL STATISTIK MOBILE COMPACT === */
      :is(#modal-statistik, #workspace-stats) .modal-header-standard {
        margin-bottom: 10px;
        padding-bottom: 8px;
        gap: 8px;
      }

      :is(#modal-statistik, #workspace-stats) .modal-badge-icon {
        width: 34px;
        height: 34px;
        font-size: 16px;
      }

      :is(#modal-statistik, #workspace-stats) .modal-title-wrap h2 {
        font-size: 15px;
      }

      :is(#modal-statistik, #workspace-stats) .modal-title-wrap p {
        font-size: 11px;
        line-height: 1.3;
      }

      /* Grid 2 kolom seimbang */
      :is(#modal-statistik, #workspace-stats) .stats-overview {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 8px !important;
        margin-bottom: 10px !important;
      }

      :is(#modal-statistik, #workspace-stats) .stat-card {
        min-height: auto !important;
        padding: 10px 12px !important;
        border-radius: var(--r-sm) !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        box-sizing: border-box !important;
      }

      /* Kartu 1: Kesehatan Kas (lebar penuh) */
      :is(#modal-statistik, #workspace-stats) .stat-card.health-card {
        grid-column: 1 / -1 !important;
        padding: 10px 12px !important;
      }

      :is(#modal-statistik, #workspace-stats) .health-card .stat-card-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-bottom: 4px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
      }

      :is(#modal-statistik, #workspace-stats) #stat-health-pct {
        font-size: 20px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
      }

      :is(#modal-statistik, #workspace-stats) .health-card .stat-card-body {
        gap: 4px !important;
      }

      :is(#modal-statistik, #workspace-stats) .progress-bar {
        height: 6px !important;
      }

      :is(#modal-statistik, #workspace-stats) .stat-card-note {
        font-size: 10.5px !important;
        line-height: 1.3 !important;
        color: var(--text-muted) !important;
      }

      /* Kartu 2 & 3: Anggota Lunas & Menunggak */
      :is(#modal-statistik, #workspace-stats) .stat-card-title {
        font-size: 11px !important;
        line-height: 1.2 !important;
        color: var(--text-muted) !important;
        font-weight: 500 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      :is(#modal-statistik, #workspace-stats) .stat-card-interactive-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 4px !important;
        width: 100% !important;
      }

      :is(#modal-statistik, #workspace-stats) .stat-wa-badge {
        padding: 1px 5px !important;
        font-size: 9px !important;
        border-radius: var(--r-xs) !important;
        flex-shrink: 0 !important;
      }

      :is(#modal-statistik, #workspace-stats) .stat-card-value {
        font-size: 20px !important;
        font-weight: 700 !important;
        font-family: var(--font-mono) !important;
        line-height: 1.1 !important;
        margin-top: 4px !important;
      }

      /* Kartu 4: Potensi Belum Tertagih -> Horizontal Key-Value Bar! */
      :is(#modal-statistik, #workspace-stats) .stat-card:last-child {
        grid-column: 1 / -1 !important;
        flex-direction: row !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 8px 12px !important;
      }

      :is(#modal-statistik, #workspace-stats) .stat-card:last-child .stat-card-title {
        font-size: 11.5px !important;
        margin: 0 !important;
      }

      :is(#modal-statistik, #workspace-stats) .stat-card:last-child .stat-card-value {
        font-size: 15px !important;
        margin-top: 0 !important;
      }

      /* Charts on Mobile */
      :is(#modal-statistik, #workspace-stats) .chart-section {
        margin-bottom: 8px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
      }

      :is(#modal-statistik, #workspace-stats) .chart-grid-section {
        grid-template-columns: 1fr !important;
        gap: 8px !important;
      }

      :is(#modal-statistik, #workspace-stats) .chart-flat-card {
        padding: 10px 12px 6px !important;
        border-radius: var(--r-sm) !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      :is(#modal-statistik, #workspace-stats) .chart-header-strip {
        padding-bottom: 6px !important;
        margin-bottom: 6px !important;
        border-bottom: 1px solid var(--border) !important;
      }

      :is(#modal-statistik, #workspace-stats) .chart-card-title {
        font-family: var(--font-sans) !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: var(--text-main) !important;
      }

      :is(#modal-statistik, #workspace-stats) .chart-update-text {
        font-family: var(--font-mono) !important;
        font-size: 10px !important;
        color: var(--text-faint) !important;
      }

      :is(#modal-statistik, #workspace-stats) .chart-wrapper-compact {
        height: 185px !important;
        max-height: 185px !important;
      }

      /* Export mobile styles consolidated into css/modules/modals.css */
    }
  }
</style>
