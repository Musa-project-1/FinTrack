import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installSvelteDom } from './helpers/svelte-dom.mjs';

import * as kasiRoam from '../src/svelte/ui/kasi-roam.ts';
import * as dashboardBundle from '../src/ui/svelte-dashboard.js';

const read = (relPath) => readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf8');

test('kasi-mascot.ts and kasi-roam.ts stay cleanly modularized under 600 LOC (and < 550 LOC)', () => {
  for (const file of ['src/svelte/ui/kasi-mascot.ts', 'src/svelte/ui/kasi-roam.ts']) {
    const lines = read(file).trimEnd().split('\n').length;
    assert.ok(lines < 550, `${file} has ${lines} lines (expected < 550)`);
    assert.ok(lines < 600, `${file} has ${lines} lines (expected < 600)`);
  }
});

test('kasi-mascot.ts preserves exact public exports (initKasi, playKasiAction) and mount re-export', () => {
  const mascotSrc = read('src/svelte/ui/kasi-mascot.ts');
  const exportNames = [...mascotSrc.matchAll(/^\s*export\s+(?:const|function|let|class)\s+([A-Za-z0-9_]+)/gm)].map(m => m[1]);
  assert.deepEqual(exportNames.sort(), ['initKasi', 'playKasiAction']);
  assert.match(read('src/svelte/mount.ts'), /export\s+\*\s+from\s+['"]\.\/ui\/kasi-mascot['"]/);
  assert.equal(typeof dashboardBundle.initKasi, 'function');
  assert.equal(typeof dashboardBundle.playKasiAction, 'function');
  assert.ok(Array.isArray(kasiRoam.FLOAT_TRICKS) && kasiRoam.FLOAT_TRICKS.length === 4);
  assert.deepEqual(Object.keys(kasiRoam.ACTIONS).sort(), ['celebrate', 'coin', 'fish', 'flip', 'pet']);
});

test('clamp, kasiSizeForWidth, and computeFloorY behave accurately across desktop and mobile viewports', () => {
  assert.equal(kasiRoam.clamp(-5, 12, 100), 12);
  assert.equal(kasiRoam.clamp(42, 12, 100), 42);
  assert.equal(kasiRoam.clamp(150, 12, 100), 100);

  // Mobile breakpoint (<= 768px) vs desktop (> 768px) and explicit measured buttonWidth
  assert.equal(kasiRoam.kasiSizeForWidth(375), 54);
  assert.equal(kasiRoam.kasiSizeForWidth(768), 54);
  assert.equal(kasiRoam.kasiSizeForWidth(769), 64);
  assert.equal(kasiRoam.kasiSizeForWidth(1440), 64);
  assert.equal(kasiRoam.kasiSizeForWidth(375, 58), 58);

  // Desktop without bottom nav: innerHeight - 16 - size
  assert.equal(kasiRoam.computeFloorY(1440, 900, 64, false, 900), 820);
  // Mobile without bottom nav: innerHeight - 80 - size
  assert.equal(kasiRoam.computeFloorY(375, 667, 54, false, 667), 533);
  // Mobile with bottom nav closer than 80px from bottom
  assert.equal(kasiRoam.computeFloorY(390, 844, 54, true, 750), 684);
  // Very short viewport enforces minimum floor >= 70
  assert.equal(kasiRoam.computeFloorY(375, 120, 54, false, 120), 70);
});

test('computeLedgeRect and filterPerchCandidates enforce card geometry across desktop and mobile', () => {
  const desktopKasi = 64;
  const desktopWidth = 1280;
  const desktopFloor = kasiRoam.computeFloorY(desktopWidth, 800, desktopKasi, false, 800);

  const validCard = kasiRoam.computeLedgeRect('kpi-1', { left: 24, right: 320, top: 180, width: 296, height: 110 }, desktopKasi, desktopWidth);
  assert.deepEqual(validCard, { el: 'kpi-1', y: 124, left: 24, minX: 32, maxX: 248 });

  const tooSmallCard = kasiRoam.computeLedgeRect('tiny', { left: 24, right: 90, top: 180, width: 66, height: 110 }, desktopKasi, desktopWidth);
  assert.equal(tooSmallCard, null);

  const tooShortCard = kasiRoam.computeLedgeRect('flat', { left: 24, right: 320, top: 180, width: 296, height: 30 }, desktopKasi, desktopWidth);
  assert.equal(tooShortCard, null);

  const aboveTop = kasiRoam.computeLedgeRect('above', { left: 24, right: 320, top: 100, width: 296, height: 100 }, desktopKasi, desktopWidth);
  const belowFloor = kasiRoam.computeLedgeRect('below', { left: 24, right: 320, top: 790, width: 296, height: 100 }, desktopKasi, desktopWidth);
  const narrowSpan = kasiRoam.computeLedgeRect('edge', { left: 1190, right: 1272, top: 220, width: 82, height: 80 }, desktopKasi, desktopWidth);

  const filteredDesktop = kasiRoam.filterPerchCandidates([validCard, tooSmallCard, aboveTop, belowFloor, narrowSpan], 58, desktopFloor);
  assert.deepEqual(filteredDesktop.map(c => c.el), ['kpi-1']);

  // Mobile 375x667 viewport clamping
  const mobileKasi = 54;
  const mobileCard = kasiRoam.computeLedgeRect('m-card', { left: 0, right: 375, top: 140, width: 375, height: 120 }, mobileKasi, 375);
  assert.deepEqual(mobileCard, { el: 'm-card', y: 94, left: 0, minX: 12, maxX: 309 });
});

test('perch lookup, drop target, offsets, dock, chase, dodge, and bounds sync helpers behave deterministically', () => {
  const c1 = { el: 'top-card', y: 120, left: 20, minX: 28, maxX: 260 };
  const c2 = { el: 'mid-card', y: 310, left: 20, minX: 28, maxX: 260 };
  const cands = [c1, c2];

  assert.equal(kasiRoam.findPerchesAt(cands, 20).length, 2); // within 10px margin (28 - 10 = 18)
  assert.equal(kasiRoam.findPerchesAt(cands, 5).length, 0);
  assert.equal(kasiRoam.findNearestPerch(cands, 100, 140, 26)?.el, 'top-card');
  assert.equal(kasiRoam.findNearestPerch(cands, 100, 200, 26), null);

  assert.deepEqual(kasiRoam.selectDropTarget(cands, 100, 120, 720), c1);
  assert.deepEqual(kasiRoam.selectDropTarget(cands, 100, 130, 720), c2);
  assert.deepEqual(kasiRoam.selectDropTarget(cands, 100, 400, 720), { el: null, y: 720 });

  // Bubble & halo offsets stay clamped inside viewport padding (10px)
  assert.equal(kasiRoam.computeBubbleOffsetX(12, 54, 180, 375), -2); // bLeft clamped to 10 -> 10 - 12
  assert.equal(kasiRoam.computeHaloOffsetX(309, 54, 375), -204); // haloWidth=260, max left=375-260-10=105 -> 105 - 309
  assert.equal(kasiRoam.computeHaloOffsetX(12, 64, 1280), -2); // haloWidth=378, left clamped to 10 -> 10 - 12

  // Home dock prefers wide first perch offset, or bottom-right floor fallback
  assert.deepEqual(kasiRoam.computeHomeDockTarget(c1, 64, 1280, 820), { x: 214, y: 120, perchedEl: 'top-card', perchOffsetX: 194 });
  assert.deepEqual(kasiRoam.computeHomeDockTarget(undefined, 54, 375, 533), { x: 307, y: 533, perchedEl: null, perchOffsetX: 0 });
  assert.deepEqual(kasiRoam.computeHomeDockTarget(undefined, 64, 1280, 820), { x: 1198, y: 820, perchedEl: null, perchOffsetX: 0 });

  // Treat chase on wide perch stays on ledge; narrow falls back to floor
  const wideChase = kasiRoam.computeTreatChaseTarget(40, c1, 64, 1280, 820, 0);
  assert.equal(wideChase.tx, 175);
  assert.equal(wideChase.ty, 120);
  assert.equal(wideChase.perchedEl, 'top-card');
  const floorChase = kasiRoam.computeTreatChaseTarget(100, { el: 'narrow', y: 120, left: 80, minX: 88, maxX: 140 }, 64, 1280, 820, 0);
  assert.equal(floorChase.ty, 820);
  assert.equal(floorChase.perchedEl, null);

  // Toast dodge shifts left when room exists, or jumps above toast
  assert.deepEqual(kasiRoam.computeToastDodgeTarget({ left: 900, top: 780 }, 920, 64, 58, 820), { tx: 820, ty: 820 });
  assert.deepEqual(kasiRoam.computeToastDodgeTarget({ left: 20, top: 780 }, 40, 54, 58, 533), { tx: 40, ty: 710 });

  // Synced bounds handles scroll-above-topbar rejoin and resize un-perch
  const rState = kasiRoam.createRoamState();
  rState.perchedEl = /** @type {any} */ ('top-card');
  rState.perchOffsetX = 40;
  assert.equal(kasiRoam.resolveSyncedBounds(rState, { el: /** @type {any} */ ('top-card'), y: -20, left: 20, minX: 28, maxX: 260 }, 58, 820, 64, 1280, false), 'rejoin');
  assert.equal(kasiRoam.resolveSyncedBounds(rState, { el: /** @type {any} */ ('top-card'), y: 40, left: 20, minX: 28, maxX: 260 }, 58, 820, 64, 1280, true), 'floor');
  assert.equal(rState.perchedEl, null);
  assert.equal(rState.y, 820);
});

test('hover rub gesture and roam frame kinematics progress cleanly', () => {
  const hover = kasiRoam.createHoverRubState();
  assert.equal(kasiRoam.recordHoverRubSample(hover, 100, 100, 1000), false);
  assert.equal(kasiRoam.recordHoverRubSample(hover, 145, 100, 1050), false);
  assert.equal(kasiRoam.recordHoverRubSample(hover, 100, 100, 1100), true); // reversal + total >= 72

  const roam = kasiRoam.createRoamState();
  roam.mode = 'jump';
  roam.lastFrameAt = 1000;
  let arrived = false;
  roam.jumpStart = {
    sx: 100, sy: 500, tx: 200, ty: 500, startAt: 1000, dur: 500, arcH: 40,
    targetEl: null, onArrive: () => { arrived = true; }
  };
  let scheduled = 0;
  const hooks = {
    resolveLedge: () => null,
    findDrop: () => ({ el: null, y: 600 }),
    isPaused: () => false,
    scheduleNextRoam: () => { scheduled += 1; },
    onFallLand: () => {}
  };
  // Mid-jump (t = 0.5): x halfway, y lifted by parabolic arcH
  assert.equal(kasiRoam.stepRoamFrame(roam, 1250, hooks), true);
  assert.equal(roam.x, 150);
  assert.equal(roam.y, 460);
  assert.equal(arrived, false);
  // End of jump (t = 1): lands cleanly and notifies callbacks
  assert.equal(kasiRoam.stepRoamFrame(roam, 1500, hooks), false);
  assert.equal(roam.x, 200);
  assert.equal(roam.y, 500);
  assert.equal(roam.mode, 'idle');
  assert.equal(arrived, true);
  assert.equal(scheduled, 1);
});

test('kasi-roam DOM wrappers and initKasi/playKasiAction smoke-run cleanly in JSDOM', (t) => {
  const byId = installSvelteDom(t, `
    <body data-lang="en">
      <header class="hybrid-topbar"></header>
      <section class="bento-kpi"></section>
      <div id="kasi-dock" hidden>
        <div id="kasi-halo" hidden></div>
        <div id="kasi-mini-bubble" hidden></div>
        <div id="kasi-treat" hidden></div>
        <button id="kasi-fab" type="button" aria-expanded="false">
          <svg class="kasi-svg" data-kasi-mascot data-mood="idle"><circle data-kasi-pupil></circle></svg>
        </button>
      </div>
      <div id="kasi-feedback"></div>
    </body>
  `);

  const savedGlobals = new Map();
  const patchGlobal = (key, val) => {
    savedGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value: val, configurable: true, writable: true });
  };
  t.after(() => {
    for (const [k, d] of savedGlobals) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
  });

  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  const pendingTimers = new Set();
  t.after(() => {
    for (const id of pendingTimers) realClearTimeout(id);
    pendingTimers.clear();
  });

  patchGlobal('innerWidth', 1280);
  patchGlobal('innerHeight', 800);
  patchGlobal('matchMedia', () => ({ matches: true }));
  patchGlobal('requestAnimationFrame', () => 0);
  patchGlobal('cancelAnimationFrame', () => {});
  patchGlobal('setTimeout', (fn, ms, ...args) => {
    const id = realSetTimeout(() => { pendingTimers.delete(id); fn(...args); }, ms);
    pendingTimers.add(id);
    return id;
  });
  patchGlobal('clearTimeout', (id) => {
    pendingTimers.delete(id);
    realClearTimeout(id);
  });

  const topbar = document.querySelector('.hybrid-topbar');
  topbar.getBoundingClientRect = () => ({ bottom: 60 });
  const card = document.querySelector('.bento-kpi');
  card.getClientRects = () => [1];
  card.getBoundingClientRect = () => ({ left: 20, right: 360, top: 200, width: 340, height: 120 });

  assert.equal(kasiRoam.sz(), 64);
  assert.equal(kasiRoam.topBottom(), 60);
  assert.equal(kasiRoam.floorY(), 720);
  assert.equal(kasiRoam.perchCandidates().length, 1);

  const prevGroupId = dashboardBundle.getActiveGroupId?.() ?? '';
  t.after(() => dashboardBundle.setActiveGroupId?.(prevGroupId));
  dashboardBundle.setActiveGroupId('grp-1');
  dashboardBundle.initKasi();
  const dock = byId('kasi-dock');
  assert.equal(dock.hidden, false);
  dashboardBundle.playKasiAction('trick');
  assert.ok(byId('kasi-feedback').textContent.length > 0);
  dashboardBundle.setActiveGroupId('');
  assert.equal(dock.hidden, true);
});
