import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { formatCentsToUSD } from '../../utils/currency';
import AIDisclaimer from '../../components/AIDisclaimer';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Lock,
  CreditCard,
  Sparkles,
  Info,
} from 'lucide-react';

export default function BookingPayment() {
  const { id: bookingId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [payError, setPayError] = useState(null);

  // 1. Fetch Booking Details
  const {
    data: booking,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['bookingDetail', bookingId],
    queryFn: async () => {
      const res = await api.get(`/bookings/${bookingId}`);
      return res.data?.data;
    },
    onSuccess: (data) => {
      // If already paid and confirmed, redirect to confirmation page
      if (data?.status === 'CONFIRMED') {
        navigate(`/patient/bookings/${bookingId}/confirmation`, { replace: true });
      }
    },
  });

  // 2. Pay Deposit Mutation
  const payMutation = useMutation({
    mutationFn: async () => {
      setPayError(null);
      const res = await api.post(`/bookings/${bookingId}/pay`);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookingDetail', bookingId]);
      queryClient.invalidateQueries(['patientBookings']);
      navigate(`/patient/bookings/${bookingId}/confirmation`);
    },
    onError: (err) => {
      setPayError(
        err.response?.data?.message || err.message || 'Payment simulation failed'
      );
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Loading booking...</span>
            <AIDisclaimer />
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full space-y-6">
          <div className="h-64 bg-slate-200 rounded-2xl animate-pulse"></div>
        </main>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Booking Not Found</h1>
          <p className="text-xs text-slate-500">
            {error?.response?.data?.message || 'Could not retrieve booking details.'}
          </p>
          <Link
            to="/patient"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const quoteTotal = booking.quotation?.totalCents || 0;
  const depositAmount = booking.bookingFeeCents || Math.round(quoteTotal * 0.2);
  const remainingBalance = Math.max(0, quoteTotal - depositAmount);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to={`/patient/cases/${booking.caseId}`}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Case</span>
          </Link>
          <AIDisclaimer />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Step Header */}
        <div className="space-y-1">
          <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">
            Step 10: Deposit Confirmation
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Confirm Booking &amp; Pay Deposit
          </h1>
          <p className="text-xs text-slate-500">
            Secure your surgical admission and physician schedule with a 20% deposit.
          </p>
        </div>

        {/* Demo Notice Banner */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-amber-900 shadow-2xs">
          <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <span className="font-extrabold tracking-wide uppercase text-amber-800 text-2xs block">
              Demo payment, no real money
            </span>
            <p className="leading-relaxed">
              This is a test simulation sandbox. No credit card or actual payment details are collected.
              Clicking below immediately confirms your booking deposit and transitions your case stage to <strong>BOOKED</strong>.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {payError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs font-medium text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{payError}</span>
          </div>
        )}

        {/* Booking Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Hospital & Procedure summary */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
                Selected Facility
              </span>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-1.5">
                <Building2 className="h-4 w-4 text-teal-700" />
                <span>{booking.hospital?.name}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {booking.hospital?.city}, {booking.hospital?.country}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-2xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
              Ref #{booking.id.slice(0, 8)}
            </span>
          </div>

          {/* Procedure & Breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Treatment Procedure:</span>
              <span className="font-bold text-slate-900">
                {booking.case?.treatment?.name || booking.case?.treatmentNeed || 'Medical Coordination'}
              </span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-slate-500">All-in Treatment Quote:</span>
              <span className="font-bold text-slate-900">
                {formatCentsToUSD(quoteTotal)}
              </span>
            </div>

            <div className="flex justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-500">Remaining Balance (upon admission):</span>
              <span className="text-slate-700 font-semibold">
                {formatCentsToUSD(remainingBalance)}
              </span>
            </div>

            {/* Prominent Deposit Due Box */}
            <div className="mt-4 p-4 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-2xs font-bold text-teal-800 uppercase tracking-wider block">
                  Upfront 20% Deposit Due Today
                </span>
                <span className="text-2xs text-teal-700">
                  Computed server-side deposit
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {formatCentsToUSD(depositAmount)}
              </div>
            </div>
          </div>

          {/* Security & Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Full deposit protection until formal intake</span>
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-teal-600 shrink-0" />
              <span>Encrypted audit trail &amp; compliant records</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={payMutation.isLoading}
              onClick={() => payMutation.mutate()}
              className="w-full inline-flex items-center justify-center space-x-2 py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            >
              {payMutation.isLoading ? (
                <span>Processing Deposit...</span>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>Pay deposit (demo) &mdash; {formatCentsToUSD(depositAmount)}</span>
                </>
              )}
            </button>
            <p className="text-center text-2xs text-slate-400 mt-2">
              No real credit card charged &bull; Demo simulation only
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
