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
