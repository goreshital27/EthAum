import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { formatCentsToUSD } from '../../utils/currency';
import {
  Share2,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export default function AdminReferrals() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // 1. Fetch Referrals & Commission Totals
  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminReferrals', statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
      params.set('page', page);
      params.set('limit', 20);

      const res = await api.get(`/admin/referrals?${params.toString()}`);
      return res.data;
    },
    keepPreviousData: true,
  });

  const referrals = response?.data || [];
  const totals = response?.totals || {
    totalCommissionCents: 0,
    paidCommissionCents: 0,
    pendingCommissionCents: 0,
    totalCount: 0,
  };
  const pagination = response?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

  // 2. Mark as Paid Mutation
  const markPaidMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/admin/referrals/${id}/mark-paid`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['adminReferrals']);
      queryClient.invalidateQueries(['adminAnalytics']);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to mark referral as paid');
    },
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Share2 className="h-6 w-6 text-rose-600 shrink-0" />
            <span>Referrals &amp; Commissions</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Audit patient affiliate referrals, track 5% commission payouts, and execute payouts.
          </p>
        </div>
        <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 self-start sm:self-auto">
          Standard Rate: 5.0%
        </span>
      </div>

      {/* Totals Summary Cards (Amounts in Dollars) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Commissions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Commissions</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCentsToUSD(totals.totalCommissionCents)}
          </p>
          <p className="text-[11px] text-slate-400">Total volume across all referral codes</p>
        </div>

        {/* Paid Commissions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Disbursed (Paid)</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 tracking-tight">
            {formatCentsToUSD(totals.paidCommissionCents)}
          </p>
          <p className="text-[11px] text-slate-400">Commissions marked and settled</p>
        </div>

        {/* Pending Commissions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Settlement</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 tracking-tight">
            {formatCentsToUSD(totals.pendingCommissionCents)}
          </p>
          <p className="text-[11px] text-slate-400">Awaiting payout execution</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        {['', 'PENDING', 'QUALIFIED', 'PAID', 'VOID'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => {
              setStatusFilter(st);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === st
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {st === '' ? 'All Referrals' : st}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-white p-8 rounded-2xl border border-rose-200 text-center space-y-3 shadow-xs">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-slate-900">Failed to load referrals</p>
          <p className="text-xs text-slate-500">
            {error?.response?.data?.message || error?.message || 'Unable to retrieve referral program data. Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && referrals.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
          <Share2 className="h-8 w-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Referrals Recorded</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {statusFilter
              ? `No referral records found with status '${statusFilter}'.`
              : 'Patients have not generated referral bookings yet.'}
          </p>
        </div>
      )}

      {/* Referrals Table */}
      {!isLoading && !isError && referrals.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Referral Code</th>
                  <th className="py-3 px-4">Referrer</th>
                  <th className="py-3 px-4">Referred Patient</th>
                  <th className="py-3 px-4">Commission (USD)</th>
                  <th className="py-3 px-4">Rate</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.map((r) => {
                  const isPaid = r.status === 'PAID';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Referral Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-700 text-xs">
                        {r.code}
                      </td>

                      {/* Referrer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{r.referrerName}</div>
                        <div className="text-[11px] text-slate-400">{r.referrerEmail}</div>
                      </td>

                      {/* Referred Patient */}
                      <td className="py-3.5 px-4">
                        {r.referredPatientEmail ? (
                          <>
                            <div className="font-semibold text-slate-800">{r.referredPatientName}</div>
                            <div className="text-[11px] text-slate-400">{r.referredPatientEmail}</div>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Unclaimed code</span>
                        )}
                      </td>

                      {/* Commission (USD) */}
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 text-sm">
                        {formatCentsToUSD(r.commissionCents)}
                      </td>

                      {/* Rate */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {(r.commissionRateBps / 100).toFixed(1)}%
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            r.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : r.status === 'QUALIFIED'
                              ? 'bg-teal-50 text-teal-800 border-teal-200'
                              : r.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {!isPaid ? (
                          <button
                            type="button"
                            disabled={markPaidMutation.isLoading}
                            onClick={() => {
                              if (window.confirm(`Mark commission for code ${r.code} (${formatCentsToUSD(r.commissionCents)}) as PAID?`)) {
                                markPaidMutation.mutate(r.id);
                              }
                            }}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-colors disabled:opacity-50"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>Mark as Paid</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-700 space-x-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Settled</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
