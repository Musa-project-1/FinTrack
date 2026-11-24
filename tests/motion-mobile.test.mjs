import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { initHorizonSpline } from '../src/svelte/pages/onboarding-horizon.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function walk(dir, predicate, out = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, predicate, out);
    else if (predicate(rel)) out.push(rel);
  }
  return out;
}

/** Extract rule blocks wrapped inside matching `@media ... { ... }` headers from CSS/Svelte source. */
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

/** Collect every top-level/nested selector+body rule outside matching `@media` blocks. */
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
        (parent) => parent.header.includes('@media') && parent.header.includes('hover: hover') && parent.header.includes('pointer: fine')
      );
      if (frame.header.includes(':hover') && /\btransform\s*:/.test(body) && !inFineHoverMedia) {
        violations.push(frame.header);
      }
      start = i + 1;
    }
  }
  return violations;
}

test('zero transition: all across all .svelte and .ts files under src/svelte/', () => {
  const files = walk('src/svelte', (rel) => rel.endsWith('.svelte') || rel.endsWith('.ts'));
  assert.ok(files.length > 0, 'expected files under src/svelte/');
  for (const rel of files) {
    const content = read(rel);
    assert.doesNotMatch(content, /transition\s*:\s*all\b/i, `${rel} must not use transition: all`);
  }
  for (const cssFile of ['css/onboarding-scoped.css', 'css/svelte-scoped.css']) {
    if (fs.existsSync(path.join(ROOT, cssFile))) {
      assert.doesNotMatch(read(cssFile), /transition\s*:\s*all\b/i, `${cssFile} must not emit transition: all`);
    }
  }
});

test('motion and mobile style files remain under 750 LOC and TS split stays under 600 LOC', () => {
  for (const rel of [
    'src/svelte/pages/onboarding-motion.ts',
    'src/svelte/pages/onboarding-horizon.ts',
    'src/svelte/pages/onboarding/OnboardingBaseStyle.svelte',
    'src/svelte/pages/onboarding/OnboardingFooterPortalStyle.svelte',
    'src/svelte/forms/IuranReviewChips.svelte',
    'scripts/render-shells.mjs'
  ]) {
    const lines = read(rel).split('\n').length - 1;
    assert.ok(lines < 750, `${rel} has ${lines} lines (must be < 750)`);
  }
  for (const rel of ['src/svelte/pages/onboarding-motion.ts', 'src/svelte/pages/onboarding-horizon.ts']) {
    const lines = read(rel).split('\n').length - 1;
    assert.ok(lines < 600, `${rel} has ${lines} lines (split modules must stay < 600)`);
  }
});

test('iOS 16px input zoom guards exist inside @media (pointer: coarse)', () => {
  const footerBlocks = collectMediaBlocks(
    read('src/svelte/pages/onboarding/OnboardingFooterPortalStyle.svelte'),
    'pointer: coarse'
  ).join('\n');
  assert.match(footerBlocks, /\.portal-search-input\s*\{[^}]*font-size\s*:\s*16px/);

  const chipsBlocks = collectMediaBlocks(
    read('src/svelte/forms/IuranReviewChips.svelte'),
    'pointer: coarse'
  ).join('\n');
  assert.match(chipsBlocks, /#modal-transaksi\s+\.input-with-prefix\s+\.form-control[^}]*font-size\s*:\s*16px/);
  assert.match(chipsBlocks, /#modal-quickpay\s+\.input-with-prefix\s+\.form-control[^}]*font-size\s*:\s*16px/);

  if (fs.existsSync(path.join(ROOT, 'css/onboarding-scoped.css'))) {
    const compiledOnboarding = collectMediaBlocks(read('css/onboarding-scoped.css'), 'pointer: coarse').join('\n');
    assert.match(compiledOnboarding, /\.portal-search-input\s*\{[^}]*font-size\s*:\s*16px/);
  }
  if (fs.existsSync(path.join(ROOT, 'css/svelte-scoped.css'))) {
    const compiledSvelte = collectMediaBlocks(read('css/svelte-scoped.css'), 'pointer: coarse').join('\n');
    assert.match(compiledSvelte, /#modal-transaksi\s+\.input-with-prefix\s+\.form-control[^}]*font-size\s*:\s*16px/);
    assert.match(compiledSvelte, /#modal-quickpay\s+\.input-with-prefix\s+\.form-control[^}]*font-size\s*:\s*16px/);
  }
});

test('onboarding base styles apply tap-highlight, touch-action, user-select, hover gating, Zero Green, and journey tokens', () => {
  const baseStyle = read('src/svelte/pages/onboarding/OnboardingBaseStyle.svelte');
  const footerStyle = read('src/svelte/pages/onboarding/OnboardingFooterPortalStyle.svelte');
  const chipsStyle = read('src/svelte/forms/IuranReviewChips.svelte');

  assert.match(baseStyle, /html\s*\{[^}]*-webkit-tap-highlight-color\s*:\s*transparent\s*;/);
  assert.match(baseStyle, /button[\s\S]*\[role="button"\][\s\S]*\.btn-primary[\s\S]*\.btn-ghost[\s\S]*\.portal-trigger[\s\S]*\{[^}]*touch-action\s*:\s*manipulation\s*;/);
  assert.match(baseStyle, /button[\s\S]*\.portal-trigger[\s\S]*\{[^}]*user-select\s*:\s*none\s*;/);
  assert.match(baseStyle, /button[\s\S]*\.portal-trigger[\s\S]*\{[^}]*-webkit-user-select\s*:\s*none\s*;/);

  for (const prop of ['--lp-j-sky', '--lp-j-ridge-far', '--lp-j-cloud', '--lp-j-land', '--lp-y-sky', '--lp-y-ridge-far', '--lp-y-cloud', '--lp-y-land']) {
    assert.ok(baseStyle.includes(`${prop}:`), `missing journey token ${prop}`);
  }

  for (const [label, src] of [
    ['OnboardingBaseStyle.svelte', baseStyle],
    ['OnboardingFooterPortalStyle.svelte', footerStyle],
    ['IuranReviewChips.svelte', chipsStyle]
  ]) {
    assert.deepEqual(
      collectHoverRulesWithTransformOutsideFineMedia(src),
      [],
      `${label} must gate :hover rules with transform inside @media (hover: hover) and (pointer: fine)`
    );
    assert.doesNotMatch(src, /#(10b981|008254|f3f7f5)\b/i, `${label} must obey Zero Green`);
  }
});

test('viewport-fit=cover is present on index.html, onboarding.html, and privacy.html without disabling zoom', () => {
  const shellsScript = read('scripts/render-shells.mjs');
  const shellViewports = [...shellsScript.matchAll(/<meta name="viewport" content="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(shellViewports.length, 3, 'expected 3 shell viewport tags in scripts/render-shells.mjs');
  for (const content of shellViewports) {
    assert.ok(content.includes('viewport-fit=cover'), `shell script viewport missing viewport-fit=cover: ${content}`);
    assert.doesNotMatch(content, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0+)?\b/i);
  }

  for (const page of ['index.html', 'onboarding.html', 'privacy.html']) {
    const html = read(page);
    const match = /<meta\s+name="viewport"\s+content="([^"]+)"/i.exec(html);
    assert.ok(match, `${page} missing <meta name="viewport">`);
    const content = match[1];
    assert.ok(content.includes('width=device-width'), `${page} viewport missing width=device-width`);
    assert.ok(content.includes('viewport-fit=cover'), `${page} viewport missing viewport-fit=cover`);
    assert.doesNotMatch(content, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0+)?\b/i, `${page} must not disable zoom`);
  }
});

test('onboarding-motion.ts and mount.ts preserve initHorizonSpline export contract', () => {
  const motionSrc = read('src/svelte/pages/onboarding-motion.ts');
  assert.match(motionSrc, /from\s+['"]\.\/onboarding-horizon['"]/);
  assert.match(motionSrc, /export\s+\{\s*initHorizonSpline\s*\}/);
  assert.match(read('src/svelte/mount.ts'), /initHorizonSpline[^;]*from\s+['"]\.\/pages\/onboarding-motion['"]/);
});

/* ── Behavioral tests for initHorizonSpline pause / resume ────────────────── */
let savedGlobals;

function createHorizonHarness({ initiallyHidden = false, reduced = false } = {}) {
  let drawCount = 0;
  let nextRafId = 1;
  const rafQueue = new Map();
  const canceledRafs = [];
  const docListeners = new Map();
  const canvasListeners = new Map();
  const observers = [];

  const ancestorNode = {
    contains: (node) => node === canvas
  };
  const unrelatedNode = {
    contains: () => false
  };

  const ctx = {
    setTransform() {},
    clearRect() { drawCount += 1; },
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    moveTo() {},
    lineTo() {},
    bezierCurveTo() {},
    closePath() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    fill() {},
    fillRect() {},
    stroke() {},
    arc() {},
    measureText: () => ({ width: 42 }),
    roundRect() {},
    fillText() {},
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    globalCompositeOperation: 'source-over',
    textBaseline: 'alphabetic'
  };

  const canvas = {
    width: 0,
    height: 0,
    getContext: (type) => (type === '2d' ? ctx : null),
    addEventListener: (name, fn) => {
      if (!canvasListeners.has(name)) canvasListeners.set(name, new Set());
      canvasListeners.get(name).add(fn);
    },
    removeEventListener: (name, fn) => canvasListeners.get(name)?.delete(fn)
  };

  const doc = {
    hidden: initiallyHidden,
    documentElement: {
      style: { contentVisibility: 'auto' },
      getAttribute: () => 'light'
    },
    getElementById: (id) => (id === 'horizon-canvas' ? canvas : null),
    addEventListener: (name, fn, opts) => {
      if (!docListeners.has(name)) docListeners.set(name, []);
      docListeners.get(name).push({ fn, capture: Boolean(typeof opts === 'boolean' ? opts : opts?.capture) });
    },
    removeEventListener: (name, fn) => {
      const list = docListeners.get(name);
      if (list) docListeners.set(name, list.filter((entry) => entry.fn !== fn));
    }
  };

  globalThis.document = doc;
  globalThis.window = { innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1 };
  globalThis.requestAnimationFrame = (fn) => {
    const id = nextRafId++;
    rafQueue.set(id, fn);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    canceledRafs.push(id);
    rafQueue.delete(id);
  };
  globalThis.IntersectionObserver = class MockIntersectionObserver {
    constructor(cb) {
      this.cb = cb;
      this.observed = [];
      this.disconnected = false;
      observers.push(this);
    }
    observe(target) { this.observed.push(target); }
    disconnect() { this.disconnected = true; }
    emit(isIntersecting) { this.cb([{ target: canvas, isIntersecting }]); }
  };

  let saldo = 14850000;
  const reducedMotion = {
    matches: reduced,
    addEventListener() {},
    removeEventListener() {}
  };

  const ctrl = initHorizonSpline({
    reducedMotion,
    getSaldo: () => saldo,
    initialSaldo: 14850000
  });

  const emitVisibility = (hidden) => {
    doc.hidden = hidden;
    for (const entry of docListeners.get('visibilitychange') || []) entry.fn({ type: 'visibilitychange' });
  };

  const emitContentVisibility = (skipped, target = ancestorNode) => {
    const evt = { type: 'contentvisibilityautostatechange', skipped, target };
    for (const entry of docListeners.get('contentvisibilityautostatechange') || []) {
      entry.fn(evt);
    }
    if (target === canvas) {
      for (const fn of canvasListeners.get('contentvisibilityautostatechange') || []) fn(evt);
    }
  };

  const stepRaf = () => {
    const first = rafQueue.entries().next();
    if (first.done) return false;
    const [id, fn] = first.value;
    rafQueue.delete(id);
    fn();
    return true;
  };

  return {
    ctrl,
    canvas,
    ancestorNode,
    unrelatedNode,
    docListeners,
    canvasListeners,
    observers,
    rafQueue,
    canceledRafs,
    getDrawCount: () => drawCount,
    setSaldo: (v) => { saldo = v; },
    emitVisibility,
    emitContentVisibility,
    stepRaf
  };
}

beforeEach(() => {
  savedGlobals = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    IntersectionObserver: globalThis.IntersectionObserver
  };
});

afterEach(() => {
  for (const [key, val] of Object.entries(savedGlobals)) {
    if (val === undefined) delete globalThis[key];
    else globalThis[key] = val;
  }
});

test('initHorizonSpline pauses rAF & skips redraws when document.hidden, then resumes cleanly', () => {
  const h = createHorizonHarness();
  assert.ok(h.ctrl);
  assert.equal(h.getDrawCount(), 1, 'initial render draws once when visible');

  h.setSaldo(14950000);
  h.ctrl.wave(1);
  assert.equal(h.rafQueue.size, 1, 'wave schedules rAF while visible');
  assert.equal(h.stepRaf(), true);
  assert.equal(h.getDrawCount(), 2);
  assert.equal(h.rafQueue.size, 1, 'wave continues scheduling frames while active');

  h.emitVisibility(true);
  assert.equal(h.rafQueue.size, 0, 'backgrounding tab cancels active rAF immediately');
  assert.ok(h.canceledRafs.length >= 1);

  const drawsWhileHidden = h.getDrawCount();
  h.ctrl.setScroll(0.5);
  h.ctrl.redraw();
  h.ctrl.onResize();
  h.ctrl.wave(-1);
  assert.equal(h.getDrawCount(), drawsWhileHidden, 'hidden tab burns zero canvas draws');
  assert.equal(h.rafQueue.size, 0, 'hidden tab schedules zero rAF loops');

  h.emitVisibility(false);
  assert.equal(h.rafQueue.size, 1, 'returning to foreground resumes pending wave rAF');
  assert.equal(h.stepRaf(), true);
  assert.equal(h.getDrawCount(), drawsWhileHidden + 1);
  h.ctrl.destroy();
});

test('initHorizonSpline pauses on contentvisibilityautostatechange (capture + direct) and ignores unrelated targets', () => {
  const h = createHorizonHarness();
  const captureEntries = (h.docListeners.get('contentvisibilityautostatechange') || []).filter((e) => e.capture);
  assert.equal(captureEntries.length, 1, 'must listen in capture phase since event may not bubble');
  assert.equal((h.canvasListeners.get('contentvisibilityautostatechange') || new Set()).size, 1);

  h.ctrl.wave(1);
  assert.equal(h.rafQueue.size, 1);

  // Unrelated offscreen container must not pause the canvas
  h.emitContentVisibility(true, h.unrelatedNode);
  assert.equal(h.rafQueue.size, 1);

  // Ancestor container or canvas skipped pauses canvas work
  h.emitContentVisibility(true, h.ancestorNode);
  assert.equal(h.rafQueue.size, 0);
  const pausedDraws = h.getDrawCount();
  h.ctrl.setScroll(0.75);
  assert.equal(h.getDrawCount(), pausedDraws);

  // Restoring content-visibility resumes wave animation
  h.emitContentVisibility(false, h.ancestorNode);
  assert.equal(h.rafQueue.size, 1);
  h.stepRaf();
  assert.equal(h.getDrawCount(), pausedDraws + 1);
  h.ctrl.destroy();
});

test('initHorizonSpline pauses when IntersectionObserver reports offscreen and catches up when visible', () => {
  const h = createHorizonHarness();
  assert.equal(h.observers.length, 1);
  assert.deepEqual(h.observers[0].observed, [h.canvas]);

  h.observers[0].emit(false);
  const drawsBeforeScroll = h.getDrawCount();
  h.ctrl.setScroll(0.8);
  h.ctrl.redraw();
  assert.equal(h.getDrawCount(), drawsBeforeScroll, 'offscreen canvas skips redraws');
  assert.equal(h.rafQueue.size, 0);

  h.observers[0].emit(true);
  assert.equal(h.getDrawCount(), drawsBeforeScroll + 1, 'dirty redraw catches up once back on screen');

  h.ctrl.destroy();
  assert.equal(h.observers[0].disconnected, true);
});
