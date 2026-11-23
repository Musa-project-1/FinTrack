<dialog class="modal-overlay hybrid-dialog dues-dialog" id="modal-struk" aria-labelledby="receipt-title">
  <div class="modal-content receipt-drawer">
    <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
    <div class="hybrid-settings-header">
      <div><h2 id="receipt-title">Struk Digital Transaksi</h2><p id="receipt-group" class="mono"></p></div>
      <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup"><i class="ph ph-x" aria-hidden="true"></i></button>
    </div>
    <div class="receipt-content">
      <div id="receipt-body" class="receipt-sheet"></div>
      <div class="receipt-actions">
        <button type="button" class="btn btn-secondary" data-action="copy-receipt"><i class="ph ph-copy" aria-hidden="true"></i> Salin Struk</button>
        <button type="button" class="btn btn-secondary" id="receipt-attachment" data-action="receipt-attachment" hidden>Unduh Bukti</button>
        <button type="button" class="btn btn-secondary admin-only" id="receipt-edit" data-action="edit">Koreksi</button>
        <button type="button" class="btn btn-secondary" id="receipt-print" data-action="cetak"><i class="ph ph-printer" aria-hidden="true"></i> Cetak Kwitansi</button>
      </div>
      <textarea class="form-control" id="receipt-copy-text" aria-label="Struk untuk disalin" readonly hidden></textarea>
    </div>
    <div class="hybrid-settings-footer receipt-controls">
      <span class="non-admin-only">Mode Anggota (Baca Saja)</span>
      <button type="button" class="btn btn-secondary" data-action="close-modal">Tutup</button>
    </div>
  </div>
</dialog>
