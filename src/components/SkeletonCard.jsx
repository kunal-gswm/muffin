import React from 'react';

export default function SkeletonCard({ isWide = false, count = 1 }) {
  // We use a CSS-based pulsing animation that is very cheap for the browser to render
  const skeletonStyle = {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '16px',
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  const shimmerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
    animation: 'shimmer 1.5s infinite linear',
  };

  const skeletons = Array.from({ length: count }).map((_, i) => (
    <div key={i} style={skeletonStyle}>
      <div style={shimmerStyle} />
      {/* Optional: Add a small fake text block at the bottom */}
      <div style={{
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        width: '60%',
        height: '1.2rem',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '4px'
      }} />
    </div>
  ));

  if (count === 1) return skeletons[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.2rem', width: '100%' }}>
      {skeletons}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
