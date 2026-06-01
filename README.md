# Nexus Connect 🔐

A full-featured real-time messaging application built with Next.js 14 and Firebase. Features end-to-end communication enrichment, multimedia support, moderation tools, and advanced social features.

**Tech Stack:** Next.js 14, TypeScript, Firebase (Firestore, Auth, Storage, Cloud Functions, FCM), Tailwind CSS, React Virtuoso

---

## Features

### 🔐 Authentication & Security
- Email/password and Google OAuth sign-in
- TOTP-based Two-Factor Authentication (MFA) via Google Authenticator or Authy
- Unique `@handle` system for every user
- Blocked users list

### 💬 Real-Time Messaging
- Instant messaging powered by Firestore `onSnapshot` listeners
- **Typing indicators** — animated dots with "X is typing..." powered by a Firestore sub-collection with 3-second debounce
- **Read receipts** — ✓ sent, ✓✓ seen indicators on every message
- **Emoji reactions** — 6 emoji options with per-user toggle, stored as a `reactions` map on each message
- **Message editing** — inline edit with `(edited)` tag
- **Message deletion** — soft delete with "Message deleted" placeholder
- **Virtualized message list** — renders only visible messages via `react-virtuoso`, handles 10,000+ messages

### 📎 Multimedia
- Image and file uploads via Firebase Storage (up to 10MB)
- Inline image preview in chat
- **Rich link previews** — OG metadata scraped server-side via Cloud Functions to bypass CORS

### 📢 Channels & DMs
- Public channels — searchable and joinable via Browse Channels
- Private channels — invite-only with auto-generated invite codes and shareable links (`/join/[code]`)
- Direct Messages between any two users
- Channel Settings modal with:
  - Rename channel (admin only)
  - Invite code + copyable link (public and private)
  - Member management — kick, promote/demote admins
  - Leave channel
  - Delete channel (creator only)

### 🔔 Notifications & Presence
- **Push notifications** via Firebase Cloud Messaging (FCM) — background service worker delivers notifications when the app is closed
- **Presence system** — online/offline status with 60-second heartbeat
- **Last Seen** timestamps — "just now", "5m ago", "2h ago", "3d ago"
- **Invite notifications** — bell icon with badge counter for pending channel invites with Accept/Decline

### 🛡️ Moderation & Safety
- Report system — flag messages with categorized reasons (harassment, hate speech, spam, etc.)
- Reports stored in a dedicated Firestore collection for admin review
- User blocking

### 👤 Profiles
- Avatar upload via Firebase Storage
- Display name and status message
- Profile modal with friend add/remove, block, and direct message

---

## Project Structure

```
├── app/
│   ├── page.tsx                    # Entry point
│   └── join/[code]/page.tsx        # Private channel invite link handler
├── components/
│   ├── auth/
│   │   ├── AuthScreen.tsx          # Login, register, Google OAuth, MFA
│   │   └── ProfileSetupView.tsx    # Handle setup for new Google users
│   ├── chat/
│   │   ├── ChatApp.tsx             # Main orchestrator
│   │   ├── MessageList.tsx         # Virtualized list with read receipts
│   │   ├── MessageItem.tsx         # Reactions, edit, delete, report
│   │   ├── MessageInput.tsx        # File uploads, typing trigger
│   │   ├── TypingIndicator.tsx     # Animated typing status
│   │   └── LinkPreviewCard.tsx     # OG metadata preview card
│   ├── modals/
│   │   ├── ChannelSettingsModal.tsx
│   │   ├── BrowseChannelsModal.tsx
│   │   ├── CreateChannelModal.tsx
│   │   ├── ReportModal.tsx
│   │   ├── SearchModal.tsx
│   │   ├── SettingsModal.tsx
│   │   └── UserProfileModal.tsx
│   ├── sidebar/
│   │   ├── LeftSidebar.tsx
│   │   └── RightSidebar.tsx
│   └── ui/
│       ├── Toast.tsx
│       └── InvitesPanel.tsx
├── hooks/
│   ├── useAuth.ts                  # Auth state + Firestore subscriptions
│   ├── usePresence.ts              # Online/lastSeen heartbeat
│   ├── useTyping.ts                # Typing indicator read/write
│   └── useFCMToken.ts              # Push notification registration
├── lib/
│   ├── firebase.ts                 # Firebase initialization
│   └── types.ts                    # TypeScript interfaces
├── functions/
│   └── src/index.ts                # Cloud Functions: link preview + FCM push
└── public/
    └── firebase-messaging-sw.js    # FCM background service worker
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- Firebase project with Firestore, Authentication, Storage, and Cloud Functions enabled
- Firebase Blaze plan (required for Storage and Cloud Functions)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/nexus-chat.git
cd nexus-chat
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

Get your Firebase config from **Firebase Console → Project Settings → General**.
Get your VAPID key from **Firebase Console → Project Settings → Cloud Messaging → Web Push certificates**.

### Run Locally

```bash
npm run dev
```

### Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

### Deploy to Vercel

Connect your GitHub repository to Vercel and add all environment variables under **Project Settings → Environment Variables**.

---

## Firestore Security Rules

Paste these rules in **Firebase Console → Firestore → Rules**:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    match /groups/{groupId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null
                    && resource.data.createdBy == request.auth.uid;

      match /typing/{uid} {
        allow read: if request.auth != null;
        allow write: if request.auth.uid == uid;
      }
    }

    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth.uid == resource.data.senderId
                    || request.resource.data.diff(resource.data).affectedKeys()
                         .hasOnly(['readBy', 'reactions', 'linkPreview', 'pendingLinkPreview']);
    }

    match /invites/{inviteId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null
                  && (request.auth.uid == resource.data.recipientId
                   || request.auth.uid == resource.data.senderId);
      allow update: if request.auth != null
                    && request.auth.uid == resource.data.recipientId
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status']);
    }

    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read, update: if false;
    }
  }
}
```

---

## License

MIT
