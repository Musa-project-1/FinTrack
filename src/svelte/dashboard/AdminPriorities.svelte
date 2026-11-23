<script lang="ts">
  import { spotlightStore as vm } from '../stores/spotlight.svelte';
</script>

<div class="priority-heading">
  <span class="quick-cek-icon" aria-hidden="true"><i class="ph-fill ph-lightning"></i></span>
  <div><h2 id="priority-title">{vm.priorityTitle}</h2><p id="priority-period">{vm.priorityPeriod}</p></div>
  <button type="button" class="btn" data-action="bulk-toggle" aria-pressed="false"><i class="ph ph-check-square" aria-hidden="true"></i> Pilih Banyak</button>
</div>
<ul id="priority-members" class="priority-list">
  {#each vm.priorityItems as item (item.memberId)}
    <li>
      <span title={item.remainingLabel}>{item.memberName}</span>
      <button type="button" class="btn" data-action="quickpay-card" data-anggota={item.memberId}
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

    .spotlight[hidden], .spotlight [hidden], .bulk-dock[hidden] { display: none; }

    .priority-heading, .priority-list li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .priority-list {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(190px, max-content);
      gap: 8px;
      overflow-x: auto;
      overscroll-behavior-inline: contain;
      list-style: none;
    }
    .priority-list:not(:empty) { margin-top: 10px; }
    .priority-list li {
      min-width: 0;
      max-width: 270px;
      padding: 6px 8px;
      margin-block: 2px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .priority-list strong { display: block; font-size: 13px; overflow-wrap: anywhere; }
    .priority-list small { color: var(--text-muted); font-size: 11px; }

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
    @media (max-width: 768px) {
      .spotlight { margin-inline: 8px; }
      .bulk-dock { bottom: calc(74px + env(safe-area-inset-bottom)); }
      .workspace-panel.bulk-selecting { padding-bottom: 116px; }
      button.iuran-month-item[data-bulk-month] { min-height: 44px; }
    }
  }
</style>
