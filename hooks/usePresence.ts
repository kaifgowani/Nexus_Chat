'use client';

import { useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Keeps `isOnline` and `lastSeen` up to date while the user is active.
 * Runs on a 60-second heartbeat and also responds to visibility changes.
 */
export function usePresence(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const tick = () => {
      setDoc(
        doc(db, 'users', userId),
        { isOnline: true, lastSeen: Date.now() },
        { merge: true }
      );
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
      } else {
        setDoc(
          doc(db, 'users', userId),
          { isOnline: false, lastSeen: Date.now() },
          { merge: true }
        );
      }
    };

    tick(); // immediate on mount
    const interval = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userId]);
}

/** Format a lastSeen timestamp into a human-readable string */
export function formatLastSeen(lastSeen?: number): string {
  if (!lastSeen) return 'a while ago';
  const diff = Date.now() - lastSeen;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (diff < 60_000) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}