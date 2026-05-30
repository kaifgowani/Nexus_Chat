'use client';

import { useState } from 'react';
import {
  doc, updateDoc, deleteDoc, addDoc, collection,
  arrayUnion, arrayRemove,
} from 'firebase/firestore';
import {
  Settings, X, Copy, Check, Link, UserPlus, Crown,
  UserMinus, LogOut, Trash2, Search, Shield, Lock, Globe,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import type { Group, UserProfile, ShowToast } from '@/lib/types';

interface Props {
  group: Group;
  currentUserProfile: UserProfile;
  users: UserProfile[];
  showToast: ShowToast;
  onClose: () => void;
  onDeleted: () => void;   // called after channel is deleted
  onLeft: () => void;      // called after user leaves
}

export default function ChannelSettingsModal({
  group, currentUserProfile, users, showToast, onClose, onDeleted, onLeft,
}: Props) {
  const [tab, setTab] = useState<'overview' | 'members' | 'invites'>('overview');
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [editName, setEditName] = useState(group.name || '');
  const [editingName, setEditingName] = useState(false);

  const isAdmin = group.admins?.includes(currentUserProfile.id) || group.createdBy === currentUserProfile.id;
  const isCreator = group.createdBy === currentUserProfile.id;
  const members = (group.members || []).map(id => users.find(u => u.id === id)).filter(Boolean) as UserProfile[];
  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${group.inviteCode}`;

  // ── Copy helpers ─────────────────────────────────────────────────────────
  const copyCode = () => {
    navigator.clipboard.writeText(group.inviteCode || '');
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    showToast('Copied', 'Invite link copied to clipboard.', 'success');
  };

  // ── Rename channel ────────────────────────────────────────────────────────
  const handleRename = async () => {
    if (!editName.trim() || editName === group.name) { setEditingName(false); return; }
    const clean = editName.trim().toLowerCase().replace(/\s+/g, '-');
    await updateDoc(doc(db, 'groups', group.id), { name: clean });
    showToast('Updated', `Channel renamed to #${clean}`, 'success');
    setEditingName(false);
  };

  // ── Send direct invite ────────────────────────────────────────────────────
  const sendInvite = async (targetUser: UserProfile) => {
    try {
      await addDoc(collection(db, 'invites'), {
        groupId: group.id,
        groupName: group.name || 'Unknown',
        senderId: currentUserProfile.id,
        senderName: currentUserProfile.name,
        recipientId: targetUser.id,
        status: 'pending',
        createdAt: Date.now(),
      });
      showToast('Invite Sent', `Invite sent to ${targetUser.name}.`, 'success');
    } catch { showToast('Error', 'Failed to send invite.', 'error'); }
  };

  // ── Member management ─────────────────────────────────────────────────────
  const kickMember = async (uid: string) => {
    await updateDoc(doc(db, 'groups', group.id), { members: arrayRemove(uid) });
    showToast('Removed', 'Member removed from channel.', 'success');
  };

  const toggleAdmin = async (uid: string) => {
    const isAlreadyAdmin = group.admins?.includes(uid);
    const op = isAlreadyAdmin ? arrayRemove(uid) : arrayUnion(uid);
    await updateDoc(doc(db, 'groups', group.id), { admins: op });
    showToast('Updated', isAlreadyAdmin ? 'Admin role removed.' : 'Admin role granted.', 'success');
  };

  // ── Leave channel ─────────────────────────────────────────────────────────
  const leaveChannel = async () => {
    if (isCreator) {
      showToast('Cannot Leave', 'You created this channel. Transfer ownership or delete it.', 'error');
      return;
    }
    await updateDoc(doc(db, 'groups', group.id), {
      members: arrayRemove(currentUserProfile.id),
      admins: arrayRemove(currentUserProfile.id),
    });
    onLeft();
    onClose();
  };

  // ── Delete channel ────────────────────────────────────────────────────────
  const deleteChannel = async () => {
    if (!isCreator) return;
    if (!confirm(`Delete #${group.name}? This cannot be undone.`)) return;
    await deleteDoc(doc(db, 'groups', group.id));
    onDeleted();
    onClose();
  };

  // ── Users eligible for invite ─────────────────────────────────────────────
  const inviteCandidates = users.filter(u =>
    u.id !== currentUserProfile.id &&
    !members.find(m => m.id === u.id) &&
    (u.name.toLowerCase().includes(inviteSearch.toLowerCase()) ||
     u.handle.toLowerCase().includes(inviteSearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-400" />
            #{group.name} Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-5">
          {(['overview', 'members', 'invites'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">

          {/* ── Overview Tab ── */}
          {tab === 'overview' && (
            <div className="space-y-5">
              {/* Channel type badge */}
              <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800">
                {group.isPrivate
                  ? <Lock className="h-5 w-5 text-amber-400" />
                  : <Globe className="h-5 w-5 text-green-400" />
                }
                <div>
                  <p className="text-sm font-medium text-white">{group.isPrivate ? 'Private Channel' : 'Public Channel'}</p>
                  <p className="text-xs text-slate-500">{group.isPrivate ? 'Invite only' : 'Anyone can join'}</p>
                </div>
              </div>

              {/* Rename (admin only) */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Channel Name</label>
                  {editingName ? (
                    <div className="flex gap-2">
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        className="flex-1 bg-slate-950 border border-indigo-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" autoFocus />
                      <button onClick={handleRename} className="bg-indigo-600 text-white px-3 rounded-lg text-sm">Save</button>
                      <button onClick={() => setEditingName(false)} className="text-slate-400 hover:text-white px-2"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                      <span className="text-sm text-white">#{group.name}</span>
                      <button onClick={() => setEditingName(true)} className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button>
                    </div>
                  )}
                </div>
              )}

              {/* Invite code (private channels only) */}
              {group.inviteCode && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Invite Code</label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                    <span className="flex-1 font-mono text-lg tracking-[0.3em] text-white">{group.inviteCode}</span>
                    <button onClick={copyCode} className="text-slate-400 hover:text-white transition-colors">
                      {codeCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>

                  <label className="block text-xs font-medium text-slate-400 mb-2 mt-4">Invite Link</label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                    <Link className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span className="flex-1 text-xs text-slate-400 truncate">{inviteLink}</span>
                    <button onClick={copyLink} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
                      {linkCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Danger zone */}
              <div className="border border-rose-500/20 rounded-lg p-4 space-y-2">
                <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3">Danger Zone</p>
                {!isCreator && (
                  <button onClick={leaveChannel}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-950 hover:bg-rose-500/10 text-rose-400 rounded-lg text-sm transition-colors">
                    <LogOut className="h-4 w-4" /> Leave Channel
                  </button>
                )}
                {isCreator && (
                  <button onClick={deleteChannel}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-950 hover:bg-rose-500/10 text-rose-400 rounded-lg text-sm transition-colors">
                    <Trash2 className="h-4 w-4" /> Delete Channel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Members Tab ── */}
          {tab === 'members' && (
            <div className="space-y-2">
              {members.length === 0
                ? <p className="text-slate-500 text-sm text-center py-4">No members yet.</p>
                : members.map(member => {
                  const isMemberAdmin = group.admins?.includes(member.id) || group.createdBy === member.id;
                  const isCreatorMember = group.createdBy === member.id;
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-3">
                        <img src={member.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                          alt="" className="h-8 w-8 rounded-md object-cover bg-slate-800" />
                        <div>
                          <p className="text-sm font-medium text-white flex items-center gap-1.5">
                            {member.name}
                            {isCreatorMember && <Crown className="h-3 w-3 text-amber-400" />}
                            {isMemberAdmin && !isCreatorMember && <Shield className="h-3 w-3 text-indigo-400" />}
                          </p>
                          <p className="text-xs text-slate-500">@{member.handle}</p>
                        </div>
                      </div>
                      {isAdmin && member.id !== currentUserProfile.id && !isCreatorMember && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleAdmin(member.id)}
                            className={`p-1.5 rounded-md text-xs transition-colors ${isMemberAdmin ? 'text-indigo-400 bg-indigo-400/10 hover:bg-indigo-400/20' : 'text-slate-400 hover:bg-slate-800'}`}
                            title={isMemberAdmin ? 'Remove admin' : 'Make admin'}>
                            <Crown className="h-4 w-4" />
                          </button>
                          <button onClick={() => kickMember(member.id)}
                            className="p-1.5 rounded-md text-rose-400 hover:bg-rose-400/10 transition-colors" title="Remove from channel">
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* ── Invites Tab ── */}
          {tab === 'invites' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input type="text" placeholder="Search users to invite..." value={inviteSearch}
                  onChange={e => setInviteSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="space-y-2">
                {inviteCandidates.length === 0
                  ? <p className="text-slate-500 text-sm text-center py-4">No users found.</p>
                  : inviteCandidates.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-3">
                        <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}
                          alt="" className="h-8 w-8 rounded-md object-cover bg-slate-800" />
                        <div>
                          <p className="text-sm font-medium text-white">{u.name}</p>
                          <p className="text-xs text-slate-500">@{u.handle}</p>
                        </div>
                      </div>
                      <button onClick={() => sendInvite(u)}
                        className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors">
                        <UserPlus className="h-3.5 w-3.5" /> Invite
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}