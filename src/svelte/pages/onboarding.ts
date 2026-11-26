/**
 * @module onboarding
 * CSP-clean ES module for the Finkas landing & group portal page.
 *
 * Keeps real server PIN authentication (scrypt + HMAC session tokens via API),
 * group list search/selection, scroll-driven backdrop, and interactive specimens.
 */
import { resetPinInput, syncPinInput, wirePinInput } from '../ui/pin-input';
import { API, ACTIVE_GROUP_KEY, ACTIVE_GROUP_NAME_KEY, ONBOARDING_SEEN_KEY, GROUP_OPEN_KEY } from 'finkas/core/config';
import { apiPost } from 'finkas/core/api-client';
import { setGroupSession } from 'finkas/core/state';
import { syncOnboardingGroupList } from '../onboarding/mount';
import { initSkyJourney } from './journey';
import { INITIAL_DEMO_SALDO, initOnboardingStage } from './onboarding-stage';
import {
  initThemeToggle,
  initHorizonSpline,
  initSectionReveal,
  initAmbientMotion,
  initFeatureDossier,
  initEditorialFooter
} from './onboarding-motion';

type Group = { id: string; nama: string };
let groups: Group[] = [];

let active: Group | null = null;

/** Prevents duplicate concurrent /api/data?action=groups fetches. */
let loadingGroupsPromise: Promise<void> | null = null;

/** Prevents double PIN submissions (Enter right after 4th digit) from costing attempts. */
let submittingPin = false;

/** Scroll & ambient state updater, wired during DOMContentLoaded. */
let refreshScrollState: (() => void) | null = null;

const el = (id: string) => document.getElementById(id);
const input = (id: string) => el(id) as HTMLInputElement | null;

/* ── Screen transitions ───────────────────────────────────────────── */

const showSlide = (name: 'welcome' | 'list' | 'pin') => {
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

const groupInitials = (nama: string) => {
  const clean = String(nama || '').replace(/^Kas\s+/i, '').trim();
  const letters = clean.slice(0, 2) || String(nama || '').charAt(0) || 'K';
  return letters.toUpperCase();
};

const renderList = (query = '') => {
  if (!el('group-list')) return;

  if (!groups.length) {
    syncOnboardingGroupList({ status: 'empty', onPick: pickGroup });
    return;
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? groups.filter((g) => String(g.nama || '').toLowerCase().includes(q) || String(g.id || '').toLowerCase().includes(q))
    : groups;

  if (!filtered.length) {
    syncOnboardingGroupList({ status: 'not-found', onPick: pickGroup });
    return;
  }

  const items = filtered.map(g => ({
    id: String(g.id), name: String(g.nama || ''), initials: groupInitials(g.nama)
  }));
  syncOnboardingGroupList({ status: 'ready', items, onPick: pickGroup });
};

const loadGroups = async () => {
  if (loadingGroupsPromise) return loadingGroupsPromise;
  const box = el('group-list');
  if (box && !groups.length) {
    syncOnboardingGroupList({ status: 'loading', onPick: pickGroup });
  }
  loadingGroupsPromise = (async () => {
    try {
      const res = await apiPost<{ groups: Group[] }>(API.DATA, { action: 'groups' });
      if (res && res.status && Array.isArray(res.data?.groups)) {
        groups = res.data.groups;
        renderList(input('group-search-input')?.value || '');
        return;
      }
    } catch (_) {
      // Handled by fallback message below
    }
    if (box && !groups.length) {
      syncOnboardingGroupList({ status: 'error', onPick: pickGroup });
    }
  })().finally(() => {
    loadingGroupsPromise = null;
  });
  return loadingGroupsPromise;
};

/* ── PIN screen ───────────────────────────────────────────────────── */

const pickGroup = (id: string) => {
  active = groups.find((g) => String(g.id) === id) || null;
  if (!active) return;

  const nameEl = el('pin-name');
  if (nameEl) nameEl.replaceChildren(document.createTextNode(active.nama));

  resetPinInput(input('group-pin'));
  setMsg('');
  showSlide('pin');
  setTimeout(() => input('group-pin')?.focus(), 120);
};

const setMsg = (text: string, isAlert = false) => {
  input('group-pin')?.setAttribute('aria-invalid', String(isAlert));
  const msgEl = el('pin-msg');
  if (!msgEl) return;
  if (!text) {
    msgEl.replaceChildren();
    return;
  }

  if (isAlert && typeof document.createElement === 'function') {
    const wrap = document.createElement('span');
    wrap.className = 'pin-msg-alert';
    const icon = document.createElement('i');
    icon.className = 'ph-bold ph-warning-circle';
    icon.setAttribute('aria-hidden', 'true');
    wrap.append(icon, document.createTextNode(' ' + text));
    msgEl.replaceChildren(wrap);
  } else {
    msgEl.replaceChildren(document.createTextNode(text));
  }
};

/* ── PIN submission — server-only verification ────────────────────── */

const setEnterButtonState = (btn: HTMLButtonElement, iconClass: string, label: string) => {
  const icon = document.createElement('i');
  icon.className = iconClass;
  icon.setAttribute('aria-hidden', 'true');
  const span = document.createElement('span');
  span.textContent = label;
  btn.replaceChildren(icon, document.createTextNode(' '), span);
};

export async function submitPin(): Promise<void> {
  if (!active || submittingPin) return;

  const pin = input('group-pin')?.value || '';
  if (!/^\d{4}$/.test(pin)) {
    setMsg('Ketik 4 angka PIN dulu.', true);
    return;
  }

  submittingPin = true;
  const btn = el('btn-enter') as HTMLButtonElement | null;
  if (btn) {
    btn.disabled = true;
    setEnterButtonState(btn, 'ph-bold ph-spinner-gap lp-spin', 'Memverifikasi...');
  }

  try {
    const res = await apiPost<{ sessionToken: string }>(API.VERIFY_PIN, { groupId: active.id, pin });

    if (res && res.status && res.data?.sessionToken) {
      setGroupSession(active.id, res.data.sessionToken);
      enterApp();
      return;
    }

    const message = (res && res.message) || 'PIN salah.';
    setMsg(message, true);
    const firstPin = input('group-pin');
    const pinRow = firstPin?.closest?.<HTMLElement>('.pin-input-row');
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
      setEnterButtonState(btn, 'ph-bold ph-sign-in', 'Masuk Grup');
    }
  }
}

/* ── Enter app ────────────────────────────────────────────────────── */

const enterApp = () => {
  if (!active) return;
  try {
    localStorage.setItem(ACTIVE_GROUP_KEY, active.id);
    localStorage.setItem(ACTIVE_GROUP_NAME_KEY, active.nama);
    localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    localStorage.setItem(GROUP_OPEN_KEY, '1');
  } catch (err) {
    console.warn('[finkas] Cannot persist group entry:', (err instanceof Error ? err.message : String(err)));
  }
  location.href = 'index.html';
};

const wirePinBoxes = () => wirePinInput(input('group-pin'), submitPin);

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
    const first = drawer?.querySelector<HTMLElement>('a, button');
    first?.focus();
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
    const focusable = Array.from(drawer.querySelectorAll<HTMLElement>('a, button')).filter(
      (node) => !node.hasAttribute('disabled') && node.offsetParent !== null
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

const initializePage = () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  initSkyJourney();

  let horizonCtrl: ReturnType<typeof initHorizonSpline> = null;
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
    console.warn('[finkas] Reveal wiring failed; showing sections.', (err instanceof Error ? err.message : String(err)));
    document.querySelectorAll('[data-lp-reveal]').forEach((n) => n.classList.add('is-lp-revealed'));
  }

  wirePinBoxes();
  const { closeDrawer } = initDrawerAndFaq();

  const openPortal = () => {
    const searchInput = input('group-search-input');
    if (searchInput) searchInput.value = '';
    showSlide('list');
    loadGroups();
  };

  const search = input('group-search-input');
  search?.addEventListener('input', () => {
    renderList(search.value);
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
};

let booted = false;
export function bootOnboardingPage(): void {
  if (booted || typeof document === 'undefined') return;
  booted = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializePage);
  else initializePage();
}
