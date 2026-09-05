import { useState, useEffect } from 'react';
import { api } from '../../api/client';

export default function Downloads() {
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDownloads = async () => {
    try {
      const data = await api.downloads.list();
      // data is returned as an array based on downloadManager.js
      setDownloads(data || []);
    } catch (err) {
      console.error('Failed to load downloads', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloads();
    const interval = setInterval(fetchDownloads, 2000); // Fast polling for progress
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (id) => {
    await api.downloads.cancel(id).catch(console.error);
    fetchDownloads();
  };

  const handleDelete = async (id, deleteFile) => {
    if (confirm('Are you sure you want to delete this download?')) {
      await api.downloads.delete(id, deleteFile).catch(console.error);
      fetchDownloads();
    }
  };

  return (
    <div className="container page-transition" style={{ paddingTop: '8rem', minHeight: '100vh', paddingBottom: '4rem' }}>
      <h1 className="text-hero" style={{ marginBottom: '4rem', fontSize: '4rem' }}>
        DOWNLOADS
      </h1>

      {loading ? (
        <p className="text-metadata">Loading downloads...</p>
      ) : downloads.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {downloads.map(dl => (
            <div 
              key={dl.id}
              className="glass-panel"
              style={{
                display: 'flex',
                gap: '2rem',
                padding: '1.5rem',
                alignItems: 'center',
                backgroundColor: 'rgba(20,20,22,0.8)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px'
              }}
            >
              {dl.posterPath ? (
                <img 
                  src={`https://image.tmdb.org/t/p/w185${dl.posterPath}`} 
                  alt={dl.name}
                  style={{ width: '80px', height: '120px', objectFit: 'cover', borderRadius: '4px' }}
                />
              ) : (
                <div style={{ width: '80px', height: '120px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }} />
              )}
              
              <div style={{ flex: 1 }}>
                <h3 className="text-h3" style={{ margin: '0 0 0.5rem 0' }}>{dl.name}</h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="text-metadata" style={{ 
                    color: dl.status === 'completed' ? '#4CAF50' : dl.status === 'error' ? '#f44336' : 'var(--text-metadata)' 
                  }}>
                    {dl.status.toUpperCase()}
                  </span>
                  <span className="text-metadata">{dl.progress.toFixed(1)}%</span>
                </div>
                
                {/* Progress Bar */}
                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${dl.progress}%`, 
                    backgroundColor: dl.status === 'completed' ? '#4CAF50' : dl.status === 'error' ? '#f44336' : 'var(--accent)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                
                <p className="text-metadata" style={{ fontSize: '0.75rem', textTransform: 'none', margin: 0 }}>
                  {dl.lastMessage || 'Waiting...'}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dl.status === 'downloading' && (
                  <button 
                    onClick={() => handleCancel(dl.id)}
                    style={{ padding: '0.5rem 1rem', border: '1px solid var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    CANCEL
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(dl.id, dl.status === 'completed')}
                  style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(244,67,54,0.1)', color: '#f44336', border: '1px solid rgba(244,67,54,0.3)', borderRadius: '4px', cursor: 'pointer' }}
                >
                  DELETE
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-metadata">No active or completed downloads.</p>
      )}
    </div>
  );
}
