<style>
  :global {
    /* Interactive Kasi Playground Stage (#modal-faq .kasi-stage) */

    .kasi-stage {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      padding: 14px;
      margin-bottom: 14px;
      border-radius: 14px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .kasi-stage-top {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .kasi-stage-pet-zone {
      min-width: 92px;
      min-height: 92px;
      padding: 6px;
      border-radius: 18px;
      border: 1.5px solid color-mix(in oklab, var(--hybrid-spot) 36%, var(--border));
      background: var(--surface);
      display: grid;
      place-items: center;
      flex-shrink: 0;
      touch-action: none;
      cursor: grab;
      transition: border-color 150ms ease, transform 160ms var(--hybrid-ease-spring);
    }

    .kasi-stage-pet-zone:hover {
      border-color: var(--hybrid-spot);
      transform: scale(1.02);
    }

    .kasi-stage-pet-zone:active {
      cursor: grabbing;
    }

    .kasi-stage-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .kasi-speech-bubble {
      min-width: 0;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.48;
      color: var(--text-main);
    }

    .kasi-love-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .kasi-love-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--text-muted);
    }

    .kasi-pet-chip {
      padding: 2px 8px;
      border-radius: var(--r-pill);
      background: var(--accent-tint);
      color: var(--accent-strong);
      border: 1px solid var(--accent-border);
      font-size: 11px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .kasi-love-track {
      width: 100%;
      height: 8px;
      border-radius: var(--r-pill);
      background: var(--surface);
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .kasi-love-fill {
      width: 0%;
      height: 100%;
      border-radius: var(--r-pill);
      background: linear-gradient(90deg, var(--hybrid-spot), var(--hybrid-brand));
      transition: width 320ms var(--hybrid-ease-spring);
    }

    .kasi-toy-bar {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid var(--border);
    }

    .kasi-toy-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 44px;
      padding: 8px 10px;
      border-radius: 12px;
      border: 1px solid var(--border-strong);
      background: var(--surface);
      color: var(--text-main);
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      transition: border-color 140ms ease, background-color 140ms ease, transform 140ms var(--hybrid-ease-spring);
    }

    .kasi-toy-btn:hover {
      border-color: var(--hybrid-spot);
      background: var(--surface-2);
    }

    .kasi-toy-btn:active {
      transform: scale(0.96);
    }

    .kasi-toy-btn i {
      font-size: 15px;
      color: var(--hybrid-brand);
    }

    .kasi-treat-fly {
      position: fixed;
      width: 24px;
      height: 24px;
      z-index: 115;
      pointer-events: none;
      will-change: transform, opacity;
    }

    @media (max-width: 520px) {
      .kasi-stage-top {
        flex-direction: column;
        align-items: stretch;
      }

      .kasi-stage-pet-zone {
        align-self: center;
      }

      .kasi-toy-bar {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .kasi-stage-pet-zone,
      .kasi-love-fill,
      .kasi-toy-btn {
        transition: none;
      }
    }
  }
</style>
