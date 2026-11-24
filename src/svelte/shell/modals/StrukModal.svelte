<dialog class="modal-overlay hybrid-dialog dues-dialog" id="modal-struk" aria-labelledby="receipt-title">
  <div class="modal-content receipt-drawer">
    <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
    <div class="hybrid-settings-header receipt-sheet-header">
      <div class="receipt-header-main">
        <div class="receipt-header-emblem" aria-hidden="true">
          <i class="ph-fill ph-receipt"></i>
        </div>
        <div class="receipt-header-copy">
          <h2 id="receipt-title">Struk Digital Transaksi</h2>
          <p id="receipt-group" class="mono"></p>
        </div>
      </div>
      <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup"><i class="ph-bold ph-x" aria-hidden="true"></i></button>
    </div>
    <div class="receipt-content">
      <div id="receipt-body" class="receipt-sheet"></div>
      <div class="receipt-actions">
        <button type="button" class="btn btn-primary" id="receipt-print" data-action="cetak"><i class="ph-bold ph-printer" aria-hidden="true"></i> <span>Cetak Kwitansi</span></button>
        <button type="button" class="btn btn-secondary" data-action="copy-receipt"><i class="ph-bold ph-copy" aria-hidden="true"></i> <span>Salin Struk</span></button>
        <button type="button" class="btn btn-outline btn-secondary" id="receipt-attachment" data-action="receipt-attachment" hidden><i class="ph-bold ph-paperclip" aria-hidden="true"></i> <span>Unduh Bukti</span></button>
        <button type="button" class="btn btn-outline btn-secondary admin-only" id="receipt-edit" data-action="edit"><i class="ph-bold ph-pencil-simple" aria-hidden="true"></i> <span>Koreksi Data</span></button>
      </div>
      <textarea class="form-control" id="receipt-copy-text" aria-label="Struk untuk disalin" readonly hidden></textarea>
    </div>
    <div class="hybrid-settings-footer receipt-controls">
      <div class="receipt-trust-note">
        <i class="ph ph-shield-check" aria-hidden="true"></i>
        <span class="non-admin-only">Bukti Kas Digital Sah</span>
        <span class="admin-only">Tercatat di Buku Kas &amp; Audit</span>
      </div>
      <button type="button" class="btn btn-secondary" data-action="close-modal">Tutup</button>
    </div>
  </div>
</dialog>
