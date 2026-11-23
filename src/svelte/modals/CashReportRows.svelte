<script lang="ts">
  import { cashReportStore } from '../stores/cash-report.svelte';
</script>

{#if cashReportStore.details.length === 0}
  <tr><td colspan="6" class="td-muted-center">Tidak ada transaksi tercatat pada periode {cashReportStore.month}.</td></tr>
{:else}
  {#each cashReportStore.details as item, idx (item.key)}
    <tr data-type={item.isIn ? 'in' : 'out'}>
      <td class="col-no report-row-num">{idx + 1}</td>
      <td class="col-waktu report-row-time">
        <div class="report-row-date">{item.dateStr}</div>
        <div class="report-row-clock">{item.timeStr} WIB</div>
      </td>
      <td class="col-ket report-row-desc">
        <div>{#if item.keterangan}{item.keterangan}{:else}<span class="text-muted">({item.isIn ? 'Pemasukan' : 'Pengeluaran'})</span>{/if}</div>
        {#if item.metaText}<div class="report-row-meta">{item.metaText}</div>{/if}
      </td>
      <td class="col-amt report-row-amt report-row-in {item.isIn ? 'is-income' : 'is-muted'}">{item.isIn ? '+' + item.nominalFormatted : '-'}</td>
      <td class="col-amt report-row-amt report-row-out {item.isIn ? 'is-muted' : 'is-danger'}">{item.isIn ? '-' : '-' + item.nominalFormatted}</td>
      <td class="col-saldo report-row-saldo">{item.balanceFormatted}</td>
    </tr>
  {/each}
{/if}

<style>
  :global {
    /* === HYBRID KINETIC ABOUT MODAL (#modal-about) === */

    #modal-about:modal {
      overscroll-behavior: contain;
    }

    #modal-about::backdrop {
      overflow: hidden;
      overscroll-behavior: contain;
    }

    #modal-about .about-sheet {
      width: min(420px, calc(100vw - 28px));
      max-width: 100%;
      padding: 0;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: var(--shadow-pop);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    #modal-about .about-hero {
      position: relative;
      padding: 26px 24px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      border-bottom: 1px solid var(--border);
      background:
        radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--accent) 13%, transparent), transparent 72%),
        var(--surface);
      flex-shrink: 0;
    }

    #modal-about .about-hero .close-modal-btn {
      position: absolute;
      top: 14px;
      right: 14px;
      min-width: 34px;
      min-height: 34px;
      width: 34px;
      height: 34px;
      border-radius: 10px;
    }

    #modal-about .about-logo-frame {
      width: 66px;
      height: 66px;
      border-radius: 18px;
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow:
        0 10px 24px -8px color-mix(in srgb, var(--accent) 26%, transparent),
        0 2px 6px rgba(0, 0, 0, 0.05);
      display: grid;
      place-items: center;
      margin-bottom: 14px;
    }

    #modal-about .about-logo {
      width: 46px;
      height: 46px;
      border-radius: 12px;
    }

    #modal-about .about-title-row {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    #modal-about .about-name {
      font-family: var(--font-display);
      font-size: 1.3125rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: var(--text-main);
      margin: 0;
      line-height: 1.2;
    }

    #modal-about .about-ver-pill {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--accent-tint);
      color: var(--accent-strong);
      border: 1px solid var(--accent-border);
      line-height: 1.35;
    }

    #modal-about .about-tagline {
      margin: 6px 0 0;
      max-width: 30ch;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-muted);
      line-height: 1.5;
      text-wrap: balance;
    }

    #modal-about .about-body {
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    #modal-about .about-pillars {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    #modal-about .about-pillar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 8px 6px;
      border-radius: 11px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      font-size: 11.5px;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      min-width: 0;
    }

    #modal-about .about-pillar i {
      font-size: 14px;
      color: var(--accent-strong);
      flex-shrink: 0;
    }

    #modal-about .about-meta {
      margin: 0;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface-2);
      overflow: hidden;
    }

    #modal-about .about-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 11px 14px;
    }

    #modal-about .about-meta-row + .about-meta-row {
      border-top: 1px solid var(--border);
    }

    #modal-about .about-meta-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-muted);
    }

    #modal-about .about-meta-label i {
      font-size: 15px;
      color: var(--text-faint);
    }

    #modal-about .about-meta-val {
      margin: 0;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-main);
      text-align: right;
    }

    #modal-about .about-copy {
      margin: 2px 0 0;
      display: block;
      text-align: center;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      line-height: 1.55;
      text-wrap: balance;
    }

    #modal-about .about-heart {
      display: inline-block;
      vertical-align: -0.15em;
      margin-inline: 2px;
      color: var(--accent-strong);
      font-size: 13px;
    }

    #modal-about .about-sheet-footer {
      background: var(--surface-2);
      padding: 12px 20px;
      gap: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    #modal-about .about-footer-link {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 36px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-main);
      font-size: 12.5px;
      font-weight: 700;
      text-decoration: none;
      transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
    }

    #modal-about .about-ext-ico {
      font-size: 13px;
      color: var(--text-faint);
      transition: color 150ms ease, transform 150ms ease;
    }

    #modal-about .about-footer-link:hover {
      background: var(--surface);
      border-color: var(--accent-border);
      color: var(--accent-strong);
    }

    #modal-about .about-footer-link:hover .about-ext-ico {
      color: var(--accent-strong);
      transform: translate(1px, -1px);
    }

    #modal-about .about-close-pill {
      min-width: auto;
      min-height: 36px;
      padding: 0 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-muted);
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
    }

    #modal-about .about-close-pill:hover {
      background: var(--surface-3);
      border-color: var(--border-strong);
      color: var(--text-main);
    }

    #modal-about .about-footer-link:focus-visible,
    #modal-about .about-close-pill:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    @media (max-width: 768px) {
      #modal-about.hybrid-dialog[open] .about-sheet {
        width: 100%;
        max-width: 100%;
        max-height: 90dvh;
        border-radius: 20px 20px 0 0;
      }

      #modal-about .about-hero {
        padding: 8px 16px 18px;
      }

      #modal-about .about-hero .close-modal-btn {
        top: 4px;
        right: 12px;
        min-width: 44px;
        min-height: 44px;
        width: 44px;
        height: 44px;
      }

      #modal-about .about-body {
        padding: 16px;
      }

      #modal-about .about-pillar {
        padding: 7px 4px;
        font-size: 11px;
      }

      #modal-about .about-sheet-footer {
        padding: 12px 16px;
      }

      #modal-about .about-footer-link,
      #modal-about .about-close-pill {
        min-height: 44px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #modal-about .about-footer-link,
      #modal-about .about-ext-ico,
      #modal-about .about-close-pill {
        transition: none;
      }
    }
  }
</style>
