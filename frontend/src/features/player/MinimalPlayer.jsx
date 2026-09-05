import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Hls from 'hls.js';
import SharpProgress from '../../components/SharpProgress';

export default function MinimalPlayer({ src, sources, defaultSource, title, isEmbed, onClose, initialTime, onTimeUpdate }) {
  const [idle, setIdle] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSource, setActiveSource] = useState(defaultSource?.url || src);
  const videoRef = useRef(null);

  // HLS.js state
  const [hlsInstance, setHlsInstance] = useState(null);
  const [hlsLevels, setHlsLevels] = useState([]);

  useEffect(() => {
    let timeout;
    const handleMouseMove = () => {
      setIdle(false);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (!showSettings) setIdle(true);
      }, 2500);
    };

    window.addEventListener('mousemove', handleMouseMove);
    timeout = setTimeout(() => {
      if (!showSettings) setIdle(true);
    }, 2500);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [showSettings]);

  // HLS Setup
  useEffect(() => {
    if (isEmbed || !src) return;
    const video = videoRef.current;
    if (!video) return;

    if (src.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        maxMaxBufferLength: 60,
      });
      
      hls.loadSource(src);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const parsedLevels = data.levels.map((lvl, index) => ({
          id: index,
          sourceName: lvl.height ? `${lvl.height}p` : `Level ${index}`,
        })).reverse(); // highest quality first usually
        
        parsedLevels.unshift({ id: -1, sourceName: 'Auto' });
        
        setHlsLevels(parsedLevels);
        setActiveSource(-1); // Auto default
      });
      
      setHlsInstance(hls);
      
      return () => {
        if (hls) hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else if (!src.includes('.m3u8')) {
      // Standard MP4
      video.src = activeSource;
    }
  }, [src, isEmbed]);

  useEffect(() => {
    if (videoRef.current && initialTime > 0) {
      videoRef.current.currentTime = initialTime;
    }
  }, [initialTime]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || !onTimeUpdate) return;
    onTimeUpdate(videoRef.current.currentTime, videoRef.current.duration);
  };

  const changeQuality = (val) => {
    if (hlsInstance) {
      hlsInstance.currentLevel = val;
      setActiveSource(val);
      setShowSettings(false);
    } else {
      if (!videoRef.current) return;
      const currentTime = videoRef.current.currentTime;
      const isPaused = videoRef.current.paused;
      
      setActiveSource(val);
      setShowSettings(false);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = currentTime;
          if (!isPaused) videoRef.current.play().catch(e => console.error(e));
        }
      }, 150);
    }
  };

  const displaySources = hlsLevels.length > 0 ? hlsLevels : sources;
  const hasSettings = displaySources && displaySources.length > 0;

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#000',
      zIndex: 99999, // Ensure it sits above absolutely everything
    }}>
      {isEmbed ? (
        <iframe 
          src={src} 
          style={{ width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
          allow="autoplay; fullscreen"
        />
      ) : (
        <video 
          ref={videoRef}
          src={activeSource} 
          controls={false}
          autoPlay
          onTimeUpdate={handleTimeUpdate}
          style={{ width: '100%', height: '100%' }} 
        />
      )}

      {/* Auto-hiding Chrome */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: idle && !showSettings ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '2rem'
      }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: isEmbed ? 'center' : 'space-between', pointerEvents: 'none' }}>
          {!isEmbed && <h2 className="text-h2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)', pointerEvents: 'auto' }}>{title}</h2>}
          
          {isEmbed ? (
            <button 
              onClick={onClose} 
              style={{ 
                pointerEvents: 'auto',
                fontSize: '1.25rem', 
                fontWeight: 600,
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.8)',
                transition: 'all 0.2s',
                marginTop: '-0.5rem'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.8)';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              ✕
            </button>
          ) : (
            <button 
              onClick={onClose} 
              style={{ 
                pointerEvents: 'auto',
                fontSize: '2rem', 
                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                padding: '0.5rem'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Bottom bar - Only show for native video, NOT embeds */}
        {!isEmbed && (
          <div style={{ pointerEvents: 'auto' }}>
            <SharpProgress percentage={30} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <button onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
                  }
                }}>▶</button>
                <button>VOL</button>
              </div>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                {hasSettings && (
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    style={{ fontSize: '1.25rem' }}
                  >
                    ⚙️
                  </button>
                )}
                <button onClick={() => {
                  if (document.fullscreenElement) document.exitFullscreen();
                  else document.documentElement.requestFullscreen();
                }}>FULLSCREEN</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal (Overlay) */}
      {showSettings && !isEmbed && hasSettings && (
        <div style={{
          position: 'absolute',
          bottom: '5rem',
          right: '2rem',
          width: '260px',
          backgroundColor: '#262626',
          borderRadius: '8px',
          color: '#fff',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          zIndex: 100000,
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '60vh',
          overflow: 'hidden'
        }}>
          
          {/* Header Tabs */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            backgroundColor: '#161616',
            padding: '0.5rem 1rem'
          }}>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              {/* Quality Tab (Active) */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', paddingBottom: '0.25rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M3,22 L3,16 L7,16 L7,22 L3,22 Z M10,22 L10,10 L14,10 L14,22 L10,22 Z M17,22 L17,2 L21,2 L21,22 L17,22 Z" />
                </svg>
                {/* Active Underline */}
                <div style={{ position: 'absolute', bottom: -8, left: -4, right: -4, height: 2, backgroundColor: 'white' }} />
              </div>
              
              {/* CC Tab */}
              <div style={{ display: 'flex', alignItems: 'center', opacity: 0.6 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M19,4 L5,4 C3.89,4 3,4.9 3,6 L3,18 C3,19.1 3.89,20 5,20 L19,20 C20.1,20 21,19.1 21,18 L21,6 C21,4.9 20.1,4 19,4 Z M11,15 L7.5,15 L7.5,13.5 L9.5,13.5 L9.5,12 L7.5,12 L7.5,9 L11,9 L11,10.5 L9,10.5 L9,13.5 L11,13.5 L11,15 Z M18,15 L14.5,15 L14.5,13.5 L16.5,13.5 L16.5,12 L14.5,12 L14.5,9 L18,9 L18,10.5 L16,10.5 L16,13.5 L18,13.5 L18,15 Z" />
                </svg>
              </div>

              {/* Speed Tab */}
              <div style={{ display: 'flex', alignItems: 'center', opacity: 0.6 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M11.99,2 C6.47,2 2,6.48 2,12 C2,17.52 6.47,22 11.99,22 C17.52,22 22,17.52 22,12 C22,6.48 17.52,2 11.99,2 Z M12,20 C7.58,20 4,16.42 4,12 C4,7.58 7.58,4 12,4 C16.42,4 20,7.58 20,12 C20,16.42 16.42,20 12,20 Z M12.5,7 L11,7 L11,13 L16.25,16.15 L17,14.92 L12.5,12.25 L12.5,7 Z" />
                </svg>
              </div>

              {/* Volume Tab */}
              <div style={{ display: 'flex', alignItems: 'center', opacity: 0.6 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M3,9 L3,15 L7,15 L12,20 L12,4 L7,9 L3,9 Z M16.5,12 C16.5,10.23 15.48,8.71 14,7.97 L14,16.02 C15.48,15.29 16.5,13.77 16.5,12 Z M14,3.23 L14,5.29 C16.89,6.15 19,8.83 19,12 C19,15.17 16.89,17.85 14,18.71 L14,20.77 C18.01,19.86 21,16.28 21,12 C21,7.72 18.01,4.14 14,3.23 Z" />
                </svg>
              </div>
            </div>

            <button 
              onClick={() => setShowSettings(false)}
              style={{ fontSize: '1.25rem', opacity: 0.8, display: 'flex', alignItems: 'center' }}
            >
              ✕
            </button>
          </div>

          {/* Body Content - Quality List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', padding: '1rem 0', overflowY: 'auto' }}>
            {displaySources.map((srcItem, i) => {
              const val = srcItem.id !== undefined ? srcItem.id : srcItem.url;
              const isSelected = activeSource === val;
              return (
                <button
                  key={i}
                  onClick={() => changeQuality(val)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    width: '100%',
                    backgroundColor: 'transparent',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '0.5rem' }}>
                    {isSelected && (
                      <div style={{ width: '4px', height: '4px', backgroundColor: 'white', borderRadius: '50%' }} />
                    )}
                  </div>
                  
                  <span style={{ 
                    fontWeight: isSelected ? 600 : 400,
                    color: 'white',
                    fontSize: '0.95rem'
                  }}>
                    {srcItem.sourceName || `Source ${i + 1}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}
