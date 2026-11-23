<script lang="ts">
  import { iuranChecklistStore as checklist } from './transaction-form.svelte';
  const query = $derived(checklist.query.toLowerCase());
</script>

{#key checklist.renderSeq}
  {#each checklist.items as item (item.id)}
    {@const visible = item.name.toLowerCase().includes(query)}
    {@const settledOrExempt = item.variant === 'lunas' || item.variant === 'not-owed'}
    <label class="checkbox-item" class:item-disabled-lunas={settledOrExempt}
      class:item-partial={item.variant === 'partial'} for="chk-iuran-{item.id}"
      style:display={visible ? 'flex' : 'none'}>
      <span class="chk-avatar" aria-hidden="true">{item.initials}</span>
      <div class="chk-info-col">
        <span class={settledOrExempt ? 'chk-name-lunas' : 'chk-name-pending'}>{item.name}</span>
        {#if item.variant === 'lunas'}
          <div class="chk-badge-lunas"><i class="ph-fill ph-check-circle" aria-hidden="true"></i> LUNAS</div>
        {:else}
          <div class="chk-badge-pending">{item.statusLabel}</div>
        {/if}
      </div>
      <input type="checkbox" id="chk-iuran-{item.id}" name="iuran-anggota" class="chk-iuran"
        value={item.id} data-member-name={item.name} disabled={item.disabled} checked={item.defaultChecked}>
    </label>
  {/each}
{/key}
