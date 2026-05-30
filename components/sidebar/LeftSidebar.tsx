'use client';

import { Shield, Hash, X, Plus, Lock, LogOut, Settings } from 'lucide-react';
import type { Group, UserProfile } from '@/lib/types';

interface Props {
  currentUserProfile: UserProfile;
  users: UserProfile[];
  groups: Group[];
  currentGroupId: string | null;
  currentUserId: string;
  isSidebarOpen: boolean;
  onSelectGroup: (id: string) => void;
  onCloseSidebar: () => void;
  onOpenCreateChannel: () => void;
  onOpenSettings: () => void;
  onOpenChannelSettings: (group: Group) => void;
  onSignOut: () => void;
}

export default function LeftSidebar({
  currentUserProfile, users, groups, currentGroupId, currentUserId,
  isSidebarOpen, onSelectGroup, onCloseSidebar, onOpenCreateChannel,
  onOpenSettings, onOpenChannelSettings, onSignOut,
}: Props) {
  const publicChannels = groups.filter(
    g => g.type === 'channel' && (!g.isPrivate || g.members?.includes(currentUserId))
  );
  const directMessages = groups.filter(
    g => g.type === 'dm' && g.members?.includes(currentUserId)
  );

  return (
    <div className={`${isSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-64 bg-slate-950 border-r border-slate-800 absolute md:relative z-40 h-full`}>
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-slate-800 justify-between">
        <h1 className="font-bold text-white text-lg tracking-tight flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-500" /> Nexus
        </h1>
        <button className="md:hidden text-slate-400 hover:text-white" onClick={onCloseSidebar}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">

        {/* Channels */}
        <div className="mb-6">
          <div className="px-4 flex items-center justify-between group mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Channels</span>
            <button onClick={onOpenCreateChannel}
              className="text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" title="New channel">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-px px-2">
            {publicChannels.map(channel => {
              const isAdmin = channel.admins?.includes(currentUserId) || channel.createdBy === currentUserId;
              return (
                <li key={channel.id}>
                  <div className={`flex items-center rounded-md transition-colors group/item ${currentGroupId === channel.id ? 'bg-indigo-600/10' : 'hover:bg-slate-800'}`}>
                    <button
                      onClick={() => { onSelectGroup(channel.id); onCloseSidebar(); }}
                      className={`flex-1 flex items-center gap-2 px-2 py-2 text-left text-sm ${currentGroupId === channel.id ? 'text-indigo-400 font-medium' : 'text-slate-400 group-hover/item:text-slate-200'}`}
                    >
                      {channel.isPrivate ? <Lock className="h-4 w-4 flex-shrink-0" /> : <Hash className="h-4 w-4 flex-shrink-0" />}
                      <span className="truncate">{channel.name}</span>
                    </button>
                    {/* Settings gear — visible on hover, for all members */}
                    <button
                      onClick={() => onOpenChannelSettings(channel)}
                      className="pr-2 opacity-0 group-hover/item:opacity-100 transition-opacity text-slate-500 hover:text-slate-300"
                      title="Channel settings"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* DMs */}
        <div>
          <div className="px-4 mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Direct Messages</span>
          </div>
          <ul className="space-y-px px-2">
            {directMessages.map(dm => {
              const otherUserId = dm.members?.find(id => id !== currentUserId);
              const otherUser = users.find(u => u.id === otherUserId);
              if (!otherUser || currentUserProfile.blocked?.includes(otherUserId!)) return null;
              return (
                <li key={dm.id}>
                  <button
                    onClick={() => { onSelectGroup(dm.id); onCloseSidebar(); }}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors text-left text-sm ${currentGroupId === dm.id ? 'bg-indigo-600/10 text-indigo-400 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                  >
                    <div className="relative flex-shrink-0">
                      <img src={otherUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.name}`}
                        alt="" className="h-5 w-5 rounded-md bg-slate-800 object-cover" />
                      <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-slate-950 ${otherUser.isOnline ? 'bg-green-500' : 'bg-slate-600'}`} />
                    </div>
                    <span className="truncate">{otherUser.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* User footer */}
      <div
        className="bg-slate-900 p-3 flex items-center gap-3 border-t border-slate-800 mt-auto cursor-pointer hover:bg-slate-800 transition-colors"
        onClick={onOpenSettings}
      >
        <img
          src={currentUserProfile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserProfile.name}`}
          alt="avatar" className="h-9 w-9 rounded-md bg-slate-800 object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-white truncate">{currentUserProfile.name}</div>
          <div className="text-xs text-indigo-400 truncate">@{currentUserProfile.handle}</div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onSignOut(); }}
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors flex-shrink-0"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}