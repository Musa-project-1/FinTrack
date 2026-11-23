<script lang="ts">
  import { iuranReviewChipsStore as review } from './transaction-form.svelte';
</script>

{#each review.visible as chip (chip.key)}
  <span class="trx-rev-chip"><span class="trx-rev-chip-av" aria-hidden="true">{chip.initials}</span><span>{chip.name}</span></span>
{/each}
{#if review.extraCount > 0}
  <span class="trx-rev-chip trx-rev-chip-more">+{review.extraCount} {review.moreLabel}</span>
{/if}
