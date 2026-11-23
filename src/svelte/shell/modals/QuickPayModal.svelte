  <!-- 8. Quick Pay Hybrid Kinetic Sheet -->
  <dialog class="modal-overlay hybrid-dialog dues-dialog" id="modal-quickpay" aria-labelledby="modal-quickpay-title">
    <div class="modal-content quickpay-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header qp-sheet-header">
        <div class="qp-header-main">
          <div class="qp-header-emblem" aria-hidden="true">
            <i class="ph-fill ph-hand-coins"></i>
          </div>
          <div class="qp-header-copy">
            <h2 id="modal-quickpay-title">Bayar Iuran Kilat</h2>
            <p id="qp-periode"></p>
          </div>
        </div>
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup dialog"><i class="ph-bold ph-x" aria-hidden="true"></i></button>
      </div>
      <form id="form-quickpay" class="qp-form">
        <input type="hidden" id="qp-id-anggota">
        <input type="hidden" id="qp-bulan">
        <input type="hidden" id="qp-tahun">
        <div class="qp-sheet-body">
          <div class="qp-member-card">
            <span class="qp-avatar" id="qp-avatar" aria-hidden="true">?</span>
            <div class="qp-member-info">
              <strong id="qp-nama" class="qp-member-name">-</strong>
              <span id="qp-dues-meta" class="qp-member-meta">-</span>
            </div>
            <span class="qp-status-pill" id="qp-status-badge">BELUM BAYAR</span>
          </div>

          <div class="form-group">
            <div class="qp-label-row">
              <label for="qp-nominal">Nominal Pembayaran</label>
              <div class="qp-preset-chips" id="qp-presets" role="group" aria-label="Nominal cepat"></div>
            </div>
            <div class="input-with-prefix">
              <span>Rp</span>
              <input type="text" id="qp-nominal" name="qp-nominal" class="form-control input-qp-nominal font-mono tabular-nums" inputmode="numeric" enterkeyhint="done" required>
            </div>
          </div>

          <div class="form-row qp-row-meta">
            <div class="form-group">
              <label for="qp-tanggal">Tanggal Bayar (Opsional)</label>
              <input type="date" id="qp-tanggal" name="qp-tanggal" class="form-control dpick" data-placeholder="Pilih tanggal..." aria-label="Tanggal Bayar Kilat">
            </div>
            <div class="form-group">
              <label for="qp-keterangan">Catatan (Opsional)</label>
              <input type="text" id="qp-keterangan" name="qp-keterangan" class="form-control" placeholder="Contoh: Transfer / Tunai" enterkeyhint="done" autocomplete="off">
            </div>
          </div>

          <div class="qp-impact-callout is-inflow" id="qp-impact-callout" aria-live="polite" aria-atomic="true">
            <div class="qp-impact-meta">
              <strong id="qp-impact-status">Akan Lunas</strong>
              <span id="qp-impact-sub">-</span>
            </div>
            <div class="qp-impact-val">
              <span>Kas masuk</span>
              <strong id="qp-impact-amount">Rp 0</strong>
            </div>
          </div>
        </div>

        <div class="hybrid-settings-footer qp-sheet-footer">
          <button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button>
          <button type="submit" class="btn btn-primary btn-liquid" id="btn-submit-quickpay">
            <span class="keel-fill" aria-hidden="true"></span>
            <span class="keel-label">Simpan Pembayaran</span>
            <span class="keel-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"></path></svg></span>
          </button>
        </div>
      </form>
    </div>
  </dialog>
