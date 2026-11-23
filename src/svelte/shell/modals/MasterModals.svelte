<!-- 3. Modal Log Aktivitas / Audit Log (Super Admin Only · Hybrid Kinetic) -->
  <dialog class="modal-overlay hybrid-dialog" id="modal-audit-log" aria-labelledby="modal-audit-log-title">
    <div class="modal-content modal-md modal-data-dialog audit-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header audit-sheet-header">
        <div class="audit-header-main">
          <div class="audit-header-emblem" aria-hidden="true">
            <i class="ph-fill ph-shield-check"></i>
          </div>
          <div class="audit-header-copy">
            <div class="audit-title-row">
              <h2 id="modal-audit-log-title">Log Aktivitas Admin</h2>
              <span class="audit-super-badge"><i class="ph-fill ph-crown" aria-hidden="true"></i> SUPERADMIN</span>
            </div>
            <p class="audit-subtitle">Jejak audit dan rekaman histori aksi pengurus kas</p>
          </div>
        </div>
        <div class="audit-header-actions">
          <button type="button" id="btn-refresh-audit-log" class="btn btn-outline btn-secondary audit-refresh-btn" data-action="refresh-audit-log" aria-label="Refresh">
            <i class="ph ph-arrow-clockwise" aria-hidden="true"></i> <span>Refresh</span>
          </button>
          <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup">
            <i class="ph ph-x" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div class="audit-sheet-body">
        <div class="audit-toolbar">
          <div class="audit-toolbar-top">
            <div class="search-wrapper audit-search-box">
              <i class="ph ph-magnifying-glass search-icon" aria-hidden="true"></i>
              <input type="search" id="search-audit-log" class="form-control" placeholder="Cari aksi atau detail aktivitas..." autocomplete="off">
            </div>
            <span id="audit-log-count" class="audit-count-pill">0 entri</span>
          </div>
          <div class="audit-filter-chips" id="audit-filter-chips" role="tablist" aria-label="Filter kategori aktivitas">
            <button type="button" class="audit-chip active" data-audit-cat="all" role="tab" aria-selected="true">Semua</button>
            <button type="button" class="audit-chip" data-audit-cat="transaksi" role="tab" aria-selected="false">Transaksi</button>
            <button type="button" class="audit-chip" data-audit-cat="master" role="tab" aria-selected="false">Data Master</button>
            <button type="button" class="audit-chip" data-audit-cat="akses" role="tab" aria-selected="false">Keamanan &amp; Akses</button>
            <button type="button" class="audit-chip" data-audit-cat="grup" role="tab" aria-selected="false">Grup &amp; Backup</button>
          </div>
        </div>

        <div class="audit-ledger-wrapper">
          <table class="audit-ledger-table m-0">
            <thead class="sticky-thead">
              <tr>
                <th class="audit-th-waktu">Waktu</th>
                <th class="audit-th-aksi">Aksi</th>
                <th class="audit-th-detail">Detail</th>
              </tr>
            </thead>
            <tbody id="audit-log-tbody">
              <tr><td colspan="3" class="td-muted-center">Memuat...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="hybrid-settings-footer audit-sheet-footer">
        <span class="audit-footer-hint"><i class="ph-fill ph-lock-key" aria-hidden="true"></i> Menampilkan maksimal 100 aktivitas terbaru · Akses eksklusif Super Admin</span>
        <button type="button" class="btn btn-secondary" data-action="close-modal">Tutup</button>
      </div>
    </div>
  </dialog>

  <!-- 5. Modal Kelola Data Master (Hybrid Kinetic 4-Tab Sheet) -->
  <dialog class="modal-overlay hybrid-dialog" id="modal-kelola-master" aria-labelledby="modal-kelola-master-title">
    <div class="modal-content modal-md modal-data-dialog master-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header master-sheet-header">
        <div class="master-header-main">
          <div class="master-header-emblem" aria-hidden="true">
            <i class="ph-fill ph-sliders"></i>
          </div>
          <div class="master-header-copy">
            <h2 id="modal-kelola-master-title">Data Master</h2>
            <p>Pengaturan anggota, pos kategori, bulan libur, dan rekening kas</p>
          </div>
        </div>
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup"><i class="ph-bold ph-x" aria-hidden="true"></i></button>
      </div>

      <div class="master-tabs-bar">
        <div class="tab-header master-tab-track" role="tablist" aria-label="Kategori Data Master">
          <div class="master-glider-pill" aria-hidden="true"></div>
          <button type="button" class="tab-btn active" id="btn-master-tab-anggota" role="tab" aria-selected="true" aria-controls="tab-master-anggota" data-action="switch-tab" data-tab="tab-master-anggota">
            <i class="ph ph-users" aria-hidden="true"></i><span>Anggota</span><span class="master-tab-count" id="master-count-anggota">0</span>
          </button>
          <button type="button" class="tab-btn" id="btn-master-tab-kategori" role="tab" aria-selected="false" aria-controls="tab-master-kategori" data-action="switch-tab" data-tab="tab-master-kategori">
            <i class="ph ph-tag" aria-hidden="true"></i><span>Kategori</span><span class="master-tab-count" id="master-count-kategori">0</span>
          </button>
          <button type="button" class="tab-btn" id="btn-master-tab-skipped" role="tab" aria-selected="false" aria-controls="tab-master-skipped" data-action="switch-tab" data-tab="tab-master-skipped">
            <i class="ph ph-calendar-x" aria-hidden="true"></i><span>Bulan Libur</span><span class="master-tab-count" id="master-count-skipped">0</span>
          </button>
          <button type="button" class="tab-btn" id="btn-master-tab-payment" role="tab" aria-selected="false" aria-controls="tab-master-payment" data-action="switch-tab" data-tab="tab-master-payment">
            <i class="ph ph-bank" aria-hidden="true"></i><span>Rekening</span>
          </button>
        </div>
      </div>

      <div class="master-sheet-body">
        <!-- Tab 1: Anggota -->
        <div id="tab-master-anggota" class="tab-content active" role="tabpanel" aria-labelledby="btn-master-tab-anggota">
          <div class="master-form-card master-add-card">
            <form id="form-tambah-anggota" class="master-form-row">
              <input type="text" id="input-nama-anggota" name="input-nama-anggota" class="form-control flex-1 min-w-200" placeholder="Nama Anggota Baru..." required aria-label="Nama Anggota Baru" autocomplete="off">
              <input type="text" id="input-wa-anggota" name="input-wa-anggota" class="form-control w-180" placeholder="No. WA (Opsional)..." aria-label="No. WhatsApp Anggota" inputmode="tel" autocomplete="off">
              <button type="submit" class="btn btn-primary"><i class="ph-bold ph-user-plus" aria-hidden="true"></i><span>Tambah</span></button>
            </form>
          </div>
          <div class="master-list-toolbar">
            <div class="search-wrapper master-search-box">
              <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
              <input type="search" id="search-master-anggota" name="search-master-anggota" class="form-control" placeholder="Cari anggota..." aria-label="Cari anggota" autocomplete="off" spellcheck="false">
            </div>
            <span class="master-stats-pill" id="master-anggota-stats">0 aktif</span>
          </div>
          <div class="table-responsive master-table-wrapper">
            <table class="m-0 table-master table-master-anggota" id="table-master-anggota">
              <thead>
                <tr>
                  <th>Anggota</th>
                  <th>No. WhatsApp</th>
                  <th class="w-110 text-center">Status</th>
                  <th class="w-100 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody id="master-anggota-tbody">
                <tr><td colspan="4" class="td-muted-center">Memuat data anggota...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab 2: Kategori -->
        <div id="tab-master-kategori" class="tab-content" role="tabpanel" aria-labelledby="btn-master-tab-kategori">
          <div class="master-form-card master-add-card">
            <form id="form-tambah-kategori" class="master-form-row master-add-form">
              <label for="input-tipe-kategori" class="sr-only">Tipe Kategori Kas</label>
              <select id="input-tipe-kategori" name="input-tipe-kategori" class="form-control w-140 cdrop" required aria-label="Tipe Kategori Kas">
                <option value="Masuk">Kas Masuk</option>
                <option value="Keluar">Kas Keluar</option>
              </select>
              <input type="text" id="input-nama-kategori" name="input-nama-kategori" class="form-control flex-1 min-w-200" placeholder="Nama Kategori Baru..." required aria-label="Nama Kategori Baru" autocomplete="off">
              <button type="submit" class="btn btn-primary"><i class="ph-bold ph-plus" aria-hidden="true"></i><span>Tambah</span></button>
            </form>
          </div>
          <div class="table-responsive master-table-wrapper">
            <table class="m-0 table-master table-master-kategori" id="table-master-kategori">
              <thead>
                <tr>
                  <th>Nama Kategori</th>
                  <th class="w-120 text-center">Tipe Arus</th>
                  <th class="w-100 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody id="master-kategori-tbody">
                <tr><td colspan="3" class="td-muted-center">Memuat data kategori...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab 3: Bulan Libur -->
        <div id="tab-master-skipped" class="tab-content" role="tabpanel" aria-labelledby="btn-master-tab-skipped">
          <div class="master-period-grid">
            <div class="master-form-card master-period-card skip-month-body">
              <div class="master-period-head">
                <i class="ph-fill ph-calendar-check" aria-hidden="true"></i>
                <h3>Awal Mulai Kas</h3>
              </div>
              <p class="master-skip-hint">Awal mulai kas menandai bulan pertama grup menarik iuran. Bulan sebelumnya tidak dihitung sebagai tunggakan.</p>
              <div class="skip-month-input-row">
                <input type="month" id="input-kas-start" name="input-kas-start" class="form-control flex-1 mpick" data-placeholder="Pilih awal mulai kas..." aria-label="Pilih Awal Mulai Kas" />
                <button type="button" class="btn btn-primary admin-only" data-action="save-kas-start"><i class="ph-bold ph-calendar-check" aria-hidden="true"></i><span>Simpan</span></button>
              </div>
            </div>
            <div class="master-form-card master-period-card skip-month-body">
              <div class="master-period-head">
                <i class="ph-fill ph-calendar-x" aria-hidden="true"></i>
                <h3>Tambah Bulan Libur</h3>
              </div>
              <p class="master-skip-hint">Bulan yang ditandai sebagai bulan libur akan dibebaskan dari kewajiban iuran seluruh anggota.</p>
              <div class="skip-month-input-row">
                <input type="month" id="input-skip-month" name="input-skip-month" class="form-control flex-1 mpick" data-placeholder="Pilih bulan libur..." aria-label="Pilih Bulan Libur" />
                <button type="button" class="btn btn-primary admin-only" data-action="add-skip"><i class="ph-bold ph-plus" aria-hidden="true"></i><span>Tambah</span></button>
              </div>
            </div>
          </div>
          <div class="master-table-wrapper master-skipped-card-panel">
            <div class="master-section-label">Daftar Bulan Libur</div>
            <div id="skipped-months-list" class="skipped-months-container" aria-live="polite" aria-atomic="false">
              <div class="text-muted">Memuat data bulan libur...</div>
            </div>
          </div>
        </div>

        <!-- Tab 4: Rekening Kas -->
        <div id="tab-master-payment" class="tab-content" role="tabpanel" aria-labelledby="btn-master-tab-payment">
          <form id="form-payment-account" class="master-form-card payment-account-form admin-only">
            <div class="master-pay-head">
              <span class="master-pay-icon" aria-hidden="true"><i class="ph-fill ph-bank"></i></span>
              <div>
                <h3>Rekening Kas Grup</h3>
                <p>Ditampilkan ke anggota pada panduan pembayaran mandiri</p>
              </div>
            </div>
            <div class="master-pay-grid">
              <label>Nama bank<input name="bank" class="form-control" maxlength="60" autocomplete="off"></label>
              <label>Nomor rekening<input name="number" class="form-control" inputmode="numeric" maxlength="34" autocomplete="off"></label>
              <label>Atas nama<input name="holder" class="form-control" maxlength="80" autocomplete="off"></label>
              <label>WhatsApp bendahara<input name="whatsapp" class="form-control" type="tel" maxlength="20" autocomplete="off"></label>
            </div>
            <div class="master-pay-actions">
              <span class="master-pay-note">Simpan perubahan agar langsung muncul di panduan transfer anggota.</span>
              <button type="submit" class="btn btn-primary"><i class="ph-bold ph-floppy-disk" aria-hidden="true"></i><span>Simpan Rekening</span></button>
            </div>
          </form>
        </div>
      </div>

      <div class="hybrid-settings-footer master-sheet-footer">
        <span class="master-footer-hint">Perubahan tersimpan langsung ke tampilan aktif.</span>
        <button type="button" class="btn btn-secondary" data-action="close-modal">Selesai</button>
      </div>
    </div>
  </dialog>

  <!-- 5b. Modal Edit Anggota -->
  <dialog class="modal-overlay hybrid-dialog" id="modal-edit-master-anggota" aria-labelledby="modal-edit-anggota-title">
    <div class="modal-content modal-sm edit-member-dialog master-edit-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header master-sheet-header">
        <div class="master-header-main">
          <div class="master-header-emblem" aria-hidden="true">
            <i class="ph-fill ph-user-gear"></i>
          </div>
          <div class="master-header-copy">
            <h2 id="modal-edit-anggota-title">Edit Data Anggota</h2>
            <p>Perbarui identitas, nomor WhatsApp, dan status keanggotaan</p>
          </div>
        </div>
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup"><i class="ph-bold ph-x" aria-hidden="true"></i></button>
      </div>

      <form id="form-edit-master-anggota" class="master-edit-form">
        <input type="hidden" id="edit-master-anggota-id">
        <div class="master-sheet-body">
          <div class="edit-member-meta-bar">
            <div class="master-edit-identity">
              <span class="master-avatar is-lg" id="edit-master-anggota-avatar" aria-hidden="true">?</span>
              <span class="master-id-pill" id="edit-master-anggota-id-badge">ANG-0000</span>
            </div>
            <div class="flex-align-gap">
              <a id="edit-master-anggota-wa-link" href="#" target="_blank" rel="noopener" class="btn btn-outline btn-sm master-wa-btn">
                <i class="ph-fill ph-whatsapp-logo" aria-hidden="true"></i><span>Chat WA</span>
              </a>
              <button type="button" class="btn btn-outline btn-sm" id="btn-modal-view-profil" data-action="view-profil-from-modal">
                <i class="ph-bold ph-clock-counter-clockwise" aria-hidden="true"></i><span>Riwayat Setoran</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="edit-master-nama-input">Nama Anggota</label>
            <input type="text" id="edit-master-nama-input" name="edit-master-nama-input" class="form-control" required placeholder="Nama lengkap anggota...">
          </div>

          <div class="form-row master-edit-split">
            <div class="form-group">
              <label for="edit-master-wa-input">Nomor WhatsApp</label>
              <input type="text" id="edit-master-wa-input" name="edit-master-wa-input" class="form-control" placeholder="08xxxxxxxxxx" inputmode="tel">
            </div>
            <div class="form-group">
              <label for="edit-master-status-select">Status Keanggotaan</label>
              <select id="edit-master-status-select" name="edit-master-status-select" class="form-control cdrop" required>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        <div class="hybrid-settings-footer master-sheet-footer">
          <button type="button" class="btn btn-danger-outline" id="btn-modal-hapus-anggota" data-action="hapus-anggota-from-modal">
            <i class="ph-bold ph-trash" aria-hidden="true"></i><span>Hapus</span>
          </button>
          <button type="submit" class="btn btn-primary" id="btn-submit-edit-anggota">Simpan Perubahan</button>
        </div>
      </form>
    </div>
  </dialog>

  <!-- 5c. Modal Edit Kategori -->
  <dialog class="modal-overlay hybrid-dialog" id="modal-edit-master-kategori" aria-labelledby="modal-edit-kategori-title">
    <div class="modal-content modal-sm edit-member-dialog master-edit-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header master-sheet-header">
        <div class="master-header-main">
          <div class="master-header-emblem" aria-hidden="true">
            <i class="ph-fill ph-tag"></i>
          </div>
          <div class="master-header-copy">
            <h2 id="modal-edit-kategori-title">Detail Kategori Kas</h2>
            <p>Informasi pos arus kas dan tindakan penghapusan</p>
          </div>
        </div>
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup"><i class="ph-bold ph-x" aria-hidden="true"></i></button>
      </div>

      <input type="hidden" id="edit-master-kategori-id">
      <div class="master-sheet-body">
        <div class="edit-master-card">
          <div class="edit-master-card-head">
            <div class="master-kat-icon is-lg" id="edit-master-kategori-icon" aria-hidden="true">
              <i class="ph-bold ph-arrows-down-up"></i>
            </div>
            <div class="edit-master-info">
              <span class="master-id-pill" id="edit-master-kategori-id-badge">KAT-000</span>
              <h3 class="edit-master-name" id="edit-master-kategori-nama">Nama Kategori</h3>
            </div>
            <span class="badge" id="edit-master-kategori-tipe-badge">Kas Masuk</span>
          </div>
        </div>
      </div>

      <div class="hybrid-settings-footer master-sheet-footer">
        <button type="button" class="btn btn-danger-outline" id="btn-modal-hapus-kategori" data-action="hapus-kategori-from-modal">
          <i class="ph-bold ph-trash" aria-hidden="true"></i><span>Hapus Kategori</span>
        </button>
        <button type="button" class="btn btn-primary" data-action="close-modal">Selesai</button>
      </div>
    </div>
  </dialog>

  <!-- 6. Modal Transaksi Tertunda / Offline Queue (Hybrid Kinetic) -->
  <dialog class="modal-overlay hybrid-dialog" id="modal-offline-queue" aria-labelledby="modal-offline-queue-title">
    <div class="modal-content modal-sm modal-data-dialog queue-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header queue-sheet-header">
        <div class="queue-header-main">
          <div class="queue-header-emblem" aria-hidden="true">
            <i class="ph-fill ph-cloud-arrow-up"></i>
          </div>
          <div class="queue-header-copy">
            <h2 id="modal-offline-queue-title">Antrean Transaksi Offline</h2>
            <p class="queue-subtitle">Data tersimpan di perangkat lokal, siap disinkronkan ke server</p>
          </div>
        </div>
        <div class="queue-header-actions">
          <button type="button" id="btn-refresh-offline" class="btn btn-outline btn-secondary queue-refresh-btn" data-action="refresh-offline" aria-label="Refresh">
            <i class="ph ph-arrow-clockwise" aria-hidden="true"></i> <span>Refresh</span>
          </button>
          <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup">
            <i class="ph ph-x" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div class="queue-sheet-body">
        <div class="queue-status-bar">
          <span class="queue-conn-status">
            <span id="queue-conn-dot" class="queue-conn-dot is-online" aria-hidden="true"></span>
            <span id="queue-conn-text">Online — siap sinkron</span>
          </span>
          <span id="queue-count-pill" class="queue-count-pill">0 tertunda</span>
        </div>

        <div id="offline-queue-list" class="offline-queue-container" aria-live="polite" aria-atomic="false">
          <div class="td-muted-center">Memuat antrean...</div>
        </div>
      </div>

      <div class="hybrid-settings-footer queue-sheet-footer">
        <button type="button" class="btn btn-secondary" data-action="close-modal">Tutup</button>
        <button type="button" id="btn-sync-offline-now" class="btn btn-primary" data-action="sync-now">
          <i class="ph-bold ph-arrows-clockwise" aria-hidden="true"></i> <span>Sinkron Sekarang</span>
        </button>
      </div>
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
      font-size: 10px; font-weight: 800; letter-spacing: 0.06em; line-height: 1.3; flex-shrink: 0;
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
    .group-tab-count {
      font-family: var(--font-mono); font-size: 10px; font-weight: 700; line-height: 1;
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
    #modal-group-admin .group-pin-input { font-family: var(--font-mono); letter-spacing: 0.08em; }
    #modal-group-admin .group-pin-input::placeholder { font-family: var(--font-sans); letter-spacing: normal; }
    #modal-group-admin .group-mono-input { font-family: var(--font-mono); font-size: 12.5px; }

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
      font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
    }
    .group-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
    .group-card-id-pill {
      font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);
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
    .group-name:empty { display: none; }

    /* === MOBILE SHEET ADAPTATION (<= 768px) === */
    @media (max-width: 768px) {
      #modal-group-admin.hybrid-dialog[open] .group-admin-sheet {
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
