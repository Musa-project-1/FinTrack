  <div class="nav-progress" id="nav-progress" aria-hidden="true"></div>

  <!-- 1. Sticky Glass Navbar -->
  <header class="landing-nav" id="landing-nav">
    <div class="nav-inner">
      <a href="#hero" class="nav-brand" id="nav-brand-home">
        <img src="icons/icon-light-192.svg" alt="Logo Finkas" class="brand-logo-img logo-light" width="32" height="32">
        <img src="icons/icon-192.svg" alt="Logo Finkas" class="brand-logo-img logo-dark" width="32" height="32">
        <span class="brand-title">Finkas</span>
      </a>

      <nav class="nav-links" id="nav-links" aria-label="Navigasi utama">
        <a href="#fitur" class="nav-spy-link">FITUR</a>
        <a href="#matriks" class="nav-spy-link">MATRIKS</a>
        <a href="#demo-simulator" class="nav-spy-link">DEMO</a>
        <a href="#faq" class="nav-spy-link">FAQ</a>
      </nav>

      <div class="nav-right">
        <button type="button" class="btn-theme-toggle" id="btn-toggle-theme" aria-label="Ubah Tema Terang atau Gelap" title="Ganti Mode Terang / Gelap">
          <svg class="celestial-svg" id="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <mask id="celestial-moon-mask">
                <rect x="0" y="0" width="24" height="24" fill="white"></rect>
                <circle class="celestial-cutout" cx="17.5" cy="6.5" r="7" fill="black"></circle>
              </mask>
            </defs>
            <g class="celestial-rays" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <line x1="12" y1="2" x2="12" y2="4.2"></line>
              <line x1="12" y1="19.8" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="6.49" y2="6.49"></line>
              <line x1="17.51" y1="17.51" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="4.2" y2="12"></line>
              <line x1="19.8" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="6.49" y2="17.51"></line>
              <line x1="17.51" y1="6.49" x2="19.07" y2="4.93"></line>
            </g>
            <circle class="celestial-disc" cx="12" cy="12" r="7.5" fill="currentColor" mask="url(#celestial-moon-mask)"></circle>
          </svg>
        </button>
        <button type="button" class="btn-nav-cta" id="btn-nav-portal">
          <span>PILIH GRUP KAS</span>
          <i class="ph-bold ph-arrow-right" aria-hidden="true"></i>
        </button>
        <button type="button" class="nav-hamburger" id="nav-hamburger" aria-label="Buka menu navigasi" aria-expanded="false" aria-controls="nav-drawer">
          <i class="ph-bold ph-list" id="hamburger-icon" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </header>

  <div class="nav-drawer" id="nav-drawer" aria-hidden="true" inert>
    <nav class="drawer-links" aria-label="Navigasi mobile">
      <a href="#fitur" class="drawer-link nav-spy-link">FITUR</a>
      <a href="#matriks" class="drawer-link nav-spy-link">MATRIKS</a>
      <a href="#demo-simulator" class="drawer-link nav-spy-link">DEMO</a>
      <a href="#faq" class="drawer-link nav-spy-link">FAQ</a>
      <button type="button" class="drawer-cta" id="btn-nav-portal-drawer">
        <span>PILIH GRUP KAS</span>
        <i class="ph-bold ph-arrow-right" aria-hidden="true"></i>
      </button>
    </nav>
  </div>
  <div class="nav-backdrop" id="nav-backdrop" aria-hidden="true"></div>

  <!-- SCREEN 1: LANDING PAGE -->
  <main id="state-welcome">
    <div class="sky-stage" id="sky-stage" aria-hidden="true">
      <div class="sky-layer sky-layer-sky">
        <span class="sky-image"></span>
        <span class="sky-mist"></span>
        <span class="sky-scrim"></span>
      </div>
      <div class="sky-layer sky-layer-ridge-far">
        <span class="ridge ridge-far"></span>
      </div>
      <canvas class="horizon-canvas" id="horizon-canvas" aria-hidden="true"></canvas>
      <div class="sky-layer sky-layer-clouds">
        <span class="cloud-glow"></span>
        <span class="cloud-bank cloud-bank-1"></span>
        <span class="cloud-bank cloud-bank-2"></span>
        <span class="cloud-bank cloud-bank-3"></span>
        <span class="cloud-bank cloud-bank-4"></span>
        <span class="cloud-bank cloud-bank-5"></span>
        <span class="cloud-bank cloud-bank-6"></span>
      </div>
      <div class="sky-layer sky-layer-land">
        <span class="ridge ridge-near"></span>
      </div>
    </div>

    <div class="landing-wrap">
      <!-- 2. Centered Hero -->
      <section class="landing-hero" id="hero">
        <div class="hero-content">
          <span class="lp-turn lp-turn-hero" aria-hidden="true">
            <svg class="lp-turn-svg" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
              <path class="lp-turn-path" d="M0.5,0.5 H99.5 V99.5 H0.5 Z" pathLength="100"></path>
            </svg>
          </span>

          <span class="badge-pill hero-eyebrow">
            <i class="ph-fill ph-users-three" aria-hidden="true"></i>
            <span>KAS RT/RW · ARISAN</span>
            <span>· KAS KELAS</span>
          </span>

          <h1>
            <span class="hero-line-mask"><span class="hero-line hero-line-1">Pembukuan Kas</span></span>
            <span class="hero-line-mask"><span class="hero-line hero-line-2">Komunitas yang Rapi,</span></span>
            <span class="hero-line-mask"><span class="hero-line hero-line-3"><em class="hero-em">Jujur<svg class="hero-em-arc" viewBox="0 0 180 18" preserveAspectRatio="none" aria-hidden="true"><path pathLength="100" d="M3,13 C48,4 128,3 177,11"></path></svg></em>, dan Terbuka</span></span>
          </h1>

          <p class="hero-sub">Kelola kas kelompok, pantau iuran bulanan, dan laporkan keuangan warga secara transparan tanpa rekap manual berulang.</p>

          <div class="hero-cta-group">
            <button type="button" class="btn-hero-primary" id="btn-to-list">
              <span>PILIH GRUP KAS</span>
              <i class="ph-bold ph-arrow-right" aria-hidden="true"></i>
            </button>
            <a href="#demo-simulator" class="btn-hero-ghost">COBA DEMO</a>
          </div>

          <div class="hero-trust-row">
            <span><i class="ph-fill ph-shield-check" aria-hidden="true"></i> PIN TERISOLASI</span>
            <span><i class="ph-fill ph-cloud-slash" aria-hidden="true"></i> 100% OFFLINE-READY</span>
            <span><i class="ph-fill ph-table" aria-hidden="true"></i> MATRIKS 12 BULAN</span>
          </div>
        </div>
      </section>

      <!-- 3. Product Showcase Band & Optical Audit Lens -->
      <section class="product-band" data-lp-journey="clouds-in" aria-label="Pratinjau Buku Kas RT 05 Melati">
        <div class="product-band-inner">
          <div class="stage-frame" data-lp-reveal="blur">
            <span class="lp-turn lp-turn-mockup" aria-hidden="true">
              <svg class="lp-turn-svg" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
                <path class="lp-turn-path" d="M0.5,0.5 H99.5 V99.5 H0.5 Z" pathLength="100"></path>
              </svg>
            </span>

            <div class="stage-layer-human">
              <div class="stage-topbar">
                <div class="stage-group-meta">
                  <span class="stage-group-name">Kas RT 05 / RW 03 Melati</span>
                  <span class="stage-group-year">Tahun Buku 2026</span>
                </div>
                <span class="stage-sync-chip"><i class="ph-bold ph-check-circle" aria-hidden="true"></i> <span>Tersinkron</span></span>
              </div>

              <div class="stage-content">
                <div class="vault-card">
                  <div class="mock-card-label">SALDO KAS AKTIF</div>
                  <div class="mock-saldo font-mono" id="hero-demo-saldo">Rp 14.850.000</div>
                  <div class="flow-strip">
                    <div class="flow-cell flow-in"><span class="flow-label">MASUK</span><span class="flow-val font-mono">+Rp 16.500.000</span></div>
                    <div class="flow-cell flow-out"><span class="flow-label">KELUAR</span><span class="flow-val font-mono">−Rp 1.650.000</span></div>
                  </div>
                  <div class="vault-compliance">88% Lunas · Iuran Rp 50.000/bln</div>
                </div>

                <div class="mock-roster">
                  <div class="mock-roster-item"><span>Bambang Sudiro <span class="mock-roster-role">· Ketua RT</span></span><span class="mock-badge paid">LUNAS</span></div>
                  <div class="mock-roster-item"><span>Siti Aminah <span class="mock-roster-role">· Bendahara</span></span><span class="mock-badge paid">LUNAS</span></div>
                  <div class="mock-roster-item"><span>Budi Santoso</span><span class="mock-badge unpaid" id="hero-demo-budi-badge">BELUM</span></div>
                </div>
              </div>

              <div class="stage-footer-bar">
                <span>Catat Kas 3-Langkah: Rincian &rarr; Anggota &rarr; Tinjau</span>
                <span>Ekspor WIB PDF/CSV</span>
              </div>
            </div>

            <div class="stage-layer-audit" aria-hidden="true">
              <div class="stage-topbar">
                <div class="stage-group-meta">
                  <span class="stage-group-name">AUDIT SERVER · SCRYPT + HMAC-SHA256</span>
                  <span class="stage-group-year">ISOLASI: RT05-MELATI (LOCKED)</span>
                </div>
                <span class="audit-chip">VERIFIED · UTC+7 WIB</span>
              </div>

              <div class="stage-content">
                <div class="vault-card">
                  <div class="mock-card-label">VERIFIKASI FORMULA LEDGER</div>
                  <div class="audit-formula" id="audit-saldo-formula">Rp 14.850.000 = 297 SETORAN × Rp 50.000</div>
                  <div class="flow-strip">
                    <div class="flow-cell"><span class="flow-label">INTEGRITAS ARUS MASUK</span><span class="flow-val font-mono">330 MUTASI TERVALIDASI</span></div>
                    <div class="flow-cell"><span class="flow-label">ANTRIAN OFFLINE</span><span class="flow-val font-mono">0 PENDING SYNC</span></div>
                  </div>
                  <div class="vault-compliance">0 SELISIH HITUNG · HASH RANTAI UTUH</div>
                </div>

                <div class="mock-roster">
                  <div class="mock-roster-item"><span>#TX-2611-01 · HASH 9F4A</span><span class="mock-badge paid">VERIFIED</span></div>
                  <div class="mock-roster-item"><span>#TX-2611-02 · HASH 3C8E</span><span class="mock-badge paid">VERIFIED</span></div>
                  <div class="mock-roster-item"><span>#TX-2611-03 · HASH 7B2D</span><span class="mock-badge unpaid" id="audit-budi-badge">PENDING</span></div>
                </div>
              </div>

              <div class="stage-footer-bar">
                <span>END-TO-END INTEGRITY · 0 SELISIH HITUNG</span>
                <span>JSON + CSV + PDF WIB</span>
              </div>
            </div>

            <div class="audit-lens-rail" id="audit-lens-rail" role="slider" tabindex="0" aria-label="Geser Lensa Transparansi Audit" aria-valuemin="0" aria-valuemax="100" aria-valuenow="76">
              <span class="audit-lens-grip"><i class="ph-bold ph-arrows-left-right" aria-hidden="true"></i> AUDIT</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. Quiet Trust Band -->
      <section class="trust-band" aria-label="Keunggulan Operasional Finkas">
        <div class="trust-band-inner" data-lp-reveal="fade">
          <div class="trust-stat"><i class="ph-fill ph-cloud-slash" aria-hidden="true"></i><span class="trust-stat-label">100% OFFLINE-FIRST</span></div>
          <div class="trust-band-sep" aria-hidden="true"></div>
          <div class="trust-stat"><i class="ph-fill ph-lock-key" aria-hidden="true"></i><span class="trust-stat-label">PIN TERISOLASI SERVER</span></div>
          <div class="trust-band-sep" aria-hidden="true"></div>
          <div class="trust-stat"><i class="ph-fill ph-table" aria-hidden="true"></i><span class="trust-stat-label">MATRIKS IURAN 12 BULAN</span></div>
          <div class="trust-band-sep" aria-hidden="true"></div>
          <div class="trust-stat"><i class="ph-fill ph-chat-circle-dots" aria-hidden="true"></i><span class="trust-stat-label">LAPORAN WIB &amp; WHATSAPP</span></div>
        </div>
      </section>

      <!-- 5. Split Ledger Dossier (#fitur) -->
      <section id="fitur" class="landing-section" data-lp-journey="land-in">
        <div class="section-header">
          <h2>Dirancang Khusus untuk Pengurus Kas</h2>
          <p>Pilih setiap alur di indeks kiri untuk menguji langsung cara kerja Finkas di panel kanan.</p>
        </div>

        <div class="dossier-shell" data-lp-reveal="fade">
          <div class="dossier-list" role="tablist" aria-label="Indeks kemampuan Finkas">
            <span class="dossier-indicator" id="dossier-indicator" aria-hidden="true"></span>

            <button type="button" class="dossier-row is-active" role="tab" id="tab-dossier-0" aria-selected="true" aria-controls="panel-dossier-0" data-dossier-tab="0">
              <span class="dossier-row-head"><span class="dossier-num">01</span><span class="dossier-title">Wizard Catat Kas 3-Langkah</span></span>
              <span class="dossier-body"><span class="dossier-body-inner"><span class="dossier-desc">Catat iuran massal atau kas operasional melalui tiga tahap ringkas: rincian tagihan, checklist anggota, lalu tinjau dampak saldo.</span><span class="dossier-tag">ALUR TERPANDU · ANTI SALAH INPUT</span></span></span>
            </button>

            <button type="button" class="dossier-row" role="tab" id="tab-dossier-1" aria-selected="false" aria-controls="panel-dossier-1" data-dossier-tab="1">
              <span class="dossier-row-head"><span class="dossier-num">02</span><span class="dossier-title">Bayar Kilat &amp; Rekap WhatsApp</span></span>
              <span class="dossier-body"><span class="dossier-body-inner"><span class="dossier-desc">Lunasi iuran sekali ketuk dan bagikan ringkasan kas bulanan berformat rapi siap tempel ke grup WhatsApp warga.</span><span class="dossier-tag is-warm">SIAP SALIN · FORMAT GRUP WA</span></span></span>
            </button>

            <button type="button" class="dossier-row" role="tab" id="tab-dossier-2" aria-selected="false" aria-controls="panel-dossier-2" data-dossier-tab="2">
              <span class="dossier-row-head"><span class="dossier-num">03</span><span class="dossier-title">Antrean Offline IndexedDB</span></span>
              <span class="dossier-body"><span class="dossier-body-inner"><span class="dossier-desc">Tetap catat transaksi iuran di lapangan tanpa sinyal internet. Mutasi disimpan di IndexedDB dan disinkronkan saat kembali online.</span><span class="dossier-tag">OFFLINE-FIRST · ZERO DATA LOSS</span></span></span>
            </button>

            <button type="button" class="dossier-row" role="tab" id="tab-dossier-3" aria-selected="false" aria-controls="panel-dossier-3" data-dossier-tab="3">
              <span class="dossier-row-head"><span class="dossier-num">04</span><span class="dossier-title">Laporan Buku Kas WIB</span></span>
              <span class="dossier-body"><span class="dossier-body-inner"><span class="dossier-desc">Perhitungan saldo awal, arus masuk/keluar, dan saldo akhir terkunci pada zona waktu Asia/Jakarta (UTC+7) siap cetak PDF dan CSV.</span><span class="dossier-tag is-warm">PRESISI UTC+7 · PDF &amp; CSV</span></span></span>
            </button>

            <button type="button" class="dossier-row" role="tab" id="tab-dossier-4" aria-selected="false" aria-controls="panel-dossier-4" data-dossier-tab="4">
              <span class="dossier-row-head"><span class="dossier-num">05</span><span class="dossier-title">Isolasi PIN &amp; Audit Admin</span></span>
              <span class="dossier-body"><span class="dossier-body-inner"><span class="dossier-desc">Setiap grup terisolasi dengan PIN 4 angka hash scrypt, sesi HMAC bertanda tangan, serta log aktivitas khusus Super Admin.</span><span class="dossier-tag">SCRYPT + HMAC-SHA256 · MULTI-GRUP</span></span></span>
            </button>
          </div>

          <div class="dossier-stage">
            <div class="specimen-topbar">
              <span>PRATINJAU LANGSUNG</span>
              <span class="specimen-counter" id="dossier-counter">01 / 05</span>
            </div>

            <div class="specimen-body">
              <div class="specimen-pane is-active" role="tabpanel" id="panel-dossier-0" aria-labelledby="tab-dossier-0">
                <div class="specimen-heading">Setor Iuran Massal · April 2026</div>
                <div class="specimen-pills">
                  <button type="button" class="specimen-step-btn is-active" data-wiz-step="1">1. RINCIAN</button>
                  <button type="button" class="specimen-step-btn" data-wiz-step="2">2. ANGGOTA</button>
                  <button type="button" class="specimen-step-btn" data-wiz-step="3">3. TINJAU</button>
                </div>
                <div class="specimen-lines" id="specimen-wiz-lines">
                  <div class="specimen-line"><span>Jenis Transaksi</span><span class="specimen-val">Iuran Bulanan Warga</span></div>
                  <div class="specimen-line"><span>Nominal per Anggota</span><span class="specimen-val is-paid">+Rp 50.000</span></div>
                  <div class="specimen-line"><span>Periode Buku Kas</span><span class="specimen-mono">APRIL 2026 (WIB)</span></div>
                </div>
                <div class="specimen-foot-note" id="specimen-wiz-note">TAHAP 1/3 · VERIFIKASI NOMINAL IURAN PER KEPALA KELUARGA</div>
              </div>

              <div class="specimen-pane" role="tabpanel" id="panel-dossier-1" aria-labelledby="tab-dossier-1" hidden>
                <div class="specimen-heading">Ringkasan Siap Tempel Grup Warga</div>
                <pre class="specimen-wa-pre" id="specimen-wa-text">*REKAP KAS RT 05 MELATI — APR 2026*
Status Iuran : 24 / 27 Warga Lunas
Kas Masuk    : +Rp 16.500.000
Kas Keluar   : -Rp 1.650.000
Saldo Akhir  : *Rp 14.850.000*
Update WIB   : Terkunci UTC+7</pre>
                <div class="specimen-action-row">
                  <button type="button" class="specimen-btn" id="specimen-copy-wa"><i class="ph-bold ph-copy" aria-hidden="true"></i><span>Salin Teks WA</span></button>
                  <span class="specimen-mono">TIDAK PERLU REKAP ULANG</span>
                </div>
              </div>

              <div class="specimen-pane" role="tabpanel" id="panel-dossier-2" aria-labelledby="tab-dossier-2" hidden>
                <div class="specimen-heading">Mutasi Lapangan Tanpa Sinyal</div>
                <div class="specimen-lines">
                  <div class="specimen-line"><span><strong>#Q-01</strong> &middot; Setoran Budi (Apr)</span><span class="specimen-status-tag" id="queue-status-1">ANTREAN LOKAL</span></div>
                  <div class="specimen-line"><span><strong>#Q-02</strong> &middot; Iuran Kas RT (+Rp 50.000)</span><span class="specimen-status-tag" id="queue-status-2">ANTREAN LOKAL</span></div>
                </div>
                <div class="specimen-action-row">
                  <button type="button" class="specimen-btn" id="specimen-sync-btn"><i class="ph-bold ph-arrows-clockwise" aria-hidden="true"></i><span>Simulasikan Kembali Online</span></button>
                  <span class="specimen-mono">TERIKAT ID GRUP</span>
                </div>
              </div>

              <div class="specimen-pane" role="tabpanel" id="panel-dossier-3" aria-labelledby="tab-dossier-3" hidden>
                <div class="specimen-heading">Neraca Tutup Buku · UTC+7 WIB</div>
                <div class="specimen-pills">
                  <button type="button" class="specimen-step-btn is-active" data-export-fmt="PDF">PDF SIAP CETAK</button>
                  <button type="button" class="specimen-step-btn" data-export-fmt="CSV">CSV EXCEL</button>
                </div>
                <div class="specimen-lines">
                  <div class="specimen-line"><span>Saldo Awal Bulan</span><span class="specimen-val">Rp 0</span></div>
                  <div class="specimen-line"><span>Total Arus Masuk</span><span class="specimen-val is-paid">+Rp 16.500.000</span></div>
                  <div class="specimen-line"><span>Total Kas Keluar</span><span class="specimen-val is-danger">-Rp 1.650.000</span></div>
                  <div class="specimen-line is-double"><span>Saldo Akhir (UTC+7 WIB)</span><span class="specimen-val">Rp 14.850.000</span></div>
                </div>
                <div class="specimen-foot-note" id="specimen-export-meta">laporan-kas-rt05-apr2026-wib.pdf &middot; A4 Portrait</div>
              </div>

              <div class="specimen-pane" role="tabpanel" id="panel-dossier-4" aria-labelledby="tab-dossier-4" hidden>
                <div class="specimen-heading">Ruang Kas Terisolasi per Grup</div>
                <div class="specimen-lines">
                  <div class="specimen-line"><span>RT 05 / RW 03 Melati</span><span class="specimen-status-tag is-synced">SESI AKTIF</span></div>
                  <div class="specimen-line"><span>Arisan Ibu-Ibu Blok C</span><span class="specimen-status-tag">TERISOLASI</span></div>
                  <div class="specimen-line"><span>Verifikasi Kriptografi</span><span class="specimen-mono">HASH: scrypt</span></div>
                </div>
                <div class="specimen-foot-note">SESI: HMAC-SHA256 OK &middot; DATA ANTAR GRUP TIDAK PERNAH BERCAMPUR</div>
              </div>
            </div>

            <div class="specimen-foot-note">NAVIGASI: KLIK ATAU PANAH ATAS/BAWAH</div>
          </div>
        </div>
      </section>

      <!-- 6. 12-Month Matrix (#matriks) -->
      <section id="matriks" class="landing-section" data-lp-journey="clouds-out">
        <div class="section-header">
          <h2>Matriks Iuran 12 Bulan: Selamat Tinggal Buku Tulis</h2>
          <p>Klik sel LUNAS atau tanda belum bayar di bawah ini untuk mencoba pembaruan status dan saldo seketika.</p>
        </div>

        <div class="matrix-scroll-wrap" data-lp-reveal="fade">
          <div class="matrix-card">
            <table class="matrix-table font-mono">
              <thead>
                <tr>
                  <th>NAMA ANGGOTA</th>
                  <th>JAN</th><th>FEB</th><th>MAR</th><th>APR</th>
                  <th>MEI</th><th>JUN</th><th>JUL</th><th>AGS</th>
                  <th>SEP</th><th>OKT</th><th>NOV</th><th>DES</th>
                </tr>
              </thead>
              <tbody id="matrix-tbody">
                <tr>
                  <td>Bambang Sudiro</td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                </tr>
                <tr>
                  <td>Siti Aminah</td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><span class="stamp-libur">LIBUR</span></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><span class="stamp-libur">LIBUR</span></td>
                </tr>
                <tr>
                  <td>Budi Santoso</td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-unpaid" data-matrix-cell data-initial="unpaid">−</button></td>
                  <td><button type="button" class="stamp-btn is-unpaid" data-matrix-cell data-initial="unpaid">−</button></td>
                  <td><button type="button" class="stamp-btn is-unpaid" data-matrix-cell data-initial="unpaid">−</button></td>
                  <td><button type="button" class="stamp-btn is-unpaid" data-matrix-cell data-initial="unpaid">−</button></td>
                  <td><button type="button" class="stamp-btn is-unpaid" data-matrix-cell data-initial="unpaid">−</button></td>
                  <td><button type="button" class="stamp-btn is-unpaid" data-matrix-cell data-initial="unpaid">−</button></td>
                  <td><button type="button" class="stamp-btn is-unpaid" data-matrix-cell data-initial="unpaid">−</button></td>
                  <td><button type="button" class="stamp-btn is-unpaid" data-matrix-cell data-initial="unpaid">−</button></td>
                  <td><button type="button" class="stamp-btn is-unpaid" data-matrix-cell data-initial="unpaid">−</button></td>
                </tr>
                <tr>
                  <td>Hendra Wijaya</td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><span class="stamp-libur">LIBUR</span></td>
                  <td><span class="stamp-libur">LIBUR</span></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                  <td><span class="stamp-libur">LIBUR</span></td>
                  <td><button type="button" class="stamp-btn is-paid" data-matrix-cell data-initial="paid">LUNAS</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="matrix-scroll-hint" aria-hidden="true">Geser ke samping untuk melihat semua bulan</div>
        </div>
      </section>

      <!-- 7. Live Simulator & Thermal Receipt Feed -->
      <section id="demo-simulator" class="landing-section">
        <div class="section-header">
          <h2>Coba Langsung Kecepatan Finkas</h2>
          <p>Uji pembaruan saldo kas dan status iuran anggota secara langsung di halaman ini.</p>
        </div>

        <div class="simulator-panel" data-lp-reveal="fade">
          <div class="vault-card">
            <div class="mock-card-label">Simulasi Saldo Kas</div>
            <div class="mock-saldo font-mono" id="sim-saldo">Rp 14.850.000</div>
          </div>

          <div class="sim-controls">
            <button type="button" class="btn-sim" id="sim-btn-add-income"><i class="ph-bold ph-plus-circle" aria-hidden="true"></i><span>Tambah Kas Masuk (+Rp 50.000)</span></button>
            <button type="button" class="btn-sim" id="sim-btn-toggle-dues"><i class="ph-bold ph-check-circle" aria-hidden="true"></i><span>Toggle Iuran Budi Santoso</span></button>
            <button type="button" class="btn-sim" id="sim-btn-reset"><i class="ph-bold ph-arrow-counter-clockwise" aria-hidden="true"></i><span>Reset Simulasi</span></button>
          </div>

          <div class="sim-feedback" id="sim-feedback-msg">Klik tombol simulasi di atas atau sel matriks untuk menguji pembaruan saldo instan.</div>

          <div class="receipt-feed-wrap">
            <div class="receipt-slot-head">
              <span class="receipt-slot-slot" aria-hidden="true"></span>
              <span class="receipt-slot-label">Pita Bukti Transaksi Langsung (WIB)</span>
              <span class="receipt-slot-slot" aria-hidden="true"></span>
            </div>
            <div class="receipt-stack" id="sim-receipt-stack" aria-live="polite"></div>
          </div>
        </div>
      </section>

      <!-- 8. FAQ Accordion -->
      <section id="faq" class="landing-section" data-lp-journey="solid">
        <div class="section-header">
          <h2>Pertanyaan yang Sering Diajukan</h2>
          <p>Jawaban singkat untuk pengurus, bendahara, dan anggota kelompok.</p>
        </div>

        <div class="faq-grid" data-lp-reveal="fade">
          <div class="faq-card">
            <button type="button" class="faq-trigger" id="faq-btn-1" aria-expanded="false" aria-controls="faq-panel-1"><span>Apakah data kas antar grup bisa tercampur atau diintip grup lain?</span><i class="ph-bold ph-caret-down faq-caret" aria-hidden="true"></i></button>
            <div class="faq-body" id="faq-panel-1" role="region" aria-labelledby="faq-btn-1"><div class="faq-body-inner"><p>Tidak. Setiap grup memiliki ruang kas terisolasi dengan PIN 4 angka unik. Akses database diverifikasi di sisi server dengan hash scrypt dan sesi HMAC sehingga data satu grup tidak dapat dibaca grup lain.</p></div></div>
          </div>
          <div class="faq-card">
            <button type="button" class="faq-trigger" id="faq-btn-2" aria-expanded="false" aria-controls="faq-panel-2"><span>Siapa saja yang berhak mencatat transaksi kas?</span><i class="ph-bold ph-caret-down faq-caret" aria-hidden="true"></i></button>
            <div class="faq-body" id="faq-panel-2" role="region" aria-labelledby="faq-btn-2"><div class="faq-body-inner"><p>Anggota dapat melihat transparansi kas dengan PIN grup, sedangkan pencatatan pemasukan, pengeluaran, dan pengelolaan data master dibatasi bagi bendahara atau Admin grup terotorisasi.</p></div></div>
          </div>
          <div class="faq-card">
            <button type="button" class="faq-trigger" id="faq-btn-3" aria-expanded="false" aria-controls="faq-panel-3"><span>Bagaimana jika bendahara mencatat saat tidak ada koneksi internet?</span><i class="ph-bold ph-caret-down faq-caret" aria-hidden="true"></i></button>
            <div class="faq-body" id="faq-panel-3" role="region" aria-labelledby="faq-btn-3"><div class="faq-body-inner"><p>Finkas bekerja offline-first. Anda tetap dapat mencatat kas di lapangan; transaksi tersimpan aman di antrean lokal IndexedDB beserta ID grup dan otomatis tersinkronisasi saat koneksi kembali stabil.</p></div></div>
          </div>
          <div class="faq-card">
            <button type="button" class="faq-trigger" id="faq-btn-4" aria-expanded="false" aria-controls="faq-panel-4"><span>Apakah laporan bisa dibagikan langsung ke grup WhatsApp?</span><i class="ph-bold ph-caret-down faq-caret" aria-hidden="true"></i></button>
            <div class="faq-body" id="faq-panel-4" role="region" aria-labelledby="faq-btn-4"><div class="faq-body-inner"><p>Ya. Tersedia pembuat struk transaksi sekali ketuk, cetak laporan bulanan WIB (PDF/CSV), serta ekspor rekap kas berformat teks rapi yang siap dibagikan ke grup WhatsApp warga.</p></div></div>
          </div>
        </div>
      </section>

      <!-- 9. Inverted Contrast CTA Banner -->
      <div class="cta-section-wrap">
        <section class="landing-cta-banner" data-lp-reveal="fade">
          <h2>Kelola Kas Komunitas Lebih Rapi Hari Ini</h2>
          <p>Mulai gunakan Finkas untuk pencatatan kas yang jujur, terbuka, dan bebas rekap manual.</p>
          <button type="button" class="btn-cta-inverted" id="btn-to-list-bottom"><span>PILIH GRUP KAS SEKARANG</span><i class="ph-bold ph-arrow-right" aria-hidden="true"></i></button>
        </section>
      </div>

      <!-- Architectural Colophon Footer -->
      <footer class="landing-footer">
        <div class="footer-shell">
          <div class="footer-top-grid">
            <div class="footer-brand-col">
              <div class="footer-brand-name">Finkas</div>
              <p class="footer-brand-tagline">Pembukuan kas komunitas yang tenang, jujur, dan terbuka.</p>
              <div class="footer-wib-badge">
                <span class="footer-wib-dot" aria-hidden="true"></span>
                <span><span id="footer-wib-clock">--:--:-- WIB</span> &middot; BUKU KAS AKTIF</span>
              </div>
            </div>

            <nav class="footer-nav-links" aria-label="Tautan footer">
              <a href="#fitur">FITUR</a>
              <a href="#matriks">MATRIKS</a>
              <a href="#demo-simulator">DEMO</a>
              <a href="#faq">FAQ</a>
              <a href="index.html">BUKA APLIKASI</a>
              <a href="privacy.html">KEBIJAKAN PRIVASI</a>
            </nav>

            <button type="button" class="btn-footer-top" id="btn-footer-top">
              <span>KE LANGIT</span>
              <span class="btn-footer-top-arrow" aria-hidden="true">&uarr;</span>
            </button>
          </div>

          <div class="footer-wordmark-wrap">
            <button type="button" class="footer-wordmark-btn" id="footer-wordmark-btn" aria-label="Finkas — Verifikasi riak buku kas">
              <span class="footer-wordmark-stage" id="footer-wordmark-stage" aria-hidden="true">
                <span class="footer-wordmark-outline">Finkas</span>
                <span class="footer-wordmark-fill">Finkas</span>
              </span>
            </button>
            <div class="footer-seal-pill" id="footer-seal-pill" aria-live="polite">KLIK WORDMARK UNTUK VERIFIKASI RIAK KAS</div>
          </div>

          <div class="footer-bottom-row">
            <span class="footer-copy">&copy; 2026 FINKAS &middot; PEMBUKUAN KAS KOMUNITAS</span>
            <span class="footer-copy">100% OFFLINE-FIRST &middot; ASIA/JAKARTA (UTC+7)</span>
          </div>
        </div>
      </footer>
    </div>
  </main>

  <!-- SCREEN 2: PORTAL PILIH GRUP KAS (#state-list) -->
  <section id="state-list" class="hidden" aria-labelledby="portal-list-heading">
    <div class="portal-wrap">
      <div class="portal-card">
        <div class="screen-header">
          <div class="screen-header-icon"><i class="ph-fill ph-users-three" aria-hidden="true"></i></div>
          <h2 id="portal-list-heading">Pilih Grup Kas</h2>
          <p>Pilih kelompok kas untuk membuka pembukuan</p>
        </div>

        <div class="portal-search-box">
          <i class="ph-bold ph-magnifying-glass" aria-hidden="true"></i>
          <input type="search" id="group-search-input" class="portal-search-input" aria-label="Cari grup kas" placeholder="Cari grup (mis. RT 04, RT 05, Kelas, Arisan)..." autocomplete="off">
        </div>

        <div id="group-list" class="group-list-container">
          <p class="loading-state">Memuat daftar grup...</p>
        </div>

        <button type="button" class="portal-btn portal-btn-outline" id="btn-to-welcome">
          <i class="ph-bold ph-arrow-left" aria-hidden="true"></i>
          <span>Kembali ke Beranda</span>
        </button>

        <p class="portal-note">
          Grup baru dibuat oleh admin pemilik.<br>
          Sudah di dalam? <a href="index.html">Buka aplikasi</a>
        </p>
      </div>
    </div>
  </section>

  <!-- SCREEN 3: VERIFIKASI PIN 4 ANGKA (#state-pin) -->
  <section id="state-pin" class="hidden" aria-labelledby="pin-name">
    <div class="portal-wrap">
      <div class="portal-card">
        <div class="screen-header">
          <div class="screen-header-icon"><i class="ph-fill ph-lock-key" aria-hidden="true"></i></div>
          <h2 id="pin-name">Nama Grup</h2>
          <p>Ketik PIN 4 angka grup ini untuk masuk</p>
        </div>

        <div class="pin-box-panel">
          <div class="pin-box-label">PIN 4 Angka</div>
          <div class="pin-input-row pin-control">
            <input id="group-pin" name="group-pin" class="pin-input" type="password" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="PIN grup, 4 angka" aria-describedby="pin-msg" aria-invalid="false">
            <span class="pin-digit-box" aria-hidden="true"></span>
            <span class="pin-digit-box" aria-hidden="true"></span>
            <span class="pin-digit-box" aria-hidden="true"></span>
            <span class="pin-digit-box" aria-hidden="true"></span>
          </div>
          <div class="pin-security-hint">
            <i class="ph-fill ph-shield-check" aria-hidden="true"></i>
            <span>Salah 5 kali, akses terkunci sementara</span>
          </div>
        </div>

        <div id="pin-msg" class="pin-msg" aria-live="polite"></div>

        <button type="button" class="portal-btn portal-btn-primary" id="btn-enter">
          <i class="ph-bold ph-sign-in" aria-hidden="true"></i>
          <span>Masuk Grup</span>
        </button>
        <button type="button" class="portal-btn portal-btn-outline" id="btn-back">Ganti Grup</button>
      </div>
    </div>
  </section>
