<script lang="ts">
  import { iuranReviewChipsStore as review } from '../stores/transaction-form.svelte';
</script>

{#each review.visible as chip (chip.key)}
  <span class="trx-rev-chip"><span class="trx-rev-chip-av" aria-hidden="true">{chip.initials}</span><span>{chip.name}</span></span>
{/each}
{#if review.extraCount > 0}
  <span class="trx-rev-chip trx-rev-chip-more">+{review.extraCount} {review.moreLabel}</span>
{/if}

<style>
  :global {
    /* === HYBRID KINETIC 3-STEP WIZARDS (#modal-transaksi & #modal-edit-transaksi) === */

    :is(#modal-transaksi, #modal-edit-transaksi):modal,
    :is(#modal-transaksi, #modal-edit-transaksi)::backdrop { overscroll-behavior: contain; }
    :is(#modal-transaksi, #modal-edit-transaksi)::backdrop { overflow: hidden; }
    :is(#modal-transaksi, #modal-edit-transaksi) [hidden] { display: none !important; }

    :is(#modal-transaksi, #modal-edit-transaksi) .visually-hidden {
      position: absolute; clip-path: inset(50%); overflow: hidden;
      width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; white-space: nowrap;
    }

    :is(#modal-transaksi, #modal-edit-transaksi) .trx-record-sheet {
      position: relative;
      width: min(560px, calc(100vw - 28px)); max-width: 100%; padding: 0;
      border-radius: 20px; border: 1px solid var(--border);
      background: var(--surface); box-shadow: var(--shadow-pop);
      display: flex; flex-direction: column; overflow: visible;
    }
    :is(#modal-quickpay, #modal-transaksi, #modal-hapus, #modal-edit-transaksi, #modal-login)[data-pay-state] > .modal-content {
      position: relative;
      overflow: hidden;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) > .trx-record-sheet { max-height: min(92dvh, 760px); }

    :is(#modal-transaksi, #modal-edit-transaksi) .trx-sheet-header {
      padding: 15px 20px 13px; align-items: flex-start; gap: 12px; border-radius: 20px 20px 0 0;
      background: radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 58%), var(--surface);
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-header-main { display: flex; align-items: center; gap: 11px; min-width: 0; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-header-emblem {
      width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 12px;
      background: var(--accent-tint); border: 1px solid var(--accent-border); color: var(--accent-strong);
      display: grid; place-items: center; font-size: 19px; flex-shrink: 0;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-header-copy { min-width: 0; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-header-copy h2 {
      font-family: var(--font-display); font-size: 1.0625rem; font-weight: 800;
      letter-spacing: -0.012em; line-height: 1.25; color: var(--text-main); margin: 0;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-header-copy p {
      margin: 2px 0 0; font-size: 0.78125rem; font-weight: 500; color: var(--text-muted); line-height: 1.4;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-sheet-header .close-modal-btn {
      min-width: 34px; min-height: 34px; width: 34px; height: 34px; border-radius: 10px; margin-top: 1px;
    }

    /* 3-Step Wizard Stepper */
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-stepper {
      padding: 10px 20px 11px; border-bottom: 1px solid var(--border);
      background: var(--surface); flex-shrink: 0;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-stepper-list {
      display: flex; align-items: center; gap: 8px; list-style: none; margin: 0; padding: 0;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-item { flex-shrink: 0; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-sep {
      position: relative; flex: 1 1 20px; height: 2px; border-radius: var(--r-pill);
      background: var(--border); overflow: hidden;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-sep::after {
      content: ""; position: absolute; inset: 0; border-radius: inherit;
      background: var(--accent); transform-origin: left center; transform: scaleX(0);
      transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1);
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-sep.is-done::after { transform: scaleX(1); }
    :is(#modal-transaksi, #modal-edit-transaksi)[data-step-dir="backward"] .trx-step-sep:not(.is-done)::after { transform-origin: right center; }

    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-btn {
      display: inline-flex; align-items: center; gap: 7px; padding: 3px 7px 3px 3px;
      border-radius: var(--r-pill); border: 0; background: transparent; cursor: pointer;
      font-family: inherit; font-size: 12px; font-weight: 600; color: var(--text-muted);
      transition: background-color 150ms ease, color 150ms ease;
    }
    @media (hover: hover) and (pointer: fine) {
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-btn:hover { background: var(--surface-2); color: var(--text-main); }
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-badge {
      width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center;
      font-size: 11px; font-weight: 800; line-height: 1;
      border: 1.5px solid var(--border-strong); background: var(--surface-2); color: var(--text-muted);
      transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-check { display: none; font-size: 11.5px; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-item.is-active .trx-step-badge,
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-item.is-done .trx-step-badge {
      background: var(--accent); border-color: var(--accent); color: var(--accent-ink);
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-item.is-active .trx-step-label { color: var(--text-main); font-weight: 700; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-item.is-done .trx-step-num { display: none; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-item.is-done .trx-step-check { display: inline-flex; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-item.is-done .trx-step-label { color: var(--text-main); }
    @media (prefers-reduced-motion: no-preference) {
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-item.is-done .trx-step-check {
        animation: trxStepCheckPop 200ms var(--hybrid-ease-spring);
      }
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-item.is-active .trx-step-badge {
        animation: stepBadgeWorm 250ms var(--hybrid-ease-spring);
      }
    }
    @keyframes trxStepCheckPop {
      from { opacity: 0; scale: 0.68; }
      to { opacity: 1; scale: 1; }
    }
    @keyframes stepBadgeWorm {
      0% { transform: scaleX(1.22) scaleY(0.86); }
      60% { transform: scaleX(0.95) scaleY(1.04); }
      100% { transform: scale(1); }
    }

    /* Segmented Glider Tabs (Step 1 only) */
    #modal-transaksi .trx-tabs-bar { padding: 13px 20px 0; flex-shrink: 0; }
    #modal-transaksi .trx-tab-track {
      position: relative; isolation: isolate; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px; padding: 3px; margin: 0; background: var(--surface-2);
      border: 1px solid var(--border); border-radius: var(--r-pill);
    }
    #modal-transaksi .trx-glider-pill {
      position: absolute; z-index: -1; inset: 3px auto 3px 3px; width: calc((100% - 6px) / 2);
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-pill);
      box-shadow: var(--hybrid-card-shadow); translate: 0 0;
      transition: translate 280ms var(--hybrid-ease-spring); pointer-events: none;
    }
    #modal-transaksi .trx-tab-track:has(#btn-tab-operasional.active) .trx-glider-pill { translate: 100% 0; }
    #modal-transaksi .trx-tab-track .tab-btn {
      background: transparent; border: 0; box-shadow: none; min-height: 33px; padding: 5px 12px;
      font-size: 12.5px; font-weight: 700; color: var(--text-muted); border-radius: var(--r-pill); gap: 6px;
    }
    #modal-transaksi .trx-tab-track .tab-btn.active {
      background: transparent; border-color: transparent; box-shadow: none; color: var(--text-main);
    }
    @media (hover: hover) and (pointer: fine) {
      #modal-transaksi .trx-tab-track .tab-btn:hover:not(.active) { background: transparent; color: var(--text-main); }
    }

    #modal-transaksi .tab-content.active,
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-form { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; margin: 0; padding: 0; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-sheet-body { padding: 15px 20px 17px; display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }

    @keyframes trxStepForward {
      from { opacity: 0; translate: 14px 0; }
      to { opacity: 1; translate: 0 0; }
    }
    @keyframes trxStepBackward {
      from { opacity: 0; translate: -14px 0; }
      to { opacity: 1; translate: 0 0; }
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-panel {
      display: flex; flex-direction: column; gap: 13px;
    }
    @media (prefers-reduced-motion: no-preference) {
      :is(#modal-transaksi, #modal-edit-transaksi)[data-step-dir="forward"] .trx-step-panel {
        animation: trxStepForward 180ms cubic-bezier(0.23, 1, 0.32, 1);
      }
      :is(#modal-transaksi, #modal-edit-transaksi)[data-step-dir="backward"] .trx-step-panel {
        animation: trxStepBackward 180ms cubic-bezier(0.23, 1, 0.32, 1);
      }
    }

    :is(#modal-transaksi, #modal-edit-transaksi) .form-group { margin-bottom: 0; min-width: 0; }
    :is(#modal-transaksi, #modal-edit-transaksi) .form-group label {
      margin-bottom: 5px; font-size: 12px; font-weight: 600; line-height: 1.3; color: var(--text-main);
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-row-iuran-top { grid-template-columns: 1.2fr 1fr; gap: 11px; }
    #modal-transaksi .trx-row-iuran-period { grid-template-columns: 1.15fr 0.65fr 1.2fr; gap: 10px; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-row-ops-mid { grid-template-columns: 1.2fr 0.9fr; gap: 11px; }
    #modal-edit-transaksi .edit-row-period { grid-template-columns: 1.45fr 0.75fr; gap: 11px; }

    :is(#modal-transaksi, #modal-edit-transaksi) :is(.form-control, .cdrop-btn, .dpick-field) {
      min-height: 40px; height: 40px; padding: 7px 12px; font-size: 13px; border-radius: 10px;
    }
    #modal-edit-transaksi :is(.form-control, .cdrop-btn, .dpick-field) {
      background: var(--surface); border: 1px solid var(--border); font-weight: 600; color: var(--text-main);
    }
    @media (hover: hover) and (pointer: fine) {
      #modal-edit-transaksi :is(.form-control, .cdrop-btn, .dpick-field):hover {
        border-color: var(--border-strong); background: var(--surface);
      }
    }
    #modal-edit-transaksi #edit-tahun { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
    :is(#modal-transaksi, #modal-edit-transaksi) .form-control:user-invalid { border-color: var(--danger); box-shadow: 0 0 0 3px var(--danger-bg); }
    :is(#modal-transaksi, #modal-edit-transaksi) .input-with-prefix span { left: 12px; padding-right: 8px; font-size: 12.5px; }
    :is(#modal-transaksi, #modal-edit-transaksi) .input-with-prefix .form-control { padding-left: 48px; font-size: 14.5px; font-weight: 700; }
    #modal-edit-transaksi #edit-nominal { font-size: 15.5px; font-weight: 700; letter-spacing: -0.01em; }
    @media (pointer: coarse) {
      :is(#modal-transaksi, #modal-edit-transaksi) .form-control,
      #modal-transaksi .input-with-prefix .form-control,
      #modal-edit-transaksi .input-with-prefix .form-control,
      #modal-transaksi .trx-member-search input { font-size: 16px; }
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .cdrop-items { max-height: 220px; }

    /* Step Headings & Step 2 Member List */
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-head-copy { min-width: 0; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-title {
      font-family: var(--font-display); font-size: 0.96875rem; font-weight: 800;
      letter-spacing: -0.015em; line-height: 1.3; color: var(--text-main); margin: 0; outline: none;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-sub { margin: 2px 0 0; font-size: 12px; font-weight: 500; color: var(--text-muted); line-height: 1.35; }

    #modal-transaksi .trx-step-head-actions { display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0; }
    #modal-transaksi .badge-count-terpilih {
      margin-left: 0; height: 30px; padding: 0 10px; font-size: 11px; border-radius: var(--r-pill);
      display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; flex-shrink: 0;
    }
    #modal-transaksi #btn-pilih-semua.btn-select-all {
      height: 30px; min-height: 30px; padding: 0 12px; font-size: 12px; font-weight: 700;
      white-space: nowrap; flex-shrink: 0; border-radius: 9px;
    }

    #modal-transaksi .trx-member-search { width: 100%; max-width: none; min-width: 0; margin-bottom: 0; }
    #modal-transaksi .trx-member-search i { left: 12px; font-size: 15px; }
    #modal-transaksi .trx-member-search input { height: 36px; min-height: 36px; padding: 6px 12px 6px 36px; font-size: 13px; border-radius: 10px; }

    #modal-transaksi .trx-member-well { background: var(--surface-2); border: 1px solid var(--border); border-radius: 14px; padding: 7px; }
    #modal-transaksi .checkbox-grid {
      grid-template-columns: 1fr; gap: 6px; max-height: 214px;
      overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; padding: 1px;
    }
    #modal-transaksi .checkbox-item {
      display: flex; align-items: center; gap: 10px; padding: 8px 12px; min-height: 46px;
      border-radius: 11px; border: 1px solid var(--border); background: var(--surface);
      cursor: pointer; overflow: hidden; transition: border-color 140ms ease, background-color 140ms ease;
    }
    @media (hover: hover) and (pointer: fine) {
      #modal-transaksi .checkbox-item:hover:not(.item-disabled-lunas) { border-color: var(--border-strong); background: var(--surface-2); }
    }
    #modal-transaksi .checkbox-item:has(.chk-iuran:not(:disabled):checked) { border-color: var(--accent-border); background: var(--accent-tint); }
    #modal-transaksi .checkbox-item .chk-avatar {
      width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0;
      font-size: 11px; font-weight: 800; letter-spacing: 0.02em; background: var(--surface-2);
      border: 1px solid var(--border); color: var(--text-muted);
      transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
    }
    #modal-transaksi .checkbox-item:has(.chk-iuran:not(:disabled):checked) .chk-avatar {
      background: var(--accent); border-color: transparent; color: var(--accent-ink);
    }
    #modal-transaksi .chk-info-col { min-width: 0; flex: 1; display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 8px; }
    #modal-transaksi .checkbox-item .chk-name-pending,
    #modal-transaksi .checkbox-item .chk-name-lunas {
      display: block; font-size: 13px; font-weight: 600; line-height: 1.25;
      color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #modal-transaksi .checkbox-item:has(.chk-iuran:not(:disabled):checked) .chk-name-pending { color: var(--text-main); font-weight: 700; }

    #modal-transaksi .chk-badge-pending,
    #modal-transaksi .chk-badge-lunas {
      padding: 2px 8px; border-radius: var(--r-pill); font-size: 10px; font-weight: 700;
      line-height: 1.3; white-space: nowrap; flex-shrink: 0;
    }
    #modal-transaksi .chk-badge-pending { background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning-border); }
    #modal-transaksi .item-partial { border-color: var(--warning-border); }
    #modal-transaksi .chk-badge-lunas {
      display: inline-flex; align-items: center; gap: 4px;
      background: var(--income-bg); color: var(--income-strong); border: 1px solid var(--income-border);
    }
    #modal-transaksi .checkbox-item.item-disabled-lunas,
    #modal-transaksi .checkbox-item.item-disabled-lunas:has(input:checked) {
      opacity: 0.65; cursor: not-allowed; background: var(--surface-2); border-color: var(--border);
    }
    #modal-transaksi .checkbox-item input[type="checkbox"] {
      width: 17px; height: 17px; margin: 0; accent-color: var(--accent); flex-shrink: 0;
    }

    /* Step 1: Rich Flow Cards */
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-cards {
      border: 0; margin: 0; padding: 0; display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card {
      position: relative; display: flex; align-items: center; gap: 10px; margin: 0; padding: 11px 12px;
      border-radius: 13px; border: 1.5px solid var(--border); background: var(--surface);
      cursor: pointer; user-select: none;
      transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, transform 120ms var(--hybrid-ease-spring);
    }
    @media (hover: hover) and (pointer: fine) {
      :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card:hover { border-color: var(--border-strong); background: var(--surface-2); }
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-icon {
      width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center;
      font-size: 16px; flex-shrink: 0; transition: background-color 160ms ease, color 160ms ease;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card.is-keluar .ops-flow-icon { background: var(--danger-bg); color: var(--danger); }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card.is-masuk .ops-flow-icon { background: var(--income-bg); color: var(--income-strong); }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card.is-keluar:has(input:checked) { border-color: var(--danger-border); background: var(--danger-bg); }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card.is-keluar:has(input:checked) .ops-flow-icon { background: var(--danger); color: var(--surface); }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card.is-masuk:has(input:checked) { border-color: var(--income-border); background: var(--income-bg); }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card.is-masuk:has(input:checked) .ops-flow-icon { background: var(--income-strong); color: var(--surface); }

    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-copy { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-copy strong { font-size: 13px; font-weight: 700; color: var(--text-main); line-height: 1.25; }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-copy small { font-size: 11px; font-weight: 500; color: var(--text-muted); line-height: 1.25; }

    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-radio {
      width: 17px; height: 17px; border-radius: 50%; border: 1.5px solid var(--border-strong);
      background: var(--surface); display: grid; place-items: center; flex-shrink: 0; transition: border-color 160ms ease;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-radio::after {
      content: ''; width: 7px; height: 7px; border-radius: 50%; opacity: 0;
      transform: scale(0.5); transition: transform 160ms var(--hybrid-ease-spring), opacity 120ms ease-out;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card.is-keluar:has(input:checked) .ops-flow-radio { border-color: var(--danger); }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card.is-keluar:has(input:checked) .ops-flow-radio::after { background: var(--danger); opacity: 1; transform: scale(1); }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card.is-masuk:has(input:checked) .ops-flow-radio { border-color: var(--income-strong); }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card.is-masuk:has(input:checked) .ops-flow-radio::after { background: var(--income-strong); opacity: 1; transform: scale(1); }

    /* Preset Amount Chips */
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-label-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 5px; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-label-row label { margin-bottom: 0; }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-preset-chips { display: inline-flex; align-items: center; gap: 4px; }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-preset-chip {
      height: 22px; padding: 0 9px; border-radius: var(--r-pill); border: 1px solid var(--border);
      background: var(--surface-2); color: var(--text-muted); font-family: var(--font-mono);
      font-size: 11px; font-weight: 700; cursor: pointer;
      transition: border-color 140ms ease, background-color 140ms ease, color 140ms ease, transform 120ms var(--hybrid-ease-spring);
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .ops-preset-chip.is-active {
      border-color: var(--accent-border); background: var(--accent-tint); color: var(--accent-strong);
    }
    @media (hover: hover) and (pointer: fine) {
      :is(#modal-transaksi, #modal-edit-transaksi) .ops-preset-chip:hover { border-color: var(--accent-border); background: var(--accent-tint); color: var(--accent-strong); }
    }

    /* Step 3: Review Table, Chips & Callout Box */
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-list { display: flex; flex-direction: column; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-row {
      display: flex; align-items: baseline; justify-content: space-between; gap: 14px;
      padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-row:first-child { padding-top: 2px; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-row:last-child { border-bottom: 0; padding-bottom: 4px; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-row > span { color: var(--text-muted); font-weight: 500; flex-shrink: 0; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-row > strong {
      color: var(--text-main); font-weight: 700; text-align: right; min-width: 0; overflow-wrap: anywhere;
    }

    #modal-transaksi .trx-rev-members { display: flex; flex-direction: column; gap: 7px; }
    #modal-transaksi .trx-rev-members-label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
    #modal-transaksi .trx-rev-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    #modal-transaksi .trx-rev-chip {
      display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px 3px 4px;
      border-radius: var(--r-pill); background: var(--surface-2); border: 1px solid var(--border);
      font-size: 12px; font-weight: 600; color: var(--text-main);
    }
    #modal-transaksi .trx-rev-chip-av {
      width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center;
      background: var(--accent); color: var(--accent-ink); font-size: 9.5px; font-weight: 800; letter-spacing: 0.02em;
    }
    #modal-transaksi .trx-rev-chip-more {
      padding: 4px 10px; background: var(--accent-tint); border-color: var(--accent-border); color: var(--accent-strong);
    }

    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-callout {
      display: flex; align-items: center; justify-content: space-between; gap: 14px;
      padding: 12px 15px; border-radius: 13px; border: 1px solid var(--border); background: var(--surface-2);
      transition: background-color 180ms ease, border-color 180ms ease;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-callout.is-inflow { background: var(--income-bg); border-color: var(--income-border); }
    :is(#modal-transaksi, #modal-edit-transaksi)[data-pay-state="settled"] .trx-rev-callout.is-inflow {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--income-bg) 85%, var(--surface));
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-callout.is-outflow { background: var(--danger-bg); border-color: var(--danger-border); }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-callout-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-callout-meta > strong { font-size: 12.5px; font-weight: 700; color: var(--text-main); }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-callout-meta > span { font-size: 11.5px; font-weight: 500; color: var(--text-muted); }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-callout-val { display: flex; flex-direction: column; align-items: flex-end; text-align: right; gap: 1px; flex-shrink: 0; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-callout-val > span { font-size: 11px; font-weight: 600; color: var(--text-muted); }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-callout-val > strong {
      font-family: var(--font-display); font-size: 20px; font-weight: 800;
      font-variant-numeric: tabular-nums; letter-spacing: -0.02em; line-height: 1.15; color: var(--text-main);
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-callout.is-inflow .trx-rev-callout-val > strong { color: var(--income-strong); }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-callout.is-outflow .trx-rev-callout-val > strong { color: var(--danger); }

    /* Unified Wizard Footer */
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-sheet-footer { padding: 12px 20px; border-radius: 0 0 20px 20px; gap: 10px; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-footer-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-footer-meta {
      display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600;
      color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-footer-meta strong { color: var(--text-main); font-weight: 700; font-variant-numeric: tabular-nums; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-footer-actions { display: flex; align-items: center; gap: 8px; margin-inline-start: auto; flex-shrink: 0; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-sheet-footer .btn {
      min-width: 0; min-height: 38px; height: 38px; padding: 0 16px;
      font-size: 13px; font-weight: 700; border-radius: 11px;
    }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-btn-next { display: inline-flex; align-items: center; gap: 6px; }
    :is(#modal-transaksi, #modal-edit-transaksi) .trx-btn-next i { transition: transform 150ms var(--hybrid-ease-out); }
    @media (hover: hover) and (pointer: fine) {
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-btn-next:hover:not(:disabled) i { transform: translateX(2.5px); }
    }
    @media (prefers-reduced-motion: no-preference) {
      :is(#modal-transaksi, #modal-edit-transaksi) .ops-preset-chip:active,
      #modal-quickpay .qp-preset-chip:active { transform: scale(0.94); }
      :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card:active { transform: scale(0.985); }
      #modal-transaksi .checkbox-item:active:not(.item-disabled-lunas) { transform: scale(0.99); }
    }

    @media (max-height: 619px) and (min-width: 769px) {
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-record-sheet { overflow: hidden; }
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-sheet-body { overflow-y: auto; overscroll-behavior: contain; }
      :is(#modal-transaksi, #modal-edit-transaksi) .cdrop-items { max-height: 180px; }
    }

    @media (max-width: 768px) {
      :is(#modal-transaksi, #modal-edit-transaksi) > .trx-record-sheet {
        width: 100%; max-width: 100%; max-height: 92dvh; border-radius: 20px 20px 0 0; overflow: hidden;
      }
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-sheet-header { padding: 4px 16px 12px; border-radius: 0; }
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-sheet-header .close-modal-btn { min-width: 44px; min-height: 44px; width: 44px; height: 44px; }
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-stepper { padding: 10px 14px; }
      #modal-transaksi .trx-tabs-bar { padding: 11px 14px 0; }
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-sheet-body { padding: 13px 14px 15px; overflow-y: auto; overscroll-behavior: contain; }
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-row-iuran-top,
      #modal-transaksi .trx-row-iuran-period,
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-row-ops-mid { grid-template-columns: 1fr; gap: 10px; }
      #modal-edit-transaksi .edit-row-period { grid-template-columns: 1.35fr 0.85fr; gap: 10px; }
      :is(#modal-transaksi, #modal-edit-transaksi) :is(.form-control, .cdrop-btn, .dpick-field) {
        min-height: 44px; height: 44px; font-size: max(1rem, 1em);
      }
      #modal-edit-transaksi #trx-attachment-file { height: 42px; min-height: 42px; font-size: 12px; }
      #modal-edit-transaksi .edit-proof-card .attachment-btn-group .btn { min-height: 42px; height: 42px; }
      #modal-transaksi .checkbox-grid { max-height: 210px; }
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-sheet-footer { padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); border-radius: 0; }
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-sheet-footer .btn { min-height: 44px; height: 44px; }
    }

    @media (max-width: 520px) {
      :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-cards { grid-template-columns: 1fr; }
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-callout { flex-direction: column; align-items: flex-start; }
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-callout-val { align-items: flex-start; text-align: left; }
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-head { flex-wrap: wrap; }
    }

    @media (prefers-reduced-motion: reduce) {
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-panel,
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-item.is-done .trx-step-check,
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-item.is-active .trx-step-badge { animation: none; }
      #modal-transaksi .trx-glider-pill,
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-sep::after,
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-btn,
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-step-badge,
      :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-card,
      :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-icon,
      :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-radio,
      :is(#modal-transaksi, #modal-edit-transaksi) .ops-flow-radio::after,
      :is(#modal-transaksi, #modal-edit-transaksi) .ops-preset-chip,
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-btn-next i,
      #modal-transaksi .checkbox-item,
      #modal-transaksi .chk-avatar,
      #modal-quickpay .qp-preset-chip,
      :is(#modal-transaksi, #modal-edit-transaksi) .trx-rev-callout { transition: none; transform: none; }
    }

    /* === HYBRID KINETIC QUICK DUES PAYMENT SHEET (#modal-quickpay) === */

    #modal-quickpay:modal,
    #modal-quickpay::backdrop { overscroll-behavior: contain; }
    #modal-quickpay::backdrop { overflow: hidden; }
    #modal-quickpay [hidden] { display: none !important; }

    #modal-quickpay .quickpay-sheet {
      position: relative;
      width: min(480px, calc(100vw - 28px)); max-width: 100%; padding: 0;
      border-radius: 20px; border: 1px solid var(--border);
      background: var(--surface); box-shadow: var(--shadow-pop);
      display: flex; flex-direction: column; overflow: visible;
    }
    #modal-quickpay > .quickpay-sheet { max-height: min(92dvh, 760px); }

    #modal-quickpay .qp-sheet-header {
      padding: 15px 20px 13px; align-items: flex-start; gap: 12px; border-radius: 20px 20px 0 0;
      background: radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 58%), var(--surface);
    }
    #modal-quickpay .qp-header-main { display: flex; align-items: center; gap: 11px; min-width: 0; }
    #modal-quickpay .qp-header-emblem {
      width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 12px;
      background: var(--accent-tint); border: 1px solid var(--accent-border); color: var(--accent-strong);
      display: grid; place-items: center; font-size: 19px; flex-shrink: 0;
    }
    #modal-quickpay .qp-header-copy { min-width: 0; }
    #modal-quickpay .qp-header-copy h2 {
      font-family: var(--font-display); font-size: 1.0625rem; font-weight: 800;
      letter-spacing: -0.02em; line-height: 1.25; color: var(--text-main); margin: 0;
    }
    #modal-quickpay .qp-header-copy p {
      margin: 2px 0 0; font-size: 0.78125rem; font-weight: 500; color: var(--text-muted); line-height: 1.4;
    }
    #modal-quickpay .qp-sheet-header .close-modal-btn {
      min-width: 34px; min-height: 34px; width: 34px; height: 34px; border-radius: 10px; margin-top: 1px;
    }

    #modal-quickpay .qp-form { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; margin: 0; padding: 0; }
    #modal-quickpay .qp-sheet-body {
      padding: 15px 20px 17px; display: flex; flex-direction: column; gap: 13px; flex: 1 1 auto; min-height: 0;
    }

    #modal-quickpay .qp-member-card {
      display: flex; align-items: center; gap: 11px; padding: 11px 13px;
      border-radius: 14px; border: 1px solid var(--border); background: var(--surface-2);
      transition: background-color 180ms ease, border-color 180ms ease;
    }
    #modal-quickpay[data-pay-state="settled"] .qp-member-card {
      border-color: var(--income-border);
      background: color-mix(in srgb, var(--income-bg) 45%, var(--surface-2));
    }
    #modal-quickpay .qp-avatar {
      width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0;
      font-size: 12px; font-weight: 800; letter-spacing: 0.02em;
      background: var(--accent); color: var(--accent-ink);
    }
    #modal-quickpay .qp-member-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    #modal-quickpay .qp-member-name {
      font-size: 13.5px; font-weight: 700; color: var(--text-main); line-height: 1.25;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #modal-quickpay .qp-member-meta { font-size: 11.5px; font-weight: 500; color: var(--text-muted); line-height: 1.3; }
    #modal-quickpay .qp-status-pill {
      padding: 3px 9px; border-radius: var(--r-pill); font-size: 11px; font-weight: 800;
      letter-spacing: 0.03em; white-space: nowrap; flex-shrink: 0;
      background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning-border);
      transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease, transform 220ms cubic-bezier(0.23, 1, 0.32, 1);
    }
    #modal-quickpay .qp-status-pill.is-settled {
      background: var(--income-bg);
      color: var(--income-strong);
      border-color: var(--income-border);
    }
    @media (prefers-reduced-motion: no-preference) {
      #modal-quickpay .qp-status-pill.is-settled {
        animation: qp-pill-settled 220ms cubic-bezier(0.23, 1, 0.32, 1);
      }
    }
    @keyframes qp-pill-settled {
      0% { transform: scale(0.94); }
      55% { transform: scale(1.03); }
      100% { transform: scale(1); }
    }

    #modal-quickpay .form-group { margin-bottom: 0; min-width: 0; }
    #modal-quickpay .form-group label {
      margin-bottom: 5px; font-size: 12px; font-weight: 600; line-height: 1.3; color: var(--text-main);
    }
    #modal-quickpay .qp-label-row {
      display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 5px;
    }
    #modal-quickpay .qp-label-row label { margin-bottom: 0; }
    #modal-quickpay .qp-preset-chips { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    #modal-quickpay .qp-preset-chip {
      height: 22px; padding: 0 9px; border-radius: var(--r-pill); border: 1px solid var(--border);
      background: var(--surface-2); color: var(--text-muted); font-family: var(--font-mono);
      font-size: 11px; font-weight: 700; cursor: pointer;
      transition: border-color 140ms ease, background-color 140ms ease, color 140ms ease, transform 120ms var(--hybrid-ease-spring);
    }
    #modal-quickpay .qp-preset-chip.is-active {
      border-color: var(--accent-border); background: var(--accent-tint); color: var(--accent-strong);
    }
    @media (hover: hover) and (pointer: fine) {
      #modal-quickpay .qp-preset-chip:hover {
        border-color: var(--accent-border); background: var(--accent-tint); color: var(--accent-strong);
      }
    }

    #modal-quickpay .form-control,
    #modal-quickpay .dpick-field { min-height: 40px; height: 40px; padding: 7px 12px; font-size: 13px; border-radius: 10px; }
    #modal-quickpay .input-with-prefix span { left: 12px; padding-right: 8px; font-size: 12.5px; }
    #modal-quickpay .input-with-prefix .form-control { padding-left: 48px; font-size: 15px; font-weight: 700; }
    @media (pointer: coarse) {
      #modal-quickpay .form-control,
      #modal-quickpay .input-with-prefix .form-control { font-size: 16px; }
    }
    #modal-quickpay .qp-row-meta { grid-template-columns: 0.95fr 1.05fr; gap: 11px; }

    #modal-quickpay .qp-impact-callout {
      display: flex; align-items: center; justify-content: space-between; gap: 14px;
      padding: 12px 15px; border-radius: 13px; border: 1px solid var(--border); background: var(--surface-2);
      transition: background-color 160ms ease, border-color 160ms ease;
    }
    #modal-quickpay .qp-impact-callout.is-inflow { background: var(--income-bg); border-color: var(--income-border); }
    #modal-quickpay[data-pay-state="settled"] .qp-impact-callout {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--income-bg) 85%, var(--surface));
    }
    #modal-quickpay .qp-impact-callout.is-partial { background: var(--warning-bg); border-color: var(--warning-border); }
    #modal-quickpay .qp-impact-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    #modal-quickpay .qp-impact-meta > strong { font-size: 12.5px; font-weight: 700; color: var(--text-main); }
    #modal-quickpay .qp-impact-meta > span { font-size: 11.5px; font-weight: 500; color: var(--text-muted); }
    #modal-quickpay .qp-impact-val {
      display: flex; flex-direction: column; align-items: flex-end; text-align: right; gap: 1px; flex-shrink: 0;
    }
    #modal-quickpay .qp-impact-val > span { font-size: 11px; font-weight: 600; color: var(--text-muted); }
    #modal-quickpay .qp-impact-val > strong {
      font-family: var(--font-display); font-size: 19px; font-weight: 800;
      font-variant-numeric: tabular-nums; letter-spacing: -0.02em; line-height: 1.15; color: var(--text-muted);
    }
    #modal-quickpay .qp-impact-callout.is-inflow .qp-impact-val > strong { color: var(--income-strong); }
    #modal-quickpay .qp-impact-callout.is-partial .qp-impact-val > strong { color: var(--warning); }

    #modal-quickpay .qp-sheet-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 12px 20px; border-radius: 0 0 20px 20px; margin: 0;
    }
    #modal-quickpay .qp-sheet-footer .btn {
      min-width: 0; min-height: 38px; height: 38px; padding: 0 16px;
      font-size: 13px; font-weight: 700; border-radius: 11px;
    }

    @media (max-height: 619px) and (min-width: 769px) {
      #modal-quickpay .quickpay-sheet { overflow: hidden; }
      #modal-quickpay .qp-sheet-body { overflow-y: auto; overscroll-behavior: contain; }
    }

    @media (max-width: 768px) {
      #modal-quickpay .quickpay-sheet,
      #modal-quickpay > .quickpay-sheet {
        width: 100%; max-width: 100%; max-height: 92dvh; padding: 0; border-radius: 20px 20px 0 0; overflow: hidden;
      }
      #modal-quickpay .qp-sheet-header { padding: 4px 16px 12px; border-radius: 0; }
      #modal-quickpay .qp-sheet-header .close-modal-btn { min-width: 44px; min-height: 44px; width: 44px; height: 44px; }
      #modal-quickpay .qp-sheet-body { padding: 13px 14px 15px; overflow-y: auto; overscroll-behavior: contain; }
      #modal-quickpay .form-control,
      #modal-quickpay .dpick-field { min-height: 44px; height: 44px; font-size: max(1rem, 1em); }
      #modal-quickpay .qp-sheet-footer {
        display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px;
        padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); border-radius: 0;
      }
      #modal-quickpay .qp-sheet-footer .btn { min-height: 44px; height: 44px; }
    }

    @media (max-width: 520px) {
      #modal-quickpay .qp-row-meta { grid-template-columns: 1fr; }
      #modal-quickpay .qp-impact-callout { flex-direction: column; align-items: flex-start; }
      #modal-quickpay .qp-impact-val { align-items: flex-start; text-align: left; }
    }

    @media (prefers-reduced-motion: reduce) {
      #modal-quickpay .qp-member-card,
      #modal-quickpay .qp-status-pill,
      #modal-quickpay .qp-impact-callout { transition: none; }
    }
  }
</style>
