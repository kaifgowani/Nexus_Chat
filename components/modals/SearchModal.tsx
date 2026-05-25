'use client';

import { useState } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Search, X, UserPlus } from 'lucide-react';
import { db } from '@/lib/firebase';
import type { UserProfile, ShowToast } from '@/lib/types';

interface Props {
  currentUserProfile: UserProfile;
  users: UserProfile[];
  showToast: ShowToast;
  onClose: () => void;
}

export default function SearchModal({ currentUserProfile, users, showToast, onClose }: Props) {
  const [query, setQuery] = useState('');

  const results = query.trim()
    ? users.filter(u =>
        u.id !== currentUserProfile.id &&
        (u.handle?.toLowerCase().includes(query.toLowerCase()) ||
         u.name?.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 10)
    : [];

  const handleAddFriend = async (targetId: string) => {
    try {
      await updateDoc(doc(db, 'users', currentUserProfile.id), { friends: arrayUnion(targetId) });
      showToast('Added', 'User added to your friends list.', 'success');
    } catch { showToast('Error', 'Failed to add friend.', 'error'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Search className="h-5 w-5 text-indigo-400" /> Find Friends</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <input autoFocus type="text" placeholder="Search by @handle or name..." value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-1 focus:ring-indigo-500 outline-none" />
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {query.trim().length > 0 ? (
            results.length > 0 ? results.map(u => {
              const isFriend = currentUserProfile.friends?.includes(u.id);
              const isBlocked = currentUserProfile.blocked?.includes(u.id);
              return (
                <div key={u.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-3">
                    <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt="avatar" className="h-10 w-10 rounded-full bg-slate-800" />
                    <div>
                      <div className="text-sm font-semibold text-white">{u.name}</div>
                      <div className="text-xs text-slate-400">@{u.handle}</div>
                    </div>
                  </div>
                  {isBlocked
                    ? <span className="text-xs text-rose-500 px-2 py-1 bg-rose-500/10 rounded">Blocked</span>
                    : isFriend
                      ? <span className="text-xs text-green-500 px-2 py-1 bg-green-500/10 rounded">Added</span>
                      : <button onClick={() => handleAddFriend(u.id)} className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors"><UserPlus className="h-4 w-4" /></button>
                  }
                </div>
              );
            }) : <p className="text-center text-slate-500 text-sm py-4">No users found.</p>
          ) : <p className="text-center text-slate-500 text-sm py-4">Type a handle or name to search.</p>}
        </div>
      </div>
    </div>
  );
}