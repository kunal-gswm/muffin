import React from 'react';
import BentoItem from './BentoItem'; // Re-use BentoItem since it handles filling the container & hovers

export default function GalleryGrid({ items = [], type = 'movie' }) {
  if (!items || items.length === 0) return null;

  // Render in clusters of 5
  const clusters = [];
  for (let i = 0; i < items.length; i += 5) {
    if (items.slice(i, i + 5).length === 5) {
      clusters.push(items.slice(i, i + 5));
    } else if (i === 0) {
      // If we don't even have 5 items for the first cluster, just push what we have
      clusters.push(items.slice(i, i + 5));
    }
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', 
      gap: '2rem', 
      width: '100%' 
    }}>
      {clusters.map((cluster, clusterIndex) => (
        <div 
          key={clusterIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gridAutoRows: '90px', // Base row height
            gap: '1.2rem',
            width: '100%'
          }}
        >
          {cluster.map((item, index) => {
            let gridColumn = '';
            let gridRow = '';
            let isWide = false;

            // Gallery layout mapping based on the reference photo
            // Top Row
            if (index === 0) {
              // Top Left: Medium Portrait
              gridColumn = '1 / span 4';
              gridRow = 'span 3';
              isWide = false;
            } else if (index === 1) {
              // Top Right: Large Landscape
              gridColumn = '5 / span 8';
              gridRow = 'span 3';
              isWide = true;
            } 
            // Bottom Row
            else if (index === 2) {
              // Bottom Left: Medium Portrait (Staggered inward)
              gridColumn = '1 / span 3';
              gridRow = 'span 3';
              isWide = false;
            } else if (index === 3) {
              // Bottom Middle: Large Portrait (Extends down)
              gridColumn = '4 / span 5';
              gridRow = 'span 4';
              isWide = false;
            } else if (index === 4) {
              // Bottom Right: Small Landscape
              gridColumn = '9 / span 4';
              gridRow = 'span 2';
              isWide = true;
            }

            // Calculate animation delay based on index for a staggered entrance
            const animationDelay = `${index * 0.15}s`;

            return (
              <div 
                key={`${item.id}-${index}`} 
                style={{ 
                  gridColumn, 
                  gridRow,
                  minWidth: 0, 
                  minHeight: 0,
                  animation: `fadeSlideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) ${animationDelay} both`
                }}
              >
                <BentoItem item={item} type={type} isWide={isWide} />
              </div>
            );
          })}
        </div>
      ))}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
