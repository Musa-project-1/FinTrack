/**
 * DOM contract tests — the regression guard for the modal harmonization work.
 *
 * The contract runs in two directions:
 *   forward — every id, tab and action a user can reach resolves to something
 *   reverse — every id the JavaScript looks up actually exists in the markup
 *
 * The reverse direction is the one that pays for itself. `updateCounterOps()`
 * read `#summary-ops-total`, which no fragment defined, so every keystroke in
 * the Kas Operasional tab threw a TypeError (fixed 2026-09-19). That class of
 * defect now fails here instead of in the browser.
 *
 * The markup is assembled from `html/index.template.html` + `html/modals/*.html`
 * by `scripts/build-html.cjs`, so the fragments are the source of truth and the
 * checks read the fragments, not the generated `index.html`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

/* ── File discovery ─────────────────────────────────────────────── */

/**
 * Recursively collect files under a directory.
 * @param {string} dir Absolute or root-relative directory.
 * @returns {string[]} Root-relative POSIX paths.
 */
function walk(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    return entry.isDirectory() ? walk(rel) : [rel];
  });
}

/**
 * The fragments `scripts/build-html.cjs` assembles into `index.html`.
 * These are the source of truth; the generated `index.html` is deliberately
 * not read, because everything in it is a copy of something listed here.
 */
const FRAGMENT_FILES = [
  'html/index.template.html',
  ...walk('html/modals').filter((f) => f.endsWith('.html'))
];

/**
 * Standalone pages that ship their own markup and scripts. Their ids are
 * reachable by the shared modules — `js/journey.js` runs against
 * `js/onboarding.js` on `onboarding.html` — so they count as existing. They are
 * separate documents from the assembled app, so they are excluded from the
 * duplicate-id check.
 */
const STANDALONE_PAGES = fs.readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && f !== 'index.html');

/** Every markup file a literal `getElementById` may legitimately resolve in. */
const HTML_FILES = [...FRAGMENT_FILES, ...STANDALONE_PAGES];

/** Every client module. */
const JS_FILES = walk('js').filter((f) => f.endsWith('.js'));

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * Collect the distinct values of an attribute across every markup file.
 * @param {string} attribute
 * @param {string[]} [files]
 * @returns {Set<string>}
 */
function attrValues(attribute, files = [...HTML_FILES, ...JS_FILES]) {
  const found = new Set();
  const pattern = new RegExp(`\\s${attribute}="([^"]+)"`, 'g');
  for (const file of files) {
    for (const match of read(file).matchAll(pattern)) found.add(match[1]);
  }
  return found;
}

/** Every `id="..."` defined in the markup, keyed to the file that defines it. */
function elementIds() {
  const ids = new Map();
  for (const file of HTML_FILES) {
    for (const match of read(file).matchAll(/\sid="([^"]+)"/g)) {
      if (!ids.has(match[1])) ids.set(match[1], file);
    }
  }
  return ids;
}

/**
 * Every `id="..."` a markup file defines, including duplicates.
 * Defaults to the assembled app document; a standalone page is a separate
 * document, so sharing an id with it is not a collision.
 * @param {string[]} [files]
 */
function allIdOccurrences(files = FRAGMENT_FILES) {
  const occurrences = [];
  for (const file of files) {
    for (const match of read(file).matchAll(/\sid="([^"]+)"/g)) {
      occurrences.push({ id: match[1], file });
    }
  }
  return occurrences;
}

/**
 * Literal ids the JavaScript resolves through the DOM.
 *
 * Only string literals are collected; a lookup built from a variable cannot be
 * checked statically and is deliberately skipped rather than guessed at.
 * @returns {{id: string, file: string, line: number}[]}
 */
function jsLookups() {
  const lookups = [];
  for (const file of JS_FILES) {
    read(file).split('\n').forEach((line, index) => {
      for (const match of line.matchAll(/getElementById\(\s*'([^']+)'\s*\)/g)) {
        lookups.push({ id: match[1], file, line: index + 1 });
      }
      for (const match of line.matchAll(/querySelector(?:All)?\(\s*'#([^'\s.,:>[\]()+]+)'/g)) {
        lookups.push({ id: match[1], file, line: index + 1 });
      }
    });
  }
  return lookups;
}

/**
 * Lookups that intentionally point at an element that no fragment defines.
 *
 * Every entry is either an alternative id in an `a || b` fallback whose primary
 * exists, or a null-guarded lookup left behind when a component was removed.
 * Nothing here is a crash path — see the per-entry reason. Adding an entry is a
 * deliberate act; if a lookup here becomes resolvable again, delete its row and
 * this test will tell you (see the "allow-list has no stale rows" test).
 */
const TOLERATED_LOOKUPS = new Map([
  ['ui-table-trx', 'alternative in `#table-riwayat-data || #ui-table-trx`; primary exists, result is null-guarded'],
  ['load-more-container', 'alternative in `#btn-load-more || #load-more-container`; primary exists'],
  ['container-checkbox-anggota', 'alternative in `#iuran-checkbox-anggota || …`; primary exists, result is null-guarded'],
  ['btn-header-menu-mobile', 'removed during header unification; collected via `.filter(Boolean)`'],
  ['header-dropdown', 'header dropdown was removed when the menu became #modal-menu; every lookup is null-guarded'],
  ['icon-toggle-stats-mobile', 'mobile stats toggle was removed; lookup is null-guarded']
]);

/* ── Forward direction ──────────────────────────────────────────── */

/** The 24 dialog overlays the harmonization plan covers. */
const MODAL_IDS = [
  'modal-transaksi', 'modal-edit-transaksi', 'modal-hapus', 'modal-confirm-action',
  'modal-kelola-master', 'modal-edit-master-anggota', 'modal-edit-master-kategori',
  'modal-audit-log', 'modal-offline-queue', 'modal-riwayat', 'modal-statistik',
  'modal-profil-anggota', 'modal-export', 'modal-menu', 'modal-quickpay', 'modal-login',
  'modal-logout', 'modal-about', 'modal-group-pin', 'modal-groups', 'modal-group-admin',
  'modal-group-credentials', 'modal-tampilan', 'modal-faq'
];

test('every dialog overlay the plan covers still exists', () => {
  const ids = elementIds();
  const missing = MODAL_IDS.filter((id) => !ids.has(id));
  assert.deepEqual(missing, [], `missing modal dialog roots: ${missing.join(', ')}`);
});

test('no element id is defined twice', () => {
  const seen = new Map();
  const duplicates = [];
  for (const { id, file } of allIdOccurrences()) {
    if (seen.has(id)) duplicates.push(`#${id} (${seen.get(id)} and ${file})`);
    else seen.set(id, file);
  }
  assert.deepEqual(duplicates, [], `duplicate ids break getElementById: ${duplicates.join(', ')}`);
});

test('every tab button targets a real tab panel', () => {
  const ids = elementIds();
  // switchTab() matches a panel by `content.id === tabName` or `content.id === 'tab-' + tabName`.
  const unresolved = [...attrValues('data-tab', HTML_FILES)]
    .filter((tab) => !ids.has(tab) && !ids.has(`tab-${tab}`));
  assert.deepEqual(unresolved, [], `data-tab values with no matching panel: ${unresolved.join(', ')}`);
});

test('every aria-labelledby points at an element that exists', () => {
  const ids = elementIds();
  const dangling = [];
  for (const file of HTML_FILES) {
    for (const match of read(file).matchAll(/aria-labelledby="([^"]+)"/g)) {
      for (const ref of match[1].trim().split(/\s+/)) {
        if (!ids.has(ref)) dangling.push(`${ref} (${file})`);
      }
    }
  }
  assert.deepEqual(dangling, [], `aria-labelledby references a missing id: ${dangling.join(', ')}`);
});

test('every label for= points at an input that exists', () => {
  const ids = elementIds();
  const dangling = [];
  for (const file of HTML_FILES) {
    for (const match of read(file).matchAll(/<label[^>]*\sfor="([^"]+)"/g)) {
      if (!ids.has(match[1])) dangling.push(`${match[1]} (${file})`);
    }
  }
  assert.deepEqual(dangling, [], `label[for] references a missing id: ${dangling.join(', ')}`);
});

test('every data-action emitted by the markup or the renderers is handled', () => {
  // The delegated switch in js/app.js is the only click router for [data-action].
  const handled = new Set(
    [...read('js/app.js').matchAll(/case\s+'([a-z0-9-]+)':/g)].map((match) => match[1])
  );
  const emitted = attrValues('data-action');
  const unhandled = [...emitted].filter((action) => !handled.has(action));
  assert.deepEqual(unhandled, [], `data-action with no handler in js/app.js: ${unhandled.join(', ')}`);
});

/* ── Reverse direction ──────────────────────────────────────────── */

test('every literal DOM lookup in js/ resolves to a real element', () => {
  const ids = elementIds();
  const unresolved = jsLookups()
    .filter((lookup) => !ids.has(lookup.id) && !TOLERATED_LOOKUPS.has(lookup.id))
    .map((lookup) => `#${lookup.id} (${lookup.file}:${lookup.line})`);

  assert.deepEqual(
    unresolved,
    [],
    'a lookup points at an id no fragment defines — this throws at runtime:\n' +
      unresolved.join('\n')
  );
});

test('the tolerated-lookup allow-list has no stale rows', () => {
  const ids = elementIds();
  const referenced = new Set(jsLookups().map((lookup) => lookup.id));
  const stale = [...TOLERATED_LOOKUPS.keys()].filter(
    (id) => ids.has(id) || !referenced.has(id)
  );

  assert.deepEqual(
    stale,
    [],
    'these allow-list rows are obsolete — either the id now exists or nothing looks it up any more:\n' +
      stale.join('\n')
  );
});
