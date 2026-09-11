import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

export default function ProfileSelect({ onProfileSelected }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [profileToDelete, setProfileToDelete] = useState(null);

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

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    
    try {
      const newProfile = {
        id: 'profile_' + Date.now(),
        name: newProfileName.trim()
      };
      await api.profiles.save(newProfile);
      setNewProfileName('');
      setIsCreating(false);
      fetchProfiles();
    } catch (err) {
      console.error('Failed to create profile', err);
    }
  };

  const handleDeleteClick = (e, profile) => {
    e.stopPropagation();
    setProfileToDelete(profile);
  };

  const confirmDeleteProfile = async () => {
    if (!profileToDelete) return;
    try {
      await api.profiles.delete(profileToDelete.id);
      setProfileToDelete(null);
      fetchProfiles();
    } catch (err) {
      console.error('Failed to delete profile', err);
    }
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
              overflow: 'hidden',
              position: 'relative'
            }}>
              <button
                onClick={(e) => handleDeleteClick(e, p)}
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  fontSize: '12px'
                }}
                title="Delete Profile"
              >
                ✕
              </button>
              {p.avatar ? (
                <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '3rem' }}>{p.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span style={{ fontSize: '1.25rem', fontFamily: 'Oswald, sans-serif' }}>{p.name}</span>
          </button>
        ))}

        {/* Create Profile Button */}
        <button 
          onClick={() => setIsCreating(true)}
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
            border: '2px dashed var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '3rem', color: 'var(--text-muted)' }}>+</span>
          </div>
          <span style={{ fontSize: '1.25rem', fontFamily: 'Oswald, sans-serif', color: 'var(--text-muted)' }}>Add Profile</span>
        </button>
      </div>

      {isCreating && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1001,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <form onSubmit={handleCreateProfile} className="glass-panel" style={{
            padding: '2rem', borderRadius: '12px',
            display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '300px'
          }}>
            <h2 className="text-h3" style={{ margin: 0, textTransform: 'uppercase' }}>Add Profile</h2>
            <input 
              type="text" 
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="Profile Name"
              autoFocus
              style={{
                padding: '0.85rem', 
                borderRadius: '8px', 
                border: '1px solid rgba(255,255,255,0.2)',
                backgroundColor: 'rgba(0,0,0,0.4)', 
                color: 'white',
                fontSize: '1rem',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.border = '1px solid var(--accent)'}
              onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.2)'}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" onClick={() => setIsCreating(false)} style={{
                padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer'
              }}>Cancel</button>
              <button type="submit" disabled={!newProfileName.trim()} style={{
                padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--accent)', color: 'white', cursor: 'pointer',
                opacity: !newProfileName.trim() ? 0.5 : 1
              }}>Create</button>
            </div>
          </form>
        </div>
      )}

      {profileToDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1001,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel" style={{
            padding: '2rem', borderRadius: '12px',
            display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '350px'
          }}>
            <h2 className="text-h3" style={{ margin: 0, textTransform: 'uppercase' }}>Delete Profile?</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to delete the profile <strong>{profileToDelete.name}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setProfileToDelete(null)} style={{
                padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer'
              }}>Cancel</button>
              <button type="button" onClick={confirmDeleteProfile} style={{
                padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none',
                backgroundColor: '#f44336', color: 'white', cursor: 'pointer'
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
