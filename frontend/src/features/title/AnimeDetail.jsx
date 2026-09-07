import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import MinimalPlayer from '../player/MinimalPlayer';

function MetadataRow({ items }) {
  return (
    <div style={{
      display: 'flex',
      gap: '1.5rem',
      color: 'var(--text-metadata)',
      fontFamily: 'Oswald, sans-serif',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontSize: '1rem',
      fontWeight: 500
    }}>
      {items.filter(Boolean).map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {item}
          {i < items.length - 1 && <span style={{ opacity: 0.3 }}>•</span>}
        </span>
      ))}
    </div>
  );
}

import { useWatchlist } from '../../hooks/useWatchlist';
import { usePlaybackState } from '../../hooks/usePlaybackState';

export default function AnimeDetail() {
  const { id } = useParams();
  const [anilistData, setAnilistData] = useState(null);
  const [allanimeId, setAllanimeId] = useState(null);
  const [episodesData, setEpisodesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const inLibrary = isInWatchlist(id);

  const [translationType, setTranslationType] = useState('sub');
  const [episode, setEpisode] = useState('');
  
  const { progress, saveProgress, markOpened } = usePlaybackState(
    anilistData ? { 
      id, 
      title: anilistData.title.english || anilistData.title.romaji || anilistData.title.native, 
      coverImage: anilistData.coverImage, 
      media_type: 'anime' 
    } : null,
    1,
    episode
  );

  const [isResolving, setIsResolving] = useState(false);
  const [streamData, setStreamData] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const anilistRes = await api.anime.getAnilist(id);
        setAnilistData(anilistRes);

        if (!anilistRes) {
          throw new Error('Anime not found on AniList.');
        }

        const titleQuery = anilistRes.title.romaji || anilistRes.title.english;
        const searchRes = await api.anime.searchAllanime(titleQuery);
        
        const allanimeMatch = searchRes?.results?.[0];
        if (!allanimeMatch) {
          throw new Error('This anime is not currently available for streaming.');
        }

        const targetAllanimeId = allanimeMatch._id;
        setAllanimeId(targetAllanimeId);

        const epRes = await api.anime.getEpisodes(targetAllanimeId);
        setEpisodesData(epRes);
        
        if (epRes && epRes.availableEpisodesDetail) {
          const types = Object.keys(epRes.availableEpisodesDetail);
          const initialType = types.includes('sub') ? 'sub' : types[0];
          if (initialType) {
            setTranslationType(initialType);
            const eps = epRes.availableEpisodesDetail[initialType];
            if (eps && eps.length > 0) {
              setEpisode(eps[0]);
            }
          }
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handlePlay = async () => {
    alert('Anime Streaming is Coming Soon!');
  };

  const handleLibraryToggle = () => {
    if (inLibrary) {
      removeFromWatchlist(id);
    } else {
      addToWatchlist({
        id,
        title: anilistData.title.english || anilistData.title.romaji || anilistData.title.native,
        poster_path: anilistData.coverImage?.large,
        backdrop_path: anilistData.bannerImage,
        media_type: 'anime',
      });
    }
  };

  if (loading) return <div className="container" style={{ paddingTop: '8rem' }}><p className="text-metadata">Loading anime data...</p></div>;
  if (error) return <div className="container" style={{ paddingTop: '8rem' }}><p className="text-metadata" style={{ color: 'red' }}>{error}</p></div>;
  if (!anilistData) return null;

  const title = anilistData.title.english || anilistData.title.romaji || anilistData.title.native;
  const description = anilistData.description ? anilistData.description.replace(/<[^>]*>?/gm, '') : 'No description available.';
  
  const availableTypes = episodesData?.availableEpisodesDetail ? Object.keys(episodesData.availableEpisodesDetail) : [];
  const availableEpisodes = episodesData?.availableEpisodesDetail && episodesData.availableEpisodesDetail[translationType]
    ? [...episodesData.availableEpisodesDetail[translationType]].sort((a, b) => {
        const numA = parseFloat(a.replace(/[^0-9.]/g, ''));
        const numB = parseFloat(b.replace(/[^0-9.]/g, ''));
        return numA - numB;
      })
    : [];

  return (
    <div className="page-transition" style={{ position: 'relative', width: '100vw', minHeight: '100vh', isolation: 'isolate' }}>
      
      {/* Stream Player Overlay */}
      {streamData && (
        <MinimalPlayer 
          src={streamData.url} 
          sources={streamData.sources}
          defaultSource={streamData.defaultSource}
          title={streamData.title} 
          isEmbed={streamData.isEmbed}
          initialTime={progress?.currentTime || 0}
          onTimeUpdate={(currentTime, duration) => saveProgress(currentTime, duration)}
          onClose={() => setStreamData(null)} 
        />
      )}

      {/* Banner Background */}
      {anilistData.bannerImage && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          backgroundImage: `url(${anilistData.bannerImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          opacity: 0.3,
          zIndex: -1,
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
        }} />
      )}

      {/* Content anchored to the bottom left */}
      <div 
        className="container"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: '4rem',
        }}
      >
        <h1 
          className="text-hero"
          style={{ 
            marginBottom: '1.5rem',
            maxWidth: '1200px'
          }}
        >
          {title}
        </h1>
        
        <MetadataRow items={[
          'Anime', 
          anilistData.format,
          anilistData.status,
          anilistData.averageScore ? `${anilistData.averageScore}% Score` : null,
          availableEpisodes.length > 0 ? `${availableEpisodes.length} Episodes` : null
        ]} />

        <p className="text-metadata" style={{ 
          marginTop: '1.5rem', 
          maxWidth: '800px', 
          lineHeight: 1.6,
          color: 'var(--text-secondary)'
        }}>
          {description}
        </p>

        {availableTypes.length > 0 && (
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select 
              value={translationType}
              onChange={(e) => {
                const newType = e.target.value;
                setTranslationType(newType);
                const eps = episodesData.availableEpisodesDetail[newType];
                if (eps && eps.length > 0) {
                  if (!eps.includes(episode)) {
                    setEpisode(eps[0]);
                  }
                }
              }}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--text-metadata)',
                padding: '0.5rem 1rem',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '1.1rem',
                outline: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {availableTypes.map(t => (
                <option key={t} value={t} style={{ color: '#000' }}>
                  {t}
                </option>
              ))}
            </select>

            <select 
              value={episode}
              onChange={(e) => setEpisode(e.target.value)}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--text-metadata)',
                padding: '0.5rem 1rem',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '1.1rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {availableEpisodes.map(ep => (
                <option key={ep} value={ep} style={{ color: '#000' }}>
                  Episode {ep}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          <button 
            onClick={handlePlay}
            disabled={isResolving}
            style={{
              padding: '1rem 3rem',
              backgroundColor: isResolving ? 'var(--text-metadata)' : 'var(--text-primary)',
              color: 'var(--bg-primary)',
              fontFamily: 'Oswald, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: isResolving ? 'wait' : 'pointer',
              border: '2px solid transparent'
            }}
          >
            {isResolving ? 'Resolving...' : 'Play'}
          </button>

          <button 
            onClick={handleLibraryToggle}
            style={{
              padding: '1rem 2rem',
              backgroundColor: inLibrary ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.5)',
              color: 'var(--text-primary)',
              fontFamily: 'Oswald, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              border: inLibrary ? '2px solid rgba(255, 255, 255, 0.5)' : '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = inLibrary ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.5)';
              e.currentTarget.style.borderColor = inLibrary ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)';
            }}
          >
            {inLibrary ? '❤️ SAVED' : '🤍 WATCHLIST'}
          </button>
        </div>
      </div>
    </div>
  );
}
