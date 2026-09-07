import { useRef } from 'react';
import CarouselItem from './CarouselItem';

export default function Carousel({ items, type = 'movie' }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -800 : 800;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', marginTop: '1rem', marginBottom: '3rem' }}>
      <button 
        onClick={() => scroll('left')}
        style={{
          position: 'absolute',
          left: '-2rem',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(5px)'
        }}
      >
        ❮
      </button>

      <div 
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: '1rem',
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          scrollSnapType: 'x mandatory',
          paddingBottom: '2rem',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE
          padding: '1rem 0', // give space for hover scale
        }}
      >
        {items.map((item, index) => (
          <CarouselItem key={`${item.id}-${index}`} item={item} type={type} />
        ))}
      </div>

      <button 
        onClick={() => scroll('right')}
        style={{
          position: 'absolute',
          right: '-2rem',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(5px)'
        }}
      >
        ❯
      </button>

      {/* Hide scrollbar in webkit */}
      <style>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
