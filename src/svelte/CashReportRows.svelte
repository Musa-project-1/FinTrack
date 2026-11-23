<script lang="ts">
  import { cashReportStore } from './cash-report.svelte';
</script>

{#if cashReportStore.details.length === 0}
  <tr><td colspan="6" class="td-muted-center">Tidak ada transaksi tercatat pada periode {cashReportStore.month}.</td></tr>
{:else}
  {#each cashReportStore.details as item, idx (item.key)}
    <tr data-type={item.isIn ? 'in' : 'out'}>
      <td class="col-no report-row-num">{idx + 1}</td>
      <td class="col-waktu report-row-time">
        <div class="report-row-date">{item.dateStr}</div>
        <div class="report-row-clock">{item.timeStr} WIB</div>
      </td>
      <td class="col-ket report-row-desc">
        <div>{#if item.keterangan}{item.keterangan}{:else}<span class="text-muted">({item.isIn ? 'Pemasukan' : 'Pengeluaran'})</span>{/if}</div>
        {#if item.metaText}<div class="report-row-meta">{item.metaText}</div>{/if}
      </td>
      <td class="col-amt report-row-amt report-row-in {item.isIn ? 'is-income' : 'is-muted'}">{item.isIn ? '+' + item.nominalFormatted : '-'}</td>
      <td class="col-amt report-row-amt report-row-out {item.isIn ? 'is-muted' : 'is-danger'}">{item.isIn ? '-' : '-' + item.nominalFormatted}</td>
      <td class="col-saldo report-row-saldo">{item.balanceFormatted}</td>
    </tr>
  {/each}
{/if}
