<dialog id="modal-bayar-anggota" class="modal-overlay hybrid-dialog dues-dialog" aria-labelledby="self-pay-title">
  <div class="modal-content self-pay-sheet">
    <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
    <div class="hybrid-settings-header">
      <div>
        <h2 id="self-pay-title">Hitung &amp; Konfirmasi Bayar Iuran</h2>
        <p>Pilih bulan iuran atau rapel, cek rekening bendahara, lalu kirim konfirmasi</p>
      </div>
      <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup dialog"><i class="ph-bold ph-x" aria-hidden="true"></i></button>
    </div>
    <div class="hybrid-self-pay-body">
      <div class="self-pay-field">
        <label for="self-pay-member">Atas Nama Anggota</label>
        <select id="self-pay-member" class="form-control" autofocus></select>
      </div>

      <section class="self-pay-field" aria-labelledby="self-pay-period-title">
        <h3 id="self-pay-period-title">Pilih Bulan Pembayaran (Tunggakan / Bayar Dimuka)</h3>
        <div class="self-pay-presets" role="group" aria-label="Preset pembayaran">
          <button type="button" data-action="self-pay-preset" data-preset="current" aria-pressed="false">Bulan Ini</button>
          <button type="button" data-action="self-pay-preset" data-preset="due" aria-pressed="false"><span class="self-pay-label-desktop">Semua Tunggakan</span><span class="self-pay-label-phone">Semua Belum</span></button>
          <button type="button" data-action="self-pay-preset" data-preset="advance" aria-pressed="false"><span class="self-pay-label-desktop">Rapel +2 Bulan</span><span class="self-pay-label-phone">Rapel +2</span></button>
        </div>
        <div id="self-pay-months" class="self-pay-months" role="group" aria-labelledby="self-pay-period-title"></div>
      </section>

      <div class="self-pay-grid">
        <section class="self-pay-section" aria-labelledby="self-pay-total-title">
          <div class="self-pay-card-header">
            <div>
              <h3 id="self-pay-total-title">Total Transfer</h3>
              <output id="self-pay-total" class="sensitive-amt" aria-hidden="true">Rp 0</output>
              <span id="self-pay-total-announcement" class="sr-only" role="status"></span>
            </div>
            <button type="button" class="btn btn-secondary" data-action="self-pay-copy" data-copy="amount"><i class="ph ph-copy" aria-hidden="true"></i> Salin Nominal</button>
          </div>
          <p id="self-pay-periods"></p>
        </section>
        <section class="self-pay-section" aria-labelledby="self-pay-account-title">
          <div class="self-pay-card-header">
            <div>
              <h3 id="self-pay-account-title">Bank Tujuan</h3>
              <div id="self-pay-account"></div>
              <p id="self-pay-account-holder"></p>
            </div>
            <button type="button" class="btn btn-secondary" data-action="self-pay-copy" data-copy="account"><i class="ph ph-copy" aria-hidden="true"></i> Salin No. Rekening</button>
          </div>
        </section>
      </div>

      <div class="self-pay-field">
        <label for="self-pay-preview">Draf Pesan Konfirmasi WhatsApp</label>
        <div class="self-pay-preview-wrap">
          <textarea id="self-pay-preview" class="self-pay-preview" readonly></textarea>
          <button type="button" class="btn btn-secondary self-pay-copy-preview" data-action="self-pay-copy" aria-label="Salin rincian" title="Salin rincian"><i class="ph ph-copy" aria-hidden="true"></i></button>
        </div>
      </div>
    </div>

    <div class="self-pay-actions">
      <button type="button" class="btn btn-secondary" data-action="close-modal">Tutup</button>
      <a class="btn btn-primary" id="self-pay-whatsapp" target="_blank" rel="noopener noreferrer"><i class="ph ph-paper-plane-tilt" aria-hidden="true"></i> Buka WhatsApp untuk Konfirmasi</a>
    </div>
  </div>
</dialog>
