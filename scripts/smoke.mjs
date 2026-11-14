import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import http from 'node:http';

// With a directory, test the exact production artifact; with a URL, test Azure.
const target = process.argv[2];
assert.ok(target, 'Usage: node scripts/smoke.mjs <artifact-directory|https://host>');
const remote = /^https:\/\//.test(target);
const socketPath = process.argv.includes('--pipe')
  ? (process.platform === 'win32' ? `\\\\.\\pipe\\llamalab-smoke-${process.pid}` : `/tmp/llamalab-smoke-${process.pid}.sock`)
  : undefined;
assert.ok(!remote || !socketPath, 'Pipe mode is only for local artifact tests');
const request = socketPath ? (url) => new Promise((resolve, reject) => {
  const req = http.get({ socketPath, path: new URL(url).pathname + new URL(url).search }, res => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('error', reject);
    res.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers: res.headers })));
  });
  req.setTimeout(10000, () => req.destroy(new Error('Socket request timed out')));
  req.on('error', reject);
}) : fetch;
let child;
let logs = '';
let base = target.replace(/\/$/, '');
try {
  if (!remote) {
    const cwd = path.resolve(target);
    const config = await readFile(path.join(cwd, 'web.config'), 'utf8');
    assert.ok(config.startsWith('<?xml'), 'XML declaration must start at byte zero');
    assert.match(config, /path="run\.cjs"/);
    assert.match(config, /url="run\.cjs"/);
    for (const file of ['run.cjs', 'dist/server.js', 'public/index.html', 'package.json', 'package-lock.json']) {
      await readFile(path.join(cwd, file));
    }
    base = 'http://127.0.0.1:3199';
    child = spawn(process.execPath, ['run.cjs'], {
      cwd,
      env: { ...process.env, PORT: socketPath || '3199', SUPABASE_URL: '', SUPABASE_SECRET_KEY: '', IOT_INGEST_TOKEN: '', GROQ_API_KEY: '', GEMINI_API_KEY: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', data => { logs += data; });
    child.stderr.on('data', data => { logs += data; });
    child.on('error', error => { logs += error.message; });
  }
  let ready = false;
  for (let attempt = 0; attempt < (remote ? 36 : 40); attempt++) {
    if (child && child.exitCode !== null) throw new Error(`Startup exited: ${logs}`);
    try {
      const response = await request(`${base}/api/health`, { signal: AbortSignal.timeout(10000) });
      if (response.ok && (await response.json()).status === 'ok') { ready = true; break; }
    } catch { /* bounded cold-start retry */ }
    await delay(remote ? 5000 : 250);
  }
  assert.ok(ready, `Health check failed: ${logs}`);
  let html;
  for (const route of ['/', '/dashboard', '/simulacion']) {
    const response = await request(base + route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    const body = await response.text();
    assert.match(body, /id="root"/);
    if (html === undefined) html = body;
    else assert.equal(body, html, 'SPA fallback must serve the built application');
  }
  const assets = [...html.matchAll(/(?:src|href)="([^" ]+\.(?:js|css))"/g)].map(match => match[1]);
  assert.ok(assets.some(asset => asset.endsWith('.js')) && assets.some(asset => asset.endsWith('.css')));
  for (const asset of assets) {
    const response = await request(new URL(asset, base));
    assert.equal(response.status, 200, asset);
    assert.match(response.headers.get('content-type') || '', asset.endsWith('.css') ? /text\/css/ : /javascript/);
    assert.ok((await response.text()).length > 100, asset);
  }
  for (const [route, status] of [['/api/missing', 404], ['/api/nasa/search?q=x', 400]]) {
    const response = await request(base + route);
    assert.equal(response.status, status, route);
    assert.ok((await response.json()).error);
  }
  if (!remote) {
    const response = await request(`${base}/api/telemetry`);
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /Supabase/);
  }
  console.log(`PASS (${socketPath ? 'pipe/socket' : remote ? 'public HTTPS' : 'TCP'}): health, real SPA, frontend routes, JS/CSS assets and API error responses`);
} finally {
  if (child && child.exitCode === null) {
    child.kill();
    await new Promise(resolve => child.once('exit', resolve));
  }
}
