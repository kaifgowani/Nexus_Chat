'use client';

import { Bell, CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { ToastMsg } from '@/lib/types';

interface ToastContainerProps {
  toasts: ToastMsg[];
  dismiss: (id: number) => void;
}

export function ToastContainer({ toasts, dismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-800 border border-slate-700 shadow-2xl rounded-lg p-4 w-80 flex items-start gap-3 animate-in slide-in-from-right-8"
        >
          {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Bell className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-100">{toast.title}</h4>
            <p className="text-sm text-slate-400 leading-snug">{toast.text}</p>
          </div>
          <button onClick={() => dismiss(toast.id)} className="text-slate-500 hover:text-slate-300 flex-shrink-0 ml-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}