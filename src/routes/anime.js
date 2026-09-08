// ── Anime Routes (Feature-Flagged) ────────────────────────────────────────────

import { Router } from 'express';
import * as anime from '../services/animeResolver.js';

/**
 * @param {{ enabled: boolean }} options
 */
export function createAnimeRouter({ enabled = true } = {}) {
  const router = Router();
  const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // Feature flag guard — all routes return 503 when disabled
  if (!enabled) {
    router.all('/*', (req, res) => {
      res.status(503).json({ error: 'Anime resolver disabled. Set ENABLE_ANIME=true to enable.' });
    });
    return router;
  }

  // GET /api/anime/search?q=...
  router.get('/search', asyncHandler(async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'query parameter "q" is required' });

    const results = await anime.searchAnime(q);
    if (results === null) {
      return res.status(502).json({ error: 'AllAnime search failed', sources: [] });
    }
    res.json({ results });
  }));

  // GET /api/anime/episodes/:allanimeId
  router.get('/episodes/:allanimeId', asyncHandler(async (req, res) => {
    const show = await anime.getEpisodes(req.params.allanimeId);
    if (!show) {
      return res.status(404).json({ error: 'Show not found or AllAnime unreachable' });
    }
    res.json(show);
  }));

  // POST /api/anime/resolve/:allanimeId/:episode
  router.post('/resolve/:allanimeId/:episode', asyncHandler(async (req, res) => {
    const { allanimeId, episode } = req.params;
    const translationType = req.body?.translationType || 'sub';

    const sources = await anime.resolveEpisode(allanimeId, episode, translationType);
    if (!sources.length) {
      return res.json({ sources: [], error: 'resolution_failed' });
    }
    res.json({ sources });
  }));

  // --- AniList Caching & Deduplication ---
  const anilistCache = new Map();
  const anilistDeduplicator = new Map();

  async function fetchAnilist(cacheKey, query, variables, isDynamic) {
    const now = Date.now();
    const cached = anilistCache.get(cacheKey);

    if (cached) {
      if (now < cached.staleAt) {
        return cached.data;
      } else if (now < cached.expiresAt) {
        if (!anilistDeduplicator.has(cacheKey)) {
          anilistDeduplicator.set(cacheKey, doAnilistFetch(cacheKey, query, variables, isDynamic).finally(() => anilistDeduplicator.delete(cacheKey)));
        }
        return cached.data;
      }
    }

    if (anilistDeduplicator.has(cacheKey)) {
      return anilistDeduplicator.get(cacheKey);
    }

    const fetchPromise = doAnilistFetch(cacheKey, query, variables, isDynamic);
    anilistDeduplicator.set(cacheKey, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      anilistDeduplicator.delete(cacheKey);
    }
  }

  async function doAnilistFetch(cacheKey, query, variables, isDynamic) {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    
    if (!res.ok) throw new Error('AniList fetch failed');
    
    const data = await res.json();
    
    const staleTime = isDynamic ? 10 * 60 * 1000 : 30 * 60 * 1000;
    const expireTime = isDynamic ? 30 * 60 * 1000 : 2 * 60 * 60 * 1000;
    
    anilistCache.set(cacheKey, {
      data,
      staleAt: Date.now() + staleTime,
      expiresAt: Date.now() + expireTime
    });

    if (anilistCache.size > 80) {
      const now = Date.now();
      for (const [k, v] of anilistCache) {
        if (now >= v.expiresAt) anilistCache.delete(k);
      }
    }
    
    return data;
  }
  // ---------------------------------------

  // GET /api/anime/anilist/trending
  router.get('/anilist/trending', asyncHandler(async (req, res) => {
    try {
      const query = `query {
        Page(page: 1, perPage: 20) {
          media(type: ANIME, sort: TRENDING_DESC) {
            id
            title { romaji english native }
            coverImage { large }
            averageScore
          }
        }
      }`;
      const data = await fetchAnilist('trending', query, {}, false);
      res.json(data?.data?.Page?.media || []);
    } catch {
      res.status(502).json({ error: 'AniList unreachable' });
    }
  }));

  // GET /api/anime/anilist/search?q=...
  router.get('/anilist/search', asyncHandler(async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'q is required' });
    try {
      const query = `query($search: String) {
        Page(page: 1, perPage: 20) {
          media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            id
            title { romaji english native }
            coverImage { large }
            averageScore
          }
        }
      }`;
      const data = await fetchAnilist(`search:${q}`, query, { search: q }, true);
      res.json(data?.data?.Page?.media || []);
    } catch {
      res.status(502).json({ error: 'AniList unreachable' });
    }
  }));

  // GET /api/anime/anilist/:anilistId — fetch AniList metadata
  router.get('/anilist/:anilistId', asyncHandler(async (req, res) => {
    const { anilistId } = req.params;
    try {
      const query = `query($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title { romaji english native }
          description
          coverImage { large }
          bannerImage
          genres
          averageScore
          episodes
        }
      }`;
      const data = await fetchAnilist(`details:${anilistId}`, query, { id: parseInt(anilistId, 10) }, false);
      res.json(data?.data?.Media || null);
    } catch {
      res.status(502).json({ error: 'AniList unreachable' });
    }
  }));

  return router;
}
