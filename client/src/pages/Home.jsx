import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import HospitalCard from '../components/HospitalCard';
import { Search, Compass, FileCheck, FileSpreadsheet, Video, HeartHandshake, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/hospitals?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/hospitals');
    }
  };

  // Fetch 4 featured hospitals sorted by highest rating
  const {
    data: hospitalsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['featuredHospitals'],
    queryFn: async () => {
      const res = await api.get('/hospitals?limit=4&sort=rating');
      return res.data;
    },
  });

  const featuredHospitals = hospitalsResponse?.data || [];

  return (
    <div className="space-y-16">
      {/* 1. Hero Section */}
      <section className="bg-gradient-to-b from-teal-50/60 to-slate-50 pt-16 pb-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-semibold">
            <span>Accredited Global Hospitals</span>
            <span>&bull;</span>
            <span>Transparent Pricing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Accredited Global Healthcare, <br className="hidden sm:inline" />
            <span className="text-teal-700">Coordinated With Care</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Connect with accredited international hospitals, compare treatment packages, and receive dedicated end-to-end medical travel facilitation.
          </p>

          {/* Search Box */}
          <form
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto bg-white p-2 rounded-2xl shadow-sm border border-slate-300 flex flex-col sm:flex-row gap-2"
          >
            <div className="flex-1 flex items-center px-3 space-x-2">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search procedures, hospitals or destinations (e.g. Knee, Bangkok, JCI)..."
                className="w-full py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="py-3 px-6 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Hero CTAs */}
          <div className="pt-2 flex items-center justify-center space-x-4">
            <Link
              to="/hospitals"
              className="inline-flex items-center space-x-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800"
            >
              <span>Browse All Hospitals</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              to="/treatments"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Explore 15 Procedures
            </Link>
          </div>
        </div>
      </section>

      {/* 2. 5-Step How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <p className="text-xs font-bold text-teal-700 uppercase tracking-widest">
            End-To-End Patient Journey
          </p>
          <h2 className="text-3xl font-extrabold text-slate-900">
            How EthAum Works
          </h2>
          <p className="text-sm text-slate-600">
            Five coordinated steps from discovery to your safe return home.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-base">Discover & Search</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Explore accredited facilities, specialist doctors, and verified packages across 6 destinations.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-base">Submit Inquiry</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Create your medical case inquiry securely with your preferred travel dates and budget.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-base">Compare Quotes</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Receive transparent, itemized treatment plans and payment schedules directly from providers.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h3 className="font-bold text-slate-900 text-base">Tele-Consultation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Meet specialist surgical teams via exploratory video call to review care plans before traveling.
            </p>
          </div>

          {/* Step 5 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
              5
            </div>
            <h3 className="font-bold text-slate-900 text-base">Treatment & Care</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Guided hospital admission, protected upfront booking, and post-discharge recovery monitoring.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Featured Hospitals Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-bold text-teal-700 uppercase tracking-widest">
              Verified Excellence
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Featured Accredited Hospitals
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Top-rated international partner facilities with proven surgical outcomes.
            </p>
          </div>

          <Link
            to="/hospitals"
            className="inline-flex items-center space-x-1 text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            <span>View all hospitals</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 animate-pulse"
              >
                <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                  <div className="h-4 bg-slate-200 rounded w-16"></div>
                  <div className="h-8 bg-slate-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-white p-8 rounded-xl border border-rose-200 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
            <p className="text-sm font-medium text-slate-800">
              Unable to load featured hospitals at this moment.
            </p>
            <p className="text-xs text-slate-500">{error?.message}</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Hospitals Grid */}
        {!isLoading && !isError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredHospitals.map((hospital) => (
              <HospitalCard key={hospital.id} hospital={hospital} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Bottom CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-teal-700 rounded-2xl p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              Ready to explore international treatment options?
            </h2>
            <p className="text-sm text-teal-100 max-w-xl">
              Register a free patient account to request direct itemized quotes from specialist surgical teams across 6 countries.
            </p>
          </div>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 active:bg-rose-700 shadow-md transition-colors shrink-0"
          >
            Get a Quote
          </Link>
        </div>
      </section>
    </div>
  );
}
