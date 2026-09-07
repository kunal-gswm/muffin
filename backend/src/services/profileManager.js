import fs from 'node:fs';
import path from 'node:path';
import config from '../config.js';

const PROFILES_DIR = path.join(config.DATA_DIR, 'profiles');

if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

// Ensure at least a default profile exists
const defaultProfilePath = path.join(PROFILES_DIR, 'default.json');
if (!fs.existsSync(defaultProfilePath)) {
  saveProfile('default', { id: 'default', name: 'Default', avatar: null });
}

export function getProfiles() {
  try {
    const files = fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json'));
    return files.map(f => {
      const p = path.join(PROFILES_DIR, f);
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    });
  } catch (err) {
    console.error('[profileManager] Failed to read profiles:', err);
    return [];
  }
}

export function saveProfile(id, data) {
  try {
    const targetPath = path.join(PROFILES_DIR, `${id}.json`);
    const tempPath = targetPath + '.tmp';
    
    // Atomic write: write to temp file, then rename over the real one
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, targetPath);
    return true;
  } catch (err) {
    console.error('[profileManager] Failed to save profile atomically:', err);
    return false;
  }
}

export function deleteProfile(id) {
  try {
    if (id === 'default') return false; // Can't delete default
    const targetPath = path.join(PROFILES_DIR, `${id}.json`);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    return true;
  } catch (err) {
    console.error('[profileManager] Failed to delete profile:', err);
    return false;
  }
}
