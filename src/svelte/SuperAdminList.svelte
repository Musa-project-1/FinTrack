<script lang="ts">
  import { superAdminStore as sa } from './group-admin.svelte';
</script>

{#if sa.status === 'loading'}
  <span class="superadmin-empty-text">Memuat daftar superadmin...</span>
{:else if sa.status === 'error'}
  <span class="superadmin-empty-text">Tidak dapat memuat daftar superadmin.</span>
{:else}
  {#each sa.items as item (item.email)}
    <div class="superadmin-email-item" role="listitem">
      <div class="superadmin-email-meta">
        <span class="superadmin-avatar" aria-hidden="true"><i class={item.isPrimary ? 'ph-fill ph-crown' : 'ph ph-shield-check'}></i></span>
        <span class="superadmin-email-text"><strong>{item.email}</strong> {#if item.isPrimary}<span class="superadmin-email-tag">Pemilik Utama</span>{/if}</span>
      </div>
      {#if !item.isPrimary}
        <button type="button" class="superadmin-email-del" data-action="remove-superadmin-email" data-email={item.email} title="Cabut akses" aria-label="Cabut akses {item.email}"><i class="ph-bold ph-trash" aria-hidden="true"></i></button>
      {/if}
    </div>
  {/each}
{/if}
