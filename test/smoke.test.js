import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';
import config from '../src/config.js';

// Only run if opt-in SMOKE=1 is provided
const SMOKE = process.env.SMOKE === '1';

if (!SMOKE) {
  describe.skip('smoke tests (run with SMOKE=1)', () => {});
  process.exit(0);
}

if (!config.TMDB_API_KEY) {
  console.error('TMDB_API_KEY is required for smoke tests.');
  process.exit(1);
}

let app, server, BASE;

before(() => {
  app = createApp(); // builds real services from config
  server = app.listen(0);
  BASE = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
});

describe('live TMDB proxy', () => {
  it('GET /api/tmdb/trending/movie returns results', async () => {
    const res = await fetch(`${BASE}/api/tmdb/trending/movie`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.results && body.results.length > 0);
  });

  it('GET /api/tmdb/movie/27205 (Inception) returns shaped response', async () => {
    const res = await fetch(`${BASE}/api/tmdb/movie/27205`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.title, 'Inception');
  });
});
