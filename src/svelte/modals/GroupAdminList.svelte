<script lang="ts">
  import { groupAdminStore as vm } from '../stores/group-admin.svelte';
</script>

{#if vm.emptyReason === 'none'}
  <div class="group-empty-state">
    <i class="ph-fill ph-users-three" aria-hidden="true"></i>
    <p>Belum ada grup terdaftar. Buat grup pertama di atas.</p>
  </div>
{:else if vm.emptyReason === 'search'}
  <div class="group-empty-state">
    <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
    <p>Tidak ada grup yang cocok dengan pencarian.</p>
  </div>
{:else}
  {#each vm.rows as item (item.id)}
    <div class="group-card-item" class:is-active={item.isActive} data-id={item.id} role="listitem">
      <div class="group-card-main">
        <span class="group-card-avatar" data-index={item.colorIndex} aria-hidden="true">{item.initial}</span>
        <div class="group-card-details">
          <div class="group-card-title-row">
            <h3 class="group-card-title">{item.nama}</h3>
            {#if item.isActive}<span class="group-badge-active"><span class="group-status-dot" aria-hidden="true"></span><span>Aktif</span></span>{/if}
          </div>
          <span class="group-card-id-pill"><i class="ph ph-hash" aria-hidden="true"></i> {item.id}</span>
        </div>
      </div>
      <div class="group-card-actions">
        <button type="button" class="btn-group-chip" data-action="manage-group-creds" data-id={item.id} title="Atur Akun Admin Grup">
          <i class="ph-bold ph-user-gear" aria-hidden="true"></i>
          <span>Admin</span>
        </button>
        <button type="button" class="btn-group-chip" data-action="rename-group" data-id={item.id} title="Ubah Nama Grup">
          <i class="ph-bold ph-pencil-simple" aria-hidden="true"></i>
          <span>Nama</span>
        </button>
        <button type="button" class="btn-group-chip" data-action="reset-group-pin" data-id={item.id} title="Ubah PIN Grup">
          <i class="ph-bold ph-key" aria-hidden="true"></i>
          <span>PIN</span>
        </button>
        <button type="button" class="btn-group-chip danger" data-action="remove-group" data-id={item.id} title="Hapus Grup" aria-label="Hapus {item.nama}">
          <i class="ph-bold ph-trash" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  {/each}
{/if}
