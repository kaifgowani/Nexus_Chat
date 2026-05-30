'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { Bell, Check, X, Hash } from 'lucide-react';
import { db } from '@/lib/firebase';
import type { Invite, ShowToast } from '@/lib/types';

interface Props {
  userId: string;
  showToast: ShowToast;
  onJoined: (groupId: string) => void;
}

export default function InvitesPanel({ userId, showToast, onJoined }: Props) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Subscribe to pending invites for this user
  useEffect(() => {
    const q = query(
      collection(db, 'invites'),
      where('recipientId', '==', userId),
      where('status', '==', 'pending')
    );
    return onSnapshot(q, snap => {
      setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invite)));
    });
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAccept = async (invite: Invite) => {
    try {
      // Add user to group members
      await updateDoc(doc(db, 'groups', invite.groupId), {
        members: arrayUnion(userId),
      });
      // Mark invite as accepted
      await updateDoc(doc(db, 'invites', invite.id), { status: 'accepted' });
      showToast('Joined', `You joined #${invite.groupName}`, 'success');
      onJoined(invite.groupId);
      setOpen(false);
    } catch { showToast('Error', 'Failed to accept invite.', 'error'); }
  };

  const handleDecline = async (invite: Invite) => {
    await updateDoc(doc(db, 'invites', invite.id), { status: 'declined' });
    showToast('Declined', 'Invite declined.', 'info');
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(p => !p)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        title="Invites"
      >
        <Bell className="h-5 w-5" />
        {invites.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {invites.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95">
          <div className="p-4 border-b border-slate-800">
            <h3 className="font-semibold text-white text-sm">Channel Invites</h3>
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {invites.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No pending invites.</p>
            ) : (
              invites.map(invite => (
                <div key={invite.id} className="p-4 border-b border-slate-800 last:border-0">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="bg-indigo-600/10 p-2 rounded-lg flex-shrink-0">
                      <Hash className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">#{invite.groupName}</p>
                      <p className="text-xs text-slate-400">
                        Invited by <span className="text-slate-300">{invite.senderName}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(invite)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded-lg transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => handleDecline(invite)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded-lg transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}