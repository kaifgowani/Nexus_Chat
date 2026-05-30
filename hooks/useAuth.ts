'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, Group, Message } from '@/lib/types';

export function useAuth() {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // ── Step 1: watch auth state ────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) {
        setCurrentUserProfile(null);
        setProfileLoaded(false);
        setUsers([]);
        setGroups([]);
        setMessages([]);
      }
    });
  }, []);

  // ── Step 2: once logged in, subscribe to Firestore collections ─────────────
  useEffect(() => {
    if (!user) return;

    // Mark user online
    setDoc(doc(db, 'users', user.uid), { isOnline: true, lastSeen: Date.now() }, { merge: true });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile));
      setUsers(data);
      const mine = data.find((u2) => u2.id === user.uid);
      if (mine?.handle) {
        setCurrentUserProfile(mine);
      } else {
        setCurrentUserProfile(null);
      }
      setProfileLoaded(true);
    });

    const unsubGroups = onSnapshot(collection(db, 'groups'), (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Group))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setGroups(data);
    });

    const unsubMessages = onSnapshot(collection(db, 'messages'), (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Message))
        .sort((a, b) => a.createdAt - b.createdAt);
      setMessages(data);
    });

    const handleUnload = () => {
      setDoc(doc(db, 'users', user.uid), { isOnline: false, lastSeen: Date.now() }, { merge: true });
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      unsubUsers();
      unsubGroups();
      unsubMessages();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user]);

  return { user, authLoading, profileLoaded, currentUserProfile, users, groups, messages };
}