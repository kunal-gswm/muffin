// ── Mock Trakt.tv Client ──────────────────────────────────────────────────────
// This simulates integration with the Trakt.tv API.

let isAuthenticated = false;
let userToken = null;

export function authenticate(token) {
  isAuthenticated = true;
  userToken = token;
  console.log('[Trakt] Authenticated with token:', token);
}

export function logout() {
  isAuthenticated = false;
  userToken = null;
  console.log('[Trakt] Logged out.');
}

export function getStatus() {
  return { isAuthenticated };
}

/**
 * Scrobble a movie or episode to Trakt.tv
 * @param {object} payload 
 * @param {string} payload.title 
 * @param {string} payload.type - 'movie' | 'tv'
 * @param {number} [payload.season]
 * @param {number} [payload.episode]
 * @param {number} payload.progress - 0 to 100
 */
export async function scrobble(payload) {
  if (!isAuthenticated) return;
  
  // Simulate network delay
  await new Promise(r => setTimeout(r, 500));
  
  const mediaStr = payload.type === 'movie' 
    ? `Movie: ${payload.title}` 
    : `TV Show: ${payload.title} S${payload.season}E${payload.episode}`;
    
  if (payload.progress >= 95) {
    console.log(`[Trakt] 🎬 Scrobble complete: ${mediaStr}`);
  } else {
    console.log(`[Trakt] ⏳ Progress update (${payload.progress.toFixed(1)}%): ${mediaStr}`);
  }
}
