import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import AsymmetricGrid from '../../components/AsymmetricGrid';

export default function Search() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState([]);
  const [animeResults, setAnimeResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounce keystrokes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setTmdbResults([]);
      setAnimeResults([]);
      return;
    }

    async function searchUniversal() {
      setLoading(true);
      try {
        const [tmdbRes, animeRes] = await Promise.all([
          api.tmdb.search(debouncedQuery).catch(() => ({ results: [] })),
          api.anime.search(debouncedQuery).catch(() => [])
        ]);
        
        setTmdbResults(tmdbRes.results || tmdbRes); 
        
        if (animeRes && Array.isArray(animeRes)) {
          const mappedAnime = animeRes.map(r => ({
            id: r.id,
            title: r.title?.english || r.title?.romaji || r.title?.native || 'Unknown',
            poster_path: r.coverImage?.large,
            media_type: 'anime'
          }));
          setAnimeResults(mappedAnime);
        } else {
          setAnimeResults([]);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }

    searchUniversal();
  }, [debouncedQuery]);

  return (
    <div className="container" style={{ paddingTop: '8rem', minHeight: '100vh', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '4rem' }}>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH TITLES..."
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: '2px solid var(--text-primary)',
            color: 'var(--text-primary)',
            fontFamily: 'Oswald, sans-serif',
            fontSize: '4rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            outline: 'none',
            padding: '1rem 0'
          }}
          autoFocus
        />
      </div>

      {loading ? (
        <p className="text-metadata">Searching universal catalog...</p>
      ) : (tmdbResults.length > 0 || animeResults.length > 0) ? (
        <div>
          {tmdbResults.length > 0 && (
            <section style={{ marginBottom: '6rem' }}>
              <h2 className="text-h2" style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>Live Action</h2>
              <AsymmetricGrid items={tmdbResults} />
            </section>
          )}
          {animeResults.length > 0 && (
            <section style={{ marginBottom: '6rem' }}>
              <h2 className="text-h2" style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>Anime</h2>
              <AsymmetricGrid items={animeResults} />
            </section>
          )}
        </div>
      ) : debouncedQuery.trim() ? (
        <p className="text-metadata">No results found for "{debouncedQuery}"</p>
      ) : (
        <p className="text-metadata">Start typing to search across all databases</p>
      )}
    </div>
  );
}
