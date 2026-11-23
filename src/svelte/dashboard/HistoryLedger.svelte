<script lang="ts">
  import { historyStore as vm } from '../stores/history.svelte';
</script>

{#if vm.rows.length}
  {#each vm.rows as row, idx (row.id + ':' + idx)}
    <button type="button" class="ledger-row" data-action="open-receipt" data-id={row.id}>
      <span class="ledger-type-icon {row.flow}" aria-hidden="true"><i class="ph {row.inflow ? 'ph-arrow-down-left' : 'ph-arrow-up-right'}"></i></span>
      <span class="ledger-main">
        <span class="ledger-title" title={row.title}>{row.title}</span>
        <span class="ledger-meta"><span class="mono">{row.dateLabel}</span>
          <span class="cat-tag">{row.category}</span><span class="ledger-id">{row.id}</span></span>
      </span>
      <span class="ledger-amt-col"><span class="ledger-amt {row.flow} nominal-val sensitive-amt">{row.amountText}</span>
        <span class="ledger-action-hint">{row.hint}</span></span>
    </button>
  {/each}
{:else}
  <p class="hybrid-ledger-empty">Belum ada transaksi yang sesuai filter.</p>
{/if}
