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
        <option value={member.id}>{member.name?.trim() ? member.name : member.id}</option>
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
        <span id="spotlight-name" title={vm.memberName || vm.memberCode || undefined} dir="auto">{vm.memberName.trim() ? vm.memberName : vm.memberCode}</span>
        <i aria-hidden="true" class="ph ph-identification-card"></i>
      </button>
      <p class="spotlight-summary-line tnum" id="spotlight-summary">{vm.summaryText}</p>
    </div>
  </div>
  <div class="spotlight-actions">
    <label class="sr-only" for="spotlight-swap-select">Ganti Anggota Tersemat</label>
    <select class="form-control select-ctrl select-compact-34" id="spotlight-swap-select" value={vm.pinnedId} onchange={(e) => setMemberPin(e.currentTarget.value, true)}>
      {#each vm.members as member (member.id)}
        <option value={member.id}>{member.name?.trim() ? member.name : member.id}</option>
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

<style>
  :global {
    /* Personal dues card and picker carried over from the kinetic prototype. */
    .member-spotlight-wrap[hidden], .member-spotlight-wrap [hidden] { display: none !important; }

    .member-spotlight-wrap {
      --member-spot-soft: var(--surface-2);
      --member-spot-ink: var(--hybrid-spot);
      --member-spot-border: var(--border);
      --member-amber-soft: var(--warning-bg);
      --member-amber-ink: var(--warning);
      --member-amber-border: var(--warning-border);
      margin-block-end: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    body[data-palette="terracotta"]:not(.dark-mode) :is(.member-spotlight-wrap, #section-rekap) {
      --member-spot-soft: #E3F6FA;
      --member-spot-ink: #0B5C73;
      --member-spot-border: #99DDF0;
      --member-amber-soft: #FDF4E3;
      --member-amber-ink: #8E5200;
      --member-amber-border: #F6D28B;
    }

    body[data-palette="terracotta"].dark-mode :is(.member-spotlight-wrap, #section-rekap) {
      --member-spot-soft: rgba(34, 211, 238, 0.15);
      --member-spot-ink: #67E8F9;
      --member-spot-border: rgba(103, 232, 249, 0.34);
      --member-amber-soft: rgba(245, 158, 11, 0.16);
      --member-amber-ink: #FCD34D;
      --member-amber-border: rgba(251, 191, 36, 0.36);
    }

    body[data-palette="cobalt"]:not(.dark-mode) :is(.member-spotlight-wrap, #section-rekap) {
      --member-spot-soft: #EEF2FF;
      --member-spot-ink: #3730A3;
      --member-spot-border: #BAC4FF;
      --member-amber-soft: #FEF3C7;
      --member-amber-ink: #92400E;
      --member-amber-border: #FCD34D;
    }

    body[data-palette="cobalt"].dark-mode :is(.member-spotlight-wrap, #section-rekap) {
      --member-spot-soft: rgba(129, 140, 248, 0.16);
      --member-spot-ink: #A5B4FC;
      --member-spot-border: rgba(129, 140, 248, 0.36);
      --member-amber-soft: rgba(251, 191, 36, 0.16);
      --member-amber-ink: #FCD34D;
      --member-amber-border: rgba(251, 191, 36, 0.36);
    }

    body[data-palette="charcoal"]:not(.dark-mode) :is(.member-spotlight-wrap, #section-rekap) {
      --member-spot-soft: #FCE7F3;
      --member-spot-ink: #9D174D;
      --member-spot-border: #F9A8D4;
      --member-amber-soft: #FEF3C7;
      --member-amber-ink: #8C3E05;
      --member-amber-border: #FCD34D;
    }

    body[data-palette="charcoal"].dark-mode :is(.member-spotlight-wrap, #section-rekap) {
      --member-spot-soft: rgba(244, 114, 182, 0.16);
      --member-spot-ink: #F9A8D4;
      --member-spot-border: rgba(244, 114, 182, 0.36);
      --member-amber-soft: rgba(251, 191, 36, 0.16);
      --member-amber-ink: #FCD34D;
      --member-amber-border: rgba(251, 191, 36, 0.36);
    }

    body[data-palette="indigo"]:not(.dark-mode) :is(.member-spotlight-wrap, #section-rekap) {
      --member-spot-soft: #FAE8FF;
      --member-spot-ink: #86198F;
      --member-spot-border: #F0ABFC;
      --member-amber-soft: #FFEDD5;
      --member-amber-ink: #9A3412;
      --member-amber-border: #FDBA74;
    }

    body[data-palette="indigo"].dark-mode :is(.member-spotlight-wrap, #section-rekap) {
      --member-spot-soft: rgba(232, 121, 249, 0.16);
      --member-spot-ink: #F0ABFC;
      --member-spot-border: rgba(232, 121, 249, 0.36);
      --member-amber-soft: rgba(251, 146, 60, 0.16);
      --member-amber-ink: #FDBA74;
      --member-amber-border: rgba(251, 146, 60, 0.36);
    }

    .quick-cek-bar { padding: 14px 18px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
    .quick-cek-copy { display: flex; align-items: flex-start; gap: 12px; flex: 1 1 240px; min-width: 0; }
    .quick-cek-copy > div:not(.quick-cek-icon) { flex: 1; min-width: 0; }
    .quick-cek-icon {
      width: 38px; height: 38px; border-radius: 12px; background: var(--member-spot-soft); color: var(--member-spot-ink);
      display: grid; place-items: center; font-size: 18px; flex-shrink: 0;
    }
    .quick-cek-title { font-size: 15px; font-weight: 700; letter-spacing: -0.015em; line-height: 1.3; display: block; margin-bottom: 2px; overflow-wrap: anywhere; }
    .quick-cek-desc { font-size: 12.5px; font-weight: 500; line-height: 1.45; color: var(--text-muted); display: block; overflow-wrap: anywhere; }
    .quick-cek-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; max-width: 100%; }
    #spotlight-picker { width: 220px; min-width: 0; max-width: 100%; min-height: 38px; height: auto; }
    .member-spotlight-wrap select.form-control {
      min-height: 38px; height: auto; appearance: auto; background-image: none; padding: 6px 32px 6px 12px;
      border-radius: 12px; border: 1.5px solid var(--border); background-color: var(--surface); color: var(--text-main);
      font-weight: 600; font-size: 13px; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    @supports (appearance: base-select) {
      .member-spotlight-wrap select.form-control { appearance: base-select; padding: 6px 12px; }
      .member-spotlight-wrap select.form-control::picker(select) { max-width: min(360px, calc(100vw - 24px)); }
      .member-spotlight-wrap select.form-control option { white-space: normal; overflow-wrap: anywhere; }
    }

    #spotlight-card {
      padding: 18px 22px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        "id act"
        "div div"
        "months months";
      align-items: center;
      gap: 14px 20px;
      border-color: var(--member-spot-border);
      background:
        linear-gradient(135deg, color-mix(in oklab, var(--member-spot-soft) 55%, var(--surface)) 0%, var(--surface) 60%);
      animation: spotlight-spring 520ms var(--hybrid-ease-spring) both;
    }

    @keyframes spotlight-spring {
      0% { opacity: 0; transform: translateY(-10px) scale(0.96); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }

    .ring-box {
      position: relative; width: clamp(74px, 4.625rem, 108px); height: clamp(74px, 4.625rem, 108px);
      flex-shrink: 0; display: grid; place-items: center; container-type: inline-size;
    }
    .ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .ring-track { fill: none; stroke: var(--surface-3); stroke-width: 7; }
    .ring-progress { fill: none; stroke: var(--hybrid-spot); stroke-width: 7; stroke-linecap: round; transition: stroke-dashoffset 820ms var(--hybrid-ease-out); }
    .ring-center {
      position: absolute; inset: 0; padding: 6px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; text-align: center; line-height: 1.05; min-width: 0; overflow: hidden;
    }
    .ring-pct { font-size: clamp(13px, 22cqw, 20px); font-weight: 800; letter-spacing: -0.03em; white-space: nowrap; max-width: 100%; }
    .ring-frac { font-size: clamp(11px, 15cqw, 14px); font-weight: 700; color: var(--text-muted); white-space: nowrap; max-width: 100%; }
    .spotlight-identity { grid-area: id; display: flex; align-items: flex-start; gap: 16px; min-width: 0; }
    .spotlight-id-copy { display: flex; flex-direction: column; gap: 5px; min-width: 0; flex: 1; }
    .spotlight-eyebrow-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; max-width: 100%; }
    .spotlight-eyebrow {
      display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700;
      letter-spacing: 0.05em; text-transform: uppercase; color: var(--member-spot-ink); min-width: 0; max-width: 100%;
    }
    .spotlight-eyebrow i, .spotlight-name-btn i { flex-shrink: 0; }
    .spotlight-name-btn {
      margin: 0; font-size: clamp(1.125rem, 2vw, 1.3125rem); font-weight: 800; letter-spacing: -0.024em; line-height: 1.3;
      color: var(--text-main); display: inline-flex; align-items: center; gap: 7px; width: fit-content; min-width: 44px;
      max-width: 100%; min-height: 36px; overflow-wrap: anywhere; padding-block: 3px; padding-inline: 0 6px;
      border-radius: 8px; text-align: start; transition: color 150ms ease;
    }
    #spotlight-name {
      min-width: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden; overflow-wrap: anywhere; padding-block: 1px;
    }
    @media (hover: hover) and (pointer: fine) {
      .spotlight-name-btn:hover { color: var(--member-spot-ink); }
    }
    .spotlight-summary-line { margin: 0; font-size: 12.5px; font-weight: 500; line-height: 1.45; color: var(--text-muted); min-width: 0; overflow-wrap: anywhere; }

    .spotlight-divider {
      grid-area: div;
      height: 1px;
      width: 100%;
      background: color-mix(in oklab, var(--member-spot-border) 55%, var(--border));
    }

    #spotlight-card .spotlight-months {
      grid-area: months;
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 6px;
      min-width: 0;
    }

    #spotlight-card .mini-month-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      width: 100%;
      min-width: 0;
      min-height: 36px;
      padding: 6px 4px;
      border-radius: 8px;
      font-family: var(--font-mono);
      font-size: 11.5px;
      font-weight: 700;
      border: 1px solid var(--border);
      background: var(--surface);
      overflow: hidden;
      cursor: pointer;
      transition: transform 140ms ease, border-color 160ms ease;
      animation: mini-pill-in 360ms var(--hybrid-ease-spring) backwards;
      animation-delay: calc(var(--i, 0) * 26ms);
    }

    #spotlight-card .mini-month-pill > i {
      flex-shrink: 0;
    }

    #spotlight-card .mini-month-pill > span:last-child {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @keyframes mini-pill-in {
      from { opacity: 0; transform: translateY(6px) scale(0.92); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    #spotlight-card .mini-month-pill.paid {
      background: var(--income-bg);
      color: var(--income-strong);
      border-color: var(--income-border);
    }

    #spotlight-card .mini-month-pill.unpaid {
      background: var(--member-amber-soft);
      color: var(--member-amber-ink);
      border-color: var(--member-amber-border);
    }

    #spotlight-card .mini-month-pill.pending {
      background: var(--member-spot-soft);
      color: var(--member-spot-ink);
      border-color: var(--member-spot-border);
    }

    #spotlight-card .mini-month-pill.upcoming {
      border-style: dashed;
      border-color: var(--border-strong);
      background: transparent;
      color: var(--text-faint);
    }

    #spotlight-card .mini-month-pill.holiday {
      background: var(--surface-2);
      color: var(--text-faint);
      border-color: color-mix(in oklab, var(--border-strong) 82%, transparent);
    }

    #spotlight-card .spotlight-actions { grid-area: act; display: flex; align-items: center; gap: 8px; width: auto; min-width: 0; max-width: 100%; flex-shrink: 0; }
    #spotlight-swap-select { width: 176px; min-width: 0; max-width: 100%; min-height: 38px; height: auto; }
    #btn-unpin-member { min-height: 38px; height: auto; padding: 6px 12px; width: auto; white-space: nowrap; flex-shrink: 0; }
    #spotlight-pay-btn { min-height: 38px; height: auto; padding: 6px 16px; width: auto; white-space: nowrap; flex-shrink: 0; }
    #spotlight-card .spotlight-actions .btn i { flex-shrink: 0; }
    #spotlight-card .meta-chip {
      display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: var(--r-pill);
      background: var(--surface-2); color: var(--text-main); font-weight: 600; font-size: 12px;
      line-height: 1.35; min-width: 0; max-width: 100%; overflow-wrap: anywhere;
    }
    .spotlight-detail-cta {
      display: inline-flex; align-items: center; justify-content: center; margin-inline-start: 8px; margin-block: 2px;
      padding: 4px 10px; max-width: 100%; border-radius: var(--r-pill); border: 1px solid var(--accent-border);
      background: var(--accent-tint); color: var(--accent-strong); font-size: 12px; font-weight: 700;
      white-space: normal; text-align: center; cursor: pointer; transition: background-color 140ms ease, border-color 140ms ease;
    }
    @media (hover: hover) and (pointer: fine) {
      .spotlight-detail-cta:hover { background: color-mix(in oklab, var(--accent-tint) 75%, var(--surface)); }
    }

    .mini-stamp-ico {
      width: 13px;
      height: 13px;
      display: block;
      flex-shrink: 0;
    }

    .dues-person { display:flex; align-items:center; justify-content:space-between; gap:4px; }
    .dues-pin-btn {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      color: var(--text-muted);
      border: 1px solid transparent;
      flex-shrink: 0;
      cursor: pointer;
      transition: background-color 150ms ease, color 150ms ease, transform 160ms var(--hybrid-ease-spring);
    }
    @media (hover: hover) and (pointer: fine) {
      .dues-pin-btn:hover { background: var(--surface-2); color: var(--text-main); }
    }
    .dues-pin-btn[aria-pressed="true"] {
      background: var(--member-spot-soft);
      color: var(--member-spot-ink);
      border-color: var(--member-spot-border);
    }
    .self-pin-badge {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      vertical-align: middle;
      margin-inline-start: 6px;
      padding: 1px 7px;
      border-radius: var(--r-pill);
      font-size: 11px;
      font-weight: 700;
      background: var(--member-spot-soft);
      color: var(--member-spot-ink);
      border: 1px solid var(--member-spot-border);
    }
    @media (prefers-reduced-motion: no-preference) {
      .dues-pin-btn.bouncing { animation: pin-bounce 420ms var(--hybrid-ease-spring); }
    }
    @keyframes pin-bounce {
      0% { transform: scale(1) rotate(0deg); }
      35% { transform: scale(1.3) rotate(-18deg); }
      70% { transform: scale(.92) rotate(8deg); }
      100% { transform: scale(1) rotate(0deg); }
    }

    body.dark-mode .member-spotlight-wrap select.form-control { background-image: none; }
    #spotlight-card .spotlight-actions > :is(button, select), #spotlight-picker { min-height: 38px; }
    #spotlight-card .meta-chip.paid { background: var(--income-bg); color: var(--income-strong); }
    #spotlight-card .meta-chip.amber { display: block; width: fit-content; max-width: 100%; background: var(--member-amber-soft); color: var(--member-amber-ink); }
    #spotlight-card .meta-chip.mono { overflow-wrap: anywhere; }
    #spotlight-card .mini-month-pill:disabled { cursor: default; }
    #spotlight-card .spotlight-detail { grid-column: 1 / -1; margin: 0; min-width: 0; overflow-wrap: anywhere; font-size: 12.5px; line-height: 1.55; color: var(--text-muted); }

    @starting-style {
      #spotlight-card .ring-progress { stroke-dashoffset: 100; }
    }

    @media (max-width: 1060px) {
      #spotlight-card .spotlight-months { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    }

    @media (max-width: 900px) {
      #spotlight-card {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas: "id" "div" "months" "act";
        gap: 12px;
      }

      #spotlight-card .spotlight-actions {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        align-items: stretch;
      }

      #spotlight-pay-btn { order: -1; flex: 1 0 100%; width: 100%; white-space: normal; text-align: center; }
      #spotlight-swap-select { flex: 1 1 160px; width: auto; min-width: 0; }
      #btn-unpin-member { flex: 0 1 auto; white-space: normal; text-align: center; }
    }

    @media (max-width: 768px) {
      .quick-cek-controls, #spotlight-picker { width: 100%; }
      #spotlight-picker { min-width: 0; min-height: 44px; height: auto; }
      #spotlight-card { padding: 16px; }
      #spotlight-card .spotlight-identity { gap: 12px; }
      #spotlight-card .spotlight-months { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      #spotlight-card .spotlight-actions > :is(button, select) { min-height: 44px; height: auto; }
      #spotlight-card :is(.spotlight-name-btn, .mini-month-pill) { min-height: 44px; }
      .spotlight-detail-cta { min-height: 44px; padding: 6px 12px; }
      #spotlight-card .ring-box { width: clamp(64px, 4rem, 96px); height: clamp(64px, 4rem, 96px); }
      #spotlight-card .ring-svg { width: 100%; height: 100%; }
      #spotlight-card .ring-pct { font-size: clamp(13px, 22cqw, 18px); }
      .dues-pin-btn { width: 44px; height: 44px; }
    }

    @media (max-width: 360px) {
      #spotlight-card .spotlight-months { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }

    @media (prefers-reduced-motion: no-preference) {
      #spotlight-card .mini-month-pill:active:not(:disabled) {
        transform: scale(0.96);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #spotlight-card,
      #spotlight-card .mini-month-pill {
        animation: none;
      }
      #spotlight-card .ring-progress,
      #spotlight-card .mini-month-pill,
      .dues-pin-btn,
      .spotlight-detail-cta {
        transition: none;
      }
    }

    #spotlight-card .spotlight-actions .btn { font-size: 12px; font-weight: 700; }
    #spotlight-card #spotlight-pay-btn { background: var(--hybrid-brand); }
    #spotlight-card #btn-unpin-member { gap: 7px; }
  }
</style>
