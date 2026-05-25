'use client';

import { useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db, getMessagingInstance } from '@/lib/firebase';

/**
 * Call this once the user is authenticated.
 * Requests notification permission, gets the FCM token,
 * and saves it to the user's Firestore document.
 *
 * VAPID key: get it from Firebase Console →
 *   Project Settings → Cloud Messaging → Web Push certificates → Key pair
 */
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

export function useFCMToken(userId: string | undefined) {
  useEffect(() => {
    if (!userId || !VAPID_KEY) return;

    const register = async () => {
      try {
        const messagingInstance = await getMessagingInstance();
        if (!messagingInstance) return; // browser doesn't support FCM

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const token = await getToken(messagingInstance, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: await navigator.serviceWorker.register(
            '/firebase-messaging-sw.js'
          ),
        });

        if (token) {
          await setDoc(doc(db, 'users', userId), { fcmToken: token }, { merge: true });
        }
      } catch (err) {
        // Silently fail — FCM is a nice-to-have, not critical
        console.warn('FCM registration failed:', err);
      }
    };

    register();
  }, [userId]);
}