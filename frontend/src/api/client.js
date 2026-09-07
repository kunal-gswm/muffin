const BASE_URL = import.meta.env.DEV ? 'http://127.0.0.1:3939/api' : '/api';

/**
 * Basic fetch wrapper for the local API.
 * @param {string} endpoint - e.g. '/tmdb/trending/movie'
 * @param {RequestInit} [options]
 */
export async function fetchApi(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `API Error: ${response.status}`);
  }

  return response.json();
}

// ── Domain Specific Fetchers ──────────────────────────────────────────────────

export const api = {
  tmdb: {
    getTrending: (type = 'movie') => fetchApi(`/tmdb/trending/${type}`),
    getPopular: (type = 'movie') => fetchApi(`/tmdb/${type}/popular`),
    discover: (type = 'movie', params = '') => fetchApi(`/tmdb/discover/${type}?${params}`),
    getDetails: (type, id) => fetchApi(`/tmdb/${type}/${id}`),
    search: (query) => fetchApi(`/tmdb/search?q=${encodeURIComponent(query)}`),
    getTrailer: (type, id) => fetchApi(`/tmdb/${type}/${id}/videos`)
  },
  sources: {
    resolve: (type, id, season, episode) => {
      const path = type === 'movie' 
        ? `/sources/resolve/movie/${id}`
        : `/sources/resolve/tv/${id}/${season}/${episode}`;
      return fetchApi(path, { method: 'POST', body: JSON.stringify({ source: 'vidking' }) });
    },
    getEmbed: (type, id, season, episode, source = 'vidsrc') => {
      const path = type === 'movie'
        ? `/sources/embed/${source}/movie/${id}`
        : `/sources/embed/${source}/tv/${id}/${season}/${episode}`;
      return fetchApi(path);
    }
  },
  library: {
    get: () => fetchApi('/library'),
    add: (id, item) => fetchApi(`/library/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
    remove: (id) => fetchApi(`/library/${id}`, { method: 'DELETE' })
  },
  settings: {
    get: () => fetchApi('/settings'),
    update: (updates) => fetchApi('/settings', { method: 'POST', body: JSON.stringify(updates) }),
    selectFolder: () => fetchApi('/settings/select-folder', { method: 'POST' })
  },
  downloads: {
    list: () => fetchApi('/downloads'),
    start: (data) => fetchApi('/downloads', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id) => fetchApi(`/downloads/cancel/${id}`, { method: 'POST' }),
    delete: (id, deleteFile = false) => fetchApi(`/downloads/${id}?deleteFile=${deleteFile}`, { method: 'DELETE' }),
    checkBinary: () => fetchApi('/downloads/check-binary', { method: 'POST' })
  },
  anime: {
    getTrending: () => fetchApi('/anime/anilist/trending'),
    search: (query) => fetchApi(`/anime/anilist/search?q=${encodeURIComponent(query)}`),
    searchAllanime: (query) => fetchApi(`/anime/search?q=${encodeURIComponent(query)}`),
    getEpisodes: (allanimeId) => fetchApi(`/anime/episodes/${allanimeId}`),
    resolve: (allanimeId, episode, translationType) => fetchApi(`/anime/resolve/${allanimeId}/${episode}`, {
      method: 'POST',
      body: JSON.stringify({ translationType })
    }),
    getAnilist: (anilistId) => fetchApi(`/anime/anilist/${anilistId}`)
  },
  history: {
    get: () => fetchApi('/history'),
    getProgress: (type, id) => fetchApi(`/history/${type}/${id}`),
    save: (payload) => fetchApi('/history', { method: 'POST', body: JSON.stringify(payload) })
  },
  profiles: {
    get: () => fetchApi('/profiles'),
    save: (payload) => fetchApi('/profiles', { method: 'POST', body: JSON.stringify(payload) }),
    delete: (id) => fetchApi(`/profiles/${id}`, { method: 'DELETE' })
  }
};
