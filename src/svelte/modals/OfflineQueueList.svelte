<script lang="ts">
  import { formatRp } from 'finkas/core/utils';
  import { offlineQueueStore as vm } from '../stores/offline-queue.svelte';
</script>

{#if vm.status === 'error'}
  <div class="queue-error">
    <span class="queue-error-ico"><i class="ph-fill ph-warning-circle" aria-hidden="true"></i></span>
    <div><strong>Gagal memuat antrean</strong><p>Coba tekan Refresh.</p></div>
  </div>
{:else if vm.status === 'ready'}
  {#if !vm.items.length}
    <div class="queue-empty">
      <span class="queue-empty-ico"><i class="ph-fill ph-check-circle" aria-hidden="true"></i></span>
      <div><strong>Semua tersinkron</strong><p>Tidak ada transaksi tertunda.</p></div>
    </div>
  {/if}
  {#each vm.items as item (item.id)}
    <div class="pending-item">
      <div class="pending-card-row">
        <div class="flex-1">
          <div class="pending-card-top">
            <span class="queue-action-pill is-{item.tone}"><i class="ph {item.icon}" aria-hidden="true"></i> {item.label}</span>
            {#if item.nominal > 0}
              <span class="pending-card-amount">{formatRp(item.nominal)}</span>
            {/if}
          </div>
          <div class="pending-card-time">{item.formattedTime} · <span class="queue-gid-tag">{vm.groupId}</span></div>
          <div class="pending-card-payload">{item.summary}</div>
        </div>
        <div class="flex-align-gap">
          <button type="button" class="btn btn-outline queue-del-btn" data-action="delete-offline-item" data-item-id={String(item.id)} aria-label="Hapus">
            <i class="ph ph-trash" aria-hidden="true"></i> <span>Hapus</span>
          </button>
        </div>
      </div>
    </div>
  {/each}
  {#if vm.otherGroupCount > 0 || vm.unscopedCount > 0}
    <div class="queue-empty">
      {#if vm.otherGroupCount > 0}
        <p>{vm.otherGroupCount} antrean milik grup lain menunggu — pindah ke grup tersebut untuk mengirim.</p>
      {/if}
      {#if vm.unscopedCount > 0}
        <p>{vm.unscopedCount} antrean lama tanpa ID grup dilewati demi isolasi data.</p>
      {/if}
    </div>
  {/if}
{/if}

<style>
  :global {
    /* === HYBRID KINETIC OFFLINE QUEUE SHEET (#modal-offline-queue) === */
    #modal-offline-queue:modal, #modal-offline-queue::backdrop { overscroll-behavior: contain; }
    #modal-offline-queue::backdrop { overflow: hidden; }

    #modal-offline-queue > .queue-sheet {
      width: min(540px, calc(100vw - 28px)); max-width: 540px; max-height: min(90dvh, 660px); padding: 0;
      border-radius: 20px; border: 1px solid var(--border);
      background: var(--surface); box-shadow: var(--shadow-pop);
      display: flex; flex-direction: column; overflow: hidden; gap: 0;
    }

    #modal-offline-queue .queue-sheet-header {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 14px 20px 12px; border-radius: 20px 20px 0 0; border-bottom: 1px solid var(--border); flex-shrink: 0;
      background: radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--warning) 10%, transparent), transparent 58%), var(--surface);
    }
    .queue-header-main { display: flex; align-items: center; gap: 11px; min-width: 0; }
    .queue-header-emblem {
      width: 38px; height: 38px; min-width: 38px; min-height: 38px; border-radius: 12px;
      background: var(--warning-bg); border: 1px solid var(--warning-border); color: var(--warning);
      display: grid; place-items: center; font-size: 18px; flex-shrink: 0;
    }
    .queue-header-copy { min-width: 0; }
    #modal-offline-queue .queue-header-copy h2 {
      font-family: var(--font-display); font-size: 1.0625rem; font-weight: 800;
      letter-spacing: -0.02em; line-height: 1.25; color: var(--text-main); margin: 0;
    }
    #modal-offline-queue .queue-subtitle {
      margin: 2px 0 0; font-size: 0.78125rem; font-weight: 500; color: var(--text-muted); line-height: 1.4;
    }
    .queue-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    #modal-offline-queue .queue-sheet-header .queue-refresh-btn {
      min-width: 0; min-height: 34px; height: 34px; padding: 0 12px;
      font-size: 12.5px; font-weight: 700; border-radius: 10px;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .queue-refresh-btn.is-loading i { animation: queueSpin 0.8s linear infinite; }
    @keyframes queueSpin { to { transform: rotate(360deg); } }
    #modal-offline-queue .queue-sheet-header .close-modal-btn {
      min-width: 34px; min-height: 34px; width: 34px; height: 34px; border-radius: 10px;
    }

    #modal-offline-queue .queue-sheet-body {
      padding: 12px 20px 14px; display: flex; flex-direction: column; gap: 10px;
      flex: 1 1 auto; min-height: 0; overflow: hidden;
    }

    .queue-status-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 8px 12px; border: 1px solid var(--border); border-radius: 12px;
      background: var(--surface-2); color: var(--text-muted); font-size: 12px; font-weight: 600; flex-shrink: 0;
    }
    .queue-conn-status { display: inline-flex; align-items: center; gap: 7px; min-width: 0; color: var(--text-main); }
    .queue-conn-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--accent); }
    .queue-conn-dot.is-online { background: var(--accent); box-shadow: 0 0 0 3px var(--accent-tint); }
    .queue-conn-dot.is-offline { background: var(--warning); box-shadow: 0 0 0 3px var(--warning-bg); }
    .queue-count-pill {
      flex-shrink: 0; font-family: var(--font-mono); font-size: 11px; font-weight: 700;
      font-variant-numeric: tabular-nums; padding: 3px 9px; border-radius: var(--r-pill);
      background: var(--surface); border: 1px solid var(--border); color: var(--text-muted);
    }

    #modal-offline-queue .offline-queue-container {
      display: flex; flex-direction: column; gap: 8px; max-height: 320px; min-height: 110px;
      overflow-y: auto; overflow-x: hidden; scrollbar-gutter: stable; overscroll-behavior: contain;
    }

    .queue-empty,
    .queue-error {
      display: flex; align-items: center; gap: 12px; padding: 20px 16px;
      background: var(--surface-2); border: 1px dashed var(--border-strong);
      border-radius: 14px; text-align: left;
    }
    .queue-empty-ico,
    .queue-error-ico {
      width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center;
      font-size: 20px; flex-shrink: 0;
    }
    .queue-empty-ico { background: var(--accent-tint); border: 1px solid var(--accent-border); color: var(--accent-strong); }
    .queue-error-ico { background: var(--danger-bg); border: 1px solid var(--danger-border); color: var(--danger); }
    .queue-empty strong,
    .queue-error strong { display: block; font-size: 13.5px; color: var(--text-main); margin-bottom: 2px; }
    .queue-empty p,
    .queue-error p { font-size: 12px; color: var(--text-muted); margin: 0; }

    #modal-offline-queue .pending-item {
      border: 1px solid var(--border); border-radius: 13px; padding: 11px 13px;
      background: var(--surface); margin: 0;
    }
    #modal-offline-queue .pending-item + .pending-item { margin-top: 0; }
    #modal-offline-queue .pending-card-row { display: flex; align-items: center; gap: 10px; }
    #modal-offline-queue .pending-card-row > .flex-1 { min-width: 0; flex: 1; }
    .pending-card-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .queue-action-pill {
      display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: var(--r-pill);
      font-size: 11px; font-weight: 700; line-height: 1.3; white-space: nowrap;
      border: 1px solid var(--border); background: var(--surface-2); color: var(--text-muted);
    }
    .queue-action-pill i { font-size: 12px; }
    .queue-action-pill.is-accent { background: var(--accent-tint); border-color: var(--accent-border); color: var(--accent-strong); }
    .queue-action-pill.is-warning { background: var(--warning-bg); border-color: var(--warning-border); color: var(--warning); }
    .queue-action-pill.is-danger { background: var(--danger-bg); border-color: var(--danger-border); color: var(--danger); }

    .pending-card-amount {
      font-family: var(--font-mono); font-size: 12px; font-weight: 700;
      font-variant-numeric: tabular-nums; color: var(--text-main);
    }
    #modal-offline-queue .pending-card-time {
      margin-top: 5px; font-size: 11px; color: var(--text-faint);
      display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
    }
    .queue-gid-tag {
      font-family: var(--font-mono); font-size: 10px; font-weight: 600;
      padding: 1px 6px; border-radius: var(--r-xs); background: var(--surface-2);
      border: 1px solid var(--border); color: var(--text-muted);
    }
    #modal-offline-queue .pending-card-payload {
      margin-top: 4px; font-family: var(--font-sans); font-size: 12px; color: var(--text-main);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;
    }
    #modal-offline-queue .queue-del-btn {
      min-width: 0; min-height: 32px; height: 32px; padding: 0 10px;
      font-size: 11.5px; font-weight: 700; border-radius: 9px;
      color: var(--danger); border-color: var(--danger-border); background: transparent;
      display: inline-flex; align-items: center; gap: 4px;
    }
    #modal-offline-queue .queue-del-btn:hover { background: var(--danger-bg); border-color: var(--danger); }

    #modal-offline-queue .queue-sheet-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 11px 20px; border-radius: 0 0 20px 20px; margin: 0; flex-shrink: 0;
    }
    #modal-offline-queue .queue-sheet-footer .btn {
      min-width: 0; min-height: 36px; height: 36px; padding: 0 16px;
      font-size: 13px; font-weight: 700; border-radius: 11px;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    }
    #modal-offline-queue .queue-sheet-footer .btn:disabled { opacity: 0.45; cursor: not-allowed; }

    @media (max-height: 750px) and (min-width: 769px) {
      #modal-offline-queue > .queue-sheet { max-height: calc(100dvh - 24px); }
      #modal-offline-queue .offline-queue-container { max-height: 230px; }
    }

    @media (max-width: 768px) {
      #modal-offline-queue[open] > .queue-sheet {
        width: 100%; max-width: 100%; max-height: 92dvh; border-radius: 20px 20px 0 0; overflow: hidden;
      }
      #modal-offline-queue .hybrid-sheet-handle { flex-shrink: 0; }
      #modal-offline-queue .queue-sheet-header { padding: 4px 14px 10px; border-radius: 0; gap: 8px; }
      #modal-offline-queue .queue-header-emblem { width: 34px; height: 34px; min-width: 34px; min-height: 34px; font-size: 16px; }
      #modal-offline-queue .queue-header-copy h2 { font-size: 15px; }
      #modal-offline-queue .queue-subtitle { font-size: 11px; line-height: 1.3; }
      #modal-offline-queue .queue-sheet-header .queue-refresh-btn {
        width: 44px; min-width: 44px; height: 44px; min-height: 44px; padding: 0; justify-content: center; font-size: 18px;
      }
      #modal-offline-queue .queue-sheet-header .queue-refresh-btn span { display: none; }
      #modal-offline-queue .queue-sheet-header .close-modal-btn { width: 44px; min-width: 44px; height: 44px; min-height: 44px; }
      #modal-offline-queue .queue-sheet-body { padding: 10px 14px 12px; gap: 9px; overflow-y: auto; overscroll-behavior: contain; }
      #modal-offline-queue .offline-queue-container { max-height: none; overflow: visible; scrollbar-gutter: auto; }
      #modal-offline-queue .queue-del-btn { min-height: 36px; height: 36px; padding: 0 10px; }
      #modal-offline-queue .queue-sheet-footer { padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); border-radius: 0; }
      #modal-offline-queue .queue-sheet-footer .btn { flex: 1 1 0; min-height: 44px; height: 44px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .queue-refresh-btn.is-loading i { animation: none; }
    }
  }
</style>
