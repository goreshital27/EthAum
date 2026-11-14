import React, { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  CalendarCheck,
  Video,
  Clock,
  User,
  Stethoscope,
  ExternalLink,
  AlertTriangle,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default function HospitalAppointments() {
  const { isPending } = useOutletContext() || {};
  const [statusFilter, setStatusFilter] = useState('ALL');

  const {
    data: appointments = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['hospitalAppointments', statusFilter],
    queryFn: async () => {
      const statusParam = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await api.get(`/appointments${statusParam}`);
      return res.data?.data || [];
    },
    enabled: !isPending,
  });

  const statusTabs = [
    { label: 'All Consultations', value: 'ALL' },
    { label: 'Awaiting Patient (Requested)', value: 'REQUESTED' },
    { label: 'Confirmed (Ready for Call)', value: 'CONFIRMED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  if (isPending) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-3">
        <AlertTriangle className="h-10 w-10 text-amber-600 mx-auto" />
        <h2 className="text-base font-bold text-amber-900">Your hospital is awaiting admin approval</h2>
        <p className="text-xs text-amber-800 max-w-md mx-auto">
          Scheduling exploratory and formal patient tele-consultations is locked until facility accreditation is approved.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarCheck className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Tele-Consultations &amp; Video Appointments
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Conduct exploratory coordination calls and formal pre-admission clinical reviews with international patients.
          </p>
        </div>

        <Link
          to="/hospital/leads"
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <span>Propose From Leads Inbox</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-semibold">
        {statusTabs.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
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

      {/* Appointments List Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-2 text-xs text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2" />
            <p>Loading appointments...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-rose-600 space-y-2">
            <p>
              Failed to load appointments: {error?.response?.data?.message || error?.message || 'Unable to connect. Please try again.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-1.5 bg-rose-50 text-rose-700 rounded-lg font-semibold"
            >
              Retry
            </button>
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <CalendarCheck className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No appointments found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {statusFilter !== 'ALL'
                ? `No consultations currently matching "${statusFilter}".`
                : 'Propose an exploratory consultation directly from any active patient inquiry in your Leads Inbox.'}
            </p>
            <Link
              to="/hospital/leads"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <span>View Leads Inbox</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50">
                  <th className="py-3 px-4 font-semibold">Treatment &amp; Case</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Scheduled Date &amp; Time</th>
                  <th className="py-3 px-4 font-semibold">Assigned Specialist</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Video Call Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((appt) => {
                  const isConfirmed = appt.status === 'CONFIRMED';
                  const isRequested = appt.status === 'REQUESTED';

                  const statusColors = {
                    REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200',
                    CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
                    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
                    NO_SHOW: 'bg-rose-50 text-rose-700 border-rose-200',
                  }[appt.status] || 'bg-slate-100 text-slate-600';

                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {appt.case?.treatment?.name || appt.case?.treatmentNeed || 'General Medical'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Ref: <code className="font-mono">{appt.caseId.slice(0, 8)}</code>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            appt.type === 'FORMAL'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}
                        >
                          {appt.type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {new Date(appt.scheduledAt).toLocaleDateString([], {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>
                            {new Date(appt.scheduledAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            ({appt.timezone || 'UTC'})
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {appt.doctor?.name ? (
                          <div>
                            <div className="font-semibold text-slate-900">{appt.doctor.name}</div>
                            <div className="text-[11px] text-slate-500">{appt.doctor.specialty}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Facility Team</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors}`}
                        >
                          {appt.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isConfirmed && appt.videoLink ? (
                          <a
                            href={appt.videoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>Join Video Call</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : isRequested ? (
                          <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            Awaiting Patient Acceptance
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unavailable</span>
                        )}
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
