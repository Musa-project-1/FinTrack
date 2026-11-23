<script lang="ts">
  import { auditLogStore } from './master.svelte';
</script>

{#if auditLogStore.status === 'loading'}
  <tr><td colspan="3" class="td-muted-center">Memuat...</td></tr>
{:else if auditLogStore.status === 'error'}
  <tr><td colspan="3" class="td-muted-center text-danger">{auditLogStore.errorMessage || 'Gagal memuat log.'}</td></tr>
{:else if auditLogStore.rows.length === 0}
  <tr><td colspan="3" class="td-muted-center">{auditLogStore.totalCount === 0 ? 'Belum ada aktivitas tercatat.' : 'Tidak ada aktivitas yang cocok dengan filter.'}</td></tr>
{:else}
  {#each auditLogStore.rows as row (row.key)}
    <tr>
      <td class="td-audit-time">{row.timestampText}</td>
      <td class="td-audit-aksi ws-nowrap"><span class="audit-action-pill is-{row.tone}"><i class="ph {row.icon}" aria-hidden="true"></i> {row.label}</span></td>
      <td class="td-audit-detail">{row.detail}</td>
    </tr>
  {/each}
{/if}
