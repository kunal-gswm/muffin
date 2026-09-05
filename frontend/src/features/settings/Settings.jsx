import { useState, useEffect } from 'react';
import { api } from '../../api/client';

export default function Settings() {
  const [settings, setSettings] = useState({
    TMDB_API_KEY: '',
    DOWNLOADER_PATH: '',
    DOWNLOAD_DIR: '',
    PREFERRED_QUALITY: '1080p',
    DEFAULT_SOURCE: 'vidsrc'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectingFolder, setSelectingFolder] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await api.settings.get();
        setSettings(prev => ({ ...prev, ...data }));
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectFolder = async () => {
    setSelectingFolder(true);
    try {
      const res = await api.settings.selectFolder();
      if (res && res.path) {
        setSettings(prev => ({ ...prev, DOWNLOAD_DIR: res.path }));
      }
    } catch (err) {
      console.error('Failed to select folder:', err);
      setMessage({ type: 'error', text: 'Failed to open folder dialog.' });
    } finally {
      setSelectingFolder(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.settings.update(settings);
      setMessage({ type: 'success', text: res.message || 'Settings saved successfully.' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--text-metadata)',
    color: 'var(--text-primary)',
    fontFamily: 'Roboto, sans-serif',
    fontSize: '1.25rem',
    padding: '0.5rem 0',
    outline: 'none',
    marginBottom: '2rem',
    transition: 'border-color 0.2s ease'
  };

  const labelStyle = {
    display: 'block',
    fontFamily: 'Oswald, sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-secondary)',
    marginBottom: '0.5rem',
    fontSize: '1rem'
  };

  if (loading) {
    return <div className="container" style={{ paddingTop: '8rem' }}><p className="text-metadata">Loading settings...</p></div>;
  }

  return (
    <div className="container page-transition" style={{ paddingTop: '8rem', paddingBottom: '6rem', maxWidth: '800px' }}>
      <h1 className="text-hero" style={{ marginBottom: '4rem' }}>SETTINGS</h1>

      <form onSubmit={handleSave} style={{ maxWidth: '800px' }}>
        
        <h3 className="text-h3" style={{ marginBottom: '2rem', color: 'var(--accent)' }}>System</h3>
        
        <label style={labelStyle}>TMDB API Key (Required)</label>
        <input 
          type="text" 
          name="TMDB_API_KEY" 
          value={settings.TMDB_API_KEY || ''} 
          onChange={handleChange} 
          style={inputStyle}
          placeholder="Enter TMDB v3 API Key"
        />

        <label style={labelStyle}>Downloader Binary Path (Absolute path to yt-dlp/ffmpeg)</label>
        <input 
          type="text" 
          name="DOWNLOADER_PATH" 
          value={settings.DOWNLOADER_PATH || ''} 
          onChange={handleChange} 
          style={inputStyle}
          placeholder="e.g. C:\bin\yt-dlp.exe"
        />

        <label style={labelStyle}>Download Directory (Where files will be saved)</label>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <input 
            type="text" 
            name="DOWNLOAD_DIR" 
            value={settings.DOWNLOAD_DIR || ''} 
            onChange={handleChange} 
            style={inputStyle}
            placeholder="e.g. C:\Users\YourName\Downloads\Muffin"
          />
          <button
            type="button"
            onClick={handleSelectFolder}
            disabled={selectingFolder}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: selectingFolder ? 'var(--text-metadata)' : 'var(--text-primary)',
              border: '1px solid var(--text-metadata)',
              cursor: selectingFolder ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '3rem',
              marginTop: '0.2rem'
            }}
            title="Browse for folder"
          >
            {selectingFolder ? '...' : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            )}
          </button>
        </div>

        <h3 className="text-h3" style={{ marginTop: '4rem', marginBottom: '2rem', color: 'var(--accent)' }}>Preferences</h3>

        <label style={labelStyle}>Preferred Streaming Quality</label>
        <select 
          name="PREFERRED_QUALITY" 
          value={settings.PREFERRED_QUALITY || '1080p'} 
          onChange={handleChange}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="2160p" style={{ color: '#000' }}>4K (2160p)</option>
          <option value="1080p" style={{ color: '#000' }}>HD (1080p)</option>
          <option value="720p" style={{ color: '#000' }}>HD (720p)</option>
          <option value="480p" style={{ color: '#000' }}>SD (480p)</option>
        </select>

        <label style={labelStyle}>Default Source Resolver</label>
        <select 
          name="DEFAULT_SOURCE" 
          value={settings.DEFAULT_SOURCE || 'vidsrc'} 
          onChange={handleChange}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="vidsrc" style={{ color: '#000' }}>VidSrc (Fastest)</option>
          <option value="videasy" style={{ color: '#000' }}>VidEasy (Reliable)</option>
          <option value="vidking" style={{ color: '#000' }}>VidKing (Alt)</option>
        </select>

        <div style={{ marginTop: '4rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <button 
            type="submit"
            disabled={saving}
            style={{
              padding: '1rem 3rem',
              backgroundColor: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              fontFamily: 'Oswald, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: saving ? 'wait' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          
          {message && (
            <p style={{ 
              color: message.type === 'error' ? 'red' : 'var(--text-metadata)',
              fontFamily: 'Roboto, sans-serif',
              margin: 0
            }}>
              {message.text}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
