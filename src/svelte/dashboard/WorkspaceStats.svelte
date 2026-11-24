<script lang="ts">
  import { selectStatsMonth, statsStore as vm } from '../stores/stats.svelte';

  const hitTargets: SVGRectElement[] = [];
  let curvePathEl = $state<SVGPathElement>();
  let month = $derived(vm.months[vm.selectedMonth]);
  let maxTickChars = $derived(
    vm.gridLines.reduce((max, gl) => Math.max(max, String(gl.tickLabel ?? '').length), 0)
  );
  let axisPad = $derived(vm.ready ? Math.max(0, Math.ceil(maxTickChars * 7.8 + 10) - 36) : 0);
  let chartViewBox = $derived(axisPad > 0 ? `-${axisPad} 0 ${720 + axisPad} 250` : '0 0 720 250');

  // Each chart revision creates a fresh path. Selecting a month keeps the path and its animation.
  $effect(() => {
    if (typeof curvePathEl?.getTotalLength !== 'function'
      || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    const length = curvePathEl.getTotalLength();
    if (length > 0) {
      curvePathEl.style.strokeDasharray = length.toFixed(1);
      curvePathEl.style.strokeDashoffset = length.toFixed(1);
      curvePathEl.classList.add('draw-anim');
    }
  });

  function handleHitKeydown(event: KeyboardEvent, index: number) {
    const targets: Record<string, number> = {
      ArrowLeft: (index + 11) % 12, ArrowRight: (index + 1) % 12, Home: 0, End: 11,
      Enter: index, ' ': index
    };
    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    const next = targets[event.key];
    if (next !== index) hitTargets[next]?.focus();
    selectStatsMonth(next);
  }
</script>

<article class="hybrid-card chart-card">
  <div class="chart-head">
    <div><h2 class="chart-title" id="hybrid-chart-title">Arus Kas Bulanan &amp; Tren Saldo{vm.ready ? ' ' + vm.activeYear : ''}</h2>
      <div class="chart-legend" aria-label="Legenda grafik"><span>Pemasukan</span><span>Pengeluaran</span><span>Tren Saldo Kumulatif</span></div>
    </div>
    <button type="button" class="btn btn-secondary" data-action="export-csv"><i class="ph ph-download-simple" aria-hidden="true"></i><span>Unduh CSV</span></button>
  </div>
  <figure class="chart-figure">
    <div class="chart-stage">
      <svg class="chart-svg" id="hybrid-cashflow" viewBox={chartViewBox} role="img" aria-label="Arus kas 12 bulan dan tren saldo">
        {#if vm.ready}
          {#each vm.gridLines as gl}
            <line x1="44" y1={gl.y} x2="704" y2={gl.y} stroke="var(--border)" stroke-dasharray={gl.dashed ? '3 4' : undefined} stroke-width="1" />
            <text x="36" y={gl.y + 4} text-anchor="end" fill="var(--text-muted)" font-size="11" font-family="var(--font-mono)">{gl.tickLabel}</text>
          {/each}
          {#each vm.months as m (m.index)}
            <rect class="chart-bar-in" style:--bar-i={m.index} x={m.barInX} y={m.barInY} width="11" height={m.barInH} rx="4" fill="var(--hybrid-paid)" />
            <rect class="chart-bar-out" style:--bar-i={m.index} x={m.barOutX} y={m.barOutY} width="11" height={m.barOutH} rx="4" fill="var(--hybrid-outflow, #64748B)" opacity="0.78" />
            <text class="chart-axis-x" class:is-selected={vm.selectedMonth === m.index} x={m.cx} y="240" text-anchor="middle" fill="var(--text-muted)" font-size="11" font-weight="700">{m.shortName}</text>
          {/each}
          {#key vm.revision}
            <path bind:this={curvePathEl} d={vm.curvePath} class="chart-curve-path" />
          {/key}
          {#each vm.months as m (m.index)}
            <circle class="chart-dot" class:is-selected={vm.selectedMonth === m.index} cx={m.dotX} cy={m.dotY} r={vm.selectedMonth === m.index ? 5.5 : 4} fill="var(--surface)" stroke="var(--hybrid-paid)" stroke-width="2" />
          {/each}
          {#each vm.months as m (m.index)}
            <rect bind:this={hitTargets[m.index]} x={m.hitX} y={m.hitY} width={m.hitW} height={m.hitH} rx="8" tabindex="0" role="button"
              aria-pressed={vm.selectedMonth === m.index} aria-label={`Detail bulan ${m.label}`} class="chart-hit-rect" class:is-selected={vm.selectedMonth === m.index}
              onmouseenter={() => selectStatsMonth(m.index)} onfocus={() => selectStatsMonth(m.index)}
              onclick={() => selectStatsMonth(m.index)} onkeydown={(event) => handleHitKeydown(event, m.index)} />
          {/each}
        {/if}
      </svg>
    </div>
    <figcaption class="chart-tooltip-box tnum" id="hybrid-chart-readout" aria-live="polite">
      {#if month}
        <strong>{month.label}</strong>
        <span class="tt-inflow sensitive-amt">Masuk: +{month.inText}</span>
        <span class="tt-outflow sensitive-amt">Keluar: −{month.outText}</span>
        <span class="tt-saldo sensitive-amt">Saldo Kumulatif: {month.runText}</span>
      {/if}
    </figcaption>
  </figure>
</article>
<article class="hybrid-card chart-card">
  <div class="chart-head">
    <div><h2 class="chart-title">Komposisi &amp; Kepatuhan</h2><p class="page-subtitle">Distribusi pengeluaran &amp; tingkat pelunasan anggota</p></div>
  </div>
  <div class="breakdown-list" id="hybrid-analytics-breakdown">
    {#each vm.breakdownRows as row}
      <div class="breakdown-row">
        <div class="breakdown-meta"><span title={row.label} dir="auto">{row.label?.trim() ? row.label : 'Operasional'}</span><span class="mono tnum {row.paid ? 'bd-pct-paid' : 'sensitive-amt'}">{row.metricText}</span></div>
        <div class="breakdown-track"><div class="breakdown-fill" class:paid={row.paid} style:width={row.width + '%'}></div></div>
      </div>
    {/each}
  </div>
</article>

<style>
  :global {
    /* === WIDGETS — layout utilities, export & profile cards, chart frames === */

    .flex-between {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-3);
      margin-bottom: var(--sp-3);
    }

    .flex-align-gap {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
    }

    .text-primary { color: var(--accent-strong); }
    .text-muted { color: var(--text-muted); }
    .text-sm-muted { font-size: 13px; color: var(--text-muted); }
    .flex-1 { flex: 1; }

    .max-h-55vh {
      max-height: 55vh;
      border: 1px solid var(--border);
      border-radius: var(--r-md);
    }

    .max-h-45vh {
      max-height: 45vh;
      border: 1px solid var(--border);
      border-radius: var(--r-md);
    }

    /* Table header cells inherit the ledger header tone. */
    .th-bg { background: var(--table-header-bg); }
    .th-bg-nowrap { background: var(--table-header-bg); white-space: nowrap; }

    .td-muted-center {
      text-align: center;
      padding: 20px;
      color: var(--text-muted);
    }

    .skip-month-body {
      margin-top: var(--sp-3);
      display: grid;
      gap: var(--sp-3);
    }

    .skip-month-input-row {
      display: flex;
      gap: var(--sp-2);
      align-items: center;
    }

    .skipped-months-container {
      max-height: 300px;
      overflow: auto;
      display: grid;
      gap: var(--sp-2);
      scrollbar-gutter: stable;
    }

    .mb-16 { margin-bottom: 16px; }
    .form-row-flex {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .min-w-200 { min-width: 200px; }
    .w-160 { width: 160px; }
    .w-140 { width: 140px; }
    .w-130 { width: 130px; }
    .w-120 { width: 120px; }
    .w-110 { width: 110px; }
    .w-100 { width: 100px; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-main { color: var(--text-main); }
    .fs-24 { font-size: 24px; }

    /* Queue & export modal styles consolidated into queue.css and modals.css */

    .bg-primary-15 {
      background: var(--accent-tint);
      color: var(--accent-strong);
      border: 1px solid var(--accent-border);
    }

    /* WhatsApp icon/button — semantic zero-green ocean/paid palette */
    .bg-wa-15 {
      background: var(--income-bg);
      color: var(--income-strong);
      border: 1px solid var(--income-border);
    }
    body.dark-mode .bg-wa-15 {
      background: var(--income-bg);
      color: var(--income-strong);
      border: 1px solid var(--income-border);
    }

    .btn-wa {
      background: var(--income);
      color: #fff;
      border: 1px solid var(--income-strong);
    }
    .btn-wa:hover, .btn-wa:focus-visible {
      background: var(--income-strong);
      border-color: var(--income-strong);
      color: #fff;
    }
    body.dark-mode .btn-wa {
      background: var(--income);
      color: #051229;
      border-color: var(--income-border);
    }
    body.dark-mode .btn-wa:hover {
      background: var(--income-strong);
    }

    .bg-secondary-10 {
      background: var(--surface-2);
      border: 1px solid var(--border-strong);
      color: var(--secondary);
    }

    .text-secondary { color: var(--secondary); }

    .btn-submit-large {
      width: 100%;
      padding: var(--sp-4);
      margin-top: var(--sp-6);
      border-radius: var(--r-lg);
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    .selection-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--sp-4);
    }

    .selection-label {
      margin-bottom: 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-main);
    }

    .d-block { display: block; }

    .badge-count-terpilih {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 500;
      color: var(--accent-strong);
      background: var(--accent-tint);
      border: 1px solid var(--accent-border);
      padding: 1px 8px;
      border-radius: var(--r-sm);
      margin-left: 6px;
    }

    .btn-select-all {
      padding: 6px 16px;
      font-size: 13px;
      border-radius: var(--r-pill);
    }

    .summary-ops-tipe-badge {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-main);
    }

    .textarea-ops {
      min-height: 120px;
      resize: none;
      padding-top: 16px;
    }

    /* Filled warning surface: the canvas colour reads as ink on top of it in
       both themes. */
    .btn-submit-warning {
      background-color: var(--warning) !important;
      color: var(--bg-color) !important;
      width: 100%;
      padding: 14px;
    }

    .mb-20 { margin-bottom: 20px; }
    .mb-24 { margin-bottom: 24px; }
    .p-12 { padding: 12px; }
    .col-span-2 { grid-column: span 2; }
    .flex-center { display: flex; justify-content: center; }

    /* === CHARTS === */
    .chart-grid-section {
      margin-bottom: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: var(--sp-4);
    }

    .chart-flat-card {
      box-shadow: none !important;
      border: 1px solid var(--border);
      margin-bottom: 0 !important;
      padding: var(--sp-4) !important;
    }

    .chart-header-strip {
      padding: 0 0 var(--sp-3) 0 !important;
      border-bottom: 1px solid var(--border);
      margin-bottom: var(--sp-3) !important;
      height: auto !important;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--sp-3);
    }

    .chart-card-title {
      font-family: var(--font-sans);
      font-size: 14px;
      font-weight: 600;
      letter-spacing: var(--tracking-tight);
      color: var(--text-main);
      background: none;
      -webkit-text-fill-color: initial;
      margin: 0;
    }

    .chart-update-text {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-faint);
    }

    .chart-wrapper-compact {
      height: 240px;
      margin-top: 0;
    }

    .chart-empty-note {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 0 var(--sp-4);
      font-size: 13px;
      color: var(--text-faint);
    }

    /* === STATISTICS HERO ===
       The cash-health percentage is the one hero figure of the statistics dialog. */
    .health-card .stat-card-value,
    #stat-health-pct {
      font-family: var(--font-display);
      font-size: clamp(2rem, 6vw, 3rem);
      font-weight: 600;
      line-height: 1.05;
      letter-spacing: var(--tracking-display);
      color: var(--accent-strong);
    }

    /* === MEMBER PROFILE === */
    .profile-modal-card { max-width: 440px !important; width: 100%; }
    .profile-card-title {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 4px;
    }
    .profile-meta-row { display: flex; align-items: center; gap: var(--sp-2); }
    .profile-id-badge {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
      background: var(--surface-2);
      padding: 1px 6px;
      border-radius: var(--r-sm);
      border: 1px solid var(--border);
    }
    .profile-metrics-card-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .profile-metric-item {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .profile-metric-label {
      font-family: var(--font-mono);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: var(--tracking-eyebrow);
      color: var(--text-faint);
      font-weight: 500;
    }
    .profile-metric-val {
      font-family: var(--font-mono);
      color: var(--accent-strong);
      font-size: 15px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .profile-metric-plain {
      font-family: var(--font-mono);
      font-size: 15px;
      font-weight: 600;
      color: var(--text-main);
      font-variant-numeric: tabular-nums;
    }
    .profile-history-title {
      margin-bottom: var(--sp-2);
      font-family: var(--font-mono);
      font-weight: 500;
      font-size: 11px;
      color: var(--text-faint);
      display: flex;
      align-items: center;
      gap: 6px;
      text-transform: uppercase;
      letter-spacing: var(--tracking-eyebrow);
    }
    .profile-history-list {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
      max-height: 240px;
      overflow-y: auto;
      padding-right: 4px;
      scrollbar-gutter: stable;
    }
    .profile-trx-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      padding: 10px var(--sp-3);
      transition: border-color var(--t-fast);
    }
    .profile-trx-card:hover { border-color: var(--border-strong); }
    .profile-trx-main { display: flex; align-items: center; gap: 10px; }
    .profile-trx-badge-icon {
      width: 28px;
      height: 28px;
      border-radius: var(--r-sm);
      background: var(--accent-tint);
      border: 1px solid var(--accent-border);
      color: var(--accent-strong);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      flex-shrink: 0;
    }
    .profile-trx-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .profile-trx-title { font-size: 13px; font-weight: 600; color: var(--text-main); }
    .profile-trx-date {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
    }
    .profile-trx-nominal {
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      text-align: right;
      flex-shrink: 0;
      font-variant-numeric: tabular-nums;
    }

    .profile-history-empty {
      text-align: center;
      padding: var(--sp-6) var(--sp-3);
      font-size: 12px;
      color: var(--text-muted);
      background: var(--surface-2);
      border: 1px dashed var(--border-strong);
      border-radius: var(--r-md);
    }

    /* === SPACING / TEXT UTILITIES === */
    .fs-18 { font-size: 18px; }
    .fs-22 { font-size: 22px; }
    .m-0 { margin-bottom: 0 !important; }
    .p-10 { padding: 10px; }
    .pr-20 { padding-right: 20px; }
    .text-right { text-align: right; }

    .btn-load-more {
      width: 38px;
      height: 38px;
      min-height: 38px;
      min-width: 38px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border-strong);
      background: var(--surface);
      box-shadow: 0 4px 12px rgba(14, 36, 55, 0.12);
      border-radius: var(--r-pill);
      color: var(--text-muted);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      transition: transform 0.18s cubic-bezier(0.32, 0.72, 0, 1), background var(--t-fast), border-color var(--t-fast), color var(--t-fast), box-shadow var(--t-fast);
    }

    .btn-load-more:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--surface-2);
      border-color: var(--accent);
      color: var(--accent-strong);
      box-shadow: 0 4px 12px rgba(14, 36, 55, 0.12);
    }

    .btn-load-more:active:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      transform: scale(0.97);
      transition-duration: 0.1s;
      box-shadow: 0 2px 6px rgba(14, 36, 55, 0.12);
    }

    body.dark-mode .btn-load-more {
      background: var(--surface-2);
      border-color: var(--border);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    }

    body.dark-mode .btn-load-more:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--surface-3);
      border-color: var(--accent);
      color: var(--accent-strong);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    }

    .table-header-left {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      flex-shrink: 0;
    }

    .th-member-col {
      text-align: left !important;
      min-width: 180px;
      padding-left: var(--sp-4);
      /* --text-muted on the table header (--surface-2) is 4.90:1, just under AA. */
      color: var(--text-faint);
    }

    .mobile-loading-wrap {
      padding: 20px;
      text-align: center;
    }

    .h-100 { height: 100px; }
    .w-full { width: 100%; }

    .mt-24 { margin-top: 24px; }
    .mt-8 { margin-top: 8px; }
    .relative { position: relative; }
    .pl-48 { padding-left: 48px; }
    .text-xs-muted {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .icon-input-left {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 18px;
    }

    .form-group-auth {
      margin-bottom: 20px;
      position: relative;
    }

    .sheet-title-sm {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 600;
      letter-spacing: var(--tracking-tight);
      margin-bottom: 10px;
    }

    .sheet-title-md {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 600;
      letter-spacing: var(--tracking-tight);
      margin-bottom: 16px;
    }

    .min-w-0 { min-width: 0; }

    .qp-member-name {
      font-weight: 600;
      font-size: 15px;
      color: var(--text-main);
    }

    .qp-member-period {
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--text-muted);
    }

    .input-qp-nominal {
      font-family: var(--font-mono);
      font-weight: 600;
      font-size: 16px;
      font-variant-numeric: tabular-nums;
    }

    .mb-0 { margin-bottom: 0 !important; }
    .text-warning { color: var(--warning); }

    /* Adversarial layout & overflow hardening for #workspace-stats */
    #workspace-stats.analytics-grid .chart-card { min-width: 0; max-width: 100%; }
    #workspace-stats .chart-card > .chart-head > div:first-child { min-width: 0; flex: 1 1 180px; }
    #workspace-stats .chart-card .chart-title,
    #workspace-stats .chart-card .page-subtitle { min-width: 0; overflow-wrap: anywhere; }
    #workspace-stats .chart-figure,
    #workspace-stats .chart-stage { min-width: 0; max-width: 100%; }
    #workspace-stats #hybrid-cashflow.chart-svg { width: 100%; max-width: 100%; height: auto; display: block; overflow: hidden; }
    #workspace-stats #hybrid-chart-readout.chart-tooltip-box { min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
    #workspace-stats #hybrid-chart-readout.chart-tooltip-box > * { min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
    #workspace-stats #hybrid-analytics-breakdown { min-width: 0; }
    #workspace-stats #hybrid-analytics-breakdown .breakdown-row { min-width: 0; }
    #workspace-stats #hybrid-analytics-breakdown .breakdown-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 4px 10px;
      min-width: 0;
    }
    #workspace-stats #hybrid-analytics-breakdown .breakdown-meta > span:first-child {
      flex: 1 1 120px;
      min-width: 0;
      overflow-wrap: anywhere;
      line-height: 1.35;
    }
    #workspace-stats #hybrid-analytics-breakdown .breakdown-meta > .mono.tnum {
      flex-shrink: 0;
      max-width: 100%;
      overflow-wrap: anywhere;
      text-align: end;
      margin-inline-start: auto;
    }
    @media (max-width: 768px) {
      #workspace-stats.analytics-grid .chart-card { padding: 16px; }
    }
    @media (max-width: 480px) {
      #workspace-stats .chart-card > .chart-head { display: flex; flex-wrap: wrap; align-items: flex-start; }
      #workspace-stats .chart-card > .chart-head .btn-secondary { height: auto; min-height: 44px; white-space: normal; }
      #workspace-stats #hybrid-chart-readout.chart-tooltip-box { grid-template-columns: minmax(0, 1fr); gap: 6px; }
    }
  }
</style>
