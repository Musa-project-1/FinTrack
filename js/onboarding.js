/**
 * @module onboarding
 * CSP-clean ES module for the modern fintech onboarding / landing page.
 *
 * Uses the same API modules as the main app - no direct Firestore access,
 * no inline script, no legacy client-side PIN comparison.
 */

import { API, ACTIVE_GROUP_KEY, ACTIVE_GROUP_NAME_KEY, ONBOARDING_SEEN_KEY, GROUP_OPEN_KEY } from './core/config.js';
import { apiPost } from './core/api-client.js';
import { setGroupSession } from './core/state.js';
import { initSkyJourney } from './journey.js';

/** @type {Array<{id: string, nama: string}>} */
let groups = [];

/** @type {{id: string, nama: string}|null} */
let active = null;

/* ── Helpers ──────────────────────────────────────────────────────── */

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

const el = (id) => document.getElementById(id);

/* ── Screen transitions ───────────────────────────────────────────── */

const showSlide = (name) => {
  ['state-welcome', 'state-list', 'state-pin'].forEach((s) => {
    const node = el(s);
    if (node) node.classList.toggle('hidden', s !== `state-${name}`);
  });
  window.scrollTo(0, 0);
};

/* ── Group list ───────────────────────────────────────────────────── */

const renderList = () => {
  const box = el('group-list');
  if (!box) return;

  if (!groups.length) {
    box.innerHTML = '<p class="loading-state">Belum ada grup. Minta admin pemilik membuatkan grup.</p>';
    return;
  }

  // Every group uses the same accent monogram tile
  box.innerHTML = groups.map((g) => {
    const initial = esc(g.nama.charAt(0).toUpperCase());
    return `
      <button class="group-item" data-id="${esc(g.id)}">
        <span class="group-avatar" aria-hidden="true">${initial}</span>
        <span class="group-texts"><h3>${esc(g.nama)}</h3><small>Ketuk untuk masuk</small></span>
        <i class="ph-bold ph-caret-right group-chev" aria-hidden="true"></i>
      </button>`;
  }).join('');

  box.querySelectorAll('.group-item').forEach((btn) => {
    btn.addEventListener('click', () => pickGroup(btn.getAttribute('data-id')));
  });
};

const loadGroups = async () => {
  const res = await apiPost(API.DATA, { action: 'groups' });
  if (res && res.status && Array.isArray(res.data?.groups)) {
    groups = res.data.groups;
  } else {
    const box = el('group-list');
    if (box) box.innerHTML = '<p class="loading-state">Gagal memuat. Periksa internet lalu muat ulang.</p>';
    return;
  }
  renderList();
};

/* ── PIN screen ───────────────────────────────────────────────────── */

const pickGroup = (id) => {
  active = groups.find((g) => g.id === id) || null;
  if (!active) return;

  const nameEl = el('pin-name');
  if (nameEl) nameEl.replaceChildren(document.createTextNode(active.nama));

  ['pin0', 'pin1', 'pin2', 'pin3'].forEach((p) => {
    const inp = el(p);
    if (inp) inp.value = '';
  });
  setMsg('');
  showSlide('pin');
  setTimeout(() => el('pin0')?.focus(), 120);
};

const setMsg = (text, isAlert = false) => {
  const msgEl = el('pin-msg');
  if (!msgEl) return;
  if (!text) { msgEl.replaceChildren(); return; }

  if (isAlert) {
    msgEl.innerHTML = `<span class="pin-msg-alert"><i class="ph-bold ph-warning-circle"></i> ${esc(text)}</span>`;
  } else {
    msgEl.replaceChildren(document.createTextNode(text));
  }
};

/* ── PIN submission - server-only verification ────────────────────── */

const submitPin = async () => {
  if (!active) return;

  const pin = ['pin0', 'pin1', 'pin2', 'pin3']
    .map((p) => el(p)?.value || '')
    .join('');

  if (pin.length < 4) {
    setMsg('Ketik 4 angka PIN dulu.', true);
    return;
  }

  const btn = el('btn-enter');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph-bold ph-spinner-gap lp-spin"></i> Memverifikasi...'; }

  try {
    const res = await apiPost(API.VERIFY_PIN, { groupId: active.id, pin });

    if (res && res.status && res.data?.sessionToken) {
      setGroupSession(active.id, res.data.sessionToken);
      enterApp();
      return;
    }

    const message = (res && res.message) || 'PIN salah.';
    setMsg(message, true);

    // Clear PIN boxes and refocus
    ['pin0', 'pin1', 'pin2', 'pin3'].forEach((p) => {
      const inp = el(p);
      if (inp) inp.value = '';
    });
    el('pin0')?.focus();
  } catch (err) {
    setMsg('Gagal memeriksa PIN. Periksa koneksi internet.', true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="ph-bold ph-sign-in"></i> Masuk Grup';
    }
  }
};

/* ── Enter app ────────────────────────────────────────────────────── */

const enterApp = () => {
  try {
    localStorage.setItem(ACTIVE_GROUP_KEY, active.id);
    localStorage.setItem(ACTIVE_GROUP_NAME_KEY, active.nama);
    localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    localStorage.setItem(GROUP_OPEN_KEY, '1');
  } catch (err) {
    console.warn('[finkas] Cannot persist group entry:', err?.message);
  }
  location.href = 'index.html';
};

/* ── PIN input wiring ─────────────────────────────────────────────── */

const wirePinBoxes = () => {
  const boxes = document.querySelectorAll('.pin-digit-box');
  boxes.forEach((box, idx) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(0, 1);
      if (box.value && idx < 3) boxes[idx + 1].focus();
      const pin = Array.from(boxes).map((b) => b.value).join('');
      if (pin.length === 4) submitPin();
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) boxes[idx - 1].focus();
      if (e.key === 'ArrowLeft' && idx > 0) boxes[idx - 1].focus();
      if (e.key === 'ArrowRight' && idx < 3) boxes[idx + 1].focus();
    });

    box.addEventListener('paste', (e) => {
      const digits = ((e.clipboardData || window.clipboardData).getData('text') || '')
        .replace(/\D/g, '').slice(0, 4);
      if (!digits.length) return;
      e.preventDefault();
      digits.split('').forEach((d, i) => { if (boxes[i]) boxes[i].value = d; });
      if (digits.length === 4) submitPin();
      else if (boxes[digits.length]) boxes[digits.length].focus();
    });

    box.addEventListener('focus', () => box.select());
  });
};

/* ── Interactive Demo Simulator ───────────────────────────────────── */

const INITIAL_DEMO_SALDO = 14850000;
let currentDemoSaldo = INITIAL_DEMO_SALDO;
let isBudiPaid = false;

const formatRp = (num) =>
  'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** True while the mock balance is still counting up (Fase 8.7). */
let isCountUpRunning = false;

/**
 * 8.11 — a soft veil lights up over an amount the moment it changes. The class
 * is removed and re-added (with a forced reflow) rather than toggled, so that
 * pressing the same button twice restarts the 0.2s flash instead of the second
 * press being swallowed as "nothing changed".
 */
const flashSaldo = (node) => {
  if (!node) return;
  node.classList.remove('is-lp-flash');
  void node.offsetWidth; /* force reflow: restarts the keyframes */
  node.classList.add('is-lp-flash');
};

const updateDemoViews = () => {
  const formatted = formatRp(currentDemoSaldo);
  const heroEl = el('hero-demo-saldo');
  const simEl = el('sim-saldo');
  /* A simulator press takes ownership of the number: the count-up stops on its
     next frame, so it can never overwrite what the visitor just asked for. */
  isCountUpRunning = false;
  if (heroEl) { heroEl.textContent = formatted; flashSaldo(heroEl); }
  if (simEl) { simEl.textContent = formatted; flashSaldo(simEl); }
};

const wireDemoSimulator = () => {
  el('sim-btn-add-income')?.addEventListener('click', () => {
    currentDemoSaldo += 50000;
    updateDemoViews();
    const msg = el('sim-feedback-msg');
    if (msg) msg.textContent = `+ Rp 50.000 tercatat! Saldo simulasi sekarang ${formatRp(currentDemoSaldo)}.`;
  });

  el('sim-btn-toggle-dues')?.addEventListener('click', () => {
    isBudiPaid = !isBudiPaid;
    const badge = el('hero-demo-budi-badge');
    if (badge) {
      if (isBudiPaid) {
        badge.className = 'mock-badge paid';
        badge.textContent = 'PAID';
      } else {
        badge.className = 'mock-badge unpaid';
        badge.textContent = 'BELUM';
      }
    }
    const msg = el('sim-feedback-msg');
    if (msg) {
      msg.textContent = isBudiPaid
        ? 'Status iuran Budi Santoso diubah menjadi LUNAS (PAID).'
        : 'Status iuran Budi Santoso diubah menjadi BELUM bayar.';
    }
  });

  el('sim-btn-reset')?.addEventListener('click', () => {
    currentDemoSaldo = INITIAL_DEMO_SALDO;
    isBudiPaid = false;
    updateDemoViews();
    const badge = el('hero-demo-budi-badge');
    if (badge) {
      badge.className = 'mock-badge unpaid';
      badge.textContent = 'BELUM';
    }
    const msg = el('sim-feedback-msg');
    if (msg) msg.textContent = 'Simulasi dikembalikan ke saldo awal.';
  });
};

/* ── Fase 8 — Reveal & entrance ───────────────────────────────────── */

/** Every element that fades in once it enters the viewport (8.4 / 8.5). */
const REVEAL_SELECTOR = '[data-lp-reveal]';

/** One switch, shared by every motion decision made in JavaScript (8.13). */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Count-up duration — mirrors --lp-t-reveal (2.5s) in css/onboarding.css. */
const COUNT_UP_MS = 2500;

const revealNow = (node) => node.classList.add('is-lp-revealed');

/**
 * 8.7 — the mock balance counts from zero to Rp 14.850.000 over 2.5s on the
 * same calm S-curve as the hero entrance (smoothstep; no overshoot).
 *
 * Two things make it safe:
 *   - the numerals are tabular, so a counting number never changes width and
 *     nothing around it moves (the plan's "no layout shift" gate);
 *   - if the visitor presses a simulator button mid-count, or reduced motion
 *     is on, the loop stops and the real value wins.
 */
const startBalanceCountUp = () => {
  const node = el('hero-demo-saldo');
  if (!node || isCountUpRunning) return;

  const settle = () => {
    isCountUpRunning = false;
    node.textContent = formatRp(currentDemoSaldo);
  };

  /* Reduced motion, or a value the visitor already changed: leave the number
     alone. The markup already ships the final amount, so nothing is lost. */
  if (reducedMotion.matches || currentDemoSaldo !== INITIAL_DEMO_SALDO) { settle(); return; }

  isCountUpRunning = true;
  node.classList.add('lp-counting');

  const target = INITIAL_DEMO_SALDO;
  const startedAt = performance.now();

  const frame = (now) => {
    if (!isCountUpRunning || currentDemoSaldo !== INITIAL_DEMO_SALDO) { settle(); return; }
    const t = Math.min(1, (now - startedAt) / COUNT_UP_MS);
    const eased = t * t * (3 - 2 * t);
    node.textContent = formatRp(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(frame);
    else settle();
  };

  node.textContent = formatRp(0);
  requestAnimationFrame(frame);
};

/**
 * 8.4 + 8.5 — a single IntersectionObserver drives every entrance on the page:
 * the product band resolves out of its 8px blur, and each section fades once
 * and is then unobserved, so nothing re-animates on the way back up.
 *
 * Failure law (8.14): if IntersectionObserver is unavailable, or reduced motion
 * is on, every element is revealed immediately. Nothing may stay hidden.
 */
const initSectionReveal = () => {
  const nodes = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
  if (!nodes.length) return;

  if (reducedMotion.matches || typeof IntersectionObserver !== 'function') {
    nodes.forEach(revealNow);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const node = entry.target;
      revealNow(node);
      observer.unobserve(node);
      /* The blurred band is the product band, and revealing it is the cue for
         the mock balance to start counting (8.7). */
      if (node.getAttribute('data-lp-reveal') === 'blur') startBalanceCountUp();
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  nodes.forEach((node) => observer.observe(node));
};

/* ── Boot ─────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  /* Bagian 14 — panggung langit→bumi. Berdiri sendiri: ia hanya menulis
     custom property pada .sky-stage, tidak menyentuh logika layar mana pun,
     dan sengaja dipanggil paling awal supaya latar sudah benar sebelum
     pengguna sempat menggeser halaman. */
  initSkyJourney();

  wirePinBoxes();
  wireDemoSimulator();

  /* Fase 8 — reveal & entrance. Dipanggil setelah initSkyJourney() karena
     kelas .js-motion-lah yang menyalakan state tersembunyi; kalau pemasangan
     ini gagal, catch di bawah mengembalikan seluruh section ke keadaan
     terlihat (8.14). */
  try {
    initSectionReveal();
  } catch (err) {
    console.warn('[finkas] Reveal wiring failed; showing every section.', err?.message);
    document.querySelectorAll(REVEAL_SELECTOR).forEach(revealNow);
  }

  const openPortal = () => {
    showSlide('list');
    loadGroups();
  };

  el('btn-enter')?.addEventListener('click', submitPin);
  el('btn-to-list')?.addEventListener('click', openPortal);
  el('btn-to-list-bottom')?.addEventListener('click', openPortal);
  el('btn-nav-portal')?.addEventListener('click', openPortal);
  el('btn-nav-portal-drawer')?.addEventListener('click', () => { closeDrawer(); openPortal(); });
  el('btn-to-welcome')?.addEventListener('click', () => showSlide('welcome'));
  el('btn-back')?.addEventListener('click', () => showSlide('list'));

  document.querySelectorAll('a[href="index.html"]').forEach((a) => {
    a.addEventListener('click', () => {
      try { localStorage.setItem(ONBOARDING_SEEN_KEY, '1'); } catch (err) { /* noop */ }
    });
  });

  /* ── 3.5 is-scrolled + 3.6 progress bar + 3.8 scroll-spy ──────────── */
  const nav      = el('landing-nav');
  const progress = el('nav-progress');
  const SPY_IDS  = ['fitur', 'matriks', 'demo-simulator', 'faq'];
  const spyEls   = SPY_IDS.map((id) => document.getElementById(id)).filter(Boolean);
  const allSpyLinks = document.querySelectorAll('.nav-spy-link');

  function updateScrollState() {
    const scrollY  = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    /* 8.8 — the progress bar is driven by transform: scaleX(), so the value
       written is a unitless 0…1 ratio. Width is never animated. */
    if (progress) {
      const ratio = maxScroll > 0 ? Math.min(1, scrollY / maxScroll) : 0;
      progress.style.setProperty('--lp-scroll-ratio', ratio.toFixed(4));
    }

    /* is-scrolled */
    if (nav) nav.classList.toggle('is-scrolled', scrollY > 40);

    /* scroll-spy: find last section whose top is above 50% viewport */
    let activeId = '';
    const threshold = window.innerHeight * 0.35;
    for (const sec of spyEls) {
      if (sec.getBoundingClientRect().top < threshold) activeId = sec.id;
    }
    allSpyLinks.forEach((a) => {
      const href = a.getAttribute('href');
      a.classList.toggle('is-active', href === '#' + activeId);
    });
  }

  window.addEventListener('scroll', updateScrollState, { passive: true });
  updateScrollState();

  /* ── 3.7 Hamburger + Drawer ────────────────────────────────────────── */
  const hamburger  = el('nav-hamburger');
  const drawer     = el('nav-drawer');
  const backdrop   = el('nav-backdrop');
  const hamburgerIcon = el('hamburger-icon');
  let drawerOpen   = false;

  function openDrawer() {
    drawerOpen = true;
    drawer?.classList.add('is-open');
    backdrop?.classList.add('is-open');
    hamburger?.setAttribute('aria-expanded', 'true');
    if (hamburgerIcon) { hamburgerIcon.className = 'ph-bold ph-x'; }
    drawer?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; /* scroll-lock */
    /* focus trap: first focusable */
    const first = drawer?.querySelector('a, button');
    first?.focus();
  }

  function closeDrawer() {
    drawerOpen = false;
    drawer?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    hamburger?.setAttribute('aria-expanded', 'false');
    if (hamburgerIcon) { hamburgerIcon.className = 'ph-bold ph-list'; }
    drawer?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    hamburger?.focus();
  }

  hamburger?.addEventListener('click', () => drawerOpen ? closeDrawer() : openDrawer());
  backdrop?.addEventListener('click', closeDrawer);

  /* Esc closes drawer */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerOpen) closeDrawer();
  });

  /* Focus trap inside drawer */
  drawer?.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !drawerOpen) return;
    const focusable = Array.from(drawer.querySelectorAll('a, button')).filter(
      (el) => !el.disabled && el.offsetParent !== null
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  /* Close drawer on nav link click (smooth scroll handled by browser) */
  drawer?.querySelectorAll('.drawer-link').forEach((a) => {
    a.addEventListener('click', closeDrawer);
  });

  /* ── 6.6 FAQ Accordion (BUG-9) — dua arah, bukan <details> ────────── */
  document.querySelectorAll('.faq-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      /* tutup semua lainnya dulu */
      document.querySelectorAll('.faq-trigger').forEach((other) => {
        other.setAttribute('aria-expanded', 'false');
      });
      /* toggle yang diklik */
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });
});
