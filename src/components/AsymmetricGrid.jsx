import React from 'react';
import Poster from './Poster';

/**
 * Editorial asymmetric grid. 
 * First item breaks the grid by spanning 2x2.
 */
export default function AsymmetricGrid({ items = [], type = 'movie', disableHero = false }) {
  if (!items || items.length === 0) return null;

  // To perfectly form a 2-row layout with a 2x2 hero, 
  // we need a fixed number of columns. Let's use 5 columns.
  // A 5x2 grid has 10 cells. Hero takes 4 cells. Remaining = 6 cells.
  // So we need exactly 7 items (1 hero + 6 small).
  const displayItems = disableHero ? items.slice(0, 10) : items.slice(0, 7);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gridAutoRows: '280px',
      gap: '1px', 
      backgroundColor: 'transparent',
    }}>
      {displayItems.map((item, index) => {
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
