// ── Episode Mappings ──────────────────────────────────────────────────────────
// Ported from Streambert's src/utils/episodeMappings.js
// Maps TMDB absolute numbering or alternative groups to source numbering.

export const EPISODE_GROUP_IDS = {
  37854: '5ebaa7b5ad6e9d00224d4512', // One Piece
  37239: '5ebae656363ae1001e3895e5', // Fairy Tail
  31911: '5ebae64f1ceaf00021b332bc', // Fullmetal Alchemist: Brotherhood
  46260: '5ebaa6cda2a3a500201c10d3', // Naruto
  31910: '5ebaa70fa2a3a500221c97a8', // Naruto Shippuden
  45253: '5ebae9491ceaf0001f5dc7b6', // Hunter x Hunter
  35968: '5ebaa6a56f0653001e2338fa', // Bleach
  33253: '5ebae5ec863f96001ed28a7f', // Gintama
  33045: '5ebae5f3964ee70020d2a939', // Death Note
  32024: '5ebae68d712ce5001ff2061e', // Code Geass
  45293: '5ebaa838a2a3a500221c9a63', // JoJo's Bizarre Adventure
  60554: '5ebaa864a2a3a5001f1c79a2', // Haikyuu!!
  65336: '5ebaa8746f0653001f236043', // My Hero Academia
  62235: '5ebaa896ad6e9d001f4d36e7', // Attack on Titan
  80986: '5ebaa8c0ad6e9d00224d4834', // Demon Slayer
  85937: '5ebaa8c66f0653001f2360cd', // Jujutsu Kaisen
};

/**
 * Translates a TMDB season/episode into an alternative group ordering
 * if a mapping exists for the given tmdbId.
 *
 * @param {string|number} tmdbId
 * @param {number} season
 * @param {number} episode
 * @param {{ tmdbFetch: Function }} tmdbClient
 * @returns {Promise<{ season: number, episode: number } | null>}
 */
export async function applyEpisodeGroupMapping(tmdbId, season, episode, tmdbClient) {
  const groupId = EPISODE_GROUP_IDS[tmdbId];
  if (!groupId) return null;

  try {
    const groupData = await tmdbClient.tmdbFetch(`/tv/episode_group/${groupId}`);
    if (!groupData || !groupData.groups) return null;

    let overallEpisode = 0;
    for (const group of groupData.groups) {
      if (group.order + 1 === season) {
        if (episode <= group.episodes.length) {
          return {
            season: 1, // Many anime stream sources use absolute numbering under season 1
            episode: overallEpisode + episode,
          };
        }
      }
      overallEpisode += group.episodes.length;
    }
  } catch {
    return null;
  }
  return null;
}
