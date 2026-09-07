// ── Player Source Configurations ──────────────────────────────────────────────
// Ported from Streambert's src/utils/api.js (PLAYER_SOURCES array)
// Static config — each source provides URL builders for embed pages.

export const PLAYER_SOURCES = [
  {
    id: 'videasy',
    label: 'Videasy',
    supportsProgress: true,
    colorParam: 'color',   // hex without # → e.g. 'e50914'
    langParam: null,
    params: { overlay: 'true' },
    movieUrl: (id) => `https://player.videasy.to/movie/${id}`,
    tvUrl: (id, season, ep) => `https://player.videasy.to/tv/${id}/${season}/${ep}`,
  },
  {
    id: 'vidsrc',
    label: 'VidSrc',
    supportsProgress: true,
    progressViaFrames: true,
    colorParam: null,
    langParam: 'ds_lang',  // ISO 639-1
    params: {},
    movieUrl: (id) => `https://vsembed.su/embed/movie/${id}`,
    tvUrl: (id, season, ep) => `https://vsembed.su/embed/tv/${id}/${season}/${ep}`,
  },
  {
    id: 'vidking',
    label: 'Vidking',
    supportsProgress: true,
    colorParam: 'color',
    langParam: null,
    params: { autoPlay: 'true' },
    movieUrl: (id) => `https://www.vidking.net/embed/movie/${id}`,
    tvUrl: (id, season, ep) => `https://www.vidking.net/embed/tv/${id}/${season}/${ep}`,
  },
];

/**
 * Find a source by its id.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getSourceById(id) {
  return PLAYER_SOURCES.find((s) => s.id === id);
}
