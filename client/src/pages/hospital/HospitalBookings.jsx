import React, { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { formatCentsToUSD } from '../../utils/currency';
import {
  CalendarCheck,
  Building2,
  User,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Video,
} from 'lucide-react';

export default function HospitalBookings() {
  const { isPending } = useOutletContext() || {};
  const [statusFilter, setStatusFilter] = useState('');

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['hospitalBookings', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/bookings?${params.toString()}`);
      return res.data;
    },
    enabled: !isPending,
  });

  const bookings = response?.data || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <CalendarCheck className="h-6 w-6 text-indigo-600" />
            <span>Hospital Bookings &amp; Deposits</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Confirmed patient surgical admissions with 20% upfront deposit recorded (demo).
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Bookings</option>
            <option value="CONFIRMED">Confirmed &amp; Deposit Paid</option>
            <option value="PENDING_PAYMENT">Pending Deposit</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <div className="h-24 bg-slate-100 rounded-2xl animate-pulse"></div>
          <div className="h-24 bg-slate-100 rounded-2xl animate-pulse"></div>
        </div>
      )}

      {isError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-2 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error?.response?.data?.message || 'Failed to load bookings.'}</span>
        </div>
      )}

      {!isLoading && !isError && bookings.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3 shadow-2xs">
          <Clock className="h-8 w-8 text-slate-400 mx-auto" />
          <h2 className="text-sm font-bold text-slate-800">No Patient Bookings Yet</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When patients shortlist your quotations and confirm their 20% deposit, their bookings will appear here.
          </p>
        </div>
      )}

      {!isLoading && !isError && bookings.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {bookings.map((booking) => {
            const isConfirmed = booking.status === 'CONFIRMED';
            const paidPayment = booking.payments?.find((p) => p.status === 'PAID');
            const patientName =
              booking.case?.patient?.patientProfile?.fullName || 'International Patient';

            return (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-2xs font-extrabold ${
                        isConfirmed
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {isConfirmed ? 'CONFIRMED & DEPOSIT PAID' : 'PENDING DEPOSIT'}
                    </span>
                    <span className="text-2xs text-slate-400">
                      Ref #{booking.id.slice(0, 8)}
                    </span>
                    <span className="text-2xs text-slate-400">
                      &bull; Case Stage: {booking.case?.stage || 'BOOKED'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {booking.case?.treatment?.name || booking.case?.treatmentNeed || 'Medical Case'}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{patientName}</span>
                      <span>&bull;</span>
                      <span>{booking.case?.patient?.patientProfile?.country || 'International'}</span>
                    </p>
                  </div>
                </div>

                {/* Financial Summary & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                  <div className="text-left md:text-right">
                    <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
                      Total / Deposit
                    </span>
                    <div className="text-sm font-black text-slate-900">
                      {formatCentsToUSD(booking.quotation?.totalCents || 0)}
                    </div>
                    <span className="text-2xs text-emerald-700 font-bold">
                      Deposit: {formatCentsToUSD(paidPayment?.amountCents || booking.bookingFeeCents)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {isConfirmed && (
                      <Link
                        to="/hospital/appointments"
                        className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-colors"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>Propose Formal Consultation</span>
                      </Link>
                    )}
                    <Link
                      to="/hospital/leads"
                      className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      <span>Leads</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
