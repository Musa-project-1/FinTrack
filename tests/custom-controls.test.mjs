import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const chrome = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const execFileAsync = promisify(execFile);

const contentTypeFor = (filePath) => {
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.woff2')) return 'font/woff2';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'text/html; charset=utf-8';
};

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
  const server = createServer(async (req, res) => {
    try {
      const reqPath = new URL(req.url, 'http://localhost').pathname;
      const path = resolve(root, '.' + reqPath);
      if (!path.startsWith(root + '/')) throw new Error('Invalid path');
      res.setHeader('Content-Type', contentTypeFor(path));
      res.setHeader('Connection', 'close');
      res.end(await readFile(path));
    } catch {
      res.writeHead(404, { Connection: 'close' }).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { stdout } = await runDumpDom(
      `http://127.0.0.1:${server.address().port}/tests/fixtures/custom-controls.html`
    );
    assert.match(stdout, /data-result="passed"/, stdout);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
