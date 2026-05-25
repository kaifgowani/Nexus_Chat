'use client';

import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { Hash, X, Lock, Globe } from 'lucide-react';
import { db } from '@/lib/firebase';
import type { ShowToast } from '@/lib/types';

interface Props {
  userId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
  showToast: ShowToast;
}

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CreateChannelModal({ userId, onClose, onCreated, showToast }: Props) {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const cleanName = name.trim().toLowerCase().replace(/\s+/g, '-');
      const newGroup = await addDoc(collection(db, 'groups'), {
        name: cleanName,
        type: 'channel',
        createdAt: Date.now(),
        createdBy: userId,
        isPrivate,
        ...(isPrivate ? { inviteCode: generateInviteCode(), members: [userId] } : {}),
      });
      onCreated(newGroup.id);
      showToast('Channel Created', `#${cleanName} has been created.`, 'success');
      onClose();
    } catch (err: any) { showToast('Error', err.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Hash className="h-6 w-6 text-indigo-400" /> Create Channel
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-400 mb-2">Channel Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. general"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 text-white rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none" autoFocus required />
          </div>

          {/* Visibility toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-400 mb-3">Visibility</label>
            <div className="flex gap-3">
              {[
                { value: false, icon: <Globe className="h-4 w-4" />, label: 'Public', desc: 'Anyone can join' },
                { value: true, icon: <Lock className="h-4 w-4" />, label: 'Private', desc: 'Invite only' },
              ].map(opt => (
                <button type="button" key={opt.label} onClick={() => setIsPrivate(opt.value)}
                  className={`flex-1 p-3 rounded-lg border text-left transition-colors ${isPrivate === opt.value ? 'border-indigo-500 bg-indigo-600/10' : 'border-slate-700 bg-slate-950 hover:border-slate-600'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isPrivate === opt.value ? 'text-indigo-400' : 'text-slate-300'}`}>
                    {opt.icon} <span className="font-medium text-sm">{opt.label}</span>
                  </div>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {isPrivate && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 mb-5">
              <p className="text-xs text-slate-400">An invite code will be generated automatically. Share it with people you want to invite.</p>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={loading || !name.trim()} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}