import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, CheckCircle2, AlertTriangle, Users } from 'lucide-react';

export default function AdminDashboard() {
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
            <Shield className="h-7 w-7 text-rose-600" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">EthAum</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              Admin Console
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">Administrator</p>
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
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Platform Administration</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage hospital accreditations, intake qualification, and audit access.
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
            AI-assisted coordination, not medical advice
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg w-fit mb-3">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-xs text-slate-500 font-medium">Pending Hospital Approvals</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">Review Queue</p>
            <p className="text-xs text-slate-400 mt-1">Hospitals awaiting verification</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg w-fit mb-3">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-xs text-slate-500 font-medium">Qualified Cases</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">Case Flow</p>
            <p className="text-xs text-slate-400 mt-1">Records readiness & matching</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg w-fit mb-3">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-xs text-slate-500 font-medium">Security & Audit</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">AccessLog Active</p>
            <p className="text-xs text-slate-400 mt-1">Strict consent & record auditing</p>
          </div>
        </div>
      </main>
    </div>
  );
}
