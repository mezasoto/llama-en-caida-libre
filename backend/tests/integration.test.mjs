import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const scenario = { question: 'microgravity combustion', gravityG: 0.01, oxygenPercent: 21, temperatureC: 30, airflowMps: 0.5, ventilationPercent: 75 };
async function start(configured) {
  const child = spawn(process.execPath, ['--import', './tests/upstreams.mjs', 'dist/server.js'], {
    cwd, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '3218', SUPABASE_URL: configured ? 'https://contract-test.supabase.co' : '', SUPABASE_SECRET_KEY: configured ? 'test-only-not-a-real-secret' : '', IOT_INGEST_TOKEN: configured ? 'test-only-ingest-token' : '', GROQ_API_KEY: configured ? 'test-only-not-a-real-key' : '', GEMINI_API_KEY: '' },
  });
  let logs = '';
  child.stdout.on('data', chunk => { logs += chunk; });
  child.stderr.on('data', chunk => { logs += chunk; });
  const stop = async () => { if (child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); } };
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error(logs);
    if (logs.includes('LlamaLab iniciado correctamente')) return stop;
    await delay(100);
  }
  await stop(); throw new Error(`Startup timeout: ${logs}`);
}
const request = (path, body, headers = {}) => fetch(`http://127.0.0.1:3218${path}`, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('Express contracts with isolated upstream fixtures, not live services', async t => {
  const stop = await start(true);
  try {
    await t.test('health distinguishes configured provider', async () => {
      const r = await request('/api/health'); assert.equal(r.status, 200);
      const data = await r.json(); assert.equal(data.status, 'ok'); assert.equal(data.aiProvider, 'groq'); assert.equal(data.supabaseConfigured, true);
    });
    await t.test('NASA search transforms citation metadata and links', async () => {
      const r = await request('/api/nasa/search?q=FLEX'); assert.equal(r.status, 200);
      const { data } = await r.json(); assert.equal(data[0].year, '2013'); assert.deepEqual(data[0].authors, ['Test author']); assert.equal(data[0].href, 'https://ntrs.nasa.gov/citations/20130014061');
    });
    await t.test('NASA upstream failure is not a fake successful search', async () => { assert.equal((await request('/api/nasa/search?q=upstream-error')).status, 502); });
    await t.test('telemetry read uses Supabase contract', async () => {
      const r = await request('/api/telemetry'); assert.equal(r.status, 200); assert.equal((await r.json()).data[0].temperature_c, 24.5);
    });
    await t.test('database error is reported', async () => { assert.equal((await request('/api/telemetry?device_id=database-error')).status, 500); });
    await t.test('ingestion rejects unauthenticated writes', async () => { assert.equal((await request('/api/telemetry', {})).status, 401); });
    await t.test('ingestion rejects invalid data', async () => { assert.equal((await request('/api/telemetry', { temperature_c: -200 }, { 'x-ingest-token': 'test-only-ingest-token' })).status, 400); });
    await t.test('ingestion inserts a validated reading', async () => {
      const row = { device_id: 'esp32-contract-test', temperature_c: 24.5, smoke_ppm: 120, flame_detected: false };
      const r = await request('/api/telemetry', row, { 'x-ingest-token': 'test-only-ingest-token' });
      assert.equal(r.status, 201); assert.equal((await r.json()).data.device_id, row.device_id);
    });
    await t.test('AI uses all controls and trusted server-side telemetry', async () => {
      const r = await request('/api/insights', { ...scenario, telemetry: [{ device_id: 'untrusted-browser-value' }] });
      assert.equal(r.status, 200); const data = await r.json(); assert.match(data.answer, /Test fixture answer/); assert.equal(data.sources.length, 2); assert.equal(data.modelIsQualitative, true);
    });
    await t.test('AI reports provider errors', async () => { assert.equal((await request('/api/insights', { ...scenario, question: 'microgravity upstream-error' })).status, 502); });
    for (const [key, value] of [['temperatureC', 46], ['airflowMps', -1], ['ventilationPercent', 101], ['oxygenPercent', '21']]) {
      await t.test(`AI rejects invalid ${key}`, async () => { assert.equal((await request('/api/insights', { ...scenario, [key]: value })).status, 400); });
    }
    await t.test('AI rejects off-topic questions', async () => { assert.equal((await request('/api/insights', { ...scenario, question: 'receta de pastel' })).status, 422); });
    await t.test('malformed JSON returns 400 instead of a server error', async () => {
      const r = await fetch('http://127.0.0.1:3218/api/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
      assert.equal(r.status, 400); assert.match((await r.json()).error, /JSON/);
    });
    await t.test('oversized JSON returns 413', async () => { assert.equal((await request('/api/insights', { text: 'x'.repeat(110000) })).status, 413); });
  } finally { await stop(); }
  const stopUnconfigured = await start(false);
  try {
    await t.test('missing credentials remain explicitly unavailable', async () => {
      const health = await (await request('/api/health')).json(); assert.equal(health.supabaseConfigured, false); assert.equal(health.aiConfigured, false);
      assert.equal((await request('/api/telemetry')).status, 503);
      assert.equal((await request('/api/telemetry', {})).status, 503);
      assert.equal((await request('/api/insights', scenario)).status, 503);
    });
  } finally { await stopUnconfigured(); }
});
