<script lang="ts">
  import { getIsSuperAdmin } from 'finkas/core/state';
  import { showToast } from 'finkas/core/utils';
  import { closeModal, switchTab } from '../../ui/modal';
  import { copyGroupWhatsAppAction } from '../../handlers/groups';

  const onClose = (id: string) => (e: MouseEvent) => { e.stopPropagation(); closeModal(id); };
  const onSwitchTab = (tab: string) => (e: MouseEvent) => {
    e.stopPropagation();
    switchTab(tab, 'modal-group-admin');
  };
  const onCopyCredWa = (e: MouseEvent) => {
    e.stopPropagation();
    if (!getIsSuperAdmin()) {
      showToast('Hanya Super Admin yang dapat menyalin kredensial grup.', 'error');
      return;
    }
    copyGroupWhatsAppAction(e.currentTarget as HTMLElement);
  };
</script>

<!-- 0c. Modal Kelola Grup: khusus admin pemilik (Hybrid Kinetic 2-Tab Sheet) -->
  <dialog class="modal-overlay hybrid-dialog" id="modal-group-admin" aria-labelledby="modal-group-admin-title">
    <div class="modal-content modal-md modal-data-dialog group-admin-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header group-admin-sheet-header">
        <div class="group-admin-header-main">
          <div class="group-admin-header-emblem" aria-hidden="true">
            <i class="ph-fill ph-users-three"></i>
          </div>
          <div class="group-admin-header-copy">
            <div class="group-admin-title-row">
              <h2 id="modal-group-admin-title">Kelola Grup</h2>
              <span class="group-admin-super-badge"><i class="ph-fill ph-crown" aria-hidden="true"></i> SUPERADMIN</span>
            </div>
            <p>Atur ruang kas, akun pengurus, dan akses pemilik superadmin</p>
          </div>
        </div>
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup" onclick={onClose('modal-group-admin')}>
          <i class="ph-bold ph-x" aria-hidden="true"></i>
        </button>
      </div>

      <div class="group-admin-tabs-bar">
        <div class="tab-header group-admin-tab-track" role="tablist" aria-label="Kategori Kelola Grup">
          <div class="group-admin-glider-pill" aria-hidden="true"></div>
          <button type="button" class="tab-btn active" id="btn-group-tab-list" role="tab" aria-selected="true" aria-controls="tab-group-list" data-action="switch-tab" data-tab="tab-group-list" onclick={onSwitchTab('tab-group-list')}>
            <i class="ph ph-folders" aria-hidden="true"></i><span>Ruang Kas</span><span class="group-tab-count" id="group-admin-count">0</span>
          </button>
          <button type="button" class="tab-btn" id="btn-group-tab-superadmin" role="tab" aria-selected="false" aria-controls="tab-group-superadmin" data-action="switch-tab" data-tab="tab-group-superadmin" onclick={onSwitchTab('tab-group-superadmin')}>
            <i class="ph ph-shield-check" aria-hidden="true"></i><span>Super Admin</span><span class="group-tab-count" id="superadmin-count">0</span>
          </button>
        </div>
      </div>

      <div class="group-admin-sheet-body">
        <!-- Tab 1: Ruang Kas -->
        <div id="tab-group-list" class="tab-content active" role="tabpanel" aria-labelledby="btn-group-tab-list">
          <div class="group-admin-create-box">
            <div class="group-section-header">
              <i class="ph-bold ph-plus-circle" aria-hidden="true"></i>
              <span>Tambah Ruang Kas Baru</span>
            </div>
            <form id="form-create-group">
              <div class="group-create-grid">
                <div class="input-with-icon group-create-name-field">
                  <i class="ph ph-users group-input-icon" aria-hidden="true"></i>
                  <input type="text" id="input-group-nama" name="group-nama" class="form-control group-form-input" placeholder="Nama kelas / grup baru..." maxlength="60" required autocomplete="off" aria-label="Nama kelas atau grup baru">
                </div>
                <div class="input-with-icon group-create-pin-field">
                  <i class="ph ph-lock-key group-input-icon" aria-hidden="true"></i>
                  <input type="password" id="input-group-pin" name="group-pin" class="form-control group-form-input group-pin-input" inputmode="numeric" maxlength="4" placeholder="PIN 4 digit" required autocomplete="off" aria-label="PIN 4 digit">
                </div>
                <button type="submit" class="btn btn-primary btn-create-submit">
                  <i class="ph-bold ph-plus" aria-hidden="true"></i>
                  <span>Buat</span>
                </button>
              </div>

              <div class="group-admin-opt-wrap">
                <label class="group-admin-opt-label" for="chk-group-admin-auto">
                  <input type="checkbox" id="chk-group-admin-auto" name="chk-group-admin-auto" checked>
                  <span>Buat akun Admin Grup langsung (Email &amp; Password)</span>
                </label>
                <div id="box-group-admin-creds" class="group-admin-creds-row">
                  <div class="input-with-icon group-cred-email-field">
                    <i class="ph ph-envelope group-input-icon" aria-hidden="true"></i>
                    <input type="email" id="input-group-admin-email" name="group-admin-email" class="form-control group-form-input" placeholder="admin.nama@finkas.id" autocomplete="off" aria-label="Email admin grup">
                  </div>
                  <div class="input-with-icon group-cred-pwd-field">
                    <i class="ph ph-key group-input-icon" aria-hidden="true"></i>
                    <input type="text" id="input-group-admin-pwd" name="group-admin-pwd" class="form-control group-form-input group-mono-input" placeholder="Password acak..." autocomplete="off" aria-label="Password admin grup">
                  </div>
                  <button type="button" class="btn btn-outline btn-refresh-pwd" id="btn-refresh-admin-pwd" title="Acak ulang password" aria-label="Acak ulang password">
                    <i class="ph-bold ph-arrows-clockwise" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div class="group-admin-list-toolbar">
            <div class="search-wrapper group-admin-search-box">
              <i class="ph ph-magnifying-glass search-icon" aria-hidden="true"></i>
              <input type="search" id="search-group-admin" name="search-group-admin" class="form-control" placeholder="Cari nama atau ID grup..." aria-label="Cari grup terdaftar" autocomplete="off" spellcheck="false">
            </div>
            <span class="group-list-meta-pill" id="group-admin-filter-meta">Memuat...</span>
          </div>

          <div id="group-admin-list" class="group-admin-list" role="list"></div>
        </div>

        <!-- Tab 2: Super Admin Whitelist -->
        <div id="tab-group-superadmin" class="tab-content" role="tabpanel" aria-labelledby="btn-group-tab-superadmin">
          <div class="group-superadmin-info">
            <i class="ph-fill ph-shield-check" aria-hidden="true"></i>
            <p class="group-superadmin-note">Hanya email Google terdaftar yang dapat masuk melalui tautan rahasia pemilik.</p>
          </div>

          <div class="group-superadmin-card">
            <div class="group-section-header">
              <i class="ph-bold ph-user-plus" aria-hidden="true"></i>
              <span class="group-superadmin-title">Tambah Email Super Admin (Google Login)</span>
            </div>
            <form id="form-add-superadmin" class="superadmin-add-form">
              <div class="input-with-icon superadmin-email-field">
                <i class="ph ph-envelope-simple group-input-icon" aria-hidden="true"></i>
                <input type="email" id="input-add-superadmin" name="add-superadmin-email" class="form-control group-form-input superadmin-email-input" placeholder="email.google@gmail.com" required autocomplete="off" aria-label="Email super admin baru">
              </div>
              <button type="submit" class="btn btn-primary superadmin-add-btn">
                <i class="ph-bold ph-plus" aria-hidden="true"></i>
                <span>Tambah</span>
              </button>
            </form>
          </div>

          <div class="group-superadmin-list-wrap">
            <div class="superadmin-list-header">
              <span class="group-section-title">Daftar Email Terdaftar</span>
            </div>
            <div id="superadmin-emails-list" class="superadmin-emails-list" role="list"></div>
          </div>
        </div>
      </div>

      <div class="hybrid-settings-footer group-admin-sheet-footer">
        <span class="group-admin-footer-hint"><i class="ph-fill ph-lock-key" aria-hidden="true"></i> Data tiap grup terisolasi aman · Hapus grup butuh konfirmasi nama</span>
        <button type="button" class="btn btn-secondary" data-action="close-modal" onclick={onClose('modal-group-admin')}>Tutup</button>
      </div>
    </div>
  </dialog>

  <!-- 0d. Modal Kartu Kredensial Grup (Siap Kirim WhatsApp) -->
  <dialog class="modal-overlay hybrid-dialog" id="modal-group-credentials" aria-labelledby="modal-cred-title">
    <div class="modal-content modal-sm group-creds-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header group-creds-header">
        <div class="group-creds-header-main">
          <div class="group-creds-emblem" aria-hidden="true">
            <i class="ph-fill ph-check-circle"></i>
          </div>
          <div class="group-creds-copy">
            <h2 id="modal-cred-title">Kredensial Grup</h2>
            <p id="cred-modal-subtitle">Akun siap dibagikan ke pengurus</p>
          </div>
        </div>
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup" onclick={onClose('modal-group-credentials')}>
          <i class="ph-bold ph-x" aria-hidden="true"></i>
        </button>
      </div>

      <div class="group-creds-body">
        <div class="cred-card-box">
          <div class="cred-card-row">
            <span class="cred-row-label"><i class="ph ph-folders" aria-hidden="true"></i><span>Grup</span></span>
            <strong class="cred-row-val" id="cred-disp-nama">-</strong>
          </div>
          <div class="cred-card-row">
            <span class="cred-row-label"><i class="ph ph-lock-key" aria-hidden="true"></i><span>PIN Warga</span></span>
            <code class="cred-code" id="cred-disp-pin">-</code>
          </div>
          <div class="cred-card-row">
            <span class="cred-row-label"><i class="ph ph-envelope" aria-hidden="true"></i><span>Email Admin</span></span>
            <span class="cred-email" id="cred-disp-email">-</span>
          </div>
          <div class="cred-card-row">
            <span class="cred-row-label"><i class="ph ph-key" aria-hidden="true"></i><span>Password Admin</span></span>
            <code class="cred-code" id="cred-disp-pwd">-</code>
          </div>
        </div>

        <p class="cred-share-tip">
          <i class="ph ph-shield-check" aria-hidden="true"></i>
          <span>Simpan atau bagikan kredensial ini secara aman melalui WhatsApp.</span>
        </p>
      </div>

      <div class="hybrid-settings-footer group-creds-footer">
        <button type="button" class="btn btn-secondary cred-close-btn" data-action="close-modal" onclick={onClose('modal-group-credentials')}>Tutup</button>
        <button type="button" class="btn btn-primary cred-wa-btn" id="btn-copy-cred-wa" data-action="copy-cred-wa" onclick={onCopyCredWa}>
          <i class="ph-bold ph-whatsapp-logo cred-wa-icon" aria-hidden="true"></i>
          <span>Salin Format WhatsApp</span>
        </button>
      </div>
    </div>
  </dialog>

  <!-- 0e. Modal Edit Kredensial Admin Grup (Super Admin) -->
  <dialog class="modal-overlay hybrid-dialog" id="modal-group-cred-edit" aria-labelledby="modal-cred-edit-title">
    <div class="modal-content modal-sm">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="modal-header-standard">
        <div class="modal-header-left">
          <div class="modal-badge-icon"><i class="ph-fill ph-key" aria-hidden="true"></i></div>
          <div class="modal-title-wrap">
            <h2 id="modal-cred-edit-title">Atur Akun Admin Grup</h2>
            <p id="cred-edit-group-label">-</p>
          </div>
        </div>
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup" onclick={onClose('modal-group-cred-edit')}>
          <i class="ph-bold ph-x" aria-hidden="true"></i>
        </button>
      </div>
      <form id="form-edit-group-creds">
        <input type="hidden" id="edit-group-cred-id" name="edit-group-cred-id">
        <div class="form-group">
          <label for="edit-group-cred-email">Email Admin</label>
          <input type="email" id="edit-group-cred-email" name="edit-group-cred-email" class="form-control" required autocomplete="off">
        </div>
        <div class="form-group">
          <label for="edit-group-cred-pwd">Password Admin Baru</label>
          <input type="password" id="edit-group-cred-pwd" name="edit-group-cred-pwd" class="form-control" minlength="6" placeholder="Minimal 6 karakter..." required autocomplete="new-password">
        </div>
        <div class="modal-footer-actions">
          <button type="button" class="btn btn-secondary" data-action="close-modal" onclick={onClose('modal-group-cred-edit')}>Batal</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-edit-group-creds">Simpan Kredensial</button>
        </div>
      </form>
    </div>
  </dialog>

<style>
  :global {
    /* === HYBRID KINETIC GROUP ADMIN SHEET (#modal-group-admin) === */

    #modal-group-admin:modal,
    #modal-group-admin::backdrop { overscroll-behavior: contain; }
    #modal-group-admin::backdrop { overflow: hidden; }

    #modal-group-admin .group-admin-sheet {
      width: min(680px, calc(100vw - 28px)); max-width: 100%; max-height: min(92dvh, 760px); padding: 0;
      border-radius: 20px; border: 1px solid var(--border); background: var(--surface);
      box-shadow: var(--shadow-pop); display: flex; flex-direction: column; overflow: hidden; gap: 0;
    }

    #modal-group-admin .group-admin-sheet-header {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
      padding: 16px 20px 14px; border-radius: 20px 20px 0 0; border-bottom: 1px solid var(--border); flex-shrink: 0;
      background: radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 58%), var(--surface);
    }
    .group-admin-header-main { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .group-admin-header-emblem {
      width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 12px;
      background: var(--accent-tint); border: 1px solid var(--accent-border); color: var(--accent-strong);
      display: grid; place-items: center; font-size: 19px; flex-shrink: 0;
    }
    .group-admin-header-copy { min-width: 0; }
    .group-admin-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    #modal-group-admin .group-admin-header-copy h2 {
      font-family: var(--font-display); font-size: 1.0625rem; font-weight: 800;
      letter-spacing: -0.02em; line-height: 1.25; color: var(--text-main); margin: 0;
    }
    .group-admin-super-badge {
      display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: var(--r-pill);
      font-size: 11px; font-weight: 700; letter-spacing: 0.05em; line-height: 1.3; flex-shrink: 0;
      background: var(--warning-bg); border: 1px solid var(--warning-border); color: var(--warning);
    }
    #modal-group-admin .group-admin-header-copy p {
      margin: 2px 0 0; font-size: 0.78125rem; font-weight: 500; color: var(--text-muted); line-height: 1.4;
    }
    #modal-group-admin .group-admin-sheet-header .close-modal-btn {
      min-width: 34px; min-height: 34px; width: 34px; height: 34px; border-radius: 10px; margin-top: 1px;
    }

    /* 2-Tab Segmented Glider Bar */
    .group-admin-tabs-bar { padding: 12px 20px 0; flex-shrink: 0; }
    .group-admin-tab-track {
      position: relative; isolation: isolate; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0; padding: 3px; margin: 0; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-pill);
    }
    .group-admin-glider-pill {
      position: absolute; z-index: -1; inset: 3px auto 3px 3px; width: calc((100% - 6px) / 2);
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-pill);
      box-shadow: var(--hybrid-card-shadow); translate: 0 0;
      transition: translate 280ms var(--hybrid-ease-spring); pointer-events: none;
    }
    .group-admin-tab-track:has([data-tab="tab-group-superadmin"].active) .group-admin-glider-pill { translate: 100% 0; }

    .group-admin-tab-track .tab-btn {
      background: transparent; border: 0; box-shadow: none; min-height: 34px; padding: 5px 10px;
      font-size: 12.5px; font-weight: 700; color: var(--text-muted); border-radius: var(--r-pill);
      display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; cursor: pointer;
    }
    .group-admin-tab-track .tab-btn.active { background: transparent; border-color: transparent; box-shadow: none; color: var(--text-main); }
    .group-admin-tab-track .tab-btn:hover:not(.active) { background: transparent; color: var(--text-main); }
    .group-admin-tab-track .tab-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
    .group-tab-count {
      font-family: var(--font-mono); font-size: 11px; font-weight: 700; line-height: 1;
      padding: 2px 6px; border-radius: var(--r-pill); background: var(--surface);
      border: 1px solid var(--border); color: var(--text-muted); font-variant-numeric: tabular-nums;
    }
    .group-admin-tab-track .tab-btn.active .group-tab-count {
      background: var(--accent-tint); border-color: var(--accent-border); color: var(--accent-strong);
    }

    /* Body & Tab Panels */
    #modal-group-admin .group-admin-sheet-body {
      padding: 14px 20px 18px; display: flex; flex-direction: column; gap: 12px;
      flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable;
    }
    #modal-group-admin .tab-content:not(.active) { display: none; }
    #modal-group-admin .tab-content.active { display: flex; flex-direction: column; gap: 12px; }

    /* Create Group Card */
    .group-admin-create-box {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px;
    }
    .group-section-header {
      display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 10px;
    }
    .group-section-header i { font-size: 14px; color: var(--accent-strong); }

    .group-create-grid {
      display: grid; grid-template-columns: minmax(0, 1fr) 144px auto; gap: 8px; align-items: center;
    }
    .input-with-icon { position: relative; display: flex; align-items: center; min-width: 0; }
    .group-input-icon {
      position: absolute; left: 12px; color: var(--text-faint); font-size: 15px; pointer-events: none;
    }
    #modal-group-admin .group-form-input {
      width: 100%; height: 40px; min-height: 40px; padding: 0 12px 0 36px; font-size: 13px; font-weight: 500;
      border-radius: 10px; background: var(--surface); border: 1px solid var(--border); color: var(--text-main);
    }
    #modal-group-admin .group-form-input:focus {
      border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-tint);
    }
    #modal-group-admin .group-pin-input { font-family: var(--font-mono); font-variant-numeric: tabular-nums; letter-spacing: 0.08em; }
    #modal-group-admin .group-pin-input::placeholder { font-family: var(--font-sans); letter-spacing: normal; }
    #modal-group-admin .group-mono-input { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 12.5px; }

    .btn-create-submit {
      height: 40px; min-height: 40px; padding: 0 16px; border-radius: 10px; font-weight: 700; font-size: 13px;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; flex-shrink: 0;
    }

    .group-admin-opt-wrap { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border); }
    .group-admin-opt-label {
      display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
      font-size: 12.5px; font-weight: 600; color: var(--text-main);
    }
    .group-admin-creds-row {
      display: grid; grid-template-columns: minmax(0, 1fr) 168px 40px; gap: 8px; margin-top: 9px; align-items: center;
    }
    #box-group-admin-creds[hidden] { display: none; }
    #modal-group-admin .btn-refresh-pwd {
      width: 40px; height: 40px; min-width: 40px; min-height: 40px; padding: 0;
      border-radius: 10px; background: var(--surface); display: inline-grid; place-items: center;
    }

    /* Search & Group List Toolbar */
    .group-admin-list-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .group-admin-search-box { flex: 1 1 220px; min-width: 0; margin-bottom: 0; }
    .group-admin-search-box .search-icon { left: 11px; font-size: 15px; }
    #modal-group-admin .group-admin-search-box .form-control {
      width: 100%; height: 36px; min-height: 36px; padding: 5px 10px 5px 34px; font-size: 12.5px;
      border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-main);
    }
    #modal-group-admin .group-admin-search-box .form-control:focus {
      background: var(--surface); border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-tint);
    }
    .group-list-meta-pill {
      font-family: var(--font-mono); font-size: 11px; font-weight: 700; padding: 4px 10px;
      border-radius: var(--r-pill); background: var(--surface-2); border: 1px solid var(--border);
      color: var(--text-muted); white-space: nowrap; flex-shrink: 0; font-variant-numeric: tabular-nums;
    }

    /* Registered Group Cards */
    .group-admin-list { display: grid; gap: 9px; }
    .group-card-item {
      display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px;
      background: var(--surface-2); border: 1.5px solid var(--border); border-radius: 14px;
      transition: border-color 160ms ease, background-color 160ms ease;
    }
    .group-card-item:hover { background: var(--surface); border-color: var(--border-strong); }
    .group-card-item.is-active { background: var(--accent-tint); border-color: var(--accent); }
    .group-card-main { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
    .group-card-avatar {
      width: 40px; height: 40px; border-radius: 11px; background: var(--surface); color: var(--accent-strong);
      border: 1px solid var(--border); display: grid; place-items: center;
      font-family: var(--font-display); font-weight: 800; font-size: 15px; flex-shrink: 0;
    }
    .group-card-item.is-active .group-card-avatar {
      background: var(--accent); border-color: var(--accent); color: var(--accent-ink);
    }
    .group-card-details { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
    .group-card-title-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; min-width: 0; }
    .group-card-title {
      font-size: 13.5px; font-weight: 700; color: var(--text-main); margin: 0;
      line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .group-badge-active {
      display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: var(--r-pill);
      background: var(--surface); color: var(--accent-strong); border: 1px solid var(--accent-border);
      font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
    }
    .group-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
    .group-card-id-pill {
      font-family: var(--font-mono); font-size: 11px; font-variant-numeric: tabular-nums; color: var(--text-muted);
      display: inline-flex; align-items: center; gap: 3px;
    }

    .group-card-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .btn-group-chip {
      display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      min-height: 32px; height: 32px; padding: 0 10px; font-size: 12px; font-weight: 700;
      color: var(--text-main); background: var(--surface); border: 1px solid var(--border);
      border-radius: 9px; cursor: pointer; white-space: nowrap;
      transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease;
    }
    .btn-group-chip:hover { background: var(--surface-3); border-color: var(--border-strong); }
    .btn-group-chip.danger { width: 32px; padding: 0; color: var(--danger); }
    .btn-group-chip.danger:hover { background: var(--danger-bg); border-color: var(--danger-border); }
    .btn-group-chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

    .group-empty-state {
      text-align: center; padding: 28px 16px; color: var(--text-muted);
      background: var(--surface-2); border: 1px dashed var(--border-strong); border-radius: 14px;
    }
    .group-empty-state i { font-size: 26px; margin-bottom: 6px; color: var(--text-faint); display: block; }

    /* Footer */
    .group-admin-sheet-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 12px 20px; border-radius: 0 0 20px 20px; flex-shrink: 0; background: var(--surface-2);
    }
    .group-admin-footer-hint {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 11.5px; font-weight: 500; color: var(--text-muted); min-width: 0;
    }
    .group-admin-footer-hint i { font-size: 14px; color: var(--accent-strong); flex-shrink: 0; }
    .group-admin-sheet-footer .btn { min-height: 38px; height: 38px; padding: 0 16px; border-radius: 10px; font-size: 13px; font-weight: 700; }

    /* === PIN MODAL (#modal-group-pin) & HEADER GROUP CHIP === */
    .pin-action-btn { width: 100%; }
    .pin-action-btn-secondary { margin-top: 8px; }
    .pin-rate-limit-note { font-size: 12px; text-align: center; margin-top: 8px; color: var(--text-muted); }

    .group-name {
      font-size: 13px; font-weight: 600; color: var(--accent-strong); white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis; max-width: 160px; background: none; border: none; cursor: pointer;
      padding: 0; font-family: inherit; line-height: inherit;
    }
    .group-name:hover { text-decoration: underline; text-underline-offset: 3px; }
    .group-name:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
    .group-name:empty { display: none; }

    /* === MOBILE SHEET ADAPTATION (<= 768px) === */
    @media (max-width: 768px) {
      #modal-group-admin.hybrid-dialog .group-admin-sheet {
        width: 100%; max-width: 100%; max-height: 90dvh; border-radius: 20px 20px 0 0;
      }
      #modal-group-admin .group-admin-sheet-header { padding: 4px 16px 12px; border-radius: 0; }
      #modal-group-admin .group-admin-sheet-header .close-modal-btn { min-width: 44px; min-height: 44px; width: 44px; height: 44px; }
      .group-admin-tabs-bar { padding: 10px 14px 0; }
      .group-admin-tab-track .tab-btn { min-height: 40px; font-size: 12px; padding: 4px 8px; }
      #modal-group-admin .group-admin-sheet-body { padding: 12px 14px 16px; }
      .group-admin-create-box { padding: 12px; }
      .group-create-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
      .group-create-name-field, .group-cred-email-field { grid-column: 1 / -1; }
      .group-create-pin-field, .group-cred-pwd-field { grid-column: 1 / 2; }
      .btn-create-submit { grid-column: 2 / 3; width: 100%; min-height: 44px; height: 44px; }
      .group-admin-creds-row { grid-template-columns: minmax(0, 1fr) 44px; gap: 8px; }
      #modal-group-admin .btn-refresh-pwd { grid-column: 2 / 3; width: 44px; height: 44px; min-width: 44px; min-height: 44px; }
      #modal-group-admin .group-form-input { height: 44px; min-height: 44px; font-size: max(1rem, 1em); }
      #modal-group-admin .group-admin-search-box .form-control { height: 42px; min-height: 42px; font-size: max(1rem, 1em); }
      .group-admin-opt-label { min-height: 44px; font-size: 12px; }
      .group-card-item { flex-direction: column; align-items: stretch; gap: 10px; padding: 12px; }
      .group-card-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) 44px; gap: 6px; width: 100%; }
      .btn-group-chip { min-height: 44px; height: 44px; padding: 0 6px; font-size: 11.5px; width: 100%; }
      .btn-group-chip.danger { width: 44px; min-width: 44px; }
      .group-admin-footer-hint { display: none; }
      .group-admin-sheet-footer { padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px)); border-radius: 0; }
      .group-admin-sheet-footer .btn { width: 100%; min-height: 44px; height: 44px; justify-content: center; }
    }

    @media (prefers-reduced-motion: reduce) {
      .group-admin-glider-pill,
      .group-card-item,
      .btn-group-chip { transition: none; }
    }
  }
</style>
