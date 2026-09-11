import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Hls from 'hls.js';
import SharpProgress from '../../components/SharpProgress';
import ChatBox from '../watchparty/ChatBox';
import { useWatchParty } from '../../hooks/useWatchParty';

export default function MinimalPlayer({ src, sources, defaultSource, title, isEmbed, onClose, initialTime, onTimeUpdate, hasNextEpisode, onNextEpisode, partyId }) {
  const [idle, setIdle] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSource, setActiveSource] = useState(defaultSource?.url || src);
  const videoRef = useRef(null);

  // Watch Party Hook
  const { isConnected, partyMembers, messages, sendSync, sendMessage, setOnSync } = useWatchParty(partyId);

  // Auto-play state
  const [showUpNext, setShowUpNext] = useState(false);
  const [upNextCountdown, setUpNextCountdown] = useState(10);
  const countdownInterval = useRef(null);

  // A11y & Controls state
  const [volume, setVolume] = useState(1);
  const [ariaVolumeText, setAriaVolumeText] = useState('');
  const volumeDebounceRef = useRef(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const handlePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error("PiP failed", error);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in chat
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      
      const vid = videoRef.current;
      if (!vid) return;

      switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (vid.paused) { vid.play(); sendSync('play', vid.currentTime); }
          else { vid.pause(); sendSync('pause', vid.currentTime); }
          break;
        case 'arrowleft':
          e.preventDefault();
          vid.currentTime = Math.max(0, vid.currentTime - 10);
          sendSync('seek', vid.currentTime);
          break;
        case 'arrowright':
          e.preventDefault();
          vid.currentTime = Math.min(vid.duration, vid.currentTime + 10);
          sendSync('seek', vid.currentTime);
          break;
        case 'm':
          e.preventDefault();
          vid.muted = !vid.muted;
          setVolume(vid.muted ? 0 : vid.volume);
          break;
        case 'f':
          e.preventDefault();
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
          break;
        case 'escape':
          if (!document.fullscreenElement) {
            e.preventDefault();
            if (onClose) onClose();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sendSync, onClose]);

  // Ensure we drop out of fullscreen if the player is closed
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Handle Incoming Sync Commands
  useEffect(() => {
    setOnSync((data) => {
      const video = videoRef.current;
      if (!video) return;

      if (data.type === 'play') {
        video.currentTime = data.currentTime;
        video.play().catch(e => console.error(e));
      } else if (data.type === 'pause') {
        video.currentTime = data.currentTime;
        video.pause();
      } else if (data.type === 'seek') {
        video.currentTime = data.currentTime;
      }
    });
  }, [setOnSync]);

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
    if (!videoRef.current) return;
    const ct = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    
    if (onTimeUpdate) {
      onTimeUpdate(ct, dur);
    }
    
    // Update local state for progress bar (only if not actively dragging)
    if (dur > 0 && !isScrubbing) {
      setProgressPercent((ct / dur) * 100);
    }

    // Up Next Auto-Play Logic (Show 15 seconds before the end)
    if (hasNextEpisode && dur > 0 && dur - ct <= 15 && !showUpNext) {
      setShowUpNext(true);
      setUpNextCountdown(15);
      
      countdownInterval.current = setInterval(() => {
        setUpNextCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval.current);
            onNextEpisode();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (dur - ct > 15 && showUpNext) {
      // Cancel if they seek backwards
      setShowUpNext(false);
      clearInterval(countdownInterval.current);
    }
  };

  useEffect(() => {
    return () => clearInterval(countdownInterval.current);
  }, []);

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
        <div style={{ display: 'flex', justifyContent: isEmbed ? 'space-between' : 'space-between', pointerEvents: 'none' }}>
          {!isEmbed ? (
            <h2 className="text-h2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)', pointerEvents: 'auto' }}>{title}</h2>
          ) : (
            <div style={{ flex: 1 }} /> 
          )}
          
          <div style={{ display: 'flex', gap: '1rem', pointerEvents: 'auto', alignItems: 'center' }}>
            {hasNextEpisode && (
              <button 
                onClick={() => {
                  if (countdownInterval.current) clearInterval(countdownInterval.current);
                  onNextEpisode();
                }}
                style={{
                  padding: '0.5rem 1.5rem',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '1.2rem',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.6)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
              >
                NEXT EPISODE ⏭
              </button>
            )}
          
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
        </div>

        {/* Bottom bar - Only show for native video, NOT embeds */}
        {!isEmbed && (
          <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Accessible Scrubber */}
            <input 
              type="range" 
              role="slider"
              aria-label="Seek time"
              min="0" 
              max="100" 
              value={progressPercent || 0}
              onMouseDown={() => setIsScrubbing(true)}
              onMouseUp={(e) => {
                setIsScrubbing(false);
                if (videoRef.current) {
                  const percent = parseFloat(e.target.value) / 100;
                  const newTime = percent * videoRef.current.duration;
                  sendSync('seek', newTime);
                }
              }}
              onChange={(e) => {
                const percent = parseFloat(e.target.value) / 100;
                setProgressPercent(percent * 100);
                if (videoRef.current) {
                  videoRef.current.currentTime = percent * videoRef.current.duration;
                }
              }}
              style={{
                width: '100%', cursor: 'pointer', accentColor: 'var(--accent)',
                height: '8px', background: 'rgba(255,255,255,0.2)',
                borderRadius: '4px', outline: 'none'
              }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <button 
                  aria-label="Play or Pause (Space)"
                  onClick={() => {
                    if (videoRef.current) {
                      const ct = videoRef.current.currentTime;
                      if (videoRef.current.paused) {
                        videoRef.current.play();
                        sendSync('play', ct);
                      } else {
                        videoRef.current.pause();
                        sendSync('pause', ct);
                      }
                    }
                  }}
                  style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center' }}
                >
                  {videoRef.current?.paused ? '▶' : '⏸'}
                </button>

                {/* Accessible Volume Control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span aria-hidden="true">🔊</span>
                  <input 
                    type="range"
                    role="slider"
                    aria-label="Volume"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      if (videoRef.current) {
                        videoRef.current.volume = v;
                        videoRef.current.muted = v === 0;
                      }
                      
                      // Debounce screen reader announcement to avoid spam
                      if (volumeDebounceRef.current) clearTimeout(volumeDebounceRef.current);
                      volumeDebounceRef.current = setTimeout(() => {
                        setAriaVolumeText(`Volume ${Math.round(v * 100)}%`);
                      }, 400);
                    }}
                    style={{
                      width: '100px', cursor: 'pointer', accentColor: 'var(--text-primary)',
                      height: '8px', background: 'rgba(255,255,255,0.2)',
                      borderRadius: '4px', outline: 'none'
                    }}
                  />
                  {/* Invisible aria-live region for debounced announcements */}
                  <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
                    {ariaVolumeText}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                {hasSettings && (
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    style={{ fontSize: '1.25rem' }}
                    title="Settings"
                  >
                    ⚙️
                  </button>
                )}
                
                {/* PiP Button (Only for native video) */}
                {document.pictureInPictureEnabled && (
                  <button 
                    onClick={handlePiP}
                    style={{ display: 'flex', alignItems: 'center' }}
                    title="Picture-in-Picture"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <rect x="12" y="13" width="7" height="5" rx="1" ry="1"></rect>
                    </svg>
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

      {/* Up Next Overlay Button */}
      {showUpNext && !isEmbed && (
        <div style={{
          position: 'absolute',
          bottom: '8rem',
          right: '2rem',
          pointerEvents: 'auto',
          zIndex: 100000
        }}>
          <button
            onClick={() => {
              clearInterval(countdownInterval.current);
              onNextEpisode();
            }}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '1rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              backdropFilter: 'blur(10px)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            <span style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>Up Next</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '0.2rem' }}>
              Playing in {upNextCountdown}s
            </span>
          </button>
        </div>
      )}

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

      {/* Watch Party ChatBox */}
      {isConnected && (
        <ChatBox 
          messages={messages} 
          onSendMessage={sendMessage} 
          membersCount={partyMembers} 
        />
      )}

    </div>,
    document.body
  );
}
