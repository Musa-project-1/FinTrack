<script lang="ts">
  import { renderMiniStamp } from 'finkas/dues-status';
  import { rekapStore, resetRekapFilter } from './rekap.svelte';
  import { monthAction, type RekapCell } from './rekap-model';

  const vm = $derived(rekapStore.mobile);
</script>

{#snippet content(cell: RekapCell)}
  {#if cell.status === 'Lunas'}
    {@html renderMiniStamp(vm.stampStyle)}
  {:else if cell.status === 'Sebagian'}
    <i class="ph ph-hourglass-medium" aria-hidden="true"></i>
  {:else if cell.status === 'Nanti'}
    <i class="ph ph-calendar" aria-hidden="true"></i>
  {:else if cell.status === 'Libur'}
    <i class="ph ph-calendar-x" aria-hidden="true"></i>
  {/if}
  <span class="iuran-month-name">{cell.shortMon}</span>
  {#if cell.status === 'Sebagian'}<span class="sr-only">Sebagian {cell.paidAmountText}</span>{/if}
{/snippet}

{#each rekapStore.mobileRows as row (row.id)}
  <article class="iuran-member-card" class:is-pinned={row.isPinned} class:expanded={row.expanded}>
    <div class="iuran-card-header">
      <div class="iuran-card-main-info">
        <button type="button" class="iuran-card-name" data-action="profil" data-id={row.id} title={row.name}>{row.name}{#if row.isPinned}<span class="self-pin-badge">Saya</span>{/if}</button>
        <div class="iuran-progress-subtext">{row.subText}</div>
      </div>
      <span class="matrix-mobile-chip {row.chipClass}">{row.chipText}</span>
      {#if !vm.isAdmin}
        <button type="button" class="dues-pin-btn" data-action="toggle-member-pin" data-id={row.id}
          aria-pressed={row.isPinned} aria-label={`${row.isPinned ? 'Lepas sematan' : 'Sematkan'} ${row.name}`}>
          <i class={`${row.isPinned ? 'ph-fill' : 'ph'} ph-push-pin`} aria-hidden="true"></i>
        </button>
      {/if}
      <button type="button" class="iuran-card-toggle" data-action="toggle-card"
        aria-label={'Status bulanan ' + row.name} aria-controls={row.detailsId} aria-expanded={row.expanded}>
        <i class="ph-bold ph-caret-down" aria-hidden="true"></i>
      </button>
    </div>
    <div class="dues-mini-strip" aria-hidden="true">{#each row.stripStatuses as status}<span data-status={status}></span>{/each}</div>
    <div class="iuran-card-details" id={row.detailsId} inert={!row.expanded}>
      <div class="iuran-month-grid">
        {#each row.cells as cell (cell.idx)}
          {#if cell.isPaid || cell.payable}
            {#key cell.isPaid ? 'receipt' : vm.isAdmin ? 'quickpay' : 'self-pay'}
              <button type="button" class="iuran-month-item" data-status={cell.status}
                {...monthAction(cell, row.id, vm.year, vm.isAdmin, true)} aria-label={cell.title}>{@render content(cell)}</button>
            {/key}
          {:else}
            <div class="iuran-month-item" data-status={cell.status}>{@render content(cell)}</div>
          {/if}
        {/each}
      </div>
      <div class="iuran-action-buttons">
        {#if vm.isAdmin && row.firstDueMonthName}
          <button type="button" class="iuran-btn-pay" data-action="quickpay-card" data-anggota={row.id}
            data-bulan={row.firstDueMonthName}><i class="ph-bold ph-check-circle" aria-hidden="true"></i> Bayar</button>
        {/if}
        <button type="button" class="iuran-btn-detail" data-action="profil" data-id={row.id}>Buku Iuran</button>
      </div>
    </div>
  </article>
{:else}
  <div class="iuran-cards-empty">Tidak ada anggota ditemukan.{#if vm.hasActiveFilter} <button type="button" class="btn btn-secondary btn-reset-rekap-filter" onclick={resetRekapFilter}>Reset Filter</button>{/if}</div>
{/each}
