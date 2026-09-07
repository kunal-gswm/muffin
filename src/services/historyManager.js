import { getDb } from './db.js';

const DEFAULT_PROFILE = 'default';

export function getHistory(profileId = DEFAULT_PROFILE) {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT payload, last_updated 
      FROM watch_progress 
      WHERE profile_id = ? 
      ORDER BY last_updated DESC 
      LIMIT 100
    `).all(profileId);
    
    return rows.map(r => ({
      ...JSON.parse(r.payload),
      updatedAt: new Date(r.last_updated).getTime()
    }));
  } catch (err) {
    console.error('[historyManager] Failed to read from db:', err);
    return [];
  }
}

export function updateProgress(payload, profileId = DEFAULT_PROFILE) {
  if (!payload.id || !payload.type) return;

  const db = getDb();
  
  // If title is more than 95% complete or within 30s of the end, remove it from Continue Watching
  const isComplete = payload.duration > 0 && (payload.currentTime >= payload.duration * 0.95 || payload.duration - payload.currentTime <= 30);
  
  const season = payload.season || 0;
  const episode = payload.episode || 0;

  try {
    if (isComplete) {
      db.prepare(`
        DELETE FROM watch_progress 
        WHERE profile_id = ? AND media_type = ? AND media_id = ? AND season = ? AND episode = ?
      `).run(profileId, payload.type, String(payload.id), season, episode);
      
      return { status: 'completed' };
    }

    db.prepare(`
      INSERT INTO watch_progress (profile_id, media_type, media_id, season, episode, progress, duration, payload, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(profile_id, media_type, media_id, season, episode) DO UPDATE SET
        progress = excluded.progress,
        duration = excluded.duration,
        payload = excluded.payload,
        last_updated = CURRENT_TIMESTAMP
    `).run(
      profileId, 
      payload.type, 
      String(payload.id), 
      season, 
      episode, 
      payload.currentTime, 
      payload.duration, 
      JSON.stringify(payload)
    );

    return { ...payload, updatedAt: Date.now() };
  } catch (err) {
    console.error('[historyManager] Failed to update progress:', err);
    return null;
  }
}

export function getProgress(id, type, profileId = DEFAULT_PROFILE) {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT payload 
      FROM watch_progress 
      WHERE profile_id = ? AND media_type = ? AND media_id = ? 
      ORDER BY last_updated DESC LIMIT 1
    `).get(profileId, type, String(id));
    
    if (row) {
      return JSON.parse(row.payload);
    }
    return null;
  } catch (err) {
    console.error('[historyManager] Failed to get progress:', err);
    return null;
  }
}

export function removeHistory(id, type, profileId = DEFAULT_PROFILE) {
  try {
    const db = getDb();
    db.prepare(`
      DELETE FROM watch_progress 
      WHERE profile_id = ? AND media_type = ? AND media_id = ?
    `).run(profileId, type, String(id));
    return true;
  } catch (err) {
    console.error('[historyManager] Failed to remove history:', err);
    return false;
  }
}
