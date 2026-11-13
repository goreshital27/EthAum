import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCompare } from '../context/CompareContext';
import { Scale, X, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';

export default function CompareBar() {
  const { selectedHospitals, removeHospital, clearComparison, limitNotice, maxLimit } = useCompare();
  const location = useLocation();

  // Do not show the floating bar if user is already on the /compare page
  if (selectedHospitals.length === 0 || location.pathname === '/compare') {
    return null;
  }

  const slugsQuery = selectedHospitals.map((h) => encodeURIComponent(h.slug)).join(',');
  const canCompare = selectedHospitals.length >= 2;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 pointer-events-none">
      <div className="max-w-4xl mx-auto bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 p-3.5 sm:p-4 pointer-events-auto backdrop-blur-lg bg-opacity-95">
        {/* Limit notice alert */}
        {limitNotice && (
          <div className="mb-2 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Maximum of {maxLimit} hospitals can be compared at once. Remove one to add another.</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Left info & chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-teal-400 mr-1">
              <Scale className="h-4 w-4" />
              <span>Compare ({selectedHospitals.length}/{maxLimit})</span>
            </div>

            {selectedHospitals.map((h) => (
              <span
                key={h.slug}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700"
              >
                <span className="truncate max-w-[120px] sm:max-w-[160px]">{h.name}</span>
                <button
                  type="button"
                  onClick={() => removeHospital(h.slug)}
                  className="text-slate-400 hover:text-rose-400 transition-colors p-0.5"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {selectedHospitals.length < 2 && (
              <span className="text-[11px] text-slate-400 italic">
                (Add 1 more to compare)
              </span>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={clearComparison}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center space-x-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>

            {canCompare ? (
              <Link
                to={`/compare?slugs=${slugsQuery}`}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 active:bg-rose-700 shadow-sm transition-colors"
              >
                <span>Compare Now</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 bg-slate-800 cursor-not-allowed border border-slate-700"
              >
                <span>Compare ({selectedHospitals.length}/2)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
