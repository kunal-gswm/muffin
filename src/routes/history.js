import { Router } from 'express';
import { getHistory, updateProgress, getProgress, removeHistory } from '../services/historyManager.js';

export function createHistoryRouter() {
  const router = Router();

  // GET /api/history - get all history (for continue watching row)
  router.get('/', (req, res) => {
    const history = getHistory();
    res.json(history);
  });

  // GET /api/history/:type/:id - get progress for a specific title
  router.get('/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const progress = getProgress(id, type);
    res.json(progress || {});
  });

  // POST /api/history - save progress
  router.post('/', (req, res) => {
    const payload = req.body;
    
    // validate required fields
    if (!payload.id || !payload.type || typeof payload.currentTime !== 'number' || typeof payload.duration !== 'number') {
      return res.status(400).json({ error: 'Missing required fields: id, type, currentTime, duration' });
    }

    const record = updateProgress(payload);
    res.json(record);
  });

  // DELETE /api/history/:type/:id - remove from continue watching
  router.delete('/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const success = removeHistory(id, type);
    res.json({ success });
  });

  return router;
}
