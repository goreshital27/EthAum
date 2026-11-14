import React from 'react';
import { Sparkles } from 'lucide-react';

export default function AIDisclaimer({ className = '', variant = 'pill' }) {
  if (variant === 'strip') {
    return (
      <div
        className={`w-full bg-teal-50/80 border-b border-teal-100/70 py-1 px-4 text-center text-xs font-medium text-teal-900 flex items-center justify-center space-x-1.5 ${className}`}
      >
        <Sparkles className="h-3.5 w-3.5 text-teal-600 shrink-0" />
        <span>AI-assisted coordination, not medical advice</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs ${className}`}
    >
      <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
      <span>AI-assisted coordination, not medical advice</span>
    </div>
  );
}
