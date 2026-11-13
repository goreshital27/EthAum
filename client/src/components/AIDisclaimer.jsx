import React from 'react';
import { Sparkles } from 'lucide-react';

export default function AIDisclaimer({ className = '' }) {
  return (
    <div
      className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs ${className}`}
    >
      <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
      <span>AI-assisted coordination, not medical advice</span>
    </div>
  );
}
