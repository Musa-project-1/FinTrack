<script lang="ts">
  import { untrack } from 'svelte';
  import { NAMA_BULAN } from 'finkas/core/config';
  import { animateHybridAmount } from 'finkas/hybrid-motion';
  import { dashboardStore as vm, setSelectedSparkMonth } from '../stores/store.svelte';

  let saldo: HTMLDivElement, masuk: HTMLSpanElement, keluar: HTMLSpanElement;
  const period = $derived(vm.sparkSeries[vm.selectedMonthIndex]);
  const point = $derived(vm.sparkPoints[vm.selectedMonthIndex]);
  const month = $derived(period ? NAMA_BULAN[period.monthIndex] : '');
  const amount = $derived(period ? vm.format(period.balance) : '');
  const sparkValueLabel = $derived(period ? `${month.slice(0, 3)}: ${amount}` : '');
  const sparkAriaValueText = $derived(period ? `${month} ${period.year}: ${amount}` : '');

  function scrub(event: PointerEvent & { currentTarget: HTMLDivElement }) {
    if (event.pointerType !== 'mouse' || event.buttons !== 0) return;
    const { left, width } = event.currentTarget.getBoundingClientRect();
    if (width) setSelectedSparkMonth(11 * (event.clientX - left) / width);
  }

  function animate(node: HTMLElement, value: number) {
    animateHybridAmount(node, value, { format: vm.format, from: untrack(() => vm.firstRender) ? 0 : undefined });
  }
  $effect(() => animate(saldo, vm.saldo));
  $effect(() => animate(masuk, vm.totalMasuk));
  $effect(() => animate(keluar, vm.totalKeluar));
</script>

<article class="bento-kpi bento-balance hybrid-card" data-cascade="0">
  <div class="bento-kpi-heading"><h2>Saldo Kas Aktif</h2><span aria-hidden="true"><i class="ph ph-wallet"></i></span></div>
  <div class="bento-balance-main">
    <div id="ui-saldo" class="balance-hero__value bento-amount sensitive-amt" bind:this={saldo} style:--amount-length={vm.saldoLength}>Rp 0</div>
    <div class="bento-spark">
      <output id="bento-spark-value" class="nominal-val" for="bento-spark-month">{sparkValueLabel}</output>
      <!-- svelte-ignore a11y_no_static_element_interactions (hover supplements the native range input) -->
      <div class="bento-spark-plot" onpointermove={scrub}>
        <svg viewBox="0 0 116 44" aria-hidden="true" focusable="false">
          <path id="bento-spark-area" d={vm.sparkAreaPath}></path>
          <path id="bento-spark-path" d={vm.sparkLinePath}></path>
          <line id="bento-spark-guide" x1={point?.[0].toFixed(1)} x2={point?.[0].toFixed(1)} y1="2" y2="42"></line>
          <circle id="bento-spark-marker" cx={point?.[0].toFixed(1)} cy={point?.[1].toFixed(1)} r="3.2"></circle>
        </svg>
        <input id="bento-spark-month" type="range" min="0" max="11" value={vm.selectedMonthIndex}
          oninput={event => setSelectedSparkMonth(event.currentTarget.valueAsNumber)} aria-valuetext={sparkAriaValueText} aria-label="Bulan saldo kas">
      </div>
    </div>
  </div>
  <div class="bento-compliance">
    <div><span id="bento-compliance-label">{vm.hasDueTarget ? `${vm.compliancePercent}% Lunas Tahun Ini` : 'Belum ada iuran jatuh tempo'}</span><span id="bento-dues-fee">Iuran {vm.format(vm.monthlyFee)}/bln</span></div>
    <div class="bento-compliance-track" id="bento-compliance" role="progressbar" aria-valuenow={vm.compliancePercent} aria-label="Kepatuhan iuran tahun ini"><div class="bento-compliance-fill" style:width={`${vm.compliancePercent}%`}></div></div>
  </div>
</article>
<button type="button" class="bento-kpi bento-flow bento-in hybrid-card" data-cascade="1" data-action="bento-history" data-filter="masuk" aria-label="Buka riwayat pemasukan" aria-describedby="ui-masuk">
  <span class="bento-kpi-heading"><strong>Total Pemasukan</strong><span aria-hidden="true"><i class="ph ph-arrow-down-left"></i></span></span>
  <span class="bento-money sensitive-amt" id="ui-masuk" bind:this={masuk} data-amount-prefix="+">+Rp 0</span>
  <span class="bento-flow-link"><span id="bento-inflow-detail">{vm.depositsCount ? `Dari ${vm.depositsCount} setoran iuran & donasi` : 'Belum ada pemasukan'}</span><span class="bento-drill-label">Masuk <i class="ph ph-arrow-right" aria-hidden="true"></i></span></span>
</button>
<button type="button" class="bento-kpi bento-flow bento-out hybrid-card" data-cascade="2" data-action="bento-history" data-filter="keluar" aria-label="Buka riwayat pengeluaran" aria-describedby="ui-keluar">
  <span class="bento-kpi-heading"><strong>Total Pengeluaran</strong><span aria-hidden="true"><i class="ph ph-arrow-up-right"></i></span></span>
  <span class="bento-money sensitive-amt" id="ui-keluar" bind:this={keluar} data-amount-prefix="−">−Rp 0</span>
  <span class="bento-flow-link"><span id="bento-outflow-detail">{vm.largestExpenseCategory ? `Terbesar: ${vm.largestExpenseCategory} (${vm.format(vm.largestExpenseAmount)})` : 'Belum ada pengeluaran'}</span><span class="bento-drill-label">Keluar <i class="ph ph-arrow-right" aria-hidden="true"></i></span></span>
</button>

<style>
  :global {
    .bento-dashboard {
      display: grid;
      grid-template-columns: minmax(0, 1.55fr) repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .bento-kpi {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
      min-width: 0;
      padding: 20px 22px;
      border: 1px solid var(--border);
      border-radius: 20px;
      background: color-mix(in oklab, var(--surface) 90%, transparent);
      color: var(--text-main);
      box-shadow: var(--shadow-card);
      text-align: start;
    }

    .bento-balance {
      border-color: var(--income-border);
      background: linear-gradient(145deg, var(--income-bg), transparent 55%), var(--surface);
      container-type: inline-size;
    }

    .bento-kpi-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      color: var(--text-muted);
    }

    .bento-kpi-heading :is(h2, strong) {
      font: inherit;
      font-weight: 700;
      font-size: 12.5px;
      letter-spacing: .04em;
      text-transform: uppercase;
    }

    .bento-kpi-heading > span {
      flex: none;
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      font-size: 16px;
      background: var(--income-bg);
      color: var(--income-strong);
    }

    .bento-out .bento-kpi-heading > span {
      background: var(--surface-2);
      color: var(--text-main);
    }

    .bento-balance-main {
      min-width: 0;
      display: grid;
      align-items: end;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 14px;
    }

    .bento-balance .bento-amount {
      --amount-length: 4;
      --amount-width: calc(100cqw - 130px);
      margin: 0;
      align-self: end;
      color: var(--text-main);
      font-family: var(--font-sans);
      font-variant-numeric: tabular-nums;
      font-size: min(clamp(1.5rem, 2.8vw, 2.125rem), calc(var(--amount-width) / var(--amount-length) * 1.45));
      font-weight: 800;
      line-height: 1.08;
      letter-spacing: -.03em;
      white-space: nowrap;
      overflow: visible;
      text-overflow: clip;
    }

    .bento-spark {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 5px;
      min-width: 0;
      color: var(--income);
    }

    #bento-spark-value {
      position: relative;
      display: block;
      width: fit-content;
      max-width: 100%;
      padding: 2px 8px;
      color: var(--income-strong);
      background: var(--income-bg);
      border: 1px solid var(--income-border);
      border-radius: var(--r-pill);
      font: 700 11px/1.5 var(--font-mono);
      letter-spacing: normal;
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }

    .bento-spark-plot { position: relative; }
    .bento-spark svg { display: block; width: 116px; height: 44px; }
    #bento-spark-area { fill: color-mix(in oklab, var(--income) 16%, transparent); }
    #bento-spark-path { fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
    #bento-spark-guide { opacity: 0; transition: opacity 140ms ease; }
    #bento-spark-marker { opacity: 0.85; transition: opacity 140ms ease, r 140ms ease; }
    #bento-spark-guide { stroke: currentColor; stroke-width: 1.25; stroke-dasharray: 2 2; }
    #bento-spark-marker { fill: var(--surface); stroke: currentColor; stroke-width: 2.2; }
    .bento-spark-plot:is(:hover,:focus-within) :is(#bento-spark-guide,#bento-spark-marker) { opacity: 1; }

    .bento-spark input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 44px;
      opacity: 0;
      cursor: ew-resize;
      touch-action: pan-y;
    }

    .bento-spark:focus-within {
      outline: 2px solid var(--accent);
      outline-offset: 3px;
      border-radius: 6px;
    }

    .bento-compliance,
    .bento-flow-link {
      border-top: 1px solid color-mix(in oklab, var(--border) 75%, transparent);
      padding-top: 10px;
    }

    .bento-compliance { display: grid; gap: 6px; }
    .bento-compliance > div, .bento-flow-link {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      color: var(--text-muted);
      font-size: 12px;
    }
    .bento-compliance > div { gap: 10px; font-variant-numeric: tabular-nums; }
    #bento-compliance-label {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: var(--r-pill);
      background: var(--income-bg);
      color: var(--income-strong);
      font-size: 11.5px;
      font-weight: 600;
    }
    .bento-compliance-track {
      height: 6px;
      border-radius: var(--r-pill);
      background: var(--surface-3);
      overflow: hidden;
    }
    .bento-compliance-fill {
      height: 100%;
      width: 0;
      border-radius: inherit;
      background: var(--income);
      transition: width 520ms var(--hybrid-ease-out);
    }

    .bento-flow { cursor: pointer; }
    .bento-drill-label { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; }
    .bento-drill-label i { transition: transform 160ms var(--hybrid-ease-out); }
    @media (hover: hover) and (pointer: fine) {
      .bento-flow:hover { border-color: var(--border-strong); }
      .bento-flow:hover .bento-drill-label i { transform: translateX(3px); }
    }
    .bento-flow:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .bento-in { color: var(--income-strong); }
    .bento-money {
      font: 800 clamp(1.5rem, 2.8vw, 2.125rem)/1.08 var(--font-sans);
      font-variant-numeric: tabular-nums;
      letter-spacing: -.03em;
      overflow-wrap: anywhere;
    }

    @media (max-width: 980px) {
      .bento-dashboard { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .bento-balance { grid-column: 1 / -1; }
    }

    @media (max-width: 768px) {
      body.header-stats-active .bento-dashboard { display: grid !important; }
      .bento-dashboard { grid-template-columns: minmax(0, 1fr); }
      .bento-kpi { padding: 16px 18px; }
    }

    @media (max-width: 540px) {
      .bento-balance-main { grid-template-columns: minmax(0, 1fr); gap: 10px; }
      .bento-balance .bento-amount { --amount-width: 100cqw; }
      .bento-spark { flex-direction: row; align-items: center; justify-content: space-between; }
    }

    @media (prefers-reduced-motion: reduce) {
      .bento-compliance-fill,
      .bento-drill-label i,
      #bento-spark-guide,
      #bento-spark-marker {
        transition: none;
      }
    }
  }
</style>
