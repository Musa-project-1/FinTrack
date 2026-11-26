<script lang="ts">
  import { spotlightStore as vm } from '../stores/spotlight.svelte';

  const INITIAL_VISIBLE_DESKTOP = 10;
  const INITIAL_VISIBLE_MOBILE = 5;
  let isMobileViewport = $state(false);
  let expanded = $state(false);

  $effect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = () => { isMobileViewport = mq.matches; };
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  });

  const initialLimit = $derived(isMobileViewport ? INITIAL_VISIBLE_MOBILE : INITIAL_VISIBLE_DESKTOP);
  const visibleItems = $derived(
    expanded ? vm.priorityItems : vm.priorityItems.slice(0, initialLimit)
  );
  const hiddenCount = $derived(Math.max(0, vm.priorityItems.length - initialLimit));
</script>

<div class="priority-heading">
  <span class="quick-cek-icon" aria-hidden="true"><i class="ph-fill ph-lightning"></i></span>
  <div class="priority-heading-copy"><h2 id="priority-title">{vm.priorityTitle}</h2><p id="priority-period">{vm.priorityPeriod}</p></div>
  <div class="priority-heading-actions">
    {#if hiddenCount > 0}
      <button type="button" class="priority-expand-btn" aria-expanded={expanded} onclick={() => { expanded = !expanded; }}>
        {expanded ? 'Ringkas' : `Lihat semua (+${hiddenCount})`}
      </button>
    {/if}
    <button type="button" class="btn" data-action="bulk-toggle" aria-pressed="false"><i class="ph ph-check-square" aria-hidden="true"></i> Pilih Banyak</button>
  </div>
</div>
<ul id="priority-members" class="priority-list">
  {#each visibleItems as item (item.memberId)}
    <li>
      <div class="priority-item-info" title={item.remainingLabel}>
        <span class="priority-item-name" title={item.remainingLabel}>{item.memberName}</span>
        <small class="priority-item-amount font-mono tabular-nums">{item.remainingLabel}</small>
      </div>
      <button type="button" class="priority-pay-btn" data-action="quickpay-card" data-anggota={item.memberId}
        data-bulan={item.monthName} data-year={String(item.year)} aria-label={`Lunasi iuran ${item.monthName} untuk ${item.memberName}`}>Lunasi {item.monthShort}</button>
    </li>
  {/each}
</ul>

<style>
  :global {
    .spotlight {
      min-width: 0;
      margin-block: 0 14px;
      padding: clamp(12px, 1.6vw, 20px);
      border: 1px solid var(--income-border);
      border-radius: 18px;
      background: linear-gradient(115deg, var(--income-bg), transparent 55%), var(--surface);
    }

    .spotlight[hidden], .spotlight [hidden] { display: none; }

    .priority-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .priority-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .bulk-dock {
      position: fixed;
      bottom: 20px;
      inset-inline: max(12px, calc((100% - 460px) / 2));
      z-index: 110;
      padding: 12px;
      border: 1px solid var(--accent-border);
      border-radius: 12px;
      background: var(--surface);
      box-shadow: var(--shadow-pop);
      opacity: 1;
      transform: translateY(0);
      transition:
        opacity 200ms var(--hybrid-ease-out),
        transform 240ms cubic-bezier(0.32, 0.72, 0, 1),
        display 200ms allow-discrete;
    }
    @starting-style {
      .bulk-dock:not([hidden]) {
        opacity: 0;
        transform: translateY(calc(100% + 20px));
      }
    }
    .bulk-dock[hidden] {
      display: none;
      opacity: 0;
      transform: translateY(calc(100% + 20px));
      transition:
        opacity 150ms ease-out,
        transform 180ms cubic-bezier(0.32, 0.72, 0, 1),
        display 180ms allow-discrete;
    }
    .bulk-dock p { font-size: 12px; margin-bottom: 8px; }
    .bulk-dock > div { display: flex; justify-content: end; gap: 8px; }
    .matrix-dues-button { display: grid; place-items: center; width: 100%; min-height: 38px; cursor: pointer; }
    .table-matriks td:has(.matrix-dues-button) { padding: 0; }
    .bulk-selecting [data-bulk-month] { touch-action: none; user-select: none; }
    .bulk-selecting .bulk-cell-selected {
      background: var(--accent-tint);
      outline: 2px solid var(--accent);
      outline-offset: -2px;
    }
    @media (prefers-reduced-motion: no-preference) {
      .bulk-selecting .bulk-cell-selected {
        animation: bulkCellPop 160ms var(--hybrid-ease-spring);
      }
      #bulk-status.is-updating {
        animation: bulkStatusPulse 160ms var(--hybrid-ease-out);
      }
    }
    @keyframes bulkCellPop {
      0% { transform: scale(0.95); }
      60% { transform: scale(1.03); }
      100% { transform: scale(1); }
    }
    @keyframes bulkStatusPulse {
      0% { opacity: 0.65; transform: translateY(2px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .bulk-dock { transition: none; transform: none; }
      .bulk-selecting .bulk-cell-selected, #bulk-status.is-updating { animation: none; }
    }
    @media (max-width: 768px) {
      .spotlight { margin-inline: 8px; }
      .bulk-dock { bottom: calc(74px + env(safe-area-inset-bottom)); }
      .workspace-panel.bulk-selecting { padding-bottom: 116px; }
      button.iuran-month-item[data-bulk-month] { min-height: 44px; }
    }
  }
</style>
