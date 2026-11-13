import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, LogOut, ShieldAlert, ShieldCheck, Clock, Users } from 'lucide-react';

export default function HospitalDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isApproved = user?.verificationStatus === 'APPROVED';
  const isPending = user?.verificationStatus === 'PENDING';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="h-7 w-7 text-indigo-600" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">EthAum</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Hospital Portal
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{user?.name || user?.hospital?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-500" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Verification Status Banner */}
        <div
          className={`rounded-xl p-5 border flex items-start space-x-3.5 ${
            isApproved
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : isPending
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {isApproved ? (
            <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
          ) : isPending ? (
            <Clock className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-semibold text-sm">
                Facility Verification Status: {user?.verificationStatus || 'PENDING'}
              </h2>
            </div>
            <p className="text-xs mt-1 opacity-90">
              {isApproved
                ? 'Your hospital profile is fully accredited and visible to international patients.'
                : 'Your facility is undergoing intake qualification review. Our team will verify accreditations before publishing packages.'}
            </p>
          </div>
        </div>

        {/* Overview Header */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {user?.hospital?.name || user?.name || 'Hospital Profile'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {user?.hospital?.city ? `${user.hospital.city}, ${user.hospital.country}` : 'International Medical Provider'}
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
            AI-assisted coordination, not medical advice
          </span>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">Specialist Doctors</p>
            <p className="text-xl font-bold text-slate-900 mt-1">0 Managed</p>
            <p className="text-xs text-slate-400 mt-1">Managed directly by hospital admin</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">Incoming Case Enquiries</p>
            <p className="text-xl font-bold text-slate-900 mt-1">0 New Cases</p>
            <p className="text-xs text-slate-400 mt-1">Matched through qualification protocol</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">Active Treatment Quotes</p>
            <p className="text-xl font-bold text-slate-900 mt-1">0 Quotes Sent</p>
            <p className="text-xs text-slate-400 mt-1">Draft quotes and payment schedules</p>
          </div>
        </div>
      </main>
    </div>
  );
}
