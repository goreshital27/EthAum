import React, { useRef, useEffect } from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';

export const STAGE_META = [
  { key: 'NEW', label: '1. New Case', desc: 'Case inquiry created' },
  { key: 'QUALIFIED', label: '2. Intake Qualified', desc: 'Records readiness verified' },
  { key: 'MEDICAL_REVIEW', label: '3. Clinical Review', desc: 'Pre-assessment of files' },
  { key: 'QUOTE_REQUESTED', label: '4. Quotes Requested', desc: 'Matching partner hospitals' },
  { key: 'QUOTE_SENT', label: '5. Quotes Ready', desc: 'Compare treatment estimates' },
  { key: 'CONSULTATION', label: '6. Tele-Consult', desc: 'Exploratory specialist calls' },
  { key: 'BOOKED', label: '7. Booked & Deposit', desc: 'Date and deposit confirmed' },
  { key: 'TREATMENT', label: '8. In-Hospital Care', desc: 'Procedure & stay abroad' },
  { key: 'AFTERCARE', label: '9. Aftercare', desc: 'Recovery & tele-followups' },
  { key: 'CLOSED', label: '10. Completed', desc: 'Journey concluded' },
];

export default function StageTracker({ currentStage }) {
  const currentIndex = STAGE_META.findIndex((s) => s.key === currentStage);
  const activeIndex = currentIndex !== -1 ? currentIndex : 0;
  const isClosed = currentStage === 'CLOSED';

  const containerRef = useRef(null);
  const activeStepRef = useRef(null);

  useEffect(() => {
    if (activeStepRef.current && containerRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeIndex]);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Care Journey Stage Pipeline</h3>
          <p className="text-xs text-slate-500">
            Current Stage: <span className="font-bold text-teal-700">{STAGE_META[activeIndex]?.label}</span> &bull; {STAGE_META[activeIndex]?.desc}
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
          Step {activeIndex + 1} of 10
        </span>
      </div>

      {/* Mobile Swipe Cue */}
      <div className="flex sm:hidden items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
        <span>&larr; Swipe to view all 10 stages &rarr;</span>
        <span className="font-semibold text-teal-700">Step {activeIndex + 1}/10</span>
      </div>

      {/* Responsive Horizontal / Scrollable Pipeline */}
      <div
        ref={containerRef}
        className="overflow-x-auto pb-2 scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <ol className="flex items-center min-w-[760px] text-xs font-medium py-1">
          {STAGE_META.map((stage, idx) => {
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;

            return (
              <li
                key={stage.key}
                ref={isCurrent ? activeStepRef : null}
                className={`flex-1 relative ${
                  idx !== STAGE_META.length - 1
                    ? 'after:content-[""] after:w-full after:h-0.5 after:bg-slate-200 after:inline-block after:absolute after:top-4 after:left-1/2 after:-z-0'
                    : ''
                }`}
              >
                <div className="flex flex-col items-center text-center relative z-10 px-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isCompleted
                        ? 'bg-teal-700 text-white'
                        : isCurrent
                        ? 'bg-rose-500 text-white ring-4 ring-rose-100'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 stroke-[3]" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 font-semibold text-[11px] leading-tight max-w-[70px] ${
                      isCurrent
                        ? 'text-rose-600 font-bold'
                        : isCompleted
                        ? 'text-teal-900'
                        : 'text-slate-400'
                    }`}
                  >
                    {stage.label.split('. ')[1] || stage.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
