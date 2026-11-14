import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import AIDisclaimer from '../../components/AIDisclaimer';
import NotificationBell from '../../components/NotificationBell';
import {
  HeartPulse,
  Share2,
  Copy,
  Check,
  Users,
  DollarSign,
  Gift,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function PatientReferrals() {
  const { user } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['myReferrals'],
    queryFn: async () => {
      const res = await api.get('/referrals/me');
      return res.data?.data;
    },
  });

  const referralCode = data?.code || '';
  const shareUrl = referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : '';
  const totalCommissionDollars = data?.totalCommissionDollars || '0.00';
  const referredPatients = data?.referredPatients || [];

  const handleCopyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>Paid</span>
          </span>
        );
      case 'QUALIFIED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
            <ShieldCheck className="h-3 w-3 text-teal-600" />
            <span>Booking Confirmed</span>
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="h-3 w-3 text-amber-600" />
            <span>Registered &bull; Pending Booking</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2">
              <HeartPulse className="h-7 w-7 text-teal-600" />
              <span className="text-xl font-bold text-slate-900 tracking-tight">EthAum</span>
            </Link>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
              Patient Portal
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <NotificationBell />
            <AIDisclaimer className="hidden md:inline-flex" />
            <div className="text-right hidden sm:block pl-2 border-l border-slate-200">
              <p className="text-xs font-bold text-slate-900">{user?.name || user?.email}</p>
              <p className="text-[11px] text-slate-500">Verified Patient</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/patient"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-teal-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <AIDisclaimer className="md:hidden" />
        </div>

        {/* Page Title */}
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-2xs font-extrabold tracking-wide uppercase">
            <Gift className="h-3 w-3" />
            <span>Referral Program &bull; 5% Commission</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Patient Referral Program
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
            Invite friends or family undergoing medical procedures abroad. When they book and confirm their treatment at an accredited hospital, you earn a 5% commission on their surgical quote.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <div className="h-28 bg-slate-200/70 rounded-2xl animate-pulse"></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-24 bg-slate-200/70 rounded-2xl animate-pulse"></div>
              <div className="h-24 bg-slate-200/70 rounded-2xl animate-pulse"></div>
              <div className="h-24 bg-slate-200/70 rounded-2xl animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error?.response?.data?.message || 'Failed to load referral details.'}</span>
            </div>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 bg-white border border-rose-200 rounded-lg text-rose-700 font-bold hover:bg-rose-100 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Earned */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-2xs font-extrabold uppercase tracking-wider">
                    Total Commission Earned
                  </span>
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">
                  ${totalCommissionDollars}
                </div>
                <p className="text-2xs text-slate-400">Sum of all referral commissions</p>
              </div>

              {/* Referred Count */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-2xs font-extrabold uppercase tracking-wider">
                    Patients Referred
                  </span>
                  <Users className="h-4 w-4 text-teal-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">
                  {referredPatients.length}
                </div>
                <p className="text-2xs text-slate-400">Total registered friends &amp; family</p>
              </div>

              {/* Commission Rate */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-2xs font-extrabold uppercase tracking-wider">
                    Commission Rate
                  </span>
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">5.0%</div>
                <p className="text-2xs text-slate-400">500 bps on booked hospital quote total</p>
              </div>
            </div>

            {/* Referral Code & Share Link Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Share2 className="h-5 w-5 text-teal-700" />
                  <span>Your Personal Referral Details</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Give friends your code to enter at registration, or send your direct signup link.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Referral Code Box */}
                <div className="space-y-1.5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="text-2xs font-extrabold uppercase tracking-wider text-slate-500 block">
                    Your Referral Code
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="flex-1 font-mono text-base sm:text-lg font-bold text-teal-900 tracking-wider bg-white px-3 py-2 rounded-lg border border-slate-200 select-all">
                      {referralCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-2xs shrink-0 cursor-pointer"
                      title="Copy referral code"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-200" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Share Link Box */}
                <div className="space-y-1.5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="text-2xs font-extrabold uppercase tracking-wider text-slate-500 block">
                    Direct Invite Link
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 text-xs font-mono text-slate-700 bg-white px-3 py-2.5 rounded-lg border border-slate-200 truncate select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-2xs shrink-0 cursor-pointer"
                      title="Copy invite link"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Referred Patients List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Users className="h-5 w-5 text-teal-700" />
                    <span>Referred Patients</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    For patient privacy, only first names and booking status are displayed.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {referredPatients.length} {referredPatients.length === 1 ? 'patient' : 'patients'}
                </span>
              </div>

              {referredPatients.length === 0 ? (
                /* Clean Empty State */
                <div className="p-12 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-700">
                    <Gift className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">No patients referred yet</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Share your unique referral code or link with friends and family. When they register and confirm a medical procedure booking, you will earn a 5% commission.
                  </p>
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-xs"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Copy Your Share Link</span>
                  </button>
                </div>
              ) : (
                /* Referred Patients Table / Cards (Responsive for 393px width) */
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-2xs">
                      <tr>
                        <th className="px-5 py-3">Referred Patient</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Commission Earned</th>
                        <th className="px-5 py-3 text-right">Date Referred</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {referredPatients.map((patient) => (
                        <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-slate-900 text-sm">
                              {patient.firstName}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">{getStatusBadge(patient.status)}</td>
                          <td className="px-5 py-3.5 text-right font-extrabold text-slate-900">
                            {patient.commissionCents > 0
                              ? `$${patient.commissionDollars}`
                              : '$0.00'}
                          </td>
                          <td className="px-5 py-3.5 text-right text-slate-400 text-2xs font-mono">
                            {new Date(patient.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} EthAum Healthcare Marketplace. All rights reserved.</p>
          <p className="mt-1 font-medium text-amber-700">AI-assisted coordination, not medical advice</p>
        </div>
      </footer>
    </div>
  );
}
