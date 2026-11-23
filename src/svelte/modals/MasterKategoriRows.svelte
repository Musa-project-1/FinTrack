<script lang="ts">
  import { masterKategoriStore } from '../stores/master.svelte';
</script>

{#if masterKategoriStore.rows.length === 0}
  <tr><td colspan="3" class="td-muted-center">Belum ada kategori.</td></tr>
{:else}
  {#each masterKategoriStore.rows as row (row.id)}
    <tr class="master-row {row.isMasuk ? 'is-masuk' : 'is-keluar'}">
      <td class="td-name-col">
        <div class="master-cell-identity">
          <span class="master-kat-icon {row.isMasuk ? 'is-masuk' : 'is-keluar'}" aria-hidden="true"><i class="ph-bold {row.isMasuk ? 'ph-arrow-down-left' : 'ph-arrow-up-right'}"></i></span>
          <div class="master-name-wrap">
            <span class="master-name-text">{row.name}</span>
            <span class="master-id-pill">{row.id}</span>
          </div>
        </div>
      </td>
      <td class="td-status-col text-center">
        {#if row.isMasuk}
          <span class="badge badge-masuk"><i class="ph-bold ph-arrow-down-left" aria-hidden="true"></i> Masuk</span>
        {:else}
          <span class="badge badge-keluar"><i class="ph-bold ph-arrow-up-right" aria-hidden="true"></i> Keluar</span>
        {/if}
      </td>
      <td class="td-action-col">
        <div class="master-actions-wrap">
          <button type="button" class="btn btn-outline btn-master-action" data-action="edit-master-kategori" data-id={row.id} title="Kelola Kategori">
            <i class="ph-bold ph-pencil-simple" aria-hidden="true"></i> <span>Edit</span>
          </button>
        </div>
      </td>
    </tr>
  {/each}
{/if}

<style>
  :global {
    /* === HYBRID KINETIC PRIVACY CENTER (privacy.html) === */

    :root { color-scheme: light dark; }
    html:has(body.dark-mode) { color-scheme: dark; }
    html:has(body:not(.dark-mode)) { color-scheme: light; }

    body.privacy-page {
      margin: 0;
      padding: 0;
      background-color: var(--bg-color);
      background-image: none;
      color: var(--text-main);
      min-height: 100dvh;
      overflow-x: clip;
    }

    .privacy-topbar {
      position: sticky;
      top: 0;
      z-index: 40;
      background: color-mix(in srgb, var(--surface) 84%, transparent);
      -webkit-backdrop-filter: blur(16px) saturate(160%);
      backdrop-filter: blur(16px) saturate(160%);
      border-bottom: 1px solid var(--border);
    }

    .privacy-topbar-inner {
      max-width: 1060px;
      margin: 0 auto;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .privacy-brand-link {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      text-decoration: none;
      color: var(--text-main);
      min-width: 0;
    }
    .privacy-brand-link img { width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; }
    .privacy-brand-name { font-family: var(--font-display); font-size: 16px; font-weight: 800; letter-spacing: -0.02em; }
    .privacy-brand-sep { color: var(--text-faint); font-size: 14px; }
    .privacy-brand-crumb {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent-strong);
      background: var(--accent-tint);
      border: 1px solid var(--accent-border);
      padding: 2px 8px;
      border-radius: 999px;
    }

    .privacy-topbar-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .privacy-lang-switch {
      display: inline-flex;
      padding: 3px;
      border-radius: 999px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      gap: 2px;
    }
    .privacy-lang-btn {
      min-width: 34px;
      min-height: 30px;
      padding: 0 10px;
      border-radius: 999px;
      border: 0;
      background: transparent;
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: background-color 150ms ease, color 150ms ease;
    }
    .privacy-lang-btn[aria-pressed="true"] {
      background: var(--surface);
      color: var(--text-main);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    .privacy-icon-btn {
      width: 36px;
      height: 36px;
      border-radius: 11px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      color: var(--text-main);
      display: grid;
      place-items: center;
      font-size: 16px;
      cursor: pointer;
      transition: background-color 150ms ease, border-color 150ms ease;
    }
    .privacy-icon-btn:hover { background: var(--surface); border-color: var(--border-strong); }

    .privacy-back-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 36px;
      padding: 0 13px;
      border-radius: 11px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-main);
      font-size: 12.5px;
      font-weight: 700;
      text-decoration: none;
      white-space: nowrap;
      transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
    }
    .privacy-back-btn:hover { background: var(--surface-2); border-color: var(--accent-border); color: var(--accent-strong); }

    .privacy-hero {
      border-bottom: 1px solid var(--border);
      background:
        radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 68%),
        radial-gradient(var(--border) 1px, transparent 1px) 0 0 / 22px 22px,
        var(--surface);
    }
    .privacy-hero-inner { max-width: 1060px; margin: 0 auto; padding: 40px 24px 32px; }
    .privacy-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 12px;
      border-radius: 999px;
      background: var(--accent-tint);
      border: 1px solid var(--accent-border);
      color: var(--accent-strong);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .privacy-hero h1 {
      margin: 14px 0 10px;
      font-family: var(--font-display);
      font-size: clamp(2rem, 4vw, 2.75rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.1;
      color: var(--text-main);
      text-wrap: balance;
    }
    .privacy-lead {
      max-width: 65ch;
      margin: 0;
      font-size: 15.5px;
      font-weight: 500;
      line-height: 1.6;
      color: var(--text-muted);
      text-wrap: pretty;
    }

    .privacy-meta-strip { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    .privacy-meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 11px;
      border-radius: 10px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      font-family: var(--font-mono);
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .privacy-meta-chip i { font-size: 14px; color: var(--accent-strong); }

    .privacy-pillars { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 24px; }
    .privacy-pillar-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 15px 16px;
      border-radius: 16px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }
    .privacy-pillar-ico {
      width: 38px;
      height: 38px;
      border-radius: 11px;
      background: var(--accent-tint);
      border: 1px solid var(--accent-border);
      color: var(--accent-strong);
      display: grid;
      place-items: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .privacy-pillar-card h2 { font-family: var(--font-display); font-size: 13.5px; font-weight: 800; color: var(--text-main); margin: 0 0 3px; line-height: 1.3; }
    .privacy-pillar-card p { margin: 0; font-size: 12px; font-weight: 500; line-height: 1.45; color: var(--text-muted); }

    .privacy-layout {
      max-width: 1060px;
      margin: 0 auto;
      padding: 28px 24px 72px;
      display: grid;
      grid-template-columns: 248px minmax(0, 1fr);
      gap: 28px;
      align-items: start;
    }
    .privacy-aside { position: sticky; top: 78px; display: flex; flex-direction: column; gap: 14px; min-width: 0; }

    .privacy-toc-nav {
      scroll-target-group: auto;
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 14px;
      border-radius: 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-card);
    }
    .privacy-toc-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--text-muted);
      padding: 2px 8px 6px;
    }
    .privacy-toc-link {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid transparent;
      color: var(--text-muted);
      font-size: 12.5px;
      font-weight: 600;
      text-decoration: none;
      line-height: 1.3;
      transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
    }
    .privacy-toc-link:hover { background: var(--surface-2); color: var(--text-main); }
    .privacy-toc-link:is(:target-current, .target-current) {
      background: var(--accent-tint);
      color: var(--accent-strong);
      border-color: var(--accent-border);
      font-weight: 700;
      box-shadow: inset 3px 0 0 0 var(--accent);
    }
    .privacy-toc-num { font-family: var(--font-mono); font-size: 10.5px; font-weight: 700; color: var(--text-faint); flex-shrink: 0; }
    .privacy-toc-link:is(:target-current, .target-current) .privacy-toc-num { color: var(--accent-strong); }

    .privacy-trust-box {
      padding: 14px;
      border-radius: 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .privacy-trust-list { margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .privacy-trust-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; }
    .privacy-trust-row dt { color: var(--text-muted); font-weight: 500; }
    .privacy-trust-row dd { margin: 0; font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--text-main); }
    .privacy-print-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      width: 100%;
      min-height: 38px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      color: var(--text-main);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: background-color 150ms ease, border-color 150ms ease;
    }
    .privacy-print-btn:hover { background: var(--surface-3); border-color: var(--border-strong); }

    .privacy-article { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
    .privacy-section {
      scroll-margin-top: 84px;
      padding: 24px 26px;
      border-radius: 18px;
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-card);
    }
    .privacy-section:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
    .privacy-sec-tag {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--accent-strong);
      margin-bottom: 6px;
    }
    .privacy-section h2 { font-family: var(--font-display); font-size: 1.2rem; font-weight: 800; letter-spacing: -0.02em; color: var(--text-main); margin: 0 0 10px; line-height: 1.25; }
    .privacy-section p { max-width: 65ch; margin: 0; font-size: 14.5px; line-height: 1.65; color: var(--text-muted); text-wrap: pretty; }
    .privacy-code {
      font-family: var(--font-mono);
      font-size: 0.85em;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 7px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--accent-strong);
    }

    .privacy-item-list { list-style: none; padding: 0; margin: 16px 0 0; display: flex; flex-direction: column; gap: 10px; }
    .privacy-item-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 13px 14px;
      border-radius: 13px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }
    .privacy-item-ico {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--accent-strong);
      display: grid;
      place-items: center;
      font-size: 16px;
      flex-shrink: 0;
    }
    .privacy-item-card strong { display: block; font-size: 13.5px; font-weight: 700; color: var(--text-main); margin-bottom: 2px; }
    .privacy-item-card p { font-size: 13px; line-height: 1.5; }

    .privacy-callout {
      margin-top: 16px;
      display: flex;
      align-items: flex-start;
      gap: 11px;
      padding: 13px 15px;
      border-radius: 13px;
      background: var(--accent-tint);
      border: 1px solid var(--accent-border);
    }
    .privacy-callout-ico { font-size: 18px; color: var(--accent-strong); margin-top: 1px; flex-shrink: 0; }
    .privacy-callout strong { display: block; font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 2px; }
    .privacy-callout p { font-size: 12.5px; line-height: 1.5; color: var(--text-main); }

    .privacy-scope-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .privacy-scope-card { padding: 14px 16px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface-2); }
    .privacy-scope-card.is-allow { border-color: var(--accent-border); background: color-mix(in srgb, var(--accent-tint) 65%, var(--surface)); }
    .privacy-scope-card.is-deny { border-color: var(--danger-border); background: color-mix(in srgb, var(--danger-bg) 55%, var(--surface)); }
    .privacy-scope-head { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 800; color: var(--text-main); margin-bottom: 8px; }
    .privacy-scope-card.is-allow .privacy-scope-head i { color: var(--accent-strong); }
    .privacy-scope-card.is-deny .privacy-scope-head i { color: var(--danger); }
    .privacy-scope-card ul { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: var(--text-muted); line-height: 1.45; }

    .privacy-footer-card {
      padding: 20px 24px;
      border-radius: 18px;
      background: var(--surface);
      border: 1px solid var(--border);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .privacy-footer-copy { margin: 0; font-size: 12.5px; font-weight: 500; color: var(--text-muted); }
    .privacy-footer-actions { display: flex; flex-wrap: wrap; gap: 10px; }
    .privacy-cta-primary,
    .privacy-cta-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 40px;
      padding: 0 15px;
      border-radius: 11px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      white-space: nowrap;
      transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
    }
    .privacy-cta-primary { background: var(--accent); border: 1px solid var(--accent); color: var(--accent-ink); }
    .privacy-cta-primary:hover { background: var(--accent-strong); border-color: var(--accent-strong); }
    .privacy-cta-secondary { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-main); }
    .privacy-cta-secondary:hover { background: var(--surface-3); border-color: var(--border-strong); }

    @media (max-width: 900px) {
      .privacy-pillars { grid-template-columns: 1fr; }
      .privacy-layout { grid-template-columns: minmax(0, 1fr); gap: 16px; padding-top: 20px; }
      .privacy-aside { position: static; min-width: 0; max-width: 100%; }
      .privacy-toc-nav { flex-direction: row; flex-wrap: nowrap; overflow-x: auto; padding: 10px; gap: 6px; }
      .privacy-toc-title, .privacy-trust-box { display: none; }
      .privacy-toc-link { flex: 0 0 auto; white-space: nowrap; padding: 8px 12px; }
      .privacy-toc-link:is(:target-current, .target-current) { box-shadow: none; }
    }

    @media (max-width: 640px) {
      .privacy-topbar-inner { padding: 10px 14px; }
      .privacy-topbar-actions { gap: 6px; }
      .privacy-brand-sep, .privacy-brand-crumb { display: none; }
      .privacy-lang-btn { min-width: 34px; min-height: 36px; padding: 0 8px; }
      .privacy-icon-btn { width: 44px; height: 44px; }
      .privacy-back-btn { min-height: 44px; padding: 0 11px; font-size: 12px; }
      .privacy-hero-inner { padding: 28px 16px 24px; }
      .privacy-layout { padding: 16px 14px 52px; }
      .privacy-section { padding: 18px 16px; }
      .privacy-scope-grid { grid-template-columns: 1fr; }
      .privacy-footer-card { padding: 18px 16px; }
      .privacy-footer-actions { width: 100%; }
      .privacy-cta-primary, .privacy-cta-secondary { flex: 1; min-height: 44px; }
    }

    @media (max-width: 520px) {
      .privacy-back-btn { width: 44px; min-width: 44px; padding: 0; justify-content: center; position: relative; }
      .privacy-back-btn span {
        position: absolute;
        clip-path: inset(50%);
        width: 1px;
        height: 1px;
        overflow: hidden;
        white-space: nowrap;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .privacy-lang-btn, .privacy-icon-btn, .privacy-back-btn, .privacy-toc-link,
      .privacy-print-btn, .privacy-cta-primary, .privacy-cta-secondary {
        transition: none;
      }
    }

    @media print {
      .privacy-topbar, .privacy-aside, .privacy-footer-actions { display: none !important; }
      body.privacy-page, .privacy-hero, .privacy-section { background: #ffffff !important; color: #111111 !important; box-shadow: none !important; }
      .privacy-layout { display: block; padding: 16px 0; }
    }
  }
</style>
