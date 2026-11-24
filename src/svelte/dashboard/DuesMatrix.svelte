<script lang="ts">
  import { renderLunasHtml } from 'finkas/dues-status';
  import { rekapStore as vm, resetRekapFilter } from '../stores/rekap.svelte';
  import { monthAction, type RekapCell } from '../stores/rekap-model';

  $effect(() => {
    const table = document.getElementById('ui-table-rekap')?.closest('table');
    if (!table) return;
    let active: string | null = null;
    function hover(col: string | null) {
      if (!table || active === col) return;
      table.querySelectorAll('.is-col-hover').forEach(el => el.classList.remove('is-col-hover'));
      active = col;
      if (col !== null) table.querySelectorAll(`[data-col-month="${col}"]`).forEach(el => el.classList.add('is-col-hover'));
    }
    const leave = () => hover(null);
    function over(event: PointerEvent) {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      const cell = (event.target as Element).closest('[data-col-month]');
      hover(cell?.getAttribute('data-col-month') ?? null);
    }
    function navigate(event: KeyboardEvent) {
      const button = (event.target as Element).closest<HTMLButtonElement>('.matrix-dues-button');
      const row = button?.closest('tr');
      if (!table || !row || !button || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const selector = '.matrix-dues-button:not(:disabled)';
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const buttons = Array.from(row.querySelectorAll<HTMLButtonElement>(selector));
        buttons[buttons.indexOf(button) + (event.key === 'ArrowRight' ? 1 : -1)]?.focus();
        return;
      }
      const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'));
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const col = button.closest('td')?.dataset.colMonth;
      for (let i = rows.indexOf(row) + delta; i >= 0 && i < rows.length; i += delta) {
        const next = rows[i].querySelector<HTMLButtonElement>(`td[data-col-month="${col}"] ${selector}`) ??
          rows[i].querySelector<HTMLButtonElement>(selector);
        if (next) { next.focus(); break; }
      }
    }
    table.addEventListener('pointerover', over);
    table.addEventListener('pointerleave', leave);
    table.addEventListener('keydown', navigate);
    return () => {
      leave();
      table.removeEventListener('pointerover', over);
      table.removeEventListener('pointerleave', leave);
      table.removeEventListener('keydown', navigate);
    };
  });
</script>

{#snippet content(cell: RekapCell)}
  {#if cell.isPaid}
    {@html renderLunasHtml(cell.isNewlyPaid, vm.stampStyle)}
  {:else}
    <span class="dues-month-status" data-status={cell.status}>{cell.status}{#if cell.status === 'Sebagian'}<small class="nominal-val">{cell.paidAmountText}</small>{/if}</span>
  {/if}
{/snippet}

{#each vm.rows as row (row.id)}
  <tr>
    <th scope="row" class="dues-name" class:is-pinned={row.isPinned}>
      <div class="dues-person">
        <button type="button" class="clickable-name" data-action="profil" data-id={row.id}>
          <span class="dues-member-row"><span class="dues-member-name" title={row.name}>{row.name}</span>{#if row.isPinned}<span class="self-pin-badge">Saya</span>{/if}</span>
          <span class="dues-member-sub">{row.subText}</span>
        </button>
        {#if !vm.isAdmin}
          <button type="button" class="dues-pin-btn" data-action="toggle-member-pin" data-id={row.id}
            aria-pressed={row.isPinned} aria-label={`${row.isPinned ? 'Lepas sematan' : 'Sematkan'} ${row.name}`}>
            <i class={`${row.isPinned ? 'ph-fill' : 'ph'} ph-push-pin`} aria-hidden="true"></i>
          </button>
        {/if}
      </div>
    </th>
    {#each row.cells as cell (cell.idx)}
      <td class="text-center" class:td-skipped={!cell.owed} class:is-newly-paid-cell={cell.isNewlyPaid} data-col-month={cell.idx} title={cell.title}>
        {#if cell.isPaid || cell.payable}
          {#key cell.isPaid ? 'receipt' : vm.isAdmin ? 'quickpay' : 'self-pay'}
            <button type="button" class="matrix-dues-button" {...monthAction(cell, row.id, vm.year, vm.isAdmin, false)}
              aria-label={cell.title}>{@render content(cell)}</button>
          {/key}
        {:else}
          {@render content(cell)}
        {/if}
      </td>
    {/each}
  </tr>
{:else}
  <tr><td colspan="13" class="td-muted-center">Tidak ada anggota ditemukan.{#if vm.hasActiveFilter} <button type="button" class="btn btn-secondary btn-reset-rekap-filter" onclick={resetRekapFilter}>Reset Filter</button>{/if}</td></tr>
{/each}
