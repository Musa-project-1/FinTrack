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
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup">
          <i class="ph-bold ph-x" aria-hidden="true"></i>
        </button>
      </div>

      <div class="group-admin-tabs-bar">
        <div class="tab-header group-admin-tab-track" role="tablist" aria-label="Kategori Kelola Grup">
          <div class="group-admin-glider-pill" aria-hidden="true"></div>
          <button type="button" class="tab-btn active" id="btn-group-tab-list" role="tab" aria-selected="true" aria-controls="tab-group-list" data-action="switch-tab" data-tab="tab-group-list">
            <i class="ph ph-folders" aria-hidden="true"></i><span>Ruang Kas</span><span class="group-tab-count" id="group-admin-count">0</span>
          </button>
          <button type="button" class="tab-btn" id="btn-group-tab-superadmin" role="tab" aria-selected="false" aria-controls="tab-group-superadmin" data-action="switch-tab" data-tab="tab-group-superadmin">
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
        <button type="button" class="btn btn-secondary" data-action="close-modal">Tutup</button>
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
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup">
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
            <code class="cred-code" id="cred-disp-pin">1234</code>
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
        <button type="button" class="btn btn-secondary cred-close-btn" data-action="close-modal">Tutup</button>
        <button type="button" class="btn btn-primary cred-wa-btn" id="btn-copy-cred-wa" data-action="copy-cred-wa">
          <i class="ph-bold ph-whatsapp-logo cred-wa-icon" aria-hidden="true"></i>
          <span>Salin Format WhatsApp</span>
        </button>
      </div>
    </div>
  </dialog>
