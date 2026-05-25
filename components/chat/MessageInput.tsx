'use client';

import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Send, Paperclip, X, Image } from 'lucide-react';
import { storage } from '@/lib/firebase';
import type { ShowToast } from '@/lib/types';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: (e: React.FormEvent, mediaURL?: string, mediaType?: 'image' | 'file', mediaName?: string) => void;
  onTypingChange: () => void;
  disabled?: boolean;
  showToast: ShowToast;
  userId: string;
}

export default function MessageInput({ value, onChange, onSend, onTypingChange, disabled, showToast, userId }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<{ url: string; name: string; type: 'image' | 'file'; blob: File } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast('File too large', 'Max file size is 10MB.', 'error'); return; }

    const isImage = file.type.startsWith('image/');
    const objectUrl = URL.createObjectURL(file);
    setUploadPreview({ url: objectUrl, name: file.name, type: isImage ? 'image' : 'file', blob: file });
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    if (!value.trim() && !uploadPreview) return;

    if (uploadPreview) {
      setUploading(true);
      try {
        const path = `media/${userId}/${Date.now()}_${uploadPreview.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, uploadPreview.blob);
        const downloadURL = await getDownloadURL(storageRef);
        onSend(e, downloadURL, uploadPreview.type, uploadPreview.name);
        setUploadPreview(null);
      } catch { showToast('Upload Failed', 'Could not upload the file. Check Firebase Storage rules.', 'error'); }
      finally { setUploading(false); }
    } else {
      onSend(e);
    }
  };

  return (
    <div className="p-4 pt-0 bg-slate-900">
      {/* Upload preview */}
      {uploadPreview && (
        <div className="mb-2 flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
          {uploadPreview.type === 'image'
            ? <img src={uploadPreview.url} alt="" className="h-10 w-10 rounded object-cover border border-slate-600" />
            : <div className="h-10 w-10 rounded bg-slate-700 flex items-center justify-center"><Paperclip className="h-5 w-5 text-slate-400" /></div>
          }
          <span className="text-xs text-slate-300 truncate flex-1">{uploadPreview.name}</span>
          <button onClick={() => setUploadPreview(null)} className="text-slate-400 hover:text-rose-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="relative flex items-center gap-2">
        {/* File attach button */}
        <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip" className="hidden" onChange={handleFileSelect} />
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors" title="Attach file">
          <Paperclip className="h-5 w-5" />
        </button>

        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); onTypingChange(); }}
          placeholder="Message…"
          disabled={disabled || uploading}
          className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl pl-4 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-600 disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={(!value.trim() && !uploadPreview) || uploading || disabled}
          className="flex-shrink-0 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {uploading ? (
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </form>
    </div>
  );
}