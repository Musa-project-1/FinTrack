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
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Memverifikasi...'; }

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

const updateDemoViews = () => {
  const formatted = formatRp(currentDemoSaldo);
  const heroEl = el('hero-demo-saldo');
  const simEl = el('sim-saldo');
  if (heroEl) heroEl.textContent = formatted;
  if (simEl) simEl.textContent = formatted;
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

/* ── Boot ─────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  wirePinBoxes();
  wireDemoSimulator();

  const openPortal = () => {
    showSlide('list');
    loadGroups();
  };

  el('btn-enter')?.addEventListener('click', submitPin);
  el('btn-to-list')?.addEventListener('click', openPortal);
  el('btn-to-list-bottom')?.addEventListener('click', openPortal);
  el('btn-nav-portal')?.addEventListener('click', openPortal);
  el('btn-to-welcome')?.addEventListener('click', () => showSlide('welcome'));
  el('btn-back')?.addEventListener('click', () => showSlide('list'));

  document.querySelectorAll('a[href="index.html"]').forEach((a) => {
    a.addEventListener('click', () => {
      try { localStorage.setItem(ONBOARDING_SEEN_KEY, '1'); } catch (err) { /* noop */ }
    });
  });
});
