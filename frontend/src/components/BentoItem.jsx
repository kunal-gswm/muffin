import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { sound } from '../utils/SoundManager';

export default function BentoItem({ item, type, isWide = false }) {
  const routeType = item.media_type || type;
  
  // Use backdrop for wide items, poster for tall ones
  const imgPath = isWide ? (item.backdrop_path || item.poster_path) : (item.poster_path || item.backdrop_path);
  const imgUrl = imgPath ? `https://image.tmdb.org/t/p/w500${imgPath}` : null;
  
  const [isHovered, setIsHovered] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  
  const hoverTimeoutRef = useRef(null);
  const trailerDelayRef = useRef(null);
  const soundDwellRef = useRef(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (trailerDelayRef.current) clearTimeout(trailerDelayRef.current);
      if (soundDwellRef.current) clearTimeout(soundDwellRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    // Immediate visual hover state
    setIsHovered(true);
    
    // Throttled hover sound (dwell intent) to prevent machine-gunning
    soundDwellRef.current = setTimeout(() => {
      // Only play sound if it's not a touch device (coarse pointer)
      if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
        sound.playHover();
      }
    }, 150);

    // Fetch trailer key with delay
    trailerDelayRef.current = setTimeout(async () => {
      try {
        const details = await api.tmdb.getDetails(routeType, item.id);
        const trailer = details.videos?.results?.find(
          v => v.type === 'Trailer' && v.site === 'YouTube'
        );
        if (trailer) {
          setTrailerKey(trailer.key);
        }
      } catch (err) {
        console.error('Failed to load trailer preview', err);
      }
    }, 600); // Wait 600ms of hovering before loading trailer
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (trailerDelayRef.current) clearTimeout(trailerDelayRef.current);
    if (soundDwellRef.current) clearTimeout(soundDwellRef.current);
    
    // Slight delay before removing video so it doesn't instantly flash to poster
    hoverTimeoutRef.current = setTimeout(() => {
      setTrailerKey(null);
    }, 300);
  };

  return (
    <Link 
      to={`/title/${routeType}/${item.id}`}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
        transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.5s ease',
        backgroundColor: 'var(--bg-secondary)',
        transform: isHovered ? 'scale(1.04) translateY(-5px)' : 'scale(1) translateY(0)',
        zIndex: isHovered ? 10 : 1,
        boxShadow: isHovered 
          ? '0 30px 60px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.3)' 
          : '0 15px 35px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1)',
        cursor: 'pointer'
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
      ) : imgUrl ? (
        <img 
          src={imgUrl} 
          alt={item.title || item.name} 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            position: 'relative', 
            zIndex: 2,
            transition: 'transform 0.8s ease',
            transform: isHovered ? 'scale(1.1)' : 'scale(1.01)'
          }}
          loading="lazy"
        />
      ) : (
        <div style={{ padding: '1rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
          <h4 style={{ textAlign: 'center', fontFamily: 'Oswald, sans-serif' }}>{item.title || item.name}</h4>
        </div>
      )}
      
      {/* Hover Info Overlay - Frosted Glass */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          background: isHovered 
            ? 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)'
            : 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 30%)',
          backdropFilter: isHovered ? 'blur(4px)' : 'blur(0px)',
          transition: 'all 0.5s ease',
          zIndex: 3
        }}
      >
        <h4 style={{ 
          fontFamily: 'Oswald, sans-serif', 
          fontSize: isWide ? '1.8rem' : '1.4rem', 
          marginBottom: '0.2rem', 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          color: 'var(--text-primary)',
          transform: isHovered ? 'translateY(0)' : 'translateY(10px)',
          opacity: isHovered ? 1 : 0.8,
          transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
          textShadow: '0 2px 10px rgba(0,0,0,0.8)'
        }}>
          {item.title || item.name}
        </h4>
        
        {item.progress !== undefined && (
          <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', width: '100%', borderRadius: '2px', overflow: 'hidden', marginTop: '0.8rem' }}>
            <div style={{ height: '100%', backgroundColor: 'var(--accent)', width: `${item.progress}%`, boxShadow: '0 0 10px var(--accent)' }} />
          </div>
        )}
      </div>
    </Link>
  );
}
