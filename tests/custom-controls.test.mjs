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
test('custom controls preserve labels, validation, dynamic state and keyboard selection', {
  skip: !existsSync(chrome) && 'Set CHROME_BIN to run browser regression tests',
}, async () => {
  const root = resolve(import.meta.dirname, '..');
  const server = createServer(async (req, res) => {
    try {
      const path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
      if (!path.startsWith(root + '/')) throw new Error('Invalid path');
      res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html');
      res.end(await readFile(path));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const profile = mkdtempSync(join(tmpdir(), 'finkas-controls-'));
  try {
    const { stdout } = await promisify(execFile)(chrome, [
      '--headless', '--no-sandbox', '--disable-gpu', `--user-data-dir=${profile}`,
      '--dump-dom', '--virtual-time-budget=3000',
      `http://127.0.0.1:${server.address().port}/tests/fixtures/custom-controls.html`,
    ], { timeout: 20000, maxBuffer: 1024 * 1024 });
    assert.match(stdout, /data-result="passed"/, stdout);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    rmSync(profile, { recursive: true, force: true });
  }
});
