import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import AsymmetricGrid from '../../components/AsymmetricGrid';
import ContinueWatchingRow from '../../components/ContinueWatchingRow';
import { applyDynamicTheme, resetTheme } from '../../utils/ThemeEngine';

export default function Home() {
  const [data, setData] = useState({
    continueWatching: [],
    recommendations: [],
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
        let recommendations = [];
        try {
          const res = await api.history.get();
          if (res && Array.isArray(res)) {
            continueWatching = res.slice(0, 4).map(p => ({
              id: p.id,
              title: p.title,
              poster_path: p.posterPath,
              backdrop_path: p.backdropPath,
              media_type: p.type,
              progress: p.duration > 0 ? (p.currentTime / p.duration) * 100 : 0
            }));
            
            if (continueWatching.length > 0) {
              const lastWatched = continueWatching[0];
              try {
                const recRes = await api.tmdb.getDetails(lastWatched.media_type, `${lastWatched.id}/recommendations`);
                if (recRes && recRes.results) {
                  recommendations = recRes.results.slice(0, 10).map(r => ({
                    ...r,
                    media_type: lastWatched.media_type
                  }));
                }
              } catch (recErr) {
                console.error('Failed to fetch recommendations', recErr);
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch history', e);
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
          recommendations,
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
    
    return () => {
      window.removeEventListener('progress_updated', handleProgress);
      resetTheme();
    };
  }, []);

  // Update theme when data changes
  useEffect(() => {
    if (data.continueWatching[0]?.backdrop_path || data.continueWatching[0]?.poster_path) {
      applyDynamicTheme(`https://image.tmdb.org/t/p/w300${data.continueWatching[0].backdrop_path || data.continueWatching[0].poster_path}`);
    } else if (data.trendingMovies[0]?.backdrop_path || data.trendingMovies[0]?.poster_path) {
      applyDynamicTheme(`https://image.tmdb.org/t/p/w300${data.trendingMovies[0].backdrop_path || data.trendingMovies[0].poster_path}`);
    }
  }, [data.continueWatching, data.trendingMovies]);

  if (loading) {
    return (
      <div className="container page-transition" style={{ paddingTop: '8rem', paddingBottom: '4rem' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <section key={i} style={{ marginBottom: '6rem' }}>
            <div style={{ 
              width: '250px', 
              height: '3rem', 
              backgroundColor: 'rgba(255,255,255,0.05)', 
              borderRadius: '8px', 
              marginBottom: '2rem' 
            }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.2rem', height: '280px' }}>
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '16px',
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                    animation: 'shimmer 1.5s infinite linear',
                  }} />
                </div>
              ))}
            </div>
          </section>
        ))}
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  // Helper to render a section
  const renderSection = (title, items, type = 'movie') => {
    if (!items || items.length === 0) return null;
    return (
      <section style={{ marginBottom: '6rem' }}>
        <h2 className="text-h2" style={{ marginBottom: '2rem' }}>{title}</h2>
        <AsymmetricGrid items={items} type={type} />
      </section>
    );
  };

  return (
    <div className="page-transition">
      <div className="container" style={{ paddingTop: '8rem', paddingBottom: '4rem' }}>
        
        {data.continueWatching.length > 0 && (
          <section style={{ marginBottom: '6rem' }}>
            <h2 className="text-h2" style={{ marginBottom: '1.5rem' }}>Jump Back In</h2>
            <ContinueWatchingRow items={data.continueWatching} />
          </section>
        )}

        {data.recommendations.length > 0 && data.continueWatching.length > 0 && (
          renderSection(
            `Because you watched ${data.continueWatching[0].title}`, 
            data.recommendations, 
            data.continueWatching[0].media_type
          )
        )}

        {renderSection('Trending Films', data.trendingMovies, 'movie')}
        {renderSection('Trending Series', data.trendingTv, 'tv')}
        {renderSection('Famous & Popular', data.popularMovies, 'movie')}
        {renderSection('Heart-Pounding Thrillers', data.thrillerMovies, 'movie')}
        {renderSection('Gritty Crime', data.crimeMovies, 'movie')}
        {renderSection('Suspense & Mystery Series', data.mysteryTv, 'tv')}
      </div>
    </div>
  );
}
