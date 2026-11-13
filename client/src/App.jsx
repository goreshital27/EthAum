import React from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from './api/axios';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { ShieldCheck, Activity, Globe, HeartPulse, User, LogIn, UserPlus, LogOut } from 'lucide-react';

function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: health, isLoading, error } = useQuery({
    queryKey: ['serverHealth'],
    queryFn: async () => {
      const response = await api.get('/health');
      return response.data;
    },
    retry: 1,
  });

  const dashboardRoute =
    user?.role === 'PATIENT' ? '/patient' : user?.role === 'HOSPITAL' ? '/hospital' : '/admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HeartPulse className="h-7 w-7 text-sky-600" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">EthAum</span>
            <span className="text-xs bg-sky-100 text-sky-800 font-medium px-2 py-0.5 rounded-full">
              Global Healthcare
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              AI-assisted coordination, not medical advice
            </span>

            {user ? (
              <div className="flex items-center space-x-3">
                <Link
                  to={dashboardRoute}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Dashboard ({user.role})</span>
                </Link>
                <button
                  onClick={() => logout()}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5 text-slate-500" />
                  <span>Log out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5 text-slate-500" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-xs font-semibold text-white shadow-sm transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
        <div className="text-center space-y-4 mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl tracking-tight">
            Accredited Global Healthcare, Coordinated With Care
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            EthAum connects patients with top international hospitals, transparent cost comparisons, and dedicated end-to-end medical travel support.
          </p>

          {!user && (
            <div className="flex items-center justify-center space-x-4 pt-2">
              <Link
                to="/register"
                className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-sm transition-all"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-sm transition-all"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Server & System Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-sky-600" />
              <h2 className="text-base font-semibold text-slate-800">System Integration Status</h2>
            </div>
            <span className="text-xs text-slate-500">GET /api/health</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Backend Server:</span>
              {isLoading ? (
                <span className="text-slate-400">Connecting...</span>
              ) : error ? (
                <span className="text-rose-600 font-medium">Offline / Unreachable</span>
              ) : (
                <span className="text-emerald-600 font-medium">Connected ({health?.status})</span>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Database Connection:</span>
              {isLoading ? (
                <span className="text-slate-400">Checking...</span>
              ) : error ? (
                <span className="text-slate-400">Unreachable</span>
              ) : (
                <span className="text-emerald-600 font-medium">{health?.db || 'connected'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <Globe className="h-6 w-6 text-sky-600 mb-2" />
            <h3 className="font-semibold text-slate-900 mb-1">Global Hospital Network</h3>
            <p className="text-sm text-slate-600">Accredited medical facilities with verified specialist doctors.</p>
          </div>
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-sky-600 mb-2" />
            <h3 className="font-semibold text-slate-900 mb-1">Safe Medical Records</h3>
            <p className="text-sm text-slate-600">Consent-based access, encrypted transmission, and audit logs.</p>
          </div>
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <HeartPulse className="h-6 w-6 text-sky-600 mb-2" />
            <h3 className="font-semibold text-slate-900 mb-1">Transparent Quotes</h3>
            <p className="text-sm text-slate-600">Compare treatment packages, upfront deposits, and 5% referral benefits.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>EthAum &copy; {new Date().getFullYear()} - AI-Powered Medical Tourism Marketplace</p>
        <p className="mt-1 text-slate-400">Notice: All AI services provide coordination assistance only and do not provide medical diagnosis or advice.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/patient"
          element={
            <ProtectedRoute allowedRoles={['PATIENT']}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hospital"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL']}>
              <HospitalDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
