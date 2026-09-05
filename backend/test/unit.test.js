import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';
import fs from 'node:fs';
import path from 'node:path';

// Mock TMDB client
const mockTmdb = {
  tmdbFetch: mock.fn(async (p) => {
    if (p.includes('/movie/27205')) return { id: 27205, title: 'Inception', genres: [{ id: 28 }] };
    if (p.includes('/trending/movie')) return { results: [{ id: 1, title: 'Test' }] };
    if (p.includes('/tv/episode_group/5ebaa7b5ad6e9d00224d4512')) return { groups: [{ order: 0, episodes: [1,2,3] }] };
    throw new Error(`Unmocked path: ${p}`);
  }),
  imgUrl: (p, s) => p ? `https://image.tmdb.org/t/p/${s}${p}` : null,
};

let app, server, BASE, testDataDir;

beforeEach(async () => {
  // Use a temporary data dir for tests to avoid corrupting real data
  testDataDir = path.resolve('./data-test-' + Math.random().toString(36).slice(2));
  process.env.DATA_DIR = testDataDir;

  app = createApp({ tmdbClient: mockTmdb });
  server = app.listen(0);
  BASE = `http://127.0.0.1:${server.address().port}`;
});

afterEach(() => {
  server.close();
  // Cleanup test data dir
  try { fs.rmSync(testDataDir, { recursive: true, force: true }); } catch {}
  delete process.env.DATA_DIR;
});

describe('TMDB proxy', () => {
  it('GET /api/tmdb/movie/:id returns shaped response', async () => {
    const res = await fetch(`${BASE}/api/tmdb/movie/27205`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.id, 27205);
    assert.equal(typeof body.title, 'string');
    assert.ok(Array.isArray(body.genres));
  });
});

describe('Player sources', () => {
  it('GET /api/sources/embed/videasy/movie/:id returns embed URL', async () => {
    const res = await fetch(`${BASE}/api/sources/embed/videasy/movie/27205`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.embedUrl.startsWith('https://player.videasy.to/'));
  });

  it('GET /api/sources/embed/invalid/movie/:id returns 404', async () => {
    const res = await fetch(`${BASE}/api/sources/embed/nonexistent/movie/27205`);
    assert.equal(res.status, 404);
  });
});

describe('Library CRUD', () => {
  it('PUT then GET persists and returns data', async () => {
    await fetch(`${BASE}/api/library/27205`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Inception', media_type: 'movie' }),
    });
    const res = await fetch(`${BASE}/api/library`);
    const body = await res.json();
    assert.equal(body['27205']?.title, 'Inception');
  });

  it('DELETE removes item', async () => {
    await fetch(`${BASE}/api/library/27205`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Inception' })
    });
    await fetch(`${BASE}/api/library/27205`, { method: 'DELETE' });
    const res = await fetch(`${BASE}/api/library`);
    const body = await res.json();
    assert.equal(body['27205'], undefined);
  });
});

describe('Subtitle SSRF protection', () => {
  it('rejects cloud metadata endpoint (private IP)', async () => {
    const res = await fetch(`${BASE}/api/subtitles/download?url=http://169.254.169.254/latest/meta-data/`);
    assert.equal(res.status, 403);
  });

  it('rejects loopback host (private IP gate)', async () => {
    const res = await fetch(`${BASE}/api/subtitles/download?url=http://localhost:8080/secret`);
    assert.equal(res.status, 403);
  });

  it('rejects non-allowlisted host with public IP (allowlist gate)', async () => {
    // Isolates allowlist check from private-IP check
    const res = await fetch(`${BASE}/api/subtitles/download?url=http://evil.com/subtitles.srt`);
    assert.equal(res.status, 403);
  });
});

describe('Anime feature flag', () => {
  it('returns 503 when disabled', async () => {
    const disabledApp = createApp({ tmdbClient: mockTmdb, enableAnime: false });
    const s = disabledApp.listen(0);
    const url = `http://127.0.0.1:${s.address().port}/api/anime/search?q=test`;
    const res = await fetch(url);
    assert.equal(res.status, 503);
    s.close();
  });
});
