'use client';

import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { X, Circle, MessageCircle, UserPlus, UserMinus, Ban } from 'lucide-react';
import { db } from '@/lib/firebase';
import { formatLastSeen } from '@/hooks/usePresence';
import type { UserProfile, ShowToast } from '@/lib/types';

interface Props {
  userTarget: UserProfile;
  currentUserProfile: UserProfile;
  showToast: ShowToast;
  onClose: () => void;
  onStartMessage: (id: string) => void;
}

export default function UserProfileModal({ userTarget, currentUserProfile, showToast, onClose, onStartMessage }: Props) {
  const isFriend = currentUserProfile.friends?.includes(userTarget.id);
  const isBlocked = currentUserProfile.blocked?.includes(userTarget.id);

  const toggleFriend = async () => {
    try {
      const op = isFriend ? arrayRemove(userTarget.id) : arrayUnion(userTarget.id);
      await updateDoc(doc(db, 'users', currentUserProfile.id), { friends: op });
      showToast('Success', isFriend ? 'Friend removed.' : 'Friend added.', 'success');
      onClose();
    } catch { showToast('Error', 'Action failed.', 'error'); }
  };

  const toggleBlock = async () => {
    try {
      const op = isBlocked ? arrayRemove(userTarget.id) : arrayUnion(userTarget.id);
      await updateDoc(doc(db, 'users', currentUserProfile.id), { blocked: op });
      showToast('Success', isBlocked ? 'User unblocked.' : 'User blocked.', 'success');
      onClose();
    } catch { showToast('Error', 'Action failed.', 'error'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95">
        <div className="relative h-24 bg-gradient-to-r from-indigo-600 to-purple-600">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 p-1 rounded-full backdrop-blur">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 pb-6 pt-0 relative">
          <div className="absolute -top-12 border-4 border-slate-900 rounded-full h-24 w-24 bg-slate-800 overflow-hidden">
            <img src={userTarget.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userTarget.name}`} alt="avatar" className="h-full w-full object-cover" />
          </div>
          <div className="mt-14 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {userTarget.name}
                {userTarget.isOnline && !isBlocked && <Circle className="h-2 w-2 fill-green-500 text-green-500" />}
              </h2>
              <p className="text-indigo-400 text-sm font-medium">@{userTarget.handle}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {userTarget.isOnline ? 'Online now' : `Last seen ${formatLastSeen(userTarget.lastSeen)}`}
              </p>
            </div>
          </div>
          {userTarget.statusText && !isBlocked && (
            <div className="mt-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <p className="text-sm text-slate-300 italic">"{userTarget.statusText}"</p>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-2">
            {!isBlocked && (
              <button onClick={() => { onStartMessage(userTarget.id); onClose(); }}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg transition-colors font-medium">
                <MessageCircle className="h-4 w-4" /> Send Message
              </button>
            )}
            <div className="flex gap-2">
              <button onClick={toggleFriend}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors">
                {isFriend ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4 text-indigo-400" />}
                {isFriend ? 'Remove' : 'Add Friend'}
              </button>
              <button onClick={toggleBlock}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors ${isBlocked ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-slate-800 text-rose-400 hover:bg-rose-500/10'}`}>
                <Ban className="h-4 w-4" /> {isBlocked ? 'Unblock' : 'Block'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}