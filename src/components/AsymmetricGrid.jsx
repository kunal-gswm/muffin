import React from 'react';
import Poster from './Poster';

/**
 * Editorial asymmetric grid. 
 * First item breaks the grid by spanning 2x2.
 */
export default function AsymmetricGrid({ items = [], type = 'movie', disableHero = false }) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gridAutoRows: '240px',
      gap: '1px', 
      backgroundColor: 'transparent',
    }}>
      {items.map((item, index) => {
        // Make the first item a "hero" that spans 2 columns and 2 rows, unless disabled
        const isHero = !disableHero && index === 0;
        
        return (
          <div 
            key={item.id} 
            style={{
              gridColumn: isHero ? 'span 2' : 'span 1',
              gridRow: isHero ? 'span 2' : 'span 1',
              outline: '1px solid var(--bg-tertiary)',
              backgroundColor: 'var(--bg-primary)',
            }}
          >
            <Poster 
              id={item.id} 
              title={item.title || item.name} 
              posterPath={item.poster_path} 
              type={item.media_type || type}
              isHero={isHero}
              progress={item.progress}
            />
          </div>
        );
      })}
    </div>
  );
}
