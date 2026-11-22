import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { resetPinInput, wirePinInput } from '../src/ui/pin-input.js';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const gestureSource = read('src/ui/gestures.js')
  .replace(/import .*?from '\.\/modal.js';/, '')
  .replaceAll('export const ', 'var ');

function gestureHarness(reduced = false) {
  const timers = new Map();
  const closed = [];
  const style = () => {
    const values = new Map();
    return {
      values,
      setProperty: (key, value) => values.set(key, value),
      removeProperty: (key) => values.delete(key)
    };
  };
  const handlers = new Map();
  const zone = {
    style: style(), closest: () => null,
    setPointerCapture() {}, releasePointerCapture() {},
    addEventListener: (name, fn) => handlers.set(name, fn)
  };
  const overlay = { id: 'sheet-modal', style: style() };
  const sheet = {
    dataset: {}, style: style(), scrollTop: 0, offsetHeight: 300,
    closest: () => overlay, querySelector: () => zone
  };
  const context = vm.createContext({
    document: { querySelectorAll: () => [sheet] },
    window: { matchMedia: () => ({ matches: reduced }) },
    closeModal: (id) => closed.push(id),
    setTimeout: (fn, delay) => { const id = {}; timers.set(id, { fn, delay }); return id; },
    clearTimeout: (id) => timers.delete(id), Date
  });
  vm.runInContext(gestureSource + '\ninitBottomSheetGestures();', context);
  const fire = (type, y = 0, pointerId = 1) => handlers.get(type)?.({
    type, clientY: y, pointerId, target: zone, currentTarget: zone, pointerType: 'touch'
  });
  return { sheet, overlay, zone, timers, closed, fire };
}

for (const cancel of ['pointercancel', 'lostpointercapture']) {
  test(`${cancel} aborts a dismiss-sized drag immediately`, () => {
    const h = gestureHarness();
    assert.equal(h.zone.style.values.get('touch-action'), 'pan-y');
    h.fire('pointerdown'); h.fire('pointermove', 200);
    assert.equal(h.sheet.style.values.get('transform'), 'translateY(200px)');
    h.fire(cancel, 200); h.fire('pointerup', 200);
    assert.deepEqual(h.closed, []);
    assert.equal(h.timers.size, 0);
    assert.equal(h.sheet.style.values.size, 0);
    assert.equal(h.overlay.style.values.size, 0);
  });
}

test('reduced motion dismisses and snaps back without transition timers', () => {
  for (const distance of [10, 200]) {
    const h = gestureHarness(true);
    h.fire('pointerdown'); h.fire('pointermove', distance); h.fire('pointerup', distance);
    assert.equal(h.closed.length, distance === 200 ? 1 : 0);
    assert.equal(h.timers.size, 0);
    assert.equal(h.sheet.style.values.size, 0);
    assert.equal(h.overlay.style.values.size, 0);
  }
});

test('normal release animates; a new gesture cancels pending dismissal', () => {
  const h = gestureHarness();
  h.fire('pointerdown'); h.fire('pointermove', 10); h.fire('pointerup', 10);
  assert.equal(h.overlay.style.values.get('opacity'), '1');
  assert.equal(h.overlay.style.values.get('transition'), 'opacity 0.2s ease-out');
  assert.equal([...h.timers.values()][0].delay, 200);
  h.fire('pointerdown'); h.fire('pointermove', 200); h.fire('pointerup', 200);
  assert.equal([...h.timers.values()][0].delay, 220);
  assert.deepEqual(h.closed, []);
  h.fire('pointerdown'); h.fire('pointercancel');
  assert.equal(h.timers.size, 0);
  assert.deepEqual(h.closed, []);
  h.fire('pointerdown'); h.fire('pointermove', 200); h.fire('pointerup', 200);
  [...h.timers.values()][0].fn();
  assert.deepEqual(h.closed, ['sheet-modal']);
});

test('unrelated pointers cannot cancel or release the active drag', () => {
  const h = gestureHarness();
  h.fire('pointerdown'); h.fire('pointermove', 200);
  h.fire('pointercancel', 200, 2);
  assert.equal(h.sheet.style.values.get('transform'), 'translateY(200px)');
  h.fire('pointercancel', 200);
  assert.deepEqual(h.closed, []);
});

test('each PIN screen has one named native password input associated with its error', () => {
  for (const [file, messageId] of [
    ['html/modals/group-pin.html', 'group-pin-msg'], ['onboarding.html', 'pin-msg']
  ]) {
    const html = read(file);
    const input = html.match(/<input\b[^>]*id="group-pin"[^>]*>/g);
    assert.equal(input?.length, 1);
    for (const attr of ['type="password"', 'inputmode="numeric"', 'maxlength="4"',
      'autocomplete="off"', 'aria-label="PIN grup, 4 angka"', `aria-describedby="${messageId}"`]) {
      assert.ok(input[0].includes(attr), `${file}: ${attr}`);
    }
    assert.match(html, new RegExp(`id="${messageId}"[^>]*aria-live="polite"`));
    assert.doesNotMatch(html, /id="pin[0-3]"/);
    const row = html.match(/<div class="[^"]*pin-control">([\s\S]*?)<\/div>/)[1];
    assert.equal((row.match(/<span[^>]*aria-hidden="true"/g) || []).length, 4);
  }
});

test('PIN typing and full-value paste normalize digits, update boxes and clear errors', () => {
  const saved = globalThis.document;
  const boxes = Array.from({ length: 4 }, () => ({ textContent: '' }));
  const attrs = new Map([['aria-describedby', 'group-pin-msg'], ['aria-invalid', 'true']]);
  const handlers = new Map();
  const classes = new Set(['is-error']);
  let submissions = 0;
  let message = 'PIN salah';
  globalThis.document = { getElementById: () => ({ replaceChildren: () => { message = ''; } }) };
  try {
    const input = {
      value: '', dataset: {},
      parentElement: { querySelectorAll: () => boxes, classList: { remove: (c) => classes.delete(c) } },
      getAttribute: (k) => attrs.get(k), setAttribute: (k, v) => attrs.set(k, v),
      addEventListener: (k, v) => handlers.set(k, v)
    };
    wirePinInput(input, () => submissions++);
    input.value = '01'; handlers.get('input')();
    assert.equal(submissions, 0);
    assert.deepEqual(boxes.map((b) => b.textContent), ['•', '•', '', '']);
    input.value = '01a23'; handlers.get('input')();
    assert.equal(input.value, '0123');
    assert.equal(submissions, 1);
    assert.equal(message, '');
    assert.equal(attrs.get('aria-invalid'), 'false');
    assert.equal(classes.has('is-error'), false);
    handlers.get('keydown')({ key: 'Backspace' });
    assert.equal(submissions, 1); // Native editing keys remain untouched.
    resetPinInput(input);
    assert.equal(input.value, '');
    assert.ok(boxes.every((b) => b.textContent === ''));
  } finally { globalThis.document = saved; }
});

function luminance(hex) {
  const rgb = hex.replace('#', '').match(/../g).map((part) => parseInt(part, 16) / 255)
    .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('scrollbar thumbs maintain 3:1 contrast against all theme surfaces', () => {
  const tokens = read('css/modules/tokens.css');
  for (const block of [tokens.split(':root {')[1].split('}')[0],
    tokens.split('body.dark-mode {')[1].split('}')[0]]) {
    const thumb = block.match(/--scrollbar-thumb:\s*(#[\da-f]+)/)[1];
    for (const [, surface] of block.matchAll(/--(?:bg-color|surface(?:-[23])?):\s*(#[\da-f]+)/g)) {
      assert.ok(contrast(thumb, surface) >= 3, `${thumb} on ${surface}`);
    }
  }
  const landing = read('css/onboarding.css');
  const thumb = landing.match(/--scrollbar-thumb:\s*(#[\da-f]+)/)[1];
  for (const [, surface] of landing.matchAll(/--lp-(?:abyss|canvas|graphite|steel|void):\s*(#[\da-f]+)/g)) {
    assert.ok(contrast(thumb, surface) >= 3, `${thumb} on ${surface}`);
  }
});

test('vendor scrollbar selectors only appear within unsupported-standard fallback blocks', () => {
  for (const file of ['css/modules/base.css', 'css/modules/tables.css',
    'css/modules/responsive-tablet.css', 'css/modules/view-master.css',
    'css/modules/view-riwayat-mobile.css', 'css/onboarding.css']) {
    const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
    const stack = [];
    let start = 0;
    for (let i = 0; i < css.length; i++) {
      if (css[i] === '{') {
        const selector = css.slice(start, i).trim();
        if (selector.includes('::-webkit-scrollbar')) {
          assert.ok(stack.some((s) => s === '@supports not (scrollbar-color: auto)'), `${file}: ${selector}`);
        }
        stack.push(selector); start = i + 1;
      } else if (css[i] === '}') { stack.pop(); start = i + 1; }
    }
    assert.equal(stack.length, 0);
  }
  for (const file of ['css/modules/base.css', 'css/onboarding.css']) {
    assert.match(read(file), /scrollbar-width:\s*thin/);
    assert.match(read(file), /scrollbar-color:\s*var\(--scrollbar-thumb\) transparent/);
  }
});

test('split modules are imported, precached, and authored batch sources stay under 750 lines', () => {
  for (const file of ['css/modules/groups-superadmin.css', 'css/modules/pin-input.css', 'src/ui/pin-input.js']) {
    assert.ok(read('sw.js').includes(`'${file}'`));
  }
  for (const file of ['groups-modal.css', 'groups-superadmin.css', 'pin-input.css']) {
    assert.ok(read('css/input.css').includes(`./modules/${file}`));
  }
  for (const file of ['css/modules/groups-modal.css', 'css/modules/groups-superadmin.css',
    'css/modules/pin-input.css', 'src/ui/pin-input.js', 'src/ui/gestures.js', 'src/handlers/groups.js',
    'src/onboarding.js', 'onboarding.html', 'css/onboarding.css', 'css/onboarding-motion.css']) {
    assert.ok(read(file).split('\n').length - 1 < 750, file);
  }
});

for (const screen of ['groups', 'onboarding']) {
  test(`${screen} PIN rejection exposes its error and preserves server verification payload`, async () => {
    const boxes = Array.from({ length: 4 }, () => ({ textContent: '' }));
    const attributes = new Map();
    const classes = { remove() {}, add() {} };
    const input = {
      value: '0123', focus() {}, setAttribute: (k, v) => attributes.set(k, v),
      closest: () => ({ classList: classes }),
      parentElement: { querySelectorAll: () => boxes, classList: classes }
    };
    let message = '';
    let payload;
    const msg = {
      replaceChildren: (text = '') => { message = text; },
      set innerHTML(text) { message = text; }
    };
    const context = vm.createContext({
      document: {
        getElementById: (id) => id === 'group-pin' ? input : id.endsWith('msg') ? msg : null,
        createTextNode: (text) => text, addEventListener() {}
      },
      window: { matchMedia: () => ({ matches: false, addEventListener() {} }) },
      API: { VERIFY_PIN: '/api/verify-group-pin' },
      apiPost: async (url, body) => {
        assert.equal(url, '/api/verify-group-pin');
        payload = body;
        return { status: false, message: 'PIN salah.' };
      },
      syncPinInput: (node) => {
        node.parentElement.querySelectorAll().forEach((box, i) => {
          box.textContent = i < node.value.length ? '•' : '';
        });
      },
      showToast() {}, esc: (text) => text
    });
    let source = read(screen === 'groups' ? 'src/handlers/groups.js' : 'src/onboarding.js')
      .replace(/^import[\s\S]*?from ["'][^"']+["'];\s*/gm, '')
      .replace(/^export \{[^}]*\} from ["'][^"']+["'];/gm, '')
      .replaceAll('export const ', 'const ');
    source += screen === 'groups'
      ? '\npendingGroupId = "GRP-TEST"; globalThis.submit = submitGroupPin;'
      : '\nactive = { id: "GRP-TEST" }; globalThis.submit = submitPin;';
    vm.runInContext(source, context);
    await context.submit();
    assert.equal(payload.groupId, 'GRP-TEST');
    assert.equal(payload.pin, '0123');
    assert.equal(attributes.get('aria-invalid'), 'true');
    assert.ok(message.includes('PIN salah.'));
    assert.equal(input.value, '');
    payload = null;
    input.value = '12';
    await context.submit();
    assert.equal(payload, null, 'incomplete PIN must not reach the endpoint');
  });
}
