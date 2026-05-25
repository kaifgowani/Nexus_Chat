/**
 * Nexus Chat — Firebase Cloud Functions
 *
 * Two functions:
 *  1. fetchLinkPreview  — HTTP endpoint called by client to scrape OG metadata
 *     (avoids CORS issues and keeps API keys server-side)
 *  2. sendPushOnMessage — Firestore trigger that sends FCM notifications
 *     to all group members who are NOT currently online
 *
 * Deploy:
 *   cd functions && npm install && firebase deploy --only functions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// ─── 1. Link Preview ──────────────────────────────────────────────────────────
export const fetchLinkPreview = functions.https.onRequest(async (req, res) => {
  // CORS headers (restrict to your domain in production)
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  const url = req.query.url as string;
  if (!url) { res.status(400).json({ error: 'Missing url parameter' }); return; }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'NexusChatBot/1.0' },
      redirect: 'follow',
    });
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const getMeta = (property: string) =>
      doc.querySelector(`meta[property="${property}"]`)?.getAttribute('content') ||
      doc.querySelector(`meta[name="${property}"]`)?.getAttribute('content') || '';

    const preview = {
      url,
      title: getMeta('og:title') || doc.querySelector('title')?.textContent || '',
      description: getMeta('og:description') || getMeta('description') || '',
      image: getMeta('og:image') || '',
    };

    res.json(preview);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch preview' });
  }
});

// ─── 2. On New Message → send FCM to offline members ─────────────────────────
export const sendPushOnMessage = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap) => {
    const message = snap.data();
    if (!message || message.isDeleted) return;

    try {
      // Get the group to find members
      const groupDoc = await db.doc(`groups/${message.groupId}`).get();
      const group = groupDoc.data();
      if (!group) return;

      // Get all members (DM: group.members; channels: everyone)
      let recipientIds: string[] = [];
      if (group.type === 'dm' && Array.isArray(group.members)) {
        recipientIds = group.members.filter((id: string) => id !== message.senderId);
      } else {
        // For public channels, query all users
        const usersSnap = await db.collection('users').get();
        recipientIds = usersSnap.docs
          .map(d => d.id)
          .filter(id => id !== message.senderId);
      }

      // Filter to offline users with FCM tokens
      const tokensToNotify: string[] = [];
      for (const uid of recipientIds) {
        const userDoc = await db.doc(`users/${uid}`).get();
        const userData = userDoc.data();
        if (userData && !userData.isOnline && userData.fcmToken) {
          tokensToNotify.push(userData.fcmToken);
        }
      }

      if (tokensToNotify.length === 0) return;

      // Build the notification
      const channelName = group.type === 'dm' ? message.senderName : `#${group.name}`;
      const body = message.mediaURL
        ? `${message.senderName} sent a file`
        : message.text.length > 100
        ? message.text.substring(0, 100) + '…'
        : message.text;

      // Send in batches of 500 (FCM limit)
      for (let i = 0; i < tokensToNotify.length; i += 500) {
        const batch = tokensToNotify.slice(i, i + 500);
        await messaging.sendEachForMulticast({
          tokens: batch,
          notification: {
            title: channelName,
            body,
          },
          webpush: {
            notification: {
              icon: '/favicon.ico',
              badge: '/favicon.ico',
            },
            fcmOptions: {
              link: '/',
            },
          },
        });
      }
    } catch (err) {
      functions.logger.error('sendPushOnMessage error:', err);
    }
  });

// ─── 3. On New Message → populate link preview ───────────────────────────────
export const populateLinkPreview = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap) => {
    const message = snap.data();
    const pendingURL = message?.pendingLinkPreview;
    if (!pendingURL) return;

    try {
      const response = await fetch(pendingURL, {
        headers: { 'User-Agent': 'NexusChatBot/1.0' },
        redirect: 'follow',
      });
      const html = await response.text();
      const dom = new JSDOM(html);
      const doc = dom.window.document;

      const getMeta = (property: string) =>
        doc.querySelector(`meta[property="${property}"]`)?.getAttribute('content') ||
        doc.querySelector(`meta[name="${property}"]`)?.getAttribute('content') || '';

      const preview = {
        url: pendingURL,
        title: getMeta('og:title') || doc.querySelector('title')?.textContent || '',
        description: getMeta('og:description') || getMeta('description') || '',
        image: getMeta('og:image') || '',
      };

      // Only save if we got at least a title
      if (preview.title) {
        await snap.ref.update({
          linkPreview: preview,
          pendingLinkPreview: admin.firestore.FieldValue.delete(),
        });
      }
    } catch (err) {
      functions.logger.warn('populateLinkPreview failed:', err);
      // Clean up the pending field even on failure
      await snap.ref.update({ pendingLinkPreview: admin.firestore.FieldValue.delete() });
    }
  });