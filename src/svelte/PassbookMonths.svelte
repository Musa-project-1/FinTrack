<script lang="ts">
  import { profileStore as vm, renderPassbookEmblem } from './profile.svelte';
</script>

{#each vm.months as m (m.index)}
  {@const memberAction = m.action === 'open-month-receipt' || m.action === 'open-self-pay'}
  <button type="button" class={`passbook-stamp-btn ${m.kind}`} style={`--pass-i:${m.index}`}
    aria-label={m.ariaLabel} disabled={m.disabled} data-action={m.action || undefined}
    data-id={memberAction ? m.memberId : undefined}
    data-anggota={m.action === 'quickpay-card' ? m.memberId : undefined}
    data-bulan={m.action === 'quickpay-card' ? m.monthName : undefined}
    data-month={memberAction ? String(m.index) : undefined} data-year={m.action ? m.year : undefined}>
    <span class="passbook-slot-head">
      <span class="passbook-slot-mon">{m.shortName}</span>
      <span class="passbook-slot-num">{m.numLabel}</span>
    </span>
    <span class="passbook-slot-seal">{@html renderPassbookEmblem(m.kind, vm.stampStyle)}</span>
    <span class="passbook-slot-tag">{m.statusUpper}</span>
  </button>
{/each}
