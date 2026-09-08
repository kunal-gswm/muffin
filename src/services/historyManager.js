import { getDb } from './db.js';

const DEFAULT_PROFILE = 'default';

export async function getHistory(profileId = DEFAULT_PROFILE) {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT payload, last_updated 
      FROM watch_progress 
      WHERE profile_id = ? 
      ORDER BY last_updated DESC 
      LIMIT 100
    `, [profileId]);
    
    return rows.map(r => ({
      ...JSON.parse(r.payload),
      updatedAt: new Date(r.last_updated).getTime()
    }));
  } catch (err) {
    console.error('[historyManager] Failed to read from db:', err);
    return [];
  }
}

export async function updateProgress(payload, profileId = DEFAULT_PROFILE) {
  if (!payload.id || !payload.type) return;

  const db = await getDb();
  
  const isComplete = payload.duration > 0 && (payload.currentTime >= payload.duration * 0.95 || payload.duration - payload.currentTime <= 30);
  
  const season = payload.season || 0;
  const episode = payload.episode || 0;

  try {
    if (isComplete) {
      await db.run(`
        DELETE FROM watch_progress 
        WHERE profile_id = ? AND media_type = ? AND media_id = ? AND season = ? AND episode = ?
      `, [profileId, payload.type, String(payload.id), season, episode]);
      
      return { status: 'completed' };
    }

    await db.run(`
      INSERT INTO watch_progress (profile_id, media_type, media_id, season, episode, progress, duration, payload, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(profile_id, media_type, media_id, season, episode) DO UPDATE SET
        progress = excluded.progress,
        duration = excluded.duration,
        payload = excluded.payload,
        last_updated = CURRENT_TIMESTAMP
    `, [
      profileId, 
      payload.type, 
      String(payload.id), 
      season, 
      episode, 
      payload.currentTime, 
      payload.duration, 
      JSON.stringify(payload)
    ]);

    return { ...payload, updatedAt: Date.now() };
  } catch (err) {
    console.error('[historyManager] Failed to update progress:', err);
    return null;
  }
}

export async function getProgress(id, type, profileId = DEFAULT_PROFILE) {
  try {
    const db = await getDb();
    const row = await db.get(`
      SELECT payload 
      FROM watch_progress 
      WHERE profile_id = ? AND media_type = ? AND media_id = ? 
      ORDER BY last_updated DESC LIMIT 1
    `, [profileId, type, String(id)]);
    
    if (row) {
      return JSON.parse(row.payload);
    }
    return null;
  } catch (err) {
    console.error('[historyManager] Failed to get progress:', err);
    return null;
  }
}

export async function removeHistory(id, type, profileId = DEFAULT_PROFILE) {
  try {
    const db = await getDb();
    await db.run(`
      DELETE FROM watch_progress 
      WHERE profile_id = ? AND media_type = ? AND media_id = ?
    `, [profileId, type, String(id)]);
    return true;
  } catch (err) {
    console.error('[historyManager] Failed to remove history:', err);
    return false;
  }
}
