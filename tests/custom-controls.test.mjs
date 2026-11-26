import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { createServer } from 'vite';

const chrome = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const execFileAsync = promisify(execFile);

/** Launch headless Chrome to dump DOM with CI-safe flags; retries once on SIGTERM timeout. */
async function runDumpDom(url, attempts = 2) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const profile = mkdtempSync(join(tmpdir(), 'finkas-controls-'));
    try {
      return await execFileAsync(chrome, [
        '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
        '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
        '--disable-extensions', '--disable-sync', '--disable-component-update',
        '--disable-default-apps', '--mute-audio', '--password-store=basic',
        `--user-data-dir=${profile}`, '--dump-dom', '--virtual-time-budget=3000', url,
      ], { timeout: 30000, maxBuffer: 1024 * 1024 });
    } catch (err) {
      const isTimeoutKill = Boolean(err?.killed && err?.signal === 'SIGTERM');
      if (!isTimeoutKill || attempt === attempts) throw err;
    } finally {
      rmSync(profile, { recursive: true, force: true });
    }
  }
}

test('custom controls preserve labels, validation, dynamic state and keyboard selection', {
  skip: !existsSync(chrome) && 'Set CHROME_BIN to run browser regression tests',
}, async () => {
  const root = resolve(import.meta.dirname, '..');
  const server = await createServer({
    root,
    server: { host: '127.0.0.1', port: 0, hmr: false },
    logLevel: 'silent',
  });
  await server.listen();
  try {
    const addr = server.httpServer.address();
    const { stdout } = await runDumpDom(
      `http://127.0.0.1:${addr.port}/tests/fixtures/custom-controls.html`
    );
    assert.match(stdout, /data-result="passed"/, stdout);
  } finally {
    await server.close();
  }
});
