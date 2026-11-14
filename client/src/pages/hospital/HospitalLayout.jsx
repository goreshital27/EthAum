import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../../components/NotificationBell';
import {
  Building2,
  LayoutDashboard,
  Inbox,
  CalendarCheck,
  UserCheck,
  Stethoscope,
  Users,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function HospitalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isApproved = user?.verificationStatus === 'APPROVED' || user?.hospital?.verificationStatus === 'APPROVED';
  const isPending = !isApproved;

  const navItems = [
    { name: 'Dashboard', path: '/hospital', icon: LayoutDashboard, end: true },
    { name: 'Leads Inbox', path: '/hospital/leads', icon: Inbox },
    { name: 'Bookings', path: '/hospital/bookings', icon: ShieldCheck },
    { name: 'Appointments', path: '/hospital/appointments', icon: CalendarCheck },
    { name: 'Profile', path: '/hospital/profile', icon: Building2 },
    { name: 'Treatments', path: '/hospital/treatments', icon: Stethoscope },
    { name: 'Doctors', path: '/hospital/doctors', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Left: Brand + Portal Badge */}
            <div className="flex items-center space-x-3">
              <Link to="/hospital" className="flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-indigo-600 shrink-0" />
                <span className="text-xl font-bold text-slate-900 tracking-tight">EthAum</span>
              </Link>
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Hospital Portal
              </span>
            </div>

            {/* Center: Mandatory AI Coordination Disclaimer */}
            <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>AI-assisted coordination, not medical advice</span>
            </div>

            {/* Right: Notification Bell & Hospital Identity & Logout & Mobile Toggle */}
            <div className="flex items-center space-x-3">
              <NotificationBell />

              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                  {user?.hospital?.name || user?.name || 'Hospital Admin'}
                </p>
                <div className="flex items-center justify-end space-x-1 mt-0.5">
                  {isApproved ? (
                    <span className="inline-flex items-center text-[10px] text-emerald-700 font-medium">
                      <ShieldCheck className="h-3 w-3 mr-0.5 text-emerald-600" />
                      Approved Partner
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] text-amber-700 font-medium">
                      <Clock className="h-3 w-3 mr-0.5 text-amber-600" />
                      Pending Approval
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                title="Sign out of hospital portal"
              >
                <LogOut className="h-3.5 w-3.5 text-slate-500" />
                <span>Log out</span>
              </button>

              {/* Mobile menu trigger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex space-x-1 border-t border-slate-100 py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-2 shadow-lg">
            {/* Mobile AI Disclaimer */}
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center space-x-2 mb-3">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="font-medium">AI-assisted coordination, not medical advice</span>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 text-slate-500" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 truncate max-w-[200px]">
                {user?.hospital?.name || user?.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Verification Status Banner (Requirement 2) */}
      {isPending && (
        <aside
          role="alert"
          className="bg-amber-500 text-white px-4 py-3 sm:px-6 shadow-sm border-b border-amber-600"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2 text-xs sm:text-sm font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-100" />
              <span>
                <strong>Your hospital is awaiting admin approval.</strong> In accordance with clinical
                and accreditation verification guidelines, reviewing new patient leads and issuing
                formal quotations are disabled until administrative onboarding is finalized.
              </span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-700/60 px-2.5 py-0.5 rounded text-white">
              Pending Review
            </span>
          </div>
        </aside>
      )}

      {/* Main Routed Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        <Outlet context={{ isPending, isApproved }} />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} EthAum Healthcare Marketplace. All rights reserved.</span>
          <span className="text-[11px] text-slate-400">
            Hospital Operations &bull; Provider-Reported Data Standard
          </span>
        </div>
      </footer>
    </div>
  );
}
