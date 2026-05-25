// public/firebase-messaging-sw.js
// This file MUST be served from the root of your domain (e.g. /firebase-messaging-sw.js)
// Place it in the Next.js /public directory.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ⚠️  Replace these values with your actual Firebase project config.
// These are public values — it is safe to have them here.
firebase.initializeApp({
  apiKey: "AIzaSyAoy1ioPeDBhvOajc5uEgPC73b_gNPXRj4",        // replace or use literal string
  authDomain: "nexus-chat-171a6.firebaseapp.com",
  projectId: "nexus-chat-171a6",
  storageBucket: "nexus-chat-171a6.firebasestorage.app",
  messagingSenderId: "149619227135",
  appId: "1:149619227135:web:0dee1e4732695ca522cfca",
});

const messaging = firebase.messaging();

// Handle background push messages
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'Nexus Connect', {
    body: body || 'New message',
    icon: icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data,
  });
});

// Click on the notification → focus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});