import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { getActiveGroupId, setActiveGroupId, setGroups } from '../src/core/state.js';
import { enterGroup } from '../src/handlers/groups.js';
import {
  animateHybridAmount, enterHybridOverview, getLastGroupDirection, isGroupTransitionActive,
  resolveGroupDirection, runGroupSwitchTransition, runHybridThemeWipe
} from '../src/ui/hybrid-motion.js';

const groups = [{ id: 'GRP-A', nama: 'Grup A' }, { id: 'GRP-B', nama: 'Grup B' }];
const byId = id => document.getElementById(id);

function setup(t, reduced = false) {
  const dom = new JSDOM(`<body data-workspace-state="ready">
    <dialog id="modal-groups" open></dialog><dialog id="modal-group-pin" open></dialog>
    <button id="app-group-name"></button><span id="workspace-startup-label"></span>
    <main class="container"><section id="group-overview" data-cascade>
      <h1 id="group-overview-name" tabindex="-1"></h1><span id="amount" data-amount-prefix="Rp "></span>
    </section></main></body>`, { url: 'https://example.test', pretendToBeVisual: true });
  for (const key of ['window', 'document', 'localStorage', 'CustomEvent', 'requestAnimationFrame', 'cancelAnimationFrame',
    'innerWidth', 'innerHeight']) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
  }
  window.matchMedia = () => ({ matches: reduced });
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  t.after(() => dom.window.close());
}

function mockNative(t) {
  const calls = [];
  document.startViewTransition = arg => {
    const { promise: finished, resolve: finish } = Promise.withResolvers();
    const update = typeof arg === 'function' ? arg : arg.update;
    const updateCallbackDone = Promise.resolve().then(update);
    const transition = { finished, skipTransition: t.mock.fn(), ready: updateCallbackDone, updateCallbackDone };
    calls.push({ arg, finish, transition, dialogOpen: byId('modal-groups').open || byId('modal-group-pin').open });
    return transition;
  };
  return calls;
}

test('direction follows group order and defaults forward for unknown groups', () => {
  assert.equal(resolveGroupDirection('GRP-A', 'GRP-B', groups), 'group-forward');
  assert.equal(resolveGroupDirection('GRP-B', 'GRP-A', groups), 'group-backward');
  for (const pair of [['GRP-A', 'GRP-A'], ['unknown', 'GRP-A'], ['GRP-B', 'unknown']]) {
    assert.equal(resolveGroupDirection(...pair, groups), 'group-forward');
  }
  assert.equal(resolveGroupDirection('GRP-B', 'GRP-A'), 'group-forward');
});

test('group entry closes dialogs before capture, renders final KPI values and focuses the heading', async t => {
  setup(t);
  window.ViewTransitionTypeSet = class {};
  const calls = mockNative(t);
  const frame = t.mock.method(globalThis, 'requestAnimationFrame', () => 1);
  setGroups(groups);
  setActiveGroupId('GRP-A');
  let activeDuringRender;
  window.addEventListener('finkas:group-changed', () => {
    activeDuringRender = isGroupTransitionActive();
    enterHybridOverview();
    animateHybridAmount(byId('amount'), 125, { format: String, from: 0 });
  });
  enterGroup('GRP-B');
  const forward = calls[0];
  assert.equal(forward.dialogOpen, false);
  assert.deepEqual(forward.arg.types, ['group-forward']);
  assert.equal(document.documentElement.dataset.groupTransition, 'group-forward');
  assert.equal(byId('workspace-startup-label').textContent, 'Membuka Grup B…');
  assert.equal(getActiveGroupId(), 'GRP-A');
  await forward.transition.updateCallbackDone;
  assert.equal(activeDuringRender, true);
  assert.equal(isGroupTransitionActive(), false);
  assert.equal(getActiveGroupId(), 'GRP-B');
  assert.equal(byId('app-group-name').textContent, 'Grup B');
  assert.equal(byId('amount').textContent, 'Rp 125');
  enterHybridOverview(); // A later refresh of the same group must not replay the cascade.
  assert.equal(frame.mock.callCount(), 0);
  forward.finish();
  await forward.transition.finished;
  assert.equal(document.documentElement.dataset.groupTransition, undefined);
  assert.equal(document.activeElement, byId('group-overview-name'));

  enterGroup('GRP-A');
  assert.deepEqual(calls[1].arg.types, ['group-backward']);
  assert.equal(getLastGroupDirection(), 'group-backward');
  await calls[1].transition.updateCallbackDone;
  calls[1].finish();
  await calls[1].transition.finished;
});

test('older native API uses callbacks and interrupted transitions clean up only their own state', async t => {
  setup(t);
  const calls = mockNative(t);
  const apply = t.mock.fn();
  runGroupSwitchTransition(apply);
  runGroupSwitchTransition(apply, { direction: 'group-backward' });
  assert.equal(typeof calls[0].arg, 'function');
  assert.equal(calls[0].transition.skipTransition.mock.callCount(), 1);
  calls[0].finish();
  await calls[0].transition.finished;
  assert.equal(apply.mock.callCount(), 2);
  assert.equal(document.documentElement.dataset.groupTransition, 'group-backward');
  runHybridThemeWipe(apply);
  assert.equal(calls[1].transition.skipTransition.mock.callCount(), 1);
  const root = document.documentElement;
  assert.equal(root.dataset.groupTransition, undefined);
  assert.equal(root.dataset.themeWipe, 'true');
  runGroupSwitchTransition(apply);
  assert.equal(calls[2].transition.skipTransition.mock.callCount(), 1);
  assert.equal(root.dataset.themeWipe, undefined);
  for (const call of calls.slice(1)) call.finish();
  await calls.at(-1).transition.finished;
  assert.equal(root.dataset.groupTransition, undefined);
});

test('fallback updates synchronously and clears motion classes on the element’s own animationend', t => {
  setup(t);
  const apply = t.mock.fn();
  const main = document.querySelector('main');
  const chip = byId('app-group-name');
  runGroupSwitchTransition(apply, { direction: 'group-backward', focusHeading: true });
  assert.equal(apply.mock.callCount(), 1);
  assert.equal(main.dataset.groupDir, 'group-backward');
  assert.equal(chip.classList.contains('is-group-arrived'), true);
  assert.equal(document.activeElement, byId('group-overview-name'));
  const end = node => node.dispatchEvent(new window.Event('animationend', { bubbles: true }));
  end(byId('group-overview'));
  assert.equal(main.classList.contains('group-switch-fallback'), true);
  end(main);
  end(chip);
  assert.equal(main.dataset.groupDir, undefined);
  assert.equal(main.classList.contains('group-switch-fallback'), false);
  assert.equal(chip.classList.contains('is-group-arrived'), false);
  main.getAnimations = chip.getAnimations = () => [];
  runGroupSwitchTransition(apply);
  assert.equal(main.dataset.groupDir, undefined);
  assert.equal(main.classList.contains('group-switch-fallback'), false);
  assert.equal(chip.classList.contains('is-group-arrived'), false);
});

test('reduced motion updates and routes focus synchronously without starting any animation', t => {
  setup(t, true);
  const calls = mockNative(t);
  const apply = t.mock.fn();
  runGroupSwitchTransition(apply, { focusHeading: true });
  assert.equal(apply.mock.callCount(), 1);
  assert.equal(calls.length, 0);
  assert.equal(document.activeElement, byId('group-overview-name'));
  assert.equal(document.querySelector('.group-switch-fallback, .is-group-arrived, [data-group-transition]'), null);
});
