<script lang="ts">
  import { iuranChecklistStore as checklist } from '../stores/transaction-form.svelte';
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
      <span class="chk-box-wrap">
        <input type="checkbox" id="chk-iuran-{item.id}" name="iuran-anggota" class="chk-iuran"
          value={item.id} data-member-name={item.name} disabled={item.disabled} checked={item.defaultChecked}>
        <span class="chk-box-svg" aria-hidden="true">
          <svg viewBox="0 0 18 18" focusable="false"><path d="M4 9.4l3.2 3.2L14 5.8" pathLength="1"></path></svg>
        </span>
      </span>
    </label>
  {/each}
{/key}

<style>
  :global {
    .item-partial {
      border-color: rgba(217, 119, 6, 0.35);
      background: rgba(217, 119, 6, 0.06);
    }

    /* #33 Checklist: stroke-drawn Cobalt check + tactile row shift */
    #modal-transaksi .chk-box-wrap {
      position: relative;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      display: grid;
      place-items: center;
    }
    #modal-transaksi .checkbox-item .chk-box-wrap input[type="checkbox"] {
      position: absolute;
      inset: 0;
      width: 20px;
      height: 20px;
      margin: 0;
      opacity: 0;
      z-index: 2;
      cursor: pointer;
    }
    #modal-transaksi .checkbox-item .chk-box-wrap input[type="checkbox"]:disabled { cursor: not-allowed; }
    #modal-transaksi .chk-box-svg {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      border: 1.5px solid var(--border-strong);
      background: var(--surface);
      color: var(--accent-ink);
      display: grid;
      place-items: center;
      pointer-events: none;
      transition: background-color 160ms ease, border-color 160ms ease, transform 180ms var(--hybrid-ease-spring);
    }
    #modal-transaksi .chk-box-svg svg { width: 14px; height: 14px; display: block; }
    #modal-transaksi .chk-box-svg path {
      fill: none;
      stroke: currentColor;
      stroke-width: 2.3;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 1;
      stroke-dashoffset: 1;
      transition: stroke-dashoffset 220ms var(--hybrid-ease-spring) 35ms;
    }
    #modal-transaksi .checkbox-item:has(.chk-iuran:focus-visible) .chk-box-svg {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    #modal-transaksi .checkbox-item:has(.chk-iuran:not(:disabled):checked) .chk-box-svg {
      background: var(--accent);
      border-color: var(--accent);
    }
    #modal-transaksi .checkbox-item:has(.chk-iuran:not(:disabled):checked) .chk-box-svg path {
      stroke-dashoffset: 0;
    }
    #modal-transaksi .checkbox-item.item-disabled-lunas .chk-box-svg {
      background: var(--surface-3);
      border-color: var(--border);
      opacity: 0.55;
    }
    #modal-transaksi .checkbox-item .chk-name-pending {
      transition: transform 160ms var(--hybrid-ease-out);
    }
    #modal-transaksi .checkbox-item:has(.chk-iuran:not(:disabled):checked) .chk-name-pending {
      transform: translateX(2px);
    }
    #modal-transaksi .checkbox-item:has(.chk-iuran:not(:disabled):checked) .chk-badge-pending {
      background: var(--accent-tint);
      border-color: var(--accent-border);
      color: var(--accent-strong);
    }

    /* #29 Odometer: vertical multi-digit drum roll (textContent unchanged) */
    .odo-col {
      position: relative;
      display: inline-flex;
      height: 1.12em;
      line-height: 1.12em;
      overflow: hidden;
      vertical-align: baseline;
      font-variant-numeric: tabular-nums;
    }
    .odo-col.is-up,
    .odo-col.is-down {
      -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%);
      mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%);
    }
    .odo-reel {
      position: relative;
      display: inline-block;
      height: 1.12em;
      line-height: 1.12em;
    }
    .odo-reel[data-strip]::before {
      content: attr(data-strip);
      content: attr(data-strip) / "";
      position: absolute;
      left: 0;
      right: 0;
      white-space: pre;
      line-height: 1.12em;
      opacity: 0.78;
      pointer-events: none;
    }
    .odo-col.is-up .odo-reel::before { bottom: 100%; }
    .odo-col.is-down .odo-reel::before { top: 100%; }

    /* #21 Download Ring: SVG radial progress sweep + check */
    .is-dl-ringing {
      min-width: var(--btn-lock-w, auto);
    }
    .dl-ring-svg {
      width: 17px;
      height: 17px;
      flex-shrink: 0;
      display: inline-block;
    }
    .dl-ring-track {
      fill: none;
      stroke: color-mix(in srgb, currentColor 22%, transparent);
      stroke-width: 2;
    }
    .dl-ring-arc {
      fill: none;
      stroke: var(--accent-strong);
      stroke-width: 2.2;
      stroke-linecap: round;
      transform: rotate(-90deg);
      transform-origin: 10px 10px;
      stroke-dasharray: 100;
      stroke-dashoffset: 100;
    }
    .btn-primary .dl-ring-arc,
    .btn-primary .dl-ring-check {
      stroke: currentColor;
    }
    .dl-ring-check {
      fill: none;
      stroke: var(--accent-strong);
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 1;
      stroke-dashoffset: 1;
      transform-origin: 10px 10px;
    }

    /* #09 Paper Plane: anticipation tilt + diagonal takeoff -> confirm check */
    #self-pay-whatsapp.is-plane-flying,
    #self-pay-whatsapp.is-plane-sent {
      overflow: hidden;
      min-width: var(--btn-lock-w, auto);
    }
    #self-pay-whatsapp i { display: inline-block; flex-shrink: 0; }

    @media (prefers-reduced-motion: no-preference) {
      #modal-transaksi .checkbox-item:has(.chk-iuran:not(:disabled):checked) .chk-box-svg {
        animation: chkBoxPop 220ms var(--hybrid-ease-spring);
      }
      .odo-col.is-up .odo-reel {
        will-change: transform;
        animation: odoRollUp 680ms cubic-bezier(0.16, 1, 0.3, 1) calc(45ms + var(--odo-i, 0) * 38ms) both;
      }
      .odo-col.is-down .odo-reel {
        will-change: transform;
        animation: odoRollDown 680ms cubic-bezier(0.16, 1, 0.3, 1) calc(45ms + var(--odo-i, 0) * 38ms) both;
      }
      .is-dl-ringing .dl-ring-arc {
        animation: dlRingSweep 360ms var(--hybrid-ease-out) forwards;
      }
      .is-dl-ringing .dl-ring-check {
        animation: dlCheckDraw 220ms var(--hybrid-ease-out) 280ms forwards;
      }
      #self-pay-whatsapp.is-plane-flying i {
        animation: planeTakeoff 280ms var(--hybrid-ease-out) forwards;
      }
      #self-pay-whatsapp.is-plane-sent i {
        animation: planeCheckPop 220ms var(--hybrid-ease-spring) both;
      }
    }

    @keyframes chkBoxPop {
      0% { transform: scale(0.86); }
      55% { transform: scale(1.08); }
      100% { transform: scale(1); }
    }
    @keyframes odoRollUp {
      from { transform: translateY(calc(var(--odo-steps, 1) * 100%)); }
      to { transform: translateY(0); }
    }
    @keyframes odoRollDown {
      from { transform: translateY(calc(var(--odo-steps, 1) * -100%)); }
      to { transform: translateY(0); }
    }
    @keyframes dlRingSweep {
      to { stroke-dashoffset: 0; }
    }
    @keyframes dlCheckDraw {
      from { stroke-dashoffset: 1; transform: scale(0.86); }
      to { stroke-dashoffset: 0; transform: scale(1); }
    }
    @keyframes planeTakeoff {
      0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
      30% { transform: translate(-3px, 2px) rotate(-12deg) scale(0.92); opacity: 1; }
      100% { transform: translate(22px, -20px) rotate(10deg) scale(0.7); opacity: 0; }
    }
    @keyframes planeCheckPop {
      from { opacity: 0; transform: scale(0.78); }
      to { opacity: 1; transform: scale(1); }
    }

    @media (prefers-reduced-motion: reduce) {
      #modal-transaksi .chk-box-svg,
      #modal-transaksi .chk-box-svg path,
      #modal-transaksi .checkbox-item .chk-name-pending { transition: none; transform: none; }
      .odo-col.is-up,
      .odo-col.is-down { -webkit-mask-image: none; mask-image: none; }
      .odo-col.is-up .odo-reel,
      .odo-col.is-down .odo-reel,
      .is-dl-ringing .dl-ring-arc,
      .is-dl-ringing .dl-ring-check,
      #self-pay-whatsapp.is-plane-flying i,
      #self-pay-whatsapp.is-plane-sent i,
      #modal-transaksi .checkbox-item:has(.chk-iuran:not(:disabled):checked) .chk-box-svg { animation: none; }
      .dl-ring-arc,
      .dl-ring-check { stroke-dashoffset: 0; }
    }
  }
</style>
