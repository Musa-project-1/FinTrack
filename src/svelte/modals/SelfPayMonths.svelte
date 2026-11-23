<script lang="ts">
  import { selfPayStore as vm } from '../stores/self-pay.svelte';
</script>

{#each vm.years as group (group.year)}
  <div>
    {#if vm.showYearHeading}
      <h4 class="self-pay-year">{group.year}</h4>
    {/if}
    <div class="self-pay-month-grid">
      {#each group.months as m (m.periodKey)}
        <button type="button" class="self-pay-month" data-payment-period={m.periodKey} data-status={m.status}
          disabled={m.disabled} aria-pressed={m.pressed} aria-label={m.ariaLabel}>
          <span>{m.shortLabel}</span><small>{m.pressed ? 'PILIH' : m.statusUpper}</small>
        </button>
      {/each}
    </div>
  </div>
{/each}

<style>
  :global {
    /* Payment account form styles consolidated into css/modules/view-master.css */

    .receipt-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:14px; }
    .receipt-actions > * { min-height:44px; width:100%; }
    #modal-struk .btn-secondary {
      display:inline-flex; align-items:center; justify-content:center; gap:7px;
      border:1px solid var(--border); background:var(--surface); border-radius:12px;
      padding:0 14px; min-height:44px; font-size:13px; font-weight:700; color:var(--text-main);
    }
    #modal-struk .btn-secondary:hover { background:var(--surface-2); border-color:var(--border-strong); }

    .receipt-amount { font: 800 1.625rem/1.5 var(--font-mono); letter-spacing: -.03em; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
    .receipt-amount[data-flow="in"] { color:var(--income-strong); }
    .receipt-rows { display:grid; grid-template-columns:max-content minmax(0,1fr); gap:8px 14px; margin:16px 0; font-size:13px; }
    .receipt-rows dt { color:var(--text-muted); font-weight: 600; }
    .receipt-rows dd { margin:0; font-weight: 700; text-align: end; overflow-wrap:anywhere; }
    .receipt-footer { border-top:1px dashed var(--border-strong); padding-top:12px; color:var(--text-muted); font-size:12px; }
    .receipt-seal {
      display:flex; align-items:center; justify-content:center; gap:8px; width:fit-content; max-width:100%;
      padding:6px 10px; margin:10px auto 0; border:1.5px solid; border-radius:8px;
      font:700 11px var(--font-mono); color:var(--text-muted);
    }
    .receipt-seal[data-tone="verified"] { color:var(--income-strong); background:var(--income-bg); }
    .receipt-seal svg { flex-shrink:0; }
    .receipt-row-button { color:var(--accent-strong); cursor:pointer; min-height:44px; min-width:44px; font-size:11px; }
    .receipt-actions [hidden] { display:none; }

    #modal-struk { justify-content: flex-end; align-items: stretch; padding: 12px; overflow: clip; }
    #modal-struk .receipt-drawer {
      width: min(460px, calc(100vw - 24px));
      height: calc(100dvh - 24px);
      max-height: calc(100dvh - 24px);
      margin: 0;
      padding: 0;
      border-radius: var(--r-card, 20px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .receipt-content { flex: 1; min-height: 0; overflow: hidden auto; padding: 18px 20px; }
    .receipt-sheet {
      padding: 18px;
      border-radius: var(--r-card, 20px);
      background: var(--surface-2);
      border: 1px dashed var(--border-strong);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .receipt-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; font: 600 12px var(--font-mono); color: var(--text-muted); }
    .receipt-meta .meta-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px; border-radius: var(--r-pill);
      font-family: var(--font-sans); font-size: 11.5px; font-weight: 700;
      background: var(--surface); color: var(--text-muted);
    }
    .receipt-meta .meta-chip.paid { background: var(--income-bg); color: var(--income-strong); }
    .receipt-controls { margin-top: auto; }
    .receipt-controls > button { margin-inline-start: auto; }
    .receipt-sheet .receipt-rows { margin: 0; row-gap: 12px; }
    .receipt-sheet .receipt-footer { border: 0; padding: 0; }
    .receipt-sheet .receipt-seal { width: 100%; border: 0; border-radius: 0; border-top: 1px dashed var(--border-strong); background: none; justify-content: start; padding: 12px 0 0; }
    .receipt-seal-ico { flex: 0 0 34px; width: 34px; height: 34px; }
    .receipt-seal-ico svg { width: 100%; height: 100%; }
    .receipt-seal .seal-halo { fill: var(--surface); stroke: currentColor; stroke-width: 1.5; }
    .receipt-seal :is(.seal-track-ring, .seal-core-ring) { fill: none; stroke: currentColor; opacity: .45; }
    .receipt-seal .seal-core { fill: currentColor; }
    .receipt-seal .seal-check { fill: none; stroke: var(--surface); stroke-width: 2.3; stroke-linecap: round; stroke-linejoin: round; }
    .receipt-seal-copy { display: grid; gap: 1px; min-width: 0; }
    .receipt-seal-copy span { color: var(--text-muted); font: 600 11px var(--font-sans, sans-serif); overflow-wrap: anywhere; }
    .receipt-seal-year { margin-inline-start: auto; color: var(--text-muted); }
    @media (min-width: 769px) and (prefers-reduced-motion: no-preference) {
      #modal-struk { --dues-panel-closed-scale: 1; }
      #modal-struk > .receipt-drawer { translate: 36px 0; transition-timing-function: var(--hybrid-ease-out); }
      #modal-struk[open]:not([data-dues-closing]) > .receipt-drawer { translate: 0 0; }
      @starting-style {
        #modal-struk[open]:not([data-dues-closing]) > .receipt-drawer { translate: 36px 0; }
      }
    }
    @media (max-width: 768px) {
      #modal-struk { align-items: flex-end; padding: 0; }
      #modal-struk .receipt-drawer { width: 100%; height: 90dvh; max-height: 90dvh; border-radius: 20px 20px 0 0; }
      .receipt-content { padding-inline: 12px; }
    }

    /* Bayar Iuran follows the prototype dialog, with production controls and ledger states. */
    body[data-palette="terracotta"]:not(.dark-mode) :is(#modal-bayar-anggota, #modal-profil-anggota) {
      --pay-brand: #E05A3A;
      --pay-brand-cta: #C84628;
      --pay-brand-cta-hover: #AE3A1F;
      --pay-on-brand: #FEFBF9;
      --pay-brand-ink: #A9351B;
      --pay-brand-soft: #FDECE7;
      --pay-amber-soft: #FDF4E3;
      --pay-amber-border: #F6D28B;
      --pay-amber-ink: #8E5200;
      --pay-spot-soft: #E3F6FA;
      --pay-spot-border: #99DDF0;
      --pay-spot-ink: #0B5C73;
      --pay-paid-soft: #E8F1FF;
      --pay-paid-border: #ACC8FA;
      --pay-paid-ink: #154EB4;
      --pay-spot: #0E7490;
      --pay-amber: #C27803;
      --pay-on-paid: #FEFBF9;
      --pay-paid: #1D63DC;
    }

    body[data-palette="terracotta"].dark-mode :is(#modal-bayar-anggota, #modal-profil-anggota) {
      --pay-brand: #F97352;
      --pay-brand-cta: #F97352;
      --pay-brand-cta-hover: #FB8A6E;
      --pay-on-brand: #1B0904;
      --pay-brand-ink: #FCA58E;
      --pay-brand-soft: rgba(249, 115, 82, 0.16);
      --pay-amber-soft: rgba(245, 158, 11, 0.16);
      --pay-amber-border: rgba(251, 191, 36, 0.36);
      --pay-amber-ink: #FCD34D;
      --pay-spot-soft: rgba(34, 211, 238, 0.15);
      --pay-spot-border: rgba(103, 232, 249, 0.34);
      --pay-spot-ink: #67E8F9;
      --pay-paid-soft: rgba(59, 130, 246, 0.17);
      --pay-paid-border: rgba(96, 165, 250, 0.36);
      --pay-paid-ink: #93C5FD;
      --pay-spot: #22D3EE;
      --pay-amber: #F59E0B;
      --pay-on-paid: #F8FAFC;
      --pay-paid: #60A5FA;
    }

    body[data-palette="cobalt"]:not(.dark-mode) :is(#modal-bayar-anggota, #modal-profil-anggota) {
      --pay-brand: #0052FF;
      --pay-brand-cta: #0047E0;
      --pay-brand-cta-hover: #0039B8;
      --pay-on-brand: #F8FAFE;
      --pay-brand-ink: #0040C9;
      --pay-brand-soft: #E6EEFF;
      --pay-amber-soft: #FEF3C7;
      --pay-amber-border: #FCD34D;
      --pay-amber-ink: #92400E;
      --pay-spot-soft: #EEF2FF;
      --pay-spot-border: #BAC4FF;
      --pay-spot-ink: #3730A3;
      --pay-paid-soft: #E0F2FE;
      --pay-paid-border: #93D5FD;
      --pay-paid-ink: #0369A1;
      --pay-spot: #4F46E5;
      --pay-amber: #D97706;
      --pay-on-paid: #FEFBF9;
      --pay-paid: #0284C7;
    }

    body[data-palette="cobalt"].dark-mode :is(#modal-bayar-anggota, #modal-profil-anggota) {
      --pay-brand: #3B82F6;
      --pay-brand-cta: #60A5FA;
      --pay-brand-cta-hover: #93C5FD;
      --pay-on-brand: #051229;
      --pay-brand-ink: #93C5FD;
      --pay-brand-soft: rgba(59, 130, 246, 0.16);
      --pay-amber-soft: rgba(251, 191, 36, 0.16);
      --pay-amber-border: rgba(251, 191, 36, 0.36);
      --pay-amber-ink: #FCD34D;
      --pay-spot-soft: rgba(129, 140, 248, 0.16);
      --pay-spot-border: rgba(129, 140, 248, 0.36);
      --pay-spot-ink: #A5B4FC;
      --pay-paid-soft: rgba(56, 189, 248, 0.16);
      --pay-paid-border: rgba(56, 189, 248, 0.36);
      --pay-paid-ink: #7DD3FC;
      --pay-spot: #818CF8;
      --pay-amber: #FBBF24;
      --pay-on-paid: #F8FAFC;
      --pay-paid: #38BDF8;
    }

    body[data-palette="charcoal"]:not(.dark-mode) :is(#modal-bayar-anggota, #modal-profil-anggota) {
      --pay-brand: #181A20;
      --pay-brand-cta: #181A20;
      --pay-brand-cta-hover: #2A2D37;
      --pay-on-brand: #F8F8FA;
      --pay-brand-ink: #181A20;
      --pay-brand-soft: #EBEBEF;
      --pay-amber-soft: #FEF3C7;
      --pay-amber-border: #FCD34D;
      --pay-amber-ink: #8C3E05;
      --pay-spot-soft: #FCE7F3;
      --pay-spot-border: #F9A8D4;
      --pay-spot-ink: #9D174D;
      --pay-paid-soft: #E6EEFF;
      --pay-paid-border: #B2CCFF;
      --pay-paid-ink: #1D4ED8;
      --pay-spot: #BE185D;
      --pay-amber: #B45309;
      --pay-on-paid: #FEFBF9;
      --pay-paid: #2563EB;
    }

    body[data-palette="charcoal"].dark-mode :is(#modal-bayar-anggota, #modal-profil-anggota) {
      --pay-brand: #F2F3F8;
      --pay-brand-cta: #F2F3F8;
      --pay-brand-cta-hover: #DCE0EC;
      --pay-on-brand: #0E1016;
      --pay-brand-ink: #F2F3F8;
      --pay-brand-soft: rgba(242, 243, 248, 0.14);
      --pay-amber-soft: rgba(251, 191, 36, 0.16);
      --pay-amber-border: rgba(251, 191, 36, 0.36);
      --pay-amber-ink: #FCD34D;
      --pay-spot-soft: rgba(244, 114, 182, 0.16);
      --pay-spot-border: rgba(244, 114, 182, 0.36);
      --pay-spot-ink: #F9A8D4;
      --pay-paid-soft: rgba(96, 165, 250, 0.16);
      --pay-paid-border: rgba(96, 165, 250, 0.36);
      --pay-paid-ink: #93C5FD;
      --pay-spot: #F472B6;
      --pay-amber: #FBBF24;
      --pay-on-paid: #F8FAFC;
      --pay-paid: #60A5FA;
    }

    body[data-palette="indigo"]:not(.dark-mode) :is(#modal-bayar-anggota, #modal-profil-anggota) {
      --pay-brand: #4338CA;
      --pay-brand-cta: #4338CA;
      --pay-brand-cta-hover: #3730A3;
      --pay-on-brand: #F9F9FE;
      --pay-brand-ink: #3730A3;
      --pay-brand-soft: #EAE8FF;
      --pay-amber-soft: #FFEDD5;
      --pay-amber-border: #FDBA74;
      --pay-amber-ink: #9A3412;
      --pay-spot-soft: #FAE8FF;
      --pay-spot-border: #F0ABFC;
      --pay-spot-ink: #86198F;
      --pay-paid-soft: #E0F2FE;
      --pay-paid-border: #99D5FB;
      --pay-paid-ink: #0369A1;
      --pay-spot: #A21CAF;
      --pay-amber: #C2410C;
      --pay-on-paid: #FEFBF9;
      --pay-paid: #0284C7;
    }

    body[data-palette="indigo"].dark-mode :is(#modal-bayar-anggota, #modal-profil-anggota) {
      --pay-brand: #818CF8;
      --pay-brand-cta: #818CF8;
      --pay-brand-cta-hover: #A5B4FC;
      --pay-on-brand: #100E24;
      --pay-brand-ink: #A5B4FC;
      --pay-brand-soft: rgba(129, 140, 248, 0.16);
      --pay-amber-soft: rgba(251, 146, 60, 0.16);
      --pay-amber-border: rgba(251, 146, 60, 0.36);
      --pay-amber-ink: #FDBA74;
      --pay-spot-soft: rgba(232, 121, 249, 0.16);
      --pay-spot-border: rgba(232, 121, 249, 0.36);
      --pay-spot-ink: #F0ABFC;
      --pay-paid-soft: rgba(56, 189, 248, 0.16);
      --pay-paid-border: rgba(56, 189, 248, 0.36);
      --pay-paid-ink: #7DD3FC;
      --pay-spot: #E879F9;
      --pay-amber: #FB923C;
      --pay-on-paid: #F8FAFC;
      --pay-paid: #38BDF8;
    }

    #modal-bayar-anggota:modal, #modal-bayar-anggota::backdrop { overscroll-behavior: contain; }
    #modal-bayar-anggota::backdrop {
      overflow: hidden;
      background: color-mix(in oklab, var(--text-main) 44%, transparent);
    }
    body.dark-mode #modal-bayar-anggota::backdrop { background: rgba(6, 8, 12, .72); }
    #modal-bayar-anggota[open] {
      visibility: visible;
      background: transparent;
      backdrop-filter: none;
    }
    #modal-bayar-anggota .self-pay-sheet {
      width: min(680px, calc(100vw - 24px));
      --shadow-pop: 0 18px 46px -12px color-mix(in oklab, var(--text-main) 24%, transparent);
      padding: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    body.dark-mode #modal-bayar-anggota .self-pay-sheet { --shadow-pop: 0 22px 54px -12px rgba(0, 0, 0, .78); }
    .self-pay-sheet .hybrid-settings-header { padding: 18px 20px 14px; align-items: flex-start; gap: 12px; flex-shrink: 0; }
    .self-pay-sheet .hybrid-settings-header .close-modal-btn { min-width: 34px; min-height: 34px; width: 34px; height: 34px; }
    .hybrid-self-pay-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 18px 20px;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
    }
    .hybrid-self-pay-body > * { min-width: 0; }
    .self-pay-field { display: grid; gap: 6px; }
    .self-pay-field :is(label,h3), .self-pay-card-header h3, .self-pay-year {
      font-size: .75rem;
      font-weight: 700;
      color: var(--text-muted);
    }
    #self-pay-member {
      appearance: auto;
      background-image: none;
      background-color: var(--surface);
      min-height: 38px;
      padding: 0 32px 0 12px;
      border-radius: 12px;
      border: 1.5px solid var(--border);
      font-size: .8125rem;
      font-weight: 600;
    }

    @supports (appearance: base-select) {
      #self-pay-member {
        appearance: base-select;
        padding: 0 12px;
      }
    }
    .self-pay-presets, .self-pay-month-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }
    .self-pay-presets button {
      padding: 6px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface-2);
      color: var(--text-main);
      font: 700 .75rem var(--font-mono);
      cursor: pointer;
    }
    .self-pay-presets button:hover {
      border-color: var(--pay-brand);
      background: var(--pay-brand-soft);
      color: var(--pay-brand-ink);
    }
    .self-pay-label-phone { display: none; }
    .self-pay-months { display: grid; gap: 10px; }
    .self-pay-year { margin-bottom: 6px; }
    .self-pay-month-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .self-pay-month {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      min-height: 48px;
      padding: 6px 8px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface-2);
      color: var(--text-main);
      font-size: .75rem;
      font-weight: 700;
      line-height: normal;
      cursor: pointer;
      transition: transform 140ms var(--hybrid-ease-spring), background-color 150ms ease, border-color 150ms ease;
    }
    .self-pay-month[data-status="Belum"] { border-color: var(--pay-amber-border); background: var(--pay-amber-soft); color: var(--pay-amber-ink); }
    .self-pay-month[data-status="Nanti"] { border: 1px dashed var(--border-strong); background: transparent; color: var(--text-muted); }
    .self-pay-month[data-status="Sebagian"] { border-color: var(--pay-spot-border); background: var(--pay-spot-soft); color: var(--pay-spot-ink); }
    .self-pay-month[data-status="Lunas"] { border-color: var(--pay-paid-border); background: var(--pay-paid-soft); color: var(--pay-paid-ink); opacity: .72; }
    .self-pay-month[data-status="Libur"] { color: var(--text-faint); border-color: color-mix(in oklab, var(--border-strong) 82%, transparent); opacity: .65; }
    .self-pay-month[aria-pressed="true"] { border: 1px solid var(--pay-brand); background: var(--pay-brand-cta); color: var(--pay-on-brand); }
    .self-pay-month:disabled { cursor: default; }
    .self-pay-month:not(:disabled):active { transform: scale(.96); }
    .self-pay-month small { font: 700 .59375rem var(--font-mono); letter-spacing: .02em; opacity: .9; }

    .self-pay-grid { display: grid; grid-template-columns: minmax(0, .95fr) minmax(0, 1.05fr); gap: 10px; }
    .self-pay-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface-2);
    }
    .self-pay-card-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 8px;
    }
    .self-pay-card-header > div { min-width: 0; overflow-wrap: anywhere; }
    #modal-bayar-anggota .btn-secondary {
      gap: 7px;
      padding: 0 14px;
      border-radius: 12px;
      background: var(--surface);
      font-size: .8125rem;
      font-weight: 700;
    }
    #modal-bayar-anggota .btn-secondary:hover:not(:disabled) {
      background: var(--surface-2);
      border-color: var(--border-strong);
    }
    #modal-bayar-anggota .self-pay-card-header .btn-secondary { min-height: 34px; padding: 0 10px; font-size: .75rem; }
    .self-pay-preview-wrap { position: relative; display: grid; }
    #modal-bayar-anggota .self-pay-copy-preview { position: absolute; inset: 6px 6px auto auto; padding: 0; width: 34px; min-height: 34px; }
    #self-pay-preview { padding-inline-end: 48px; }
    .self-pay-section p { color: var(--text-muted); font-size: .75rem; overflow-wrap: anywhere; }
    #self-pay-account { font: 700 .875rem/1.5 var(--font-mono); font-variant-numeric: tabular-nums; }
    #self-pay-total {
      font: 800 1.375rem/1.5 var(--font-mono);
      font-variant-numeric: tabular-nums;
      letter-spacing: -.02em;
      color: var(--pay-brand-ink);
    }
    .self-pay-preview, .self-pay-copy-field {
      width: 100%;
      min-height: 112px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface-2);
      color: var(--text-main);
      font: .71875rem/1.5 var(--font-mono);
      resize: vertical;
    }
    .self-pay-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      flex-shrink: 0;
      gap: 10px;
      padding: 14px 20px;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }
    .self-pay-actions > * { min-height: 40px; }
    #self-pay-whatsapp {
      padding: 0 16px;
      border: 1px solid transparent;
      border-radius: 12px;
      background: var(--pay-brand-cta);
      color: var(--pay-on-brand);
      font-size: .84375rem;
      line-height: normal;
      font-weight: 700;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .16), 0 1px 2px rgba(24, 20, 18, .08);
    }
    #self-pay-whatsapp:hover[href] { background: var(--pay-brand-cta-hover); }
    #self-pay-whatsapp[aria-disabled="true"] { opacity: .5; cursor: default; }

    @media (max-width: 768px) {
      #modal-bayar-anggota[open] .self-pay-sheet { width: 100%; border-bottom: 0; }
      .self-pay-sheet .hybrid-sheet-handle { min-height: 44px; flex-shrink: 0; }
      .self-pay-sheet .hybrid-sheet-handle span { width: 42px; height: 5px; }
      .self-pay-sheet .hybrid-settings-header { padding-top: 4px; }
      .self-pay-sheet .hybrid-settings-header .close-modal-btn { min-width: 44px; min-height: 44px; }
      #self-pay-member, .self-pay-presets button, .self-pay-actions > *,
      #modal-bayar-anggota .self-pay-card-header .btn-secondary, #modal-bayar-anggota .self-pay-copy-preview { min-height: 44px; }
      #modal-bayar-anggota .self-pay-copy-preview { width: 44px; }
      #self-pay-preview { padding-inline-end: 56px; }
      .self-pay-presets button { display: flex; align-items: center; justify-content: center; white-space: nowrap; }
      .self-pay-month-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .self-pay-month { min-height: 44px; }
      .self-pay-label-desktop { display: none; }
      .self-pay-label-phone { display: inline; }
      .self-pay-actions { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
      #self-pay-whatsapp { order: -1; }
    }
    @media (max-width: 359px) {
      .self-pay-presets button { padding-inline: 2px; }
    }
    @media (max-width: 640px) {
      .self-pay-grid { grid-template-columns: minmax(0, 1fr); }
    }
    @media (prefers-reduced-motion: reduce) {
      .self-pay-month { transition: none; }
    }

    /* QuickPay styles consolidated into css/modules/trx-modal.css */
  }
</style>
