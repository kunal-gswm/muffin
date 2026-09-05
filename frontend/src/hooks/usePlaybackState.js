import { useEffect, useState } from 'react';

const PROGRESS_KEY = 'streambert_progress';

export function usePlaybackState(mediaData, season, episode) {
  const [progress, setProgress] = useState(null);

  // Load progress on mount
  useEffect(() => {
    if (!mediaData || !mediaData.id) return;
    try {
      const stored = localStorage.getItem(PROGRESS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[mediaData.id]) {
          setProgress(parsed[mediaData.id]);
        }
      }
    } catch (err) {
      console.error('Failed to load progress', err);
    }
  }, [mediaData?.id]);

  const saveProgress = (currentTime, duration, isFinished = false) => {
    if (!mediaData || !mediaData.id) return;

    try {
      const stored = localStorage.getItem(PROGRESS_KEY);
      const parsed = stored ? JSON.parse(stored) : {};

      const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;
      
      parsed[mediaData.id] = {
        id: mediaData.id,
        title: mediaData.title || mediaData.name,
        poster_path: mediaData.poster_path || mediaData.coverImage?.large,
        media_type: mediaData.media_type,
        season,
        episode,
        currentTime,
        duration,
        percentage,
        isFinished,
        updatedAt: Date.now()
      };

      localStorage.setItem(PROGRESS_KEY, JSON.stringify(parsed));
      window.dispatchEvent(new Event('progress_updated'));
    } catch (err) {
      console.error('Failed to save progress', err);
    }
  };

  const markOpened = () => {
    // For embeds, we can't track exact time, so we just track that they opened it.
    saveProgress(0, 0, false);
  };

  return { progress, saveProgress, markOpened };
}
