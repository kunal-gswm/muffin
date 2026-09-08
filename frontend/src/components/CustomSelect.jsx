import { useState, useRef, useEffect } from 'react';

export default function CustomSelect({ value, onChange, options, minWidth = '160px' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        minWidth,
        fontFamily: 'Oswald, sans-serif',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          backgroundColor: isOpen ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.5)',
          color: 'var(--text-primary)',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          fontSize: '1.1rem',
          outline: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          transition: 'all 0.2s ease',
        }}
      >
        <span>{selectedOption?.label}</span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            left: 0,
            width: '100%',
            backgroundColor: 'rgba(20, 20, 25, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 100,
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '0.5rem 0',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                backgroundColor: value === opt.value ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: value === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                padding: '0.75rem 1rem',
                fontSize: '1.1rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.1s ease',
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {opt.label}
            </button>
          ))}
          <style>{`
            div::-webkit-scrollbar {
              width: 8px;
            }
            div::-webkit-scrollbar-track {
              background: transparent;
            }
            div::-webkit-scrollbar-thumb {
              background: rgba(255,255,255,0.2);
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: rgba(255,255,255,0.4);
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
