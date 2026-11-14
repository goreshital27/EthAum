import React, { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { formatCentsToUSD } from '../../utils/currency';
import {
  Inbox,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  Eye,
  FileCheck2,
} from 'lucide-react';

export default function HospitalLeads() {
  const { isPending } = useOutletContext() || {};
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const limit = 10;

  const {
    data: leadsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['hospitalLeads', selectedStatus, page],
    queryFn: async () => {
      const statusParam = selectedStatus !== 'ALL' ? `&status=${selectedStatus}` : '';
      const res = await api.get(`/hospital/leads?page=${page}&limit=${limit}${statusParam}`);
      return res.data?.data;
    },
    enabled: !isPending,
    keepPreviousData: true,
  });

  const leads = leadsData?.leads || [];
  const totalPages = leadsData?.totalPages || 1;
  const totalLeads = leadsData?.total || 0;

  const statusTabs = [
    { label: 'All Inquiries', value: 'ALL' },
    { label: 'New', value: 'NEW' },
    { label: 'Under Review', value: 'VIEWED' },
    { label: 'Quotes Sent', value: 'RESPONDED' },
    { label: 'Declined', value: 'DECLINED' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Inbox className="h-6 w-6 text-indigo-600" />
            <span>Patient Inquiries &amp; Leads</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review incoming medical inquiries, evaluate uploaded clinical records, and issue binding itemized quotes.
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
          <strong>Privacy Rule:</strong> Patient contact details are disclosed only after a quotation is issued.
        </div>
      </div>

      {/* If Pending Approval Banner */}
      {isPending ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
          <AlertTriangle className="h-10 w-10 text-amber-600 mx-auto" />
          <h2 className="text-base font-bold text-amber-900">Your hospital is awaiting admin approval</h2>
          <p className="text-xs sm:text-sm text-amber-800 max-w-xl mx-auto">
            Lead inquiry routing and quote submissions are locked until your hospital's official accreditations
            and provider verification have been validated by platform administrators.
          </p>
        </div>
      ) : (
        <>
          {/* Status Tabs Bar */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-semibold">
            {statusTabs.map((tab) => {
              const isActive = selectedStatus === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(tab.value);
                    setPage(1);
                  }}
                  className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Leads Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-20 text-center space-y-2 text-xs text-slate-400">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2" />
                <p>Loading inquiries...</p>
              </div>
            ) : isError ? (
              <div className="py-16 text-center text-xs text-rose-600 space-y-2">
                <p>Failed to load patient leads: {error?.response?.data?.message || error?.message}</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="px-3 py-1 bg-rose-50 text-rose-700 rounded border border-rose-200 font-semibold"
                >
                  Retry
                </button>
              </div>
            ) : leads.length === 0 ? (
              <div className="py-16 text-center space-y-3 px-4">
                <Inbox className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No leads found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {selectedStatus !== 'ALL'
                    ? `There are no inquiries currently matching the "${selectedStatus}" filter.`
                    : 'Your hospital has no active patient inquiries yet.'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50">
                        <th className="py-3 px-4 font-semibold">Treatment / Need</th>
                        <th className="py-3 px-4 font-semibold">Patient Origin</th>
                        <th className="py-3 px-4 font-semibold">Target Budget</th>
                        <th className="py-3 px-4 font-semibold">Case Stage</th>
                        <th className="py-3 px-4 font-semibold">Urgency</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leads.map((lead) => {
                        const statusBadge = {
                          NEW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          VIEWED: 'bg-blue-50 text-blue-700 border-blue-200',
                          RESPONDED: 'bg-purple-50 text-purple-700 border-purple-200',
                          DECLINED: 'bg-rose-50 text-rose-700 border-rose-200',
                          EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200',
                        }[lead.status] || 'bg-slate-100 text-slate-600 border-slate-200';

                        return (
                          <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Treatment */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 text-sm">
                                {lead.treatment.name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {lead.treatment.specialty}
                              </div>
                            </td>

                            {/* Patient (Anonymized vs Revealed) */}
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-800">{lead.country}</div>
                              {lead.patient.isRevealed ? (
                                <div className="text-[11px] text-emerald-700 font-semibold flex items-center space-x-1 mt-0.5">
                                  <UserCheck className="h-3 w-3" />
                                  <span>{lead.patient.name}</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic flex items-center space-x-1 mt-0.5">
                                  <Lock className="h-2.5 w-2.5" />
                                  <span>Confidential Patient</span>
                                </div>
                              )}
                            </td>

                            {/* Budget */}
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              {lead.budget.budgetCents
                                ? formatCentsToUSD(lead.budget.budgetCents)
                                : 'Not specified'}
                            </td>

                            {/* Case Stage */}
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {lead.stage}
                              </span>
                            </td>

                            {/* Urgency */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  lead.urgency === 'URGENT' || lead.urgency === 'HIGH'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {lead.urgency}
                              </span>
                            </td>

                            {/* Enquiry Status */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}
                              >
                                {lead.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <Link
                                to={`/hospital/leads/${lead.id}`}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                              >
                                <span>Review &amp; Quote</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                  <span>
                    Showing {leads.length} of {totalLeads} total inquiries
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Previous</span>
                    </button>
                    <span className="font-semibold text-slate-700">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
