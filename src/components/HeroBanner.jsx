import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { sound } from '../utils/SoundManager';

export default function HeroBanner({ item, type = 'movie' }) {
  const [trailerKey, setTrailerKey] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const navigate = useNavigate();
  const videoTimeoutRef = useRef(null);

  useEffect(() => {
    if (!item || !item.id) return;

    let isMounted = true;
    
    // Reset state for new item
    setShowVideo(false);
    setTrailerKey(null);
    clearTimeout(videoTimeoutRef.current);

    async function fetchTrailer() {
      try {
        const res = await api.tmdb.getTrailer(type, item.id);
        if (!isMounted) return;
        
        if (res && res.results && res.results.length > 0) {
          // Find a YouTube trailer, preferably official
          const trailer = res.results.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official) 
                       || res.results.find(v => v.site === 'YouTube' && v.type === 'Trailer')
                       || res.results.find(v => v.site === 'YouTube');
          
          if (trailer) {
            setTrailerKey(trailer.key);
            
            // Wait 2.5 seconds before showing video to allow user to read synopsis
            videoTimeoutRef.current = setTimeout(() => {
              if (isMounted) setShowVideo(true);
            }, 2500);
          }
        }
      } catch (err) {
        console.error('Failed to fetch trailer for hero banner', err);
      }
    }

    fetchTrailer();

    return () => {
      isMounted = false;
      clearTimeout(videoTimeoutRef.current);
    };
  }, [item, type]);

  if (!item) return null;

  const backdropUrl = item.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
    : '';

  const title = item.title || item.name || item.original_name;
  const releaseYear = (item.release_date || item.first_air_date || '').split('-')[0];

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '85vh',
      minHeight: '600px',
      left: 'calc(-50vw + 50%)', // Break out of container to full width
      marginBottom: '4rem',
      backgroundColor: '#000',
      overflow: 'hidden'
    }}>
      
      {/* Background Media */}
      <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* Fallback Poster / Initial Poster */}
        <img 
          src={backdropUrl} 
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: showVideo ? 0 : 0.6,
            transition: 'opacity 1s ease-in-out',
            transform: showVideo ? 'scale(1.05)' : 'scale(1)', // Slight zoom effect
          }}
        />

        {/* YouTube iframe trailer */}
        {trailerKey && (
          <div style={{
            position: 'absolute',
            inset: '-10%', // Oversize to hide YouTube UI edges
            width: '120%',
            height: '120%',
            pointerEvents: 'none',
            opacity: showVideo ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
          }}>
            {/* We only render the iframe if showVideo is true, or pre-render and hide it. 
                Pre-rendering with opacity 0 is better for seamless transition. */}
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&loop=1&playlist=${trailerKey}&modestbranding=1&playsinline=1`}
              title="Trailer"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}
      </div>

      {/* Cinematic Gradients */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(0deg, var(--bg-primary) 0%, transparent 20%)',
        pointerEvents: 'none'
      }} />

      {/* Content Overlay */}
      <div className="container" style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingTop: '4rem',
        pointerEvents: 'none' // Let clicks pass through the overlay...
      }}>
        <div style={{ maxWidth: '600px', zIndex: 10, pointerEvents: 'auto' /* ...but catch them on the content */ }}>
          {/* Tag */}
          <div style={{ 
            display: 'inline-block', 
            padding: '4px 12px', 
            backgroundColor: 'var(--accent)', 
            color: 'black', 
            fontWeight: 800, 
            fontSize: '0.8rem', 
            letterSpacing: '2px', 
            textTransform: 'uppercase', 
            borderRadius: '4px',
            marginBottom: '1rem',
            animation: 'fadeInUp 0.8s ease-out'
          }}>
            #1 in Trending
          </div>

          <h1 style={{ 
            fontSize: 'clamp(3rem, 5vw, 4.5rem)', 
            fontWeight: 900, 
            lineHeight: 1.1, 
            marginBottom: '1rem',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
            letterSpacing: '-1px',
            animation: 'fadeInUp 0.8s ease-out 0.1s both'
          }}>
            {title}
          </h1>
          
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            alignItems: 'center', 
            marginBottom: '1.5rem',
            fontSize: '1rem',
            color: 'var(--text-metadata)',
            fontWeight: 600,
            animation: 'fadeInUp 0.8s ease-out 0.2s both'
          }}>
            <span>{releaseYear}</span>
            <span style={{ fontSize: '1.2rem' }}>•</span>
            <span style={{ border: '1px solid var(--text-metadata)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>
              {type === 'movie' ? 'MOVIE' : 'SERIES'}
            </span>
            <span style={{ fontSize: '1.2rem' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f5c518' }}>
              ★ {item.vote_average?.toFixed(1)}
            </span>
          </div>
          
          <p style={{ 
            fontSize: '1.15rem', 
            lineHeight: 1.6, 
            color: 'var(--text-secondary)',
            marginBottom: '2.5rem',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            animation: 'fadeInUp 0.8s ease-out 0.3s both'
          }}>
            {item.overview}
          </p>

          <div style={{ 
            display: 'flex', 
            gap: '1rem',
            animation: 'fadeInUp 0.8s ease-out 0.4s both'
          }}>
            <button 
              onClick={() => {
                sound.playSelect();
                navigate(`/title/${type}/${item.id}`);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.8rem 2rem',
                backgroundColor: 'white',
                color: 'black',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.2rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.8)'; sound.playHover(); }}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="black">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Play Now
            </button>
            
            <button 
              onClick={() => {
                sound.playSelect();
                navigate(`/title/${type}/${item.id}`);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.8rem 2rem',
                backgroundColor: 'rgba(80, 80, 80, 0.6)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.2rem',
                fontWeight: 700,
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(80, 80, 80, 0.9)'; sound.playHover(); }}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(80, 80, 80, 0.6)'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              More Info
            </button>
          </div>
        </div>

        {/* Mute Toggle Button */}
        {trailerKey && showVideo && (
          <button 
            onClick={() => setIsMuted(!isMuted)}
            style={{
              position: 'absolute',
              right: '2rem',
              bottom: '40%',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: '2px solid rgba(255,255,255,0.4)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              zIndex: 10
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {isMuted ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            )}
          </button>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
