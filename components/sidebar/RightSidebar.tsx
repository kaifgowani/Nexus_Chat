'use client';

import { Search, X, Users } from 'lucide-react';
import { formatLastSeen } from '@/hooks/usePresence';
import type { UserProfile } from '@/lib/types';

interface Props {
  currentUserProfile: UserProfile;
  users: UserProfile[];
  isOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  onClickUser: (user: UserProfile) => void;
}

export default function RightSidebar({ currentUserProfile, users, isOpen, onClose, onOpenSearch, onClickUser }: Props) {
  const friendsList = users.filter(u => currentUserProfile.friends?.includes(u.id));
  const onlineFriends = friendsList.filter(u => u.isOnline);
  const offlineFriends = friendsList.filter(u => !u.isOnline);

  return (
    <div className={`${isOpen ? 'flex' : 'hidden'} lg:flex flex-col w-64 bg-slate-950 border-l border-slate-800 absolute right-0 lg:relative z-30 h-full`}>
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-slate-800 justify-between">
        <h3 className="font-bold text-slate-200 flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" /> Connections
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={onOpenSearch} className="p-1.5 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 rounded-md transition-colors" title="Find friends">
            <Search className="h-4 w-4" />
          </button>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-2 custom-scrollbar">
        {friendsList.length === 0 ? (
          <div className="text-center p-4 mt-4">
            <div className="bg-slate-900 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="h-5 w-5 text-slate-600" />
            </div>
            <p className="text-xs text-slate-400 mb-3">You haven't added anyone yet.</p>
            <button onClick={onOpenSearch} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700 transition-colors">
              Find Friends
            </button>
          </div>
        ) : (
          <>
            {onlineFriends.length > 0 && (
              <FriendsSection label={`Online — ${onlineFriends.length}`} friends={onlineFriends} onClickUser={onClickUser} />
            )}
            {offlineFriends.length > 0 && (
              <FriendsSection label={`Offline — ${offlineFriends.length}`} friends={offlineFriends} onClickUser={onClickUser} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FriendsSection({ label, friends, onClickUser }: { label: string; friends: UserProfile[]; onClickUser: (u: UserProfile) => void }) {
  return (
    <div className="mb-4">
      <div className="px-2 mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <ul className="space-y-1">
        {friends.map(u => (
          <li key={u.id}>
            <button onClick={() => onClickUser(u)} className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-800 transition-colors group text-left">
              <div className="relative flex-shrink-0">
                <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt="avatar" className="h-8 w-8 rounded-md bg-slate-800 object-cover" />
                <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-slate-950 ${u.isOnline ? 'bg-green-500' : 'bg-slate-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate font-medium text-slate-300 group-hover:text-white">{u.name}</p>
                <p className="text-[10px] text-slate-500 truncate">
                  {u.isOnline
                    ? <span className="text-green-400">● Online</span>
                    : u.statusText || `Last seen ${formatLastSeen(u.lastSeen)}`
                  }
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}