// Test-only HTTP contract fixtures. Never loaded by the application or deploy artifact.
import assert from 'node:assert/strict';
const nativeFetch = globalThis.fetch;
const reading = { id: 1, device_id: 'esp32-contract-test', temperature_c: 24.5, smoke_ppm: 120, flame_detected: false, created_at: '2026-11-14T00:00:00Z' };
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (url.hostname === '127.0.0.1') return nativeFetch(input, options);
  if (url.hostname === 'contract-test.supabase.co') {
    assert.equal(url.pathname, '/rest/v1/telemetry');
    if (options.method === 'POST') {
      const row = JSON.parse(options.body);
      return Response.json({ ...reading, ...row }, { status: 201 });
    }
    if (url.searchParams.get('device_id') === 'eq.database-error') {
      return Response.json({ message: 'test database unavailable', code: 'TEST' }, { status: 503 });
    }
    return Response.json([reading]);
  }
  if (url.hostname === 'ntrs.nasa.gov') {
    if (url.searchParams.get('q') === 'upstream-error') return new Response('', { status: 503 });
    assert.equal(url.searchParams.get('rows'), '10');
    return Response.json({ results: [{ id: 20130014061, title: 'NASA contract fixture', abstract: 'Fixture only', publications: [{ publicationDate: '2013-01-01' }], authorAffiliations: [{ meta: { author: { name: 'Test author' } } }] }] });
  }
  if (url.hostname === 'api.groq.com') {
    assert.ok(options.signal, 'AI request must have a timeout');
    const payload = JSON.parse(options.body);
    const context = JSON.parse(payload.messages[1].content);
    if (context.question.includes('upstream-error')) return Response.json({ error: { message: 'test provider unavailable' } }, { status: 503 });
    assert.equal(context.scenario.temperature_c, 30);
    assert.equal(context.scenario.airflow_mps, 0.5);
    assert.equal(context.scenario.ventilation_percent, 75);
    assert.equal(context.recentWokwiTelemetry[0].device_id, reading.device_id, 'Use server-side telemetry');
    return Response.json({ choices: [{ message: { content: 'Test fixture answer, not a live model result.' } }] });
  }
  throw new Error(`Unexpected external destination in isolated test: ${url.hostname}`);
};
