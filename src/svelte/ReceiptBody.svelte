<script lang="ts">
  import { receiptStore as vm, renderPassbookEmblem } from './receipt.svelte';
</script>

<div class="receipt-meta">
  <span class="meta-chip" class:paid={!vm.pending}>
    <i class={vm.pending ? 'ph ph-clock' : 'ph-fill ph-check-circle'} aria-hidden="true"></i>
    {vm.pending ? 'Menunggu sinkron' : 'Tercatat Sah'}
  </span>
  <span>{vm.dateLabel}</span>
</div>
<p class="receipt-amount nominal-val" data-flow={vm.incoming ? 'in' : 'out'}>{vm.incoming ? '+' : '−'}{vm.amount}</p>
<dl class="receipt-rows">
  {#each vm.rows as [name, value]}
    <dt>{name}</dt><dd>{value}</dd>
  {/each}
</dl>
<footer class="receipt-footer">
  <div class="receipt-seal" data-tone={vm.incoming && !vm.pending ? 'verified' : 'neutral'}>
    <span class="receipt-seal-ico">
      {#if vm.pending}
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="16" cy="16" r="13"/><path d="M16 9v7l5 3"/>
        </svg>
      {:else}
        {@html renderPassbookEmblem('paid', vm.stampStyle)}
      {/if}
    </span>
    <span class="receipt-seal-copy">
      <strong>{vm.footer}</strong>
      <span>{vm.pending ? 'Antrean perangkat' : 'Segel Digital Bendahara'} · {vm.group}</span>
    </span>
    <span class="receipt-seal-year">{vm.year}</span>
  </div>
</footer>
