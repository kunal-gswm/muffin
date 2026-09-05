import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import AsymmetricGrid from '../../components/AsymmetricGrid';

export default function Anime() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await api.anime.search(query);
        // data is directly the array of media objects from AniList
        if (data && Array.isArray(data)) {
          const mapped = data.map(r => ({
            id: r.id,
            title: r.title?.english || r.title?.romaji || r.title?.native || 'Unknown',
            poster_path: r.coverImage?.large,
            media_type: 'anime'
          }));
          setResults(mapped);
        }
      } catch (err) {
        console.error('Anime search failed', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="container" style={{ paddingTop: '8rem', minHeight: '100vh', paddingBottom: '4rem' }}>
      <h1 
        className="text-hero"
        style={{ 
          marginBottom: '2rem',
          fontSize: '4rem'
        }}
      >
        ANIME
      </h1>
      
      <input 
        type="text" 
        placeholder="Search for an anime..." 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          maxWidth: '800px',
          backgroundColor: 'transparent',
          border: 'none',
          borderBottom: '2px solid var(--text-primary)',
          color: 'var(--text-primary)',
          fontFamily: 'Oswald, sans-serif',
          fontSize: '3rem',
          padding: '1rem 0',
          outline: 'none',
          marginBottom: '4rem'
        }}
        autoFocus
      />

      {loading && <p className="text-metadata">Searching...</p>}
      
      {!loading && results.length > 0 && (
        <AsymmetricGrid items={results} />
      )}

      {!loading && query.trim() && results.length === 0 && (
        <p className="text-metadata">No results found.</p>
      )}
    </div>
  );
}
