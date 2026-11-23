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
      <td class="text-center" class:td-skipped={!cell.owed} data-col-month={cell.idx} title={cell.title}>
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

<style>
  :global {
    /* === HELPERS — riwayat summary, metric pills, ledger cell classes === */

    /* Quick summary bar for filtered riwayat transactions */
    .riwayat-summary-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px var(--sp-3);
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      margin-bottom: var(--sp-3);
      font-size: 13px;
    }

    .riwayat-summary-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .riwayat-summary-label {
      font-family: var(--font-mono);
      font-size: 10.5px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: var(--tracking-eyebrow);
      color: var(--text-faint);
    }

    .riwayat-summary-value {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--text-main);
      font-variant-numeric: tabular-nums;
    }

    .riwayat-summary-metrics {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
    }

    /* metric pills: monospace, tabular, one accent for inflow, neutral for outflow */
    .metric-pill {
      font-family: var(--font-mono);
      font-size: 10.5px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: var(--r-sm);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .metric-in {
      background: var(--accent-tint);
      color: var(--accent-strong);
      border: 1px solid var(--accent-border);
    }

    /* Outflow is neutral by design — the minus sign carries the meaning. */
    .metric-out {
      background: var(--surface-2);
      color: var(--text-main);
      border: 1px solid var(--border);
    }

    @media (max-width: 768px) {
      .riwayat-summary-bar {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        padding: 10px var(--sp-3);
      }

      .riwayat-summary-metrics {
        width: 100%;
        justify-content: flex-start;
      }
    }

    .iuran-cards-empty {
      text-align: center;
      padding: 30px;
      color: var(--text-muted);
      font-size: 13px;
    }

    /* Checkbox items for iuran selection */
    .item-disabled-lunas {
      background: var(--surface-2) !important;
      border-color: var(--border) !important;
      cursor: not-allowed !important;
      opacity: 0.6;
      box-shadow: none !important;
    }

    .chk-info-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .chk-name-lunas {
      color: var(--text-muted);
      text-decoration: line-through;
      font-size: 13px;
      font-weight: 500;
    }

    .chk-badge-lunas {
      font-family: var(--font-mono);
      font-size: 9.5px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--accent-strong);
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .chk-name-pending {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
    }

    .chk-badge-pending {
      font-family: var(--font-mono);
      font-size: 9.5px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-faint);
      font-weight: 500;
    }

    /* Date group header inside the ledger — a mono eyebrow rule. */
    .td-date-group-header {
      background: var(--surface-2);
      padding: var(--sp-3) var(--sp-4);
      font-family: var(--font-mono);
      font-weight: 500;
      color: var(--text-faint);
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: var(--tracking-eyebrow);
      border-bottom: 1px solid var(--border);
    }

    .trx-subnote {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
      display: block;
    }

    /* Period tag next to a member name */
    .trx-period {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 10.5px;
      font-weight: 500;
      color: var(--text-muted);
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      padding: 1px 6px;
      margin-left: 8px;
      vertical-align: middle;
      white-space: nowrap;
    }

    .trx-category-title {
      color: var(--text-main);
      font-weight: 600;
    }

    .fs-16 { font-size: 16px; }
    .text-danger { color: var(--danger); }

    .td-center-nowrap {
      text-align: center;
      white-space: nowrap;
      vertical-align: middle;
    }

    .td-time-col {
      white-space: nowrap;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-muted);
      vertical-align: middle;
    }

    .td-nominal-col {
      font-family: var(--font-mono);
      font-weight: 600;
      font-size: 14px;
      vertical-align: middle;
      font-variant-numeric: tabular-nums;
      color: var(--text-main);
    }

    .va-middle { vertical-align: middle; }

    .td-audit-time {
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .ws-nowrap { white-space: nowrap; }

    .audit-action-tag {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-weight: 500;
      color: var(--text-muted);
    }

    .td-audit-detail {
      font-size: 12.5px;
      color: var(--text-main);
      word-break: break-word;
    }

    .td-id-col {
      font-family: var(--font-mono);
      font-size: 11.5px;
      font-weight: 500;
      color: var(--text-muted);
    }

    .td-name-col {
      font-weight: 600;
      color: var(--text-main);
    }

    .td-wa-col {
      font-family: var(--font-mono);
      color: var(--text-muted);
      font-size: 12.5px;
    }

    .td-action-cell {
      text-align: center;
      white-space: nowrap;
    }

    .btn-compact-action {
      padding: 4px 8px;
      font-size: 11px;
    }

    .ml-4 { margin-left: 4px; }

    .pending-card-row {
      display: flex;
      justify-content: space-between;
      gap: var(--sp-3);
      align-items: center;
    }

    .pending-card-action {
      font-weight: 600;
      color: var(--text-main);
    }

    .pending-card-time {
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--text-muted);
    }

    .pending-card-payload {
      margin-top: 6px;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--text-muted);
    }

    .toast-icon-success {
      color: var(--accent-strong);
      font-size: 22px;
    }

    .toast-icon-danger {
      color: var(--danger);
      font-size: 22px;
    }

    .td-desc-text {
      font-size: 13px;
      font-weight: 600;
    }

    .td-nom-primary {
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .skip-month-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px var(--sp-3);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      background: var(--surface);
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    .fw-700 { font-weight: 700; }
  }
</style>
