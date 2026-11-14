import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatCentsToUSD } from '../utils/currency';
import AIDisclaimer from '../components/AIDisclaimer';
import NotificationBell from '../components/NotificationBell';
import { STAGE_META } from '../components/StageTracker';
import {
  HeartPulse,
  Plus,
  FileSpreadsheet,
  Calendar,
  ShieldCheck,
  Clock,
  ArrowRight,
  AlertCircle,
  Building2,
  FolderOpen,
  MapPin,
  CheckCircle2,
  Activity,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  Gift,
  Menu,
  X,
} from 'lucide-react';

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPastCases, setShowPastCases] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch patient cases
  const {
    data: casesResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['patientCases'],
    queryFn: async () => {
      const res = await api.get('/cases');
      return res.data?.data || [];
    },
  });

  // Fetch patient bookings
  const { data: bookingsResponse } = useQuery({
    queryKey: ['patientDashboardBookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return res.data?.data || [];
    },
  });

  const bookings = bookingsResponse || [];
  const cases = casesResponse || [];
  const activeCases = cases.filter((c) => c.stage !== 'CLOSED');
  const pastCases = cases.filter((c) => c.stage === 'CLOSED');
  const activeCase = activeCases.length > 0 ? activeCases[0] : (cases[0] || null);

  // Aggregate stats across cases
  const totalQuotes = cases.reduce((acc, c) => acc + (c.quotesCount || 0), 0);
  const totalAppointments = cases.reduce((acc, c) => acc + (c.appointmentsCount || 0), 0);
  const totalAftercareTasks = cases.reduce((acc, c) => acc + (c.aftercareTasksCount || 0), 0);

  // Active stage meta
  const activeStageInfo = activeCase
    ? STAGE_META.find((s) => s.key === activeCase.stage) || STAGE_META[0]
    : null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Patient Header */}
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
            <AIDisclaimer className="hidden sm:inline-flex" />

            <div className="text-right hidden sm:block pl-2 border-l border-slate-200">
              <p className="text-xs font-bold text-slate-900">{user?.name || user?.email}</p>
              <p className="text-[11px] text-slate-500">Verified Patient</p>
            </div>

            <button
              onClick={handleLogout}
              className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-500" />
              <span>Log out</span>
            </button>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-3 shadow-lg">
            <div className="pb-2 border-b border-slate-100">
              <AIDisclaimer className="w-full justify-center" />
              <div className="mt-2 text-xs text-slate-600">
                Signed in as: <strong className="text-slate-900">{user?.name || user?.email}</strong>
              </div>
            </div>

            <div className="space-y-1">
              <Link
                to="/patient/cases/new"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold bg-teal-50 text-teal-800"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Medical Case</span>
              </Link>
              <Link
                to="/patient/referrals"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Gift className="h-4 w-4 text-teal-600" />
                <span>Referral Program (5% Commission)</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {user?.name || 'Patient'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Manage your healthcare inquiry, track hospital quotes, and access encrypted records.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start sm:self-auto">
            <Link
              to="/patient/referrals"
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 shadow-2xs transition-colors"
            >
              <Gift className="h-4 w-4 text-teal-600" />
              <span>Referral Program (5%)</span>
            </Link>

            <Link
              to="/patient/cases/new"
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Case</span>
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-48 bg-slate-200 rounded-2xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="h-28 bg-slate-200 rounded-xl"></div>
              <div className="h-28 bg-slate-200 rounded-xl"></div>
              <div className="h-28 bg-slate-200 rounded-xl"></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-white p-8 rounded-xl border border-rose-200 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Failed to load patient dashboard</p>
            <p className="text-xs text-slate-500">
              {error?.response?.data?.message || error?.message || 'Unable to retrieve your medical cases. Please try again.'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {/* Centerpiece: Big Current Stage Status */}
            {activeCase ? (
              <section className="bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-700/60 pb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                      Active Medical Journey Status
                    </span>
                    <span className="text-xs bg-teal-700/50 text-teal-200 px-3 py-0.5 rounded-full border border-teal-600/40">
                      Case #{activeCase.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
                    <div className="space-y-2 max-w-2xl">
                      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-bold shadow-xs">
                        <Activity className="h-3.5 w-3.5 animate-pulse" />
                        <span>Current Stage: {activeStageInfo?.label}</span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        {activeCase.treatment?.name || activeCase.treatmentNeed}
                      </h2>

                      <p className="text-xs sm:text-sm text-teal-100 leading-relaxed">
                        {activeStageInfo?.desc}. Our care coordination team and partner medical specialists are reviewing your case data.
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-teal-200 pt-1">
                        {activeCase.destination && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3.5 w-3.5 text-teal-400" />
                            <span>Target: {activeCase.destination.country}</span>
                          </div>
                        )}
                        {activeCase.budgetCents > 0 && (
                          <div>Budget: {formatCentsToUSD(activeCase.budgetCents)}</div>
                        )}
                        <div>Created {new Date(activeCase.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col gap-2">
                      <Link
                        to={`/patient/cases/${activeCase.id}`}
                        className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-teal-50 shadow-sm transition-colors"
                      >
                        <span>View Case Details</span>
                        <ArrowRight className="h-4 w-4 text-teal-700" />
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              /* Empty case onboarding */
              <section className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-sm">
                <div className="p-4 bg-teal-50 rounded-full w-16 h-16 mx-auto flex items-center justify-center text-teal-700 border border-teal-200">
                  <HeartPulse className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900">Start Your Medical Journey</h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                    You haven't initiated any medical inquiries yet. Create a case to upload records, get evaluated by accredited hospitals, and compare transparent quotes.
                  </p>
                </div>
                <Link
                  to="/patient/cases/new"
                  className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Start New Case Inquiry</span>
                </Link>
              </section>
            )}

            {/* 3 Summary Cards: Quotes, Appointments, Aftercare Tasks */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. Quotes Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <span className="text-2xl font-extrabold text-slate-900">{totalQuotes}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Hospital Quotes</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Detailed treatment plans and fixed cost estimates received from accredited hospitals.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-teal-700">
                  {totalQuotes > 0 ? `${totalQuotes} ready to compare` : 'Pending hospital responses'}
                </div>
              </div>

              {/* 2. Appointments Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <span className="text-2xl font-extrabold text-slate-900">{totalAppointments}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Consultations</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Scheduled exploratory calls and pre-op consultations with chief surgeons.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-teal-700">
                  {totalAppointments > 0 ? `${totalAppointments} consultation(s) arranged` : 'No upcoming calls scheduled'}
                </div>
              </div>

              {/* 3. Aftercare Tasks Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="text-2xl font-extrabold text-slate-900">{totalAftercareTasks}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Aftercare Milestones</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Post-procedure recovery checkpoints and telemedicine follow-ups.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-teal-700">
                  {totalAftercareTasks > 0 ? `${totalAftercareTasks} milestone(s) active` : 'Active during recovery phase'}
                </div>
              </div>
            </section>

            {/* My Bookings Section */}
            {bookings.length > 0 && (
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-teal-700" />
                    <h2 className="text-base font-bold text-slate-900">
                      My Hospital Bookings ({bookings.length})
                    </h2>
                  </div>
                  <span className="text-2xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                    Deposit Protected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookings.map((b) => {
                    const isConfirmed = b.status === 'CONFIRMED';
                    const paidPayment = b.payments?.find((p) => p.status === 'PAID');
                    const depositAmount = paidPayment?.amountCents || b.bookingFeeCents;

                    return (
                      <div
                        key={b.id}
                        className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-2 py-0.5 rounded-full text-2xs font-extrabold ${
                                isConfirmed
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {isConfirmed ? 'CONFIRMED' : 'PENDING DEPOSIT'}
                            </span>
                            <span className="text-2xs text-slate-400">
                              Ref #{b.id.slice(0, 8)}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900">
                            {b.hospital?.name}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {b.case?.treatment?.name || b.case?.treatmentNeed} &bull; {b.hospital?.city}, {b.hospital?.country}
                          </p>

                          <div className="flex justify-between text-xs pt-1">
                            <span className="text-slate-500">Total / Deposit:</span>
                            <span className="font-bold text-slate-900">
                              {formatCentsToUSD(b.quotation?.totalCents)} (Dep: {formatCentsToUSD(depositAmount)})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2 border-t border-slate-200/60">
                          {isConfirmed ? (
                            <Link
                              to={`/patient/bookings/${b.id}/confirmation`}
                              className="flex-1 text-center py-2 px-3 rounded-lg text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 transition-colors"
                            >
                              View Confirmation
                            </Link>
                          ) : (
                            <Link
                              to={`/patient/bookings/${b.id}/pay`}
                              className="flex-1 text-center py-2 px-3 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                            >
                              Pay Deposit (Demo)
                            </Link>
                          )}
                          <Link
                            to={`/patient/cases/${b.caseId}`}
                            className="py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                          >
                            Case
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* List of My Cases */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2">
                  <FolderOpen className="h-5 w-5 text-teal-700" />
                  <h2 className="text-base font-bold text-slate-900">Active Cases ({activeCases.length})</h2>
                </div>
                <Link
                  to="/patient/cases/new"
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center space-x-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Case</span>
                </Link>
              </div>

              {activeCases.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No active cases at this time.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[640px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                        <th className="pb-3">Procedure / Need</th>
                        <th className="pb-3">Stage</th>
                        <th className="pb-3">Destination</th>
                        <th className="pb-3">Budget</th>
                        <th className="pb-3">Quotes</th>
                        <th className="pb-3">Documents</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeCases.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 font-bold text-slate-900 max-w-[200px] truncate">
                            {c.treatment?.name || c.treatmentNeed}
                          </td>
                          <td className="py-3.5">
                            <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-teal-50 text-teal-800 border border-teal-200">
                              {c.stage}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-600">
                            {c.destination?.country || 'Any Destination'}
                          </td>
                          <td className="py-3.5 font-semibold text-slate-800">
                            {c.budgetCents ? formatCentsToUSD(c.budgetCents) : 'Flexible'}
                          </td>
                          <td className="py-3.5 text-slate-600">
                            {c.quotesCount} quote{c.quotesCount === 1 ? '' : 's'}
                          </td>
                          <td className="py-3.5 text-slate-600">
                            {c.documentsCount} record{c.documentsCount === 1 ? '' : 's'}
                          </td>
                          <td className="py-3.5 text-right">
                            <Link
                              to={`/patient/cases/${c.id}`}
                              className="inline-flex items-center space-x-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                            >
                              <span>Manage</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Past cases section (collapsed by default) */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPastCases((prev) => !prev)}
                  className="flex items-center justify-between w-full py-2 text-left text-xs font-semibold text-slate-600 hover:text-slate-900 focus:outline-hidden"
                >
                  <div className="flex items-center space-x-2">
                    {showPastCases ? (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    )}
                    <span>Past Cases ({pastCases.length})</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {showPastCases ? 'Hide' : 'Show'}
                  </span>
                </button>

                {showPastCases && (
                  <div className="mt-3">
                    {pastCases.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                        No past (closed) cases.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[640px]">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                              <th className="pb-3">Procedure / Need</th>
                              <th className="pb-3">Stage</th>
                              <th className="pb-3">Destination</th>
                              <th className="pb-3">Budget</th>
                              <th className="pb-3">Quotes</th>
                              <th className="pb-3">Documents</th>
                              <th className="pb-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {pastCases.map((c) => (
                              <tr key={c.id} className="hover:bg-slate-50/70 opacity-80">
                                <td className="py-3.5 font-bold text-slate-700 max-w-[200px] truncate">
                                  {c.treatment?.name || c.treatmentNeed}
                                </td>
                                <td className="py-3.5">
                                  <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                                    {c.stage}
                                  </span>
                                </td>
                                <td className="py-3.5 text-slate-600">
                                  {c.destination?.country || 'Any Destination'}
                                </td>
                                <td className="py-3.5 font-semibold text-slate-800">
                                  {c.budgetCents ? formatCentsToUSD(c.budgetCents) : 'Flexible'}
                                </td>
                                <td className="py-3.5 text-slate-600">
                                  {c.quotesCount} quote{c.quotesCount === 1 ? '' : 's'}
                                </td>
                                <td className="py-3.5 text-slate-600">
                                  {c.documentsCount} record{c.documentsCount === 1 ? '' : 's'}
                                </td>
                                <td className="py-3.5 text-right">
                                  <Link
                                    to={`/patient/cases/${c.id}`}
                                    className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-teal-700"
                                  >
                                    <span>View</span>
                                    <ArrowRight className="h-3 w-3" />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>EthAum &copy; {new Date().getFullYear()} - Care-coordination service &bull; In an emergency, contact your local emergency services.</p>
        <p className="mt-1 text-slate-400">All medical files are encrypted and accessible strictly under explicit patient consent.</p>
      </footer>
    </div>
  );
}
