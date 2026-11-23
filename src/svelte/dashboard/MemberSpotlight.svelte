<script lang="ts">
  import { renderMiniStamp } from 'finkas/dues-status';
  import { spotlightStore as vm, setMemberPin, triggerSpotlightDetailCta } from '../stores/spotlight.svelte';

  function navigateMonths(event: KeyboardEvent & { currentTarget: HTMLDivElement }) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const pills = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.mini-month-pill:not(:disabled)'));
    const index = pills.findIndex(pill => pill === event.target);
    if (index < 0 || pills.length < 2) return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    pills[(index + delta + pills.length) % pills.length].focus();
  }
</script>

<div class="hybrid-card quick-cek-bar" id="quick-cek-bar" hidden={vm.hasPinned}>
  <div class="quick-cek-copy">
    <div aria-hidden="true" class="quick-cek-icon">
      <i class="ph-fill ph-push-pin"></i>
    </div>
    <div>
      <strong class="quick-cek-title" data-i18n="spot.title">Pantau Iuran Saya</strong>
      <span class="quick-cek-desc" data-i18n="spot.desc">Pilih nama Anda atau sematkan dari tabel untuk akses cepat ringkasan iuran pribadi.</span>
    </div>
  </div>
  <div class="quick-cek-controls">
    <label class="sr-only" for="spotlight-picker">Pilih Nama Anggota untuk Disematkan</label>
    <select class="form-control select-ctrl" id="spotlight-picker" value={vm.pinnedId} onchange={(e) => setMemberPin(e.currentTarget.value, true)}>
      <option value="">Pilih nama Anda...</option>
      {#each vm.members as member (member.id)}
        <option value={member.id}>{member.name}</option>
      {/each}
    </select>
  </div>
</div>
<div class="hybrid-card spotlight-card" hidden={!vm.hasPinned} id="spotlight-card">
  <div class="spotlight-identity">
    <div aria-label="Kepatuhan iuran saya" aria-valuemax="100" aria-valuemin="0" aria-valuenow={vm.percent} class="ring-box" id="spotlight-progress" role="progressbar">
      <svg aria-hidden="true" class="ring-svg" viewBox="0 0 86 86">
        <circle class="ring-track" cx="43" cy="43" r="35"></circle>
        <circle class="ring-progress" cx="43" cy="43" id="spotlight-ring-arc" pathLength="100" r="35" stroke-dasharray="100" stroke-dashoffset={100 - vm.percent}></circle>
      </svg>
      <div aria-hidden="true" class="ring-center">
        <span class="ring-pct tnum" id="spotlight-pct">{vm.percent}%</span>
        <span class="ring-frac tnum" id="spotlight-frac">{vm.settled}/{vm.total}</span>
      </div>
    </div>
    <div class="spotlight-id-copy">
      <div class="spotlight-eyebrow-row">
        <span class="spotlight-eyebrow">
          <i aria-hidden="true" class="ph-fill ph-push-pin"></i>
          <span>Pantauan Iuran Saya</span>
        </span>
        <span class="meta-chip mono" id="spotlight-member-code" hidden={!vm.memberCode}>{vm.memberCode}</span>
        <span class="meta-chip amber tnum" hidden={!vm.arrearsCount} id="spotlight-arrears-chip">{vm.arrearsText}</span>
        <span class="meta-chip paid tnum" hidden={!vm.showPaidChip} id="spotlight-paid-chip">Iuran Jatuh Tempo Lunas</span>
      </div>
      <button aria-label="Buka buku iuran anggota" class="spotlight-name-btn" data-action="profil" data-id={vm.pinnedId} id="spotlight-book" type="button">
        <span id="spotlight-name">{vm.memberName}</span>
        <i aria-hidden="true" class="ph ph-identification-card"></i>
      </button>
      <p class="spotlight-summary-line tnum" id="spotlight-summary">{vm.summaryText}</p>
    </div>
  </div>
  <div class="spotlight-actions">
    <label class="sr-only" for="spotlight-swap-select">Ganti Anggota Tersemat</label>
    <select class="form-control select-ctrl select-compact-34" id="spotlight-swap-select" value={vm.pinnedId} onchange={(e) => setMemberPin(e.currentTarget.value, true)}>
      {#each vm.members as member (member.id)}
        <option value={member.id}>{member.name}</option>
      {/each}
    </select>
    <button class="btn btn-secondary btn-compact-34" data-action="spotlight-unpin" id="btn-unpin-member" type="button">
      <i aria-hidden="true" class="ph ph-push-pin-slash"></i>
      <span>Lepas</span>
    </button>
    <button class="btn btn-primary btn-compact-34" data-action="spotlight-pay" id="spotlight-pay-btn" type="button">
      <i aria-hidden="true" class="ph-bold ph-hand-coins"></i>
      <span id="spotlight-pay-label">{vm.payLabel}</span>
    </button>
  </div>
  <div aria-hidden="true" class="spotlight-divider"></div>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Arrow keys move focus between the child buttons.) -->
  <div aria-label="Status iuran 12 bulan pribadi" class="spotlight-months" id="spotlight-months" role="group" onkeydown={navigateMonths}>
    {#each vm.months as m (m.index)}
      <button type="button" class="mini-month-pill {m.appearance}" style="--i:{m.index}" data-action="spotlight-month"
        data-index={m.index} data-status={m.status} aria-label={m.ariaLabel}
        aria-pressed={vm.selectedMonthIndex === m.index} disabled={!m.owed}>
        {#if m.icon}<i class="ph ph-{m.icon}" aria-hidden="true"></i>{:else}<span style="display:contents">{@html renderMiniStamp(vm.stampStyle)}</span>{/if}
        <span>{m.shortName}</span>
      </button>
    {/each}
  </div>
  <p aria-live="polite" class="spotlight-detail" hidden={!vm.detail} id="spotlight-detail">
    {#if vm.detail}
      {vm.detail.head}{#if vm.detail.paid} · Setoran <span class="nominal-val">{vm.detail.paid}</span>{/if}{#if vm.detail.remaining} · Sisa <span class="nominal-val">{vm.detail.remaining}</span>{/if}
      {#if vm.detail.cta}
        {@const cta = vm.detail.cta}
        <button type="button" class="spotlight-detail-cta" onclick={() => triggerSpotlightDetailCta(cta)}>{cta.label}</button>
      {/if}
    {/if}
  </p>
</div>
