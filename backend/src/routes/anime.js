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

  // GET /api/anime/anilist/trending
  router.get('/anilist/trending', asyncHandler(async (req, res) => {
    try {
      const anilistRes = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query {
            Page(page: 1, perPage: 20) {
              media(type: ANIME, sort: TRENDING_DESC) {
                id
                title { romaji english native }
                coverImage { large }
                averageScore
              }
            }
          }`
        })
      });
      const data = await anilistRes.json();
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
      const anilistRes = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query($search: String) {
            Page(page: 1, perPage: 20) {
              media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                id
                title { romaji english native }
                coverImage { large }
                averageScore
              }
            }
          }`,
          variables: { search: q }
        })
      });
      const data = await anilistRes.json();
      res.json(data?.data?.Page?.media || []);
    } catch {
      res.status(502).json({ error: 'AniList unreachable' });
    }
  }));

  // GET /api/anime/anilist/:anilistId — fetch AniList metadata
  router.get('/anilist/:anilistId', asyncHandler(async (req, res) => {
    const { anilistId } = req.params;
    try {
      const anilistRes = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query($id: Int) {
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
          }`,
          variables: { id: parseInt(anilistId, 10) },
        }),
      });
      const data = await anilistRes.json();
      res.json(data?.data?.Media || null);
    } catch {
      res.status(502).json({ error: 'AniList unreachable' });
    }
  }));

  return router;
}
