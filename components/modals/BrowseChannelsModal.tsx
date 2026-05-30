'use client';

import { useState } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Hash, Search, X, Users, Lock, LogIn } from 'lucide-react';
import { db } from '@/lib/firebase';
import type { Group, ShowToast } from '@/lib/types';

interface Props {
  groups: Group[];
  currentUserId: string;
  showToast: ShowToast;
  onClose: () => void;
  onJoined: (groupId: string) => void;
}

export default function BrowseChannelsModal({ groups, currentUserId, showToast, onClose, onJoined }: Props) {
  const [query, setQuery] = useState('');
  const [joining, setJoining] = useState<string | null>(null);

  // Only show public channels the user hasn't joined yet
  const results = groups.filter(g =>
    g.type === 'channel' &&
    !g.isPrivate &&
    !g.members?.includes(currentUserId) &&
    (query.trim() === '' || g.name?.toLowerCase().includes(query.toLowerCase()))
  );

  const handleJoin = async (group: Group) => {
    setJoining(group.id);
    try {
      await updateDoc(doc(db, 'groups', group.id), {
        members: arrayUnion(currentUserId),
      });
      showToast('Joined', `You joined #${group.name}`, 'success');
      onJoined(group.id);
      onClose();
    } catch {
      showToast('Error', 'Failed to join channel.', 'error');
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Hash className="h-5 w-5 text-indigo-400" /> Browse Channels
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              autoFocus
              type="text"
              placeholder="Search public channels..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Results */}
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {results.length === 0 ? (
              <div className="text-center py-8">
                <Hash className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">
                  {query.trim() ? 'No channels match your search.' : 'No public channels to join.'}
                </p>
              </div>
            ) : (
              results.map(group => (
                <div key={group.id}
                  className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-slate-800 p-2 rounded-lg flex-shrink-0">
                      <Hash className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">#{group.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {group.members?.length || 0} members
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoin(group)}
                    disabled={joining === group.id}
                    className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 ml-3"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    {joining === group.id ? 'Joining...' : 'Join'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}