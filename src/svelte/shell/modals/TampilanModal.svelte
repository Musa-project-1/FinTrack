<dialog class="modal-overlay hybrid-dialog" id="modal-tampilan" aria-labelledby="modal-tampilan-title">
  <div class="modal-content modal-md hybrid-settings">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
    <div class="hybrid-settings-header">
      <div>
        <h2 id="modal-tampilan-title">Tampilan &amp; Bahasa</h2>
        <p id="modal-tampilan-subtitle">Sesuaikan bahasa, tema warna, pencahayaan, dan gaya tampilan aplikasi</p>
      </div>
      <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup"><i class="ph-bold ph-x" aria-hidden="true"></i></button>
    </div>
    <div class="hybrid-settings-body">

<!-- Section 0: Bahasa Aplikasi -->
<section aria-labelledby="tampilan-sec-lang" class="tampilan-section">
<span class="tampilan-sec-label" id="tampilan-sec-lang">Bahasa Aplikasi</span>
<div aria-label="Bahasa Aplikasi" class="glider-track tampilan-glider cols-2" id="language-picker" role="group">
<div aria-hidden="true" class="glider-pill"></div>
<button aria-pressed="true" class="glider-btn style-option-card" data-action="select-language" data-lang="id" type="button">
<i aria-hidden="true" class="ph ph-translate"></i>
<span>Bahasa Indonesia</span>
</button>
<button aria-pressed="false" class="glider-btn style-option-card" data-action="select-language" data-lang="en" type="button">
<i aria-hidden="true" class="ph ph-globe"></i>
<span>English</span>
</button>
</div>
</section>

<!-- Section 1: Paket Harmoni Warna -->
<section aria-labelledby="tampilan-sec-palette" class="tampilan-section">
<span class="tampilan-sec-label" id="tampilan-sec-palette">Paket Harmoni Warna</span>
<div class="tampilan-grid-2" id="palette-picker">
<button aria-pressed="true" class="tampilan-option-card style-option-card" data-action="select-palette" data-pal-preview="terracotta" data-palette="terracotta" type="button">
<span class="tampilan-card-left">
<span aria-hidden="true" class="pal-dots">
<span class="pal-dot pal-brand"></span>
<span class="pal-dot pal-paid"></span>
<span class="pal-dot pal-spot"></span>
</span>
<span class="tampilan-card-meta">
<span class="tampilan-card-title">Terracotta × Ocean</span>
<span class="tampilan-card-sub">Coral hangat &amp; biru laut</span>
</span>
</span>
<i aria-hidden="true" class="ph-fill ph-check-circle tampilan-check"></i>
</button>
<button aria-pressed="false" class="tampilan-option-card style-option-card" data-action="select-palette" data-pal-preview="cobalt" data-palette="cobalt" type="button">
<span class="tampilan-card-left">
<span aria-hidden="true" class="pal-dots">
<span class="pal-dot pal-brand"></span>
<span class="pal-dot pal-paid"></span>
<span class="pal-dot pal-spot"></span>
</span>
<span class="tampilan-card-meta">
<span class="tampilan-card-title">Cobalt × Sky</span>
<span class="tampilan-card-sub">Biru kobalt &amp; langit cerah</span>
</span>
</span>
<i aria-hidden="true" class="ph-fill ph-check-circle tampilan-check"></i>
</button>
<button aria-pressed="false" class="tampilan-option-card style-option-card" data-action="select-palette" data-pal-preview="charcoal" data-palette="charcoal" type="button">
<span class="tampilan-card-left">
<span aria-hidden="true" class="pal-dots">
<span class="pal-dot pal-brand"></span>
<span class="pal-dot pal-paid"></span>
<span class="pal-dot pal-spot"></span>
</span>
<span class="tampilan-card-meta">
<span class="tampilan-card-title">Charcoal × Pastel</span>
<span class="tampilan-card-sub">Grafit tegas &amp; aksen pastel</span>
</span>
</span>
<i aria-hidden="true" class="ph-fill ph-check-circle tampilan-check"></i>
</button>
<button aria-pressed="false" class="tampilan-option-card style-option-card" data-action="select-palette" data-pal-preview="indigo" data-palette="indigo" type="button">
<span class="tampilan-card-left">
<span aria-hidden="true" class="pal-dots">
<span class="pal-dot pal-brand"></span>
<span class="pal-dot pal-paid"></span>
<span class="pal-dot pal-spot"></span>
</span>
<span class="tampilan-card-meta">
<span class="tampilan-card-title">Indigo × Tangerine</span>
<span class="tampilan-card-sub">Nila tua &amp; jingga kontras</span>
</span>
</span>
<i aria-hidden="true" class="ph-fill ph-check-circle tampilan-check"></i>
</button>
</div>
</section>
<!-- Section 2: Mode Pencahayaan -->
<section aria-labelledby="tampilan-sec-theme" class="tampilan-section">
<span class="tampilan-sec-label" id="tampilan-sec-theme">Mode Pencahayaan</span>
<div aria-label="Mode Pencahayaan" class="glider-track tampilan-glider cols-3" id="theme-mode-picker" role="group">
<div aria-hidden="true" class="glider-pill"></div>
<button aria-pressed="true" class="glider-btn style-option-card" data-action="select-theme-mode" data-theme="light" type="button">
<i aria-hidden="true" class="ph ph-sun"></i>
<span>Terang</span>
</button>
<button aria-pressed="false" class="glider-btn style-option-card" data-action="select-theme-mode" data-theme="dark" type="button">
<i aria-hidden="true" class="ph ph-moon"></i>
<span>Gelap</span>
</button>
<button aria-pressed="false" class="glider-btn style-option-card" data-action="select-theme-mode" data-theme="auto" type="button">
<i aria-hidden="true" class="ph ph-desktop"></i>
<span>Otomatis</span>
</button>
</div>
</section>
<!-- Pratinjau Langsung Stempel Lunas -->
<div aria-live="polite" class="tampilan-preview-strip" id="tampilan-style-preview"><span class="tampilan-preview-meta"><strong class="tampilan-preview-title">Pratinjau Stempel</strong><span class="tampilan-preview-sub" id="hybrid-stamp-label"></span></span><span class="tampilan-preview-samples" id="hybrid-stamp-sample"></span></div>
<!-- Section 3: Gaya Stempel Lunas -->
<section aria-labelledby="tampilan-sec-stamp" class="tampilan-section" id="tab-tampilan-indikator">
<span class="tampilan-sec-label" id="tampilan-sec-stamp">Gaya Stempel Lunas</span>
<div aria-label="Gaya Stempel Lunas" class="glider-track tampilan-glider cols-3" id="indicator-style-picker" role="group">
<div aria-hidden="true" class="glider-pill"></div>
<button aria-pressed="true" class="glider-btn style-option-card" data-action="select-indicator-style" data-style="seal" type="button">Segel Bulat</button>
<button aria-pressed="false" class="glider-btn style-option-card" data-action="select-indicator-style" data-style="rosette" type="button">Lencana Roset</button>
<button aria-pressed="false" class="glider-btn style-option-card" data-action="select-indicator-style" data-style="shield" type="button">Perisai Sah</button>
</div>
</section>
<!-- Section 3: Suasana Latar Belakang -->
<section aria-labelledby="tampilan-sec-bg" class="tampilan-section">
<span class="tampilan-sec-label" id="tampilan-sec-bg">Suasana Latar Belakang</span>
<div class="tampilan-grid-2" id="texture-picker">
<button aria-pressed="true" class="tampilan-option-card style-option-card" data-action="select-texture" data-texture="aurora" type="button">
<span class="tampilan-card-left">
<span aria-hidden="true" class="bg-opt-icon"><i class="ph ph-palette"></i></span>
<span class="tampilan-card-meta">
<span class="tampilan-card-title">Aurora Ledger</span>
<span class="tampilan-card-sub">Pendar warna lembut</span>
</span>
</span>
<i aria-hidden="true" class="ph-fill ph-check-circle tampilan-check"></i>
</button>
<button aria-pressed="false" class="tampilan-option-card style-option-card" data-action="select-texture" data-texture="topo" type="button">
<span class="tampilan-card-left">
<span aria-hidden="true" class="bg-opt-icon"><i class="ph ph-waves"></i></span>
<span class="tampilan-card-meta">
<span class="tampilan-card-title">Gelombang Topografi</span>
<span class="tampilan-card-sub">Garis kontur dinamis</span>
</span>
</span>
<i aria-hidden="true" class="ph-fill ph-check-circle tampilan-check"></i>
</button>
<button aria-pressed="false" class="tampilan-option-card style-option-card" data-action="select-texture" data-texture="paper" type="button">
<span class="tampilan-card-left">
<span aria-hidden="true" class="bg-opt-icon"><i class="ph ph-dots-nine"></i></span>
<span class="tampilan-card-meta">
<span class="tampilan-card-title">Kertas Buku Kas</span>
<span class="tampilan-card-sub">Grid titik pembukuan</span>
</span>
</span>
<i aria-hidden="true" class="ph-fill ph-check-circle tampilan-check"></i>
</button>
<button aria-pressed="false" class="tampilan-option-card style-option-card" data-action="select-texture" data-texture="clean" type="button">
<span class="tampilan-card-left">
<span aria-hidden="true" class="bg-opt-icon"><i class="ph ph-circle-half"></i></span>
<span class="tampilan-card-meta">
<span class="tampilan-card-title">Polos Minimal</span>
<span class="tampilan-card-sub">Kanvas bersih fokus data</span>
</span>
</span>
<i aria-hidden="true" class="ph-fill ph-check-circle tampilan-check"></i>
</button>
</div>
</section>
<!-- Section 4: Format Nominal Kas -->
<section aria-labelledby="tampilan-sec-numfmt" class="tampilan-section">
<span class="tampilan-sec-label" id="tampilan-sec-numfmt">Format Nominal Kas</span>
<div aria-label="Format Nominal Kas" class="glider-track tampilan-glider cols-2" id="currency-format-picker" role="group">
<div aria-hidden="true" class="glider-pill"></div>
<button aria-pressed="true" class="glider-btn style-option-card" data-action="select-currency-format" data-format="full" type="button">Lengkap (Rp 50.000)</button>
<button aria-pressed="false" class="glider-btn style-option-card" data-action="select-currency-format" data-format="compact" type="button">Ringkas (Rp 50rb / 3,5 Jt)</button>
</div>
</section>
<section aria-labelledby="tampilan-sec-kasi" class="tampilan-section">
<span class="tampilan-sec-label" id="tampilan-sec-kasi">Maskot Interaktif</span>
<label class="kasi-setting" for="kasi-enabled">
<span class="tampilan-card-meta">
<span class="tampilan-card-title">Tampilkan Maskot Kasi</span>
<span class="tampilan-card-sub">Kucing kas interaktif yang menemani di papan utama</span>
</span>
<input checked id="kasi-enabled" role="switch" type="checkbox">
</label>
</section>
    </div>
    <div class="hybrid-settings-footer">
      <span id="tampilan-footer-note">Pengaturan tersimpan otomatis di perangkat ini.</span>
      <button type="button" class="btn" data-action="close-modal" id="tampilan-close-btn">Selesai</button>
    </div>
  </div>
</dialog>

<style>
  :global {
    /* === UNIVERSAL MONTH/YEAR PICKER (custom popup, no native input) === */

    .mpick {
      position: relative;
      display: block;
      flex: 1;
      min-width: 0;
    }

    .mpick > input.mpick {
      position: absolute;
      opacity: 0;
      width: 1px;
      height: 1px;
      margin: -1px;
      pointer-events: none;
      border: 0;
      padding: 0;
      clip-path: inset(50%);
      overflow: hidden;
      white-space: nowrap;
    }

    .mpick-field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
      min-height: 44px;
      padding: 10px 14px;
      background: var(--surface-2);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      color: var(--text-main);
      font-size: 13.5px;
      font-weight: 600;
      font-family: inherit;
      text-align: left;
      cursor: pointer;
      transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, transform 140ms ease;
    }

    .mpick-field:hover {
      border-color: var(--border-strong);
      background: var(--surface);
    }

    .mpick-field:active:not(:disabled) {
      transform: scale(0.99);
      transition-duration: 90ms;
    }

    .mpick.open .mpick-field,
    .mpick-field:focus-visible {
      background: var(--surface);
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-tint);
      outline: none;
    }

    .mpick-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mpick-label.is-placeholder {
      color: var(--text-faint);
      font-weight: 400;
    }

    .mpick-cal {
      flex-shrink: 0;
      font-size: 18px;
      color: var(--text-muted);
    }

    /* Floating popup matching Hybrid Kinetic design system */
    .mpick-pop {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      width: 100%;
      min-width: 260px;
      max-width: 320px;
      z-index: 140;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: var(--shadow-pop);
      padding: 14px;
      transform-origin: top center;
      animation: dropdownFadeIn 0.18s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .mpick-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }

    .mpick-year {
      font-family: var(--font-mono);
      font-size: 15px;
      font-weight: 700;
      letter-spacing: var(--tracking-tight);
      font-variant-numeric: tabular-nums;
      color: var(--text-main);
      text-align: center;
      flex: 1;
    }

    .mpick-nav {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      color: var(--text-main);
      font-size: 13px;
      cursor: pointer;
      padding: 0;
      transition: border-color 140ms ease, color 140ms ease, background-color 140ms ease;
    }

    .mpick-nav:hover {
      border-color: var(--border-strong);
      background: var(--surface-3);
      color: var(--accent-strong);
    }

    .mpick-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    .mpick-m {
      padding: 9px 0;
      border: 1.5px solid transparent;
      border-radius: 10px;
      background: var(--surface-2);
      color: var(--text-main);
      font-size: 12.5px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      text-align: center;
      transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
    }

    .mpick-m:hover {
      background: var(--surface);
      border-color: var(--border-strong);
      color: var(--accent-strong);
    }

    .mpick-m.selected {
      background: var(--accent-tint);
      border-color: var(--accent-border);
      color: var(--accent-strong);
      font-weight: 700;
    }

    .mpick-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid var(--border);
    }

    .mpick-link {
      border: none;
      background: transparent;
      color: var(--accent-strong);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      padding: 5px 10px;
      border-radius: 8px;
      transition: background-color 140ms ease, color 140ms ease;
    }

    .mpick-link:hover {
      background: var(--accent-tint);
      text-decoration: none;
    }

    .mpick-field:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .is-invalid > .mpick-field {
      border-color: var(--danger);
      outline: 2px solid var(--danger);
      outline-offset: 2px;
    }
  }
</style>
