<script lang="ts">
  import { skippedMonthsStore } from './master.svelte';
</script>

{#if skippedMonthsStore.items.length === 0}
  <div class="text-muted">Belum ada bulan libur yang diatur.</div>
{:else}
  {#each skippedMonthsStore.items as item (item.mm)}
    <div class="skip-month-card">
      <span class="skip-month-label"><i class="ph ph-calendar-x" aria-hidden="true"></i><strong>{item.label}</strong></span>
      <div class="flex-align-gap">
        <button type="button" class="btn btn-outline btn-master-action btn-danger-outline admin-only" data-action="remove-skip" data-month={item.mm}>Hapus</button>
      </div>
    </div>
  {/each}
{/if}
