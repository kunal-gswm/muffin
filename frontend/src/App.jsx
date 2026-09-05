import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Home from './features/browse/Home';
import TitleDetail from './features/title/TitleDetail';
import Search from './features/browse/Search';
import Library from './features/library/Library';
import Downloads from './features/downloads/Downloads';
import Settings from './features/settings/Settings';
import Anime from './features/browse/Anime';
import AnimeDetail from './features/title/AnimeDetail';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  return (
    <div className="app-shell">
      {/* Premium navigation bar */}
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
            style={{ 
              fontFamily: 'Oswald, sans-serif',
              fontWeight: 700,
              fontSize: '1.5rem',
              letterSpacing: '0.1em',
              background: 'linear-gradient(135deg, #e8a44a 0%, #f0c27f 50%, #e8a44a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            MUFFIN
          </Link>
        </div>
        <div style={{ pointerEvents: 'auto', display: 'flex', gap: '0.25rem', height: '100%', alignItems: 'center' }}>
          {[
            { to: '/', label: 'Home', match: '/' },
            { to: '/anime', label: 'Anime', match: '/anime' },
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
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

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
    </div>
  );
}

export default App;
