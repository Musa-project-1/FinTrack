/**
 * @module onboarding-motion
 * Visual effects & interactive specimens for onboarding.html:
 * theme wipe toggle, Living Horizon Spline, hero depth recession, sky parallax,
 * Split Ledger Dossier (01-05), and Architectural Colophon WIB footer.
 */
import { THEME_KEY } from 'finkas/core/config';
import { initHorizonSpline } from './onboarding-horizon';

export { initHorizonSpline };

const el = (id: string) => document.getElementById(id);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ── 1. Theme Sync + Circular View Transition Wipe ─────────────────────── */
type Theme = 'light' | 'dark';
interface ThemeOptions {
  reducedMotion?: MediaQueryList;
  onThemeApplied?: () => void;
}
export const initThemeToggle = ({ reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)'), onThemeApplied }: ThemeOptions = {}) => {
  let activeWipe: ViewTransition | undefined;
  let fadeTimer: number | undefined;

  const applyTheme = (mode: Theme, persist = true) => {
    const isDark = mode === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    el('btn-toggle-theme')?.setAttribute('aria-pressed', String(isDark));
    el('meta-theme-color')?.setAttribute('content', isDark ? '#0f1011' : '#faf8f6');
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
      } catch (_) {}
    }
    onThemeApplied?.();
  };

  const runThemeWipe = (nextTheme: Theme, event: MouseEvent, triggerBtn: HTMLElement | null) => {
    if (reducedMotion.matches) {
      applyTheme(nextTheme);
      return;
    }

    if (typeof document.startViewTransition === 'function') {
      activeWipe?.skipTransition?.();
      const rect = triggerBtn?.getBoundingClientRect();
      const x = event?.clientX || (rect ? rect.left + rect.width / 2 : window.innerWidth - 40);
      const y = event?.clientY || (rect ? rect.top + rect.height / 2 : 30);
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );
      document.documentElement.dataset.themeWipe = 'true';
      const vt = document.startViewTransition(() => applyTheme(nextTheme));
      activeWipe = vt;
      vt.ready.then(() => {
        if (activeWipe !== vt) return;
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 580, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(() => {});
      const done = () => {
        if (activeWipe !== vt) return;
        activeWipe = undefined;
        delete document.documentElement.dataset.themeWipe;
      };
      vt.finished.then(done, done);
      return;
    }

    clearTimeout(fadeTimer);
    document.documentElement.classList.add('theme-fading');
    applyTheme(nextTheme);
    fadeTimer = window.setTimeout(() => {
      document.documentElement.classList.remove('theme-fading');
    }, 450);
  };

  const initial = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(initial, false);

  el('btn-toggle-theme')?.addEventListener('click', (event) => {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    runThemeWipe(cur === 'dark' ? 'light' : 'dark', event, el('btn-toggle-theme'));
  });
};

/* ── 2. Living Horizon Spline Canvas (extracted to ./onboarding-horizon) ── */

/* ── 3. Section Reveal Observer ────────────────────────────────────────── */
export const initSectionReveal = (reducedMotion: MediaQueryList, onBlurReveal?: () => void) => {
  const nodes = Array.from(document.querySelectorAll('[data-lp-reveal]'));
  if (!nodes.length) return;
  const revealNow = (n: Element) => n.classList.add('is-lp-revealed');

  if (reducedMotion.matches || typeof IntersectionObserver !== 'function') {
    nodes.forEach(revealNow);
    onBlurReveal?.();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const node = entry.target;
      revealNow(node);
      observer.unobserve(node);
      if (node.getAttribute('data-lp-reveal') === 'blur') onBlurReveal?.();
    });
  }, { threshold: 0.02, rootMargin: '0px 0px -2% 0px' });

  nodes.forEach((node) => observer.observe(node));
};

/* ── 4. Hero Recession, Showcase Unfold, Parallax & Magnetic CTAs ──────── */
interface MotionOptions {
  reducedMotion: MediaQueryList;
  horizonCtrl: ReturnType<typeof initHorizonSpline>;
}

export const initAmbientMotion = ({ reducedMotion, horizonCtrl, isWelcomeVisible }: MotionOptions & { isWelcomeVisible: () => boolean }) => {
  const nav = el('landing-nav');
  const progress = el('nav-progress');
  const heroContentEl = document.querySelector<HTMLElement>('.hero-content');
  const stageFrame = document.querySelector<HTMLElement>('.stage-frame');
  const spySections = ['fitur', 'matriks', 'demo-simulator', 'faq'].map(el).filter(section => section !== null);
  const spyLinks = document.querySelectorAll('.nav-spy-link');
  let scrollFrame = 0;

  const updateHeroRecession = (y: number) => {
    if (!heroContentEl) return;
    if (reducedMotion.matches) {
      heroContentEl.style.setProperty('--hero-ty', '0px');
      heroContentEl.style.setProperty('--hero-sc', '1');
      heroContentEl.style.setProperty('--hero-op', '1');
      heroContentEl.style.setProperty('--hero-blur', '0px');
      return;
    }
    const range = Math.max(360, Math.min(540, window.innerHeight * 0.72));
    const e0 = clamp01(y / range);
    const e = e0 * e0 * (3 - 2 * e0);
    heroContentEl.style.setProperty('--hero-ty', `${(-38 * e).toFixed(1)}px`);
    heroContentEl.style.setProperty('--hero-sc', (1 - 0.055 * e).toFixed(4));
    heroContentEl.style.setProperty('--hero-op', (1 - 0.86 * e).toFixed(3));
    heroContentEl.style.setProperty('--hero-blur', `${(3 * e).toFixed(2)}px`);
  };

  const updateStagePerspective = () => {
    if (!stageFrame) return;
    if (reducedMotion.matches) {
      stageFrame.style.setProperty('--stage-rx', '0deg');
      stageFrame.style.setProperty('--stage-ty', '0px');
      stageFrame.style.setProperty('--stage-sc', '1');
      stageFrame.style.setProperty('--stage-sheen-op', '0');
      return;
    }
    const rect = stageFrame.getBoundingClientRect();
    const p = clamp01((window.innerHeight * 0.96 - rect.top) / (window.innerHeight * 0.66));
    const s = p * p * (3 - 2 * p);
    stageFrame.style.setProperty('--stage-rx', `${(9.5 * (1 - s)).toFixed(2)}deg`);
    stageFrame.style.setProperty('--stage-ty', `${(26 * (1 - s)).toFixed(1)}px`);
    stageFrame.style.setProperty('--stage-sc', (0.955 + 0.045 * s).toFixed(4));
    stageFrame.style.setProperty('--stage-sheen-x', `${(-110 + 230 * s).toFixed(1)}%`);
    stageFrame.style.setProperty('--stage-sheen-op', (Math.sin(s * Math.PI) * 0.85).toFixed(3));
  };

  const updateScrollState = () => {
    scrollFrame = 0;
    const y = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = maxScroll > 0 ? Math.min(1, y / maxScroll) : 0;
    progress?.style.setProperty('--lp-scroll-ratio', ratio.toFixed(4));
    nav?.classList.toggle('is-scrolled', y > 36);
    updateHeroRecession(y);
    updateStagePerspective();
    horizonCtrl?.setScroll(ratio);

    let activeId = '';
    if (isWelcomeVisible()) {
      const threshold = window.innerHeight * 0.35;
      for (const sec of spySections) {
        if (sec.getBoundingClientRect().top < threshold) activeId = sec.id;
      }
    }
    spyLinks.forEach((a) => {
      a.classList.toggle('is-active', Boolean(activeId) && a.getAttribute('href') === '#' + activeId);
    });
  };

  const scheduleScroll = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollState);
  };

  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', () => {
    horizonCtrl?.onResize();
    scheduleScroll();
  }, { passive: true });
  reducedMotion.addEventListener?.('change', scheduleScroll);
  updateScrollState();

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const skyStage = el('sky-stage');
  const heroSection = el('hero');

  if (skyStage && heroSection && finePointer.matches && !reducedMotion.matches) {
    let curX = 0;
    let curY = 0;
    let tgtX = 0;
    let tgtY = 0;
    let skyRaf = 0;

    const stepParallax = () => {
      curX += (tgtX - curX) * 0.055;
      curY += (tgtY - curY) * 0.055;
      skyStage.style.setProperty('--lp-mx', `${curX.toFixed(2)}px`);
      skyStage.style.setProperty('--lp-my', `${curY.toFixed(2)}px`);
      if (Math.abs(tgtX - curX) > 0.02 || Math.abs(tgtY - curY) > 0.02) {
        skyRaf = requestAnimationFrame(stepParallax);
      } else {
        skyRaf = 0;
      }
    };
    const kick = () => { if (!skyRaf) skyRaf = requestAnimationFrame(stepParallax); };

    heroSection.addEventListener('pointermove', (e) => {
      if (reducedMotion.matches || e.pointerType !== 'mouse') return;
      const rect = heroSection.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      tgtX = ((e.clientX - rect.left) / rect.width - 0.5) * -24;
      tgtY = ((e.clientY - rect.top) / rect.height - 0.5) * -14;
      kick();
    }, { passive: true });
    heroSection.addEventListener('pointerleave', () => { tgtX = 0; tgtY = 0; kick(); });
  }

  if (finePointer.matches && !reducedMotion.matches) {
    ['btn-to-list', 'btn-to-list-bottom'].forEach((btnId) => {
      const btn = el(btnId);
      if (!btn) return;
      let magRaf = 0;
      btn.addEventListener('pointermove', (e) => {
        if (reducedMotion.matches || e.pointerType !== 'mouse') return;
        if (magRaf) cancelAnimationFrame(magRaf);
        magRaf = requestAnimationFrame(() => {
          const rect = btn.getBoundingClientRect();
          const dx = Math.max(-4, Math.min(4, ((e.clientX - rect.left) / rect.width - 0.5) * 8));
          const dy = Math.max(-4, Math.min(4, ((e.clientY - rect.top) / rect.height - 0.5) * 8));
          btn.style.setProperty('--mag-x', `${dx.toFixed(2)}px`);
          btn.style.setProperty('--mag-y', `${dy.toFixed(2)}px`);
        });
      }, { passive: true });
      btn.addEventListener('pointerleave', () => {
        if (magRaf) cancelAnimationFrame(magRaf);
        btn.style.setProperty('--mag-x', '0px');
        btn.style.setProperty('--mag-y', '0px');
      });
    });
  }

  return { updateScrollState };
};

/* ── 5. Split Ledger Dossier (Indeks Kemampuan 01-05) ──────────────────── */
const WIZ_DATA: Record<string, { rows: [string, string, string][]; note: string } | undefined> = {
  '1': {
    rows: [
      ['Jenis Transaksi', 'Iuran Bulanan Warga', 'specimen-val'],
      ['Nominal per Anggota', '+Rp 50.000', 'specimen-val is-paid'],
      ['Periode Buku Kas', 'APRIL 2026 (WIB)', 'specimen-mono']
    ],
    note: 'TAHAP 1/3 · VERIFIKASI NOMINAL IURAN PER KEPALA KELUARGA'
  },
  '2': {
    rows: [
      ['Bambang Sudiro', 'LUNAS · +Rp 50.000', 'specimen-val is-paid'],
      ['Siti Aminah', 'LUNAS · +Rp 50.000', 'specimen-val is-paid'],
      ['Hendra Wijaya', 'LUNAS · +Rp 50.000', 'specimen-val is-paid']
    ],
    note: 'TAHAP 2/3 · 3 ANGGOTA DIPILIH DARI DAFTAR WARGA AKTIF'
  },
  '3': {
    rows: [
      ['Total Tambahan Masuk', '+Rp 150.000', 'specimen-val is-paid'],
      ['Saldo Kas Sebelumnya', 'Rp 14.850.000', 'specimen-mono'],
      ['Proyeksi Saldo Baru', 'Rp 15.000.000', 'specimen-val is-paid']
    ],
    note: 'TAHAP 3/3 · SIAP DISIMPAN SEKALIGUS KE BUKU KAS'
  }
};

export const initFeatureDossier = ({ reducedMotion, horizonCtrl }: MotionOptions) => {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dossier-tab]'));
  const indicator = el('dossier-indicator');
  const counter = el('dossier-counter');
  if (!tabs.length) return;

  let activeIdx = 0;
  const syncIndicator = () => {
    const activeTab = tabs[activeIdx];
    if (!indicator || !activeTab) return;
    indicator.style.setProperty('--ind-y', `${activeTab.offsetTop}px`);
    indicator.style.setProperty('--ind-h', `${activeTab.offsetHeight}px`);
  };

  const setActive = (idx: number, shouldFocus = false) => {
    const next = (idx + tabs.length) % tabs.length;
    activeIdx = next;
    tabs.forEach((tab, i) => {
      const isOn = i === next;
      tab.classList.toggle('is-active', isOn);
      tab.setAttribute('aria-selected', isOn ? 'true' : 'false');
      const panel = el(tab.getAttribute('aria-controls') ?? '');
      if (panel) {
        panel.classList.toggle('is-active', isOn);
        panel.hidden = !isOn;
      }
    });
    if (counter) counter.textContent = `0${next + 1} / 0${tabs.length}`;
    syncIndicator();
    if (!reducedMotion.matches) setTimeout(syncIndicator, 310);
    if (shouldFocus) tabs[next].focus();
  };

  tabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => setActive(idx));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(idx + 1, true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(idx - 1, true); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0, true); }
      else if (e.key === 'End') { e.preventDefault(); setActive(tabs.length - 1, true); }
    });
  });

  window.addEventListener('resize', syncIndicator, { passive: true });
  document.fonts?.ready?.then?.(syncIndicator);

  const wizBtns = Array.from(document.querySelectorAll('[data-wiz-step]'));
  const wizLines = el('specimen-wiz-lines');
  const wizNote = el('specimen-wiz-note');
  wizBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const data = WIZ_DATA[btn.getAttribute('data-wiz-step') || '1'];
      if (!data || !wizLines) return;
      wizBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      wizLines.replaceChildren(...data.rows.map(([k, v, cls]) => {
        const row = document.createElement('div');
        row.className = 'specimen-line';
        const left = document.createElement('span');
        left.textContent = k;
        const right = document.createElement('span');
        right.className = cls;
        right.textContent = v;
        row.append(left, right);
        return row;
      }));
      if (wizNote) wizNote.textContent = data.note;
    });
  });

  const copyBtn = el('specimen-copy-wa');
  const waText = el('specimen-wa-text');
  let copyTimer = 0;
  copyBtn?.addEventListener('click', () => {
    try {
      navigator.clipboard?.writeText?.(waText?.textContent || '').catch(() => {});
    } catch (_) {}
    clearTimeout(copyTimer);
    const lbl = copyBtn.querySelector('span');
    if (lbl) lbl.textContent = '✓ Tersalin ke Clipboard';
    copyBtn.classList.add('is-done');
    copyTimer = window.setTimeout(() => {
      if (lbl) lbl.textContent = 'Salin Teks WA';
      copyBtn.classList.remove('is-done');
    }, 2200);
  });

  const syncBtn = el('specimen-sync-btn');
  const q1 = el('queue-status-1');
  const q2 = el('queue-status-2');
  let isQueueSynced = false;
  if (syncBtn && q1 && q2) {
    syncBtn.addEventListener('click', () => {
      const lbl = syncBtn.querySelector('span');
      if (!isQueueSynced) {
        isQueueSynced = true;
        const applySynced = (n: HTMLElement) => { n.textContent = '✓ TERSINKRON'; n.classList.add('is-synced'); };
        if (reducedMotion.matches) { applySynced(q1); applySynced(q2); }
        else { setTimeout(() => applySynced(q1), 40); setTimeout(() => applySynced(q2), 220); }
        if (lbl) lbl.textContent = 'Ulangi Antrean Offline';
        syncBtn.classList.add('is-done');
        horizonCtrl?.wave(0.6);
      } else {
        isQueueSynced = false;
        [q1, q2].forEach((n) => { n.textContent = 'ANTREAN LOKAL'; n.classList.remove('is-synced'); });
        if (lbl) lbl.textContent = 'Simulasikan Kembali Online';
        syncBtn.classList.remove('is-done');
      }
    });
  }

  const fmtBtns = Array.from(document.querySelectorAll('[data-export-fmt]'));
  const fmtMeta = el('specimen-export-meta');
  fmtBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const fmt = btn.getAttribute('data-export-fmt');
      fmtBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      if (fmtMeta) {
        fmtMeta.textContent = fmt === 'CSV'
          ? 'buku-kas-rt05-apr2026-wib.csv · UTF-8 BOM'
          : 'laporan-kas-rt05-apr2026-wib.pdf · A4 Portrait';
      }
    });
  });

  setActive(0);
};

/* ── 6. Architectural Colophon WIB Footer ──────────────────────────────── */
export const initEditorialFooter = ({ reducedMotion, horizonCtrl }: MotionOptions) => {
  const wibClock = el('footer-wib-clock');
  const wordmarkBtn = el('footer-wordmark-btn');
  const wordmarkStage = el('footer-wordmark-stage');
  const sealPill = el('footer-seal-pill');
  const topBtn = el('btn-footer-top');

  const wibFmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const formatWibClock = () => wibFmt.format(new Date()).replace(/\./g, ':');

  if (wibClock) {
    let clockTimer = 0;
    const tickClock = () => { wibClock.textContent = `${formatWibClock()} WIB`; };
    const startClock = () => {
      tickClock();
      if (!clockTimer && !document.hidden) clockTimer = window.setInterval(tickClock, 1000);
    };
    const stopClock = () => {
      if (clockTimer) {
        clearInterval(clockTimer);
        clockTimer = 0;
      }
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopClock();
      else startClock();
    });
    startClock();
  }

  let sealTimer = 0;
  const defaultSealLabel = 'KLIK WORDMARK UNTUK VERIFIKASI RIAK KAS';
  if (wordmarkBtn && wordmarkStage) {
    wordmarkBtn.addEventListener('pointermove', (e) => {
      if (reducedMotion.matches || (e.pointerType && e.pointerType !== 'mouse')) return;
      const rect = wordmarkStage.getBoundingClientRect();
      wordmarkStage.style.setProperty('--fw-x', `${Math.max(0, Math.min(rect.width, e.clientX - rect.left)).toFixed(1)}px`);
      wordmarkStage.style.setProperty('--fw-y', `${Math.max(0, Math.min(rect.height, e.clientY - rect.top)).toFixed(1)}px`);
      wordmarkStage.classList.add('is-pointer-active');
    });
    wordmarkBtn.addEventListener('pointerleave', () => wordmarkStage.classList.remove('is-pointer-active'));
    wordmarkBtn.addEventListener('click', () => {
      horizonCtrl?.wave(1);
      if (sealPill) {
        clearTimeout(sealTimer);
        sealPill.textContent = `✓ BUKU KAS TERVERIFIKASI · ${formatWibClock()} WIB`;
        sealPill.classList.remove('is-stamped');
        void sealPill.offsetWidth;
        sealPill.classList.add('is-stamped');
        sealTimer = window.setTimeout(() => {
          sealPill.classList.remove('is-stamped');
          sealPill.textContent = defaultSealLabel;
        }, 2600);
      }
    });
  }

  topBtn?.addEventListener('pointermove', (e) => {
    if (reducedMotion.matches || (e.pointerType && e.pointerType !== 'mouse')) return;
    const rect = topBtn.getBoundingClientRect();
    const dx = ((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * 6;
    const dy = ((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * 6;
    topBtn.style.setProperty('--mag-x', `${dx.toFixed(2)}px`);
    topBtn.style.setProperty('--mag-y', `${dy.toFixed(2)}px`);
  });
  topBtn?.addEventListener('pointerleave', () => {
    topBtn.style.setProperty('--mag-x', '0px');
    topBtn.style.setProperty('--mag-y', '0px');
  });
  topBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });
};
