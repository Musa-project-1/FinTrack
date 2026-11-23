<style>
  :global {
    body[data-palette] .table-card {
      background: color-mix(in srgb, var(--surface) 90%, transparent) !important;
    }

    body[data-palette] .header {
      background: color-mix(in srgb, var(--surface) 94%, transparent);
      gap: 6px;
      padding: 4px 8px;
      border-radius: 12px;
      box-shadow: none;
    }

    .header .header-left,
    .header .header-right,
    .header .header-actions {
      gap: 4px;
    }

    .header .header-actions {
      width: auto;
      padding: 0;
      overflow: visible;
    }

    .header .header-actions .btn,
    .header .group-name {
      min-height: 38px;
      height: 38px;
      padding-block: 0;
    }

    .header .header-actions .btn {
      min-width: 38px;
      gap: 5px;
    }

    .header .header-actions [data-action="open-login"] {
      width: auto;
    }

    .header .group-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header .brand-link {
      flex: 0 0 auto;
    }

    .hybrid-topbar-role {
      display: flex;
      justify-content: center;
      align-items: center;
      min-width: 0;
    }

    .role-switcher-track {
      position: relative;
      isolation: isolate;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--border);
      border-radius: var(--r-pill);
      background: var(--surface-2);
    }

    .role-switcher-track .workspace-glider {
      border-color: transparent;
      background: var(--text-main);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.16);
      transition:
        translate 420ms var(--hybrid-ease-spring),
        width 340ms var(--hybrid-ease-spring),
        background-color 220ms ease,
        box-shadow 220ms ease;
    }

    html[data-role="admin"] .role-switcher-track .workspace-glider {
      background: var(--nav-brand-cta, var(--accent-strong));
      box-shadow: 0 2px 10px color-mix(in srgb, var(--nav-brand-cta, var(--accent-strong)) 30%, transparent);
    }

    .role-switcher-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 30px;
      height: 30px;
      padding: 0 14px;
      border: 0;
      background: transparent;
      border-radius: inherit;
      font-size: 13px;
      font-weight: 700;
      line-height: normal;
      color: var(--text-muted);
      white-space: nowrap;
      cursor: pointer;
      transition: color 200ms ease;
    }

    .role-switcher-btn i {
      font-size: 15px;
      flex-shrink: 0;
    }

    .role-switcher-btn:hover:not([aria-selected="true"]) {
      color: var(--text-main);
    }

    .role-switcher-btn[aria-selected="true"],
    .role-switcher-btn[aria-selected="true"]:hover {
      color: var(--surface);
      background: var(--text-main);
    }

    html[data-role="admin"] .role-switcher-btn[aria-selected="true"],
    html[data-role="admin"] .role-switcher-btn[aria-selected="true"]:hover {
      color: var(--nav-on-brand, #ffffff);
      background: var(--accent-strong);
    }

    .role-switcher-btn:focus-visible {
      outline: 2px solid var(--accent-strong);
      outline-offset: 2px;
    }

    .header [data-action="toggle-privacy"][aria-pressed="true"] { color: var(--accent-strong); }

    .workspace-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      --workspace-action-width: 11.5rem;
      min-height: 38px;
      margin-bottom: 14px;
    }
    .workspace-tabs-scroll { max-width: 100%; overflow-x: auto; scrollbar-width: none; }
    @media (min-width: 769px) {
      .workspace-tabs-scroll {
        --fade-size: 2rem;
        scroll-padding-inline: var(--fade-size);
        mask:
          linear-gradient(black, black) no-clip subtract,
          linear-gradient(to right, black, transparent) 0 0 / var(--fade-start) 100% no-repeat no-clip,
          linear-gradient(to right, transparent, black) 100% 0 / var(--fade-end) 100% no-repeat no-clip;
        animation: reveal-fade-start linear both, hide-fade-end linear both;
        animation-timeline: scroll(self inline);
        animation-range: 0 var(--fade-size), calc(100% - var(--fade-size)) 100%;
      }

      @supports not (animation-timeline: scroll()) {
        .workspace-tabs-scroll {
          transition: --fade-start 180ms ease, --fade-end 180ms ease;
        }

        .workspace-tabs-scroll.more-start {
          --fade-start: var(--fade-size);
        }

        .workspace-tabs-scroll.more-end {
          --fade-end: var(--fade-size);
        }
      }
    }
    .workspace-tabs, .workspace-status-filter {
      position: relative;
      isolation: isolate;
      display: inline-flex;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--border);
      border-radius: var(--r-pill);
      background: var(--surface-2);
    }

    .workspace-glider {
      position: absolute;
      z-index: -1;
      inset: 3px auto 3px 0;
      width: var(--glider-width, 0px);
      translate: var(--glider-left, 0px);
      transition: translate 280ms var(--hybrid-ease-out), width 280ms var(--hybrid-ease-out);
      border: 1px solid var(--border);
      border-radius: inherit;
      background: var(--surface);
      box-shadow: 0 2px 8px rgba(24, 20, 18, .08);
      pointer-events: none;
    }
    .workspace-tabs button, .workspace-status-filter button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 30px;
      padding: 0 14px;
      border-radius: inherit;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 700;
      line-height: normal;
      white-space: nowrap;
      cursor: pointer;
    }
    .workspace-tabs [aria-selected="true"], .workspace-status-filter [aria-pressed="true"] { color: var(--text-main); }
    .workspace-label-mobile { display: none; }
    :is(.workspace-matrix-tools, .workspace-history-tools) { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .workspace-head:not(:has(#workspace-tab-history[aria-selected="true"])) .workspace-history-tools { display: none; }
    .workspace-head:not(:has(#workspace-tab-iuran[aria-selected="true"])) .workspace-matrix-tools { display: none; }
    :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-search { position: relative; display: inline-flex; align-items: center; margin: 0; }
    :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-search i { position: absolute; left: 11px; font-size: 15px; pointer-events: none; color: var(--text-muted); }
    :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-search.workspace-mobile-search { display: none; }
    :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-search .search-member-input {
      width: 238px;
      max-width: 100%;
      min-height: 38px;
      height: 38px;
      padding: 0 12px 0 33px;
      border-radius: 12px;
      background: var(--surface);
      font-size: 13px;
      font-weight: 600;
    }
    .workspace-status-filter button { padding-inline: 11px; font-size: 12px; font-variant-numeric: tabular-nums; }
    :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-jump {
      min-height: 38px;
      min-width: var(--workspace-action-width);
      padding: 0 12px;
      border-radius: 12px;
      background: var(--surface);
      font-size: 12px;
      font-weight: 700;
      gap: 6px;
      white-space: nowrap;
    }
    .workspace-kbd-hint {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 5px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--text-muted);
    }

    @media (max-width: 768px) {
      .workspace-head { --workspace-action-width: 8rem; }
      .workspace-tabs-scroll { width: 100%; overflow: visible; }
      .workspace-tabs, .workspace-status-filter { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .workspace-tabs button, .workspace-status-filter button { min-height: 44px; padding-inline: 4px; font-size: 12px; }
      .workspace-label-desktop, .workspace-kbd-hint, :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-search.workspace-desktop-search { display: none; }
      .workspace-label-mobile { display: inline; }
      :is(.workspace-matrix-tools, .workspace-history-tools) { display: grid; grid-template-columns: minmax(0, 1fr) auto; width: 100%; }
      :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-search.workspace-mobile-search { display: inline-flex; min-width: 0; grid-column: 1; grid-row: 1; }
      .workspace-matrix-tools .workspace-mobile-search .search-member-input { width: 100%; min-height: 44px; }
      :is(.workspace-matrix-tools, .workspace-history-tools) .workspace-jump { grid-column: 2; grid-row: 1; min-height: 44px; }
      .workspace-history-tools .workspace-search { min-width: 0; }
      .workspace-history-tools .workspace-search .search-member-input { width: 100%; min-height: 44px; }
      .workspace-status-filter { grid-column: 1 / -1; }
      .workspace-status-filter button { font-size: 11.5px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .workspace-glider { transition: none; }
    }

    .workspace-panels {
      --workspace-scroll-offset: 78px;
      overflow-anchor: none;
    }

    .workspace-panel {
      min-width: 0;
      scroll-margin-top: var(--workspace-scroll-offset, 78px);
    }

    .workspace-panel[hidden] { display: none; }

    .workspace-panel .modal-content {
      width: auto;
      max-width: none;
      max-height: none;
      opacity: 1;
      transform: none;
      overflow: visible;
      box-shadow: var(--shadow-card) !important;
    }

    .workspace-panel .modal-header-standard { display: none; }

    .workspace-panel > .modal-content .table-card {
      margin-inline: 0;
      min-width: 0;
    }

    @media (max-width: 768px) {
      .header .header-actions .btn,
      .header .group-name,
      .header .brand-link {
        min-height: 44px;
      }

      .header .header-actions .btn,
      .header .brand-link {
        min-width: 44px;
      }

      .role-switcher-track { width: 100%; display: grid; grid-template-columns: 1fr 1fr; }
      .role-switcher-btn { min-height: 44px; height: 44px; padding: 0 10px; font-size: 13px; }
      .workspace-panel > .modal-content { margin-inline: 8px; }
    }
  }
</style>
