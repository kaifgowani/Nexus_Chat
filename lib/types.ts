// ─── Core Data Models ─────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  handle: string;
  name: string;
  email: string;
  photoURL?: string;
  statusText?: string;
  isOnline: boolean;
  lastSeen?: number;
  joinedAt: number;
  role: 'admin' | 'user';
  mfaEnabled: boolean;
  friends: string[];
  blocked: string[];
  fcmToken?: string;
}

export interface Group {
  id: string;
  name?: string;
  type: 'channel' | 'dm';
  createdAt: number;
  createdBy?: string;
  members?: string[];     // Used for DMs and private channels
  admins?: string[];      // userIds with admin privileges in this channel
  isPrivate?: boolean;
  inviteCode?: string;
}

export interface Message {
  id: string;
  groupId: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: number;
  mediaURL?: string;
  mediaType?: 'image' | 'video' | 'file';
  mediaName?: string;
  linkPreview?: {
    url: string;
    title: string;
    description: string;
    image: string;
  };
  readBy?: string[];
  reactions?: Record<string, string[]>;
  isDeleted?: boolean;
  isEdited?: boolean;
  editedAt?: number;
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

// ─── Invites ──────────────────────────────────────────────────────────────────
export interface Invite {
  id: string;
  groupId: string;
  groupName: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
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