import { Router } from 'express';
import { getProfiles, saveProfile, deleteProfile } from '../services/profileManager.js';

export function createProfilesRouter() {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(getProfiles());
  });

  router.post('/', (req, res) => {
    const payload = req.body;
    if (!payload.id || !payload.name) {
      return res.status(400).json({ error: 'Missing id or name' });
    }
    const success = saveProfile(payload.id, payload);
    res.json({ success });
  });

  router.delete('/:id', (req, res) => {
    const success = deleteProfile(req.params.id);
    res.json({ success });
  });

  return router;
}
