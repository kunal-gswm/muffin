import fs from 'node:fs/promises';
import path from 'node:path';
import { getDb } from './db.js';

export async function scanLocalDirectory(dirPath, tmdbClient) {
  const db = await getDb();
  let results = { added: 0, errors: 0 };
  
  async function walk(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && /\.(mp4|mkv|avi|mov)$/i.test(entry.name)) {
          try {
            await processFile(fullPath, entry.name, tmdbClient, db);
            results.added++;
          } catch (e) {
            console.error(`Failed to process ${entry.name}:`, e);
            results.errors++;
          }
        }
      }
    } catch (e) {
      console.error(`Failed to read directory ${dir}:`, e);
    }
  }

  await walk(dirPath);
  return results;
}

async function processFile(fullPath, filename, tmdbClient, db) {
  // Very basic regex to try to find S01E01 pattern for TV shows
  const tvMatch = filename.match(/[sS](\d{1,2})[eExX](\d{1,2})/);
  
  let mediaType = tvMatch ? 'tv' : 'movie';
  let title = filename.replace(/\.[^/.]+$/, ""); // remove extension
  let yearMatch = title.match(/\(?(\d{4})\)?/);
  let year = yearMatch ? yearMatch[1] : null;
  
  // Clean up title
  if (tvMatch) {
    title = title.substring(0, tvMatch.index).replace(/[\.\_]/g, ' ').trim();
  } else if (yearMatch) {
    title = title.substring(0, yearMatch.index).replace(/[\.\_]/g, ' ').trim();
  } else {
    title = title.replace(/[\.\_]/g, ' ').trim();
  }

  // Search TMDB
  const query = encodeURIComponent(title);
  const searchUrl = `/search/${mediaType}?query=${query}${year ? `&year=${year}` : ''}`;
  
  const searchRes = await tmdbClient.tmdbFetch(searchUrl);
  if (searchRes && searchRes.results && searchRes.results.length > 0) {
    const tmdbId = searchRes.results[0].id.toString();
    
    await db.run(
      `INSERT OR REPLACE INTO local_media (file_path, tmdb_id, media_type, quality) 
       VALUES (?, ?, ?, ?)`,
      [fullPath, tmdbId, mediaType, 'Unknown']
    );
  }
}
