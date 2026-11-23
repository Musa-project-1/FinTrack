<script lang="ts">
  import { onboardingGroupsStore } from './onboarding.svelte';
</script>

{#if onboardingGroupsStore.status === 'ready'}
  {#each onboardingGroupsStore.items as g (g.id)}
    <button type="button" class="group-item" data-id={g.id} onclick={() => onboardingGroupsStore.onPick?.(g.id)}>
      <span class="group-avatar" aria-hidden="true">{g.initials}</span>
      <span class="group-texts"><h3>{g.name}</h3><small>Ketuk untuk masuk</small></span>
      <i class="ph-bold ph-caret-right group-chev" aria-hidden="true"></i>
    </button>
  {/each}
{:else if onboardingGroupsStore.status === 'empty'}
  <p class="loading-state">Belum ada grup. Minta admin pemilik membuatkan grup.</p>
{:else if onboardingGroupsStore.status === 'not-found'}
  <p class="loading-state">Grup kas tidak ditemukan.</p>
{:else if onboardingGroupsStore.status === 'error'}
  <p class="loading-state">Gagal memuat. Periksa internet lalu muat ulang.</p>
{:else}
  <p class="loading-state">Memuat daftar grup...</p>
{/if}
