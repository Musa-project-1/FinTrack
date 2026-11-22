<script lang="ts">
  import { untrack } from 'svelte';
  import { NAMA_BULAN } from '../core/config.js';
  import { animateHybridAmount } from 'finkas/hybrid-motion';
  import { dashboardStore as vm, setSelectedSparkMonth } from './store.svelte';

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
