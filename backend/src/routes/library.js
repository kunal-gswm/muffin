// ── Library, History, and Progress Routes ──────────────────────────────────────
// Simple CRUD via JSON flat-file storage

import { Router } from 'express';
import { read, write } from '../utils/store.js';

export function createLibraryRouter() {
  const router = Router();
  const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // ── Library ─────────────────────────────────────────────────────────────────

  router.get('/', (req, res) => {
    res.json(read('library.json', {}));
  });

  router.put('/:id', (req, res) => {
    const { id } = req.params;
    const item = req.body;
    if (!item) return res.status(400).json({ error: 'Body required' });

    const lib = read('library.json', {});
    lib[id] = { ...item, savedAt: Date.now() };
    write('library.json', lib);
    res.json(lib[id]);
  });

  router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const lib = read('library.json', {});
    if (lib[id]) {
      delete lib[id];
      write('library.json', lib);
    }
    res.json({ success: true });
  });

  // ── History ─────────────────────────────────────────────────────────────────

  router.get('/history', (req, res) => {
    res.json(read('history.json', []));
  });

  router.post('/history', (req, res) => {
    const item = req.body; // { id, title, type, posterPath, ... }
    if (!item || !item.id) return res.status(400).json({ error: 'Invalid history item' });

    let history = read('history.json', []);
    // Remove existing entry for this id to bump it to the top
    history = history.filter((h) => String(h.id) !== String(item.id));
    history.unshift({ ...item, viewedAt: Date.now() });

    // Keep only the last 100 items
    if (history.length > 100) history = history.slice(0, 100);

    write('history.json', history);
    res.json({ success: true });
  });

  // ── Progress ────────────────────────────────────────────────────────────────

  // Returns progress object mapping id -> { episode, season, timestamp, percentage }
  router.get('/progress', (req, res) => {
    res.json(read('progress.json', {}));
  });

  router.get('/progress/:id', (req, res) => {
    const { id } = req.params;
    const prog = read('progress.json', {});
    res.json(prog[id] || null);
  });

  router.put('/progress/:id', (req, res) => {
    const { id } = req.params;
    const update = req.body; // e.g. { season: 1, episode: 2, timestamp: 15.5, percentage: 80 }
    if (!update) return res.status(400).json({ error: 'Body required' });

    const prog = read('progress.json', {});
    prog[id] = { ...prog[id], ...update, updatedAt: Date.now() };
    write('progress.json', prog);
    res.json(prog[id]);
  });

  return router;
}
