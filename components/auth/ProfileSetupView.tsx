'use client';

import { useState } from 'react';
import { User, AtSign } from 'lucide-react';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { User as FirebaseAuthUser } from 'firebase/auth';
import { db } from '@/lib/firebase';
import type { ShowToast } from '@/lib/types';

interface Props {
  user: FirebaseAuthUser;
  showToast: ShowToast;
}

export default function ProfileSetupView({ user, showToast }: Props) {
  const [handle, setHandle] = useState('');
  const [name, setName] = useState(user.displayName || '');
  const [loading, setLoading] = useState(false);

  const completeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (cleanHandle.length < 3) throw new Error('Handle must be at least 3 characters.');
      const snap = await getDocs(query(collection(db, 'users'), where('handle', '==', cleanHandle)));
      if (!snap.empty) throw new Error(`The handle @${cleanHandle} is already taken.`);

      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid, handle: cleanHandle, name: name || 'User',
        email: user.email || '', photoURL: user.photoURL || '',
        isOnline: true, lastSeen: Date.now(), joinedAt: Date.now(),
        role: 'user', mfaEnabled: false, friends: [], blocked: [],
      });
      showToast('Welcome', 'Profile setup complete!', 'success');
    } catch (error: any) {
      showToast('Setup Failed', error.message, 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-8 animate-in zoom-in-95">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-500/10 p-4 rounded-full">
            <User className="h-10 w-10 text-indigo-500" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-white mb-2">Complete Your Profile</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">Choose a unique handle to enter the workspace.</p>
        <form onSubmit={completeSetup} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Display Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="John Doe"
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Unique Handle</label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input type="text" required value={handle}
                onChange={e => setHandle(e.target.value.replace(/\s+/g, '').toLowerCase())} placeholder="johndoe99"
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors mt-6 disabled:opacity-50">
            {loading ? 'Saving...' : 'Enter Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}