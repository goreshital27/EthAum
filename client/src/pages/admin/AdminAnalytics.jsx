import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { formatCentsToUSD } from '../../utils/currency';
import {
  BarChart3,
  Building2,
  FolderOpen,
  DollarSign,
  Share2,
  Users,
  Clock,
  MapPin,
  TrendingUp,
  AlertCircle,
  Activity,
} from 'lucide-react';

export default function AdminAnalytics() {
  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminAnalytics'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics');
      return res.data?.data;
    },
  });

  const stats = response || {
    countsByStage: {},
    stageList: [],
    casesPerCountry: [],
    approvedHospitalsCount: 0,
    pendingHospitalsCount: 0,
    totalBookingValueCents: 0,
    totalCommissionsCents: 0,
    totalCases: 0,
    totalUsers: 0,
  };

  const maxStageCount = Math.max(1, ...(stats.stageList || []).map((s) => s.count));

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-rose-600 shrink-0" />
            <span>Marketplace Analytics &amp; Pipeline</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Key operational metrics across hospital network verification, patient journeys, and financial settlement.
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
          Live Operational Snapshot
        </span>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-white p-8 rounded-2xl border border-rose-200 text-center space-y-3 shadow-xs">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-slate-900">Failed to load marketplace analytics</p>
          <p className="text-xs text-slate-500">{error?.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* 6 Core Stat Cards */}
      {!isLoading && !isError && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1: Approved Hospitals */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Approved Hospitals
                </span>
                <p className="text-3xl font-black text-slate-900">{stats.approvedHospitalsCount}</p>
                <p className="text-[11px] text-emerald-600 font-semibold">Active in marketplace</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Building2 className="h-6 w-6" />
              </div>
            </div>

            {/* Card 2: Total Cases */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Case Inquiries
                </span>
                <p className="text-3xl font-black text-slate-900">{stats.totalCases}</p>
                <p className="text-[11px] text-teal-600 font-semibold">Cross-border inquiries</p>
              </div>
              <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                <FolderOpen className="h-6 w-6" />
              </div>
            </div>

            {/* Card 3: Booking Value */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Booking Fees
                </span>
                <p className="text-3xl font-black text-slate-900">
                  {formatCentsToUSD(stats.totalBookingValueCents)}
                </p>
                <p className="text-[11px] text-slate-400">Escrow deposit volume</p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>

            {/* Card 4: Commissions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Referral Commissions
                </span>
                <p className="text-3xl font-black text-slate-900">
                  {formatCentsToUSD(stats.totalCommissionsCents)}
                </p>
                <p className="text-[11px] text-slate-400">5% patient affiliate volume</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Share2 className="h-6 w-6" />
              </div>
            </div>

            {/* Card 5: Platform Users */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Registered Users
                </span>
                <p className="text-3xl font-black text-slate-900">{stats.totalUsers}</p>
                <p className="text-[11px] text-slate-400">Patients &amp; providers</p>
              </div>
              <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>

            {/* Card 6: Pending Queue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pending Approvals
                </span>
                <p className="text-3xl font-black text-amber-600">{stats.pendingHospitalsCount}</p>
                <p className="text-[11px] text-slate-400">Awaiting accreditation check</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Bar Chart & Country Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Simple Bar Chart (Cases by Stage) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-rose-600" />
                  <h2 className="text-base font-extrabold text-slate-900">Cases by Pipeline Stage</h2>
                </div>
                <span className="text-xs text-slate-400">
                  Sequential Journey Distribution
                </span>
              </div>

              {/* Bar Chart Bars */}
              <div className="space-y-3">
                {(stats.stageList || []).map((item) => {
                  const percentage = maxStageCount > 0 ? (item.count / maxStageCount) * 100 : 0;
                  const isClosed = item.stage === 'CLOSED';

                  return (
                    <div key={item.stage} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700">{item.stage}</span>
                        <span className="text-slate-900 font-bold">{item.count}</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex items-center">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isClosed
                              ? 'bg-slate-400'
                              : item.count > 0
                              ? 'bg-gradient-to-r from-teal-500 to-rose-500'
                              : 'bg-transparent'
                          }`}
                          style={{ width: `${Math.max(percentage, item.count > 0 ? 5 : 0)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 1 Col: Destination Country Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <MapPin className="h-5 w-5 text-teal-600" />
                <h2 className="text-base font-extrabold text-slate-900">Destination Hubs</h2>
              </div>

              {stats.casesPerCountry.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No destination data recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.casesPerCountry.map((item) => {
                    const pct = stats.totalCases > 0 ? Math.round((item.count / stats.totalCases) * 100) : 0;
                    return (
                      <div key={item.country} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-800">{item.country}</span>
                          <span className="text-rose-600">{item.count} cases ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
