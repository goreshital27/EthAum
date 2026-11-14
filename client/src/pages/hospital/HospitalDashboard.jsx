import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { formatCentsToUSD } from '../../utils/currency';
import {
  Inbox,
  FileCheck2,
  CalendarCheck,
  Building2,
  Stethoscope,
  Users,
  ArrowRight,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function HospitalDashboard() {
  const { user } = useAuth();
  const outletContext = useOutletContext() || {};
  const isPending = outletContext.isPending ?? (user?.verificationStatus === 'PENDING');

  // 1. Fetch leads summary (first page, limit 5)
  const {
    data: leadsData,
    isLoading: isLeadsLoading,
    isError: isLeadsError,
  } = useQuery({
    queryKey: ['hospitalLeadsSummary'],
    queryFn: async () => {
      const res = await api.get('/hospital/leads?limit=5');
      return res.data?.data;
    },
    enabled: !isPending,
  });

  // 2. Fetch quotes sent count
  const {
    data: quotesData,
    isLoading: isQuotesLoading,
  } = useQuery({
    queryKey: ['hospitalQuotesCount'],
    queryFn: async () => {
      const res = await api.get('/hospital/quotes?limit=1');
      return res.data;
    },
    enabled: !isPending,
  });

  // 3. Fetch hospital profile to get doctor and treatment counts
  const {
    data: profileData,
    isLoading: isProfileLoading,
  } = useQuery({
    queryKey: ['hospitalProfile'],
    queryFn: async () => {
      const res = await api.get('/hospital/profile');
      return res.data?.data;
    },
  });

  const totalLeads = leadsData?.total || 0;
  const newLeadsCount = leadsData?.leads?.filter((l) => l.status === 'NEW').length || 0;
  const quotesSentCount = quotesData?.pagination?.total || 0;
  const upcomingAppointmentsCount = 0; // Explicit requirement: appointments show 0 for now

  const recentLeads = leadsData?.leads || [];

  return (
    <div className="space-y-6">
      {/* Welcome & Facility Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {profileData?.name || user?.hospital?.name || 'Hospital Administration'}
            </h1>
            {!isPending ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-3 w-3 mr-1" /> Verified Partner
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="h-3 w-3 mr-1" /> Pending Approval
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {profileData?.city && profileData?.country
              ? `${profileData.city}, ${profileData.country}`
              : 'International Accredited Facility'} &bull; Case intake and itemized quotation management
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/hospital/leads"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Inbox className="h-4 w-4" />
            <span>Open Leads Inbox</span>
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid (Requirement 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: New Leads */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              New Inbound Leads
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Inbox className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            {isPending ? '—' : isLeadsLoading ? '...' : newLeadsCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {isPending
              ? 'Lead intake disabled while pending approval'
              : `${totalLeads} total cases assigned to your facility`}
          </p>
        </div>

        {/* Metric 2: Quotes Sent */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Quotes Issued
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            {isPending ? '—' : isQuotesLoading ? '...' : quotesSentCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {isPending ? 'Quotation tool disabled' : 'Itemized treatment quotations provided'}
          </p>
        </div>

        {/* Metric 3: Upcoming Appointments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Upcoming Consultations
            </span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            {upcomingAppointmentsCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Exploratory video coordination (coming soon)
          </p>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/hospital/treatments"
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-300 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Treatments &amp; Pricing
              </h3>
              <p className="text-xs text-slate-500">
                {profileData?.treatments?.length || 0} procedures configured
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </Link>

        <Link
          to="/hospital/doctors"
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-300 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Doctor Directory
              </h3>
              <p className="text-xs text-slate-500">
                {profileData?.doctors?.length || 0} specialist profiles
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </Link>

        <Link
          to="/hospital/profile"
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-300 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Hospital Profile
              </h3>
              <p className="text-xs text-slate-500">
                Provider-reported info &amp; services
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </Link>
      </div>

      {/* Recent Inbound Leads Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Inbound Leads</h2>
            <p className="text-xs text-slate-500">
              Patients seeking medical quotations matching your facility's specialties
            </p>
          </div>
          <Link
            to="/hospital/leads"
            className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span>View All Leads</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isPending ? (
          <div className="p-8 text-center bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
            <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto" />
            <h3 className="text-sm font-bold text-amber-900">Leads Disabled While Awaiting Approval</h3>
            <p className="text-xs text-amber-700 max-w-md mx-auto">
              Your hospital account is currently pending administrative verification. Once approved,
              qualified patient inquiries will appear here in real time.
            </p>
          </div>
        ) : isLeadsLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading leads...</div>
        ) : recentLeads.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Inbox className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No active enquiries yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When international patients request quotations for your procedures, they will be listed here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50/80">
                  <th className="py-2.5 px-3 font-semibold">Treatment Need</th>
                  <th className="py-2.5 px-3 font-semibold">Patient Origin</th>
                  <th className="py-2.5 px-3 font-semibold">Budget (USD)</th>
                  <th className="py-2.5 px-3 font-semibold">Urgency</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLeads.map((lead) => {
                  const statusColors = {
                    NEW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    VIEWED: 'bg-blue-50 text-blue-700 border-blue-200',
                    RESPONDED: 'bg-purple-50 text-purple-700 border-purple-200',
                    DECLINED: 'bg-rose-50 text-rose-700 border-rose-200',
                  };

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{lead.treatment.name}</div>
                        <div className="text-[11px] text-slate-500">{lead.treatment.specialty}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{lead.country}</div>
                        <div className="text-[10px] text-slate-400">
                          {lead.patient.isRevealed ? lead.patient.name : 'Confidential Identity'}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {lead.budget.budgetCents
                          ? formatCentsToUSD(lead.budget.budgetCents)
                          : 'Not specified'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {lead.urgency}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            statusColors[lead.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/hospital/leads/${lead.id}`}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        >
                          <span>Review &amp; Quote</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
