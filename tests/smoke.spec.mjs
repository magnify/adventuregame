#!/usr/bin/env node
// Smoke test: build the site, serve the real production bundle with
// `vite preview`, load it in headless Chromium, and check the loading
// overlay actually clears (i.e. src/game/app.js booted without throwing).
//
// This will fail until src/game/app.js exists and calls start() correctly —
// that's expected and correct, not a plumbing bug. What it proves in the
// meantime is that build, base path, static assets, and the harness itself
// all work.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VITE_BIN = path.join(ROOT, 'node_modules', '.bin', 'vite');

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}/three-suns/`;
const LOADING_TIMEOUT_MS = 180_000; // software WebGL is slow — be generous
const CHROMIUM_PATH = '/opt/pw-browsers/chromium';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))));
  });
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await sleep(200);
  }
  throw new Error(`preview server did not come up at ${url}`);
}

async function main() {
  console.log('building...');
  await run(VITE_BIN, ['build']);

  console.log('starting preview server...');
  // Spawn vite's own binary directly (no npx/npm wrapper) so killing this
  // one process actually stops the server — a wrapper process can exit
  // without taking its child with it and leaves the port held open.
  const preview = spawn(VITE_BIN, ['preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'inherit',
  });

  let browser;
  try {
    await waitForServer(BASE_URL, 30_000);

    browser = await chromium.launch({
      executablePath: CHROMIUM_PATH,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    const page = await browser.newPage({ viewport: { width: 480, height: 300 } });

    // Only uncaught exceptions fail the run — not console.error or failed
    // resource loads. The Google Fonts request in particular is allowed to
    // fail in a sandboxed/offline test environment without that meaning
    // anything is broken.
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    console.log(`opening ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    console.log('waiting for #loading.off (up to 180s)...');
    await page.waitForSelector('#loading.off', { timeout: LOADING_TIMEOUT_MS });

    if (pageErrors.length > 0) {
      throw new Error(`page errors during load:\n${pageErrors.map((e) => e.stack || e.message).join('\n')}`);
    }

    console.log('smoke test passed: loading overlay cleared with no page errors.');
  } finally {
    if (browser) await browser.close();
    preview.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error('smoke test failed:', err.message);
  process.exitCode = 1;
});
