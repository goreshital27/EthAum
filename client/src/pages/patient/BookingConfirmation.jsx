import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { formatCentsToUSD } from '../../utils/currency';
import AIDisclaimer from '../../components/AIDisclaimer';
import {
  CheckCircle2,
  Building2,
  CalendarCheck,
  ArrowRight,
  ShieldCheck,
  FileText,
  UserCheck,
  Award,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function BookingConfirmation() {
  const { id: bookingId } = useParams();

  const {
    data: booking,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['bookingConfirmation', bookingId],
    queryFn: async () => {
      const res = await api.get(`/bookings/${bookingId}`);
      return res.data?.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Loading confirmation...</span>
            <AIDisclaimer />
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full space-y-6">
          <div className="h-96 bg-slate-200 rounded-2xl animate-pulse"></div>
        </main>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Booking Confirmation Not Found</h1>
          <p className="text-xs text-slate-500">
            {error?.response?.data?.message || 'Could not retrieve confirmation.'}
          </p>
          <Link
            to="/patient"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800"
          >
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const quoteTotal = booking.quotation?.totalCents || 0;
  const paidPayment = booking.payments?.find((p) => p.status === 'PAID');
  const depositPaid = paidPayment?.amountCents || booking.bookingFeeCents || 0;
  const remainingBalance = Math.max(0, quoteTotal - depositPaid);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="text-xs font-bold text-teal-800 uppercase tracking-widest">
            EthAum Coordination
          </span>
          <AIDisclaimer />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full space-y-8">
        {/* Success Header Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center space-y-4">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
              Booking Confirmed &bull; Deposit Secured
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Your Medical Journey is Officially Booked!
            </h1>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Your 20% deposit has been safely secured. Hospital coordinators and specialist physicians
              have been notified to prepare your formal admission itinerary.
            </p>
          </div>

          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800">
            <span>Case Stage: BOOKED</span>
            <span>&bull;</span>
            <span>Booking #{booking.id.slice(0, 8)}</span>
          </div>
        </div>

        {/* Booking Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-teal-700" />
            <span>Reserved Treatment &amp; Facility</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3">
              <div>
                <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
                  Partner Hospital
                </span>
                <p className="text-sm font-bold text-slate-900">{booking.hospital?.name}</p>
                <p className="text-slate-500">
                  {booking.hospital?.city}, {booking.hospital?.country}
                </p>
              </div>

              <div>
                <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
                  Procedure
                </span>
                <p className="font-bold text-slate-900">
                  {booking.case?.treatment?.name || booking.case?.treatmentNeed || 'General Medical Coordination'}
                </p>
              </div>

              {booking.quotation?.doctor && (
                <div>
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
                    Lead Surgeon / Specialist
                  </span>
                  <p className="font-bold text-slate-900">{booking.quotation.doctor.name}</p>
                  <p className="text-2xs text-teal-700 font-medium">
                    {booking.quotation.doctor.specialty}
                  </p>
                </div>
              )}
            </div>

            {/* Financial Details */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                Financial Summary
              </span>

              <div className="flex justify-between">
                <span className="text-slate-500">All-in Quotation:</span>
                <span className="font-bold text-slate-900">{formatCentsToUSD(quoteTotal)}</span>
              </div>

              <div className="flex justify-between text-emerald-800 font-bold">
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>20% Deposit Paid (Secured):</span>
                </span>
                <span>{formatCentsToUSD(depositPaid)}</span>
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-200/80">
                <span className="text-slate-500">Remaining Balance:</span>
                <span className="font-bold text-slate-900">{formatCentsToUSD(remainingBalance)}</span>
              </div>
              <p className="text-3xs text-slate-400 italic">
                * Remaining balance is paid directly upon hospital admission.
              </p>

              {booking.referral && (
                <div className="pt-2 border-t border-slate-200 flex items-center space-x-1.5 text-2xs text-teal-800">
                  <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                  <span>Referral Code Verified: <strong>{booking.referral.code}</strong> (5% affiliate qualified)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Next Steps Card */}
        <div className="bg-teal-900 text-white rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-teal-200 flex items-center space-x-2">
            <CalendarCheck className="h-4 w-4" />
            <span>Next Journey Steps</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-teal-800/60 rounded-xl border border-teal-700/60 space-y-1.5">
              <span className="text-2xs font-extrabold text-teal-300 uppercase tracking-wider block">
                Step 11: Formal Video Consultation
              </span>
              <p className="text-teal-100 leading-relaxed">
                The hospital team will now propose formal pre-travel video consultations to review your diagnostic reports
                and align on surgical timelines.
              </p>
            </div>

            <div className="p-4 bg-teal-800/60 rounded-xl border border-teal-700/60 space-y-1.5">
              <span className="text-2xs font-extrabold text-teal-300 uppercase tracking-wider block">
                Step 12: In-Person Admission &amp; Travel
              </span>
              <p className="text-teal-100 leading-relaxed">
                Final travel itineraries, airport escort arrangements, and hospital arrival logistics will be coordinated
                via your case channel.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to={`/patient/cases/${booking.caseId}`}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 bg-teal-700 text-white text-xs font-bold rounded-xl hover:bg-teal-800 transition-colors shadow-2xs"
          >
            <span>View Medical Case &bull; Stage: BOOKED</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/patient"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-6 py-3 bg-white text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
