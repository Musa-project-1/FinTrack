<script lang="ts">
  import { quickPayPresetsStore } from '../stores/transaction-form.svelte';
</script>

{#each quickPayPresetsStore.chips as chip (chip.amount)}
  <button type="button" class="qp-preset-chip" data-qp-preset={chip.amount}>{chip.label}</button>
{/each}
