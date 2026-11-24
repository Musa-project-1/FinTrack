<style>
  :global {
    .ledger-list {
      display: flex;
      flex-direction: column;
      min-width: 0;
      max-width: 100%;
    }

    .ledger-row {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
      text-align: left;
      padding: 14px 20px;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 14px;
      border-bottom: 1px solid var(--border);
      transition: background-color 150ms ease;
    }

    .ledger-row:last-child {
      border-bottom: 0;
    }

    @media (hover: hover) and (pointer: fine) {
      .ledger-row:hover {
        background: color-mix(in oklab, var(--surface-2) 65%, var(--surface));
      }
    }

    .ledger-type-icon {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-size: 17px;
      flex-shrink: 0;
    }

    .ledger-type-icon.inflow {
      background: var(--income-bg);
      color: var(--income-strong);
    }

    .ledger-type-icon.outflow {
      background: var(--surface-2);
      color: var(--text-main);
    }

    .ledger-main {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .ledger-title {
      font-weight: 700;
      font-size: 14px;
      color: var(--text-main);
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .ledger-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      min-width: 0;
      max-width: 100%;
      font-size: 12px;
      color: var(--text-muted);
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .cat-tag {
      padding: 2px 8px;
      border-radius: var(--r-pill);
      background: var(--surface-2);
      color: var(--text-main);
      font-weight: 600;
      font-size: 11px;
      min-width: 0;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .ledger-amt-col {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      min-width: 0;
      flex-shrink: 0;
    }

    .ledger-amt {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: .90625rem;
      font-variant-numeric: tabular-nums;
      letter-spacing: normal;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .ledger-amt.inflow {
      color: var(--income-strong);
    }

    /* Outflows MUST stay neutral ink with minus sign */
    .ledger-amt.outflow {
      color: var(--text-main);
    }

    .ledger-action-hint {
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 600;
      white-space: nowrap;
    }

    #workspace-iuran #section-rekap {
      margin: 0;
      padding: 0;
      background: color-mix(in oklab, var(--surface) 90%, transparent);
      --shadow-card: var(--hybrid-card-shadow);
    }
    body[data-canvas="clean"] #workspace-iuran #section-rekap { background: var(--surface); }
    #section-rekap .table-header { min-height: 0; padding: 12px 18px; margin: 0; border-bottom: 1px solid var(--border); }
    #section-rekap .table-header-left { min-width: 0; gap: 8px; }
    #section-rekap .table-header-controls { gap: 8px; }
    #section-rekap .matrix-legend { padding: 0; border: 0; border-top: 0; gap: 12px; }
    #section-rekap .matrix-legend span { gap: 6px; font-size: 12px; font-weight: 600; }
    #section-rekap .matrix-legend span::before { width: 10px; height: 10px; border-radius: 4px; }
    #section-rekap .matrix-legend [data-status="Nanti"]::before { border: 1.5px dashed var(--border-strong); background: transparent; }
    #section-rekap .dues-status-help {
      width: auto; flex: 0 0 auto; min-height: 36px; padding-inline: 12px; gap: 5px;
      border-radius: 12px; border: 1px solid var(--border); background: var(--surface);
      color: var(--text-main); font-size: 12px; font-weight: 700;
    }
    #section-rekap .dues-status-help {
      display: inline-flex; align-items: center; justify-content: center;
      height: 36px; min-width: 107px; padding-block: 0; white-space: nowrap;
      cursor: pointer;
      transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
    }
    #section-rekap .dues-status-help:hover {
      color: var(--member-spot-ink, var(--text-main));
      background: var(--member-spot-soft, var(--surface-2));
      border-color: var(--member-spot-border, var(--border-strong));
    }
    #section-rekap .table-responsive { border: 0; border-radius: 0; margin: 0; overflow-x: auto; scrollbar-gutter: auto; }
    #section-rekap .table-matriks {
      width: 100%;
      min-width: 960px;
      table-layout: auto;
      border-collapse: separate;
      border-spacing: 0;
    }
    #section-rekap .table-matriks thead th {
      top: 0; height: 45px; padding: 8px 4px; vertical-align: middle; border: 0; border-bottom: 1px solid var(--border);
      background: var(--surface-2); color: var(--text-muted); font-family: var(--font-sans); font-size: 11.5px;
      font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
      transition: background-color 140ms ease, color 140ms ease;
    }
    #section-rekap .table-matriks .th-member-col,
    #section-rekap .table-matriks thead th:first-child {
      width: auto; min-width: 238px; text-align: left; padding: 8px 12px 8px 18px;
      color: var(--text-muted); border-right: 1px solid var(--border);
    }
    #section-rekap .table-matriks thead th:first-child { left: 0; z-index: 4; }
    #section-rekap .table-matriks thead th.is-current-month {
      color: var(--accent-strong);
      background: color-mix(in oklab, var(--accent-tint) 55%, var(--surface-2));
    }
    #section-rekap .table-matriks thead th.is-col-hover {
      background: color-mix(in oklab, var(--accent-tint) 45%, var(--surface-2));
      color: var(--text-main);
    }
    #section-rekap .table-matriks tbody :is(td, th) { border: 0; border-bottom: 1px solid var(--border); }
    #section-rekap .table-matriks tbody td:not([colspan]) {
      padding: 6px 4px; text-align: center; vertical-align: middle;
      font-family: var(--font-sans); font-weight: 400; letter-spacing: normal;
      transition: background-color 140ms ease;
    }
    #section-rekap .table-matriks tbody th {
      position: sticky; left: 0; z-index: 3; background: var(--surface); padding: 10px 12px 10px 18px;
      border-right: 1px solid var(--border); vertical-align: middle; text-align: left;
      font-family: var(--font-sans); font-size: 14px; font-weight: 700; line-height: 1.5;
      letter-spacing: normal; text-transform: none; font-variant-numeric: normal;
    }
    #section-rekap .table-matriks tbody tr th.is-pinned { background: color-mix(in oklab, var(--member-spot-soft) 45%, var(--surface)); box-shadow: inset 3px 0 0 var(--hybrid-spot); }
    #section-rekap .table-matriks tbody td.is-col-hover {
      background: color-mix(in oklab, var(--surface-2) 65%, var(--surface));
    }
    @media (hover: hover) and (pointer: fine) {
      #section-rekap .table-matriks tbody tr:hover th:not(.is-pinned),
      #section-rekap .table-matriks tbody tr:hover td { background: color-mix(in oklab, var(--surface-2) 52%, var(--surface)); }
    }
    #section-rekap .table-matriks tbody tr:last-child :is(td, th) { border-bottom: 0; }

    #section-rekap .dues-person { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    #section-rekap .dues-name .clickable-name {
      display: flex; flex-direction: column; align-items: flex-start; gap: 0;
      flex: 1; min-width: 0; padding: 3px 4px; margin: -3px -4px; border-radius: 8px;
      letter-spacing: normal; text-align: left; transition: background-color 140ms ease;
    }
    #section-rekap .dues-name .clickable-name:hover {
      color: var(--text-main);
      text-decoration: none;
      background: color-mix(in oklab, var(--surface-2) 72%, transparent);
    }
    #section-rekap .dues-name .clickable-name:hover .dues-member-name { color: var(--text-main); text-decoration: none; }
    #section-rekap .dues-name .clickable-name:hover .dues-member-sub { color: var(--text-muted); text-decoration: none; }
    #section-rekap .dues-member-row { display: inline-flex; align-items: center; gap: 6px; min-width: 0; max-width: 100%; }
    #section-rekap .dues-member-row .self-pin-badge { margin-inline-start: 0; }
    #section-rekap .dues-member-name {
      font-family: var(--font-sans); font-size: 14px; font-weight: 700;
      letter-spacing: -0.015em; line-height: 1.28; color: var(--text-main);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #section-rekap .dues-member-sub {
      font-family: var(--font-sans); font-size: 12px; font-weight: 500;
      letter-spacing: normal; line-height: 1.32; color: var(--text-muted);
    }

    #section-rekap .table-matriks .matrix-dues-button {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 56px; width: auto; min-height: 36px; height: 36px; padding: 0; margin: 0 auto;
      border-radius: 8px; font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: normal;
      transition: transform 150ms var(--hybrid-ease-spring), background-color 160ms ease, border-color 160ms ease;
    }
    @media (prefers-reduced-motion: no-preference) {
      #section-rekap .table-matriks .matrix-dues-button:active:not(:disabled) {
        transform: scale(0.96);
      }
    }
    #section-rekap .table-matriks .dues-seal,
    #section-rekap .table-matriks .dues-month-status {
      min-width: 56px; width: auto; height: 36px; padding: 0 4px; border-radius: 8px;
      display: inline-flex; align-items: center; justify-content: center;
      font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: -0.02em; line-height: 1;
    }
    #section-rekap .table-matriks .dues-seal {
      background: var(--income-bg); color: var(--income-strong); border: 1px solid var(--income-border);
      font-weight: 800; letter-spacing: -0.02em; gap: 2.5px;
    }
    #section-rekap .table-matriks .dues-month-status {
      border: 1px solid var(--dues-border, var(--border));
      background: var(--dues-tint); color: var(--dues-ink); text-transform: uppercase;
    }
    #section-rekap .table-matriks .dues-month-status[data-status="Belum"] {
      background: var(--surface-2); border-color: var(--border); color: var(--dues-ink);
    }
    #section-rekap .table-matriks .matrix-dues-button:hover .dues-month-status[data-status="Belum"],
    body.arrears-tone-red #section-rekap .table-matriks .dues-month-status[data-status="Belum"] {
      background: var(--dues-tint); border-color: var(--dues-border);
    }
    #section-rekap .table-matriks .dues-month-status[data-status="Sebagian"] {
      flex-direction: column; gap: 1px; padding: 2px 3px; font-size: 11px; letter-spacing: -0.03em;
    }
    #section-rekap .table-matriks .matrix-dues-button:hover .dues-month-status[data-status="Sebagian"] {
      border-color: var(--hybrid-spot);
    }
    #section-rekap .table-matriks .dues-month-status[data-status="Sebagian"] small {
      font-size: 11px; letter-spacing: -0.03em; color: inherit; line-height: 1;
    }
    #section-rekap .table-matriks .dues-month-status[data-status="Nanti"] {
      border: 1px dashed var(--border-strong); background: transparent; color: var(--text-faint);
    }
    #section-rekap .table-matriks .matrix-dues-button:hover .dues-month-status[data-status="Nanti"] {
      background: var(--surface-2); color: var(--text-muted);
    }
    #section-rekap .table-matriks .dues-month-status[data-status="Libur"] {
      background: var(--surface-2); color: var(--text-faint);
      border-color: color-mix(in oklab, var(--border-strong) 82%, transparent); opacity: .85;
    }
    #section-rekap .matrix-hint {
      margin: 0; padding: 8px 18px;
      border-bottom: 1px solid var(--border);
      background: color-mix(in oklab, var(--surface-2) 55%, transparent);
      color: var(--text-muted); font-size: 12px; font-weight: 600; line-height: 1.4;
    }

    #workspace-history { padding: 0; }
    #workspace-history[hidden] { display: none; }
    .hybrid-ledger-toolbar {
      padding: 12px 18px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 14px;
    }
    .hybrid-ledger-toolbar > span, .hybrid-ledger-empty { color: var(--text-muted); font-size: 12px; font-weight: 600; }
    .hybrid-ledger-empty { padding: 20px; }
    .ledger-row { cursor: pointer; min-height: 44px; }
    .ledger-row:focus-visible { outline-offset: -3px; }
    .ledger-main { min-width: 0; overflow: hidden; }
    .ledger-amt-col { min-width: 0; flex-shrink: 0; text-align: end; }
    .ledger-id, .cat-tag { overflow-wrap: anywhere; word-break: break-word; }

    #workspace-stats { min-width: 0; align-items: stretch; }
    #workspace-stats[hidden] { display: none; }
    #workspace-stats .chart-card { min-width: 0; }
    #workspace-stats .page-subtitle { margin: 0; font-size: 13.5px; font-weight: 500; line-height: 1.45; color: var(--text-muted); }
    #workspace-stats .chart-head .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      height: 34px;
      min-height: 34px;
      padding: 0 12px;
      border-radius: 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-main);
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }
    #workspace-stats .chart-head .btn-secondary:hover:not(:disabled) {
      background: var(--surface-2);
      border-color: var(--border-strong);
    }
    #workspace-stats .chart-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 4px; color: var(--text-muted); font-size: 12px; font-weight: 600; }
    #workspace-stats .chart-legend span { display: inline-flex; align-items: center; gap: 6px; }
    #workspace-stats .chart-legend span::before { content: ''; display: inline-block; width: 10px; height: 10px; border-radius: 4px; background: var(--hybrid-paid); flex-shrink: 0; }
    #workspace-stats .chart-legend span:nth-child(2)::before { background: var(--hybrid-outflow, #64748B); }
    #workspace-stats .chart-legend span:nth-child(3)::before { width: 14px; height: 3px; border-radius: var(--r-pill); background: var(--hybrid-paid); }
    #hybrid-chart-readout { font-family: var(--font-sans); font-variant-numeric: tabular-nums; }
    #hybrid-chart-readout strong { color: var(--text-main); font-weight: 700; }
    #hybrid-chart-readout > span { font-weight: 700; font-size: inherit; overflow-wrap: anywhere; }
    .tt-inflow { color: var(--income-strong); font-weight: 700; }
    .tt-outflow { color: var(--text-main); font-weight: 700; }
    .tt-saldo { color: var(--text-muted); font-weight: 700; }
    @media (max-width: 980px) {
      .analytics-grid { grid-template-columns: minmax(0, 1fr); }
    }
    @media (max-width: 768px) {
      #workspace-stats .chart-legend { gap: 5px 10px; font-size: 11.5px; }
      #workspace-stats .chart-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: 8px; }
      #workspace-stats .chart-head .btn-secondary { min-height: 44px; height: 44px; white-space: nowrap; }
    }
    @media (max-width: 640px) {
      #hybrid-chart-readout { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: baseline; gap: 6px 10px; }
    }
    @media (max-width: 768px) {
      #section-rekap .table-header { padding: 12px 14px; }
      #section-rekap .matrix-legend { gap: 4px 8px; }
      #section-rekap .dues-status-help { width: 100%; height: 46px; min-width: 44px; min-height: 46px; padding-inline: 8px; }
      #section-rekap .dues-status-help i { font-size: 12px; }
      .ledger-row { padding: 12px 14px; gap: 10px; }
      .ledger-type-icon { width: 34px; height: 34px; font-size: 16px; }
      .ledger-title { white-space: normal; }
      .ledger-amt { font-size: 13px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .chart-bar-in,.chart-bar-out,.chart-curve-path.draw-anim,.breakdown-fill { animation: none; }
      .chart-dot { transition: none; }
    }

    .hybrid-year-glider[hidden] { display: none; }
    .hybrid-year-glider {
      --year-inset: 3px;
      --year-count: 1;
      --year-index: 0;
      --year-width: calc((100% - 2 * var(--year-inset) - 2px * (var(--year-count) - 1)) / var(--year-count));
      position: relative;
      isolation: isolate;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
      align-items: center;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface-2);
      max-width: 100%;
      overflow-x: auto;
    }
    .hybrid-year-glider button {
      min-height: 28px;
      padding: 0 12px;
      border-radius: 9px;
      color: var(--text-muted);
      font: 700 12px var(--font-sans);
      cursor: pointer;
    }
    .hybrid-year-glider button[aria-pressed="true"] { color: var(--text-main); }
    .year-glider-indicator {
      position: absolute;
      inset: 3px auto 3px var(--year-inset);
      z-index: -1;
      width: var(--year-width);
      translate: calc(var(--year-index) * (100% + 2px));
      transition: translate 420ms var(--hybrid-ease-spring);
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--surface);
      box-shadow: 0 2px 8px rgba(24, 20, 18, .08);
      pointer-events: none;
    }
    .year-pill:has(.hybrid-year-glider:not([hidden])) :is(.cdrop, label, i) { display: none; }
    #section-rekap .year-pill:has(.hybrid-year-glider:not([hidden])) {
      min-height: 0;
      height: auto;
      padding: 0;
      border: 0;
      background: transparent;
    }
    @media (prefers-reduced-motion: reduce) {
      .year-glider-indicator { transition: none; }
    }

    .iuran-member-card { padding: 0; border-radius: 20px; overflow: hidden; min-width: 0; max-width: 100%; box-sizing: border-box; }
    .iuran-card-header { padding: 10px 12px 8px; min-height: 60px; margin: 0; gap: 6px; min-width: 0; }
    .iuran-card-details { margin-inline: 12px; min-width: 0; }
    .iuran-member-card.expanded .iuran-card-details { padding-bottom: 10px; }
    .dues-mini-strip { margin: 0; padding: 0 12px 10px; }
    .dues-mini-strip span { height: 4px; border-radius: var(--r-pill); }
    .iuran-member-card.is-pinned { border-color: var(--hybrid-outline); background: color-mix(in oklab,var(--hybrid-glow) 35%,var(--surface)); }
    .matrix-mobile-chip { flex: none; padding: 3px 8px; border-radius: var(--r-pill); font-size: 11px; font-weight: 700; white-space: nowrap; }
    .matrix-mobile-chip.paid { background: var(--income-bg); color: var(--income-strong); }
    .matrix-mobile-chip.amber { background: var(--member-amber-soft, var(--warning-bg)); color: var(--member-amber-ink, var(--warning)); }
    #section-rekap .iuran-cards-container { padding: 14px; min-width: 0; max-width: 100%; }
    #section-rekap .iuran-member-card { margin: 0 0 12px; }
    #section-rekap .iuran-card-main-info { min-width: 0; flex: 1; }
    #section-rekap .iuran-card-name {
      min-height: 0; padding: 0; display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 6px;
      max-width: 100%; min-width: 0; white-space: normal; overflow-wrap: anywhere; word-break: break-word; text-align: start;
      font-family: var(--font-sans); font-size: 14.5px; font-weight: 700; line-height: 1.26; letter-spacing: -0.015em;
    }
    @media (hover: hover) and (pointer: fine) {
      #section-rekap .iuran-card-name:hover { color: var(--text-main); text-decoration: none; }
    }
    #section-rekap .iuran-card-name .self-pin-badge { margin-inline-start: 0; }
    #section-rekap .iuran-progress-subtext {
      font-family: var(--font-sans); font-size: 12px; font-weight: 500; line-height: 1.32; letter-spacing: normal;
      min-width: 0; overflow-wrap: anywhere;
    }
    #section-rekap .iuran-card-toggle { border-color: transparent; background: transparent; border-radius: 8px; }
    @media (hover: hover) and (pointer: fine) {
      #section-rekap .iuran-card-toggle:hover { background: var(--surface-2); }
    }
    #section-rekap .iuran-month-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; padding-top: 2px; }
    #section-rekap .iuran-month-item {
      flex-direction: row; align-items: center; justify-content: center; gap: 4px;
      height: 44px; min-height: 44px; min-width: 0; padding: 0;
      border-radius: 8px; border: 1px solid var(--dues-border, var(--border));
      background: var(--dues-tint); color: var(--dues-ink); font-size: 11.5px; font-weight: 700; line-height: normal;
    }
    #section-rekap .iuran-month-item[data-status="Belum"] {
      background: var(--surface-2); border-color: var(--border); color: var(--dues-ink);
    }
    body.arrears-tone-red #section-rekap .iuran-month-item[data-status="Belum"] {
      background: var(--dues-tint); border-color: var(--dues-border);
    }
    #section-rekap .iuran-month-item[data-status="Nanti"] {
      border-style: dashed; background: transparent; color: var(--text-faint);
    }
    #section-rekap .iuran-month-item[data-status="Libur"] {
      background: var(--surface-2); color: var(--text-faint); border-color: var(--border); opacity: .82;
    }
    #section-rekap .iuran-month-name { font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; }
    #section-rekap .dues-mini-strip { gap: 3px; }
    #section-rekap .dues-mini-strip [data-status="Nanti"] { border: 1px dashed var(--border-strong); background: transparent; }
    #section-rekap .dues-mini-strip [data-status="Libur"] { opacity: .45; }
    #section-rekap .iuran-action-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    #section-rekap :is(.iuran-btn-detail, .iuran-btn-pay) {
      flex: 1; min-width: 0; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      min-height: 44px; padding: 0 12px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer;
    }
    #section-rekap .iuran-btn-detail { border: 1px solid var(--border); background: var(--surface); color: var(--text-main); }
    @media (hover: hover) and (pointer: fine) {
      #section-rekap .iuran-btn-detail:hover { background: var(--surface-2); border-color: var(--border-strong); }
    }
    #section-rekap .iuran-btn-pay { border: 1px solid transparent; background: var(--hybrid-brand); color: var(--accent-ink); }
    .iuran-card-toggle i { transition: transform 240ms var(--hybrid-ease-spring); }

    @media (max-width: 768px) {
      #section-rekap .matrix-hint { padding: 9px 14px; font-size: 11.5px; line-height: 1.45; }
      #section-rekap .table-header.mobile-only .matrix-legend { width: 100%; justify-content: space-between; gap: 4px 8px; }
      #section-rekap .table-header.mobile-only .matrix-legend span { font-size: 11px; gap: 4px; }
      #section-rekap .table-header.mobile-only .matrix-legend span::before { width: 8px; height: 8px; }
      .hybrid-year-glider { --year-inset: 2px; padding: 2px; height: auto; min-height: 46px; }
      .hybrid-year-glider button { min-width: 44px; min-height: 44px; height: 44px; padding-inline: 12px; }
      .year-glider-indicator { top: 2px; bottom: 2px; }
      #section-rekap .dues-mobile-actions { grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
      #section-rekap .dues-mobile-actions .year-pill:has(.hybrid-year-glider:not([hidden])) label { display: none; }
    }
    @media (max-width: 400px) {
      #section-rekap .dues-mobile-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      #section-rekap .dues-mobile-actions > .year-pill { grid-column: 1 / -1; }
      #section-rekap .iuran-cards-container { padding: 10px; }
      #section-rekap .iuran-card-header { gap: 4px; padding: 10px; }
    }

    /* Shared compact Hybrid Kinetic pagination beneath the desktop matrix, ledger, and mobile cards. */
    .dues-pagination[hidden],
    .dues-page-jump[hidden] { display: none; }

    .dues-pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      padding: 9px 16px;
      border-top: 1px solid var(--border);
      background: color-mix(in oklab, var(--surface-2) 45%, var(--surface));
      color: var(--text-muted);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      border-radius: 0 0 18px 18px;
    }

    .dues-pagination [data-page-range] { margin: 0; font-weight: 500; line-height: 1.4; }
    .dues-pagination [data-page-range] strong { color: var(--text-main); font-family: var(--font-mono); font-weight: 700; }

    .dues-page-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
    .dues-page-jump { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-muted); }
    .dues-page-jump label { margin: 0; font-weight: 600; }

    .dues-pagination [data-page-number] {
      width: 38px;
      min-height: 28px;
      height: 28px;
      padding: 0 4px;
      text-align: center;
      border-radius: 8px;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 700;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-main);
      appearance: textfield;
      -moz-appearance: textfield;
    }
    .dues-pagination [data-page-number]::-webkit-outer-spin-button,
    .dues-pagination [data-page-number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

    .dues-page-controls {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 3px;
      border-radius: 10px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }
    .dues-page-list { display: inline-flex; align-items: center; gap: 2px; }

    .dues-page-controls > .btn.dues-page-step,
    .dues-page-btn {
      width: 28px;
      min-width: 28px;
      height: 28px;
      min-height: 28px;
      padding: 0;
      margin: 0;
      display: inline-grid;
      place-items: center;
      border-radius: 7px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
    }

    .dues-page-controls > .btn.dues-page-step:hover:not(:disabled),
    .dues-page-btn:hover:not(.is-active) {
      background: color-mix(in oklab, var(--surface) 70%, transparent);
      color: var(--text-main);
    }
    .dues-page-controls > .btn.dues-page-step:disabled { opacity: 0.35; cursor: not-allowed; }
    .dues-page-btn.is-active {
      background: var(--surface);
      color: var(--accent-strong);
      border-color: var(--accent-border);
      box-shadow: 0 1px 2px rgba(6, 27, 49, 0.08);
    }
    .dues-page-ellipsis {
      min-width: 20px;
      text-align: center;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-faint);
      user-select: none;
    }

    @media (max-width: 768px) {
      .dues-pagination { flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 10px 12px 12px; }
      .dues-page-actions { justify-content: center; gap: 8px; }
      .dues-page-controls > .btn.dues-page-step,
      .dues-page-btn { width: 32px; min-width: 32px; height: 32px; min-height: 32px; font-size: 12.5px; }
      .dues-pagination [data-page-number] { width: 42px; min-height: 32px; height: 32px; }
    }
  }
</style>
