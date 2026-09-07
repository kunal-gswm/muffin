import React, { useEffect, useState } from 'react';
import BentoItem from './BentoItem';

export default function MasonryGrid({ items = [], type = 'movie' }) {
  const [scrollY, setScrollY] = useState(0);

  // Add scroll listener for true parallax effect on the columns
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!items || items.length === 0) return null;

  // Render 12 items for a nice 6-column layout
  const masonryItems = items.slice(0, 12);

  // Split into 6 columns
  const columns = [[], [], [], [], [], []];
  masonryItems.forEach((item, i) => {
    columns[i % 6].push(item);
  });

  // Different parallax speeds and initial offsets for each column
  const columnConfigs = [
    { speed: 0.05, offset: 0 },
    { speed: 0.15, offset: 40 },
    { speed: 0.08, offset: 80 },
    { speed: 0.20, offset: 20 },
    { speed: 0.12, offset: 60 },
    { speed: 0.18, offset: 30 }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: '1.5rem',
      width: '100%',
      alignItems: 'start'
    }}>
      {columns.map((colItems, colIndex) => {
        const config = columnConfigs[colIndex];
        // Calculate dynamic translation based on scroll position to create parallax
        const translateY = config.offset - (scrollY * config.speed);
        
        return (
          <div 
            key={colIndex}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              transform: `translateY(${translateY}px)`,
              transition: 'transform 0.1s ease-out'
            }}
          >
            {colItems.map((item, itemIndex) => (
              <div 
                key={`${item.id}-${itemIndex}`} 
                style={{ 
                  width: '100%', 
                  aspectRatio: '2/3' 
                }}
              >
                <BentoItem item={item} type={type} isWide={false} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
