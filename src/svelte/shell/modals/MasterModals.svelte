<script lang="ts">
  import { getInput } from 'finkas/core/utils';
  import { syncOfflineTransactions } from 'finkas/core/offline';
  import { closeModal, switchTab } from '../../ui/modal';
  import {
    addSkippedMonth,
    hapusMasterAnggotaAction,
    hapusMasterKategoriAction,
    renderAuditLogList,
    saveKasStart,
  } from '../../handlers/master';
  import { renderOfflineQueueList } from '../../handlers/offlineQueue';
  import { bukaProfilAnggota } from '../../handlers/profile';

  const onClose = (id: string) => (e: MouseEvent) => { e.stopPropagation(); closeModal(id); };
  const onMasterTab = (tab: string) => (e: MouseEvent) => {
    e.stopPropagation();
    switchTab(tab, 'modal-kelola-master');
  };
  const onRefreshAudit = (e: MouseEvent) => { e.stopPropagation(); renderAuditLogList(); };
  const onSaveKasStart = (e: MouseEvent) => { e.stopPropagation(); saveKasStart(); };
  const onAddSkip = (e: MouseEvent) => { e.stopPropagation(); addSkippedMonth(); };
  const onViewProfil = (e: MouseEvent) => {
    e.stopPropagation();
    const id = getInput('edit-master-anggota-id')?.value || '';
    if (id) {
      closeModal('modal-edit-master-anggota');
      bukaProfilAnggota(id);
    }
  };
  const onHapusAnggota = (e: MouseEvent) => {
    e.stopPropagation();
    const id = getInput('edit-master-anggota-id')?.value || '';
    if (id) {
      closeModal('modal-edit-master-anggota');
      hapusMasterAnggotaAction(id);
    }
  };
  const onHapusKategori = (e: MouseEvent) => {
    e.stopPropagation();
    const id = getInput('edit-master-kategori-id')?.value || '';
    if (id) {
      closeModal('modal-edit-master-kategori');
      hapusMasterKategoriAction(id);
    }
  };
  const onRefreshOffline = (e: MouseEvent) => { e.stopPropagation(); renderOfflineQueueList(); };
  const onSyncOffline = (e: MouseEvent) => {
    e.stopPropagation();
    syncOfflineTransactions(() => {
      window.dispatchEvent(new CustomEvent('finkas:request-refresh'));
      renderOfflineQueueList();
    });
  };
</script>

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
          <button type="button" id="btn-refresh-audit-log" class="btn btn-outline btn-secondary audit-refresh-btn" data-action="refresh-audit-log" aria-label="Refresh" onclick={onRefreshAudit}>
            <i class="ph ph-arrow-clockwise" aria-hidden="true"></i> <span>Refresh</span>
          </button>
          <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup" onclick={onClose('modal-audit-log')}>
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
        <button type="button" class="btn btn-secondary" data-action="close-modal" onclick={onClose('modal-audit-log')}>Tutup</button>
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
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup" onclick={onClose('modal-kelola-master')}><i class="ph-bold ph-x" aria-hidden="true"></i></button>
      </div>

      <div class="master-tabs-bar">
        <div class="tab-header master-tab-track" role="tablist" aria-label="Kategori Data Master">
          <div class="master-glider-pill" aria-hidden="true"></div>
          <button type="button" class="tab-btn active" id="btn-master-tab-anggota" role="tab" aria-selected="true" aria-controls="tab-master-anggota" data-action="switch-tab" data-tab="tab-master-anggota" onclick={onMasterTab('tab-master-anggota')}>
            <i class="ph ph-users" aria-hidden="true"></i><span>Anggota</span><span class="master-tab-count" id="master-count-anggota">0</span>
          </button>
          <button type="button" class="tab-btn" id="btn-master-tab-kategori" role="tab" aria-selected="false" aria-controls="tab-master-kategori" data-action="switch-tab" data-tab="tab-master-kategori" onclick={onMasterTab('tab-master-kategori')}>
            <i class="ph ph-tag" aria-hidden="true"></i><span>Kategori</span><span class="master-tab-count" id="master-count-kategori">0</span>
          </button>
          <button type="button" class="tab-btn" id="btn-master-tab-skipped" role="tab" aria-selected="false" aria-controls="tab-master-skipped" data-action="switch-tab" data-tab="tab-master-skipped" onclick={onMasterTab('tab-master-skipped')}>
            <i class="ph ph-calendar-x" aria-hidden="true"></i><span>Bulan Libur</span><span class="master-tab-count" id="master-count-skipped">0</span>
          </button>
          <button type="button" class="tab-btn" id="btn-master-tab-payment" role="tab" aria-selected="false" aria-controls="tab-master-payment" data-action="switch-tab" data-tab="tab-master-payment" onclick={onMasterTab('tab-master-payment')}>
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
              <button type="submit" class="btn btn-primary btn-liquid"><span class="keel-label"><i class="ph-bold ph-user-plus" aria-hidden="true"></i><span>Tambah</span></span><span class="keel-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5L19.5 7.5"/></svg></span></button>
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
              <button type="submit" class="btn btn-primary btn-liquid"><span class="keel-label"><i class="ph-bold ph-plus" aria-hidden="true"></i><span>Tambah</span></span><span class="keel-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5L19.5 7.5"/></svg></span></button>
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
                <button type="button" class="btn btn-primary admin-only" data-action="save-kas-start" onclick={onSaveKasStart}><i class="ph-bold ph-calendar-check" aria-hidden="true"></i><span>Simpan</span></button>
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
                <button type="button" class="btn btn-primary admin-only" data-action="add-skip" onclick={onAddSkip}><i class="ph-bold ph-plus" aria-hidden="true"></i><span>Tambah</span></button>
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
              <button type="submit" class="btn btn-primary btn-liquid"><span class="keel-label"><i class="ph-bold ph-floppy-disk" aria-hidden="true"></i><span>Simpan Rekening</span></span><span class="keel-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5L19.5 7.5"/></svg></span></button>
            </div>
          </form>
        </div>
      </div>

      <div class="hybrid-settings-footer master-sheet-footer">
        <span class="master-footer-hint">Perubahan tersimpan langsung ke tampilan aktif.</span>
        <button type="button" class="btn btn-secondary" data-action="close-modal" onclick={onClose('modal-kelola-master')}>Selesai</button>
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
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup" onclick={onClose('modal-edit-master-anggota')}><i class="ph-bold ph-x" aria-hidden="true"></i></button>
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
              <a id="edit-master-anggota-wa-link" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm master-wa-btn">
                <i class="ph-fill ph-whatsapp-logo" aria-hidden="true"></i><span>Chat WA</span>
              </a>
              <button type="button" class="btn btn-outline btn-sm" id="btn-modal-view-profil" data-action="view-profil-from-modal" onclick={onViewProfil}>
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
          <button type="button" class="btn btn-danger-outline" id="btn-modal-hapus-anggota" data-action="hapus-anggota-from-modal" onclick={onHapusAnggota}>
            <i class="ph-bold ph-trash" aria-hidden="true"></i><span>Hapus</span>
          </button>
          <button type="submit" class="btn btn-primary btn-liquid" id="btn-submit-edit-anggota"><span class="keel-label">Simpan Perubahan</span><span class="keel-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5L19.5 7.5"/></svg></span></button>
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
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup" onclick={onClose('modal-edit-master-kategori')}><i class="ph-bold ph-x" aria-hidden="true"></i></button>
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
        <button type="button" class="btn btn-danger-outline" id="btn-modal-hapus-kategori" data-action="hapus-kategori-from-modal" onclick={onHapusKategori}>
          <i class="ph-bold ph-trash" aria-hidden="true"></i><span>Hapus Kategori</span>
        </button>
        <button type="button" class="btn btn-primary" data-action="close-modal" onclick={onClose('modal-edit-master-kategori')}>Selesai</button>
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
          <button type="button" id="btn-refresh-offline" class="btn btn-outline btn-secondary queue-refresh-btn" data-action="refresh-offline" aria-label="Refresh" onclick={onRefreshOffline}>
            <i class="ph ph-arrow-clockwise" aria-hidden="true"></i> <span>Refresh</span>
          </button>
          <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup" onclick={onClose('modal-offline-queue')}>
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
        <button type="button" class="btn btn-secondary" data-action="close-modal" onclick={onClose('modal-offline-queue')}>Tutup</button>
        <button type="button" id="btn-sync-offline-now" class="btn btn-primary" data-action="sync-now" onclick={onSyncOffline}>
          <i class="ph-bold ph-arrows-clockwise" aria-hidden="true"></i> <span>Sinkron Sekarang</span>
        </button>
      </div>
    </div>
  </dialog>
