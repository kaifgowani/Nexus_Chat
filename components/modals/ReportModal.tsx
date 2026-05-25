'use client';

import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { AlertCircle, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import type { Message, UserProfile, ShowToast } from '@/lib/types';

const REASONS = [
  'Harassment or bullying',
  'Hate speech or discrimination',
  'Spam or scam',
  'Explicit or adult content',
  'Misinformation',
  'Other',
];

interface Props {
  message: Message;
  currentUserProfile: UserProfile;
  showToast: ShowToast;
  onClose: () => void;
}

export default function ReportModal({ message, currentUserProfile, showToast, onClose }: Props) {
  const [selectedReason, setSelectedReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'reports'), {
        messageId: message.id,
        messageText: message.isDeleted ? '[deleted]' : message.text,
        reporterId: currentUserProfile.id,
        offenderId: message.senderId,
        offenderName: message.senderName,
        reason: selectedReason,
        createdAt: Date.now(),
        resolved: false,
      });
      showToast('Report Submitted', 'Thank you. Our team will review this message.', 'success');
      onClose();
    } catch { showToast('Error', 'Failed to submit report.', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-400" /> Report Message
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {/* Message preview */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 mb-5">
          <p className="text-xs text-slate-500 mb-1">Message from <span className="text-slate-300">{message.senderName}</span></p>
          <p className="text-sm text-slate-300 line-clamp-3 break-words">{message.isDeleted ? '[deleted]' : message.text}</p>
        </div>

        <p className="text-sm text-slate-400 mb-3">Select a reason for reporting:</p>
        <div className="space-y-2 mb-6">
          {REASONS.map(reason => (
            <label key={reason} className="flex items-center gap-3 cursor-pointer group">
              <input type="radio" name="report-reason" value={reason} checked={selectedReason === reason}
                onChange={() => setSelectedReason(reason)} className="accent-indigo-500" />
              <span className={`text-sm transition-colors ${selectedReason === reason ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{reason}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={!selectedReason || loading}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
            {loading ? 'Sending...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}