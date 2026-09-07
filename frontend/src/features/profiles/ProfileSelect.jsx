import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

export default function ProfileSelect({ onProfileSelected }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const data = await api.profiles.get();
      setProfiles(data || []);
    } catch (err) {
      console.error('Failed to fetch profiles', err);
    } finally {
      setLoading(false);
    }
  };

  const selectProfile = (profile) => {
    // Save to local storage so the rest of the app knows who is active
    localStorage.setItem('muffin_active_profile', JSON.stringify(profile));
    onProfileSelected(profile);
  };

  if (loading) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'var(--bg-primary)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      <h1 className="text-h2" style={{ marginBottom: '3rem' }}>Who's Watching?</h1>
      
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {profiles.map(p => (
          <button 
            key={p.id}
            onClick={() => selectProfile(p)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
              transition: 'transform 0.2s ease',
              width: '150px'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{
              width: '120px', height: '120px', borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '2px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {p.avatar ? (
                <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '3rem' }}>{p.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span style={{ fontSize: '1.25rem', fontFamily: 'Oswald, sans-serif' }}>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
