<style>
  :global {
    /* === UNIVERSAL MONTH/YEAR PICKER (custom popup, no native input) === */

    .mpick {
      position: relative;
      display: block;
      flex: 1;
      min-width: 0;
    }

    .mpick > input.mpick {
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

    .mpick-field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
      min-height: 44px;
      padding: 10px 14px;
      background: var(--surface-2);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      color: var(--text-main);
      font-size: 13.5px;
      font-weight: 600;
      font-family: inherit;
      text-align: left;
      cursor: pointer;
      transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, transform 140ms ease;
    }

    .mpick-field:hover {
      border-color: var(--border-strong);
      background: var(--surface);
    }

    .mpick-field:active:not(:disabled) {
      transform: scale(0.99);
      transition-duration: 90ms;
    }

    .mpick.open .mpick-field,
    .mpick-field:focus-visible {
      background: var(--surface);
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-tint);
      outline: none;
    }

    .mpick-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mpick-label.is-placeholder {
      color: var(--text-faint);
      font-weight: 400;
    }

    .mpick-cal {
      flex-shrink: 0;
      font-size: 18px;
      color: var(--text-muted);
    }

    /* Floating popup matching Hybrid Kinetic design system */
    .mpick-pop {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      width: 100%;
      min-width: 260px;
      max-width: 320px;
      z-index: 140;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: var(--shadow-pop);
      padding: 14px;
      transform-origin: top center;
      animation: dropdownFadeIn 0.18s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .mpick-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }

    .mpick-year {
      font-family: var(--font-mono);
      font-size: 15px;
      font-weight: 700;
      letter-spacing: var(--tracking-tight);
      font-variant-numeric: tabular-nums;
      color: var(--text-main);
      text-align: center;
      flex: 1;
    }

    .mpick-nav {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      color: var(--text-main);
      font-size: 13px;
      cursor: pointer;
      padding: 0;
      transition: border-color 140ms ease, color 140ms ease, background-color 140ms ease;
    }

    .mpick-nav:hover {
      border-color: var(--border-strong);
      background: var(--surface-3);
      color: var(--accent-strong);
    }

    .mpick-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    .mpick-m {
      padding: 9px 0;
      border: 1.5px solid transparent;
      border-radius: 10px;
      background: var(--surface-2);
      color: var(--text-main);
      font-size: 12.5px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      text-align: center;
      transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
    }

    .mpick-m:hover {
      background: var(--surface);
      border-color: var(--border-strong);
      color: var(--accent-strong);
    }

    .mpick-m.selected {
      background: var(--accent-tint);
      border-color: var(--accent-border);
      color: var(--accent-strong);
      font-weight: 700;
    }

    .mpick-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid var(--border);
    }

    .mpick-link {
      border: none;
      background: transparent;
      color: var(--accent-strong);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      padding: 5px 10px;
      border-radius: 8px;
      transition: background-color 140ms ease, color 140ms ease;
    }

    .mpick-link:hover {
      background: var(--accent-tint);
      text-decoration: none;
    }

    .mpick-field:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .is-invalid > .mpick-field {
      border-color: var(--danger);
      outline: 2px solid var(--danger);
      outline-offset: 2px;
    }
  }
</style>
