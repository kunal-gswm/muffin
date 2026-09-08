import { Router } from 'express';
import { getHistory, updateProgress, getProgress, removeHistory } from '../services/historyManager.js';
import { scrobble } from '../services/traktClient.js';

export function createHistoryRouter() {
  const router = Router();
  const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // GET /api/history - get all history (for continue watching row)
  router.get('/', asyncHandler(async (req, res) => {
    const history = await getHistory();
    res.json(history);
  }));

  // GET /api/history/:type/:id - get progress for a specific title
  router.get('/:type/:id', asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const progress = await getProgress(id, type);
    res.json(progress || {});
  }));

  // POST /api/history - save progress
  router.post('/', asyncHandler(async (req, res) => {
    const payload = req.body;
    
    // validate required fields
    if (!payload.id || !payload.type || typeof payload.currentTime !== 'number' || typeof payload.duration !== 'number') {
      return res.status(400).json({ error: 'Missing required fields: id, type, currentTime, duration' });
    }

    const record = await updateProgress(payload);
    
    // Scrobble to Trakt if duration > 0
    if (payload.duration > 0) {
      const progressPercent = (payload.currentTime / payload.duration) * 100;
      scrobble({
        title: payload.title,
        type: payload.type,
        season: payload.season,
        episode: payload.episode,
        progress: progressPercent
      }).catch(err => console.error('[Trakt] Scrobble failed', err));
    }

    res.json(record);
  }));

  // DELETE /api/history/:type/:id - remove from continue watching
  router.delete('/:type/:id', asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const success = await removeHistory(id, type);
    res.json({ success });
  }));

  return router;
}
