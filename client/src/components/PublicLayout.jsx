import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import CompareBar from './CompareBar';
import { HeartPulse, Menu, X, LogIn, UserPlus, LogOut, User, Scale } from 'lucide-react';

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const { selectedHospitals } = useCompare();
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
          <nav className="hidden md:flex items-center space-x-7">
            <NavLink to="/treatments" className={navLinkClass}>
              Treatments
            </NavLink>
            <NavLink to="/destinations" className={navLinkClass}>
              Destinations
            </NavLink>
            <NavLink to="/hospitals" className={navLinkClass}>
              Hospitals
            </NavLink>
            <NavLink to="/packages" className={navLinkClass}>
              Packages
            </NavLink>
            <NavLink to="/compare" className={navLinkClass}>
              <span className="inline-flex items-center space-x-1">
                <span>Compare</span>
                {selectedHospitals.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded-full text-[10px] font-bold">
                    {selectedHospitals.length}
                  </span>
                )}
              </span>
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
              <Link
                to="/packages"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Packages
              </Link>
              <Link
                to="/compare"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between"
              >
                <span>Compare Facilities</span>
                {selectedHospitals.length > 0 && (
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-xs font-bold">
                    {selectedHospitals.length}
                  </span>
                )}
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
                    Dashboard ({user.role})
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-center py-2 px-4 rounded-lg text-sm font-medium text-slate-700 border border-slate-200"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 border border-slate-300"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 px-3 rounded-lg text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Outlet for Child Routes */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Sticky Bottom Compare Bar */}
      <CompareBar />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white pt-10 pb-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center space-x-2">
                <HeartPulse className="h-5 w-5 text-teal-600" />
                <span className="font-bold text-slate-900 text-sm">EthAum Healthcare</span>
              </div>
              <p className="text-slate-500 max-w-sm">
                Empowering international patients with transparent pricing, accredited hospital networks, and end-to-end medical travel coordination.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Explore</h4>
              <ul className="space-y-1.5">
                <li><Link to="/treatments" className="hover:text-teal-700">All Treatments</Link></li>
                <li><Link to="/destinations" className="hover:text-teal-700">Accredited Destinations</Link></li>
                <li><Link to="/hospitals" className="hover:text-teal-700">Approved Hospitals</Link></li>
                <li><Link to="/packages" className="hover:text-teal-700">Treatment Packages</Link></li>
                <li><Link to="/compare" className="hover:text-teal-700">Hospital Comparison</Link></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Patient Portal</h4>
              <ul className="space-y-1.5">
                <li><Link to="/login" className="hover:text-teal-700">Patient Sign In</Link></li>
                <li><Link to="/register" className="hover:text-teal-700">Create Free Account</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 space-y-2 text-center text-[11px] text-slate-500">
            <p className="font-medium text-slate-600">
              EthAum is a care-coordination service. It is not an emergency or medical service. In an emergency, contact your local emergency services.
            </p>
            <p className="text-slate-400">
              AI-assisted coordination, not medical advice &bull; &copy; {new Date().getFullYear()} EthAum Global. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
