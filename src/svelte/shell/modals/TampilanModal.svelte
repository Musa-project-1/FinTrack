<script lang="ts">
  import { closeModal } from '../../ui/modal';
  import { setBgTexture, setLanguage, setPalette, setTheme } from '../../ui/theme';
  import { setCurrencyFormat, setIndicatorStyle } from '../../handlers/navigation';

  const onClose = (e: MouseEvent) => { e.stopPropagation(); closeModal('modal-tampilan'); };
  const onLang = (lang: 'id' | 'en') => (e: MouseEvent) => { e.stopPropagation(); setLanguage(lang); };
  const onPalette = (pal: string) => (e: MouseEvent) => { e.stopPropagation(); setPalette(pal); };
  const onTheme = (mode: 'light' | 'dark' | 'auto') => (e: MouseEvent) => { e.stopPropagation(); setTheme(mode); };
  const onStyle = (style: string) => (e: MouseEvent) => { e.stopPropagation(); setIndicatorStyle(style); };
  const onTexture = (tex: string) => (e: MouseEvent) => { e.stopPropagation(); setBgTexture(tex); };
  const onFormat = (fmt: string) => (e: MouseEvent) => { e.stopPropagation(); setCurrencyFormat(fmt); };
</script>

<dialog class="modal-overlay hybrid-dialog" id="modal-tampilan" aria-labelledby="modal-tampilan-title">
  <div class="modal-content modal-md hybrid-settings">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
    <div class="hybrid-settings-header">
      <div>
        <h2 id="modal-tampilan-title">Tampilan &amp; Bahasa</h2>
        <p id="modal-tampilan-subtitle">Sesuaikan bahasa, tema warna, pencahayaan, dan gaya tampilan aplikasi</p>
      </div>
      <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup" onclick={onClose}><i class="ph-bold ph-x" aria-hidden="true"></i></button>
    </div>
    <div class="hybrid-settings-body">

<!-- Section 0: Bahasa Aplikasi -->
<section aria-labelledby="tampilan-sec-lang" class="tampilan-section">
<span class="tampilan-sec-label" id="tampilan-sec-lang">Bahasa Aplikasi</span>
<div aria-label="Bahasa Aplikasi" class="glider-track tampilan-glider cols-2" id="language-picker" role="group">
<div aria-hidden="true" class="glider-pill"></div>
<button aria-pressed="true" class="glider-btn style-option-card" data-action="select-language" data-lang="id" type="button" onclick={onLang('id')}>
<i aria-hidden="true" class="ph ph-translate"></i>
<span>Bahasa Indonesia</span>
</button>
<button aria-pressed="false" class="glider-btn style-option-card" data-action="select-language" data-lang="en" type="button" onclick={onLang('en')}>
<i aria-hidden="true" class="ph ph-globe"></i>
<span>English</span>
</button>
</div>
</section>

<!-- Section 1: Paket Harmoni Warna -->
<section aria-labelledby="tampilan-sec-palette" class="tampilan-section">
<span class="tampilan-sec-label" id="tampilan-sec-palette">Paket Harmoni Warna</span>
<div class="tampilan-grid-2" id="palette-picker">
<button aria-pressed="true" class="tampilan-option-card style-option-card" data-action="select-palette" data-pal-preview="terracotta" data-palette="terracotta" type="button" onclick={onPalette('terracotta')}>
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
<button aria-pressed="false" class="tampilan-option-card style-option-card" data-action="select-palette" data-pal-preview="cobalt" data-palette="cobalt" type="button" onclick={onPalette('cobalt')}>
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
<button aria-pressed="false" class="tampilan-option-card style-option-card" data-action="select-palette" data-pal-preview="charcoal" data-palette="charcoal" type="button" onclick={onPalette('charcoal')}>
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
<button aria-pressed="false" class="tampilan-option-card style-option-card" data-action="select-palette" data-pal-preview="indigo" data-palette="indigo" type="button" onclick={onPalette('indigo')}>
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
<button aria-pressed="true" class="glider-btn style-option-card" data-action="select-theme-mode" data-theme="light" type="button" onclick={onTheme('light')}>
<i aria-hidden="true" class="ph ph-sun"></i>
<span>Terang</span>
</button>
<button aria-pressed="false" class="glider-btn style-option-card" data-action="select-theme-mode" data-theme="dark" type="button" onclick={onTheme('dark')}>
<i aria-hidden="true" class="ph ph-moon"></i>
<span>Gelap</span>
</button>
<button aria-pressed="false" class="glider-btn style-option-card" data-action="select-theme-mode" data-theme="auto" type="button" onclick={onTheme('auto')}>
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
<button aria-pressed="true" class="glider-btn style-option-card" data-action="select-indicator-style" data-style="seal" type="button" onclick={onStyle('seal')}>Segel Bulat</button>
<button aria-pressed="false" class="glider-btn style-option-card" data-action="select-indicator-style" data-style="rosette" type="button" onclick={onStyle('rosette')}>Lencana Roset</button>
<button aria-pressed="false" class="glider-btn style-option-card" data-action="select-indicator-style" data-style="shield" type="button" onclick={onStyle('shield')}>Perisai Sah</button>
</div>
</section>
<!-- Section 3: Suasana Latar Belakang -->
<section aria-labelledby="tampilan-sec-bg" class="tampilan-section">
<span class="tampilan-sec-label" id="tampilan-sec-bg">Suasana Latar Belakang</span>
<div class="tampilan-grid-2" id="texture-picker">
<button aria-pressed="true" class="tampilan-option-card style-option-card" data-action="select-texture" data-texture="aurora" type="button" onclick={onTexture('aurora')}>
<span class="tampilan-card-left">
<span aria-hidden="true" class="bg-opt-icon"><i class="ph ph-palette"></i></span>
<span class="tampilan-card-meta">
<span class="tampilan-card-title">Aurora Ledger</span>
<span class="tampilan-card-sub">Pendar warna lembut</span>
</span>
</span>
<i aria-hidden="true" class="ph-fill ph-check-circle tampilan-check"></i>
</button>
<button aria-pressed="false" class="tampilan-option-card style-option-card" data-action="select-texture" data-texture="topo" type="button" onclick={onTexture('topo')}>
<span class="tampilan-card-left">
<span aria-hidden="true" class="bg-opt-icon"><i class="ph ph-waves"></i></span>
<span class="tampilan-card-meta">
<span class="tampilan-card-title">Gelombang Topografi</span>
<span class="tampilan-card-sub">Garis kontur dinamis</span>
</span>
</span>
<i aria-hidden="true" class="ph-fill ph-check-circle tampilan-check"></i>
</button>
<button aria-pressed="false" class="tampilan-option-card style-option-card" data-action="select-texture" data-texture="paper" type="button" onclick={onTexture('paper')}>
<span class="tampilan-card-left">
<span aria-hidden="true" class="bg-opt-icon"><i class="ph ph-dots-nine"></i></span>
<span class="tampilan-card-meta">
<span class="tampilan-card-title">Kertas Buku Kas</span>
<span class="tampilan-card-sub">Grid titik pembukuan</span>
</span>
</span>
<i aria-hidden="true" class="ph-fill ph-check-circle tampilan-check"></i>
</button>
<button aria-pressed="false" class="tampilan-option-card style-option-card" data-action="select-texture" data-texture="clean" type="button" onclick={onTexture('clean')}>
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
<button aria-pressed="true" class="glider-btn style-option-card" data-action="select-currency-format" data-format="full" type="button" onclick={onFormat('full')}>Lengkap (Rp 50.000)</button>
<button aria-pressed="false" class="glider-btn style-option-card" data-action="select-currency-format" data-format="compact" type="button" onclick={onFormat('compact')}>Ringkas (Rp 50rb / 3,5 Jt)</button>
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
      <button type="button" class="btn" data-action="close-modal" id="tampilan-close-btn" onclick={onClose}>Selesai</button>
    </div>
  </div>
</dialog>

<style>
  :global {
    /* === TAMPILAN SEGMENTED MODAL (VERCEL / LINEAR BENCHMARK) === */
    .tampilan-segmented-modal {
      width: min(580px, calc(100vw - 28px)) !important;
      max-width: 100%;
      padding: 20px !important;
      display: flex;
      flex-direction: column;
      overflow-x: hidden !important;
    }

    .tampilan-top-tabs {
      display: flex;
      gap: 4px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--r-pill);
      padding: 4px;
      margin-bottom: 18px;
    }

    .tampilan-top-tabs .tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 36px;
      padding: 7px 14px;
      font-size: 12.5px;
      font-weight: 700;
      color: var(--text-muted);
      border-radius: var(--r-pill);
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      transition: background-color var(--t-fast), color var(--t-fast), border-color var(--t-fast), box-shadow var(--t-fast);
      white-space: nowrap;
    }

    .tampilan-top-tabs .tab-btn:hover:not(.active) {
      color: var(--text-main);
      background: color-mix(in oklab, var(--surface-3) 65%, transparent);
    }

    .tampilan-top-tabs .tab-btn:focus-visible,
    .tampilan-card-tile:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .tampilan-top-tabs .tab-btn.active {
      background: var(--surface);
      color: var(--text-main);
      border-color: var(--border);
      box-shadow: var(--hybrid-card-shadow);
    }

    .tampilan-tab-body {
      min-height: 280px;
    }

    .tampilan-tab-body .tab-content {
      display: none;
      flex-direction: column;
      gap: 14px;
    }

    .tampilan-tab-body .tab-content.active {
      display: flex;
    }

    .tampilan-section {
      padding: 0;
    }

    .tampilan-section-label {
      margin-bottom: 6px;
      padding: 0 2px;
    }

    .tampilan-section-label span {
      display: block;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-faint);
    }

    .tampilan-section-label small {
      font-size: 11.5px;
      color: var(--text-muted);
    }

    /* Grids inside sections */
    .tampilan-grid {
      display: grid;
      gap: 8px;
    }
    .tampilan-grid-2 { grid-template-columns: repeat(2, 1fr); }
    .tampilan-grid-3 { grid-template-columns: repeat(3, 1fr); }
    .tampilan-grid-4 { grid-template-columns: repeat(4, 1fr); }

    .tampilan-card-tile {
      border: 1px solid var(--border) !important;
      border-radius: var(--r-md) !important;
      background: var(--surface) !important;
      padding: 9px 12px !important;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      cursor: pointer;
      text-align: left;
      transition: background-color var(--t-fast), border-color var(--t-fast), color var(--t-fast), box-shadow var(--t-fast);
      width: 100%;
    }

    .tampilan-card-tile:hover {
      background: var(--surface-2) !important;
      border-color: var(--border-strong) !important;
    }

    .tampilan-card-tile.active {
      background: var(--accent-tint) !important;
      border-color: var(--accent) !important;
      box-shadow: inset 0 0 0 1px var(--accent) !important;
    }

    .indicator-style-grid {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      overflow: hidden;
      background: var(--surface);
    }

    .style-option-card {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 12px;
      border: none;
      border-bottom: 1px solid var(--border);
      border-radius: 0;
      background: transparent;
      cursor: pointer;
      text-align: left;
      transition: background 0.12s ease;
      min-width: 0;
    }
    .style-option-card:last-child { border-bottom: none; }
    .style-option-card:hover { background: var(--surface-2); }
    .style-option-card:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
    .style-option-card.active { background: var(--accent-tint); box-shadow: inset 1px 0 0 0 var(--accent); }

    .style-option-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1 1 0%;
    }

    .style-preview-wrap {
      width: 32px;
      height: 32px;
      padding: 6px;
      box-sizing: border-box;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--r-sm);
      background: var(--surface-2);
      border: 1px solid var(--border);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .color-danger { color: #e11d48; }
    .color-warning { color: #b45309; }

    .style-option-info {
      min-width: 0;
      flex: 1 1 0%;
    }
    .style-option-info strong { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-main); }
    .style-option-info span {
      display: block;
      font-size: 11px;
      color: var(--text-muted);
      white-space: normal;
      line-height: 1.3;
    }

    .style-check-indicator {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      border-radius: var(--r-pill);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      opacity: 0;
      transform: scale(0.92);
      transition: opacity 0.16s ease-out, transform 0.16s cubic-bezier(0.23, 1, 0.32, 1);
      background: var(--accent);
      color: var(--accent-ink);
    }
    .style-option-card.active .style-check-indicator { opacity: 1; transform: scale(1); }

    /* === TAMPILAN RESPONSIVE MOBILE (<= 768px) === */
    @media (max-width: 768px) {
      #modal-tampilan .modal-header-standard {
        margin-bottom: 8px;
        padding-bottom: 8px;
        gap: 8px;
      }

      #modal-tampilan .modal-badge-icon {
        width: 34px;
        height: 34px;
        font-size: 16px;
      }

      #modal-tampilan .modal-title-wrap h2 {
        font-size: 15px;
      }

      #modal-tampilan .modal-title-wrap p {
        font-size: 11px;
        line-height: 1.3;
      }

      .tampilan-segmented-modal {
        padding: 14px 12px !important;
      }

      .tampilan-top-tabs {
        gap: 3px;
        padding: 3px;
        margin-bottom: 10px;
      }

      .tampilan-top-tabs .tab-btn {
        padding: 6px 4px;
        font-size: 11px;
        gap: 4px;
      }

      .tampilan-top-tabs .tab-btn i {
        font-size: 13px;
      }

      .tampilan-top-tabs .tab-btn span {
        display: inline !important;
        font-size: 11px;
      }

      .tampilan-tab-body {
        min-height: auto;
      }

      .tampilan-tab-body .tab-content {
        gap: 10px;
      }

      .tampilan-section-label {
        margin-bottom: 4px;
        padding: 0;
      }

      .tampilan-section-label span {
        font-size: 11px;
        letter-spacing: 0.08em;
      }

      .tampilan-section-label small {
        display: none !important;
      }

      /* Grid 3 (Tema & Tekstur): 3 kolom sebaris, tanpa kartu orphan */
      .tampilan-grid-3 {
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 6px !important;
      }

      /* Grid 4 (Palet Aksen Warna): 4 kolom sebaris ramping */
      .tampilan-grid-4 {
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 5px !important;
      }

      .tampilan-grid-2 {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 6px !important;
      }

      /* Kartu Opsi Tema & Tekstur */
      .tampilan-card-tile {
        padding: 6px 8px !important;
        min-height: 44px !important;
        gap: 6px !important;
        justify-content: center !important;
        border-radius: var(--r-sm) !important;
      }

      .tampilan-card-tile .flex-row {
        gap: 6px !important;
        justify-content: center !important;
        width: 100% !important;
      }

      .tampilan-card-tile .style-option-info {
        text-align: center;
      }

      .tampilan-card-tile .style-option-info strong {
        font-size: 11px !important;
        line-height: 1.2;
        display: block;
      }

      .tampilan-card-tile .style-option-info span {
        display: none !important;
      }

      .tampilan-card-tile .style-check-indicator {
        display: none !important;
      }
    }

    #palette-picker [data-palette="terracotta"] { --palette-sample: var(--sample-terracotta); }
    #palette-picker [data-palette="cobalt"] { --palette-sample: var(--sample-cobalt); }
    #palette-picker [data-palette="charcoal"] { --palette-sample: var(--sample-charcoal); }
    #palette-picker [data-palette="indigo"] { --palette-sample: var(--sample-indigo); }
    #palette-picker .style-preview-wrap { color: var(--palette-sample); }

    #indicator-style-picker .style-option-card { min-height: 50px; }
    #indicator-style-picker .stamp-preview {
      min-width: 44px;
      min-height: 38px;
      display: grid;
      place-items: center;
    }
  }
</style>
