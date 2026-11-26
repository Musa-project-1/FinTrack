/**
 * @file tests/helpers/vitest-node-test.ts
 * Thin `node:test` compatibility adapter for running migrated UI `.test.mjs` suites
 * directly inside Vitest (with live Vite + Svelte compilation, zero pre-built lib blobs).
 */
import {
  test as vitestTest,
  describe,
  beforeAll as before,
  afterAll as after,
  beforeEach as vitestBeforeEach,
  afterEach as vitestAfterEach,
  onTestFinished,
  vi,
} from 'vitest';

interface MockCall {
  arguments: unknown[];
  result: unknown;
  error: unknown;
  this: unknown;
}

function makeMockFn<T extends (...args: any[]) => any>(
  impl?: T,
  restore?: () => void,
) {
  const calls: MockCall[] = [];
  const fn = function (this: unknown, ...args: unknown[]) {
    const record: MockCall = { arguments: args, result: undefined, error: undefined, this: this };
    calls.push(record);
    if (!impl) return undefined;
    try {
      const res = impl.apply(this, args);
      record.result = res;
      return res;
    } catch (err) {
      record.error = err;
      throw err;
    }
  };
  Object.defineProperty(fn, 'mock', {
    value: {
      calls,
      callCount: () => calls.length,
      resetCalls: () => { calls.length = 0; },
      restore: () => { restore?.(); },
    },
  });
  return fn;
}

function createTestContext() {
  let timersActive = false;

  const mock = {
    fn(impl?: (...args: any[]) => any) {
      return makeMockFn(impl);
    },
    method(obj: Record<string, any>, prop: string | symbol, impl?: (...args: any[]) => any) {
      const hadOwn = Object.prototype.hasOwnProperty.call(obj, prop);
      const origDesc = Object.getOwnPropertyDescriptor(obj, prop);
      const origFn = typeof obj[prop as any] === 'function' ? obj[prop as any] : undefined;
      const restore = () => {
        if (hadOwn && origDesc) {
          Object.defineProperty(obj, prop, origDesc);
        } else {
          delete obj[prop as any];
        }
      };
      const wrapped = makeMockFn(impl ?? origFn, restore);
      Object.defineProperty(obj, prop, {
        configurable: true,
        writable: true,
        enumerable: origDesc ? origDesc.enumerable : true,
        value: wrapped,
      });
      onTestFinished(restore);
      return wrapped;
    },
    timers: {
      enable(opts?: { apis?: string[]; now?: number | Date }) {
        timersActive = true;
        vi.useFakeTimers({
          toFake: (opts?.apis as any) ?? ['setTimeout', 'setInterval', 'Date'],
          now: opts?.now,
        });
        onTestFinished(() => {
          if (timersActive) {
            timersActive = false;
            vi.useRealTimers();
          }
        });
      },
      tick(ms: number) {
        vi.advanceTimersByTime(ms);
      },
      setTime(ms: number | Date) {
        vi.setSystemTime(ms);
      },
      reset() {
        if (timersActive) {
          timersActive = false;
          vi.useRealTimers();
        }
      },
    },
  };

  return {
    after(fn: () => unknown) {
      onTestFinished(async () => {
        await fn();
      });
    },
    mock,
    diagnostic() {},
  };
}

type TestFn = (t: ReturnType<typeof createTestContext>) => unknown;

function beforeEach(fn: TestFn) {
  vitestBeforeEach(async () => {
    await fn(createTestContext());
  });
}

function afterEach(fn: TestFn) {
  vitestAfterEach(async () => {
    await fn(createTestContext());
  });
}

function test(name: string, optsOrFn?: Record<string, unknown> | TestFn, maybeFn?: TestFn) {
  const fn = typeof optsOrFn === 'function' ? optsOrFn : maybeFn;
  const opts = typeof optsOrFn === 'object' && optsOrFn ? optsOrFn : {};
  if (!fn) return;
  if (opts.skip) {
    vitestTest.skip(name, () => {});
    return;
  }
  const timeout = typeof opts.timeout === 'number' ? opts.timeout : undefined;
  vitestTest(name, { timeout }, async () => {
    const ctx = createTestContext();
    await fn(ctx);
  });
}

test.skip = (name: string) => vitestTest.skip(name, () => {});
test.only = (name: string, fn: TestFn) => vitestTest.only(name, async () => fn(createTestContext()));
test.before = before;
test.after = after;
test.beforeEach = beforeEach;
test.afterEach = afterEach;
test.describe = describe;

export { test, describe, before, after, beforeEach, afterEach };
export default test;
