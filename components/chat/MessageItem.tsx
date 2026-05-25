'use client';

import { useState, useRef } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, setDoc } from 'firebase/firestore';
import { Trash2, Edit2, Flag, Check, CheckCheck, MoreHorizontal, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import LinkPreviewCard from './LinkPreviewCard';
import type { Message, UserProfile } from '@/lib/types';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

interface Props {
  message: Message;
  isConsecutive: boolean;
  senderProfile?: UserProfile;
  currentUserProfile: UserProfile;
  onClickUser: (user: UserProfile) => void;
  onReport: (message: Message) => void;
}

export default function MessageItem({ message, isConsecutive, senderProfile, currentUserProfile, onClickUser, onReport }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwnMessage = message.senderId === currentUserProfile.id;
  const isDeleted = message.isDeleted;

  // ── Reactions ─────────────────────────────────────────────────────────────
  const handleReaction = async (emoji: string) => {
    setShowEmojiPicker(false);
    const currentReactors = message.reactions?.[emoji] || [];
    const hasReacted = currentReactors.includes(currentUserProfile.id);
    const update = hasReacted
      ? { [`reactions.${emoji}`]: arrayRemove(currentUserProfile.id) }
      : { [`reactions.${emoji}`]: arrayUnion(currentUserProfile.id) };
    await updateDoc(doc(db, 'messages', message.id), update);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setShowMenu(false);
    await updateDoc(doc(db, 'messages', message.id), { isDeleted: true, text: '' });
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editText.trim() || editText === message.text) { setIsEditing(false); return; }
    await updateDoc(doc(db, 'messages', message.id), {
      text: editText.trim(),
      isEdited: true,
      editedAt: Date.now(),
    });
    setIsEditing(false);
  };

  // ── Read receipt indicator ─────────────────────────────────────────────────
  const readCount = message.readBy?.length || 0;
  const isReadByOthers = readCount > (isOwnMessage ? 1 : 0);

  // ── Inline media ──────────────────────────────────────────────────────────
  const renderMedia = () => {
    if (!message.mediaURL) return null;
    if (message.mediaType === 'image') {
      return (
        <a href={message.mediaURL} target="_blank" rel="noopener noreferrer">
          <img src={message.mediaURL} alt="attachment" className="mt-2 max-w-xs rounded-lg border border-slate-700 hover:opacity-90 transition-opacity cursor-pointer" />
        </a>
      );
    }
    return (
      <a href={message.mediaURL} target="_blank" rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
        📎 {message.mediaName || 'Download file'}
      </a>
    );
  };

  // ── Reaction summary ──────────────────────────────────────────────────────
  const reactionEntries = Object.entries(message.reactions || {}).filter(([, uids]) => uids.length > 0);

  return (
    <div
      className={`flex gap-3 group relative ${isConsecutive ? 'mt-0.5' : 'mt-4'} hover:bg-slate-800/30 px-4 py-1 -mx-4 rounded-lg transition-colors`}
      onMouseLeave={() => { setShowMenu(false); setShowEmojiPicker(false); }}
    >
      {/* Avatar or spacer */}
      {!isConsecutive ? (
        <img
          src={senderProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.senderName}`}
          alt="avatar"
          className="h-10 w-10 rounded-md bg-slate-800 flex-shrink-0 cursor-pointer object-cover mt-0.5"
          onClick={() => senderProfile && onClickUser(senderProfile)}
        />
      ) : (
        <div className="w-10 flex-shrink-0 text-[10px] text-slate-600 text-right opacity-0 group-hover:opacity-100 pt-1">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Header row */}
        {!isConsecutive && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span
              className="font-semibold text-slate-100 cursor-pointer hover:underline"
              onClick={() => senderProfile && onClickUser(senderProfile)}
            >
              {message.senderName}
            </span>
            <span className="text-xs text-slate-500">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {message.isEdited && <span className="text-[10px] text-slate-600">(edited)</span>}
          </div>
        )}

        {/* Reply thread preview */}
        {message.replyToId && message.replyToSender && (
          <div className="mb-1 pl-2 border-l-2 border-slate-600 text-xs text-slate-500">
            <span className="text-slate-400 font-medium">{message.replyToSender}</span>: {message.replyToText}
          </div>
        )}

        {/* Message content */}
        {isDeleted ? (
          <p className="text-slate-600 text-sm italic">Message deleted</p>
        ) : isEditing ? (
          <form onSubmit={handleEditSubmit} className="flex gap-2 mt-1">
            <input
              autoFocus value={editText} onChange={e => setEditText(e.target.value)}
              className="flex-1 bg-slate-950 border border-indigo-500 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none"
            />
            <button type="submit" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 rounded-lg">Save</button>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
          </form>
        ) : (
          <p className="text-slate-300 text-sm leading-relaxed break-words whitespace-pre-wrap">{message.text}</p>
        )}

        {/* Media */}
        {!isDeleted && renderMedia()}

        {/* Link preview */}
        {!isDeleted && message.linkPreview && <LinkPreviewCard preview={message.linkPreview} />}

        {/* Reactions */}
        {!isDeleted && reactionEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {reactionEntries.map(([emoji, uids]) => (
              <button key={emoji} onClick={() => handleReaction(emoji)}
                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  uids.includes(currentUserProfile.id)
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}>
                {emoji} <span>{uids.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Read receipt (own messages only) */}
        {isOwnMessage && !isDeleted && (
          <div className="flex justify-end mt-0.5">
            {isReadByOthers
              ? <CheckCheck className="h-3 w-3 text-indigo-400" title="Seen" />
              : <Check className="h-3 w-3 text-slate-600" title="Sent" />
            }
          </div>
        )}
      </div>

      {/* Action buttons (hover) */}
      {!isDeleted && (
        <div className="absolute right-2 top-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 rounded-lg p-0.5 shadow-lg z-10">
          {/* Emoji picker */}
          <div className="relative">
            <button onClick={() => setShowEmojiPicker(p => !p)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md text-sm transition-colors" title="Add reaction">
              😀
            </button>
            {showEmojiPicker && (
              <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-2 flex gap-1 shadow-xl z-20">
                {EMOJI_LIST.map(e => (
                  <button key={e} onClick={() => handleReaction(e)}
                    className="text-lg hover:scale-125 transition-transform p-0.5">{e}</button>
                ))}
              </div>
            )}
          </div>

          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(p => !p)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl z-20">
                {isOwnMessage && (
                  <>
                    <button onClick={() => { setIsEditing(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors">
                      <Edit2 className="h-4 w-4" /> Edit
                    </button>
                    <button onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors">
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </>
                )}
                {!isOwnMessage && (
                  <button onClick={() => { onReport(message); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors">
                    <Flag className="h-4 w-4" /> Report
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}