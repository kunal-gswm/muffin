// ── TMDB Proxy Routes ─────────────────────────────────────────────────────────
// Proxies TMDB API requests through the server-side cache.

import { Router } from 'express';

/**
 * @param {{ tmdbFetch: Function, imgUrl: Function }} tmdbClient
 */
export function createTmdbRouter(tmdbClient) {
  const router = Router();

  // Helper: wrap async route handlers
  const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // GET /api/tmdb/trending/:type — type = 'movie' or 'tv'
  router.get('/trending/:type', asyncHandler(async (req, res) => {
    const { type } = req.params;
    if (type !== 'movie' && type !== 'tv') {
      return res.status(400).json({ error: 'type must be "movie" or "tv"' });
    }
    const page = req.query.page || '1';
    const lang = req.query.lang || 'en-US';
    const data = await tmdbClient.tmdbFetch(`/trending/${type}/week?page=${page}`, lang);
    res.json(data);
  }));

  // GET /api/tmdb/search — ?q=...&type=movie|tv|multi
  router.get('/search', asyncHandler(async (req, res) => {
    const { q, type = 'multi', page = '1' } = req.query;
    if (!q) return res.status(400).json({ error: 'query parameter "q" is required' });
    const lang = req.query.lang || 'en-US';
    const data = await tmdbClient.tmdbFetch(`/search/${type}?query=${encodeURIComponent(q)}&page=${page}`, lang);
    res.json(data);
  }));

  // GET /api/tmdb/movie/:id
  router.get('/movie/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lang = req.query.lang || 'en-US';
    const data = await tmdbClient.tmdbFetch(
      `/movie/${id}?append_to_response=credits,videos,similar,recommendations`,
      lang
    );
    res.json(data);
  }));

  // GET /api/tmdb/tv/:id
  router.get('/tv/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lang = req.query.lang || 'en-US';
    const data = await tmdbClient.tmdbFetch(
      `/tv/${id}?append_to_response=credits,videos,similar,recommendations,external_ids`,
      lang
    );
    res.json(data);
  }));

  // GET /api/tmdb/tv/:id/season/:num
  router.get('/tv/:id/season/:num', asyncHandler(async (req, res) => {
    const { id, num } = req.params;
    const lang = req.query.lang || 'en-US';
    const data = await tmdbClient.tmdbFetch(`/tv/${id}/season/${num}`, lang);
    res.json(data);
  }));

  // GET /api/tmdb/tv/:id/episode_groups
  router.get('/tv/:id/episode_groups', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await tmdbClient.tmdbFetch(`/tv/${id}/episode_groups`);
    res.json(data);
  }));

  // GET /api/tmdb/tv/episode_group/:groupId
  router.get('/tv/episode_group/:groupId', asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const data = await tmdbClient.tmdbFetch(`/tv/episode_group/${groupId}`);
    res.json(data);
  }));

  // Catch-all: proxy any other TMDB path
  router.get('/*', asyncHandler(async (req, res) => {
    // req.params[0] is everything after /api/tmdb/
    const tmdbPath = '/' + req.params[0];
    // Forward any query params
    const qs = new URLSearchParams(req.query).toString();
    const fullPath = qs ? `${tmdbPath}?${qs}` : tmdbPath;
    const lang = req.query.lang || req.query.language || 'en-US';
    const data = await tmdbClient.tmdbFetch(fullPath, lang);
    res.json(data);
  }));

  return router;
}
