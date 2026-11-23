<script lang="ts">
  import { profileStore as vm, renderPassbookEmblem } from '../stores/profile.svelte';
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

<style>
  :global {
    /* Buku Iuran Digital from the kinetic prototype. */
    #modal-profil-anggota:modal, #modal-profil-anggota::backdrop { overscroll-behavior: contain; }
    #modal-profil-anggota::backdrop { overflow: hidden; background: color-mix(in oklab, var(--text-main) 44%, transparent); }
    body.dark-mode #modal-profil-anggota::backdrop { background: rgba(6, 8, 12, .72); }
    #modal-profil-anggota[open] { visibility: visible; background: transparent; backdrop-filter: none; }
    #modal-profil-anggota .hybrid-passbook {
      --shadow-pop: 0 18px 46px -12px color-mix(in oklab, var(--text-main) 24%, transparent);
      width: min(680px, calc(100vw - 24px));
      padding: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    body.dark-mode #modal-profil-anggota .hybrid-passbook { --shadow-pop: 0 22px 54px -12px rgba(0, 0, 0, .78); }
    #modal-profil-anggota {
      .profil-hero {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 14px 16px;
        border-radius: 12px;
        background: var(--surface-2);
        border: 1px solid var(--border);
      }

      .profil-hero-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
        width: 100%;
      }

      .profil-hero-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .profil-total-box {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
      }

      .profil-total-lbl {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .profil-total-val {
        font-size: 20px;
        font-weight: 800;
        color: var(--pay-paid-ink);
      }

      .profil-chips-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding-top: 10px;
        border-top: 1px solid var(--border);
      }

      .passbook-head-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }

      .profil-passbook-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }

      @media (max-width: 768px) {
        .profil-passbook-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      .passbook-stamp-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        gap: 5px;
        padding: 8px 8px 7px;
        min-height: 92px;
        transform: none;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: var(--surface-2);
        font-size: 12px;
        line-height: normal;
        font-weight: 700;
        color: var(--text-main);
        animation: mini-pill-in 320ms var(--hybrid-ease-spring) backwards;
        animation-delay: calc(var(--pass-i, 0) * 25ms);
        transition: transform 140ms var(--hybrid-ease-spring), border-color 140ms ease;
      }

      .passbook-slot-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        width: 100%;
      }

      .passbook-slot-num {
        font-family: var(--font-mono);
        font-size: 9.5px;
        font-weight: 700;
        opacity: 0.62;
      }

      .passbook-slot-mon {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: -0.01em;
      }

      .passbook-slot-seal {
        width: 34px;
        height: 34px;
        margin: 0 auto;
        display: grid;
        place-items: center;
        transform: none;
      }

      .seal-svg {
        width: 100%;
        height: 100%;
        display: block;
      }

      .seal-halo {
        fill: var(--surface);
        stroke: var(--pay-paid-border);
        stroke-width: 1.5;
      }

      .seal-track-ring {
        fill: none;
        stroke: var(--pay-paid);
        stroke-width: 1.25;
        opacity: 0.45;
      }

      .seal-core {
        fill: var(--pay-paid);
      }

      .seal-core-ring {
        fill: none;
        stroke: var(--pay-on-paid);
        stroke-width: 1;
        opacity: 0.35;
      }

      .seal-check {
        fill: none;
        stroke: var(--pay-on-paid);
        stroke-width: 2.3;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .seal-unpaid-ring {
        fill: none;
        stroke: var(--pay-amber);
        stroke-width: 1.7;
        stroke-dasharray: 4 3;
      }

      .seal-unpaid-hand {
        fill: none;
        stroke: var(--pay-amber-ink);
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .seal-pending-ring {
        fill: var(--surface);
        stroke: var(--pay-spot);
        stroke-width: 1.7;
      }

      .seal-pending-plane {
        fill: none;
        stroke: var(--pay-spot-ink);
        stroke-width: 1.7;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .seal-upcoming-ring {
        fill: none;
        stroke: var(--border-strong);
        stroke-width: 1.5;
        stroke-dasharray: 2.5 3.5;
      }

      .seal-upcoming-dot {
        fill: var(--text-faint);
      }

      .seal-holiday-ring {
        fill: none;
        stroke: var(--text-faint);
        stroke-width: 1.6;
        opacity: 0.72;
      }

      .seal-holiday-bar {
        fill: none;
        stroke: var(--text-faint);
        stroke-width: 2;
        stroke-linecap: round;
      }

      .passbook-slot-tag {
        font-family: var(--font-mono);
        font-size: 9.5px;
        font-weight: 800;
        letter-spacing: 0.05em;
        padding: 2px 6px;
        border-radius: 8px;
        line-height: 1.15;
      }

      .passbook-stamp-btn.paid .passbook-slot-tag {
        background: color-mix(in oklab, var(--pay-paid) 14%, var(--surface));
        color: var(--pay-paid-ink);
      }

      .passbook-stamp-btn.unpaid .passbook-slot-tag {
        background: color-mix(in oklab, var(--pay-amber) 14%, var(--surface));
        color: var(--pay-amber-ink);
      }

      .passbook-stamp-btn.pending .passbook-slot-tag {
        background: color-mix(in oklab, var(--pay-spot) 14%, var(--surface));
        color: var(--pay-spot-ink);
      }

      .passbook-stamp-btn.upcoming .passbook-slot-tag,
      .passbook-stamp-btn.holiday .passbook-slot-tag {
        background: var(--surface-2);
        color: var(--text-faint);
      }

      .passbook-stamp-btn.paid {
        background: var(--pay-paid-soft);
        color: var(--pay-paid-ink);
        border-color: var(--pay-paid-border);
      }

      .passbook-stamp-btn.unpaid {
        background: var(--pay-amber-soft);
        color: var(--pay-amber-ink);
        border-color: var(--pay-amber-border);
      }

      .passbook-stamp-btn.pending {
        background: var(--pay-spot-soft);
        color: var(--pay-spot-ink);
        border-color: var(--pay-spot-border);
      }

      .profil-name-heading {
        font-size: 19px;
        font-weight: 800;
        letter-spacing: -0.022em;
        line-height: 1.2;
        color: var(--text-main);
        display: block;
      }

      .profil-meta-line {
        font-family: var(--font-mono);
        font-size: 12.5px;
        font-weight: 500;
        line-height: 1.4;
        color: var(--text-muted);
        display: block;
        margin-top: 2px;
      }

      .passbook-stamp-btn.upcoming {
        border-style: dashed;
        border-color: var(--border-strong);
        background: transparent;
        color: var(--text-faint);
      }

      .passbook-stamp-btn.holiday {
        background: var(--surface-2);
        color: var(--text-faint);
        border-color: color-mix(in oklab, var(--border-strong) 82%, transparent);
        opacity: 0.72;
      }

      .passbook-stamp-sub {
        font-family: var(--font-mono);
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .profil-history-list {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--border);
        border-radius: 12px;
        overflow: hidden;
      }

      .profil-history-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        text-align: left;
        min-height: 44px;
      }

      .profil-history-row:last-child {
        border-bottom: 0;
      }

      .profil-history-row:hover {
        background: var(--surface-2);
      }
      .dlg-header { padding: 18px 20px 14px; align-items: flex-start; gap: 12px; flex-shrink: 0; }
      .dlg-close-btn { min-width: 34px; min-height: 34px; width: 34px; height: 34px; }
      .dlg-body { padding: 18px 20px; overflow: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 16px; min-height: 0; }
      .field-group { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
      .field-label { font-size: 12px; font-weight: 700; color: var(--text-muted); }
      .profil-name-heading, .profil-meta-line, .profil-total-val { overflow-wrap: anywhere; }
      .profil-total-val { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
      .meta-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: var(--r-pill); font-weight: 600; font-size: 11.5px; }
      .meta-chip.paid { background: var(--pay-paid-soft); color: var(--pay-paid-ink); }
      .meta-chip.amber { background: var(--pay-amber-soft); color: var(--pay-amber-ink); }
      .meta-chip[hidden] { display: none; }
      .passbook-stamp-btn:not(:disabled), .profil-history-row { cursor: pointer; }
      .passbook-slot-tag { max-width: 100%; overflow-wrap: anywhere; }
      .profil-history-row .ledger-main { min-width: 0; }
      .profil-history-row .ledger-amt { color: var(--pay-paid-ink); text-align: end; overflow-wrap: anywhere; }
      .profile-history-empty { padding: 10px 12px; color: var(--text-muted); font-size: 12px; }
      .dlg-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; flex-shrink: 0; background: var(--surface); }
      .dlg-footer > .dlg-close-footer-desktop { margin-inline-start: auto; }
      .passbook-member-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .btn { border-radius: 12px; padding: 0 14px; gap: 7px; font-size: 13px; font-weight: 700; }
      .btn-secondary { background: var(--surface); }
      .btn-primary { background: var(--pay-brand-cta); color: var(--pay-on-brand); border-color: transparent; font-size: 13.5px; padding-inline: 16px; gap: 8px; }
      .btn-compact-34 { min-height: 34px; padding-inline: 12px; font-size: 12px; }
    }

    @media (max-width: 768px) {
      #modal-profil-anggota[open] .hybrid-passbook { width: 100%; border-bottom: 0; }
      #modal-profil-anggota .hybrid-sheet-handle { min-height: 44px; flex-shrink: 0; }
      #modal-profil-anggota .hybrid-sheet-handle span { width: 42px; height: 5px; }
      #modal-profil-anggota .dlg-header { padding-top: 4px; }
      #modal-profil-anggota :is(.dlg-close-btn, .btn) { min-height: 44px; }
      #modal-profil-anggota .dlg-close-btn { min-width: 44px; }
      #modal-profil-anggota .dlg-footer { display: block; padding: 12px 16px; }
      #modal-profil-anggota .passbook-member-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      #passbook-pay { grid-column: 1 / -1; }
      #modal-profil-anggota .dlg-close-footer-desktop { display: none; }
      body.admin-mode #modal-profil-anggota .dlg-footer { display: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      #modal-profil-anggota .passbook-stamp-btn { animation: none; transition: none; }
    }
  }
</style>
