<script lang="ts">
  import { profileStore as vm } from './profile.svelte';
</script>

{#each vm.deposits as row (row.id)}
  <button type="button" class="profil-history-row" data-action="open-receipt" data-id={row.id}>
    <span class="ledger-main">
      <span class="ledger-title">{row.note}</span>
      <span class="ledger-meta"><span class="mono tnum">{row.date}</span><span>{row.id}</span></span>
    </span>
    <span class="ledger-amt inflow nominal-val sensitive-amt">+{row.formattedAmount}</span>
  </button>
{:else}
  <div class="profile-history-empty">Belum ada riwayat setoran.</div>
{/each}
