<script lang="ts">
  import { selectStatsMonth, statsStore as vm } from './stats.svelte';

  const hitTargets: SVGRectElement[] = [];
  let curvePathEl = $state<SVGPathElement>();
  let month = $derived(vm.months[vm.selectedMonth]);

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
      <svg class="chart-svg" id="hybrid-cashflow" viewBox="0 0 720 250" role="img" aria-label="Arus kas 12 bulan dan tren saldo">
        {#if vm.ready}
          {#each vm.gridLines as gl}
            <line x1="44" y1={gl.y} x2="704" y2={gl.y} stroke="var(--border)" stroke-dasharray={gl.dashed ? '3 4' : undefined} stroke-width="1" />
            <text x="36" y={gl.y + 4} text-anchor="end" fill="var(--text-muted)" font-size="10" font-family="var(--font-mono)">{gl.tickLabel}</text>
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
        <div class="breakdown-meta"><span>{row.label}</span><span class="mono tnum {row.paid ? 'bd-pct-paid' : 'sensitive-amt'}">{row.metricText}</span></div>
        <div class="breakdown-track"><div class="breakdown-fill" class:paid={row.paid} style:width={row.width + '%'}></div></div>
      </div>
    {/each}
  </div>
</article>
