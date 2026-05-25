'use client';

import { useEffect, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { MessageCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import MessageItem from './MessageItem';
import type { Message, UserProfile } from '@/lib/types';

interface Props {
  messages: Message[];
  users: UserProfile[];
  currentUserProfile: UserProfile;
  onClickUser: (user: UserProfile) => void;
  onReport: (message: Message) => void;
}

export default function MessageList({ messages, users, currentUserProfile, onClickUser, onReport }: Props) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // ── Mark messages as read ──────────────────────────────────────────────────
  useEffect(() => {
    if (!messages.length) return;
    // Batch mark unread messages as read
    const unread = messages.filter(
      m => m.senderId !== currentUserProfile.id && !m.readBy?.includes(currentUserProfile.id)
    );
    unread.forEach(m => {
      updateDoc(doc(db, 'messages', m.id), {
        readBy: arrayUnion(currentUserProfile.id),
      }).catch(() => {});
    });
  }, [messages, currentUserProfile.id]);

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-4">
        <MessageCircle className="h-12 w-12 text-slate-700 mb-4" />
        <p>This is the beginning of your chat history.</p>
      </div>
    );
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      data={messages}
      followOutput="smooth"
      initialTopMostItemIndex={messages.length - 1}
      style={{ flex: 1 }}
      itemContent={(index, msg) => {
        const prev = messages[index - 1];
        const isConsecutive =
          index > 0 &&
          prev.senderId === msg.senderId &&
          msg.createdAt - prev.createdAt < 300_000; // 5 min

        const senderProfile = users.find(u => u.id === msg.senderId);

        return (
          <MessageItem
            key={msg.id}
            message={msg}
            isConsecutive={isConsecutive}
            senderProfile={senderProfile}
            currentUserProfile={currentUserProfile}
            onClickUser={onClickUser}
            onReport={onReport}
          />
        );
      }}
      components={{
        // Extra padding at the top so the first message doesn't sit under the header
        Header: () => <div style={{ paddingTop: 16 }} />,
        Footer: () => <div style={{ paddingBottom: 8 }} />,
      }}
    />
  );
}