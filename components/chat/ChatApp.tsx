'use client';

import { useState, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { Menu, Shield, Users } from 'lucide-react';

import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { useTyping, useTypingSubscription } from '@/hooks/useTyping';

import AuthScreen from '@/components/auth/AuthScreen';
import ProfileSetupView from '@/components/auth/ProfileSetupView';
import { ToastContainer } from '@/components/ui/Toast';
import InvitesPanel from '@/components/ui/InvitesPanel';
import LeftSidebar from '@/components/sidebar/LeftSidebar';
import RightSidebar from '@/components/sidebar/RightSidebar';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import TypingIndicator from '@/components/chat/TypingIndicator';
import SettingsModal from '@/components/modals/SettingsModal';
import SearchModal from '@/components/modals/SearchModal';
import UserProfileModal from '@/components/modals/UserProfileModal';
import ReportModal from '@/components/modals/ReportModal';
import CreateChannelModal from '@/components/modals/CreateChannelModal';
import ChannelSettingsModal from '@/components/modals/ChannelSettingsModal';
import BrowseChannelsModal from '@/components/modals/BrowseChannelsModal';

import type { ToastMsg, UserProfile, Message, Group } from '@/lib/types';

function detectURL(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

export default function ChatApp() {
  const { user, authLoading, profileLoaded, currentUserProfile, users, groups, messages } = useAuth();

  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUsersSidebarOpen, setIsUsersSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [reportTarget, setReportTarget] = useState<Message | null>(null);
  const [channelSettingsGroup, setChannelSettingsGroup] = useState<Group | null>(null);
  const [isBrowseChannelsOpen, setIsBrowseChannelsOpen] = useState(false);

  usePresence(user?.uid);
  const { onInputChange: onTypingChange } = useTyping(currentGroupId, user?.uid, currentUserProfile?.name);
  const typingUsers = useTypingSubscription(currentGroupId, user?.uid);

  const showToast = useCallback((title: string, text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const currentGroupMessages = messages.filter(
    m => m.groupId === currentGroupId && !currentUserProfile?.blocked?.includes(m.senderId)
  );

  const currentGroup = groups.find(g => g.id === currentGroupId);

  const getGroupTitle = (group?: Group): string => {
    if (!group) return '';
    if (group.type !== 'dm') return `# ${group.name}`;
    const otherId = group.members?.find(id => id !== user?.uid);
    const other = users.find(u => u.id === otherId);
    return other ? `@ ${other.handle}` : '@ Unknown';
  };

  const handleStartDM = async (targetUserId: string) => {
    if (!user || targetUserId === user.uid) return;
    if (currentUserProfile?.blocked?.includes(targetUserId)) {
      showToast('Blocked', 'You cannot message a blocked user.', 'error'); return;
    }
    const existing = groups.find(
      g => g.type === 'dm' && g.members?.includes(user.uid) && g.members?.includes(targetUserId)
    );
    if (existing) { setCurrentGroupId(existing.id); setIsUsersSidebarOpen(false); return; }
    try {
      const dm = await addDoc(collection(db, 'groups'), {
        type: 'dm', members: [user.uid, targetUserId], createdAt: Date.now(),
      });
      setCurrentGroupId(dm.id);
      setIsUsersSidebarOpen(false);
    } catch { showToast('Error', 'Failed to start conversation.', 'error'); }
  };

  const handleSendMessage = async (
    e: React.FormEvent,
    mediaURL?: string,
    mediaType?: 'image' | 'file',
    mediaName?: string
  ) => {
    e.preventDefault();
    if (!currentGroupId || !user || !currentUserProfile) return;
    if (!newMessage.trim() && !mediaURL) return;

    const group = groups.find(g => g.id === currentGroupId);
    if (group?.type === 'dm') {
      const otherId = group.members?.find(id => id !== user.uid);
      const other = users.find(u => u.id === otherId);
      if (currentUserProfile.blocked?.includes(otherId!) || other?.blocked?.includes(user.uid)) {
        showToast('Action Denied', 'You cannot send messages to this user.', 'error'); return;
      }
    }

    const text = newMessage.trim();
    setNewMessage('');
    const detectedURL = text ? detectURL(text) : null;

    try {
      await addDoc(collection(db, 'messages'), {
        groupId: currentGroupId,
        text: text || '',
        senderId: user.uid,
        senderName: currentUserProfile.name,
        createdAt: Date.now(),
        readBy: [user.uid],
        ...(mediaURL ? { mediaURL, mediaType, mediaName } : {}),
        ...(detectedURL ? { pendingLinkPreview: detectedURL } : {}),
      });
    } catch (err: any) {
      showToast('Message Failed', err.message, 'error');
      setNewMessage(text);
    }
  };

  const handleSignOut = async () => {
    try {
      if (user) await setDoc(doc(db, 'users', user.uid), { isOnline: false, lastSeen: Date.now() }, { merge: true });
      await signOut(auth);
    } catch (err: any) { showToast('Sign Out Error', err.message, 'error'); }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <div className="animate-pulse flex flex-col items-center">
          <Shield className="h-12 w-12 text-indigo-500 mb-4 animate-bounce" />
          <h2 className="text-slate-400 font-medium">Verifying Connection…</h2>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen showToast={showToast} />;

  if (!profileLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <div className="animate-pulse flex flex-col items-center">
          <Shield className="h-12 w-12 text-indigo-500 mb-4" />
          <h2 className="text-slate-400 font-medium">Loading Profile…</h2>
        </div>
      </div>
    );
  }

  if (!currentUserProfile) return <ProfileSetupView user={user} showToast={showToast} />;

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">

      <ToastContainer toasts={toasts} dismiss={dismissToast} />

      {/* Modals */}
      {isSettingsOpen && (
        <SettingsModal user={user} currentUserProfile={currentUserProfile} showToast={showToast} onClose={() => setIsSettingsOpen(false)} />
      )}
      {isSearchOpen && (
        <SearchModal currentUserProfile={currentUserProfile} users={users} showToast={showToast} onClose={() => setIsSearchOpen(false)} />
      )}
      {selectedUser && (
        <UserProfileModal userTarget={selectedUser} currentUserProfile={currentUserProfile} showToast={showToast}
          onClose={() => setSelectedUser(null)} onStartMessage={handleStartDM} />
      )}
      {isCreateChannelOpen && (
        <CreateChannelModal userId={user.uid} onClose={() => setIsCreateChannelOpen(false)}
          onCreated={setCurrentGroupId} showToast={showToast} />
      )}
      {isBrowseChannelsOpen && (
        <BrowseChannelsModal
          groups={groups}
          currentUserId={user.uid}
          showToast={showToast}
          onClose={() => setIsBrowseChannelsOpen(false)}
          onJoined={setCurrentGroupId}
        />
      )}
      {reportTarget && (
        <ReportModal message={reportTarget} currentUserProfile={currentUserProfile}
          showToast={showToast} onClose={() => setReportTarget(null)} />
      )}
      {channelSettingsGroup && (
        <ChannelSettingsModal
          group={channelSettingsGroup}
          currentUserProfile={currentUserProfile}
          users={users}
          showToast={showToast}
          onClose={() => setChannelSettingsGroup(null)}
          onDeleted={() => { setCurrentGroupId(null); setChannelSettingsGroup(null); }}
          onLeft={() => { setCurrentGroupId(null); setChannelSettingsGroup(null); }}
        />
      )}

      {/* Left Sidebar */}
      <LeftSidebar
        currentUserProfile={currentUserProfile}
        users={users}
        groups={groups}
        currentGroupId={currentGroupId}
        currentUserId={user.uid}
        isSidebarOpen={isSidebarOpen}
        onSelectGroup={setCurrentGroupId}
        onCloseSidebar={() => setIsSidebarOpen(false)}
        onOpenCreateChannel={() => setIsCreateChannelOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenChannelSettings={setChannelSettingsGroup}
        onOpenBrowseChannels={() => setIsBrowseChannelsOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Center: Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/95 backdrop-blur z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1.5 text-slate-400 hover:bg-slate-800 rounded-md" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            {currentGroupId
              ? <h2 className="font-bold text-white">{getGroupTitle(currentGroup)}</h2>
              : <h2 className="font-bold text-slate-400">Select a chat</h2>
            }
          </div>
          <div className="flex items-center gap-1">
            {/* Invites bell */}
            <InvitesPanel
              userId={user.uid}
              showToast={showToast}
              onJoined={(groupId) => setCurrentGroupId(groupId)}
            />
            <button className="lg:hidden p-1.5 text-slate-400 hover:bg-slate-800 rounded-md" onClick={() => setIsUsersSidebarOpen(p => !p)}>
              <Users className="h-5 w-5" />
            </button>
          </div>
        </header>

        {currentGroupId ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0">
              <MessageList
                messages={currentGroupMessages}
                users={users}
                currentUserProfile={currentUserProfile}
                onClickUser={setSelectedUser}
                onReport={setReportTarget}
              />
            </div>
            <TypingIndicator typingUsers={typingUsers} />
            <MessageInput
              value={newMessage}
              onChange={setNewMessage}
              onSend={handleSendMessage}
              onTypingChange={onTypingChange}
              showToast={showToast}
              userId={user.uid}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <div className="bg-slate-800/50 p-6 rounded-full mb-6"><Shield className="h-16 w-16 text-slate-600" /></div>
            <h3 className="text-xl font-bold text-slate-300 mb-2">Welcome to Nexus Connect</h3>
            <p className="max-w-md text-center text-sm">Select a channel or friend to begin communicating securely.</p>
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <RightSidebar
        currentUserProfile={currentUserProfile}
        users={users}
        isOpen={isUsersSidebarOpen}
        onClose={() => setIsUsersSidebarOpen(false)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onClickUser={setSelectedUser}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}