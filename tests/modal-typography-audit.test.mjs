import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const AUDITED_FILES = [
  'src/svelte/shell/modals/AuthModals.svelte',
  'src/svelte/shell/modals/GroupAdminModals.svelte',
  'src/svelte/shell/modals/NavigationModals.svelte',
  'src/svelte/shell/modals/TampilanModal.svelte',
  'src/styles/app/modals-base.css',
  'src/styles/app/modals-sheet.css',
  'src/styles/app/dpick.css',
  'src/styles/app/helpers.css',
  'src/svelte/modals/GroupPickerList.svelte',
  'src/svelte/modals/MasterAnggotaRows.svelte',
  'src/svelte/modals/SuperAdminList.svelte',
  'src/svelte/forms/StampStylePreview.svelte'
];

function extractStyleCss(source) {
  if (!/<style\b/i.test(source)) return source;
  const match = /<style>([\s\S]*?)<\/style>/.exec(source);
  return match ? match[1] : '';
}

function parseCssRules(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
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
      const parents = stack.map((item) => item.header);
      if (!frame.header.startsWith('@')) {
        rules.push({ selector: frame.header, body, parents });
      }
      start = i + 1;
    }
  }
  assert.equal(stack.length, 0, 'unbalanced CSS braces');
  return rules;
}

function findRule(rules, selectorNeedle) {
  return rules.filter((r) => r.selector.includes(selectorNeedle));
}

function assertHasTabularNums(file, rules, selectorNeedle) {
  const matched = findRule(rules, selectorNeedle);
  assert.ok(matched.length > 0, `${file}: missing CSS rule matching "${selectorNeedle}"`);
  assert.ok(
    matched.some((r) => /font-variant-numeric\s*:\s*tabular-nums\b/.test(r.body)),
    `${file}: "${selectorNeedle}" must declare font-variant-numeric: tabular-nums`
  );
}

test('all 12 audited modal/style files obey >=11px font floor, Zero Green, zero transition: all, zero scale(0), and < 750 LOC', () => {
  for (const rel of AUDITED_FILES) {
    const src = read(rel);
    const lines = src.split('\n').length - 1;
    assert.ok(lines < 750, `${rel} has ${lines} lines (must stay strictly < 750)`);

    assert.doesNotMatch(src, /#(10b981|008254|f3f7f5)\b/i, `${rel} violates Zero Green`);
    assert.doesNotMatch(src, /transition\s*:\s*all\b/i, `${rel} must not use transition: all`);
    assert.doesNotMatch(src, /\bscale\(\s*0(?:\s*[,)])/i, `${rel} must not use scale(0)`);

    const css = extractStyleCss(src);
    for (const match of css.matchAll(/font-size\s*:\s*([^;}\n]+)/gi)) {
      const raw = match[1].replace(/!important/i, '').trim();
      const px = /^([0-9.]+)px$/i.exec(raw);
      const rem = /^([0-9.]+)rem$/i.exec(raw);
      if (px) {
        assert.ok(parseFloat(px[1]) >= 11, `${rel}: font-size ${raw} is below 11px floor`);
      } else if (rem) {
        assert.ok(parseFloat(rem[1]) * 16 >= 11, `${rel}: font-size ${raw} (${parseFloat(rem[1]) * 16}px) is below 11px floor`);
      } else {
        assert.match(raw, /^max\(\s*1rem\s*,\s*1em\s*\)$/i, `${rel}: unexpected font-size value "${raw}"`);
      }
    }
  }
});

test('all :hover rules with transform: across all 12 owned files are gated inside @media (hover: hover) and (pointer: fine)', () => {
  for (const rel of AUDITED_FILES) {
    const css = extractStyleCss(read(rel));
    const rules = parseCssRules(css);

    for (const rule of rules) {
      if (rule.selector.includes(':hover') && /\btransform\s*:/.test(rule.body)) {
        const gated = rule.parents.some(
          (p) => p.includes('@media') && p.includes('hover: hover') && p.includes('pointer: fine')
        );
        assert.ok(
          gated,
          `${rel}: :hover rule "${rule.selector}" applies transform outside @media (hover: hover) and (pointer: fine)`
        );
      }
    }
  }

  const navRules = parseCssRules(extractStyleCss(read('src/svelte/shell/modals/NavigationModals.svelte')));
  const navIcoSelected = findRule(navRules, '.nav-item.is-selected .nav-ico');
  assert.ok(navIcoSelected.some((r) => /transform\s*:\s*scale\(1\.03\)/.test(r.body)));
  const navChevSelected = findRule(navRules, '.nav-item.is-selected .nav-chev');
  assert.ok(navChevSelected.some((r) => /transform\s*:\s*translateX\(2px\)/.test(r.body)));
});

test('numeric counters, timestamps, audit times, and numeric badges enforce font-variant-numeric: tabular-nums', () => {
  const expectations = [
    ['src/svelte/shell/modals/GroupAdminModals.svelte', [
      '.group-tab-count',
      '.group-list-meta-pill',
      '.group-card-id-pill',
      '.group-pin-input',
      '.group-mono-input'
    ]],
    ['src/svelte/shell/modals/NavigationModals.svelte', [
      '#modal-menu .command-kbd-pill',
      '#modal-menu .command-footer-text'
    ]],
    ['src/styles/app/modals-base.css', [
      '.edit-delta-val',
      '#modal-edit-transaksi .edit-origin-pill',
      '#modal-edit-transaksi .edit-origin-summary',
      '#modal-edit-transaksi .edit-summary-card .trx-rev-callout-val > strong',
      '#modal-edit-transaksi .trx-footer-meta.edit-footer-pill strong',
      '.input-admin-code'
    ]],
    ['src/styles/app/modals-sheet.css', [
      '.report-stat-val',
      '.report-ledger-badge',
      '.report-ledger-table tbody td.report-row-num',
      '.report-ledger-table tbody td.report-row-saldo',
      '.report-row-date',
      '.report-row-clock'
    ]],
    ['src/styles/app/dpick.css', [
      '.dpick-field',
      '.dpick-ym-btn',
      '.dpick-day'
    ]],
    ['src/styles/app/helpers.css', [
      '.riwayat-summary-value',
      '.metric-pill',
      '.td-date-group-header',
      '.trx-period',
      '.td-time-col',
      '.td-nominal-col',
      '.td-audit-time',
      '.td-id-col',
      '.td-wa-col',
      '.pending-card-time',
      '.td-nom-primary'
    ]],
    ['src/svelte/modals/GroupPickerList.svelte', [
      '#modal-groups .groups-count-pill',
      '#modal-groups .group-queue-badge',
      '#modal-groups .groups-offline-summary'
    ]],
    ['src/svelte/modals/MasterAnggotaRows.svelte', [
      '.master-tab-count',
      '.master-stats-pill',
      '.master-id-pill',
      '.master-wa-link',
      '.skip-month-label',
      '.audit-count-pill',
      '.audit-ledger-table tbody td.td-audit-time'
    ]],
    ['src/svelte/modals/SuperAdminList.svelte', [
      '.cred-code'
    ]],
    ['src/svelte/forms/StampStylePreview.svelte', [
      '#modal-tampilan .tampilan-glider .glider-btn'
    ]]
  ];

  for (const [file, selectors] of expectations) {
    const rules = parseCssRules(extractStyleCss(read(file)));
    for (const sel of selectors) {
      assertHasTabularNums(file, rules, sel);
    }
  }
});

test('interactive modal controls provide visible :focus-visible outlines and preserve DOM contracts', () => {
  const navRules = parseCssRules(extractStyleCss(read('src/svelte/shell/modals/NavigationModals.svelte')));
  const navFocus = findRule(navRules, '#modal-menu .nav-item:focus-visible');
  assert.ok(navFocus.some((r) => /outline\s*:\s*2px\s+solid\s+var\(--accent\)/.test(r.body)));
  assert.ok(navFocus.every((r) => !/outline\s*:\s*none\b/.test(r.body)));

  const focusChecks = [
    ['src/svelte/shell/modals/AuthModals.svelte', '#badge-admin-login.auth-header-emblem:focus-visible'],
    ['src/svelte/shell/modals/GroupAdminModals.svelte', '.group-admin-tab-track .tab-btn:focus-visible'],
    ['src/svelte/shell/modals/GroupAdminModals.svelte', '.group-name:focus-visible'],
    ['src/svelte/shell/modals/NavigationModals.svelte', '#modal-menu .command-clear-btn:focus-visible'],
    ['src/svelte/shell/modals/TampilanModal.svelte', '.style-option-card:focus-visible'],
    ['src/styles/app/modals-base.css', '.close-modal-btn:focus-visible'],
    ['src/styles/app/modals-base.css', '.btn-pwd-peek:focus-visible'],
    ['src/styles/app/modals-sheet.css', '.faq-item-title:focus-visible'],
    ['src/styles/app/modals-sheet.css', '.export-restore-label:has(input:focus-visible)'],
    ['src/svelte/modals/MasterAnggotaRows.svelte', '.master-tab-track .tab-btn:focus-visible'],
    ['src/svelte/modals/MasterAnggotaRows.svelte', '.audit-chip:focus-visible'],
    ['src/svelte/forms/StampStylePreview.svelte', '.tampilan-option-card:focus-visible']
  ];

  for (const [file, sel] of focusChecks) {
    const rules = parseCssRules(extractStyleCss(read(file)));
    const matched = findRule(rules, sel);
    assert.ok(
      matched.some((r) => /outline\s*:\s*2px\s+solid\b/.test(r.body)),
      `${file}: "${sel}" must declare an explicit 2px solid :focus-visible outline`
    );
  }

  const stampCss = read('src/svelte/forms/StampStylePreview.svelte');
  assert.doesNotMatch(stampCss, /scale\(0\.7\)/, 'StampStylePreview .tampilan-check must satisfy >= 0.92 scale floor');
  assert.match(stampCss, /\.tampilan-preview-cell\s*\{[^}]*min-width:\s*64px/s);

  const authHtml = read('src/svelte/shell/modals/AuthModals.svelte');
  for (const token of ['id="modal-login"', 'id="form-login-admin"', 'for="input-admin-email"', 'for="input-admin-pwd"', 'data-action="stealth-badge-click"', 'aria-pressed="false"']) {
    assert.ok(authHtml.includes(token), `AuthModals.svelte missing contract token ${token}`);
  }

  const groupAdminHtml = read('src/svelte/shell/modals/GroupAdminModals.svelte');
  for (const token of ['id="modal-group-admin"', 'id="form-create-group"', 'for="chk-group-admin-auto"', 'data-action="copy-cred-wa"', 'aria-selected="true"']) {
    assert.ok(groupAdminHtml.includes(token), `GroupAdminModals.svelte missing contract token ${token}`);
  }

  const navHtml = read('src/svelte/shell/modals/NavigationModals.svelte');
  for (const token of ['id="modal-menu"', 'id="search-nav-menu"', 'data-action="open-kelola-master"', 'aria-labelledby="modal-menu-title"']) {
    assert.ok(navHtml.includes(token), `NavigationModals.svelte missing contract token ${token}`);
  }

  const tampilanHtml = read('src/svelte/shell/modals/TampilanModal.svelte');
  for (const token of ['id="modal-tampilan"', 'for="kasi-enabled"', 'data-action="select-language"', 'aria-pressed="true"']) {
    assert.ok(tampilanHtml.includes(token), `TampilanModal.svelte missing contract token ${token}`);
  }
});
