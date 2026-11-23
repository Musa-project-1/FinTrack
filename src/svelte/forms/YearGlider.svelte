<script lang="ts">
  import { yearGliderStore, type YearSlot } from '../stores/year-glider.svelte';
  let { slot }: { slot: YearSlot } = $props();
  const state = $derived(yearGliderStore[slot]);
</script>

{#if state.years.length}
  <span class="year-glider-indicator" aria-hidden="true"></span>
  {#each state.years as year (year)}
    <button type="button" data-action="select-rekap-year" data-year={year} aria-pressed={year === state.activeYear}>{year}</button>
  {/each}
{/if}
