import { useState, useEffect } from 'react';

const WATCHLIST_KEY = 'streambert_watchlist';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) {
        setWatchlist(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load watchlist from localStorage', err);
    }
  }, []);

  const saveWatchlist = (newList) => {
    setWatchlist(newList);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newList));
    // Dispatch a custom event so other components (like Library) can sync across tabs/components
    window.dispatchEvent(new Event('watchlist_updated'));
  };

  const addToWatchlist = (item) => {
    // item should be { id, title, poster_path, media_type }
    setWatchlist((prev) => {
      if (prev.some(w => w.id === item.id)) return prev;
      const newList = [item, ...prev];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newList));
      window.dispatchEvent(new Event('watchlist_updated'));
      return newList;
    });
  };

  const removeFromWatchlist = (id) => {
    setWatchlist((prev) => {
      const newList = prev.filter(w => w.id !== id);
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newList));
      window.dispatchEvent(new Event('watchlist_updated'));
      return newList;
    });
  };

  const isInWatchlist = (id) => {
    return watchlist.some(w => w.id === id);
  };

  // Sync state if another component updates it
  useEffect(() => {
    const handleSync = () => {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) setWatchlist(JSON.parse(stored));
    };
    window.addEventListener('watchlist_updated', handleSync);
    return () => window.removeEventListener('watchlist_updated', handleSync);
  }, []);

  return { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist };
}
