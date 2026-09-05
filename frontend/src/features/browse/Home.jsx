import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import AsymmetricGrid from '../../components/AsymmetricGrid';

export default function Home() {
  const [data, setData] = useState({
    continueWatching: [],
    trendingMovies: [],
    trendingTv: [],
    popularMovies: [],
    thrillerMovies: [],
    crimeMovies: [],
    mysteryTv: [],
    anime: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        let continueWatching = [];
        const storedProgress = localStorage.getItem('streambert_progress');
        if (storedProgress) {
          const parsed = JSON.parse(storedProgress);
          continueWatching = Object.values(parsed)
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 4)
            .map(p => ({
              id: p.id,
              title: p.title,
              poster_path: p.poster_path,
              media_type: p.media_type,
              progress: p.percentage
            }));
        }

        // Create a daily seed to rotate the page number for dynamic daily content
        const today = new Date();
        const dailySeed = today.getFullYear() * 1000 + today.getMonth() * 100 + today.getDate();
        const dynamicPage = (dailySeed % 10) + 1; // Rotates between page 1-10 every day

        const [
          movieRes, tvRes, animeRes,
          popularRes, thrillerRes, crimeRes, mysteryRes
        ] = await Promise.all([
          api.tmdb.getTrending('movie').catch(() => ({})), // The API client uses /trending/movie by default
          api.tmdb.getTrending('tv').catch(() => ({})),
          api.anime.getTrending().catch(() => []),
          api.tmdb.getPopular('movie').catch(() => ({})),
          api.tmdb.discover('movie', `with_genres=53&page=${dynamicPage}`).catch(() => ({})),
          api.tmdb.discover('movie', `with_genres=80&page=${dynamicPage}`).catch(() => ({})),
          api.tmdb.discover('tv', `with_genres=9648&page=${dynamicPage}`).catch(() => ({}))
        ]);
        
        let mappedAnime = [];
        if (animeRes && Array.isArray(animeRes)) {
          mappedAnime = animeRes.map(r => ({
            id: r.id,
            title: r.title?.english || r.title?.romaji || r.title?.native || 'Unknown',
            poster_path: r.coverImage?.large,
            media_type: 'anime'
          }));
        }

        setData({
          continueWatching,
          trendingMovies: movieRes.results || [],
          trendingTv: tvRes.results || [],
          popularMovies: popularRes.results || [],
          thrillerMovies: thrillerRes.results || [],
          crimeMovies: crimeRes.results || [],
          mysteryTv: mysteryRes.results || [],
          anime: mappedAnime
        });

      } catch (err) {
        console.error('Failed to load home data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const handleProgress = () => loadData();
    window.addEventListener('progress_updated', handleProgress);
    return () => window.removeEventListener('progress_updated', handleProgress);
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '10rem', minHeight: '100vh' }}>
        <h1 className="text-h1" style={{ opacity: 0.2 }}>LOADING...</h1>
      </div>
    );
  }

  // Helper to render a section
  const renderSection = (title, items, type = 'movie') => {
    if (!items || items.length === 0) return null;
    return (
      <section style={{ marginBottom: '6rem' }}>
        <h2 className="text-h2" style={{ marginBottom: '2rem' }}>{title}</h2>
        <AsymmetricGrid items={items.slice(0, 13)} type={type} />
      </section>
    );
  };

  return (
    <div className="container page-transition" style={{ paddingTop: '8rem', paddingBottom: '4rem' }}>
      
      {data.continueWatching.length > 0 && (
        <section style={{ marginBottom: '6rem' }}>
          <h2 className="text-h2" style={{ marginBottom: '2rem' }}>Continue Watching</h2>
          <AsymmetricGrid items={data.continueWatching} disableHero={true} />
        </section>
      )}

      {renderSection('Trending Films', data.trendingMovies, 'movie')}
      {renderSection('Trending Series', data.trendingTv, 'tv')}
      {renderSection('Famous & Popular', data.popularMovies, 'movie')}
      {renderSection('Heart-Pounding Thrillers', data.thrillerMovies, 'movie')}
      {renderSection('Gritty Crime', data.crimeMovies, 'movie')}
      {renderSection('Suspense & Mystery Series', data.mysteryTv, 'tv')}
      {renderSection('Anime', data.anime, 'anime')}

    </div>
  );
}
