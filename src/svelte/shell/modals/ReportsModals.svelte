<script lang="ts">
  import { closeModal, switchTab } from '../../ui/modal';
  import { exportMonthlyCashCSV, printMonthlyCashReport } from '../../handlers/cash-report';
  import { cetakLaporanTahunan, copyMonthlyRecap, exportToCSV } from '../../handlers/export';
  import { exportJSONBackup } from '../../handlers/backup';
  import { openTampilanModal } from '../../handlers/navigation';
  import { openSelfPay } from '../../handlers/self-pay';
  import { copyPassbook } from '../../handlers/profile';
  import { toggleMemberPin } from '../../stores/spotlight.svelte';
  import { flashDownloadRing } from '../../ui/ui-moments';

  const onClose = (id: string) => (e: MouseEvent) => { e.stopPropagation(); closeModal(id); };
  const onExportTab = (tab: string) => (e: MouseEvent) => { e.stopPropagation(); switchTab(tab, 'modal-export'); };
  const onPrintMonthly = (e: MouseEvent) => { e.stopPropagation(); printMonthlyCashReport(); };
  const onExportMonthlyCsv = (e: MouseEvent) => {
    e.stopPropagation();
    exportMonthlyCashCSV();
    flashDownloadRing(e.currentTarget as HTMLElement, 'Terunduh');
  };
  const onCopyRecap = (e: MouseEvent) => { e.stopPropagation(); copyMonthlyRecap(); };
  const onPrintAnnual = (e: MouseEvent) => { e.stopPropagation(); cetakLaporanTahunan(); };
  const onExportCsv = (e: MouseEvent) => {
    e.stopPropagation();
    exportToCSV();
    flashDownloadRing(e.currentTarget as HTMLElement, 'Terunduh');
  };
  const onBackupJson = (e: MouseEvent) => {
    e.stopPropagation();
    exportJSONBackup();
    flashDownloadRing(e.currentTarget as HTMLElement, 'Terunduh');
  };
  const onStampSettings = (e: MouseEvent) => { e.stopPropagation(); openTampilanModal(); };
  const onPassbookPay = (e: MouseEvent) => {
    e.stopPropagation();
    const id = (e.currentTarget as HTMLElement).dataset.id || '';
    closeModal('modal-profil-anggota');
    openSelfPay(id);
  };
  const onPassbookPin = (e: MouseEvent) => {
    e.stopPropagation();
    const id = (e.currentTarget as HTMLElement).dataset.id || '';
    if (id) toggleMemberPin(id);
  };
  const onPassbookCopy = (e: MouseEvent) => {
    e.stopPropagation();
    copyPassbook(e.currentTarget as HTMLElement);
  };
</script>

<!-- 9. Modal Export Data & Cetak (Hybrid Kinetic) -->
  <dialog class="modal-overlay hybrid-dialog" id="modal-export" aria-labelledby="modal-export-title">
    <div class="modal-content modal-md modal-data-dialog export-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header export-sheet-header">
        <div class="export-header-main">
          <div class="export-header-emblem" aria-hidden="true">
            <i class="ph-fill ph-file-text"></i>
          </div>
          <div class="export-header-copy">
            <h2 id="modal-export-title">Laporan &amp; Ekspor Kas</h2>
            <p class="export-subtitle">Buku kas bulanan, rekapitulasi, cetak dokumen, dan cadangan data</p>
          </div>
        </div>
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup" onclick={onClose('modal-export')}>
          <i class="ph ph-x" aria-hidden="true"></i>
        </button>
      </div>

      <div class="export-tabs-bar">
        <div class="export-tab-track" role="tablist" aria-label="Laporan &amp; Ekspor Kas">
          <span class="export-glider-pill" aria-hidden="true"></span>
          <button type="button" class="tab-btn active" role="tab" aria-selected="true" data-action="switch-tab" data-tab="laporan-kas" id="btn-tab-laporan-kas" onclick={onExportTab('laporan-kas')}>
            <i class="ph ph-calendar-check" aria-hidden="true"></i> <span>Laporan Bulanan</span>
          </button>
          <button type="button" class="tab-btn" role="tab" aria-selected="false" data-action="switch-tab" data-tab="ekspor-lain" id="btn-tab-ekspor-lain" onclick={onExportTab('ekspor-lain')}>
            <i class="ph ph-export" aria-hidden="true"></i> <span>Ekspor &amp; Backup</span>
          </button>
        </div>
      </div>

      <div class="export-sheet-body">
        <!-- Tab 1: Laporan Kas Bulanan (Buku Kas) -->
        <div class="tab-content active" id="tab-laporan-kas">
          <div class="report-filter-card">
            <div class="report-filter-row">
              <div class="report-filter-field">
                <label for="cash-report-month" class="form-label report-filter-label">Periode Bulan (WIB)</label>
                <input type="month" id="cash-report-month" name="cash-report-month" class="form-control report-month-input mpick" data-placeholder="Pilih periode bulan..." aria-label="Pilih Periode Bulan">
              </div>
              <div class="report-filter-actions">
                <button type="button" class="btn btn-primary report-action-btn" id="btn-print-monthly-report" data-action="print-monthly-report" onclick={onPrintMonthly}>
                  <i class="ph-bold ph-printer" aria-hidden="true"></i> <span>Cetak Laporan</span>
                </button>
                <button type="button" class="btn btn-outline btn-secondary report-action-btn" id="btn-export-monthly-csv" data-action="export-monthly-csv" onclick={onExportMonthlyCsv}>
                  <i class="ph-bold ph-file-csv" aria-hidden="true"></i> <span>Unduh CSV</span>
                </button>
              </div>
            </div>
            <div class="report-filter-hint">
              Dihitung berdasarkan tanggal kalender transaksi (Asia/Jakarta, UTC+7), bukan periode iuran.
            </div>
          </div>

          <div id="cash-report-alert" style="display: none;" role="alert" aria-live="polite"></div>

          <div class="report-stat-grid" aria-live="polite">
            <div class="report-stat-card">
              <div class="report-stat-title">Saldo Awal</div>
              <div id="cash-report-saldo-awal" class="font-mono report-stat-val">Rp 0</div>
            </div>
            <div class="report-stat-card">
              <div class="report-stat-title">Pemasukan (+)</div>
              <div id="cash-report-pemasukan" class="font-mono report-stat-val is-income">Rp 0</div>
            </div>
            <div class="report-stat-card">
              <div class="report-stat-title">Pengeluaran (-)</div>
              <div id="cash-report-pengeluaran" class="font-mono report-stat-val is-danger">Rp 0</div>
            </div>
            <div class="report-stat-card is-closing">
              <div class="report-stat-title">Saldo Akhir</div>
              <div id="cash-report-saldo-akhir" class="font-mono report-stat-val">Rp 0</div>
            </div>
          </div>

          <div class="report-ledger-card">
            <div class="report-ledger-header">
              <div class="report-ledger-title">
                <i class="ph ph-receipt" aria-hidden="true"></i> <span>Rincian Arus Kas</span>
              </div>
              <span class="report-ledger-badge">Urutan Kronologis (WIB)</span>
            </div>
            <div class="table-responsive report-ledger-scroll">
              <table class="report-ledger-table">
                <thead>
                  <tr>
                    <th class="col-no">No</th>
                    <th class="col-waktu">Waktu</th>
                    <th class="col-ket">Keterangan / Transaksi</th>
                    <th class="col-amt">Masuk</th>
                    <th class="col-amt">Keluar</th>
                    <th class="col-saldo">Saldo</th>
                  </tr>
                </thead>
                <tbody id="cash-report-details">
                  <tr>
                    <td colspan="6" class="td-muted-center">Memuat data laporan kas...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab 2: Ekspor Lain & Backup -->
        <div class="tab-content" id="tab-ekspor-lain">
          <div class="export-section-label">Rekap &amp; Cetak</div>
          <div class="export-actions-list">
            <button type="button" class="export-card-btn admin-only" data-action="copy-monthly-recap" onclick={onCopyRecap}>
              <span class="export-icon-box is-income" aria-hidden="true"><i class="ph-bold ph-whatsapp-logo"></i></span>
              <div class="export-card-copy">
                <div class="export-btn-title">Salin Rekap Bulan Ini (WA)</div>
                <div class="export-btn-desc">Ringkasan masuk/keluar + daftar yang belum bayar siap tempel ke grup WA.</div>
              </div>
              <i class="ph ph-caret-right export-card-chev" aria-hidden="true"></i>
            </button>
            <button type="button" class="export-card-btn" data-action="print-annual" onclick={onPrintAnnual}>
              <span class="export-icon-box is-secondary" aria-hidden="true"><i class="ph-bold ph-printer"></i></span>
              <div class="export-card-copy">
                <div class="export-btn-title">Cetak Rekap Tahunan</div>
                <div class="export-btn-desc">Cetak matriks status iuran anggota ke format PDF (A4 Landscape).</div>
              </div>
              <i class="ph ph-caret-right export-card-chev" aria-hidden="true"></i>
            </button>
            <button type="button" class="export-card-btn" data-action="export-csv" onclick={onExportCsv}>
              <span class="export-icon-box is-accent" aria-hidden="true"><i class="ph-bold ph-file-csv"></i></span>
              <div class="export-card-copy">
                <div class="export-btn-title">Unduh CSV spreadsheet lengkap</div>
                <div class="export-btn-desc">Ekspor seluruh riwayat transaksi grup ke berkas .csv</div>
              </div>
              <i class="ph ph-caret-right export-card-chev" aria-hidden="true"></i>
            </button>
          </div>

          <div class="export-backup-card admin-only">
            <div class="export-backup-head">
              <div class="export-section-label">Cadangan &amp; Pemulihan Database</div>
              <p class="export-backup-desc">Simpan atau pulihkan seluruh data grup dalam format JSON</p>
            </div>
            <div class="export-backup-actions">
              <button type="button" class="btn btn-outline btn-secondary export-backup-btn" data-action="export-json-backup" title="Download snapshot JSON database" onclick={onBackupJson}>
                <i class="ph ph-floppy-disk" aria-hidden="true"></i> <span>Backup JSON</span>
              </button>
              <label class="btn btn-outline btn-secondary export-backup-btn export-restore-label" for="input-restore-json" title="Restore snapshot JSON database">
                <i class="ph ph-upload-simple" aria-hidden="true"></i> <span>Restore JSON</span>
                <input type="file" id="input-restore-json" name="restore-json" accept=".json" class="sr-only">
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="hybrid-settings-footer export-sheet-footer">
        <span class="export-footer-hint"><i class="ph ph-clock" aria-hidden="true"></i> Laporan dihitung otomatis berdasarkan zona waktu WIB.</span>
        <button type="button" class="btn btn-secondary" data-action="close-modal" onclick={onClose('modal-export')}>Tutup</button>
      </div>
    </div>
  </dialog>

  <!-- 11. Modal Profil Anggota (Personal Card Style) -->
  <dialog class="modal-overlay hybrid-dialog dues-dialog" id="modal-profil-anggota" aria-labelledby="passbook-modal-title">
    <div class="modal-content hybrid-passbook">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="dlg-header hybrid-settings-header">
        <div>
          <h2 class="dlg-title" id="passbook-modal-title">Buku Iuran Digital Anggota</h2>
          <p class="dlg-subtitle" id="profil-subtitle">Riwayat setoran &amp; kartu iuran 12 bulan</p>
        </div>
        <button type="button" class="dlg-close-btn close-modal-btn" data-action="close-modal" aria-label="Tutup dialog" onclick={onClose('modal-profil-anggota')}>
          <i class="ph-bold ph-x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="dlg-body">
        <div class="profil-hero">
          <div class="profil-hero-top">
            <div class="profil-hero-left">
              <div>
                <strong class="profil-name-heading" id="p-nama-anggota">-</strong>
                <span class="profil-meta-line" id="passbook-meta">-</span>
              </div>
            </div>
            <div class="profil-total-box">
              <span class="profil-total-lbl">Total Kontribusi</span>
              <span class="profil-total-val mono tnum sensitive-amt" id="p-total-kontribusi">Rp 0</span>
            </div>
          </div>
          <div class="profil-chips-row">
            <span class="meta-chip paid tnum" id="passbook-paid-chip">0/12 Lunas</span>
            <span class="meta-chip amber tnum" id="passbook-unpaid-chip" hidden>0 Tunggakan</span>
          </div>
        </div>

        <div class="field-group">
          <div class="passbook-head-row">
            <span class="field-label" id="passbook-year">Kartu Cap Iuran 2026</span>
            <button type="button" class="btn btn-secondary btn-compact-34" id="passbook-style" data-action="open-stamp-settings" onclick={onStampSettings}>
              <i class="ph ph-seal-check" aria-hidden="true"></i>
              <span>Gaya Stempel</span>
            </button>
          </div>
          <div class="profil-passbook-grid" id="passbook-months"></div>
        </div>

        <div class="field-group">
          <span class="field-label">Riwayat Setoran Pribadi</span>
          <div class="profil-history-list" id="p-list-transaksi" aria-live="polite"></div>
        </div>
      </div>
      <div class="dlg-footer">
        <div class="passbook-member-actions non-admin-only">
          <button type="button" class="btn btn-primary" id="passbook-pay" data-action="open-self-pay" onclick={onPassbookPay}>
            <i class="ph-bold ph-hand-coins" aria-hidden="true"></i>
            <span>Bayar / Lapor</span>
          </button>
          <button type="button" class="btn btn-secondary" id="passbook-pin" data-action="toggle-member-pin" aria-pressed="false" onclick={onPassbookPin}>
            <i class="ph ph-push-pin" aria-hidden="true"></i>
            <span id="passbook-pin-label">Sematkan</span>
          </button>
          <button type="button" class="btn btn-secondary" id="passbook-copy" data-action="passbook-copy" onclick={onPassbookCopy}>
            <i class="ph ph-copy" aria-hidden="true"></i>
            <span>Salin Ringkasan</span>
          </button>
        </div>
        <button type="button" class="btn btn-secondary dlg-close-footer-desktop" data-action="close-modal" onclick={onClose('modal-profil-anggota')}>Tutup</button>
      </div>
    </div>
  </dialog>
