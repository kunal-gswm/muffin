import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Home from './features/browse/Home';
import TitleDetail from './features/title/TitleDetail';
import Search from './features/browse/Search';
import Library from './features/library/Library';
import Downloads from './features/downloads/Downloads';
import Settings from './features/settings/Settings';
import Anime from './features/browse/Anime';
import AnimeDetail from './features/title/AnimeDetail';
import ProfileSelect from './features/profiles/ProfileSelect';
import { sound } from './utils/SoundManager';

function SplashScreen({ onComplete }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    sound.playSplash();
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500); // 500ms fade transition
    }, 2000); // 2 second cinematic hold
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.8s ease',
        pointerEvents: 'none'
      }}
    >
      <img 
        src="/logo.png" 
        alt="Muffin TV Logo" 
        style={{
          width: '180px', height: '180px', objectFit: 'contain',
          animation: 'pulseLogo 2s infinite ease-in-out'
        }} 
      />
      <div style={{ marginTop: '2rem', width: '200px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: '100%', height: '100%', background: 'var(--accent)', animation: 'loadingBar 2.5s ease-in-out forwards' }} />
      </div>
      <style>{`
        @keyframes pulseLogo {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        @keyframes loadingBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function App() {
  const [appLoading, setAppLoading] = useState(true);
  const [activeProfile, setActiveProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('muffin_active_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  return (
    <div className="app-shell">
      {/* Premium navigation bar */}
      {activeProfile && (
      <nav 
        className="glass-panel"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: '0 var(--pad-x)',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '1.5rem', height: '100%' }}>
          {!isHome && (
            <button 
              onClick={() => navigate(-1)}
              className="nav-link"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                height: '100%',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              BACK
            </button>
          )}
          <Link 
            to="/" 
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <img src="/logo.png" alt="Muffin TV" style={{ height: '40px', objectFit: 'contain' }} />
          </Link>
        </div>
        <div style={{ pointerEvents: 'auto', display: 'flex', gap: '0.25rem', height: '100%', alignItems: 'center' }}>
          {[
            { to: '/', label: 'Home', match: '/' },
            { to: '/library', label: 'Library', match: '/library' },
            { to: '/search', label: 'Search', match: '/search' },
            { to: '/downloads', label: 'Downloads', match: '/downloads' },
            { to: '/settings', label: 'Settings', match: '/settings' },
          ].map(item => {
            const active = item.match === '/' 
              ? location.pathname === '/'
              : location.pathname.startsWith(item.match);
            return (
              <Link 
                key={item.to}
                to={item.to} 
                className={`nav-link ${active ? 'nav-link--active' : ''}`}
                onMouseEnter={() => sound.playSelect()}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      )}

      {!activeProfile ? (
        <ProfileSelect onProfileSelected={setActiveProfile} />
      ) : (
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/anime" element={<Anime />} />
            <Route path="/anime/:id" element={<AnimeDetail />} />
            <Route path="/search" element={<Search />} />
            <Route path="/library" element={<Library />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/title/:type/:id" element={<TitleDetail />} />
          </Routes>
        </main>
      )}
      
      {appLoading && <SplashScreen onComplete={() => setAppLoading(false)} />}
    </div>
  );
}

export default App;
