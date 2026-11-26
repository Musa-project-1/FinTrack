<script lang="ts">
  import { getInput } from 'finkas/core/utils';
  import { closeConfirmDialog, closeModal, executeConfirmAction, switchTab } from '../../ui/modal';
  import { eksekusiHapus, konfirmasiHapus } from '../../handlers/transactions';
  import { cetakStruk } from '../../handlers/export';

  const onClose = (id: string) => (e: MouseEvent) => { e.stopPropagation(); closeModal(id); };
  const onSwitchTrxTab = (tab: string) => (e: MouseEvent) => {
    e.stopPropagation();
    switchTab(tab, 'modal-transaksi');
  };
  const onCetakDariEdit = (e: MouseEvent) => {
    e.stopPropagation();
    const idTrx = getInput('edit-id')?.value;
    if (idTrx) cetakStruk(idTrx);
  };
  const onHapusDariEdit = (e: MouseEvent) => {
    e.stopPropagation();
    const idTrx = getInput('edit-id')?.value;
    if (idTrx) {
      closeModal('modal-edit-transaksi', true);
      konfirmasiHapus(idTrx);
    }
  };
  const onDeleteConfirm = (e: MouseEvent) => { e.stopPropagation(); eksekusiHapus(); };
  const onConfirmCancel = (e: MouseEvent) => { e.stopPropagation(); closeConfirmDialog(); };
  const onConfirmSubmit = (e: MouseEvent) => { e.stopPropagation(); executeConfirmAction(); };
</script>

<!-- 13. Modal Catat Transaksi Baru (Wizard 3-Langkah: Iuran & Operasional) -->
  <dialog class="modal-overlay hybrid-dialog dues-dialog" id="modal-transaksi" aria-labelledby="modal-transaksi-title">
    <div class="modal-content modal-xl modal-data-dialog trx-record-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header trx-sheet-header">
        <div class="trx-header-main">
          <div class="trx-header-emblem" aria-hidden="true">
            <i class="ph-fill ph-plus-circle"></i>
          </div>
          <div class="trx-header-copy">
            <h2 id="modal-transaksi-title">Catat Transaksi Baru</h2>
            <p>Catat pembayaran iuran anggota atau arus kas operasional</p>
          </div>
        </div>
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup" onclick={onClose('modal-transaksi')}><i class="ph-bold ph-x" aria-hidden="true"></i></button>
      </div>

      <nav class="trx-stepper" id="trx-stepper" aria-label="Langkah pencatatan">
        <ol class="trx-stepper-list">
          <li class="trx-step-item is-active" data-step-item="1">
            <button type="button" class="trx-step-btn" data-trx-step="1" aria-current="step">
              <span class="trx-step-badge" aria-hidden="true">
                <span class="trx-step-num">1</span>
                <i class="ph-bold ph-check trx-step-check"></i>
              </span>
              <span class="trx-step-label" id="trx-step-label-1">Detail</span>
            </button>
          </li>
          <li class="trx-step-sep" data-step-sep="1" aria-hidden="true"></li>
          <li class="trx-step-item is-upcoming" data-step-item="2">
            <button type="button" class="trx-step-btn" data-trx-step="2">
              <span class="trx-step-badge" aria-hidden="true">
                <span class="trx-step-num">2</span>
                <i class="ph-bold ph-check trx-step-check"></i>
              </span>
              <span class="trx-step-label" id="trx-step-label-2">Anggota</span>
            </button>
          </li>
          <li class="trx-step-sep" data-step-sep="2" aria-hidden="true"></li>
          <li class="trx-step-item is-upcoming" data-step-item="3">
            <button type="button" class="trx-step-btn" data-trx-step="3">
              <span class="trx-step-badge" aria-hidden="true">
                <span class="trx-step-num">3</span>
                <i class="ph-bold ph-check trx-step-check"></i>
              </span>
              <span class="trx-step-label" id="trx-step-label-3">Tinjau</span>
            </button>
          </li>
        </ol>
      </nav>

      <div class="trx-tabs-bar" id="trx-tabs-bar">
        <div class="tab-header trx-tab-track" role="tablist" aria-label="Jenis Pencatatan">
          <div class="trx-glider-pill" aria-hidden="true"></div>
          <button type="button" class="tab-btn active" id="btn-tab-iuran" role="tab" aria-selected="true" aria-controls="tab-iuran" data-action="switch-tab" data-tab="iuran" onclick={onSwitchTrxTab('iuran')}>
            <i class="ph ph-users-three" aria-hidden="true"></i><span>Iuran Anggota</span>
          </button>
          <button type="button" class="tab-btn" id="btn-tab-operasional" role="tab" aria-selected="false" aria-controls="tab-operasional" data-action="switch-tab" data-tab="operasional" onclick={onSwitchTrxTab('operasional')}>
            <i class="ph ph-arrows-left-right" aria-hidden="true"></i><span>Kas Operasional</span>
          </button>
        </div>
      </div>

      <div class="tab-content active" id="tab-iuran" role="tabpanel" aria-labelledby="btn-tab-iuran">
        <form id="form-iuran" class="trx-form" novalidate>
          <div class="trx-sheet-body">
            <section class="trx-step-panel" id="iuran-step-1" data-step="1">
              <div class="form-row trx-row-iuran-top">
                <div class="form-group">
                  <label for="iuran-kategori">Kategori Iuran</label>
                  <select id="iuran-kategori" name="iuran-kategori" class="form-control cdrop" required aria-label="Kategori Iuran"></select>
                </div>
                <div class="form-group">
                  <label for="iuran-nominal">Nominal (per orang)</label>
                  <div class="input-with-prefix">
                    <span>Rp</span>
                    <input type="text" id="iuran-nominal" name="iuran-nominal" class="form-control" required inputmode="numeric" enterkeyhint="next" value="10.000">
                  </div>
                </div>
              </div>

              <div class="form-row form-row-3 trx-row-iuran-period">
                <div class="form-group">
                  <label for="iuran-bulan">Bulan Tagihan</label>
                  <select id="iuran-bulan" name="iuran-bulan" class="form-control cdrop" required aria-label="Bulan Iuran">
                    <option value="Januari">Januari</option> <option value="Februari">Februari</option> <option value="Maret">Maret</option>
                    <option value="April">April</option> <option value="Mei">Mei</option> <option value="Juni">Juni</option>
                    <option value="Juli">Juli</option> <option value="Agustus">Agustus</option> <option value="September">September</option>
                    <option value="Oktober">Oktober</option> <option value="November">November</option> <option value="Desember">Desember</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="iuran-tahun">Tahun</label>
                  <input type="number" id="iuran-tahun" name="iuran-tahun" class="form-control" required min="2000" max="2100" inputmode="numeric" enterkeyhint="next">
                </div>
                <div class="form-group">
                  <label for="iuran-tanggal">Tanggal Bayar (Opsional)</label>
                  <input type="date" id="iuran-tanggal" name="iuran-tanggal" class="form-control dpick" data-placeholder="dd/mm/yyyy" aria-label="Tanggal Bayar Iuran">
                </div>
              </div>
            </section>

            <section class="trx-step-panel" id="iuran-step-2" data-step="2" hidden>
              <div class="trx-step-head">
                <div class="trx-step-head-copy">
                  <h3 class="trx-step-title" tabindex="-1">Siapa yang bayar?</h3>
                  <p class="trx-step-sub" id="iuran-step2-sub">-</p>
                </div>
                <div class="trx-step-head-actions">
                  <span class="badge-count-terpilih" id="count-terpilih">0</span>
                  <button type="button" id="btn-pilih-semua" class="btn btn-secondary btn-select-all">Pilih Semua</button>
                </div>
              </div>

              <div class="search-wrapper trx-member-search">
                <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
                <input type="search" id="search-anggota-iuran" name="search-anggota-iuran" class="form-control" placeholder="Cari nama anggota..." aria-label="Cari nama anggota" autocomplete="off" spellcheck="false" enterkeyhint="search">
              </div>

              <div class="checkbox-grid-wrapper trx-member-well">
                <div class="checkbox-grid" id="iuran-checkbox-anggota">
                  <div class="text-muted">Memuat daftar anggota...</div>
                </div>
              </div>
            </section>

            <section class="trx-step-panel" id="iuran-step-3" data-step="3" hidden>
              <h3 class="sr-only" tabindex="-1">Tinjau Iuran Anggota</h3>
              <div class="trx-rev-list">
                <div class="trx-rev-row"><span>Kategori</span><strong id="rev-iuran-kategori">-</strong></div>
                <div class="trx-rev-row"><span>Periode tagihan</span><strong id="rev-iuran-periode">-</strong></div>
                <div class="trx-rev-row"><span>Nominal per anggota</span><strong id="summary-nominal">Rp 0</strong></div>
                <div class="trx-rev-row"><span>Tanggal bayar</span><strong id="rev-iuran-tanggal">Belum diatur</strong></div>
              </div>

              <div class="trx-rev-members">
                <div class="trx-rev-members-label"><span>Anggota membayar</span> (<span id="rev-iuran-member-count">0</span>)</div>
                <div class="trx-rev-chips" id="rev-iuran-chips"></div>
              </div>

              <div class="trx-rev-callout is-inflow" aria-live="polite" aria-atomic="true">
                <div class="trx-rev-callout-meta">
                  <strong id="rev-iuran-formula">0 anggota × Rp 0</strong>
                  <span>Ditambahkan ke saldo kas</span>
                </div>
                <div class="trx-rev-callout-val">
                  <span>Total kas masuk</span>
                  <strong id="summary-total">Rp 0</strong>
                </div>
              </div>
            </section>
          </div>

          <div class="hybrid-settings-footer trx-sheet-footer">
            <div class="trx-footer-left">
              <button type="button" class="btn btn-secondary" data-action="close-modal" data-trx-show-steps="1" onclick={onClose('modal-transaksi')}>Batal</button>
              <button type="button" class="btn btn-secondary" data-trx-prev hidden data-trx-show-steps="2 3">Kembali</button>
              <span class="trx-footer-meta" hidden data-trx-show-steps="2">
                <span id="summary-count">0 dipilih</span><span class="trx-meta-dot" aria-hidden="true">·</span><strong id="iuran-step2-total">Rp 0</strong>
              </span>
            </div>
            <div class="trx-footer-actions">
              <button type="button" class="btn btn-primary trx-btn-next" data-trx-next data-trx-show-steps="1 2">
                <span>Lanjut</span>
                <i class="ph-bold ph-arrow-right" aria-hidden="true"></i>
              </button>
              <button type="submit" class="btn btn-primary btn-liquid" id="btn-submit-iuran" hidden data-trx-show-steps="3">
                <span class="keel-fill" aria-hidden="true"></span>
                <span class="keel-label">Simpan Iuran</span>
                <span class="keel-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"></path></svg></span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <div class="tab-content" id="tab-operasional" role="tabpanel" aria-labelledby="btn-tab-operasional">
        <form id="form-operasional" class="trx-form" novalidate>
          <div class="trx-sheet-body">
            <section class="trx-step-panel" id="ops-step-1" data-step="1">
              <div class="form-group">
                <label for="ops-tipe">Arus Transaksi</label>
                <select id="ops-tipe" name="ops-tipe" class="visually-hidden" required tabindex="-1" aria-hidden="true">
                  <option value="Keluar">Pengeluaran (-)</option>
                  <option value="Masuk">Pemasukan (+)</option>
                </select>
                <fieldset class="ops-flow-cards">
                  <legend class="sr-only">Arus Transaksi</legend>
                  <label class="ops-flow-card is-keluar">
                    <input type="radio" class="visually-hidden" name="ops-tipe-radio" value="Keluar" checked>
                    <span class="ops-flow-icon" aria-hidden="true"><i class="ph-bold ph-arrow-up-right"></i></span>
                    <span class="ops-flow-copy">
                      <strong>Pengeluaran (−)</strong>
                      <small>Uang keluar dari kas</small>
                    </span>
                    <span class="ops-flow-radio" aria-hidden="true"></span>
                  </label>
                  <label class="ops-flow-card is-masuk">
                    <input type="radio" class="visually-hidden" name="ops-tipe-radio" value="Masuk">
                    <span class="ops-flow-icon" aria-hidden="true"><i class="ph-bold ph-arrow-down-left"></i></span>
                    <span class="ops-flow-copy">
                      <strong>Pemasukan (+)</strong>
                      <small>Uang masuk ke kas</small>
                    </span>
                    <span class="ops-flow-radio" aria-hidden="true"></span>
                  </label>
                </fieldset>
              </div>
              <div class="form-group">
                <label for="ops-kategori">Kategori</label>
                <select id="ops-kategori" name="ops-kategori" class="form-control cdrop" required aria-label="Kategori Transaksi Kas"></select>
              </div>
            </section>

            <section class="trx-step-panel" id="ops-step-2" data-step="2" hidden>
              <div class="trx-step-head">
                <div class="trx-step-head-copy">
                  <h3 class="trx-step-title" tabindex="-1">Berapa nominal dan keperluannya?</h3>
                  <p class="trx-step-sub" id="ops-step2-sub">-</p>
                </div>
              </div>

              <div class="form-row trx-row-ops-mid">
                <div class="form-group">
                  <div class="trx-label-row">
                    <label for="ops-nominal">Nominal (Rp)</label>
                    <div class="ops-preset-chips" role="group" aria-label="Nominal cepat">
                      <button type="button" class="ops-preset-chip" data-ops-preset="25000">25rb</button>
                      <button type="button" class="ops-preset-chip" data-ops-preset="50000">50rb</button>
                      <button type="button" class="ops-preset-chip" data-ops-preset="100000">100rb</button>
                      <button type="button" class="ops-preset-chip" data-ops-preset="250000">250rb</button>
                    </div>
                  </div>
                  <div class="input-with-prefix">
                    <span>Rp</span>
                    <input type="text" id="ops-nominal" name="ops-nominal" class="form-control" required inputmode="numeric" enterkeyhint="next" placeholder="0">
                  </div>
                </div>
                <div class="form-group">
                  <label for="ops-tanggal">Tanggal Transaksi (Opsional)</label>
                  <input type="date" id="ops-tanggal" name="ops-tanggal" class="form-control dpick" data-placeholder="dd/mm/yyyy" aria-label="Tanggal Transaksi">
                </div>
              </div>

              <div class="form-group">
                <label for="ops-anggota">Terkait Anggota (Opsional)</label>
                <select id="ops-anggota" name="ops-anggota" class="form-control cdrop" data-search="true" aria-label="Terkait Anggota"></select>
              </div>

              <div class="form-group">
                <label for="ops-keterangan">Keterangan / Keperluan</label>
                <input type="text" id="ops-keterangan" name="ops-keterangan" class="form-control" placeholder="Contoh: Konsumsi rapat warga..." enterkeyhint="next" required>
              </div>
            </section>

            <section class="trx-step-panel" id="ops-step-3" data-step="3" hidden>
              <h3 class="sr-only" tabindex="-1">Tinjau Transaksi Operasional</h3>
              <div class="trx-rev-list">
                <div class="trx-rev-row"><span>Arus transaksi</span><strong id="summary-ops-tipe">Pengeluaran (−)</strong></div>
                <div class="trx-rev-row"><span>Kategori</span><strong id="rev-ops-kategori">-</strong></div>
                <div class="trx-rev-row"><span>Tanggal transaksi</span><strong id="rev-ops-tanggal">Belum diatur</strong></div>
                <div class="trx-rev-row"><span>Terkait anggota</span><strong id="rev-ops-anggota">Bukan transaksi anggota</strong></div>
                <div class="trx-rev-row"><span>Keterangan</span><strong id="rev-ops-keterangan">-</strong></div>
              </div>

              <div class="trx-rev-callout is-outflow" id="ops-rev-callout" aria-live="polite" aria-atomic="true">
                <div class="trx-rev-callout-meta">
                  <strong><span>Nominal:</span> <span id="summary-ops-nominal">Rp 0</span></strong>
                  <span id="summary-ops-label">Mengurangi saldo kas</span>
                </div>
                <div class="trx-rev-callout-val">
                  <span>Dampak saldo</span>
                  <strong id="summary-ops-total">Rp 0</strong>
                </div>
              </div>
            </section>
          </div>

          <div class="hybrid-settings-footer trx-sheet-footer">
            <div class="trx-footer-left">
              <button type="button" class="btn btn-secondary" data-action="close-modal" data-trx-show-steps="1" onclick={onClose('modal-transaksi')}>Batal</button>
              <button type="button" class="btn btn-secondary" data-trx-prev hidden data-trx-show-steps="2 3">Kembali</button>
              <span class="trx-footer-meta" id="ops-step2-summary" hidden data-trx-show-steps="2">Pengeluaran (−) · Rp 0</span>
            </div>
            <div class="trx-footer-actions">
              <button type="button" class="btn btn-primary trx-btn-next" data-trx-next data-trx-show-steps="1 2">
                <span>Lanjut</span>
                <i class="ph-bold ph-arrow-right" aria-hidden="true"></i>
              </button>
              <button type="submit" class="btn btn-primary btn-liquid" id="btn-submit-ops" hidden data-trx-show-steps="3">
                <span class="keel-fill" aria-hidden="true"></span>
                <span class="keel-label">Simpan Transaksi</span>
                <span class="keel-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"></path></svg></span>
              </button>
            </div>
          </div>
        </form>
      </div>
      <div class="pay-verified-stage" id="trx-verified-stage" aria-hidden="true">
        <div class="pay-verified-card">
          <div class="pay-verified-medallion">
            <span class="pay-verified-orbit"></span>
            <span class="pay-verified-halo"></span>
            <svg class="pay-verified-check" viewBox="0 0 28 28" focusable="false">
              <path d="M6.5 14.5l5 5L21.5 9"></path>
            </svg>
          </div>
          <strong class="pay-verified-title" id="trx-verified-title">Mencatat Transaksi…</strong>
          <span class="pay-verified-amount font-mono tabular-nums" id="trx-verified-amount">Rp 0</span>
          <span class="pay-verified-sub" id="trx-verified-sub">-</span>
        </div>
      </div>
    </div>
  </dialog>

  <!-- 14. Modal Koreksi Transaksi (Wizard 3-Langkah: Alur Bayar / Koreksi Kas) -->
  <dialog class="modal-overlay hybrid-dialog dues-dialog" id="modal-edit-transaksi" aria-labelledby="modal-edit-transaksi-title">
    <div class="modal-content modal-xl modal-data-dialog trx-record-sheet edit-record-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header trx-sheet-header">
        <div class="trx-header-main">
          <div class="trx-header-emblem" aria-hidden="true">
            <i class="ph-fill ph-pencil-simple-line"></i>
          </div>
          <div class="trx-header-copy">
            <h2 id="modal-edit-transaksi-title">Koreksi Transaksi</h2>
            <p>Sesuaikan arus kas, nominal, atau catatan dengan tinjauan dampak saldo</p>
          </div>
        </div>
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup" onclick={onClose('modal-edit-transaksi')}><i class="ph-bold ph-x" aria-hidden="true"></i></button>
      </div>

      <nav class="trx-stepper" id="edit-stepper" aria-label="Langkah koreksi">
        <ol class="trx-stepper-list">
          <li class="trx-step-item is-active" data-edit-step-item="1">
            <button type="button" class="trx-step-btn" data-edit-step="1" aria-current="step">
              <span class="trx-step-badge" aria-hidden="true">
                <span class="trx-step-num">1</span>
                <i class="ph-bold ph-check trx-step-check"></i>
              </span>
              <span class="trx-step-label" id="edit-step-label-1">Nominal</span>
            </button>
          </li>
          <li class="trx-step-sep" data-edit-step-sep="1" aria-hidden="true"></li>
          <li class="trx-step-item is-upcoming" data-edit-step-item="2">
            <button type="button" class="trx-step-btn" data-edit-step="2">
              <span class="trx-step-badge" aria-hidden="true">
                <span class="trx-step-num">2</span>
                <i class="ph-bold ph-check trx-step-check"></i>
              </span>
              <span class="trx-step-label" id="edit-step-label-2">Rincian</span>
            </button>
          </li>
          <li class="trx-step-sep" data-edit-step-sep="2" aria-hidden="true"></li>
          <li class="trx-step-item is-upcoming" data-edit-step-item="3">
            <button type="button" class="trx-step-btn" data-edit-step="3">
              <span class="trx-step-badge" aria-hidden="true">
                <span class="trx-step-num">3</span>
                <i class="ph-bold ph-check trx-step-check"></i>
              </span>
              <span class="trx-step-label" id="edit-step-label-3">Tinjau</span>
            </button>
          </li>
        </ol>
      </nav>

      <form id="form-edit-transaksi" class="trx-form" novalidate>
        <input type="hidden" id="edit-id">
        <div class="trx-sheet-body">
          <section class="trx-step-panel" id="edit-step-1" data-step="1">
            <div class="edit-origin-banner">
              <div class="edit-origin-meta">
                <div class="edit-origin-top">
                  <span class="edit-origin-eyebrow">Data Asal</span>
                  <span class="edit-origin-pill mono" id="edit-origin-id">-</span>
                </div>
                <span class="edit-origin-summary" id="edit-origin-summary">-</span>
              </div>
              <div class="edit-origin-actions">
                <button type="button" class="btn btn-outline btn-secondary edit-quick-btn" data-action="cetak-dari-edit" id="btn-edit-cetak" title="Cetak Struk Transaksi" onclick={onCetakDariEdit}>
                  <i class="ph-bold ph-printer" aria-hidden="true"></i> <span>Struk</span>
                </button>
                <button type="button" class="btn btn-danger-outline edit-quick-btn" data-action="hapus-dari-edit" id="btn-edit-hapus" title="Hapus Transaksi" onclick={onHapusDariEdit}>
                  <i class="ph-bold ph-trash" aria-hidden="true"></i> <span>Hapus</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="edit-tipe">Arus Transaksi</label>
              <select id="edit-tipe" name="edit-tipe" class="visually-hidden" required tabindex="-1" aria-hidden="true" aria-label="Tipe Transaksi">
                <option value="Masuk">Pemasukan (+)</option>
                <option value="Keluar">Pengeluaran (-)</option>
              </select>
              <fieldset class="ops-flow-cards">
                <legend class="sr-only">Arus Transaksi</legend>
                <label class="ops-flow-card is-keluar">
                  <input type="radio" class="visually-hidden" name="edit-tipe-radio" value="Keluar">
                  <span class="ops-flow-icon" aria-hidden="true"><i class="ph-bold ph-arrow-up-right"></i></span>
                  <span class="ops-flow-copy">
                    <strong>Pengeluaran (−)</strong>
                    <small>Uang keluar dari kas</small>
                  </span>
                  <span class="ops-flow-radio" aria-hidden="true"></span>
                </label>
                <label class="ops-flow-card is-masuk">
                  <input type="radio" class="visually-hidden" name="edit-tipe-radio" value="Masuk">
                  <span class="ops-flow-icon" aria-hidden="true"><i class="ph-bold ph-arrow-down-left"></i></span>
                  <span class="ops-flow-copy">
                    <strong>Pemasukan (+)</strong>
                    <small>Uang masuk ke kas</small>
                  </span>
                  <span class="ops-flow-radio" aria-hidden="true"></span>
                </label>
              </fieldset>
            </div>

            <div class="form-group">
              <label for="edit-kategori">Kategori</label>
              <select id="edit-kategori" name="edit-kategori" class="form-control cdrop" required aria-label="Kategori Transaksi"></select>
            </div>
            <div class="form-group">
              <div class="trx-label-row">
                <label for="edit-nominal">Nominal (Rp)</label>
                <div class="ops-preset-chips" role="group" aria-label="Nominal cepat">
                  <button type="button" class="ops-preset-chip" data-edit-preset="10000">10rb</button>
                  <button type="button" class="ops-preset-chip" data-edit-preset="25000">25rb</button>
                  <button type="button" class="ops-preset-chip" data-edit-preset="50000">50rb</button>
                  <button type="button" class="ops-preset-chip" data-edit-preset="100000">100rb</button>
                </div>
              </div>
              <div class="input-with-prefix">
                <span>Rp</span>
                <input type="text" id="edit-nominal" name="edit-nominal" class="form-control" required inputmode="numeric" enterkeyhint="next" placeholder="0">
              </div>
            </div>
          </section>

          <section class="trx-step-panel" id="edit-step-2" data-step="2" hidden>
            <div class="trx-step-head">
              <div class="trx-step-head-copy">
                <h3 class="trx-step-title" tabindex="-1">Perbarui detail &amp; lampiran</h3>
                <p class="trx-step-sub" id="edit-step2-sub">-</p>
              </div>
            </div>

            <div class="form-row trx-row-ops-mid">
              <div class="form-group">
                <label for="edit-anggota">Terkait Anggota</label>
                <select id="edit-anggota" name="edit-anggota" class="form-control cdrop" data-search="true" aria-label="Terkait Anggota"></select>
              </div>
              <div class="form-group">
                <label for="edit-tanggal">Tanggal Transaksi</label>
                <input type="date" id="edit-tanggal" name="edit-tanggal" class="form-control dpick" data-placeholder="dd/mm/yyyy" aria-label="Tanggal Transaksi">
              </div>
            </div>

            <div class="form-row edit-row-period">
              <div class="form-group">
                <label for="edit-bulan">Bulan</label>
                <select id="edit-bulan" name="edit-bulan" class="form-control cdrop" aria-label="Bulan Iuran">
                  <option value="-">-</option> <option value="Januari">Januari</option> <option value="Februari">Februari</option>
                  <option value="Maret">Maret</option> <option value="April">April</option> <option value="Mei">Mei</option>
                  <option value="Juni">Juni</option> <option value="Juli">Juli</option> <option value="Agustus">Agustus</option>
                  <option value="September">September</option> <option value="Oktober">Oktober</option> <option value="November">November</option> <option value="Desember">Desember</option>
                </select>
              </div>
              <div class="form-group">
                <label for="edit-tahun">Tahun</label>
                <input type="number" id="edit-tahun" name="edit-tahun" class="form-control" inputmode="numeric" enterkeyhint="next">
              </div>
            </div>

            <div class="form-group">
              <label for="edit-keterangan">Keterangan</label>
              <input type="text" id="edit-keterangan" name="edit-keterangan" class="form-control" placeholder="Catatan pembukuan..." enterkeyhint="next">
            </div>

            <div class="edit-proof-card attachment-control-group" id="transaction-attachment-container">
              <div class="edit-proof-head">
                <label for="trx-attachment-file">Bukti Transaksi (maks 512 KiB)</label>
                <div class="attachment-status-text" id="trx-attachment-status" data-attachment-status>Belum ada bukti terlampir.</div>
              </div>
              <div class="attachment-input-row">
                <input type="file" id="trx-attachment-file" class="form-control" accept="image/jpeg,image/png,image/webp,application/pdf" aria-label="Pilih berkas bukti transaksi">
                <div class="attachment-btn-group">
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-upload-attachment" data-action="upload-attachment" title="Unggah bukti">
                    <i class="ph ph-upload-simple"></i> Unggah
                  </button>
                  <button type="button" class="btn btn-outline btn-sm" id="btn-download-attachment" data-action="download-attachment" title="Unduh bukti" style="display:none;">
                    <i class="ph ph-download-simple"></i> Unduh
                  </button>
                  <button type="button" class="btn btn-danger-outline btn-sm" id="btn-delete-attachment" data-action="delete-attachment" title="Hapus bukti" style="display:none;">
                    <i class="ph ph-trash"></i> Hapus
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section class="trx-step-panel" id="edit-step-3" data-step="3" hidden>
            <h3 class="sr-only" tabindex="-1">Tinjau Koreksi Transaksi</h3>
            <div class="edit-rev-card">
              <div class="trx-rev-list">
                <div class="trx-rev-row"><span>ID Referensi</span><strong class="mono" id="rev-edit-id">-</strong></div>
                <div class="trx-rev-row"><span>Kategori</span><strong id="rev-edit-kategori">-</strong></div>
                <div class="trx-rev-row"><span>Terkait anggota</span><strong id="rev-edit-anggota">-</strong></div>
                <div class="trx-rev-row"><span>Periode &amp; tanggal</span><strong id="rev-edit-periode">-</strong></div>
                <div class="trx-rev-row"><span>Keterangan</span><strong id="rev-edit-keterangan">-</strong></div>
              </div>
            </div>

            <div class="trx-rev-callout edit-summary-card" id="edit-rev-callout" aria-live="polite" aria-atomic="true">
              <div class="edit-impact-panel" aria-label="Dampak koreksi transaksi">
                <div class="edit-delta-rows">
                  <div class="edit-delta-row"><span class="edit-delta-label">Arus Kas</span><span class="edit-delta-val" id="edit-delta-tipe">-</span></div>
                  <div class="edit-delta-row"><span class="edit-delta-label">Nominal Lama</span><span class="edit-delta-val" id="edit-delta-before">-</span></div>
                  <div class="edit-delta-row"><span class="edit-delta-label">Nominal Baru</span><span class="edit-delta-val" id="edit-delta-after">-</span></div>
                  <div class="edit-delta-row is-total visually-hidden"><span class="edit-delta-label">Selisih Saldo</span><span class="edit-delta-val" id="edit-delta-diff">-</span></div>
                </div>
              </div>
              <div class="edit-verdict-row">
                <div class="trx-rev-callout-meta">
                  <strong id="edit-callout-title">Nominal tetap · Tidak mengubah saldo</strong>
                  <span id="edit-callout-sub">Tercatat di log audit</span>
                </div>
                <div class="trx-rev-callout-val">
                  <span>Selisih saldo</span>
                  <strong id="edit-callout-diff">Rp 0</strong>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="hybrid-settings-footer trx-sheet-footer">
          <div class="trx-footer-left">
            <button type="button" class="btn btn-secondary" data-action="close-modal" data-edit-show-steps="1" onclick={onClose('modal-edit-transaksi')}>Batal</button>
            <button type="button" class="btn btn-secondary" data-edit-prev hidden data-edit-show-steps="2 3">Kembali</button>
            <span class="trx-footer-meta edit-footer-pill" id="edit-footer-pill" data-edit-show-steps="1 2">
              <span>Selisih:</span><strong id="edit-footer-delta">Rp 0 (Tetap)</strong>
            </span>
          </div>
          <div class="trx-footer-actions">
            <button type="button" class="btn btn-primary trx-btn-next" data-edit-next data-edit-show-steps="1 2">
              <span>Lanjut</span>
              <i class="ph-bold ph-arrow-right" aria-hidden="true"></i>
            </button>
            <button type="submit" class="btn btn-primary btn-liquid" id="btn-submit-edit" hidden data-edit-show-steps="3">
              <span class="keel-fill" aria-hidden="true"></span>
              <span class="keel-label">Simpan Perubahan</span>
              <span class="keel-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5L19.5 7.5"/></svg></span>
            </button>
          </div>
        </div>
      </form>
      <div class="pay-verified-stage" id="edit-verified-stage" aria-hidden="true">
        <div class="pay-verified-card">
          <div class="pay-verified-medallion">
            <span class="pay-verified-orbit"></span>
            <span class="pay-verified-halo"></span>
            <svg class="pay-verified-check" viewBox="0 0 28 28" focusable="false">
              <path d="M6.5 14.5l5 5L21.5 9"></path>
            </svg>
          </div>
          <strong class="pay-verified-title" id="edit-verified-title">Menyimpan Koreksi…</strong>
          <span class="pay-verified-amount font-mono tabular-nums" id="edit-verified-amount">Rp 0</span>
          <span class="pay-verified-sub" id="edit-verified-sub">-</span>
        </div>
      </div>
    </div>
  </dialog>

  <!-- 15. Modal Konfirmasi Hapus Transaksi -->
  <dialog class="modal-overlay hybrid-dialog hybrid-alert-dialog" id="modal-hapus" aria-labelledby="modal-hapus-title">
    <div class="modal-content modal-center-dialog">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="modal-badge-icon danger">
        <i class="ph-bold ph-trash"></i>
      </div>
      <h2 id="modal-hapus-title">Hapus Transaksi?</h2>
      <p>Data yang dihapus akan dicatat ke log aktivitas dan saldo kas akan disesuaikan.</p>
      <input type="hidden" id="hapus-id-target">
      <div class="modal-dialog-actions">
        <button type="button" class="btn btn-outline btn-secondary" data-action="cancel-delete" onclick={onClose('modal-hapus')}>Batal</button>
        <button type="button" class="btn btn-primary btn-danger-solid btn-liquid" data-action="confirm-delete" id="btn-hapus" onclick={onDeleteConfirm}><span class="keel-label">Ya, Hapus</span><span class="keel-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5L19.5 7.5"/></svg></span></button>
      </div>
      <div class="pay-verified-stage" id="hapus-verified-stage" aria-hidden="true">
        <div class="pay-verified-card">
          <div class="pay-verified-medallion">
            <span class="pay-verified-orbit"></span>
            <span class="pay-verified-halo"></span>
            <svg class="pay-verified-check" viewBox="0 0 28 28" focusable="false">
              <path d="M6.5 14.5l5 5L21.5 9"></path>
            </svg>
          </div>
          <strong class="pay-verified-title" id="hapus-verified-title">Menghapus Transaksi…</strong>
          <span class="pay-verified-amount font-mono tabular-nums" id="hapus-verified-amount">Rp 0</span>
          <span class="pay-verified-sub" id="hapus-verified-sub">-</span>
        </div>
      </div>
    </div>
  </dialog>

  <!-- 15b. Modal Konfirmasi Mutasi Database -->
  <dialog class="modal-overlay hybrid-dialog dues-dialog hybrid-alert-dialog" id="modal-confirm-action" aria-labelledby="confirm-title">
    <div class="modal-content modal-center-dialog">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="modal-badge-icon" id="confirm-badge-icon">
        <i class="ph-fill ph-database" id="confirm-icon"></i>
      </div>
      <h2 id="confirm-title">Konfirmasi Perubahan</h2>
      <p id="confirm-message">Apakah Anda yakin ingin menyimpan perubahan ini ke database?</p>
      <div class="modal-dialog-actions">
        <button type="button" class="btn btn-outline btn-secondary" data-action="cancel-confirm-action" onclick={onConfirmCancel}>Batal</button>
        <button type="button" class="btn btn-primary" data-action="confirm-action-submit" id="btn-confirm-action-submit" onclick={onConfirmSubmit}>Ya, Lanjutkan</button>
      </div>
    </div>
  </dialog>
