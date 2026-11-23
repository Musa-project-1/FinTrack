<script lang="ts">
  import { masterAnggotaStore } from '../stores/master.svelte';
</script>

{#if masterAnggotaStore.rows.length === 0}
  <tr><td colspan="4" class="td-muted-center">Belum ada anggota terdaftar.</td></tr>
{:else}
  {@const q = masterAnggotaStore.query.trim().toLowerCase()}
  {#each masterAnggotaStore.rows as row (row.id)}
    {@const visible = !q || row.searchText.toLowerCase().includes(q)}
    <tr class="master-row {row.isAktif ? 'is-aktif' : 'is-nonaktif'}" data-search={row.searchText} style:display={visible ? undefined : 'none'}>
      <td class="td-name-col">
        <div class="master-cell-identity">
          <span class="master-avatar {row.isAktif ? '' : 'is-inactive'}" aria-hidden="true">{row.initials}</span>
          <div class="master-name-wrap">
            <span class="master-name-text">{row.name}</span>
            <span class="master-id-pill">{row.id}</span>
          </div>
        </div>
      </td>
      <td class="td-wa-col">
        {#if row.waHref}
          <a href={row.waHref} target="_blank" rel="noopener" class="master-wa-link" title="Chat WhatsApp"><i class="ph-fill ph-whatsapp-logo" aria-hidden="true"></i> <span>{row.rawWa}</span></a>
        {:else}
          <span class="text-muted">-</span>
        {/if}
      </td>
      <td class="td-status-col text-center">
        {#if row.isAktif}
          <span class="badge badge-masuk"><i class="ph-bold ph-check" aria-hidden="true"></i> Aktif</span>
        {:else}
          <span class="badge badge-keluar"><i class="ph-bold ph-x" aria-hidden="true"></i> Nonaktif</span>
        {/if}
      </td>
      <td class="td-action-col">
        <div class="master-actions-wrap">
          <button type="button" class="btn btn-outline btn-master-action" data-action="edit-master-anggota" data-id={row.id} title="Kelola Anggota">
            <i class="ph-bold ph-pencil-simple" aria-hidden="true"></i> <span>Edit</span>
          </button>
        </div>
      </td>
    </tr>
  {/each}
{/if}
