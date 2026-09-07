import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import AsymmetricGrid from '../../components/AsymmetricGrid';

export default function Search() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [filterMode, setFilterMode] = useState(false);
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('2024');
  const [minRating, setMinRating] = useState('0');
  const [type, setType] = useState('movie');

  // Debounce keystrokes for text search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch results based on mode
  useEffect(() => {
    async function fetchResults() {
      setLoading(true);
      try {
        if (filterMode) {
          const params = new URLSearchParams();
          if (genre) params.append('with_genres', genre);
          if (year) {
            if (type === 'movie') params.append('primary_release_year', year);
            else params.append('first_air_date_year', year);
          }
          if (minRating > 0) params.append('vote_average.gte', minRating);
          
          const res = await api.tmdb.discover(type, params.toString());
          setTmdbResults(res.results || []);
        } else {
          if (!debouncedQuery.trim()) {
            setTmdbResults([]);
            return;
          }
          const res = await api.tmdb.search(debouncedQuery);
          setTmdbResults(res.results || res);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [debouncedQuery, filterMode, genre, year, minRating, type]);

  const genres = [
    { id: '', name: 'All Genres' },
    { id: '28', name: 'Action' },
    { id: '12', name: 'Adventure' },
    { id: '16', name: 'Animation' },
    { id: '35', name: 'Comedy' },
    { id: '80', name: 'Crime' },
    { id: '99', name: 'Documentary' },
    { id: '18', name: 'Drama' },
    { id: '10751', name: 'Family' },
    { id: '14', name: 'Fantasy' },
    { id: '36', name: 'History' },
    { id: '27', name: 'Horror' },
    { id: '10402', name: 'Music' },
    { id: '9648', name: 'Mystery' },
    { id: '10749', name: 'Romance' },
    { id: '878', name: 'Science Fiction' },
    { id: '53', name: 'Thriller' }
  ];

  return (
    <div className="container" style={{ paddingTop: '8rem', minHeight: '100vh', paddingBottom: '4rem', display: 'flex', gap: '2rem' }}>
      
      {/* Sidebar Filters */}
      <div style={{
        width: '300px',
        flexShrink: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '2rem',
        height: 'fit-content',
        position: 'sticky',
        top: '100px'
      }}>
        <h3 className="text-h2" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Filters</h3>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'Oswald, sans-serif' }}>
            <input 
              type="checkbox" 
              checked={filterMode} 
              onChange={(e) => {
                setFilterMode(e.target.checked);
                if (!e.target.checked) setQuery('');
              }}
              style={{ width: '1.2rem', height: '1.2rem' }}
            />
            ENABLE DISCOVER MODE
          </label>
          <p className="text-metadata" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
            Toggle to search by filters instead of title.
          </p>
        </div>

        {filterMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontFamily: 'Oswald, sans-serif' }}>TYPE</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              >
                <option value="movie">Movies</option>
                <option value="tv">TV Shows</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontFamily: 'Oswald, sans-serif' }}>GENRE</label>
              <select 
                value={genre} 
                onChange={(e) => setGenre(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              >
                {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontFamily: 'Oswald, sans-serif' }}>
                YEAR: {year}
              </label>
              <input 
                type="range" 
                min="1980" 
                max="2025" 
                value={year} 
                onChange={(e) => setYear(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontFamily: 'Oswald, sans-serif' }}>
                MIN RATING: {minRating}/10
              </label>
              <input 
                type="range" 
                min="0" 
                max="10" 
                step="0.5"
                value={minRating} 
                onChange={(e) => setMinRating(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: '4rem' }}>
          <input 
            type="text" 
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (filterMode) setFilterMode(false); // Auto switch back to text search
            }}
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
              padding: '1rem 0',
              opacity: filterMode ? 0.3 : 1,
              transition: 'opacity 0.3s'
            }}
          />
        </div>

        {loading ? (
          <p className="text-metadata">Loading results...</p>
        ) : tmdbResults.length > 0 ? (
          <section style={{ marginBottom: '6rem' }}>
            <h2 className="text-h2" style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
              {filterMode ? 'Discover Results' : 'Search Results'}
            </h2>
            <AsymmetricGrid items={tmdbResults} />
          </section>
        ) : (filterMode || debouncedQuery.trim()) ? (
          <p className="text-metadata">No results found.</p>
        ) : (
          <p className="text-metadata">Start typing or use the filters to discover content.</p>
        )}
      </div>
    </div>
  );
}
