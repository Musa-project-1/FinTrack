<script lang="ts">
  import { groupPickerStore as vm } from '../stores/group-picker.svelte';
</script>

{#if vm.mode === 'loading'}
  <div class="group-picker-skeleton" aria-busy="true" aria-label="Memuat daftar grup...">
    <div class="group-skel-row"></div>
    <div class="group-skel-row"></div>
  </div>
{:else if vm.mode === 'empty'}
  <div class="group-picker-empty">
    <span class="group-empty-ico" aria-hidden="true"><i class="ph ph-folders"></i></span>
    <strong>Belum ada grup kas tersedia</strong>
    <p>Hubungi pengurus pemilik untuk membuat ruang kas baru.</p>
  </div>
{:else}
  {#each vm.rows as item (item.id)}
    <div role="listitem">
      <button type="button" class="group-item" class:is-active={item.isActive} data-action="request-group-pin" data-id={item.id} aria-current={item.isActive ? 'true' : undefined}>
        <span class="group-item-avatar" aria-hidden="true">{item.initial}</span>
        <span class="group-item-meta">
          <span class="group-item-name">{item.nama}</span>
          <span class="group-item-sub">{item.subText}</span>
        </span>
        <span class="group-item-trail">
          {#if item.pendingCount > 0}
            <span class="group-queue-badge" data-queue-group={item.id} title="{item.pendingCount} transaksi offline menunggu sinkronisasi"><i class="ph ph-cloud-arrow-up" aria-hidden="true"></i><span>{item.pendingCount}</span></span>
          {/if}
          {#if item.badgeKind === 'active'}
            <span class="group-status-pill is-active"><span class="group-status-dot" aria-hidden="true"></span><span>Aktif</span></span>
          {:else if item.badgeKind === 'direct'}
            <span class="group-status-pill is-direct"><i class="ph ph-lightning" aria-hidden="true"></i><span>Instan</span></span>
          {:else if item.badgeKind === 'unlocked'}
            <span class="group-status-pill is-unlocked"><i class="ph ph-lock-open" aria-hidden="true"></i><span>Terbuka</span></span>
          {:else}
            <span class="group-pin-badge" aria-hidden="true"><i class="ph ph-lock-simple"></i><span>PIN</span></span>
          {/if}
          <i class="ph ph-caret-right group-item-chev" aria-hidden="true"></i>
        </span>
      </button>
    </div>
  {/each}
{/if}

<style>
  :global {
    /* === HYBRID KINETIC GROUP PICKER SHEET (#modal-groups) === */

    #modal-groups:modal {
      overscroll-behavior: contain;
    }

    #modal-groups::backdrop {
      overflow: hidden;
      overscroll-behavior: contain;
    }

    #modal-groups .groups-picker-sheet {
      width: min(460px, calc(100vw - 28px));
      max-width: 100%;
      padding: 0;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: var(--shadow-pop);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    #modal-groups .groups-sheet-header {
      padding: 18px 20px 16px;
      align-items: flex-start;
      gap: 12px;
      background:
        radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 60%),
        var(--surface);
    }

    #modal-groups .groups-header-main {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      min-width: 0;
    }

    #modal-groups .groups-header-emblem {
      width: 42px;
      height: 42px;
      min-width: 42px;
      min-height: 42px;
      border-radius: 13px;
      background: var(--accent-tint);
      border: 1px solid var(--accent-border);
      color: var(--accent-strong);
      display: grid;
      place-items: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    #modal-groups .groups-header-copy {
      min-width: 0;
    }

    #modal-groups .groups-header-copy h2 {
      font-family: var(--font-display);
      font-size: 1.0625rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.25;
      color: var(--text-main);
      margin: 0;
    }

    #modal-groups .groups-header-copy p {
      margin: 3px 0 0;
      font-size: 0.78125rem;
      font-weight: 500;
      color: var(--text-muted);
      line-height: 1.45;
    }

    #modal-groups .groups-sheet-header .close-modal-btn {
      min-width: 34px;
      min-height: 34px;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      margin-top: -1px;
    }

    #modal-groups .groups-sheet-body {
      padding: 16px 20px 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-gutter: stable;
    }

    #modal-groups .groups-list-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 0 2px;
    }

    #modal-groups .groups-section-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    #modal-groups .groups-count-pill {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      padding: 2px 9px;
      border-radius: 999px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--text-muted);
    }

    #modal-groups .groups-count-pill[hidden] {
      display: none;
    }

    #modal-groups .group-picker-list {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    #modal-groups .group-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 64px;
      padding: 11px 13px;
      border-radius: 14px;
      border: 1.5px solid var(--border);
      background: var(--surface-2);
      color: var(--text-main);
      text-align: left;
      font: inherit;
      cursor: pointer;
      transition: border-color 160ms ease, background-color 160ms ease, transform 150ms var(--hybrid-ease-spring), box-shadow 160ms ease;
    }

    #modal-groups .group-item:hover {
      background: var(--surface);
      border-color: var(--border-strong);
    }

    #modal-groups .group-item:active {
      transform: scale(0.99);
    }

    #modal-groups .group-item:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    #modal-groups .group-item.is-active {
      background: var(--accent-tint);
      border-color: var(--accent);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 16%, transparent);
    }

    #modal-groups .group-item-avatar {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--accent-strong);
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 16px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
    }

    #modal-groups .group-item.is-active .group-item-avatar {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--accent-ink);
    }

    #modal-groups .group-item-meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    #modal-groups .group-item-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #modal-groups .group-item-sub {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      line-height: 1.35;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #modal-groups .group-item-trail {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    #modal-groups .group-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid var(--accent-border);
      background: var(--surface);
      color: var(--accent-strong);
      white-space: nowrap;
    }

    #modal-groups .group-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent);
      flex-shrink: 0;
    }

    #modal-groups .group-status-pill.is-direct {
      background: color-mix(in srgb, var(--secondary) 12%, transparent);
      color: var(--secondary);
      border-color: color-mix(in srgb, var(--secondary) 32%, transparent);
    }

    #modal-groups .group-pin-badge {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      padding: 3px 7px;
      border-radius: 8px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }

    #modal-groups .group-item-chev {
      font-size: 15px;
      color: var(--text-faint);
      transition: transform 180ms ease, color 150ms ease;
    }

    @media (hover: hover) and (pointer: fine) {
      #modal-groups .group-item:hover .group-item-chev {
        transform: translateX(2px);
        color: var(--accent-strong);
      }
    }

    #modal-groups .group-picker-skeleton {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    #modal-groups .group-skel-row {
      height: 64px;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      animation: group-skel-pulse 1.3s ease-in-out infinite;
    }

    @keyframes group-skel-pulse {
      0%, 100% { opacity: 0.55; }
      50% { opacity: 1; }
    }

    #modal-groups .group-picker-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 6px;
      padding: 24px 16px;
      border-radius: 14px;
      border: 1px dashed var(--border);
      background: var(--surface-2);
    }

    #modal-groups .group-empty-ico {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      display: grid;
      place-items: center;
      font-size: 20px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    #modal-groups .group-picker-empty strong {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-main);
    }

    #modal-groups .group-picker-empty p {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.45;
    }

    #modal-groups .groups-pin-tip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 11px;
      background: var(--surface-2);
      border: 1px dashed var(--border);
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      line-height: 1.4;
    }

    #modal-groups .groups-pin-tip i {
      font-size: 15px;
      color: var(--accent-strong);
      flex-shrink: 0;
    }

    #modal-groups .groups-sheet-footer {
      background: var(--surface-2);
      padding: 12px 20px;
      gap: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    #modal-groups .groups-footer-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-width: auto;
      min-height: 38px;
      padding: 0 13px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-main);
      font-size: 12.5px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
    }

    #modal-groups .groups-footer-btn:hover {
      background: var(--surface-3);
      border-color: var(--border-strong);
    }

    #modal-groups .groups-footer-btn.is-danger {
      color: var(--danger);
      border-color: var(--danger-border);
      background: color-mix(in srgb, var(--danger) 7%, var(--surface));
    }

    #modal-groups .groups-footer-btn.is-danger:hover {
      background: var(--danger-bg);
      border-color: var(--danger);
    }

    #modal-groups .groups-footer-btn[hidden] {
      display: none;
    }

    #modal-groups .groups-footer-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    @media (max-width: 768px) {
      #modal-groups.hybrid-dialog .groups-picker-sheet {
        width: 100%;
        max-width: 100%;
        max-height: 90dvh;
        border-radius: 20px 20px 0 0;
      }

      #modal-groups .groups-sheet-header {
        padding: 4px 16px 14px;
      }

      #modal-groups .groups-sheet-header .close-modal-btn {
        min-width: 44px;
        min-height: 44px;
        width: 44px;
        height: 44px;
      }

      #modal-groups .groups-sheet-body {
        padding: 14px 16px 16px;
      }

      #modal-groups .groups-sheet-footer {
        padding: 12px 16px;
      }

      #modal-groups .groups-footer-btn {
        min-height: 44px;
        flex: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #modal-groups .group-item,
      #modal-groups .group-item-avatar,
      #modal-groups .group-item-chev,
      #modal-groups .groups-footer-btn {
        transition: none;
      }

      #modal-groups .group-skel-row {
        animation: none;
      }
    }

    .header .group-queue-pill,
    #modal-groups .group-queue-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border: 1px solid var(--warning-border);
      border-radius: 999px;
      background: var(--warning-bg);
      color: var(--warning);
      font-family: var(--font-mono);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .header .group-queue-pill {
      min-height: 38px;
      padding-inline: 10px;
      font-size: 12px;
      cursor: pointer;
    }

    .header .group-queue-pill:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    #modal-groups .group-queue-badge {
      padding: 3px 6px;
      font-size: 11px;
    }

    #modal-groups .group-status-pill.is-unlocked {
      background: var(--surface-2);
      border-color: var(--border-strong);
      color: var(--text-main);
    }

    #modal-groups .groups-offline-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px dashed var(--warning-border);
      border-radius: 10px;
      background: var(--warning-bg);
      color: var(--warning);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      line-height: 1.4;
    }

    .header .group-queue-pill[hidden],
    #modal-groups .groups-offline-summary[hidden] {
      display: none;
    }

    @media (max-width: 768px) {
      .header .group-queue-pill {
        min-height: 44px;
        padding-inline: 6px;
      }
    }
  }
</style>
