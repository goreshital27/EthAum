import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import HospitalCard from '../components/HospitalCard';
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Star,
  MapPin,
  Activity,
} from 'lucide-react';

const ACCREDITATIONS = ['JCI', 'NABH', 'ISO', 'TEMOS', 'ACHS', 'HAS'];

export default function Hospitals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Extract filter states from URL search params
  const search = searchParams.get('search') || '';
  const destination = searchParams.get('destination') || '';
  const treatment = searchParams.get('treatment') || '';
  const accreditation = searchParams.get('accreditation') || '';
  const minRating = searchParams.get('minRating') || '';
  const sort = searchParams.get('sort') || 'name';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Local state for instant search input text before submitting/blurring
  const [searchInput, setSearchInput] = useState(search);

  // Helper to update query parameters and reset to page 1 on filter changes
  const updateParams = (newParams) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });

    // Reset page to 1 whenever a filter other than page changes
    if (!('page' in newParams)) {
      next.delete('page');
    }

    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParams({ search: searchInput.trim() });
  };

  const clearSearch = () => {
    setSearchInput('');
    updateParams({ search: '' });
  };

  const resetAllFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  // 1. Fetch Destinations for dropdown filter
  const { data: destinationsData } = useQuery({
    queryKey: ['destinationsFilter'],
    queryFn: async () => {
      const res = await api.get('/destinations');
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const destinations = destinationsData || [];

  // 2. Fetch Treatments for dropdown filter
  const { data: treatmentsData } = useQuery({
    queryKey: ['treatmentsFilter'],
    queryFn: async () => {
      const res = await api.get('/treatments');
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const treatments = treatmentsData || [];

  // 3. Fetch Hospitals with active filters
  const {
    data: hospitalsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['hospitals', { search, destination, treatment, accreditation, minRating, sort, page }],
    queryFn: async () => {
      const params = {
        limit: 12,
        sort,
        page,
      };
      if (search) params.search = search;
      if (destination) params.destination = destination;
      if (treatment) params.treatment = treatment;
      if (accreditation) params.accreditation = accreditation;
      if (minRating) params.minRating = minRating;

      const res = await api.get('/hospitals', { params });
      return res.data;
    },
    keepPreviousData: true,
  });

  const hospitals = hospitalsResponse?.data || [];
  const pagination = hospitalsResponse?.pagination || {
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
  };

  // Determine active filter count for badge
  const activeFilterCount = [
    Boolean(search),
    Boolean(destination),
    Boolean(treatment),
    Boolean(accreditation),
    Boolean(minRating),
    sort !== 'name',
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
          <span>Strictly Verified &amp; Accredited Healthcare Facilities</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Accredited International Hospitals
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl">
          Browse and compare verified international hospitals. Evaluate accreditations, specialist expertise, and transparent package costs for cross-border care.
        </p>
      </div>

      {/* Search Bar + Mobile Filters Trigger */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by hospital name, city, or country..."
            className="w-full pl-10 pr-20 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-sm"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
          >
            Search
          </button>
        </form>

        {/* Mobile Filter Toggle */}
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="lg:hidden inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <SlidersHorizontal className="h-4 w-4 text-teal-600" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded-full text-[11px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Grid: Sidebar + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Filter Sidebar */}
        <aside
          className={`${
            mobileFiltersOpen ? 'block' : 'hidden'
          } lg:block bg-white rounded-xl border border-slate-200 p-5 space-y-6 shadow-sm`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="h-4 w-4 text-teal-700" />
              <h2 className="text-sm font-bold text-slate-900">Filter Facilities</h2>
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs text-teal-700 hover:text-teal-800 font-medium inline-flex items-center space-x-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset all</span>
              </button>
            )}
          </div>

          {/* 1. Destination Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Destination / Country
            </label>
            <select
              value={destination}
              onChange={(e) => updateParams({ destination: e.target.value })}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">All Destinations</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.country}>
                  {d.country} ({d.hospitalCount} approved)
                </option>
              ))}
            </select>
          </div>

          {/* 2. Treatment Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Procedure / Treatment
            </label>
            <select
              value={treatment}
              onChange={(e) => updateParams({ treatment: e.target.value })}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">All Treatments</option>
              {treatments.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name} ({t.specialty})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Accreditation Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Accreditation
            </label>
            <select
              value={accreditation}
              onChange={(e) => updateParams({ accreditation: e.target.value })}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">All Accreditations</option>
              {ACCREDITATIONS.map((acc) => (
                <option key={acc} value={acc}>
                  {acc} Accredited
                </option>
              ))}
            </select>
          </div>

          {/* 4. Minimum Rating Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Patient Rating
            </label>
            <select
              value={minRating}
              onChange={(e) => updateParams({ minRating: e.target.value })}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">All Ratings</option>
              <option value="4.5">4.5+ Stars &amp; Above</option>
              <option value="4.0">4.0+ Stars &amp; Above</option>
              <option value="3.5">3.5+ Stars &amp; Above</option>
            </select>
          </div>

          {/* 5. Sort By */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Sort By
            </label>
            <select
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="name">Hospital Name (A to Z)</option>
              <option value="rating">Highest Rated</option>
              <option value="price_low">Starting Price (Low to High)</option>
            </select>
          </div>
        </aside>

        {/* Results Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Filter Chips & Results Count Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-semibold text-slate-800">
                {isLoading
                  ? 'Searching accredited facilities...'
                  : `${pagination.total} Accredited Hospital${pagination.total === 1 ? '' : 's'}`}
              </span>
            </div>

            {/* Active filter badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {search && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                  Search: "{search}"
                  <button
                    onClick={() => {
                      setSearchInput('');
                      updateParams({ search: '' });
                    }}
                    className="ml-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {destination && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-teal-50 text-teal-800 border border-teal-200">
                  {destination}
                  <button
                    onClick={() => updateParams({ destination: '' })}
                    className="ml-1 text-teal-600 hover:text-teal-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {treatment && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-teal-50 text-teal-800 border border-teal-200">
                  Treatment: {treatments.find((t) => t.slug === treatment)?.name || treatment}
                  <button
                    onClick={() => updateParams({ treatment: '' })}
                    className="ml-1 text-teal-600 hover:text-teal-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {accreditation && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                  Accreditation: {accreditation}
                  <button
                    onClick={() => updateParams({ accreditation: '' })}
                    className="ml-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {minRating && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-800 border border-amber-200">
                  Rating: {minRating}+
                  <button
                    onClick={() => updateParams({ minRating: '' })}
                    className="ml-1 text-amber-600 hover:text-amber-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Loading Skeletons */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 animate-pulse"
                >
                  <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                  <div className="h-5 bg-slate-100 rounded w-1/2"></div>
                  <div className="h-10 bg-slate-50 rounded w-full"></div>
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <div className="h-4 bg-slate-200 rounded w-20"></div>
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
              <p className="text-sm font-semibold text-slate-800">
                Failed to load hospitals directory.
              </p>
              <p className="text-xs text-slate-500">
                {error?.response?.data?.message || error?.message || 'Unable to retrieve hospitals. Please try again.'}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && hospitals.length === 0 && (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-4">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  No accredited hospitals match your criteria
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try broadening your search term, clearing specific filters, or resetting all filters.
                </p>
              </div>
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}

          {/* Hospitals Grid */}
          {!isLoading && !isError && hospitals.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
              {hospitals.map((hospital) => (
                <HospitalCard key={hospital.id} hospital={hospital} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!isLoading && !isError && pagination.totalPages > 1 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing page <span className="font-semibold text-slate-800">{pagination.page}</span> of{' '}
                <span className="font-semibold text-slate-800">{pagination.totalPages}</span>
              </p>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => updateParams({ page: pagination.page - 1 })}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                <div className="hidden sm:flex items-center space-x-1">
                  {Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1).map((pNum) => (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => updateParams({ page: pNum })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        pNum === pagination.page
                          ? 'bg-teal-700 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => updateParams({ page: pagination.page + 1 })}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
