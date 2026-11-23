<script lang="ts">
  import { cashReportStore } from './cash-report.svelte';
</script>

{#if cashReportStore.hasErrors && cashReportStore.invalidCount > 0}
  <div class="report-invalid-alert">
    <div class="report-invalid-head">
      <i class="ph-bold ph-warning-circle" aria-hidden="true"></i>
      <span>Perhatian: Ditemukan {cashReportStore.invalidCount} transaksi invalid yang dilewati dari buku kas!</span>
    </div>
    <div class="report-invalid-sub">Periksa data berikut agar uang kas tidak hilang tanpa pencatatan:</div>
    <ul class="report-invalid-list">
      {#each cashReportStore.invalidSample as bad, i (i + '-' + bad.id)}
        <li><b>{bad.id}</b>: {bad.reason}</li>
      {/each}
      {#if cashReportStore.moreCount > 0}
        <li>...dan {cashReportStore.moreCount} data lainnya</li>
      {/if}
    </ul>
  </div>
{/if}
