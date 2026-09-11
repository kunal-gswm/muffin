import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import MetadataRow from '../../components/MetadataRow';
import MinimalPlayer from '../player/MinimalPlayer';
import AsymmetricGrid from '../../components/AsymmetricGrid';
import { useWatchlist } from '../../hooks/useWatchlist';
import { usePlaybackState } from '../../hooks/usePlaybackState';
import CustomSelect from '../../components/CustomSelect';
import { applyDynamicTheme, resetTheme } from '../../utils/ThemeEngine';

export default function TitleDetail() {
  const { type, id } = useParams();
  const [data, setData] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [streamData, setStreamData] = useState(null);

  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const inLibrary = isInWatchlist(id);

  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);

  const { progress, saveProgress, markOpened } = usePlaybackState(
    data ? { 
      id, 
      title: data.title || data.name, 
      poster_path: data.poster_path, 
      media_type: type 
    } : null,
    season,
    episode
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await api.tmdb.getDetails(type, id);
        setData(res);

        if (res.backdrop_path) {
          const themeUrl = `https://image.tmdb.org/t/p/w300${res.backdrop_path}`;
          applyDynamicTheme(themeUrl);
        }

        if (type === 'tv' && res.seasons) {
          const validSeasons = res.seasons.filter(s => s.season_number > 0);
          if (validSeasons.length > 0) {
            setSeason(validSeasons[0].season_number);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
    
    return () => {
      resetTheme();
    };
  }, [type, id]);

  const [isDownloading, setIsDownloading] = useState(false);

  const handlePlay = async () => {
    setIsResolving(true);
    try {
      // Revert to iframe embed for playback to bypass strict CORS policies on the raw .m3u8 streams
      const res = await api.sources.getEmbed(type, id, season, episode, 'vidking');
      if (res && res.embedUrl) {
        setStreamData({ url: res.embedUrl, title: data.title || data.name, isEmbed: !res.isLocal });
      } else {
        alert('No embed URL found: ' + (res?.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load embed: ' + err.message);
    } finally {
      setIsResolving(false);
    }
  };

  const [searchParams] = useSearchParams();
  const partyId = searchParams.get('party');
  const [activePartyId, setActivePartyId] = useState(partyId || null);

  const handleWatchParty = async () => {
    // Generate a random room ID
    const newRoomId = Math.random().toString(36).substring(2, 9);
    setActivePartyId(newRoomId);
    
    // Copy the invite link to clipboard
    const inviteLink = `${window.location.origin}${window.location.pathname}?party=${newRoomId}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      alert(`Watch Party Created!\n\nInvite link copied to clipboard:\n${inviteLink}\n\nSend this to a friend and click PLAY!`);
    } catch (e) {
      alert(`Watch Party Created!\n\nShare this link:\n${inviteLink}`);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await api.sources.resolve(type, id, season, episode);
      if (res && res.m3u8Url) {
        const titleText = (data.title || data.name);
        const name = `${titleText}${type === 'tv' ? ` S${season}E${episode}` : ''}`.trim();
        
        // Fetch user settings to get the download directory
        let outputDir = 'C:/Downloads'; // Fallback
        try {
          const settings = await api.settings.get();
          if (settings.DOWNLOAD_DIR) outputDir = settings.DOWNLOAD_DIR;
        } catch (e) {
          console.error('Failed to fetch settings, using fallback download dir', e);
        }

        await api.downloads.start({
          m3u8Url: res.m3u8Url,
          name,
          outputDir,
          tmdbId: id,
          mediaType: type,
          season: type === 'tv' ? season : undefined,
          episode: type === 'tv' ? episode : undefined,
          posterPath: data.poster_path
        });
        alert('Download started! Check the DOWNLOADS tab.');
      } else {
        alert('Failed to extract native stream for download: ' + (res?.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to start download: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLibraryToggle = () => {
    if (inLibrary) {
      removeFromWatchlist(id);
    } else {
      addToWatchlist({
        id,
        title: data.title || data.name,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        media_type: type,
      });
    }
  };

  if (!data) return null;

  const backdropUrl = data.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${data.backdrop_path}`
    : null;

  const title = data.title || data.name;
  const year = (data.release_date || data.first_air_date || '').split('-')[0];
  const runtime = data.runtime ? `${data.runtime} MIN` : (data.episode_run_time?.[0] ? `${data.episode_run_time[0]} MIN` : '');
  
  const validSeasons = type === 'tv' && data.seasons 
    ? data.seasons.filter(s => s.season_number > 0) 
    : [];
  const selectedSeasonObj = validSeasons.find(s => s.season_number === season);
  const episodeCount = selectedSeasonObj ? selectedSeasonObj.episode_count : 0;

  return (
    <div className="page-transition" style={{ width: '100vw', overflowX: 'hidden' }}>
      
      {/* Stream Player Overlay */}
      {streamData && (
        <MinimalPlayer 
          src={streamData.url} 
          title={streamData.title} 
          isEmbed={streamData.isEmbed}
          tmdbId={id}
          type={type}
          season={season}
          episode={episode}
          initialTime={progress?.currentTime || 0}
          partyId={activePartyId}
          onTimeUpdate={(currentTime, duration) => {
            saveProgress(currentTime, duration);
          }}
          hasNextEpisode={type === 'tv' && episode < episodeCount}
          onNextEpisode={() => {
            setStreamData(null);
            setEpisode(episode + 1);
            setTimeout(() => handlePlay(), 500);
          }}
          onClose={() => setStreamData(null)} 
        />
      )}
      {/* Hero Section */}
      <div style={{ position: 'relative', width: '100vw', height: '100vh', isolation: 'isolate' }}>
        {/* Full Bleed Backdrop */}
      {(backdropUrl || data.videos?.results) && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: -1,
          overflow: 'hidden'
        }}>
          {(() => {
            const trailer = data.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube') || 
                            data.videos?.results?.find(v => v.site === 'YouTube');
            
            if (trailer) {
              return (
                <iframe
                  src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=1&playlist=${trailer.key}`}
                  allow="autoplay; encrypted-media"
                  style={{
                    width: '100vw',
                    height: '56.25vw', /* 16:9 aspect ratio */
                    minHeight: '100vh',
                    minWidth: '177.77vh',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    border: 'none',
                    pointerEvents: 'none'
                  }}
                />
              );
            }
            
            return backdropUrl ? (
              <img 
                src={backdropUrl} 
                alt={title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 20%',
                  maxWidth: 'none',
                }}
              />
            ) : null;
          })()}
          
          {/* Hard gradient mask at the bottom third ONLY */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, var(--bg-primary) 0%, var(--bg-primary) 10%, transparent 40%)'
          }} />
        </div>
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
          textShadow: '0 2px 8px rgba(0,0,0,0.7), 0 0 30px rgba(0,0,0,0.5)',
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
        
        <div style={{ color: 'rgba(255,255,255,0.7)' }}>
          <MetadataRow 
            items={[
              year,
              runtime,
              data.genres?.map(g => g.name).join(', '),
              data.vote_average ? `${data.vote_average.toFixed(1)}/10` : null
            ]} 
          />
        </div>
        
        <p style={{
          marginTop: '1.5rem',
          maxWidth: '700px',
          fontSize: '1rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {data.overview}
        </p>

        {type === 'tv' && validSeasons.length > 0 && (
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', zIndex: 50 }}>
            <CustomSelect
              value={season}
              onChange={(val) => {
                setSeason(Number(val));
                setEpisode(1);
              }}
              options={validSeasons.map(s => ({
                value: s.season_number,
                label: s.name
              }))}
              minWidth="180px"
            />

            <CustomSelect
              value={episode}
              onChange={(val) => setEpisode(Number(val))}
              options={Array.from({ length: episodeCount }, (_, i) => ({
                value: i + 1,
                label: `Episode ${i + 1}`
              }))}
              minWidth="150px"
            />
          </div>
        )}

        <div style={{ marginTop: type === 'tv' ? '1.5rem' : '3rem', display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                border: '2px solid transparent',
                height: '100%'
              }}
            >
              {isResolving ? 'Extracting (~10s)...' : (progress?.currentTime > 0 ? 'RESUME' : 'PLAY')}
            </button>
            {progress?.currentTime > 0 && progress?.duration && (
              <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', width: '100%', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', backgroundColor: 'var(--text-primary)', width: `${(progress.currentTime / progress.duration) * 100}%` }} />
              </div>
            )}
          </div>
          
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
          
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            style={{
              padding: '1rem 2rem',
              backgroundColor: isDownloading ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontFamily: 'Oswald, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: isDownloading ? 'wait' : 'pointer',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => {
              if (!isDownloading) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }
            }}
            onMouseOut={(e) => {
              if (!isDownloading) {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
          >
            {isDownloading ? 'EXTRACTING...' : 'DOWNLOAD'}
          </button>
          
          <button 
            onClick={handleWatchParty}
            style={{
              padding: '1rem 2rem',
              backgroundColor: activePartyId ? 'var(--text-primary)' : 'var(--bg-secondary)',
              color: activePartyId ? 'var(--bg-primary)' : 'var(--text-primary)',
              fontFamily: 'Oswald, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {activePartyId ? 'PARTY ACTIVE' : 'WATCH PARTY'}
          </button>
        </div>
      </div>
      
      {/* End Hero Section */}
      </div>

      <div style={{ backgroundColor: 'var(--bg-primary)', position: 'relative', zIndex: 1, paddingTop: '2rem' }}>
        {/* ── Cast & Crew ── */}
      {data.credits?.cast && data.credits.cast.length > 0 && (
        <section className="container" style={{ marginTop: '4rem', paddingBottom: '2rem' }}>
          <h2 className="text-h2" style={{ marginBottom: '2rem' }}>Cast</h2>
          <div style={{
            display: 'flex',
            gap: '2rem',
            overflowX: 'auto',
            paddingBottom: '1rem',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--text-metadata) transparent'
          }}>
            {data.credits.cast.slice(0, 15).map(actor => (
              <div key={actor.id} style={{ flex: '0 0 auto', width: '120px', textAlign: 'center' }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-secondary)',
                  marginBottom: '1rem'
                }}>
                  {actor.profile_path ? (
                    <img 
                      src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} 
                      alt={actor.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-metadata)', fontSize: '2rem' }}>
                      ?
                    </div>
                  )}
                </div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600 }}>{actor.name}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{actor.character}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Recommendations ── */}
      {data.recommendations?.results && data.recommendations.results.length > 0 && (
        <section className="container" style={{ marginTop: '4rem', paddingBottom: '6rem' }}>
          <h2 className="text-h2" style={{ marginBottom: '2rem' }}>You May Also Like</h2>
          <AsymmetricGrid items={data.recommendations.results.slice(0, 13)} type={type} disableHero={true} />
        </section>
      )}
      </div>

    </div>
  );
}
