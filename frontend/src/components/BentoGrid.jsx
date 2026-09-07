import React from 'react';
import BentoItem from './BentoItem';

export default function BentoGrid({ items = [], type = 'movie' }) {
  if (!items || items.length === 0) return null;

  // We only render up to 7 items to form a perfect bento block.
  // 1 massive hero (2x2), 2 horizontal wide blocks (2x1), 4 small squares (1x1).
  const bentoItems = items.slice(0, 7);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gridTemplateRows: 'repeat(2, 220px)',
      gap: '1rem',
      width: '100%',
    }}>
      {bentoItems.map((item, index) => {
        let gridColumn = 'span 1';
        let gridRow = 'span 1';
        let isWide = false;

        if (index === 0) {
          // Hero block (2x2)
          gridColumn = 'span 2';
          gridRow = 'span 2';
          isWide = true; // Use backdrop instead of poster
        } else if (index === 1 || index === 2) {
          // Wide blocks (2x1)
          gridColumn = 'span 2';
          gridRow = 'span 1';
          isWide = true;
        } else {
          // Small squares (1x1)
          gridColumn = 'span 1';
          gridRow = 'span 1';
          isWide = false;
        }

        return (
          <div 
            key={`${item.id}-${index}`} 
            style={{ 
              gridColumn, 
              gridRow,
              minWidth: 0, 
              minHeight: 0
            }}
          >
            <BentoItem item={item} type={type} isWide={isWide} />
          </div>
        );
      })}
    </div>
  );
}
