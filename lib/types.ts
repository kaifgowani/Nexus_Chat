// ─── Core Data Models ─────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  handle: string;         // Unique @handle, e.g. "alex99"
  name: string;
  email: string;
  photoURL?: string;
  statusText?: string;
  isOnline: boolean;
  lastSeen?: number;      // Unix ms — updated every minute while active
  joinedAt: number;
  role: 'admin' | 'user';
  mfaEnabled: boolean;
  friends: string[];      // Array of user IDs
  blocked: string[];      // Array of blocked user IDs
  fcmToken?: string;      // Firebase Cloud Messaging token for push notifications
}

export interface Group {
  id: string;
  name?: string;
  type: 'channel' | 'dm';
  createdAt: number;
  createdBy?: string;
  members?: string[];     // Used for DMs
  isPrivate?: boolean;    // Private channels require an invite
  inviteCode?: string;    // Shareable join code for private channels
}

export interface Message {
  id: string;
  groupId: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: number;
  // Media
  mediaURL?: string;
  mediaType?: 'image' | 'video' | 'file';
  mediaName?: string;
  // Link Preview (populated by Cloud Function)
  linkPreview?: {
    url: string;
    title: string;
    description: string;
    image: string;
  };
  // Engagement
  readBy?: string[];                          // Array of userIds who've seen this message
  reactions?: Record<string, string[]>;       // e.g. { "👍": ["uid1","uid2"], "❤️": ["uid3"] }
  // Moderation
  isDeleted?: boolean;
  isEdited?: boolean;
  editedAt?: number;
  // Threading
  replyToId?: string;
  replyToText?: string;
  replyToSender?: string;
}

// ─── Sub-collection: groups/{id}/typing/{userId} ──────────────────────────────
export interface TypingEntry {
  userId: string;
  userName: string;
  timestamp: number;
}

// ─── Moderation ───────────────────────────────────────────────────────────────
export interface Report {
  id: string;
  messageId: string;
  messageText: string;
  reporterId: string;
  offenderId: string;
  offenderName: string;
  reason: string;
  createdAt: number;
  resolved: boolean;
}

// ─── UI ───────────────────────────────────────────────────────────────────────
export interface ToastMsg {
  id: number;
  type: 'success' | 'error' | 'info';
  title: string;
  text: string;
}

export type ShowToast = (title: string, text: string, type?: 'success' | 'error' | 'info') => void;