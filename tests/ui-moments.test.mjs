import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  isReducedMotion,
  renderOdometerValue,
  flashDownloadRing,
  flashPaperPlane,
  animateHybridAmount,
  runGroupSwitchTransition,
  spinDashboardOdometers
} from '../src/ui/svelte-dashboard.js';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

let dom;
let savedDoc;
let savedWin;
let savedSetTimeout;
let savedClearTimeout;
let scheduledTimers;
let nextTimerId;

beforeEach(() => {
  dom ??= new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test' });
  const { window } = dom;
  window.document.body.innerHTML = '';

  savedDoc = globalThis.document;
  savedWin = globalThis.window;
  savedSetTimeout = globalThis.setTimeout;
  savedClearTimeout = globalThis.clearTimeout;

  scheduledTimers = [];
  nextTimerId = 1;
  globalThis.setTimeout = (fn, ms = 0) => {
    const id = nextTimerId++;
    scheduledTimers.push({ id, fn, ms, active: true });
    return id;
  };
  globalThis.clearTimeout = (id) => {
    const item = scheduledTimers.find((entry) => entry.id === id);
    if (item) item.active = false;
  };

  window.matchMedia = () => ({ matches: false });
  globalThis.document = window.document;
  globalThis.window = window;
});

afterEach(() => {
  globalThis.document = savedDoc;
  globalThis.window = savedWin;
  globalThis.setTimeout = savedSetTimeout;
  globalThis.clearTimeout = savedClearTimeout;
});

test('v321 #29 Odometer renders per-digit reels while preserving exact textContent', () => {
  assert.equal(isReducedMotion(), false);
  const el = document.createElement('div');
  el.id = 'ui-saldo';
  renderOdometerValue(el, 'Rp\u00a0150.000', 'Rp\u00a0120.000', 'up');

  assert.equal(el.textContent, 'Rp\u00a0150.000');
  const cols = [...el.querySelectorAll('.odo-col')];
  assert.equal(cols.length, 6);
  // Only the second digit ('2' -> '5') should animate up with data-prev="2"
  assert.equal(cols[0].classList.contains('is-up'), false);
  assert.equal(cols[1].classList.contains('is-up'), true);
  assert.equal(cols[1].querySelector('.odo-reel')?.getAttribute('data-prev'), '2');
  assert.equal(cols[2].classList.contains('is-up'), false);

  renderOdometerValue(el, 'Rp\u00a085.000', 'Rp\u00a0150.000', 'down');
  assert.equal(el.textContent, 'Rp\u00a085.000');
  const downCols = [...el.querySelectorAll('.odo-col')];
  assert.equal(downCols[0].classList.contains('is-down'), true);
  assert.equal(downCols[0].querySelector('.odo-reel')?.getAttribute('data-prev'), '5');

  globalThis.window.matchMedia = () => ({ matches: true });
  assert.equal(isReducedMotion(), true);
});

test('v321 #21 Download Ring injects SVG progress check and restores original children on finish', () => {
  const btn = document.createElement('button');
  btn.type = 'button';
  Object.defineProperty(btn, 'offsetWidth', { value: 148, configurable: true });
  const icon = document.createElement('i');
  icon.className = 'ph-bold ph-file-csv';
  const span = document.createElement('span');
  span.textContent = 'Unduh CSV';
  btn.append(icon, document.createTextNode(' '), span);
  document.body.appendChild(btn);

  flashDownloadRing(btn, 'Terunduh', 1350);
  assert.equal(btn.classList.contains('is-dl-ringing'), true);
  assert.equal(btn.style.getPropertyValue('--btn-lock-w'), '148px');
  assert.ok(btn.querySelector('svg.dl-ring-svg'));
  assert.equal(btn.querySelector('circle.dl-ring-arc')?.getAttribute('pathLength'), '100');
  assert.equal(span.textContent, 'Terunduh');

  const finishTimer = scheduledTimers.find((t) => t.active && t.ms === 1350);
  assert.ok(finishTimer);
  finishTimer.fn();

  assert.equal(btn.classList.contains('is-dl-ringing'), false);
  assert.equal(btn.style.getPropertyValue('--btn-lock-w'), '');
  assert.equal(btn.querySelector('svg.dl-ring-svg'), null);
  assert.equal(btn.querySelector('i'), icon);
  assert.equal(span.textContent, 'Unduh CSV');
});

test('v321 #09 Paper Plane sequences flying takeoff -> confirmed check -> full restore', () => {
  const link = document.createElement('a');
  link.id = 'self-pay-whatsapp';
  Object.defineProperty(link, 'offsetWidth', { value: 240, configurable: true });
  const icon = document.createElement('i');
  icon.className = 'ph ph-paper-plane-tilt';
  const label = document.createElement('span');
  label.className = 'wa-plane-label';
  label.textContent = 'Buka WhatsApp untuk Konfirmasi';
  link.append(icon, label);
  document.body.appendChild(link);

  flashPaperPlane(link, 'Siap di WhatsApp ✓', 1500);
  assert.equal(link.classList.contains('is-plane-flying'), true);
  assert.equal(link.style.getPropertyValue('--btn-lock-w'), '240px');

  scheduledTimers.find((t) => t.active && t.ms === 260).fn();
  assert.equal(link.classList.contains('is-plane-flying'), false);
  assert.equal(link.classList.contains('is-plane-sent'), true);
  assert.equal(icon.className, 'ph-bold ph-check-circle');
  assert.equal(label.textContent, 'Siap di WhatsApp ✓');

  scheduledTimers.find((t) => t.active && t.ms === 1500).fn();
  assert.equal(link.classList.contains('is-plane-sent'), false);
  assert.equal(icon.className, 'ph ph-paper-plane-tilt');
  assert.equal(label.textContent, 'Buka WhatsApp untuk Konfirmasi');
});

test('v321 #20 Worm, #33 Checklist, #30 Tide Progress, #17 Menu Morph, and #28 Rubber Search satisfy style contracts', () => {
  const checklist = read('src/svelte/forms/IuranMemberChecklist.svelte');
  assert.match(checklist, /class="chk-box-svg"/);
  assert.match(checklist, /pathLength="1"/);
  assert.doesNotMatch(checklist, /transition:\s*all\b/);
  assert.doesNotMatch(checklist, /scale\(0\)/);

  const spotlight = read('src/svelte/dashboard/MemberSpotlight.svelte');
  assert.match(spotlight, /class="ring-tide"/);
  assert.match(spotlight, /--tide-pct/);
  assert.match(spotlight, /@keyframes\s+tideWaveSpin/);
  assert.match(read('src/svelte/shell/WorkspaceShell.svelte'), /class="menu-morph-bars"/);

  const workspaceCss = read('src/svelte/shell/styles/WorkspaceStyle.svelte');
  assert.match(workspaceCss, /\.workspace-glider\.is-worming/);
  assert.match(workspaceCss, /@keyframes\s+gliderWorm/);
  assert.match(workspaceCss, /@keyframes\s+rubberSearchSpring/);
  assert.match(workspaceCss, /\.menu-morph-bars\s*>\s*span/);
  assert.doesNotMatch(workspaceCss, /scale\(0\)/);
  assert.doesNotMatch(workspaceCss, /transition:\s*all\b/);

  assert.match(read('src/svelte/ui/modal.ts'), /syncMenuButtonExpanded/);
  assert.match(read('src/svelte/forms/IuranReviewChips.svelte'), /@keyframes\s+stepBadgeWorm/);
});

test('v322 #29 Odometer spins all digits on initial load from Rp 0, digit growth, group transition, and manual Sinkron', () => {
  const el = document.createElement('div');
  el.id = 'ui-saldo';

  // 1. Refresh / boot from Rp 0 -> Rp 90.000
  renderOdometerValue(el, 'Rp\u00a090.000', 'Rp\u00a00', 'up');
  assert.equal(el.textContent, 'Rp\u00a090.000');
  const cols90 = [...el.querySelectorAll('.odo-col')];
  assert.equal(cols90.length, 5);
  for (const col of cols90) {
    assert.equal(col.classList.contains('is-up'), true);
    assert.ok(Number(col.style.getPropertyValue('--odo-steps')) >= 5);
    const strip = col.querySelector('.odo-reel')?.getAttribute('data-strip') || '';
    assert.ok(strip.includes('\n'), 'expected multi-digit newline strip');
  }

  // 2. Fresh empty prev -> Rp 120.000 also spins all 6 digits
  renderOdometerValue(el, 'Rp\u00a0120.000', '', 'up');
  assert.equal(el.textContent, 'Rp\u00a0120.000');
  const cols120 = [...el.querySelectorAll('.odo-col')];
  assert.equal(cols120.length, 6);
  assert.ok(cols120.every((c) => c.classList.contains('is-up')));

  // 3. Digit-count growth (Rp 85.000 -> Rp 150.000): newly appeared leading '1' rolls from '0'
  renderOdometerValue(el, 'Rp\u00a0150.000', 'Rp\u00a085.000', 'up');
  assert.equal(el.textContent, 'Rp\u00a0150.000');
  const growthCols = [...el.querySelectorAll('.odo-col')];
  assert.equal(growthCols.length, 6);
  assert.equal(growthCols[0].classList.contains('is-up'), true);
  assert.equal(growthCols[0].querySelector('.odo-reel')?.getAttribute('data-prev'), '0');
  assert.equal(growthCols[1].classList.contains('is-up'), true);
  assert.equal(growthCols[1].querySelector('.odo-reel')?.getAttribute('data-prev'), '8');

  // 4. animateHybridAmount spins during group transition, preserves live reels on start === amount, and spinDashboardOdometers re-spins after settle
  const saldoEl = document.createElement('div');
  saldoEl.id = 'ui-saldo';
  document.body.appendChild(saldoEl);

  runGroupSwitchTransition(() => {
    animateHybridAmount(saldoEl, 90000, { format: (v) => `Rp\u00a0${new Intl.NumberFormat('id-ID').format(v)}`, from: 0 });
  });
  assert.equal(saldoEl.textContent, 'Rp\u00a090.000');
  assert.equal(saldoEl.querySelectorAll('.odo-col.is-up').length, 5);

  // Remote sync returning identical balance (start === amount) must NOT wipe active .odo-col.is-up reels
  animateHybridAmount(saldoEl, 90000, { format: (v) => `Rp\u00a0${new Intl.NumberFormat('id-ID').format(v)}` });
  assert.equal(saldoEl.querySelectorAll('.odo-col.is-up').length, 5);

  // Simulate CSS animation completion cleanup, then manual Sinkron triggers spinDashboardOdometers()
  saldoEl.querySelector('.odo-reel').dispatchEvent(new window.Event('animationend'));
  assert.equal(saldoEl.querySelectorAll('.odo-col.is-up').length, 4);
  saldoEl.querySelectorAll('.odo-reel').forEach((r) => r.dispatchEvent(new window.Event('animationend')));
  assert.equal(saldoEl.querySelectorAll('.odo-col.is-up').length, 0);

  spinDashboardOdometers();
  assert.equal(saldoEl.querySelectorAll('.odo-col.is-up').length, 5);
  assert.equal(saldoEl.textContent, 'Rp\u00a090.000');
});
