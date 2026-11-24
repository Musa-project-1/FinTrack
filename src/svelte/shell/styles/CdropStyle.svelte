<style>
  :global {
    /* === HYBRID KINETIC DROPDOWNS (.cdrop & modern base-select) ===
       Native <select> stays in the DOM as the data/form source for .cdrop,
       while #spotlight-picker, #spotlight-swap-select, and #self-pay-member
       upgrade progressively via CSS appearance: base-select. */

    .cdrop {
      position: relative;
      display: block;
      width: 100%;
      min-width: 0;
    }

    .cdrop select {
      position: absolute;
      opacity: 0;
      width: 1px;
      height: 1px;
      margin: -1px;
      pointer-events: none;
      border: 0;
      padding: 0;
      clip-path: inset(50%);
      overflow: hidden;
      white-space: nowrap;
    }

    .cdrop-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
      min-width: 0;
      min-height: 44px;
      padding: 10px 14px;
      background: var(--surface-2);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      color: var(--text-main);
      font-size: 13.5px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, transform 140ms ease;
    }

    .cdrop-btn:hover {
      border-color: var(--border-strong);
      background: var(--surface);
    }

    .cdrop-btn:active:not(:disabled) {
      transform: scale(0.99);
      transition-duration: 90ms;
    }

    .cdrop.open .cdrop-btn,
    .cdrop-btn:focus-visible {
      background: var(--surface);
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-tint);
      outline: none;
    }

    .cdrop-val {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cdrop-val.is-placeholder {
      color: var(--text-faint);
      font-weight: 500;
    }

    /* Palette-aware chevron rendered via CSS mask so standalone fixtures need no icon font */
    .cdrop-chevron {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      background-color: var(--text-muted, #64748b);
      -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-position: center;
      mask-position: center;
      -webkit-mask-size: 14px 14px;
      mask-size: 14px 14px;
      transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), background-color 150ms ease;
    }

    .cdrop.open .cdrop-chevron {
      transform: rotate(180deg);
      background-color: var(--accent-strong, var(--text-main));
    }

    .cdrop-list {
      position: absolute;
      left: 0;
      right: 0;
      top: calc(100% + 6px);
      z-index: 140;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      box-shadow: var(--shadow-pop);
      padding: 6px;
      transform-origin: top center;
      opacity: 0;
      transform: translateY(-6px) scale(0.97);
      visibility: hidden;
      pointer-events: none;
      transition: opacity 160ms ease-out, transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
                  visibility 0s linear 160ms;
    }

    .cdrop.open .cdrop-list {
      opacity: 1;
      transform: translateY(0) scale(1);
      visibility: visible;
      pointer-events: auto;
      transition: opacity 160ms ease-out, transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
                  visibility 0s linear 0s;
    }

    .cdrop--up .cdrop-list {
      top: auto;
      bottom: calc(100% + 6px);
      transform-origin: bottom center;
      transform: translateY(6px) scale(0.97);
    }

    .cdrop.open.cdrop--up .cdrop-list {
      transform: translateY(0) scale(1);
    }

    .cdrop-search {
      position: relative;
      padding: 2px 2px 8px;
      margin-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }

    .cdrop-search::before {
      content: "";
      position: absolute;
      left: 12px;
      top: calc(50% - 3px);
      width: 14px;
      height: 14px;
      transform: translateY(-50%);
      background-color: var(--text-faint, #64748b);
      -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cline x1='20' y1='20' x2='16.2' y2='16.2'/%3E%3C/svg%3E");
      mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cline x1='20' y1='20' x2='16.2' y2='16.2'/%3E%3C/svg%3E");
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-position: center;
      mask-position: center;
      -webkit-mask-size: 14px 14px;
      mask-size: 14px 14px;
      pointer-events: none;
    }

    .cdrop-search input {
      width: 100%;
      min-height: 36px;
      padding: 7px 12px 7px 34px;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      background: var(--surface-2);
      color: var(--text-main);
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      outline: none;
      transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
    }

    .cdrop-search input:focus {
      background: var(--surface);
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-tint);
    }

    .cdrop-items {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-height: 240px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-gutter: stable;
    }

    .cdrop-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
      min-height: 38px;
      padding: 9px 11px;
      border: 1px solid transparent;
      border-radius: 10px;
      background: transparent;
      color: var(--text-main);
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      text-align: left;
      cursor: pointer;
      transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
    }

    .cdrop-item span {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cdrop-item:hover,
    .cdrop-item.highlight {
      background: var(--surface-2);
    }

    .cdrop-item.selected {
      color: var(--accent-strong);
      font-weight: 700;
      background: var(--accent-tint);
      border-color: var(--accent-border);
    }

    /* Zero-green palette-aware checkmark */
    .cdrop-item.selected::after {
      content: "";
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      background-color: var(--accent-strong, var(--text-main));
      -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E");
      mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E");
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-position: center;
      mask-position: center;
      -webkit-mask-size: 16px 16px;
      mask-size: 16px 16px;
    }

    .cdrop-empty {
      padding: 16px 12px;
      text-align: center;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
    }

    /* Inside pill wrappers (riwayat filters) the button inherits the pill look */
    .select-pill-wrap .cdrop {
      flex: 1;
      min-width: 0;
    }

    .select-pill-wrap .cdrop-btn {
      border: none;
      box-shadow: none;
      background: transparent;
      padding: 2px 18px 2px 0;
      height: auto;
      min-height: 24px;
      font-size: 13px;
      font-weight: 600;
    }

    .select-pill-wrap .cdrop-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      border-radius: var(--r-sm);
    }

    .year-pill .cdrop {
      position: relative;
      width: auto;
      min-width: 0;
      flex: 0 0 auto;
    }

    .year-pill .cdrop-btn {
      border: none;
      box-shadow: none;
      background: transparent;
      padding: 2px 16px 2px 0;
      height: auto;
      min-height: 24px;
      font-size: 13px;
      font-weight: 600;
      width: auto;
    }

    .year-pill .cdrop-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      border-radius: var(--r-sm);
    }

    .year-pill .cdrop-list {
      position: absolute;
      top: 100%;
      right: 0;
      left: auto;
      margin-top: 6px;
      min-width: 112px;
      width: max-content;
      max-width: 60vw;
      z-index: 140;
      border-radius: 14px;
      transform-origin: top right;
    }

    .cdrop-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .is-invalid > .cdrop-btn {
      border-color: var(--danger);
      outline: 2px solid var(--danger);
      outline-offset: 2px;
    }

    .cdrop-item:disabled {
      opacity: 0.48;
      cursor: not-allowed;
    }

    .control-error:not([hidden]) {
      display: block;
      color: var(--danger);
      font-size: 0.875rem;
      margin-top: 6px;
    }

    /* Progressive enhancement for native <select> dropdowns via Customizable Select */
    @supports (appearance: base-select) {
      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member),
      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member)::picker(select) {
        appearance: base-select;
      }

      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member) {
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 0 12px;
        border: 1.5px solid var(--border);
        border-radius: 12px;
        background-color: var(--surface);
        color: var(--text-main);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
      }

      @media (pointer: coarse) {
        :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member) {
          font-size: 16px;
        }
      }

      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member):hover {
        border-color: var(--border-strong);
      }

      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member):is(:open, :focus-visible) {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-tint);
        outline: none;
      }

      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member)::picker-icon {
        color: var(--text-muted);
        margin-inline-start: auto;
        font-size: 12px;
        transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), color 150ms ease;
      }

      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member):open::picker-icon {
        transform: rotate(180deg);
        color: var(--accent-strong);
      }

      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member)::picker(select) {
        background: var(--surface);
        color: var(--text-main);
        border: 1px solid var(--border);
        border-radius: 14px;
        box-shadow: var(--shadow-pop);
        padding: 6px;
        margin-block: 6px;
        min-width: anchor-size(width);
        max-height: min(300px, 50dvh);
        opacity: 0;
        transform: translateY(-6px) scale(0.97);
        transition:
          opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
          transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
          display 180ms,
          overlay 180ms;
        transition-behavior: allow-discrete;
      }

      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member):open::picker(select) {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member) option {
        padding: 9px 11px;
        min-height: 38px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-main);
        gap: 8px;
        cursor: pointer;
        transition: background-color 140ms ease, color 140ms ease;
      }

      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member) option:is(:hover, :focus-visible) {
        background: var(--surface-2);
        outline: none;
      }

      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member) option:checked {
        background: var(--accent-tint);
        color: var(--accent-strong);
        font-weight: 700;
      }

      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member) option::checkmark {
        order: 1;
        margin-inline-start: auto;
        color: var(--accent-strong);
        font-weight: 800;
      }
    }

    @starting-style {
      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member):open::picker(select) {
        opacity: 0;
        transform: translateY(-6px) scale(0.97);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .cdrop-btn,
      .cdrop-chevron,
      .cdrop-list,
      .cdrop-search input,
      .cdrop-item,
      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member),
      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member)::picker-icon,
      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member)::picker(select),
      :is(#spotlight-picker, #spotlight-swap-select, #self-pay-member) option {
        transition: none !important;
      }
    }
  }
</style>
