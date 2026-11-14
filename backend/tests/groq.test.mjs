import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateGroqAnswer, GroqError } from '../dist/groq.js';

const key = 'test-only-secret-that-must-not-leak';
const run = fetch => generateGroqAnswer(key, 'openai/gpt-oss-120b', 'Scientific context', '{}', { fetch });

test('Groq request authenticates only in the backend and uses supported completion parameters', async () => {
  const result = await run(async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(options.headers.Authorization, `Bearer ${key}`);
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'openai/gpt-oss-120b');
    assert.equal(body.max_completion_tokens, 500);
    assert.ok(!options.body.includes(key));
    return Response.json({ choices: [{ message: { content: '  Fixture answer  ' } }] });
  });
  assert.equal(result, 'Fixture answer');
});

for (const [status, code, httpStatus] of [[401, 'AI_AUTH_ERROR', 503], [403, 'AI_AUTH_ERROR', 503], [429, 'AI_RATE_LIMITED', 503], [404, 'AI_MODEL_UNAVAILABLE', 503], [500, 'AI_PROVIDER_ERROR', 502]]) {
  test(`Groq ${status} becomes a safe ${code} response`, async () => {
    await assert.rejects(run(async () => Response.json({ error: { message: key } }, { status, headers: { 'Retry-After': '17' } })), error => {
      assert.ok(error instanceof GroqError);
      assert.equal(error.code, code);
      assert.equal(error.status, httpStatus);
      assert.ok(!JSON.stringify(error).includes(key));
      assert.ok(!error.message.includes(key));
      if (status === 429) assert.equal(error.retryAfter, 17);
      return true;
    });
  });
}

test('Groq malformed JSON and network exceptions never expose raw provider errors', async () => {
  for (const fetch of [async () => new Response('not JSON'), async () => { throw new Error(key); }]) {
    await assert.rejects(run(fetch), error => error.code === 'AI_CONNECTION_ERROR' && !error.message.includes(key));
  }
});

test('Groq rejects an empty or non-text response', async () => {
  for (const content of ['', null, {}, '  ']) {
    await assert.rejects(run(async () => Response.json({ choices: [{ message: { content } }] })), { code: 'AI_EMPTY_RESPONSE' });
  }
});

test('Groq timeout actually aborts a pending request', async () => {
  let aborted = false;
  // Keep the test event loop alive because AbortSignal.timeout uses an unref timer.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    await assert.rejects(generateGroqAnswer(key, 'openai/gpt-oss-120b', '', '{}', {
      timeoutMs: 20,
      fetch: async (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => { aborted = true; reject(signal.reason); }, { once: true });
      }),
    }), { code: 'AI_TIMEOUT', status: 504 });
    assert.equal(aborted, true);
  } finally { clearInterval(keepAlive); }
});
