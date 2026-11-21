/**
 * @module onboarding
 * CSP-clean ES module for the Finkas landing & group portal page.
 *
 * Keeps real server PIN authentication (scrypt + HMAC session tokens via API),
 * group list search/selection, scroll-driven backdrop, and interactive specimens.
 */
import { resetPinInput, syncPinInput, wirePinInput } from './ui/pin-input.js';
import { API, ACTIVE_GROUP_KEY, ACTIVE_GROUP_NAME_KEY, ONBOARDING_SEEN_KEY, GROUP_OPEN_KEY } from './core/config.js';
import { apiPost } from './core/api-client.js';
import { setGroupSession } from './core/state.js';
import { escapeHtml as esc } from './core/utils.js';
import { initSkyJourney } from './journey.js';
import { INITIAL_DEMO_SALDO, initOnboardingStage } from './onboarding-stage.js';
import {
  initThemeToggle,
  initHorizonSpline,
  initSectionReveal,
  initAmbientMotion,
  initFeatureDossier,
  initEditorialFooter
} from './onboarding-motion.js';

/** @type {Array<{id: string, nama: string}>} */
let groups = [];

/** @type {{id: string, nama: string}|null} */
let active = null;

/** Prevents duplicate concurrent /api/data?action=groups fetches. */
let loadingGroupsPromise = null;

/** Prevents double PIN submissions (Enter right after 4th digit) from costing attempts. */
let submittingPin = false;

/** Scroll & ambient state updater, wired during DOMContentLoaded. */
let refreshScrollState = null;

const el = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ── Screen transitions ───────────────────────────────────────────── */

const showSlide = (name) => {
  ['state-welcome', 'state-list', 'state-pin'].forEach((s) => {
    el(s)?.classList.toggle('hidden', s !== `state-${name}`);
  });
  const isWelcome = name === 'welcome';
  el('nav-progress')?.classList.toggle('is-hidden', !isWelcome);

  const navPortalBtn = el('btn-nav-portal');
  if (navPortalBtn) {
    if (isWelcome) navPortalBtn.removeAttribute('aria-current');
    else navPortalBtn.setAttribute('aria-current', 'page');
  }

  if (!isWelcome) {
    document.querySelectorAll('.nav-spy-link.is-active').forEach((link) => {
      link.classList.remove('is-active');
    });
  }

  window.scrollTo(0, 0);
  if (isWelcome && refreshScrollState) {
    requestAnimationFrame(refreshScrollState);
  }
};

/* ── Group list & live search ─────────────────────────────────────── */

const groupInitials = (nama) => {
  const clean = String(nama || '').replace(/^Kas\s+/i, '').trim();
  const letters = clean.slice(0, 2) || String(nama || '').charAt(0) || 'K';
  return esc(letters.toUpperCase());
};

const renderList = (query = '') => {
  const box = el('group-list');
  if (!box) return;

  if (!groups.length) {
    box.innerHTML = '<p class="loading-state">Belum ada grup. Minta admin pemilik membuatkan grup.</p>';
    return;
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? groups.filter((g) => String(g.nama || '').toLowerCase().includes(q) || String(g.id || '').toLowerCase().includes(q))
    : groups;

  if (!filtered.length) {
    box.innerHTML = '<p class="loading-state">Grup kas tidak ditemukan.</p>';
    return;
  }

  box.innerHTML = filtered.map((g) => `
      <button type="button" class="group-item" data-id="${esc(g.id)}">
        <span class="group-avatar" aria-hidden="true">${groupInitials(g.nama)}</span>
        <span class="group-texts"><h3>${esc(g.nama)}</h3><small>Ketuk untuk masuk</small></span>
        <i class="ph-bold ph-caret-right group-chev" aria-hidden="true"></i>
      </button>`).join('');

  box.querySelectorAll('.group-item').forEach((btn) => {
    btn.addEventListener('click', () => pickGroup(btn.getAttribute('data-id')));
  });
};

const loadGroups = async () => {
  if (loadingGroupsPromise) return loadingGroupsPromise;
  const box = el('group-list');
  if (box && !groups.length) {
    box.innerHTML = '<p class="loading-state">Memuat daftar grup...</p>';
  }
  loadingGroupsPromise = (async () => {
    try {
      const res = await apiPost(API.DATA, { action: 'groups' });
      if (res && res.status && Array.isArray(res.data?.groups)) {
        groups = res.data.groups;
        renderList(el('group-search-input')?.value || '');
        return;
      }
    } catch (_) {
      // Handled by fallback message below
    }
    if (box && !groups.length) {
      box.innerHTML = '<p class="loading-state">Gagal memuat. Periksa internet lalu muat ulang.</p>';
    }
  })().finally(() => {
    loadingGroupsPromise = null;
  });
  return loadingGroupsPromise;
};

/* ── PIN screen ───────────────────────────────────────────────────── */

const pickGroup = (id) => {
  active = groups.find((g) => g.id === id) || null;
  if (!active) return;

  const nameEl = el('pin-name');
  if (nameEl) nameEl.replaceChildren(document.createTextNode(active.nama));

  resetPinInput(el('group-pin'));
  setMsg('');
  showSlide('pin');
  setTimeout(() => el('group-pin')?.focus(), 120);
};

const setMsg = (text, isAlert = false) => {
  el('group-pin')?.setAttribute('aria-invalid', String(isAlert));
  const msgEl = el('pin-msg');
  if (!msgEl) return;
  if (!text) {
    msgEl.replaceChildren();
    return;
  }

  if (isAlert) {
    msgEl.innerHTML = `<span class="pin-msg-alert"><i class="ph-bold ph-warning-circle" aria-hidden="true"></i> ${esc(text)}</span>`;
  } else {
    msgEl.replaceChildren(document.createTextNode(text));
  }
};

/* ── PIN submission — server-only verification ────────────────────── */

const submitPin = async () => {
  if (!active || submittingPin) return;

  const pin = el('group-pin')?.value || '';
  if (!/^\d{4}$/.test(pin)) {
    setMsg('Ketik 4 angka PIN dulu.', true);
    return;
  }

  submittingPin = true;
  const btn = el('btn-enter');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="ph-bold ph-spinner-gap lp-spin" aria-hidden="true"></i> <span>Memverifikasi...</span>';
  }

  try {
    const res = await apiPost(API.VERIFY_PIN, { groupId: active.id, pin });

    if (res && res.status && res.data?.sessionToken) {
      setGroupSession(active.id, res.data.sessionToken);
      enterApp();
      return;
    }

    const message = (res && res.message) || 'PIN salah.';
    setMsg(message, true);
    const firstPin = el('group-pin');
    const pinRow = firstPin?.closest?.('.pin-input-row');
    if (pinRow) {
      pinRow.classList.remove('is-error');
      void pinRow.offsetWidth;
      pinRow.classList.add('is-error');
    }

    if (firstPin) {
      firstPin.value = '';
      syncPinInput(firstPin);
    }
    firstPin?.focus();
  } catch (err) {
    setMsg('Gagal memeriksa PIN. Periksa koneksi internet.', true);
  } finally {
    submittingPin = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="ph-bold ph-sign-in" aria-hidden="true"></i> <span>Masuk Grup</span>';
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

const wirePinBoxes = () => wirePinInput(el('group-pin'), submitPin);

/* ── Mobile Drawer & FAQ Accordion ────────────────────────────────── */

const initDrawerAndFaq = () => {
  const hamburger = el('nav-hamburger');
  const drawer = el('nav-drawer');
  const backdrop = el('nav-backdrop');
  const hamburgerIcon = el('hamburger-icon');
  let drawerOpen = false;

  const openDrawer = () => {
    drawerOpen = true;
    drawer?.classList.add('is-open');
    backdrop?.classList.add('is-open');
    hamburger?.setAttribute('aria-expanded', 'true');
    if (hamburgerIcon) hamburgerIcon.className = 'ph-bold ph-x';
    drawer?.setAttribute('aria-hidden', 'false');
    drawer?.removeAttribute('inert');
    document.body.classList.add('nav-scroll-lock');
    drawer?.querySelector('a, button')?.focus();
  };

  const closeDrawer = () => {
    drawerOpen = false;
    drawer?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    hamburger?.setAttribute('aria-expanded', 'false');
    if (hamburgerIcon) hamburgerIcon.className = 'ph-bold ph-list';
    drawer?.setAttribute('aria-hidden', 'true');
    drawer?.setAttribute('inert', '');
    document.body.classList.remove('nav-scroll-lock');
  };

  hamburger?.addEventListener('click', () => (drawerOpen ? closeDrawer() : openDrawer()));
  backdrop?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerOpen) {
      closeDrawer();
      hamburger?.focus();
    }
  });

  drawer?.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !drawerOpen) return;
    const focusable = Array.from(drawer.querySelectorAll('a, button')).filter(
      (node) => !node.disabled && node.offsetParent !== null
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  document.querySelectorAll('.nav-spy-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (drawerOpen) closeDrawer();
      if (el('state-welcome')?.classList.contains('hidden')) {
        showSlide('welcome');
      }
    });
  });

  el('nav-brand-home')?.addEventListener('click', () => {
    if (drawerOpen) closeDrawer();
    if (el('state-welcome')?.classList.contains('hidden')) {
      showSlide('welcome');
    }
  });

  document.querySelectorAll('.faq-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.faq-trigger').forEach((other) => {
        other.setAttribute('aria-expanded', 'false');
      });
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });

  return { closeDrawer };
};

/* ── Boot ─────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initSkyJourney();

  let horizonCtrl = null;
  const stage = initOnboardingStage({
    reducedMotion,
    onWave: (dir) => horizonCtrl?.wave(dir)
  });

  horizonCtrl = initHorizonSpline({
    reducedMotion,
    getSaldo: stage.getSaldo,
    initialSaldo: INITIAL_DEMO_SALDO
  });

  initThemeToggle({
    reducedMotion,
    onThemeApplied: () => horizonCtrl?.redraw()
  });

  const ambient = initAmbientMotion({
    reducedMotion,
    horizonCtrl,
    isWelcomeVisible: () => !el('state-welcome')?.classList.contains('hidden')
  });
  refreshScrollState = ambient.updateScrollState;

  initFeatureDossier({ reducedMotion, horizonCtrl });
  initEditorialFooter({ reducedMotion, horizonCtrl });

  try {
    initSectionReveal(reducedMotion, stage.startBalanceCountUp);
  } catch (err) {
    console.warn('[finkas] Reveal wiring failed; showing sections.', err?.message);
    document.querySelectorAll('[data-lp-reveal]').forEach((n) => n.classList.add('is-lp-revealed'));
  }

  wirePinBoxes();
  const { closeDrawer } = initDrawerAndFaq();

  const openPortal = () => {
    const searchInput = el('group-search-input');
    if (searchInput) searchInput.value = '';
    showSlide('list');
    loadGroups();
  };

  el('group-search-input')?.addEventListener('input', (e) => {
    renderList(e.target.value || '');
  });
  el('btn-enter')?.addEventListener('click', submitPin);
  el('btn-to-list')?.addEventListener('click', openPortal);
  el('btn-to-list-bottom')?.addEventListener('click', openPortal);
  el('btn-nav-portal')?.addEventListener('click', openPortal);
  el('btn-nav-portal-drawer')?.addEventListener('click', () => {
    closeDrawer();
    openPortal();
  });
  el('btn-to-welcome')?.addEventListener('click', () => showSlide('welcome'));
  el('btn-back')?.addEventListener('click', () => showSlide('list'));

  document.querySelectorAll('a[href="index.html"]').forEach((a) => {
    a.addEventListener('click', () => {
      try {
        localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
      } catch (_) {}
    });
  });
});
