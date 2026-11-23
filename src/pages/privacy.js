/**
 * @module privacy
 * Standalone bilingual theme + scrollspy controller for privacy.html.
 */

const COPY = {
  id: {
    pageTitle: 'Kebijakan Privasi - Finkas',
    pageDesc: 'Kebijakan Privasi dan Perlindungan Data Aplikasi Pembukuan Kas Finkas.',
    themeAria: 'Ganti tema terang atau gelap',
    langGroup: 'Pilihan bahasa',
    tocAria: 'Daftar isi kebijakan privasi',
    crumb: 'Privasi',
    backApp: 'Kembali ke Aplikasi',
    eyebrow: 'Kebijakan Privasi & Keamanan Data',
    title: 'Kebijakan Privasi',
    lead: 'Finkas berkomitmen menjaga privasi dan integritas data keuangan kelompok Anda dengan prinsip sederhana, transparan, dan terisolasi.',
    metaUpdated: 'Pembaruan terakhir: September 2026',
    metaSections: '5 bagian ringkas',
    metaRead: '~2 menit baca',
    pillar1Title: 'Terisolasi Per Grup',
    pillar1Desc: 'Data setiap grup terpisah ketat berdasarkan ID grup aktif.',
    pillar2Title: 'Tanpa Pelacak Iklan',
    pillar2Desc: 'Tidak pernah menjual atau membagikan data ke pihak ketiga.',
    pillar3Title: 'Kendali Penuh Admin',
    pillar3Desc: 'Ekspor Excel/CSV/JSON, perbarui, atau hapus data kapan saja.',
    tocTitle: 'Daftar Isi',
    toc1: 'Data yang Dikelola',
    toc2: 'Penyimpanan & Isolasi',
    toc3: 'Autentikasi Google',
    toc4: 'Ketiadaan Pelacak',
    toc5: 'Hak & Penghapusan',
    trustStorageLabel: 'Penyimpanan',
    trustPinLabel: 'Verifikasi PIN',
    trustPinVal: 'Hash scrypt',
    printBtn: 'Cetak Halaman',
    sec1Tag: '01 · Inventaris Data',
    sec1Title: '1. Data yang Dikelola',
    sec1Intro: 'Finkas hanya menyimpan informasi yang diperlukan pengurus dan anggota untuk menjalankan pembukuan kas kelompok secara akurat.',
    sec1Item1Title: 'Informasi Kas',
    sec1Item1Desc: 'Catatan transaksi pemasukan, pengeluaran, saldo, bukti lampiran opsional, dan rekap iuran bulanan yang dimasukkan oleh pengurus kelompok.',
    sec1Item2Title: 'Data Anggota',
    sec1Item2Desc: 'Nama atau inisial anggota serta nomor WhatsApp opsional untuk memudahkan konfirmasi rekap pembayaran dan pengingat iuran.',
    sec1Item3Title: 'Data Kredensial',
    sec1Item3Desc: 'PIN akses kelompok (4 digit) dan kata sandi pengurus disimpan sebagai hash kriptografis scrypt satu arah di sisi server.',
    sec2Tag: '02 · Arsitektur Cloud',
    sec2Title: '2. Penyimpanan & Isolasi Data',
    sec2Part1: 'Seluruh rekaman kas disimpan pada infrastruktur Google Cloud Firestore dalam skema isolasi ketat per kelompok (',
    sec2Part2: '). Data satu kelompok tidak dapat diakses atau bercampur dengan kelompok lain.',
    sec2CalloutTitle: 'Otorisasi Terbatas Sesi',
    sec2CalloutDesc: 'Setiap permintaan baca dan tulis diperiksa ulang di server memakai token sesi bertanda tangan yang terikat pada ID grup terkait.',
    sec3Tag: '03 · Kontrol OAuth',
    sec3Title: '3. Autentikasi Google',
    sec3Body: 'Fitur autentikasi Google Sign-In digunakan terbatas untuk memverifikasi identitas pemilik atau Super Admin utama terhadap daftar email resmi.',
    sec3AllowTitle: 'Yang Diakses',
    sec3Allow1: 'Alamat email terverifikasi untuk pencocokan hak akses Super Admin',
    sec3Allow2: 'Profil dasar akun untuk konfirmasi sesi aktif',
    sec3DenyTitle: 'Tidak Pernah Diakses',
    sec3Deny1: 'Daftar kontak atau buku alamat Google Anda',
    sec3Deny2: 'Isi kotak masuk Gmail maupun berkas Google Drive',
    sec4Tag: '04 · Prinsip Netralitas',
    sec4Title: '4. Ketiadaan Pelacak Komersial',
    sec4Body: 'Finkas tidak menjual, menyewakan, atau membagikan data pengguna maupun data transaksi kepada pihak ketiga untuk periklanan. Seluruh sistem ditujukan murni demi efisiensi pembukuan kas komunitas.',
    sec5Tag: '05 · Kendali Pemilik Data',
    sec5Title: '5. Hak Pengguna & Penghapusan',
    sec5Body: 'Pengurus grup memegang hak penuh untuk memperbarui catatan, mengekspor arsip pembukuan kapan saja dalam format Excel/CSV maupun JSON, serta menghapus data grup secara permanen.',
    footerCopy: '© 2025–2026 Finkas · Pembukuan kas kelompok yang sederhana, transparan, dan terisolasi.',
    welcomePage: 'Halaman Utama'
  },
  en: {
    pageTitle: 'Privacy Policy - Finkas',
    pageDesc: 'Privacy Policy and Data Protection for the Finkas Group Cash Ledger.',
    themeAria: 'Toggle light or dark theme',
    langGroup: 'Language selection',
    tocAria: 'Privacy policy table of contents',
    crumb: 'Privacy',
    backApp: 'Back to App',
    eyebrow: 'Privacy Policy & Data Security',
    title: 'Privacy Policy',
    lead: 'Finkas is committed to protecting the privacy and integrity of your group financial records with simple, transparent, and isolated architecture.',
    metaUpdated: 'Last updated: September 2026',
    metaSections: '5 concise sections',
    metaRead: '~2 min read',
    pillar1Title: 'Isolated Per Group',
    pillar1Desc: 'Each group ledger is strictly separated by its active group ID.',
    pillar2Title: 'Zero Ad Trackers',
    pillar2Desc: 'Never sold, shared, or monetized with third parties.',
    pillar3Title: 'Full Admin Control',
    pillar3Desc: 'Export Excel/CSV/JSON, update, or erase data anytime.',
    tocTitle: 'Contents',
    toc1: 'Data We Manage',
    toc2: 'Storage & Isolation',
    toc3: 'Google Sign-In',
    toc4: 'No Commercial Trackers',
    toc5: 'Rights & Deletion',
    trustStorageLabel: 'Storage',
    trustPinLabel: 'PIN Verification',
    trustPinVal: 'scrypt Hash',
    printBtn: 'Print Page',
    sec1Tag: '01 · Data Inventory',
    sec1Title: '1. Data We Manage',
    sec1Intro: 'Finkas stores only the information needed by admins and members to maintain accurate group bookkeeping.',
    sec1Item1Title: 'Cash Ledger Records',
    sec1Item1Desc: 'Inflow, outflow, balance entries, optional receipts, and monthly dues records entered by group administrators.',
    sec1Item2Title: 'Member Directory',
    sec1Item2Desc: 'Member names or initials and optional WhatsApp numbers to streamline payment confirmation and dues reminders.',
    sec1Item3Title: 'Credentials',
    sec1Item3Desc: '4-digit group access PINs and admin passwords are stored strictly as one-way scrypt hashes on the server.',
    sec2Tag: '02 · Cloud Architecture',
    sec2Title: '2. Storage & Data Isolation',
    sec2Part1: 'All cash records are stored on Google Cloud Firestore using strict isolation per group (',
    sec2Part2: '). Data from one group cannot be accessed by or mixed with any other group.',
    sec2CalloutTitle: 'Session-Scoped Authorization',
    sec2CalloutDesc: 'Every read and write request is verified server-side using a signed session token bound strictly to the target group ID.',
    sec3Tag: '03 · OAuth Scope',
    sec3Title: '3. Google Authentication',
    sec3Body: 'Google Sign-In is strictly limited to verifying owner or primary Super Admin identity against the authorized allowlist.',
    sec3AllowTitle: 'Accessed',
    sec3Allow1: 'Verified email address for Super Admin allowlist verification',
    sec3Allow2: 'Basic account profile to confirm active session',
    sec3DenyTitle: 'Never Accessed',
    sec3Deny1: 'Your Google Contacts or address book',
    sec3Deny2: 'Gmail inbox messages or Google Drive files',
    sec4Tag: '04 · Neutrality',
    sec4Title: '4. No Commercial Trackers',
    sec4Body: 'Finkas never sells, rents, or shares user or transaction data with third parties for advertising. Every feature exists solely for transparent community bookkeeping.',
    sec5Tag: '05 · Data Ownership',
    sec5Title: '5. User Rights & Deletion',
    sec5Body: 'Group administrators retain full authority to update records, export ledger backups anytime as Excel/CSV or JSON, and permanently delete group records.',
    footerCopy: '© 2025–2026 Finkas · Simple, transparent, and isolated group cash bookkeeping.',
    welcomePage: 'Welcome Page'
  }
};

const safeGet = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};

const safeSet = (key, val) => {
  try { localStorage.setItem(key, val); } catch { /* ignore storage errors */ }
};

const getStoredLang = () => (safeGet('finkas_lang') === 'en' ? 'en' : 'id');

const applyLanguage = (lang) => {
  const code = lang === 'en' ? 'en' : 'id';
  const dict = COPY[code];
  document.documentElement.lang = code;
  document.title = dict.pageTitle;
  document.querySelector('meta[name="description"]')?.setAttribute('content', dict.pageDesc);

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (key && dict[key]) el.setAttribute('aria-label', dict[key]);
  });
  document.getElementById('btn-privacy-theme')?.setAttribute('aria-label', dict.themeAria);

  document.querySelectorAll('[data-privacy-lang]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.getAttribute('data-privacy-lang') === code));
  });
};

const syncThemeUi = () => {
  const dark = document.body.classList.contains('dark-mode');
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    const bg = getComputedStyle(document.body).getPropertyValue('--bg-color').trim();
    if (bg) metaTheme.setAttribute('content', bg);
  }
  const btn = document.getElementById('btn-privacy-theme');
  const icon = document.getElementById('privacy-theme-icon');
  if (btn) btn.setAttribute('aria-pressed', String(dark));
  if (icon) icon.className = dark ? 'ph ph-sun' : 'ph ph-moon';
};

const initScrollspy = () => {
  const links = [...document.querySelectorAll('.privacy-toc-link')];
  const sections = [...document.querySelectorAll('.privacy-section')];
  if (!links.length || !sections.length) return;

  if (typeof CSS !== 'undefined' && CSS.supports('scroll-target-group: auto')) {
    const syncAriaCurrent = () => {
      const currentLink = document.querySelector('.privacy-toc-link:target-current') || links[0];
      links.forEach((link) => {
        link.setAttribute('aria-current', link === currentLink ? 'true' : 'false');
      });
    };
    syncAriaCurrent();
    document.addEventListener('scrollend', syncAriaCurrent);
    let scrollTimer = 0;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(syncAriaCurrent, 120);
    }, { passive: true });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const id = entry.target.getAttribute('id');
      links.forEach((link) => {
        const active = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('target-current', active);
        link.setAttribute('aria-current', active ? 'true' : 'false');
      });
    }
  }, { rootMargin: '-20% 0px -65% 0px', threshold: 0 });

  sections.forEach((section) => observer.observe(section));
};

window.addEventListener('DOMContentLoaded', () => {
  applyLanguage(getStoredLang());
  syncThemeUi();
  initScrollspy();

  document.querySelectorAll('[data-privacy-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-privacy-lang') === 'en' ? 'en' : 'id';
      safeSet('finkas_lang', next);
      applyLanguage(next);
    });
  });

  document.getElementById('btn-privacy-theme')?.addEventListener('click', () => {
    const nextDark = !document.body.classList.contains('dark-mode');
    document.body.classList.toggle('dark-mode', nextDark);
    safeSet('theme', nextDark ? 'dark' : 'light');
    syncThemeUi();
  });

  document.getElementById('btn-privacy-print')?.addEventListener('click', () => {
    window.print();
  });

  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener('change', (e) => {
    const stored = safeGet('theme');
    if (stored === 'auto' || !stored) {
      document.body.classList.toggle('dark-mode', e.matches);
      syncThemeUi();
    }
  });
});
