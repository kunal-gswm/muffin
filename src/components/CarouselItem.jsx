import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function CarouselItem({ item, type }) {
  const routeType = item.media_type || type;
  const posterUrl = item.poster_path 
    ? (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`)
    : null;
    
  const [isHovered, setIsHovered] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const hoverTimeout = useRef(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Delay fetching and playing trailer by 600ms to avoid spamming while user scrolls over items
    hoverTimeout.current = setTimeout(async () => {
      try {
        const res = await api.tmdb.getTrailer(routeType, item.id);
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
    setTrailerKey(null); // Reset preview immediately on mouse leave
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
  };

  return (
    <Link 
      to={`/title/${routeType}/${item.id}`}
      style={{
        flex: '0 0 auto',
        width: '250px',
        height: '375px', // 2:3 aspect ratio
        borderRadius: '8px',
        overflow: 'hidden',
        scrollSnapAlign: 'start',
        position: 'relative',
        transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), z-index 0.3s ease',
        backgroundColor: 'var(--bg-secondary)',
        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        zIndex: isHovered ? 10 : 1,
        boxShadow: isHovered ? '0 10px 30px rgba(0,0,0,0.8)' : 'none'
      }}
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
      ) : posterUrl ? (
        <img 
          src={posterUrl} 
          alt={item.title || item.name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 2 }}
          loading="lazy"
        />
      ) : (
        <div style={{ padding: '1rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
          <h4 style={{ textAlign: 'center', fontFamily: 'Oswald, sans-serif' }}>{item.title || item.name}</h4>
        </div>
      )}
      
      {/* Hover Info Overlay */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '4rem 1rem 1rem',
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
          zIndex: 3
        }}
      >
        <h4 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '1.2rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.title || item.name}
        </h4>
        {item.progress !== undefined && (
          <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', width: '100%', borderRadius: '2px', overflow: 'hidden', marginTop: '0.5rem' }}>
            <div style={{ height: '100%', backgroundColor: 'var(--accent)', width: `${item.progress}%` }} />
          </div>
        )}
      </div>
    </Link>
  );
}
