<script lang="ts">
  import { selfPayStore as vm } from './self-pay.svelte';
</script>

{#each vm.years as group (group.year)}
  <div>
    {#if vm.showYearHeading}
      <h4 class="self-pay-year">{group.year}</h4>
    {/if}
    <div class="self-pay-month-grid">
      {#each group.months as m (m.periodKey)}
        <button type="button" class="self-pay-month" data-payment-period={m.periodKey} data-status={m.status}
          disabled={m.disabled} aria-pressed={String(m.pressed)} aria-label={m.ariaLabel}>
          <span>{m.shortLabel}</span><small>{m.pressed ? 'PILIH' : m.statusUpper}</small>
        </button>
      {/each}
    </div>
  </div>
{/each}
