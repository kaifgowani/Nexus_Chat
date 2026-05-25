'use client';

import type { TypingEntry } from '@/lib/types';

interface Props {
  typingUsers: TypingEntry[];
}

export default function TypingIndicator({ typingUsers }: Props) {
  if (typingUsers.length === 0) return null;

  const names =
    typingUsers.length === 1
      ? typingUsers[0].userName
      : typingUsers.length === 2
      ? `${typingUsers[0].userName} and ${typingUsers[1].userName}`
      : `${typingUsers[0].userName} and ${typingUsers.length - 1} others`;

  return (
    <div className="flex items-center gap-2 px-4 pb-2 text-slate-400 text-xs animate-in fade-in duration-200">
      {/* Animated dots */}
      <div className="flex items-center gap-0.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-slate-500"
            style={{ animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }}
          />
        ))}
      </div>
      <span><strong className="text-slate-300">{names}</strong> {typingUsers.length === 1 ? 'is' : 'are'} typing…</span>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}