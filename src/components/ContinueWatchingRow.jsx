import React from 'react';
import { Link } from 'react-router-dom';
import { sound } from '../utils/SoundManager';

export default function ContinueWatchingRow({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      gap: '1.5rem',
      overflowX: 'auto',
      paddingBottom: '2rem',
      margin: '0 -1rem',
      padding: '0 1rem 2rem 1rem',
      scrollSnapType: 'x mandatory',
      WebkitOverflowScrolling: 'touch',
      // Hide scrollbar but keep functionality
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      <style>{`
        .continue-row::-webkit-scrollbar { display: none; }
        .continue-card {
          flex: 0 0 auto;
          width: 320px;
          scroll-snap-align: start;
          transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .continue-card:hover {
          transform: translateY(-8px) scale(1.02);
        }
        .continue-card:hover .play-overlay {
          opacity: 1;
          transform: scale(1);
        }
      `}</style>

      {items.map((item, index) => {
        const type = item.media_type || 'movie';
        // Format season/episode if it exists (assuming backend history stores it like S01E02 in title or we can parse it, 
        // or just show the title for now if it's not structured).
        const progress = item.progress || 0;
        
        return (
          <Link 
            key={`${item.id}-${index}`}
            to={`/title/${type}/${item.id}`}
            className="continue-card"
            style={{ textDecoration: 'none', display: 'block' }}
            onClick={() => sound.playSelect()}
            onMouseEnter={() => sound.playHover()}
          >
            <div style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/9', // Landscape is better for continue watching
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: 'var(--bg-secondary)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              marginBottom: '1rem'
            }}>
              {/* Thumbnail (using backdrop if available, fallback to poster) */}
              <img 
                src={`https://image.tmdb.org/t/p/w500${item.backdrop_path || item.poster_path}`} 
                alt={item.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.src = '/placeholder-landscape.png'; }}
              />

              {/* Gradient Overlay for text readability if we put text inside, but here we put it outside */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 50%)',
                pointerEvents: 'none'
              }} />

              {/* Progress Bar Container */}
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: '4px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                zIndex: 2
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 0 10px var(--accent)'
                }} />
              </div>

              {/* Hover Play Overlay */}
              <div 
                className="play-overlay"
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transform: 'scale(0.9)',
                  transition: 'all 0.2s ease-out',
                  zIndex: 3
                }}
              >
                <div style={{
                  width: '64px', height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="black" style={{ marginLeft: '4px' }}>
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div style={{ padding: '0 0.25rem' }}>
              <h3 style={{ 
                margin: '0 0 0.25rem 0',
                color: 'var(--text-primary)',
                fontSize: '1.1rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {item.title}
              </h3>
              <div style={{ 
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>{item.media_type === 'tv' ? 'Series' : 'Movie'}</span>
                {progress > 0 && <span>{Math.round(progress)}% remaining</span>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
