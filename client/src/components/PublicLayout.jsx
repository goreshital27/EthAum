import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, Menu, X, LogIn, UserPlus, LogOut, User } from 'lucide-react';

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const dashboardRoute =
    user?.role === 'PATIENT' ? '/patient' : user?.role === 'HOSPITAL' ? '/hospital' : '/admin';

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-teal-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center space-x-2">
            <HeartPulse className="h-7 w-7 text-teal-600" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">EthAum</span>
            <span className="text-[11px] bg-teal-50 text-teal-800 font-medium px-2 py-0.5 rounded-full border border-teal-200">
              Healthcare
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <NavLink to="/treatments" className={navLinkClass}>
              Treatments
            </NavLink>
            <NavLink to="/destinations" className={navLinkClass}>
              Destinations
            </NavLink>
            <NavLink to="/hospitals" className={navLinkClass}>
              Hospitals
            </NavLink>
          </nav>

          {/* Right Header CTAs */}
          <div className="hidden md:flex items-center space-x-3">
            {/* ONE Coral Get a Quote button */}
            <Link
              to="/register"
              className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 active:bg-rose-700 shadow-sm transition-colors"
            >
              Get a Quote
            </Link>

            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <Link
                  to={dashboardRoute}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 text-xs font-semibold hover:bg-teal-100 transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3">
            <div className="flex flex-col space-y-2 pb-3 border-b border-slate-100">
              <Link
                to="/treatments"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Treatments
              </Link>
              <Link
                to="/destinations"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Destinations
              </Link>
              <Link
                to="/hospitals"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hospitals
              </Link>
            </div>

            <div className="pt-2 flex flex-col space-y-2">
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 shadow-sm"
              >
                Get a Quote
              </Link>

              {user ? (
                <>
                  <Link
                    to={dashboardRoute}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2 px-4 rounded-lg text-sm font-semibold bg-teal-50 text-teal-800"
                  >
                    Go to Dashboard ({user.role})
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-center py-2 px-4 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Outlet */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Col 1: Platform */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center space-x-2">
                <HeartPulse className="h-6 w-6 text-teal-600" />
                <span className="text-lg font-bold text-slate-900">EthAum</span>
              </div>
              <p className="text-sm text-slate-600 max-w-md leading-relaxed">
                An AI-powered international healthcare marketplace coordinating medical travel, accredited hospital matching, transparent treatment packages, and post-operative aftercare.
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  AI-assisted coordination, not medical advice
                </span>
              </div>
            </div>

            {/* Col 2: Navigation */}
            <div>
              <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                Explore
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <Link to="/treatments" className="hover:text-teal-700 transition-colors">
                    Treatments & Procedures
                  </Link>
                </li>
                <li>
                  <Link to="/destinations" className="hover:text-teal-700 transition-colors">
                    Global Destinations
                  </Link>
                </li>
                <li>
                  <Link to="/hospitals" className="hover:text-teal-700 transition-colors">
                    Accredited Hospitals
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Portal Access */}
            <div>
              <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                Portals
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <Link to="/login" className="hover:text-teal-700 transition-colors">
                    Patient Login
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-teal-700 transition-colors">
                    Hospital Registration
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Mandatory Emergency Care Disclaimer */}
          <div className="pt-6 border-t border-slate-200">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed text-center sm:text-left">
              <strong>Emergency Notice:</strong> EthAum is a care-coordination service. It is not an emergency or medical service. In an emergency, contact your local emergency services.
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              &copy; {new Date().getFullYear()} EthAum Marketplace. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
