import { Link } from 'react-router-dom';

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
        group: 'poster', // For hover targeting if we used tailwind, but we use vanilla CSS
        textDecoration: 'none',
      }}
      className="poster-card"
    >
      {imgUrl && (
        <img 
          src={imgUrl} 
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transition: 'opacity var(--duration) var(--ease)',
          }}
          className="poster-img"
        />
      )}
      
      {/* 
        Hover overlay - sharp gradient mask 
        Opacity shift only, no scaling, no bouncing.
      */}
      <div 
        className="poster-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(10,10,11,0.9) 0%, transparent 60%)',
          display: 'flex',
          alignItems: 'flex-end',
          padding: isHero ? '1.5rem' : '0.75rem',
          opacity: 0,
          transition: 'opacity var(--duration) var(--ease)',
        }}
      >
        <h3 style={{ 
          margin: 0, 
          color: 'var(--text-primary)',
          fontFamily: 'Oswald, sans-serif',
          textTransform: 'uppercase',
          fontSize: isHero ? '2rem' : '1.1rem',
          lineHeight: 1.1,
          wordWrap: 'break-word',
          width: '100%'
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
            backgroundColor: 'red',
            width: `${Math.min(100, Math.max(0, progress))}%`
          }} />
        </div>
      )}

      <style>{`
        .poster-card:hover .poster-overlay {
          opacity: 1 !important;
        }
        .poster-card:hover .poster-img {
          opacity: 0.6;
        }
      `}</style>
    </Link>
  );
}
