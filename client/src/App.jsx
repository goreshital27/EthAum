import { Routes, Route, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from './services/api';
import { ShieldCheck, Activity, Globe, HeartPulse } from 'lucide-react';

function Home() {
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['serverHealth'],
    queryFn: async () => {
      const response = await api.get('/health');
      return response.data;
    },
    retry: 1,
  });

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

          <div className="flex items-center space-x-4 text-sm text-slate-600">
            <span className="hidden sm:inline">AI-Powered Medical Tourism</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              AI-assisted coordination, not medical advice
            </span>
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
                <span className="text-slate-400">Awaiting Neon Credentials</span>
              ) : (
                <span className="text-emerald-600 font-medium">{health?.db || 'Connected'}</span>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-200">
              Note: Start the server with <code className="bg-slate-200 px-1 py-0.5 rounded">npm run dev</code> in the <code className="bg-slate-200 px-1 py-0.5 rounded">server</code> folder to verify backend and database connectivity.
            </div>
          )}
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
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
