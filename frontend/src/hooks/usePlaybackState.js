import { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';

export function usePlaybackState(mediaData, season, episode) {
  const [progress, setProgress] = useState(null);
  const lastSync = useRef(0);

  // Load progress on mount
  useEffect(() => {
    if (!mediaData || !mediaData.id) return;
    
    api.history.getProgress(mediaData.media_type, mediaData.id)
      .then(res => {
        if (res && res.currentTime) {
          setProgress(res);
        }
      })
      .catch(err => console.error('Failed to load progress', err));
  }, [mediaData?.id]);

  const saveProgress = (currentTime, duration, isFinished = false) => {
    if (!mediaData || !mediaData.id) return;

    // Debounce save to max once every 3 seconds to avoid spamming the backend
    const now = Date.now();
    if (now - lastSync.current < 3000 && !isFinished && duration > 0) return;
    lastSync.current = now;

    const payload = {
      id: mediaData.id.toString(),
      title: mediaData.title || mediaData.name,
      posterPath: mediaData.poster_path || mediaData.coverImage?.large,
      type: mediaData.media_type,
      season,
      episode,
      currentTime,
      duration,
      isFinished
    };

    setProgress(payload);

    api.history.save(payload)
      .then(() => {
        window.dispatchEvent(new Event('progress_updated'));
      })
      .catch(err => console.error('Failed to save progress', err));
  };

  const markOpened = () => {
    // For embeds, we can't track exact time, so we just track that they opened it.
    saveProgress(0, 0, false);
  };

  return { progress, saveProgress, markOpened };
}
