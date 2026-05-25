'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TypingEntry } from '@/lib/types';

const TYPING_TIMEOUT = 3000; // ms

/**
 * Returns:
 * - `typingUsers`: list of other users currently typing in the active chat
 * - `onInputChange`: call this from the message input's onChange handler
 */
export function useTyping(
  groupId: string | null,
  userId: string | undefined,
  userName: string | undefined
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // ── Write typing status ─────────────────────────────────────────────────────
  const startTyping = useCallback(async () => {
    if (!groupId || !userId || !userName) return;
    isTypingRef.current = true;
    await setDoc(doc(db, 'groups', groupId, 'typing', userId), {
      userId,
      userName,
      timestamp: Date.now(),
    } satisfies TypingEntry);
  }, [groupId, userId, userName]);

  const stopTyping = useCallback(async () => {
    if (!groupId || !userId) return;
    isTypingRef.current = false;
    await deleteDoc(doc(db, 'groups', groupId, 'typing', userId));
  }, [groupId, userId]);

  /** Call from the input's onChange */
  const onInputChange = useCallback(() => {
    if (!isTypingRef.current) startTyping();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(stopTyping, TYPING_TIMEOUT);
  }, [startTyping, stopTyping]);

  // Cleanup on unmount / group switch
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopTyping();
    };
  }, [stopTyping, groupId]);

  return { onInputChange };
}

/**
 * Subscribe to typing events for a given group.
 * Returns users currently typing (excluding self).
 */
export function useTypingSubscription(
  groupId: string | null,
  currentUserId: string | undefined
): TypingEntry[] {
  const [typingUsers, setTypingUsers] = (
    // eslint-disable-next-line react-hooks/rules-of-hooks
    require('react').useState as typeof import('react').useState<TypingEntry[]>
  )([]);

  useEffect(() => {
    if (!groupId) {
      setTypingUsers([]);
      return;
    }
    const ref = collection(db, 'groups', groupId, 'typing');
    return onSnapshot(ref, (snap) => {
      const data = snap.docs
        .map((d) => d.data() as TypingEntry)
        .filter(
          (e) =>
            e.userId !== currentUserId &&
            Date.now() - e.timestamp < 5000 // stale entries are ignored
        );
      setTypingUsers(data);
    });
  }, [groupId, currentUserId]);

  return typingUsers;
}