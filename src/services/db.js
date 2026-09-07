import path from 'node:path';
import fs from 'node:fs';

class MockDatabase {
  constructor(dbPath) {
    this.path = dbPath.replace('.db', '.json');
    this.table = [];
    if (fs.existsSync(this.path)) {
      try { this.table = JSON.parse(fs.readFileSync(this.path, 'utf8')); } catch (e) {}
    }
  }

  save() {
    fs.writeFileSync(this.path, JSON.stringify(this.table, null, 2), 'utf8');
  }

  prepare(sql) {
    return {
      all: (...args) => {
        if (sql.includes('SELECT payload, last_updated')) {
          const profileId = args[0];
          return this.table
            .filter(r => r.profile_id === profileId)
            .sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated))
            .slice(0, 100);
        }
        return [];
      },
      get: (...args) => {
        if (sql.includes('SELECT payload')) {
          const [profileId, type, id] = args;
          const match = this.table
            .filter(r => r.profile_id === profileId && r.media_type === type && r.media_id === String(id))
            .sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated))[0];
          return match || undefined;
        }
        return undefined;
      },
      run: (...args) => {
        if (sql.includes('DELETE FROM')) {
          const isComplex = args.length === 5;
          if (isComplex) {
            const [profileId, type, id, season, episode] = args;
            this.table = this.table.filter(r => !(r.profile_id === profileId && r.media_type === type && r.media_id === String(id) && r.season === season && r.episode === episode));
          } else {
            const [profileId, type, id] = args;
            this.table = this.table.filter(r => !(r.profile_id === profileId && r.media_type === type && r.media_id === String(id)));
          }
          this.save();
          return { changes: 1 };
        }
        if (sql.includes('INSERT INTO')) {
          const [profile_id, media_type, media_id, season, episode, progress, duration, payload] = args;
          const existing = this.table.find(r => r.profile_id === profile_id && r.media_type === media_type && r.media_id === String(media_id) && r.season === season && r.episode === episode);
          const now = new Date().toISOString();
          if (existing) {
            existing.progress = progress;
            existing.duration = duration;
            existing.payload = payload;
            existing.last_updated = now;
          } else {
            this.table.push({ profile_id, media_type, media_id: String(media_id), season, episode, progress, duration, payload, last_updated: now });
          }
          this.save();
          return { changes: 1 };
        }
        return { changes: 0 };
      }
    };
  }

  exec(sql) {
    // Mock implementation for table creation
    return this;
  }

  pragma(sql) {
    return this;
  }
}

let db;

export function initDb() {
  if (db) return db;
  try {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const dbPath = path.join(dataDir, 'muffin.db');
    db = new MockDatabase(dbPath);
    console.log('[db] Initialized pure-JS mock SQLite database to bypass native ABI crash on Windows');
  } catch (err) {
    console.error('[db] Initialization failed:', err);
    throw err;
  }
  return db;
}

export function getDb() {
  if (!db) return initDb();
  return db;
}
