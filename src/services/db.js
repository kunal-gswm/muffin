import path from 'node:path';
import fs from 'node:fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let dbPromise;

export async function initDb() {
  if (dbPromise) return dbPromise;
  
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const dbPath = path.join(dataDir, 'muffin.db');
  
  dbPromise = open({
    filename: dbPath,
    driver: sqlite3.Database
  }).then(async (db) => {
    console.log('[db] Initialized native sqlite3 database (async)');

    // Create Tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS watch_progress (
        profile_id TEXT NOT NULL,
        media_type TEXT NOT NULL,
        media_id TEXT NOT NULL,
        season INTEGER DEFAULT 0,
        episode INTEGER DEFAULT 0,
        progress REAL DEFAULT 0,
        duration REAL DEFAULT 0,
        payload TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (profile_id, media_type, media_id, season, episode)
      );

      CREATE TABLE IF NOT EXISTS favorites (
        profile_id TEXT NOT NULL,
        media_type TEXT NOT NULL,
        media_id TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (profile_id, media_type, media_id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        profile_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        PRIMARY KEY (profile_id, key)
      );

      CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        media_type TEXT NOT NULL,
        media_id TEXT NOT NULL,
        status TEXT NOT NULL,
        progress REAL DEFAULT 0,
        file_path TEXT
      );

      CREATE TABLE IF NOT EXISTS local_media (
        file_path TEXT PRIMARY KEY,
        tmdb_id TEXT NOT NULL,
        media_type TEXT NOT NULL,
        quality TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Indexes
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_watch_progress_profile_updated ON watch_progress(profile_id, last_updated DESC);
      CREATE INDEX IF NOT EXISTS idx_favorites_profile ON favorites(profile_id);
      CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
      CREATE INDEX IF NOT EXISTS idx_local_media_tmdb ON local_media(tmdb_id, media_type);
    `);

    return db;
  });

  return dbPromise;
}

export async function getDb() {
  if (!dbPromise) return initDb();
  return dbPromise;
}
