<script lang="ts">
  import { formatRp } from '../../core/utils.js';
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
