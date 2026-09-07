import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Poster({ 
  id, 
  title, 
  posterPath, 
  type = 'movie', 
  isHero = false,
  progress = null
}) {
  let imgUrl = null;
  if (posterPath) {
    if (posterPath.startsWith('http')) {
      imgUrl = posterPath; // Absolute URL (e.g. from AllAnime)
    } else {
      imgUrl = `https://image.tmdb.org/t/p/${isHero ? 'original' : 'w780'}${posterPath}`;
    }
  }

  const linkTo = type === 'anime' ? `/anime/${id}` : `/title/${type}/${id}`;

  const [isHovered, setIsHovered] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const hoverTimeout = useRef(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    hoverTimeout.current = setTimeout(async () => {
      try {
        const res = await api.tmdb.getTrailer(type, id);
        const trailer = res?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube') || 
                        res?.results?.find(v => v.site === 'YouTube');
        if (trailer && isHovered) {
          setTrailerKey(trailer.key);
        }
      } catch (e) {
        console.error('Failed to load trailer preview', e);
      }
    }, 600);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTrailerKey(null);
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
  };

  return (
    <Link 
      to={linkTo} 
      style={{
        display: 'block',
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-secondary)',
        overflow: 'hidden',
        textDecoration: 'none',
        transform: isHovered && !isHero ? 'scale(1.05)' : 'scale(1)',
        zIndex: isHovered && !isHero ? 10 : 1,
        transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), z-index 0.3s ease',
        boxShadow: isHovered && !isHero ? '0 10px 30px rgba(0,0,0,0.8)' : 'none'
      }}
      className="poster-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background Media */}
      {trailerKey && isHovered ? (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1 }}>
          <iframe
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=1&playlist=${trailerKey}`}
            allow="autoplay; encrypted-media"
            style={{
              width: '300%',
              height: '100%',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              border: 'none',
              pointerEvents: 'none'
            }}
          />
        </div>
      ) : imgUrl ? (
        <img 
          src={imgUrl} 
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            position: 'relative',
            zIndex: 2,
            transition: 'opacity var(--duration) var(--ease)',
          }}
          className="poster-img"
        />
      ) : (
        <div style={{ padding: '1rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
          <h4 style={{ textAlign: 'center', fontFamily: 'Oswald, sans-serif' }}>{title}</h4>
        </div>
      )}
      
      {/* Hover overlay - sharp gradient mask */}
      <div 
        className="poster-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(10,10,11,0.95) 0%, transparent 80%)',
          display: 'flex',
          alignItems: 'flex-end',
          padding: isHero ? '1.5rem' : '0.75rem',
          opacity: isHovered || isHero ? 1 : 0,
          transition: 'opacity 0.3s ease',
          zIndex: 3
        }}
      >
        <h3 style={{ 
          margin: 0, 
          color: 'var(--text-primary)',
          fontFamily: 'Oswald, sans-serif',
          textTransform: 'uppercase',
          fontSize: isHero ? '2.5rem' : '1rem',
          lineHeight: 1.1,
          width: '100%',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {title}
        </h3>
      </div>
      
      {progress !== null && progress > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          zIndex: 10
        }}>
          <div style={{
            height: '100%',
            backgroundColor: 'var(--accent)',
            width: `${Math.min(100, Math.max(0, progress))}%`
          }} />
        </div>
      )}

      <style>{`
        .poster-card:hover .poster-img {
          opacity: 0.6;
        }
      `}</style>
    </Link>
  );
}
