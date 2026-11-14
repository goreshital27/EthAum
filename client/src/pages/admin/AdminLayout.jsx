import React, { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AIDisclaimer from '../../components/AIDisclaimer';
import {
  Shield,
  Building2,
  FolderOpen,
  Share2,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin/approvals', label: 'Approvals', icon: Building2 },
    { to: '/admin/cases', label: 'Cases', icon: FolderOpen },
    { to: '/admin/referrals', label: 'Referrals', icon: Share2 },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/users', label: 'Users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-3">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <Link to="/admin" className="flex items-center space-x-2">
                <Shield className="h-7 w-7 text-rose-600 shrink-0" />
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">EthAum</span>
              </Link>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Admin Console
              </span>
            </div>

            {/* AI Disclaimer (visible on sm+) */}
            <div className="hidden sm:block">
              <AIDisclaimer />
            </div>

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right pl-3 border-l border-slate-200">
                <p className="text-xs font-bold text-slate-900">{user?.email}</p>
                <p className="text-[10px] uppercase font-semibold tracking-wider text-rose-600">Administrator</p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Log out"
              >
                <LogOut className="h-3.5 w-3.5 text-slate-500" />
                <span>Log out</span>
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Desktop Tab Navigation Bar */}
          <nav className="hidden sm:flex space-x-1 border-t border-slate-100 pt-1 -mb-px overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex items-center space-x-2 py-3 px-4 border-b-2 text-xs font-bold tracking-tight transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-rose-600 text-rose-600 bg-rose-50/40 rounded-t-lg'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Mobile Dropdown Menu (for width 393px) */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-3 shadow-lg animate-in slide-in-from-top-2">
            <div className="pb-2 border-b border-slate-100">
              <AIDisclaimer className="w-full justify-center" />
              <div className="mt-2 text-xs text-slate-600">
                Signed in as: <strong className="text-slate-900">{user?.email}</strong>
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold ${
                        isActive
                          ? 'bg-rose-50 text-rose-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`
                    }
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="h-4 w-4 text-slate-500" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </NavLink>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Outlet Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-1">
          <p className="font-semibold text-slate-700">
            EthAum &copy; {new Date().getFullYear()} &bull; Administrative Operations &amp; Verification Console
          </p>
          <p className="text-[11px] text-slate-400">
            AI-assisted coordination, not medical advice. Protected by multi-factor audit logging and consent controls.
          </p>
        </div>
      </footer>
    </div>
  );
}
