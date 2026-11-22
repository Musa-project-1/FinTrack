<script lang="ts">
  import { spotlightStore as vm } from './spotlight.svelte';
</script>

<div class="priority-heading">
  <span class="quick-cek-icon" aria-hidden="true"><i class="ph-fill ph-lightning"></i></span>
  <div><h2 id="priority-title">{vm.priorityTitle}</h2><p id="priority-period">{vm.priorityPeriod}</p></div>
  <button type="button" class="btn" data-action="bulk-toggle" aria-pressed="false"><i class="ph ph-check-square" aria-hidden="true"></i> Pilih Banyak</button>
</div>
<ul id="priority-members" class="priority-list">
  {#each vm.priorityItems as item (item.memberId)}
    <li>
      <span title={item.remainingLabel}>{item.memberName}</span>
      <button type="button" class="btn" data-action="quickpay-card" data-anggota={item.memberId}
        data-bulan={item.monthName} data-year={String(item.year)} aria-label={`Lunasi iuran ${item.monthName} untuk ${item.memberName}`}>Lunasi {item.monthShort}</button>
    </li>
  {/each}
</ul>
