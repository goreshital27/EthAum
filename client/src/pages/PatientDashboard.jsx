import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, LogOut, User, FileText, Compass, Clock } from 'lucide-react';

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HeartPulse className="h-7 w-7 text-sky-600" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">EthAum</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Patient Portal
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{user?.name || user?.email}</p>
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
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-sky-600 to-sky-700 rounded-xl p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.name || 'Patient'}!</h1>
            <p className="text-sky-100 text-sm mt-1">
              Your international healthcare journey coordinator is ready.
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
            AI-assisted coordination, not medical advice
          </span>
        </div>

        {/* Quick Stats / Journey steps placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Medical Inquiries</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">0 Active Cases</p>
              <p className="text-xs text-slate-400 mt-1">Start a case inquiry to match hospitals</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Provider Network</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">Global Hospitals</p>
              <p className="text-xs text-slate-400 mt-1">Accredited international facilities</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Tele-consultations</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">None scheduled</p>
              <p className="text-xs text-slate-400 mt-1">Appointments with hospital teams</p>
            </div>
          </div>
        </div>

        {/* Account Details Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
            <User className="h-5 w-5 text-slate-600" />
            <h2 className="text-base font-semibold text-slate-800">Account Information</h2>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Account ID</dt>
              <dd className="font-mono text-xs text-slate-700 mt-0.5 break-all">{user?.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Email</dt>
              <dd className="font-medium text-slate-800 mt-0.5">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Account Role</dt>
              <dd className="mt-0.5">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-sky-50 text-sky-700">
                  {user?.role}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
