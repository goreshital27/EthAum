import React from 'react';
import { Link } from 'react-router-dom';
import { formatCentsToUSD } from '../utils/currency';
import { X, CheckCircle2, XCircle, Clock, MapPin, Building2, ShieldCheck, Video, HelpCircle } from 'lucide-react';

export default function PackageDetailModal({ pkg, onClose }) {
  if (!pkg) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                {pkg.treatment?.specialty || 'Medical Care'}
              </span>
              {pkg.nights && (
                <span className="inline-flex items-center text-xs text-slate-500 font-medium">
                  <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  {pkg.nights} night(s) stay included
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{pkg.title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* Price & Hospital Card */}
          <div className="bg-teal-50/60 rounded-xl p-4 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Total Package Price</p>
              <p className="text-2xl font-extrabold text-slate-900">{formatCentsToUSD(pkg.priceCents)}</p>
              <p className="text-[11px] text-teal-800 mt-0.5">Fixed price &bull; No hidden clinic fees</p>
            </div>

            <div className="sm:border-l sm:border-teal-200 sm:pl-4 space-y-1">
              <p className="text-xs font-bold text-slate-900">{pkg.hospital?.name}</p>
              <div className="flex items-center text-xs text-slate-600 space-x-1">
                <MapPin className="h-3.5 w-3.5 text-teal-600" />
                <span>{pkg.hospital?.city}, {pkg.hospital?.country}</span>
              </div>
              <Link
                to={`/hospitals/${pkg.hospital?.slug}`}
                onClick={onClose}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 block"
              >
                View facility profile &rarr;
              </Link>
            </div>
          </div>

          {/* Inclusions */}
          {pkg.inclusions && pkg.inclusions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
                <span>What Is Included</span>
              </h3>
              <ul className="grid grid-cols-1 gap-2 pt-1">
                {pkg.inclusions.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-slate-700 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Exclusions */}
          {pkg.exclusions && pkg.exclusions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <XCircle className="h-4 w-4 text-rose-500" />
                <span>Exclusions</span>
              </h3>
              <ul className="grid grid-cols-1 gap-1.5 pt-1">
                {pkg.exclusions.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-slate-600 text-xs">
                    <span className="text-slate-400">&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cancellation Terms */}
          {pkg.cancellationTerms && (
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Cancellation &amp; Refund Policy
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                {pkg.cancellationTerms}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>

          <Link
            to="/register"
            onClick={onClose}
            className="inline-flex items-center px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 shadow-sm transition-colors"
          >
            Get a Quote for this Package
          </Link>
        </div>
      </div>
    </div>
  );
}
