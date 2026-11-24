<script lang="ts">
  import { superAdminStore as sa } from '../stores/group-admin.svelte';
</script>

{#if sa.status === 'loading'}
  <span class="superadmin-empty-text">Memuat daftar superadmin...</span>
{:else if sa.status === 'error'}
  <span class="superadmin-empty-text">Tidak dapat memuat daftar superadmin.</span>
{:else}
  {#each sa.items as item (item.email)}
    <div class="superadmin-email-item" role="listitem">
      <div class="superadmin-email-meta">
        <span class="superadmin-avatar" aria-hidden="true"><i class={item.isPrimary ? 'ph-fill ph-crown' : 'ph ph-shield-check'}></i></span>
        <span class="superadmin-email-text"><strong>{item.email}</strong> {#if item.isPrimary}<span class="superadmin-email-tag">Pemilik Utama</span>{/if}</span>
      </div>
      {#if !item.isPrimary}
        <button type="button" class="superadmin-email-del" data-action="remove-superadmin-email" data-email={item.email} title="Cabut akses" aria-label="Cabut akses {item.email}"><i class="ph-bold ph-trash" aria-hidden="true"></i></button>
      {/if}
    </div>
  {/each}
{/if}

<style>
  :global {
    /* === Super Admin Tab & Credentials Sheet (#modal-group-admin Tab 2, #modal-group-credentials) === */

    .group-superadmin-info {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 10px 13px;
      border-radius: 12px;
      background: var(--surface-2);
      border: 1px dashed var(--border);
    }

    .group-superadmin-info i {
      font-size: 16px;
      color: var(--accent-strong);
      flex-shrink: 0;
    }

    .group-superadmin-note {
      margin: 0;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      line-height: 1.45;
    }

    .group-superadmin-card {
      padding: 14px 16px;
      border-radius: 14px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .group-superadmin-title {
      color: var(--text-muted);
    }

    .superadmin-add-form {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .superadmin-email-field {
      flex: 1 1 auto;
      min-width: 0;
    }

    .superadmin-add-btn {
      height: 40px;
      min-height: 40px;
      padding: 0 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .group-superadmin-list-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .superadmin-list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2px;
    }

    .group-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .superadmin-emails-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .superadmin-email-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 13px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 12px;
    }

    .superadmin-email-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1;
    }

    .superadmin-avatar {
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

    .superadmin-email-text {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      min-width: 0;
      font-size: 13px;
      color: var(--text-main);
      overflow-wrap: anywhere;
    }

    .superadmin-email-tag {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: var(--r-pill);
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: var(--accent-tint);
      border: 1px solid var(--accent-border);
      color: var(--accent-strong);
      white-space: nowrap;
    }

    .superadmin-email-del {
      width: 34px;
      height: 34px;
      min-width: 34px;
      min-height: 34px;
      border: 1px solid transparent;
      border-radius: 9px;
      background: transparent;
      color: var(--danger);
      cursor: pointer;
      display: inline-grid;
      place-items: center;
      flex-shrink: 0;
      transition: background-color 150ms ease, border-color 150ms ease;
    }

    .superadmin-email-del:hover {
      background: var(--danger-bg);
      border-color: var(--danger-border);
    }

    .superadmin-email-del:focus-visible {
      outline: 2px solid var(--danger);
      outline-offset: 2px;
    }

    .superadmin-empty-text {
      padding: 16px;
      border-radius: 12px;
      background: var(--surface-2);
      border: 1px dashed var(--border);
      font-size: 12.5px;
      color: var(--text-muted);
      text-align: center;
    }

    /* === HYBRID KINETIC CREDENTIALS SHEET (#modal-group-credentials) === */
    #modal-group-credentials:modal,
    #modal-group-credentials::backdrop {
      overscroll-behavior: contain;
    }

    #modal-group-credentials::backdrop {
      overflow: hidden;
    }

    #modal-group-credentials .group-creds-sheet {
      width: min(460px, calc(100vw - 28px));
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

    #modal-group-credentials .group-creds-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 20px 14px;
      border-bottom: 1px solid var(--border);
      background:
        radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--income) 12%, transparent), transparent 60%),
        var(--surface);
    }

    .group-creds-header-main {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .group-creds-emblem {
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
      border-radius: 12px;
      background: var(--income-bg);
      border: 1px solid var(--income-border);
      color: var(--income-strong);
      display: grid;
      place-items: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    .group-creds-copy {
      min-width: 0;
    }

    #modal-group-credentials .group-creds-copy h2 {
      font-family: var(--font-display);
      font-size: 1.0625rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.25;
      color: var(--text-main);
      margin: 0;
    }

    #modal-group-credentials .group-creds-copy p {
      margin: 2px 0 0;
      font-size: 0.78125rem;
      font-weight: 500;
      color: var(--text-muted);
      line-height: 1.4;
    }

    #modal-group-credentials .group-creds-header .close-modal-btn {
      min-width: 34px;
      min-height: 34px;
      width: 34px;
      height: 34px;
      border-radius: 10px;
    }

    .group-creds-body {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .cred-card-box {
      border-radius: 14px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .cred-card-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
    }

    .cred-card-row:last-child {
      border-bottom: 0;
    }

    .cred-row-label {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .cred-row-label i {
      font-size: 15px;
      color: var(--accent-strong);
    }

    .cred-row-val,
    .cred-email {
      font-weight: 700;
      color: var(--text-main);
      text-align: right;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .cred-code {
      font-family: var(--font-mono);
      font-size: 12.5px;
      font-weight: 700;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 3px 9px;
      border-radius: 8px;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .cred-share-tip {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 11px;
      background: var(--surface-2);
      border: 1px dashed var(--border);
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .cred-share-tip i {
      font-size: 15px;
      color: var(--accent-strong);
      flex-shrink: 0;
    }

    .group-creds-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 20px;
      background: var(--surface-2);
    }

    .group-creds-footer .btn {
      min-height: 40px;
      height: 40px;
      border-radius: 11px;
      font-size: 13px;
      font-weight: 700;
    }

    .cred-close-btn {
      flex: 0 0 auto;
      padding: 0 16px;
    }

    .cred-wa-btn {
      flex: 1 1 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 0 16px;
    }

    .cred-wa-icon {
      font-size: 17px;
    }

    @media (max-width: 768px) {
      .superadmin-add-form {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
      }

      .superadmin-add-btn {
        min-height: 44px;
        height: 44px;
      }

      .superadmin-email-del {
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
      }

      #modal-group-credentials.hybrid-dialog .group-creds-sheet {
        width: 100%;
        max-width: 100%;
        max-height: 90dvh;
        border-radius: 20px 20px 0 0;
      }

      #modal-group-credentials .group-creds-header {
        padding: 4px 16px 12px;
      }

      #modal-group-credentials .group-creds-header .close-modal-btn {
        min-width: 44px;
        min-height: 44px;
        width: 44px;
        height: 44px;
      }

      .group-creds-body {
        padding: 14px 16px 16px;
      }

      .group-creds-footer {
        padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 8px;
      }

      .group-creds-footer .btn {
        min-height: 44px;
        height: 44px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .superadmin-email-del {
        transition: none;
      }
    }
  }
</style>
