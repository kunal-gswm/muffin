import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    // Initial load from backend API
    const loadLibrary = async () => {
      try {
        const data = await api.library.get();
        if (data) {
          // Convert the dictionary to an array and sort by savedAt descending (newest first)
          const items = Object.values(data).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
          setWatchlist(items);
        }
      } catch (err) {
        console.error('Failed to load library from backend', err);
      }
    };
    loadLibrary();
  }, []);

  const addToWatchlist = (item) => {
    // item should be { id, title, poster_path, media_type }
    setWatchlist((prev) => {
      if (prev.some(w => w.id === item.id)) return prev;
      const newList = [item, ...prev];
      // Optimistically dispatch sync event for UI
      window.dispatchEvent(new CustomEvent('watchlist_updated', { detail: newList }));
      return newList;
    });

    // Fire API request in background
    api.library.add(item.id, item).catch(err => {
      console.error('Failed to add to backend library', err);
    });
  };

  const removeFromWatchlist = (id) => {
    setWatchlist((prev) => {
      const newList = prev.filter(w => w.id !== id);
      window.dispatchEvent(new CustomEvent('watchlist_updated', { detail: newList }));
      return newList;
    });

    // Fire API request in background
    api.library.remove(id).catch(err => {
      console.error('Failed to remove from backend library', err);
    });
  };

  const isInWatchlist = (id) => {
    return watchlist.some(w => String(w.id) === String(id));
  };

  // Sync state if another component updates it
  useEffect(() => {
    const handleSync = (e) => {
      if (e.detail) {
        setWatchlist(e.detail);
      } else {
        // Fallback to refetching from backend if detail is missing
        api.library.get().then(data => {
          if (data) {
             const items = Object.values(data).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
             setWatchlist(items);
          }
        }).catch(err => console.error('Failed to sync library', err));
      }
    };
    window.addEventListener('watchlist_updated', handleSync);
    return () => window.removeEventListener('watchlist_updated', handleSync);
  }, []);

  return { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist };
}
