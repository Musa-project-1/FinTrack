<script lang="ts">
  import { renderLunasHtml, renderPassbookEmblem } from 'finkas/dues-status';
  import { stampPreviewStore as preview } from '../stores/stamp-preview.svelte';
</script>

{#key preview.seq}
  <span class="tampilan-preview-cell paid">{@html renderLunasHtml(preview.animate, preview.styleKey)}</span>
  <span class="tampilan-preview-stamp">{@html renderPassbookEmblem('paid', preview.styleKey)}</span>
{/key}
