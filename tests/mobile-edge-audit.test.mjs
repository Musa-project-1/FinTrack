import { readWorkspaceFixtureHtml } from './helpers/workspace-fixture.mjs';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import {
  bukaProfilAnggota,
  formatRp,
  NAMA_BULAN,
  renderIuranMobileCards,
  renderTableTransaksi,
  setActiveGroupId,
  setAdminSession,
  setAdminViewMode,
  setCurrentHistoryFilter,
  setCurrentRekapYear,
  setState,
  syncOfflineQueueList,
  createDuesLedger
} from '../src/ui/svelte-dashboard.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const OWNED_STYLE_AND_COMPONENT_FILES = [
  'src/styles/app/responsive-mobile.css',
  'src/styles/app/responsive-tablet.css',
  'src/styles/app/hybrid-workspace.css',
  'src/svelte/dashboard/DuesMobileCards.svelte',
  'src/svelte/dashboard/HistoryLedger.svelte',
  'src/svelte/modals/PassbookMonths.svelte',
  'src/svelte/modals/ProfileHistoryList.svelte',
  'src/svelte/modals/OfflineQueueList.svelte'
];

function collectMediaBlocks(source, headerNeedle) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [];
  let idx = 0;
  while ((idx = clean.indexOf('@media', idx)) !== -1) {
    const braceStart = clean.indexOf('{', idx);
    if (braceStart === -1) break;
    const header = clean.slice(idx, braceStart).replace(/\s+/g, ' ').trim();
    let depth = 1;
    let cursor = braceStart + 1;
    while (cursor < clean.length && depth > 0) {
      if (clean[cursor] === '{') depth += 1;
      else if (clean[cursor] === '}') depth -= 1;
      cursor += 1;
    }
    if (header.includes(headerNeedle)) {
      blocks.push(clean.slice(braceStart + 1, cursor - 1));
    }
    idx = cursor;
  }
  return blocks;
}

function collectHoverRulesWithTransformOutsideFineMedia(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const violations = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < clean.length; i += 1) {
    if (clean[i] === '{') {
      const header = clean.slice(start, i).replace(/\s+/g, ' ').trim();
      stack.push({ header, bodyStart: i + 1 });
      start = i + 1;
    } else if (clean[i] === '}') {
      const frame = stack.pop();
      if (!frame) continue;
      const body = clean.slice(frame.bodyStart, i);
      const inFineHoverMedia = stack.some(
        (parent) =>
          parent.header.includes('@media') &&
          parent.header.includes('hover: hover') &&
          parent.header.includes('pointer: fine')
      );
      if (frame.header.includes(':hover') && /\btransform\s*:/.test(body) && !inFineHoverMedia) {
        violations.push(frame.header);
      }
      start = i + 1;
    }
  }
  return violations;
}

function findSub11PxFontSizes(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const violations = [];

  for (const match of clean.matchAll(/font-size\s*:\s*([^;}{]+);?/gi)) {
    const raw = match[1].trim();
    const pxValues = [...raw.matchAll(/(-?\d*\.?\d+)px\b/gi)].map((m) => Number.parseFloat(m[1]));
    for (const px of pxValues) {
      if (px < 11) violations.push(`font-size: ${raw} (${px}px)`);
    }
    const remValues = [...raw.matchAll(/(-?\d*\.?\d+)rem\b/gi)].map((m) => Number.parseFloat(m[1]) * 16);
    for (const px of remValues) {
      if (px < 11) violations.push(`font-size: ${raw} (${px}px)`);
    }
  }

  for (const match of clean.matchAll(/\bfont\s*:\s*([^;}{]+);?/gi)) {
    const raw = match[1].trim();
    if (/^(inherit|initial|unset|revert)$/i.test(raw)) continue;
    for (const pxMatch of raw.matchAll(/(\d*\.?\d+)px(?:\s*\/\s*[\d.]+(?:px|rem|em)?)?/gi)) {
      const px = Number.parseFloat(pxMatch[1]);
      if (px < 11) violations.push(`font: ${raw} (${px}px)`);
    }
  }

  return violations;
}

test('all 8 owned files pass >=11px typography, Zero Green, no transition:all, no scale(0), fine-hover transform gating, and <750 LOC', () => {
  for (const rel of OWNED_STYLE_AND_COMPONENT_FILES) {
    const src = read(rel);
    const lines = src.split('\n').length - 1;
    assert.ok(lines < 750, `${rel} has ${lines} lines (must be < 750)`);
    assert.doesNotMatch(src, /transition\s*:\s*all\b/i, `${rel} must not use transition: all`);
    assert.doesNotMatch(src, /scale\(\s*0(\.0+)?\s*\)/i, `${rel} must not use scale(0)`);
    assert.doesNotMatch(src, /#(10b981|008254|f3f7f5)\b/i, `${rel} violates Zero Green`);
    assert.deepEqual(
      collectHoverRulesWithTransformOutsideFineMedia(src),
      [],
      `${rel} must gate :hover rules containing transform inside @media (hover: hover) and (pointer: fine)`
    );
    assert.deepEqual(
      findSub11PxFontSizes(src),
      [],
      `${rel} must not declare font sizes < 11px`
    );
  }
});

test('ResponsiveMobileStyle enforces @media (pointer: coarse) 16px input guard and mobile touch-action: manipulation', () => {
  const mobileCss = read('src/styles/app/responsive-mobile.css');
  const coarseBlock = collectMediaBlocks(mobileCss, 'pointer: coarse').join('\n');

  assert.ok(coarseBlock.length > 0, 'ResponsiveMobileStyle.svelte must define @media (pointer: coarse)');
  assert.match(coarseBlock, /input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\):not\(\[type="range"\]\):not\(\[type="file"\]\)/);
  assert.match(coarseBlock, /\bselect\b/);
  assert.match(coarseBlock, /\btextarea\b/);
  assert.match(coarseBlock, /\.search-member-input\b/);
  assert.match(coarseBlock, /font-size\s*:\s*16px\s*;/);

  assert.match(mobileCss, /touch-action\s*:\s*manipulation\s*;/);

  const profileHistoryCss = read('src/svelte/modals/ProfileHistoryList.svelte');
  assert.doesNotMatch(profileHistoryCss, /\.riwayat-search\s+input\s*\{[^}]*font-size\s*:[^;]*!important/s);
  assert.doesNotMatch(profileHistoryCss, /\.riwayat-select\s*\{[^}]*font-size\s*:[^;]*!important/s);

  if (fs.existsSync(path.join(ROOT, 'style.css'))) {
    const compiled = collectMediaBlocks(read('style.css').replace(/pointer:\s*coarse/g, 'pointer: coarse'), 'pointer: coarse').join('\n');
    assert.match(compiled, /\.search-member-input[\s\S]*font-size\s*:\s*16px/);
  }
});

test('CdropStyle and IuranReviewChips preserve coarse-pointer 16px overrides after base 13px rules', () => {
  const cdropCss = read('src/styles/app/cdrop.css');
  const cdropCoarse = collectMediaBlocks(cdropCss, 'pointer: coarse').join('\n');
  assert.match(
    cdropCoarse,
    /:is\(#spotlight-picker,\s*#spotlight-swap-select,\s*#self-pay-member\)\s*\{[^}]*font-size\s*:\s*16px\s*;/s
  );
  const cdropBaseIdx = cdropCss.search(/:is\(#spotlight-picker,\s*#spotlight-swap-select,\s*#self-pay-member\)\s*\{[^}]*font-size\s*:\s*13px/s);
  const cdropCoarseIdx = cdropCss.search(/@media\s*\(pointer:\s*coarse\)\s*\{[^}]*:is\(#spotlight-picker,\s*#spotlight-swap-select,\s*#self-pay-member\)/s);
  assert.ok(cdropBaseIdx >= 0 && cdropCoarseIdx > cdropBaseIdx, 'CdropStyle @media (pointer: coarse) 16px rule must follow base 13px rule');

  const chipsCss = read('src/svelte/forms/IuranReviewChips.svelte');
  const chips13Idx = chipsCss.search(/#modal-transaksi\s+\.trx-member-search\s+input\s*\{[^}]*font-size\s*:\s*13px/s);
  const chipsCoarseIdx = chipsCss.search(/@media\s*\(pointer:\s*coarse\)\s*\{[^}]*#modal-transaksi\s+\.trx-member-search\s+input\s*\{\s*font-size\s*:\s*16px\s*;\s*\}/s);
  assert.ok(chips13Idx >= 0 && chipsCoarseIdx > chips13Idx, 'IuranReviewChips @media (pointer: coarse) #modal-transaksi .trx-member-search input 16px must follow 13px rule');

  const selfPayCss = read('src/svelte/modals/SelfPayMonths.svelte');
  const selfPayCoarse = collectMediaBlocks(selfPayCss, 'pointer: coarse').join('\n');
  assert.match(selfPayCoarse, /#self-pay-member\s*\{[^}]*font-size\s*:\s*16px\s*;/s);
  const selfPayBaseIdx = selfPayCss.search(/#self-pay-member\s*\{[^}]*font-size\s*:/s);
  const selfPayCoarseIdx = selfPayCss.search(/@media\s*\(pointer:\s*coarse\)\s*\{[^}]*#self-pay-member/s);
  assert.ok(selfPayBaseIdx >= 0 && selfPayCoarseIdx > selfPayBaseIdx, 'SelfPayMonths @media (pointer: coarse) #self-pay-member 16px must follow base rule');
});

test('mobile cards, ledger, profile history, and offline queue enforce min-width:0, overflow-wrap:anywhere, and tabular-nums currency', () => {
  const hybridCss = read('src/styles/app/hybrid-workspace.css');
  const duesCards = read('src/svelte/dashboard/DuesMobileCards.svelte');
  const historyLedger = read('src/svelte/dashboard/HistoryLedger.svelte');
  const passbook = read('src/svelte/modals/PassbookMonths.svelte');
  const profileHistory = read('src/svelte/modals/ProfileHistoryList.svelte');
  const offlineQueue = read('src/svelte/modals/OfflineQueueList.svelte');

  for (const [label, src] of [
    ['HybridWorkspaceStyle.svelte', hybridCss],
    ['DuesMobileCards.svelte', duesCards],
    ['HistoryLedger.svelte', historyLedger],
    ['PassbookMonths.svelte', passbook],
    ['ProfileHistoryList.svelte', profileHistory],
    ['OfflineQueueList.svelte', offlineQueue]
  ]) {
    assert.match(src, /min-width\s*:\s*0/, `${label} missing min-width: 0`);
    assert.match(src, /overflow-wrap\s*:\s*anywhere/, `${label} missing overflow-wrap: anywhere`);
  }

  for (const [label, src] of [
    ['HybridWorkspaceStyle.svelte', hybridCss],
    ['HistoryLedger.svelte', historyLedger],
    ['PassbookMonths.svelte', passbook],
    ['ProfileHistoryList.svelte', profileHistory],
    ['OfflineQueueList.svelte', offlineQueue]
  ]) {
    assert.match(src, /font-variant-numeric\s*:\s*tabular-nums/, `${label} missing tabular-nums`);
  }

  assert.match(hybridCss, /\.ledger-amt\s*\{[^}]*white-space\s*:\s*nowrap;[^}]*flex-shrink\s*:\s*0;/s);
  assert.doesNotMatch(hybridCss, /#workspace-history\s+\.ledger-amt-col\s*\{\s*max-width:\s*38vw/);
  assert.match(hybridCss, /@media\s*\(max-width:\s*400px\)[\s\S]*#section-rekap\s+\.dues-mobile-actions/);
  assert.match(duesCards, /\.iuran-card-name\s*\{[^}]*white-space\s*:\s*normal;[^}]*overflow-wrap\s*:\s*anywhere;/s);
  assert.match(offlineQueue, /\.pending-card-amount\s*\{[^}]*white-space\s*:\s*nowrap;\s*flex-shrink\s*:\s*0;/s);
  assert.match(offlineQueue, /#modal-offline-queue\s+\.pending-card-payload\s*\{[^}]*white-space\s*:\s*normal;[^}]*overflow-wrap\s*:\s*anywhere;/s);
  assert.match(profileHistory, /\.profil-history-row\s+\.ledger-main\s*\{[^}]*flex\s*:\s*1\s+1\s+0%;\s*min-width\s*:\s*0;/s);
  assert.match(profileHistory, /\.profil-history-row\s+\.ledger-amt\s*\{[^}]*white-space\s*:\s*nowrap;\s*flex-shrink\s*:\s*0;\s*font-variant-numeric\s*:\s*tabular-nums;/s);
});

let dom;
after(() => dom?.window.close());

function installDom(t) {
  dom ??= new JSDOM('', { url: 'https://example.test' });
  const { window } = dom;
  window.document.open();
  window.document.write(readWorkspaceFixtureHtml());
  window.document.close();
  window.localStorage.clear();
  if (!('inert' in window.HTMLElement.prototype)) {
    Object.defineProperty(window.HTMLElement.prototype, 'inert', {
      get() { return this.hasAttribute('inert'); },
      set(value) { this.toggleAttribute('inert', value); }
    });
  }
  for (const name of [
    'window', 'document', 'Element', 'HTMLElement', 'HTMLMediaElement', 'Node', 'Text', 'Comment',
    'Event', 'CustomEvent', 'Option', 'MutationObserver', 'localStorage'
  ]) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value: window[name], configurable: true });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else delete globalThis[name];
    });
  }
  window.matchMedia = () => ({ matches: true });
  return (id) => document.getElementById(id);
}

test('worst-case 60-char member names, long notes/IDs, and Rp 999.999.999 render cleanly in mobile cards, ledger, profile history, and offline queue', (t) => {
  const byId = installDom(t);
  const longName = 'A'.repeat(60);
  const longNote = 'CatatanTransaksiSangatPanjangTanpaSpasi_' + 'X'.repeat(48);
  const longTrxId = 'TRX-VERY-LONG-UNBREAKABLE-IDENTIFIER-12345678901234567890';
  const longGroupId = 'GRP-UNBREAKABLE-MOBILE-AUDIT-GROUP-ID-9876543210';
  const hugeNominal = 999999999;

  const state = {
    anggota: [{ ID_Anggota: 'ANG-LONG-01', Nama_Anggota: longName, Status_Aktif: 'Aktif' }],
    kategori: [{ ID_Kategori: 'KAT-LONG', Nama_Kategori: 'Iuran_Kategori_Panjang_Sekali_Tanpa_Spasi' }],
    kasStart: '01-2025',
    skippedMonths: [],
    transaksi: [{
      ID_Transaksi: longTrxId,
      ID_Anggota: 'ANG-LONG-01',
      ID_Kategori: 'KAT-LONG',
      Tipe_Arus: 'Masuk',
      Bulan_Iuran: NAMA_BULAN[0],
      Tahun_Iuran: 2025,
      Nominal: hugeNominal,
      Keterangan: longNote,
      Timestamp: '2025-01-15T10:00:00Z'
    }]
  };

  setActiveGroupId(longGroupId);
  setCurrentRekapYear('2025');
  setAdminSession('');
  setAdminViewMode('anggota');
  setState(state);

  const ledger = createDuesLedger(state, { year: 2025, now: new Date('2025-05-12') });
  renderIuranMobileCards(state.anggota, ledger, 'seal', 'ANG-LONG-01', false);
  const card = byId('iuran-cards-mobile').querySelector('.iuran-member-card');
  assert.ok(card.querySelector('.iuran-card-name').textContent.includes(longName));
  assert.ok(card.querySelector('.self-pin-badge'));

  byId('workspace-history').hidden = false;
  setCurrentHistoryFilter('semua');
  renderTableTransaksi();
  const ledgerRow = byId('hybrid-ledger-list').querySelector('.ledger-row');
  assert.equal(ledgerRow.querySelector('.ledger-id').textContent, longTrxId);
  assert.equal(ledgerRow.querySelector('.ledger-amt').textContent, '+' + formatRp(hugeNominal));

  byId('modal-profil-anggota').showModal = () => {};
  bukaProfilAnggota('ANG-LONG-01');
  const profileRow = byId('p-list-transaksi').querySelector('.profil-history-row');
  assert.equal(profileRow.querySelector('.ledger-title').textContent, longNote);
  assert.equal(profileRow.querySelector('.ledger-amt').textContent, '+' + formatRp(hugeNominal));

  syncOfflineQueueList({
    status: 'ready',
    groupId: longGroupId,
    items: [{
      id: longTrxId,
      label: 'Edit Transaksi',
      tone: 'warning',
      icon: 'ph-pencil-simple',
      nominal: hugeNominal,
      formattedTime: '13:10',
      summary: longNote
    }],
    otherGroupCount: 0,
    unscopedCount: 0
  });
  const queueItem = byId('offline-queue-list').querySelector('.pending-item');
  assert.equal(queueItem.querySelector('.pending-card-amount').textContent, formatRp(hugeNominal));
  assert.equal(queueItem.querySelector('.queue-gid-tag').textContent, longGroupId);
  assert.equal(queueItem.querySelector('.pending-card-payload').textContent, longNote);
});
