<script lang="ts">
  import { masterAnggotaStore } from '../stores/master.svelte';
</script>

{#if masterAnggotaStore.rows.length === 0}
  <tr><td colspan="4" class="td-muted-center">Belum ada anggota terdaftar.</td></tr>
{:else}
  {@const q = masterAnggotaStore.query.trim().toLowerCase()}
  {#each masterAnggotaStore.rows as row (row.id)}
    {@const visible = !q || row.searchText.toLowerCase().includes(q)}
    <tr class="master-row {row.isAktif ? 'is-aktif' : 'is-nonaktif'}" data-search={row.searchText} style:display={visible ? undefined : 'none'}>
      <td class="td-name-col">
        <div class="master-cell-identity">
          <span class="master-avatar {row.isAktif ? '' : 'is-inactive'}" aria-hidden="true">{row.initials}</span>
          <div class="master-name-wrap">
            <span class="master-name-text">{row.name}</span>
            <span class="master-id-pill">{row.id}</span>
          </div>
        </div>
      </td>
      <td class="td-wa-col">
        {#if row.waHref}
          <a href={row.waHref} target="_blank" rel="noopener" class="master-wa-link" title="Chat WhatsApp"><i class="ph-fill ph-whatsapp-logo" aria-hidden="true"></i> <span>{row.rawWa}</span></a>
        {:else}
          <span class="text-muted">-</span>
        {/if}
      </td>
      <td class="td-status-col text-center">
        {#if row.isAktif}
          <span class="badge badge-masuk"><i class="ph-bold ph-check" aria-hidden="true"></i> Aktif</span>
        {:else}
          <span class="badge badge-keluar"><i class="ph-bold ph-x" aria-hidden="true"></i> Nonaktif</span>
        {/if}
      </td>
      <td class="td-action-col">
        <div class="master-actions-wrap">
          <button type="button" class="btn btn-outline btn-master-action" data-action="edit-master-anggota" data-id={row.id} title="Kelola Anggota">
            <i class="ph-bold ph-pencil-simple" aria-hidden="true"></i> <span>Edit</span>
          </button>
        </div>
      </td>
    </tr>
  {/each}
{/if}

<style>
  :global {
    /* === HYBRID KINETIC MASTER DATA SHEETS (#modal-kelola-master, #modal-edit-master-*) === */

    :is(#modal-kelola-master, #modal-edit-master-anggota, #modal-edit-master-kategori):modal,
    :is(#modal-kelola-master, #modal-edit-master-anggota, #modal-edit-master-kategori)::backdrop { overscroll-behavior: contain; }
    :is(#modal-kelola-master, #modal-edit-master-anggota, #modal-edit-master-kategori)::backdrop { overflow: hidden; }

    #modal-kelola-master .master-sheet {
      width: min(680px, calc(100vw - 28px)); max-width: 100%; padding: 0;
      border-radius: 20px; border: 1px solid var(--border);
      background: var(--surface); box-shadow: var(--shadow-pop);
      display: flex; flex-direction: column; overflow: visible;
    }
    #modal-kelola-master[open] > .master-sheet,
    :is(#modal-edit-master-anggota, #modal-edit-master-kategori)[open] > .master-edit-sheet {
      max-height: min(92dvh, 760px);
    }

    .master-edit-sheet {
      width: min(470px, calc(100vw - 28px)) !important; max-width: 100% !important; padding: 0;
      border-radius: 20px; border: 1px solid var(--border);
      background: var(--surface); box-shadow: var(--shadow-pop);
      display: flex; flex-direction: column; overflow: visible;
    }

    /* Header & Footer */
    .master-sheet-header {
      padding: 15px 20px 13px; align-items: flex-start; gap: 12px; border-radius: 20px 20px 0 0;
      background: radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 58%), var(--surface);
    }
    .master-header-main { display: flex; align-items: center; gap: 11px; min-width: 0; }
    .master-header-emblem {
      width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 12px;
      background: var(--accent-tint); border: 1px solid var(--accent-border); color: var(--accent-strong);
      display: grid; place-items: center; font-size: 19px; flex-shrink: 0;
    }
    .master-header-copy { min-width: 0; }
    .master-header-copy h2 {
      font-family: var(--font-display); font-size: 1.0625rem; font-weight: 800;
      letter-spacing: -0.02em; line-height: 1.25; color: var(--text-main); margin: 0;
    }
    .master-header-copy p {
      margin: 2px 0 0; font-size: 0.78125rem; font-weight: 500; color: var(--text-muted); line-height: 1.4;
    }
    .master-sheet-header .close-modal-btn {
      min-width: 34px; min-height: 34px; width: 34px; height: 34px; border-radius: 10px; margin-top: 1px;
    }

    .master-sheet-body {
      padding: 14px 20px 16px; display: flex; flex-direction: column; gap: 12px; flex: 1 1 auto; min-height: 0;
    }
    .master-edit-form { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
    .master-sheet-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 12px 20px; border-radius: 0 0 20px 20px; margin: 0;
    }
    .master-footer-hint {
      font-size: 11.5px; font-weight: 500; color: var(--text-muted);
      margin-inline-end: auto; min-width: 0;
    }
    .master-sheet-footer .btn {
      min-width: 0; min-height: 38px; height: 38px; padding: 0 16px;
      font-size: 13px; font-weight: 700; border-radius: 11px;
      display: inline-flex; align-items: center; gap: 6px;
    }

    /* 4-Tab Segmented Glider */
    .master-tabs-bar { padding: 12px 20px 0; flex-shrink: 0; }
    .master-tab-track {
      position: relative; isolation: isolate; display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; padding: 3px; margin: 0;
      background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-pill);
    }
    .master-glider-pill {
      position: absolute; z-index: -1; inset: 3px auto 3px 3px; width: calc((100% - 6px) / 4);
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-pill);
      box-shadow: var(--hybrid-card-shadow); translate: 0 0;
      transition: translate 280ms var(--hybrid-ease-spring); pointer-events: none;
    }
    .master-tab-track:has([data-tab="tab-master-kategori"].active) .master-glider-pill { translate: 100% 0; }
    .master-tab-track:has([data-tab="tab-master-skipped"].active) .master-glider-pill { translate: 200% 0; }
    .master-tab-track:has([data-tab="tab-master-payment"].active) .master-glider-pill { translate: 300% 0; }

    .master-tab-track .tab-btn {
      background: transparent; border: 0; box-shadow: none; min-height: 33px; padding: 5px 8px;
      font-size: 12px; font-weight: 700; color: var(--text-muted); border-radius: var(--r-pill);
      display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-width: 0;
    }
    .master-tab-track .tab-btn.active { background: transparent; border-color: transparent; box-shadow: none; color: var(--text-main); }
    .master-tab-track .tab-btn:hover:not(.active) { background: transparent; color: var(--text-main); }
    .master-tab-count {
      font-family: var(--font-mono); font-size: 10px; font-weight: 700; line-height: 1;
      padding: 2px 6px; border-radius: var(--r-pill);
      background: var(--surface-2); border: 1px solid var(--border); color: var(--text-muted);
    }
    .master-tab-track .tab-btn.active .master-tab-count {
      background: var(--accent-tint); border-color: var(--accent-border); color: var(--accent-strong);
    }

    #modal-kelola-master .tab-content.active { display: flex; flex-direction: column; gap: 10px; }

    /* Controls & Toolbar */
    :is(#modal-kelola-master, .master-edit-sheet) :is(.form-control, .cdrop-btn, .mpick-field) {
      min-height: 40px; height: 40px; padding: 7px 12px; font-size: 13px; border-radius: 10px;
    }
    :is(#modal-kelola-master, .master-edit-sheet) .form-group { margin-bottom: 0; min-width: 0; }
    :is(#modal-kelola-master, .master-edit-sheet) .form-group label {
      margin-bottom: 5px; font-size: 12px; font-weight: 600; color: var(--text-main);
    }

    .master-form-card {
      padding: 12px 14px; border: 1px solid var(--border); border-radius: 14px;
      background: var(--surface-2); position: relative; overflow: visible !important;
    }
    .master-form-card:has(:is(.mpick.open, .cdrop.open)) { z-index: 80 !important; }
    .master-form-row { display: flex; align-items: center; gap: 8px; width: 100%; }
    .master-form-row .btn,
    .skip-month-input-row .btn {
      height: 40px; min-height: 40px; padding: 0 14px; white-space: nowrap; flex-shrink: 0;
      font-size: 12.5px; font-weight: 700; border-radius: 10px;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    }

    .master-list-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .master-search-box { flex: 1 1 220px; margin-bottom: 0; }
    .master-search-box i { left: 11px; font-size: 15px; }
    #modal-kelola-master .master-search-box .form-control {
      min-height: 36px; height: 36px; padding: 5px 10px 5px 34px; font-size: 12.5px;
    }
    .master-stats-pill {
      font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--text-muted);
      background: var(--surface-2); border: 1px solid var(--border); padding: 4px 10px;
      border-radius: var(--r-pill); white-space: nowrap; flex-shrink: 0;
    }

    /* Tables & Identities */
    #modal-kelola-master .master-table-wrapper {
      background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
      max-height: 248px; overflow-y: auto; overflow-x: auto; overscroll-behavior: contain;
    }
    .table-master { width: 100%; border-collapse: collapse; }
    .table-master thead th {
      background: var(--surface-2); color: var(--text-muted); font-family: var(--font-mono);
      font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
      padding: 9px 13px; border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 2; text-align: left;
    }
    .table-master th.text-center { text-align: center; }
    .table-master td { padding: 9px 13px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .table-master tbody tr:last-child td { border-bottom: none; }
    .table-master tbody tr:hover td { background: var(--surface-2); }

    .master-cell-identity { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .master-avatar {
      width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0;
      font-size: 11px; font-weight: 800; letter-spacing: 0.02em;
      background: var(--accent); color: var(--accent-ink);
    }
    .master-avatar.is-inactive {
      background: var(--surface-2); border: 1px solid var(--border); color: var(--text-muted);
    }
    .master-avatar.is-lg { width: 34px; height: 34px; font-size: 12px; }

    .master-kat-icon {
      width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center;
      flex-shrink: 0; font-size: 14px;
    }
    .master-kat-icon.is-lg { width: 40px; height: 40px; border-radius: 11px; font-size: 18px; }
    .master-kat-icon.is-masuk { background: var(--income-bg); color: var(--income-strong); }
    .master-kat-icon.is-keluar { background: var(--danger-bg); color: var(--danger); }

    .master-name-wrap { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 0; }
    .master-name-text { font-weight: 600; font-size: 13px; color: var(--text-main); line-height: 1.25; }
    .master-id-pill {
      display: inline-block; font-family: var(--font-mono); font-size: 10px; font-weight: 600;
      color: var(--text-muted); background: var(--surface-2); border: 1px solid var(--border);
      padding: 1px 6px; border-radius: var(--r-xs); white-space: nowrap; letter-spacing: 0.02em;
    }
    .master-wa-link {
      display: inline-flex; align-items: center; gap: 5px; color: var(--text-muted);
      text-decoration: none; font-size: 12.5px; font-weight: 500; transition: color 140ms ease;
    }
    .master-wa-link:hover { color: var(--accent-strong); }
    .master-wa-link i { color: var(--income-strong); font-size: 14px; }

    .master-actions-wrap { display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
    .btn-master-action {
      height: 30px; padding: 0 10px; font-size: 11.5px; font-weight: 700; border-radius: 8px;
      display: inline-flex; align-items: center; gap: 5px;
      transition: background-color var(--t-fast), border-color var(--t-fast), color var(--t-fast);
    }

    /* Tab 3: Period & Exempt Months */
    .master-period-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .master-period-card { display: flex; flex-direction: column; justify-content: space-between; gap: 8px; }
    .master-period-card:nth-child(2) .mpick-pop { left: auto; right: 0; }
    .master-period-head { display: flex; align-items: center; gap: 7px; }
    .master-period-head i { font-size: 16px; color: var(--accent-strong); }
    .master-period-head h3 { margin: 0; font-size: 13.5px; font-weight: 800; color: var(--text-main); }
    .master-skip-hint { margin: 0; font-size: 11.5px; line-height: 1.4; color: var(--text-muted); }
    .skip-month-input-row { display: flex; gap: 8px; align-items: center; position: relative; }

    .master-skipped-card-panel { padding: 12px 14px; max-height: 170px !important; }
    .master-section-label {
      font-family: var(--font-mono); font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em;
      text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;
    }
    .skipped-months-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; }
    .skip-month-label { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--text-main); }
    .skip-month-label i { font-size: 15px; color: var(--warning); }
    .skip-month-card .btn-master-action { height: 28px; padding: 0 9px; font-size: 11px; }

    /* Tab 4: Payment Account */
    .payment-account-form { display: flex; flex-direction: column; gap: 12px; padding: 15px 16px; margin: 0; }
    .master-pay-head { display: flex; align-items: center; gap: 11px; }
    .master-pay-icon {
      width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center;
      background: var(--accent-tint); border: 1px solid var(--accent-border);
      color: var(--accent-strong); font-size: 17px; flex-shrink: 0;
    }
    .master-pay-head h3 { margin: 0; font-size: 14px; font-weight: 800; color: var(--text-main); }
    .master-pay-head p { margin: 2px 0 0; font-size: 11.5px; color: var(--text-muted); }
    .master-pay-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 12px; }
    .master-pay-grid label { display: grid; gap: 4px; font-size: 12px; font-weight: 600; color: var(--text-main); margin: 0; }
    .master-pay-actions {
      display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 2px;
    }
    .master-pay-note { font-size: 11.5px; color: var(--text-muted); }
    .master-pay-actions .btn {
      height: 38px; min-height: 38px; padding: 0 16px; border-radius: 10px;
      font-size: 13px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
    }

    /* Edit Member / Category Sub-Modals */
    .edit-member-meta-bar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 12px; background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 13px; gap: 10px; flex-wrap: wrap;
    }
    .master-edit-identity { display: inline-flex; align-items: center; gap: 8px; }
    .master-edit-split { grid-template-columns: 1.1fr 0.9fr; gap: 10px; }
    .master-wa-btn {
      height: 30px; padding: 0 10px; font-size: 11.5px; font-weight: 700; border-radius: 8px;
      color: var(--income-strong); border-color: var(--income-border); text-decoration: none;
      display: inline-flex; align-items: center; gap: 5px;
    }
    .master-wa-btn:hover { background: var(--income-bg); color: var(--income-strong); }

    .edit-master-card { padding: 14px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 14px; }
    .edit-master-card-head { display: flex; align-items: center; gap: 12px; }
    .edit-master-info { flex: 1; min-width: 0; }
    .edit-master-name {
      margin: 4px 0 0; font-size: 14.5px; font-weight: 700; color: var(--text-main);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .btn-danger-outline {
      background: transparent; color: var(--danger); border: 1px solid var(--danger-border);
    }
    .btn-danger-outline:hover { background: var(--danger-bg); border-color: var(--danger); color: var(--danger); }

    /* Shared Edit Transaksi Footer Actions (#modal-edit-transaksi) */
    .edit-footer-actions { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
    .edit-footer-secondary { display: flex; align-items: center; gap: 8px; }
    .edit-footer-secondary .btn { max-width: none !important; flex: 0 0 auto !important; padding: 0 14px; height: 38px; }

    /* Responsive & Height Guards */
    @media (max-height: 619px) and (min-width: 769px) {
      #modal-kelola-master .master-sheet,
      .master-edit-sheet { overflow: hidden; }
      .master-sheet-body { overflow-y: auto; overscroll-behavior: contain; }
    }

    @media (max-width: 768px) {
      #modal-kelola-master[open] > .master-sheet,
      :is(#modal-edit-master-anggota, #modal-edit-master-kategori)[open] > .master-edit-sheet {
        width: 100% !important; max-width: 100% !important; max-height: 92dvh;
        border-radius: 20px 20px 0 0; overflow: hidden;
      }
      .master-sheet-header { padding: 4px 16px 12px; border-radius: 0; }
      .master-sheet-header .close-modal-btn { min-width: 44px; min-height: 44px; width: 44px; height: 44px; }
      .master-tabs-bar { padding: 10px 14px 0; }
      .master-tab-track .tab-btn { min-height: 38px; font-size: 11.5px; padding: 4px 6px; gap: 4px; }
      .master-sheet-body { padding: 12px 14px 14px; overflow-y: auto; overscroll-behavior: contain; }
      :is(#modal-kelola-master, .master-edit-sheet) :is(.form-control, .cdrop-btn, .mpick-field) {
        min-height: 44px; height: 44px; padding: 7px 11px; font-size: max(1rem, 1em);
      }
      #modal-kelola-master .master-search-box .form-control {
        min-height: 40px; height: 40px; padding: 5px 10px 5px 34px; font-size: max(1rem, 1em);
      }
      .master-form-row .btn,
      .skip-month-input-row .btn,
      .master-pay-actions .btn,
      .master-sheet-footer .btn { min-height: 44px; height: 44px; }
      .master-footer-hint,
      .master-pay-note { display: none; }
      .master-sheet-footer { padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); border-radius: 0; justify-content: space-between; }
      #modal-kelola-master .master-sheet-footer .btn { width: 100%; justify-content: center; }

      #form-tambah-anggota,
      #form-tambah-kategori { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      #form-tambah-anggota > :first-child { grid-column: 1 / -1; width: 100%; min-width: 0; }
      #form-tambah-anggota > :nth-child(2) { grid-column: 1 / 2; width: 100%; min-width: 0; }
      #form-tambah-anggota > :nth-child(3) { grid-column: 2 / 3; width: 100%; }
      #form-tambah-kategori input#input-nama-kategori { order: 1; grid-column: 1 / -1; width: 100%; min-width: 0; }
      #form-tambah-kategori :is(select, .cdrop) { order: 2; grid-column: 1 / 2; width: 100%; min-width: 0; }
      #form-tambah-kategori button[type="submit"] { order: 3; grid-column: 2 / 3; width: 100%; }

      #modal-kelola-master .master-table-wrapper { max-height: none; overflow: visible; border: 0; background: transparent; }
      #modal-kelola-master .table-master { min-width: 0; width: 100%; display: block; }
      #modal-kelola-master .table-master thead { display: none; }
      #modal-kelola-master .table-master tbody { display: flex; flex-direction: column; gap: 8px; width: 100%; }
      #modal-kelola-master .master-row {
        display: grid; grid-template-columns: minmax(0, 1fr) auto; row-gap: 8px; column-gap: 10px;
        width: 100%; box-sizing: border-box;
        align-items: center; background: var(--surface); border: 1px solid var(--border);
        border-radius: 13px; padding: 10px 12px;
      }
      #modal-kelola-master .table-master-kategori .master-row { grid-template-columns: minmax(0, 1fr) auto auto; row-gap: 0; }
      .master-row.is-aktif, .master-row.is-masuk { border-left: 3px solid var(--accent); }
      .master-row td { padding: 0; border: 0; }
      .master-row .td-name-col { grid-column: 1; grid-row: 1; min-width: 0; }
      .master-row .td-status-col { grid-column: 2; grid-row: 1; justify-self: end; }
      .master-row .td-wa-col { grid-column: 1; grid-row: 2; font-size: 12px; }
      .master-row .td-action-col { grid-column: 2; grid-row: 2; justify-self: end; }
      #modal-kelola-master .table-master-kategori .master-row .td-action-col { grid-column: 3; grid-row: 1; }
      .btn-master-action { min-height: 36px; height: 36px; padding: 0 11px; }
      .master-edit-split { grid-template-columns: 1fr; }
    }

    @media (max-width: 640px) {
      .master-period-grid,
      .master-pay-grid { grid-template-columns: 1fr; }
      .master-period-card:nth-child(2) .mpick-pop { left: 0; right: auto; }
      .master-tab-count { display: none; }
      .skipped-months-container { grid-template-columns: 1fr; }
    }

    @media (prefers-reduced-motion: reduce) {
      .master-glider-pill,
      .master-wa-link,
      .btn-master-action,
      .audit-chip { transition: none; }
      .audit-refresh-btn.is-loading i { animation: none; }
    }

    /* === HYBRID KINETIC AUDIT LOG SHEET (#modal-audit-log) === */
    #modal-audit-log:modal, #modal-audit-log::backdrop { overscroll-behavior: contain; }
    #modal-audit-log::backdrop { overflow: hidden; }

    #modal-audit-log > .audit-sheet {
      width: min(740px, calc(100vw - 28px)); max-width: 740px; max-height: min(90dvh, 740px); padding: 0;
      border-radius: 20px; border: 1px solid var(--border);
      background: var(--surface); box-shadow: var(--shadow-pop);
      display: flex; flex-direction: column; overflow: hidden; gap: 0;
    }

    #modal-audit-log .audit-sheet-header {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 14px 20px 12px; border-radius: 20px 20px 0 0; border-bottom: 1px solid var(--border); flex-shrink: 0;
      background: radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 58%), var(--surface);
    }
    .audit-header-main { display: flex; align-items: center; gap: 11px; min-width: 0; }
    .audit-header-emblem {
      width: 38px; height: 38px; min-width: 38px; min-height: 38px; border-radius: 12px;
      background: var(--accent-tint); border: 1px solid var(--accent-border); color: var(--accent-strong);
      display: grid; place-items: center; font-size: 18px; flex-shrink: 0;
    }
    .audit-header-copy { min-width: 0; }
    .audit-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    #modal-audit-log .audit-header-copy h2 {
      font-family: var(--font-display); font-size: 1.0625rem; font-weight: 800;
      letter-spacing: -0.02em; line-height: 1.25; color: var(--text-main); margin: 0;
    }
    .audit-super-badge {
      display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: var(--r-pill);
      font-size: 10px; font-weight: 800; letter-spacing: 0.06em; line-height: 1.3; flex-shrink: 0;
      background: var(--warning-bg); border: 1px solid var(--warning-border); color: var(--warning);
    }
    #modal-audit-log .audit-subtitle {
      margin: 2px 0 0; font-size: 0.78125rem; font-weight: 500; color: var(--text-muted); line-height: 1.4;
    }
    .audit-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    #modal-audit-log .audit-sheet-header .audit-refresh-btn {
      min-width: 0; min-height: 34px; height: 34px; padding: 0 12px;
      font-size: 12.5px; font-weight: 700; border-radius: 10px;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .audit-refresh-btn.is-loading i { animation: auditSpin 0.8s linear infinite; }
    @keyframes auditSpin { to { transform: rotate(360deg); } }
    #modal-audit-log .audit-sheet-header .close-modal-btn {
      min-width: 34px; min-height: 34px; width: 34px; height: 34px; border-radius: 10px;
    }

    #modal-audit-log .audit-sheet-body {
      padding: 12px 20px 14px; display: flex; flex-direction: column; gap: 10px;
      flex: 1 1 auto; min-height: 0; overflow: hidden;
    }
    .audit-toolbar { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
    .audit-toolbar-top { display: flex; align-items: center; gap: 10px; }
    .audit-search-box { flex: 1 1 auto; min-width: 0; margin-bottom: 0; }
    #modal-audit-log .audit-search-box .search-icon { left: 11px; font-size: 15px; }
    #modal-audit-log .audit-search-box .form-control {
      width: 100%; height: 36px; min-height: 36px; padding: 5px 10px 5px 34px; font-size: 12.5px;
      border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-main);
    }
    #modal-audit-log .audit-search-box .form-control:focus {
      background: var(--surface); border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-tint);
    }
    .audit-count-pill {
      flex-shrink: 0; font-family: var(--font-mono); font-size: 11px; font-weight: 700;
      font-variant-numeric: tabular-nums; padding: 5px 10px; border-radius: var(--r-pill);
      background: var(--surface-2); border: 1px solid var(--border); color: var(--text-muted); white-space: nowrap;
    }
    .audit-filter-chips { display: flex; align-items: center; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 1px; }
    @supports not (scrollbar-color: auto) {
      .audit-filter-chips::-webkit-scrollbar { display: none; }
    }
    .audit-chip {
      height: 30px; min-height: 30px; padding: 0 11px; border-radius: var(--r-pill);
      border: 1px solid var(--border); background: var(--surface); color: var(--text-muted);
      font-size: 12px; font-weight: 600; white-space: nowrap; cursor: pointer; flex-shrink: 0;
      transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease;
    }
    .audit-chip:hover { color: var(--text-main); border-color: var(--border-strong); }
    .audit-chip.active { background: var(--accent-tint); border-color: var(--accent-border); color: var(--accent-strong); font-weight: 700; }

    #modal-audit-log .audit-ledger-wrapper {
      border: 1px solid var(--border); border-radius: 14px; background: var(--surface);
      overflow-y: auto; overflow-x: hidden; max-height: 320px; flex: 1 1 auto; min-height: 170px;
      scrollbar-gutter: stable; overscroll-behavior: contain;
    }
    .audit-ledger-table { width: 100%; border-collapse: separate; border-spacing: 0; font-family: var(--font-sans); font-size: 12.5px; }
    .audit-ledger-table thead th {
      background: var(--table-header-bg); border-bottom: 1px solid var(--border); padding: 9px 13px;
      font-family: var(--font-mono); font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--text-faint); white-space: nowrap; position: sticky; top: 0; z-index: 2; text-align: left;
    }
    .audit-th-waktu { width: 144px; }
    .audit-th-aksi { width: 162px; }
    .audit-th-detail { min-width: 0; }
    .audit-ledger-table tbody td {
      padding: 9px 13px; border-bottom: 1px solid var(--border); vertical-align: middle; text-align: left;
      line-height: 1.45; color: var(--text-muted); font-size: 12.5px;
    }
    #modal-audit-log .audit-ledger-table tbody td.td-muted-center { text-align: center; padding: 20px 13px; }
    .audit-ledger-table tbody tr:last-child td { border-bottom: none; }
    .audit-ledger-table tbody tr:hover td { background: var(--surface-2); }
    .audit-ledger-table tbody td.td-audit-time {
      font-family: var(--font-mono); font-variant-numeric: tabular-nums;
      white-space: nowrap; color: var(--text-faint); font-size: 11px;
    }
    .audit-ledger-table tbody td.td-audit-detail { color: var(--text-main); word-break: break-word; }

    .audit-action-pill {
      display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: var(--r-pill);
      font-size: 11px; font-weight: 700; line-height: 1.3; white-space: nowrap;
      border: 1px solid var(--border); background: var(--surface-2); color: var(--text-muted);
    }
    .audit-action-pill i { font-size: 12.5px; }
    .audit-action-pill.is-accent { background: var(--accent-tint); border-color: var(--accent-border); color: var(--accent-strong); }
    .audit-action-pill.is-warning { background: var(--warning-bg); border-color: var(--warning-border); color: var(--warning); }
    .audit-action-pill.is-danger { background: var(--danger-bg); border-color: var(--danger-border); color: var(--danger); }

    #modal-audit-log .audit-sheet-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 11px 20px; border-radius: 0 0 20px 20px; margin: 0; flex-shrink: 0;
    }
    .audit-footer-hint {
      font-size: 11.5px; font-weight: 500; color: var(--text-muted);
      display: inline-flex; align-items: center; gap: 5px; min-width: 0;
    }
    #modal-audit-log .audit-sheet-footer .btn {
      min-width: 0; min-height: 36px; height: 36px; padding: 0 16px;
      font-size: 13px; font-weight: 700; border-radius: 11px;
    }

    @media (max-height: 750px) and (min-width: 769px) {
      #modal-audit-log > .audit-sheet { max-height: calc(100dvh - 24px); }
      #modal-audit-log .audit-ledger-wrapper { max-height: 245px; min-height: 140px; }
    }

    @media (max-width: 768px) {
      #modal-audit-log[open] > .audit-sheet {
        width: 100%; max-width: 100%; max-height: 92dvh; border-radius: 20px 20px 0 0; overflow: hidden;
      }
      #modal-audit-log .hybrid-sheet-handle { flex-shrink: 0; }
      #modal-audit-log .audit-sheet-header { padding: 4px 14px 10px; border-radius: 0; gap: 8px; }
      #modal-audit-log .audit-header-emblem { width: 34px; height: 34px; min-width: 34px; min-height: 34px; font-size: 16px; }
      #modal-audit-log .audit-header-copy h2 { font-size: 15px; }
      #modal-audit-log .audit-subtitle { font-size: 11px; line-height: 1.3; }
      #modal-audit-log .audit-sheet-header .audit-refresh-btn {
        width: 44px; min-width: 44px; height: 44px; min-height: 44px; padding: 0; justify-content: center; font-size: 18px;
      }
      #modal-audit-log .audit-sheet-header .audit-refresh-btn span { display: none; }
      #modal-audit-log .audit-sheet-header .close-modal-btn { width: 44px; min-width: 44px; height: 44px; min-height: 44px; }
      #modal-audit-log .audit-sheet-body { padding: 10px 14px 12px; gap: 9px; overflow-y: auto; overscroll-behavior: contain; }
      #modal-audit-log .audit-search-box .form-control { min-height: 40px; height: 40px; padding: 5px 10px 5px 34px; font-size: max(1rem, 1em); }
      #modal-audit-log .audit-ledger-wrapper { border: 0; background: transparent; max-height: none; min-height: 0; overflow: visible; scrollbar-gutter: auto; }
      #modal-audit-log .audit-ledger-table { min-width: 0; width: 100%; display: block; }
      #modal-audit-log .audit-ledger-table thead { display: none; }
      #modal-audit-log .audit-ledger-table tbody { display: flex; flex-direction: column; gap: 8px; width: 100%; }
      #modal-audit-log .audit-ledger-table tbody tr {
        display: grid; grid-template-columns: auto minmax(0, 1fr); row-gap: 6px; column-gap: 8px;
        width: 100%; box-sizing: border-box; align-items: center;
        background: var(--surface); border: 1px solid var(--border); border-radius: 13px; padding: 10px 12px;
      }
      #modal-audit-log .audit-ledger-table tbody tr:hover td { background: transparent; }
      #modal-audit-log .audit-ledger-table tbody td { padding: 0; border: 0; }
      #modal-audit-log .audit-ledger-table tbody td.td-audit-aksi { grid-column: 1; grid-row: 1; line-height: 1; }
      #modal-audit-log .audit-ledger-table tbody td.td-audit-time { grid-column: 2; grid-row: 1; justify-self: end; font-size: 10.5px; line-height: 1; }
      #modal-audit-log .audit-ledger-table tbody td.td-audit-detail { grid-column: 1 / -1; grid-row: 2; font-size: 12.5px; line-height: 1.4; color: var(--text-main); }
      #modal-audit-log .audit-ledger-table tbody td.td-muted-center { grid-column: 1 / -1; text-align: center; padding: 18px 8px; }
      #modal-audit-log .audit-footer-hint { display: none; }
      #modal-audit-log .audit-sheet-footer { padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); border-radius: 0; }
      #modal-audit-log .audit-sheet-footer .btn { width: 100%; min-height: 44px; height: 44px; justify-content: center; }
    }
  }
</style>
