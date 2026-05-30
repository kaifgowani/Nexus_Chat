'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Shield, Hash, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { db, auth } from '@/lib/firebase';

type Status = 'loading' | 'joining' | 'success' | 'already_member' | 'invalid' | 'unauthenticated';

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setStatus('unauthenticated'); return; }

      try {
        // Find the group with this invite code
        const snap = await getDocs(
          query(collection(db, 'groups'), where('inviteCode', '==', code))
        );

        if (snap.empty) { setStatus('invalid'); return; }

        const groupDoc = snap.docs[0];
        const group = groupDoc.data();
        setGroupName(group.name || 'Unknown');

        // Check if already a member
        if (group.members?.includes(user.uid)) {
          setStatus('already_member');
          setTimeout(() => router.push('/'), 2000);
          return;
        }

        // Join the channel
        setStatus('joining');
        await updateDoc(doc(db, 'groups', groupDoc.id), {
          members: arrayUnion(user.uid),
        });
        setStatus('success');
        setTimeout(() => router.push('/'), 2500);
      } catch {
        setStatus('invalid');
      }
    });

    return () => unsub();
  }, [code, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="flex justify-center mb-5">
          <div className="bg-indigo-500/10 p-4 rounded-full">
            <Shield className="h-10 w-10 text-indigo-500" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-white mb-6">Nexus Connect</h1>

        {status === 'loading' && (
          <>
            <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-slate-400">Verifying invite code…</p>
          </>
        )}

        {status === 'joining' && (
          <>
            <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-slate-400">Joining <span className="text-white font-medium">#{groupName}</span>…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <p className="text-white font-semibold text-lg mb-1">You're in!</p>
            <p className="text-slate-400 text-sm">
              Joined <span className="text-indigo-400 font-medium">#{groupName}</span>. Redirecting…
            </p>
          </>
        )}

        {status === 'already_member' && (
          <>
            <Hash className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
            <p className="text-white font-semibold text-lg mb-1">Already a member</p>
            <p className="text-slate-400 text-sm">You're already in <span className="text-indigo-400">#{groupName}</span>. Redirecting…</p>
          </>
        )}

        {status === 'invalid' && (
          <>
            <XCircle className="h-12 w-12 text-rose-400 mx-auto mb-3" />
            <p className="text-white font-semibold text-lg mb-1">Invalid Invite</p>
            <p className="text-slate-400 text-sm mb-5">This invite link is expired or doesn't exist.</p>
            <button onClick={() => router.push('/')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm transition-colors">
              Go Home
            </button>
          </>
        )}

        {status === 'unauthenticated' && (
          <>
            <XCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
            <p className="text-white font-semibold text-lg mb-1">Sign In Required</p>
            <p className="text-slate-400 text-sm mb-5">You need to be logged in to join a channel.</p>
            <button onClick={() => router.push('/')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm transition-colors">
              Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}