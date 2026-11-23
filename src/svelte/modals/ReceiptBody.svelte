<script lang="ts">
  import { receiptStore as vm, renderPassbookEmblem } from '../stores/receipt.svelte';
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

<style>
  :global {
    .modal-overlay.guided-tour[open] {
      position:fixed; inset:0; padding:0; overflow:hidden; background:transparent;
    }
    .guided-tour::backdrop { background:transparent; }
    .guided-tour-highlight {
      position:fixed; border:2px solid var(--accent);
      border-radius:14px; box-shadow:0 0 0 150vmax rgb(5 10 23 / .68);
      pointer-events:none;
    }
    .guided-tour .guided-tour-card {
      position:fixed; width:min(380px,calc(100vw - 16px)); max-height:calc(100dvh - 20px);
      padding:16px; border-radius:16px; transform:none;
    }
    .guided-tour-head { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
    .guided-tour-head-text { min-width:0; }
    #guided-tour-count { color:var(--accent-strong); font:700 11px var(--font-mono); }
    #guided-tour-title { margin:2px 0 0; font-size:18px; font-weight:800; }
    #guided-tour-title:focus { outline:none; }
    #guided-tour-description { font-size:13px; color:var(--text-muted); }
    .guided-tour-actions { display:flex; flex-wrap:wrap; gap:6px; justify-content:end; margin-top:14px; }
    .guided-tour-actions button { min-height:44px; }
    .guided-tour-actions [hidden] { display:none; }
    .faq-tabs { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .faq-tabs .tab-btn, #tab-faq-glossary > .btn { min-height:44px; }
  }
</style>
