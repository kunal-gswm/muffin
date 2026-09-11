import { useState } from 'react';
import { sound } from '../../utils/SoundManager';

export default function SetupScreen({ onComplete }) {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState('');

  const validateAndSaveKey = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    
    sound.playSelect();
    setLoading(true);
    setError(null);

    try {
      // 1. Validate with TMDB directly
      const tmdbRes = await fetch(`https://api.themoviedb.org/3/authentication?api_key=${apiKey.trim()}`);
      const tmdbData = await tmdbRes.json();
      
      if (!tmdbData.success) {
        throw new Error('Invalid TMDB API Key. Please check and try again.');
      }

      // 2. Save settings to backend (triggers hot-reload on backend)
      const res = await fetch('http://127.0.0.1:3939/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ TMDB_API_KEY: apiKey.trim() }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      
      setStep(2);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeSelect = (themeClass) => {
    sound.playHover();
    setSelectedTheme(themeClass);
    localStorage.setItem('streambert_theme', themeClass);
    document.documentElement.className = themeClass;
  };

  const handleFinish = () => {
    sound.playSelect();
    if (onComplete) onComplete();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(135deg, var(--bg-primary) 0%, #0a0a0a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem',
      overflow: 'hidden'
    }}>
      {/* Decorative animated background elements */}
      <div style={{
        position: 'absolute', width: '60vw', height: '60vw',
        background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
        opacity: 0.05, top: '-20%', left: '-10%', filter: 'blur(60px)',
        animation: 'pulseBg 10s infinite alternate'
      }} />
      <div style={{
        position: 'absolute', width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
        opacity: 0.05, bottom: '-20%', right: '-10%', filter: 'blur(60px)',
        animation: 'pulseBg 8s infinite alternate-reverse'
      }} />

      <style>{`
        @keyframes pulseBg {
          0% { transform: scale(1); opacity: 0.03; }
          100% { transform: scale(1.2); opacity: 0.08; }
        }
        .setup-card {
          max-width: 500px; width: 100%;
          background: rgba(20, 20, 20, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 3.5rem 3rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          text-align: center;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;
          position: relative;
          z-index: 10;
        }
        .step-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .btn-primary {
          background: var(--accent);
          color: black;
          border: none;
          padding: 1rem;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
          filter: brightness(1.1);
        }
        .btn-primary:active { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; filter: none; }
      `}</style>

      <div className="setup-card step-enter" key={step}>
        
        {step === 0 && (
          <>
            <img src="/logo.png" alt="Muffin TV" style={{ width: '100px', height: '100px', objectFit: 'contain', marginBottom: '1.5rem', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }} />
            <h1 style={{ marginBottom: '1rem', fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px' }}>Welcome to Muffin</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.1rem', lineHeight: 1.6 }}>
              The ultimate self-hosted streaming experience. Let's get things set up in just a few quick steps.
            </p>
            <button className="btn-primary" onClick={() => { sound.playSelect(); setStep(1); }}>
              Let's Begin
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>Connect TMDB</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1rem', lineHeight: 1.5 }}>
              Muffin uses TMDB for all metadata. You can get a free API key at <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>themoviedb.org</a>.
            </p>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.95rem' }}>
                {error}
              </div>
            )}
            
            <form onSubmit={validateAndSaveKey} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <input 
                type="text" 
                placeholder="Paste your TMDB API Key"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '1.2rem',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1.1rem',
                  width: '100%',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.05), inset 0 2px 4px rgba(0,0,0,0.2)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'; }}
              />
              <button type="submit" className="btn-primary" disabled={loading || !apiKey.trim()}>
                {loading ? 'Validating...' : 'Verify & Continue'}
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>Make it Yours</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1rem', lineHeight: 1.5 }}>
              Choose your preferred accent color for the interface. You can always change this later in settings.
            </p>

            <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginBottom: '3rem' }}>
              {[
                { name: 'Ochre (Default)', class: '', color: '#b3594b' },
                { name: 'Blue', class: 'theme-blue', color: '#4b7eb3' },
                { name: 'Green', class: 'theme-green', color: '#4bb36a' },
                { name: 'Purple', class: 'theme-purple', color: '#8e4bb3' },
                { name: 'Crimson', class: 'theme-crimson', color: '#b32a2a' }
              ].map(theme => {
                const isActive = selectedTheme === theme.class || (selectedTheme === '' && theme.class === '');
                return (
                  <button
                    key={theme.name}
                    type="button"
                    title={theme.name}
                    onClick={() => handleThemeSelect(theme.class)}
                    style={{
                      width: '3.5rem',
                      height: '3.5rem',
                      borderRadius: '50%',
                      backgroundColor: theme.color,
                      border: isActive ? '3px solid #fff' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isActive ? `0 0 20px ${theme.color}80` : '0 4px 10px rgba(0,0,0,0.3)',
                      transform: isActive ? 'scale(1.1)' : 'scale(1)'
                    }}
                    onMouseOver={(e) => { if(!isActive) e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseOut={(e) => { if(!isActive) e.currentTarget.style.transform = 'scale(1)'; }}
                  />
                );
              })}
            </div>

            <button className="btn-primary" onClick={() => { sound.playSelect(); setStep(3); }}>
              Continue
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
              color: '#10b981'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 style={{ marginBottom: '1rem', fontSize: '2rem', fontWeight: 700 }}>All Set!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.1rem', lineHeight: 1.6 }}>
              Your installation is complete. Enjoy your seamless streaming experience.
            </p>
            <button className="btn-primary" onClick={handleFinish}>
              Launch Muffin TV
            </button>
          </>
        )}
      </div>

      {/* Step Indicators */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '2.5rem', zIndex: 10 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ 
            width: i === step ? '24px' : '8px', 
            height: '8px', 
            borderRadius: '4px', 
            background: i === step ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease'
          }} />
        ))}
      </div>
    </div>
  );
}
