<script lang="ts">
  import { masterKategoriStore } from '../stores/master.svelte';
</script>

{#if masterKategoriStore.rows.length === 0}
  <tr><td colspan="3" class="td-muted-center">Belum ada kategori.</td></tr>
{:else}
  {#each masterKategoriStore.rows as row (row.id)}
    <tr class="master-row {row.isMasuk ? 'is-masuk' : 'is-keluar'}" class:is-just-saved={masterKategoriStore.savedId === row.id}>
      <td class="td-name-col">
        <div class="master-cell-identity">
          <span class="master-kat-icon {row.isMasuk ? 'is-masuk' : 'is-keluar'}" aria-hidden="true"><i class="ph-bold {row.isMasuk ? 'ph-arrow-down-left' : 'ph-arrow-up-right'}"></i></span>
          <div class="master-name-wrap">
            <span class="master-name-text">{row.name}</span>
            <span class="master-id-pill">{row.id}</span>
          </div>
        </div>
      </td>
      <td class="td-status-col text-center">
        {#if row.isMasuk}
          <span class="badge badge-masuk"><i class="ph-bold ph-arrow-down-left" aria-hidden="true"></i> Masuk</span>
        {:else}
          <span class="badge badge-keluar"><i class="ph-bold ph-arrow-up-right" aria-hidden="true"></i> Keluar</span>
        {/if}
      </td>
      <td class="td-action-col">
        <div class="master-actions-wrap">
          <button type="button" class="btn btn-outline btn-master-action" data-action="edit-master-kategori" data-id={row.id} title="Kelola Kategori">
            <i class="ph-bold ph-pencil-simple" aria-hidden="true"></i> <span>Edit</span>
          </button>
        </div>
      </td>
    </tr>
  {/each}
{/if}
