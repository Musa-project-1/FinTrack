import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(import.meta.dirname, '..');
const PAGES = [
  { name: '404.html', file: 'src/pages/404.html' },
  { name: 'offline.html', file: 'src/pages/offline.html' },
];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const LIGHT_TOKENS = {
  '--bg-canvas': '#f3f6fb',
  '--surface': '#ffffff',
  '--surface-2': '#eaf0f8',
  '--border': '#cbd8ea',
  '--text-main': '#061b31',
  '--text-muted': '#425466',
  '--accent': '#0052ff',
  '--accent-strong': '#0040c9',
  '--accent-ink': '#ffffff',
  '--accent-tint': 'rgba(0, 82, 255, 0.09)',
  '--accent-border': 'rgba(0, 82, 255, 0.30)',
};

const DARK_TOKENS = {
  '--bg-canvas': '#070d19',
  '--surface': '#0e172a',
  '--surface-2': '#16223b',
  '--border': '#1e2f50',
  '--text-main': '#f0f6fc',
  '--text-muted': '#94a3b8',
  '--accent': '#3b82f6',
  '--accent-strong': '#2563eb',
  '--accent-ink': '#ffffff',
  '--accent-tint': 'rgba(59, 130, 246, 0.14)',
  '--accent-border': 'rgba(59, 130, 246, 0.34)',
};

function extractStyle(html) {
  const match = /<style>([\s\S]*?)<\/style>/i.exec(html);
  assert.ok(match, 'expected inline <style> block');
  return match[1];
}

function parseCssBlocks(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const stack = [];
  const rules = [];
  let tokenStart = 0;

  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === '{') {
      const selector = clean.slice(tokenStart, i).trim();
      stack.push({ selector, bodyStart: i + 1, parents: stack.map((s) => s.selector) });
      tokenStart = i + 1;
    } else if (clean[i] === '}') {
      const frame = stack.pop();
      assert.ok(frame, 'unbalanced CSS closing brace');
      const body = clean.slice(frame.bodyStart, i).trim();
      rules.push({ selector: frame.selector, parents: frame.parents, body });
      tokenStart = i + 1;
    }
  }
  assert.equal(stack.length, 0, 'unbalanced CSS opening brace');
  return rules;
}

function luminance(hex) {
  const rgb = hex
    .replace('#', '')
    .match(/../g)
    .map((part) => parseInt(part, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

for (const page of PAGES) {
  test(`${page.name} adopts Ocean Ledger light/dark tokens and progressive light-dark() support`, () => {
    const html = read(page.file);
    const css = extractStyle(html);
    const rules = parseCssBlocks(css);

    for (const hex of ['#10b981', '#008254', '#f3f7f5', '#0f1011', '#090a0b', '#2e2e2e', '#3f4041']) {
      assert.ok(!html.toLowerCase().includes(hex), `${page.file} must not contain banned hex ${hex}`);
    }
    assert.ok(!css.includes('--lp-'), `${page.file} must not retain Origin --lp-* tokens`);

    const rootLightRule = rules.find((r) => r.selector === ':root' && r.parents.length === 0);
    assert.ok(rootLightRule, `${page.file} must define top-level :root`);
    assert.match(rootLightRule.body, /color-scheme:\s*light dark;/);

    const bodyRules = rules.filter((r) => r.selector === 'body');
    assert.ok(bodyRules.length > 0, `${page.file} must style body`);
    for (const bodyRule of bodyRules) {
      assert.doesNotMatch(bodyRule.body, /color-scheme\s*:/, `${page.file} must set color-scheme on :root, not body`);
    }

    for (const [token, value] of Object.entries(LIGHT_TOKENS)) {
      assert.ok(
        rootLightRule.body.includes(`${token}: ${value};`),
        `${page.file} light :root missing ${token}: ${value}`
      );
    }

    const darkRootRule = rules.find(
      (r) => r.selector === ':root' && r.parents.some((p) => /@media\s*\(prefers-color-scheme:\s*dark\)/.test(p))
    );
    assert.ok(darkRootRule, `${page.file} must define :root overrides in @media (prefers-color-scheme: dark)`);
    for (const [token, value] of Object.entries(DARK_TOKENS)) {
      assert.ok(
        darkRootRule.body.includes(`${token}: ${value};`),
        `${page.file} dark :root missing ${token}: ${value}`
      );
    }

    const supportsRootRule = rules.find(
      (r) => r.selector === ':root' && r.parents.some((p) => /@supports\s*\(color:\s*light-dark\(white,\s*black\)\)/.test(p))
    );
    assert.ok(supportsRootRule, `${page.file} must provide @supports (color: light-dark(white, black)) progressive enhancement`);
    for (const token of Object.keys(LIGHT_TOKENS)) {
      const expected = `${token}: light-dark(${LIGHT_TOKENS[token]}, ${DARK_TOKENS[token]});`;
      assert.ok(
        supportsRootRule.body.includes(expected),
        `${page.file} light-dark() block missing ${expected}`
      );
    }
  });

  test(`${page.name} satisfies modern head meta, mobile-native touch/safe-area, hover gating, and 11px font floor`, () => {
    const html = read(page.file);
    const css = extractStyle(html);
    const rules = parseCssBlocks(css);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const colorSchemeMeta = doc.querySelector('meta[name="color-scheme"]');
    assert.equal(colorSchemeMeta?.getAttribute('content'), 'light dark');

    const themeLight = doc.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
    const themeDark = doc.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
    assert.equal(themeLight?.getAttribute('content'), '#f3f6fb');
    assert.equal(themeDark?.getAttribute('content'), '#070d19');
    assert.equal(doc.querySelectorAll('meta[name="theme-color"]:not([media])').length, 0);

    const viewport = doc.querySelector('meta[name="viewport"]')?.getAttribute('content') || '';
    assert.ok(viewport.includes('viewport-fit=cover'), `${page.file} viewport missing viewport-fit=cover`);
    assert.doesNotMatch(viewport, /user-scalable=no|maximum-scale=1/i);

    assert.match(css, /html\s*\{[^}]*-webkit-tap-highlight-color:\s*transparent;/);
    for (const inset of ['safe-area-inset-top', 'safe-area-inset-right', 'safe-area-inset-bottom', 'safe-area-inset-left']) {
      assert.ok(css.includes(`env(${inset})`), `${page.file} missing env(${inset})`);
    }
    assert.match(css, /touch-action:\s*manipulation;/);
    assert.doesNotMatch(css, /transition:\s*all\b/i);

    for (const rule of rules) {
      if (rule.selector.includes(':hover')) {
        assert.ok(
          rule.parents.some((p) => p.includes('@media (hover: hover) and (pointer: fine)')),
          `${page.file} :hover rule "${rule.selector}" must be gated by @media (hover: hover) and (pointer: fine)`
        );
      }
    }

    for (const match of css.matchAll(/font-size:\s*([^;]+);/g)) {
      const value = match[1].trim();
      const clampMatch = /^clamp\(\s*([0-9.]+)px\s*,/.exec(value);
      const pxMatch = /^([0-9.]+)px$/.exec(value);
      assert.ok(clampMatch || pxMatch, `${page.file} unexpected font-size unit: ${value}`);
      const minPx = parseFloat((clampMatch || pxMatch)[1]);
      assert.ok(minPx >= 11, `${page.file} font-size ${value} is below 11px floor`);
    }

    dom.window.close();
  });
}

test('Ocean Ledger light and dark color pairs meet WCAG AA contrast minimums', () => {
  assert.ok(contrast(LIGHT_TOKENS['--text-main'], LIGHT_TOKENS['--surface']) >= 4.5);
  assert.ok(contrast(LIGHT_TOKENS['--text-muted'], LIGHT_TOKENS['--surface']) >= 4.5);
  assert.ok(contrast(LIGHT_TOKENS['--accent-ink'], LIGHT_TOKENS['--accent-strong']) >= 4.5);
  assert.ok(contrast(LIGHT_TOKENS['--accent'], LIGHT_TOKENS['--surface']) >= 3);

  assert.ok(contrast(DARK_TOKENS['--text-main'], DARK_TOKENS['--surface']) >= 4.5);
  assert.ok(contrast(DARK_TOKENS['--text-muted'], DARK_TOKENS['--surface']) >= 4.5);
  assert.ok(contrast(DARK_TOKENS['--accent-ink'], DARK_TOKENS['--accent-strong']) >= 4.5);
  assert.ok(contrast(DARK_TOKENS['--accent'], DARK_TOKENS['--surface']) >= 3);
});

test('src/pages/404.html uses display=optional on Google Fonts and preserves landmarks/links', () => {
  const html = read('src/pages/404.html');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const fontLinks = [...doc.querySelectorAll('link[href*="fonts.googleapis.com/css2"]')];
  assert.equal(fontLinks.length, 1);
  assert.ok(fontLinks[0].getAttribute('href').includes('display=optional'));
  assert.ok(!html.includes('display=swap'));

  assert.ok(doc.querySelector('main.container'), '404.html must have <main class="container">');
  assert.ok(doc.querySelector('a.btn-return[href="index.html"]'));
  assert.ok(doc.querySelector('a.btn-ghost[href="onboarding.html"]'));
  assert.equal(doc.querySelector('.arrow')?.getAttribute('aria-hidden'), 'true');
  assert.equal(doc.querySelector('.arrow')?.getAttribute('focusable'), 'false');
  assert.equal(doc.querySelector('.monogram')?.getAttribute('role'), 'img');
  assert.equal(doc.querySelector('.monogram')?.getAttribute('aria-label'), 'Logo Finkas');

  dom.window.close();
});

test('src/pages/offline.html stays 100% offline-isolated with semantic main, button type, and hidden decorative SVGs', () => {
  const html = read('src/pages/offline.html');
  assert.doesNotMatch(html, /https:\/\//i, 'offline.html must make zero external https:// requests');

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  assert.equal(doc.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"], script[src]').length, 0);
  assert.ok(doc.querySelector('main.container'), 'offline.html must use semantic <main class="container">');
  assert.equal(doc.querySelector('div.container'), null, 'offline.html must not use <div class="container">');

  const retryBtn = doc.querySelector('.btn-retry');
  assert.ok(retryBtn);
  assert.equal(retryBtn.tagName, 'BUTTON');
  assert.equal(retryBtn.getAttribute('type'), 'button');

  const svgs = [...doc.querySelectorAll('svg')];
  assert.equal(svgs.length, 2);
  for (const svg of svgs) {
    assert.equal(svg.getAttribute('aria-hidden'), 'true');
    assert.equal(svg.getAttribute('focusable'), 'false');
  }

  dom.window.close();
});
