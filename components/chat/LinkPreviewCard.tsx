'use client';

import { ExternalLink } from 'lucide-react';

interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
}

interface Props {
  preview: LinkPreview;
}

export default function LinkPreviewCard({ preview }: Props) {
  const domain = (() => {
    try { return new URL(preview.url).hostname.replace('www.', ''); }
    catch { return preview.url; }
  })();

  return (
    <a href={preview.url} target="_blank" rel="noopener noreferrer"
      className="mt-2 flex rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 overflow-hidden transition-colors group max-w-sm">
      {preview.image && (
        <div className="w-24 flex-shrink-0 bg-slate-700 overflow-hidden">
          <img src={preview.image} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="p-3 min-w-0 flex-1">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{domain}</p>
        <p className="text-sm font-semibold text-slate-100 leading-tight truncate group-hover:text-indigo-300 transition-colors">
          {preview.title}
        </p>
        {preview.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-snug">{preview.description}</p>
        )}
        <div className="flex items-center gap-1 mt-2 text-indigo-400">
          <ExternalLink className="h-3 w-3" />
          <span className="text-[10px]">Open link</span>
        </div>
      </div>
    </a>
  );
}