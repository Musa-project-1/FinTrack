<script lang="ts">
  import { closeModal } from '../../ui/modal';

  const onClose = (e: MouseEvent) => { e.stopPropagation(); closeModal('modal-quickpay'); };
</script>

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
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup dialog" onclick={onClose}><i class="ph-bold ph-x" aria-hidden="true"></i></button>
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

          <div class="qp-rapel-wrap" id="qp-rapel-wrap" hidden>
            <div class="qp-rapel-head">
              <span class="qp-rapel-title" id="qp-rapel-title">Pilih Bulan (Rapel)</span>
              <button type="button" class="qp-rapel-all-btn" id="btn-qp-rapel-all" aria-pressed="false">Semua Tunggakan</button>
            </div>
            <div class="qp-rapel-pills" id="qp-rapel-pills" role="group" aria-label="Pilih bulan iuran untuk rapel"></div>
          </div>

          <div class="form-group">
            <div class="qp-label-row">
              <label for="qp-nominal" id="qp-nominal-label">Nominal Pembayaran</label>
              <div class="qp-preset-chips" id="qp-presets" role="group" aria-label="Nominal cepat"></div>
              <span class="qp-rapel-lock-hint" id="qp-rapel-lock-hint" hidden>Terkunci sesuai sisa tiap bulan</span>
            </div>
            <div class="input-with-prefix" id="qp-nominal-wrap">
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
              <span id="qp-impact-label">Kas masuk</span>
              <strong id="qp-impact-amount">Rp 0</strong>
            </div>
          </div>
        </div>

        <div class="hybrid-settings-footer qp-sheet-footer">
          <button type="button" class="btn btn-secondary" data-action="close-modal" onclick={onClose}>Batal</button>
          <button type="submit" class="btn btn-primary btn-liquid" id="btn-submit-quickpay">
            <span class="keel-fill" aria-hidden="true"></span>
            <span class="keel-label" id="qp-submit-label">Simpan Pembayaran</span>
            <span class="keel-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"></path></svg></span>
          </button>
        </div>
      </form>
      <div class="pay-verified-stage" id="qp-verified-stage" aria-hidden="true">
        <div class="pay-verified-card">
          <div class="pay-verified-medallion">
            <span class="pay-verified-orbit"></span>
            <span class="pay-verified-halo"></span>
            <svg class="pay-verified-check" viewBox="0 0 28 28" focusable="false">
              <path d="M6.5 14.5l5 5L21.5 9"></path>
            </svg>
          </div>
          <strong class="pay-verified-title" id="qp-verified-title">Mencatat Pembayaran…</strong>
          <span class="pay-verified-amount font-mono tabular-nums" id="qp-verified-amount">Rp 0</span>
          <span class="pay-verified-sub" id="qp-verified-sub">-</span>
        </div>
      </div>
    </div>
  </dialog>

<style>
  :global(#modal-quickpay .qp-rapel-wrap) {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px 12px;
    border-radius: 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    transition: background-color 220ms cubic-bezier(0.22, 1, 0.36, 1), border-color 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  :global(#modal-quickpay .qp-rapel-wrap[hidden]) {
    display: none;
  }
  :global(#modal-quickpay .qp-rapel-wrap.is-rapel-active) {
    background: var(--accent-tint);
    border-color: var(--accent-border);
  }
  :global(#modal-quickpay .qp-rapel-head) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  :global(#modal-quickpay .qp-rapel-title) {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-main);
    transition: color 200ms ease;
  }
  :global(#modal-quickpay .qp-rapel-wrap.is-rapel-active .qp-rapel-title) {
    color: var(--accent);
  }
  :global(#modal-quickpay .qp-rapel-all-btn) {
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    min-height: 28px;
    border-radius: 999px;
    background: var(--accent-tint);
    color: var(--accent);
    border: 1px solid var(--accent-border);
    cursor: pointer;
    transition: background-color 180ms ease, color 180ms ease, border-color 180ms ease, transform 140ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  :global(#modal-quickpay .qp-rapel-all-btn:active) {
    transform: scale(0.95);
  }
  :global(#modal-quickpay .qp-rapel-all-btn[aria-pressed="true"]) {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  }
  :global(#modal-quickpay .qp-rapel-pills) {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  :global(#modal-quickpay .qp-rapel-pill) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    min-height: 32px;
    border-radius: 8px;
    font-family: var(--font-mono);
    font-size: 11.5px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    background: var(--surface);
    color: var(--text-muted);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: background-color 200ms cubic-bezier(0.22, 1, 0.36, 1), color 180ms ease, border-color 200ms ease, transform 140ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  :global(#modal-quickpay .qp-rapel-pill:active) {
    transform: scale(0.94);
  }
  :global(#modal-quickpay .qp-rapel-pill[aria-pressed="true"]) {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
    font-weight: 700;
  }
  :global(#modal-quickpay .qp-rapel-pill.is-wave-pop) {
    animation: qpPillWave 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(var(--qp-wave-i, 0) * 34ms);
  }
  :global(#modal-quickpay .qp-rapel-lock-hint) {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    animation: qpFadeSlideIn 200ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  :global(#modal-quickpay .qp-rapel-lock-hint[hidden]) {
    display: none;
  }
  :global(#modal-quickpay .input-with-prefix) {
    transition: background-color 220ms ease, border-color 220ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  :global(#modal-quickpay .input-with-prefix.is-rapel-locked) {
    background: var(--surface-2);
    border-color: var(--border);
  }
  :global(#modal-quickpay .input-with-prefix.is-rapel-locked .input-qp-nominal) {
    color: var(--text-main);
    cursor: default;
  }
  :global(#modal-quickpay .is-rapel-pulse) {
    animation: qpFocusPulse 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  :global(#modal-quickpay .qp-status-pill) {
    transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease, transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  :global(#modal-quickpay .qp-status-pill.is-rapel) {
    background: var(--accent-tint);
    color: var(--accent);
    border-color: var(--accent-border);
  }
  @keyframes qpPillWave {
    0% { transform: scale(0.9); }
    55% { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes qpFocusPulse {
    0% { transform: scale(1); }
    40% { transform: scale(1.015); border-color: var(--accent); }
    100% { transform: scale(1); }
  }
  @keyframes qpFadeSlideIn {
    0% { opacity: 0; transform: translateY(-3px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(#modal-quickpay .qp-rapel-wrap),
    :global(#modal-quickpay .qp-rapel-title),
    :global(#modal-quickpay .qp-rapel-all-btn),
    :global(#modal-quickpay .qp-rapel-pill),
    :global(#modal-quickpay .input-with-prefix),
    :global(#modal-quickpay .qp-status-pill) {
      transition: none;
    }
    :global(#modal-quickpay .qp-rapel-pill.is-wave-pop),
    :global(#modal-quickpay .qp-rapel-lock-hint),
    :global(#modal-quickpay .is-rapel-pulse) {
      animation: none;
    }
  }
</style>
