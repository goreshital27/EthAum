import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { formatCentsToUSD } from '../utils/currency';
import PackageDetailModal from '../components/PackageDetailModal';
import {
  Package as PackageIcon,
  SlidersHorizontal,
  RotateCcw,
  Clock,
  MapPin,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Building2,
  X,
  ExternalLink,
} from 'lucide-react';

export default function Packages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedModalPackage, setSelectedModalPackage] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const treatment = searchParams.get('treatment') || '';
  const destination = searchParams.get('destination') || '';
  const sort = searchParams.get('sort') || 'price_low';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const updateParams = (newParams) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });

    if (!('page' in newParams)) {
      next.delete('page');
    }

    setSearchParams(next);
  };

  const resetAllFilters = () => {
    setSearchParams({});
  };

  // 1. Fetch dropdown filter options
  const { data: treatmentsData } = useQuery({
    queryKey: ['treatmentsFilterList'],
    queryFn: async () => {
      const res = await api.get('/treatments');
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const treatments = treatmentsData || [];

  const { data: destinationsData } = useQuery({
    queryKey: ['destinationsFilterList'],
    queryFn: async () => {
      const res = await api.get('/destinations');
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const destinations = destinationsData || [];

  // 2. Fetch packages
  const {
    data: packagesResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['packagesList', { treatment, destination, sort, minPrice, maxPrice, page }],
    queryFn: async () => {
      const params = {
        limit: 12,
        sort,
        page,
      };
      if (treatment) params.treatment = treatment;
      if (destination) params.destination = destination;
      if (minPrice) params.minPrice = parseInt(minPrice, 10);
      if (maxPrice) params.maxPrice = parseInt(maxPrice, 10);

      const res = await api.get('/packages', { params });
      return res.data;
    },
    keepPreviousData: true,
  });

  const packages = packagesResponse?.data || [];
  const pagination = packagesResponse?.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 };

  const activeFilterCount = [
    Boolean(treatment),
    Boolean(destination),
    Boolean(minPrice),
    Boolean(maxPrice),
    sort !== 'price_low',
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200">
          <PackageIcon className="h-3.5 w-3.5 text-teal-600" />
          <span>Transparent Medical Travel Packages</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Curated Treatment Packages
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl">
          Browse bundled international healthcare packages covering surgical fees, hospital stays, medical transfers, and recovery support with fixed pricing.
        </p>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden flex justify-end">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-sm"
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

      {/* Main Grid: Sidebar + Packages */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Filters Sidebar */}
        <aside
          className={`${
            mobileFiltersOpen ? 'block' : 'hidden'
          } lg:block bg-white rounded-xl border border-slate-200 p-5 space-y-6 shadow-sm`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="h-4 w-4 text-teal-700" />
              <h2 className="text-sm font-bold text-slate-900">Filter Packages</h2>
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs text-teal-700 hover:text-teal-800 font-medium inline-flex items-center space-x-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Treatment Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Treatment
            </label>
            <select
              value={treatment}
              onChange={(e) => updateParams({ treatment: e.target.value })}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Treatments</option>
              {treatments.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Destination
            </label>
            <select
              value={destination}
              onChange={(e) => updateParams({ destination: e.target.value })}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Destinations</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.country}>
                  {d.country}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Sort By Price
            </label>
            <select
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>

          {/* Max Price Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Maximum Budget (USD)
            </label>
            <select
              value={maxPrice}
              onChange={(e) => updateParams({ maxPrice: e.target.value })}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Any Budget</option>
              <option value="300000">Under $3,000</option>
              <option value="500000">Under $5,000</option>
              <option value="1000000">Under $10,000</option>
              <option value="1500000">Under $15,000</option>
            </select>
          </div>
        </aside>

        {/* Results Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active chips & count */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-2">
              <PackageIcon className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-semibold text-slate-800">
                {isLoading ? 'Loading packages...' : `${pagination.total} Available Package${pagination.total === 1 ? '' : 's'}`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {treatment && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-teal-50 text-teal-800 border border-teal-200">
                  Treatment: {treatments.find((t) => t.slug === treatment)?.name || treatment}
                  <button onClick={() => updateParams({ treatment: '' })} className="ml-1 text-teal-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {destination && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-teal-50 text-teal-800 border border-teal-200">
                  {destination}
                  <button onClick={() => updateParams({ destination: '' })} className="ml-1 text-teal-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {maxPrice && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                  Max: {formatCentsToUSD(parseInt(maxPrice, 10))}
                  <button onClick={() => updateParams({ maxPrice: '' })} className="ml-1 text-slate-400">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Loading Skeletons */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-56 bg-slate-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="bg-white p-8 rounded-xl border border-rose-200 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">Failed to load treatment packages</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && packages.length === 0 && (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-4">
              <PackageIcon className="h-12 w-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">No packages found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try clearing your filters or selecting a different procedure or destination.
                </p>
              </div>
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}

          {/* Packages Grid */}
          {!isLoading && !isError && packages.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                        {pkg.treatment?.name}
                      </span>
                      {pkg.nights && (
                        <span className="inline-flex items-center text-[11px] text-slate-500 font-medium">
                          <Clock className="h-3 w-3 mr-1 text-slate-400" />
                          {pkg.nights} night(s) stay
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                      {pkg.title}
                    </h3>

                    {/* Hospital summary */}
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <Link
                        to={`/hospitals/${pkg.hospital?.slug}`}
                        className="font-semibold text-slate-800 hover:text-teal-700 transition-colors inline-flex items-center space-x-1"
                      >
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span>{pkg.hospital?.name}</span>
                      </Link>
                      <div className="flex items-center text-slate-500 space-x-1">
                        <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                        <span>{pkg.hospital?.city}, {pkg.hospital?.country}</span>
                      </div>
                    </div>

                    {/* Inclusions summary preview */}
                    {pkg.inclusions && pkg.inclusions.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Inclusions
                        </p>
                        <ul className="space-y-1">
                          {pkg.inclusions.slice(0, 3).map((item, idx) => (
                            <li key={idx} className="flex items-start space-x-1.5 text-xs text-slate-600">
                              <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{item}</span>
                            </li>
                          ))}
                          {pkg.inclusions.length > 3 && (
                            <li className="text-[11px] text-teal-700 font-semibold pl-5">
                              +{pkg.inclusions.length - 3} more inclusions
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Price, Details Button & Coral CTA */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-semibold">Total Cost</p>
                      <p className="text-lg font-extrabold text-slate-900">{formatCentsToUSD(pkg.priceCents)}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedModalPackage(pkg)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
                      >
                        Details
                      </button>

                      <Link
                        to="/register"
                        className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 shadow-2xs transition-colors shrink-0"
                      >
                        Get a Quote
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!isLoading && !isError && pagination.totalPages > 1 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => updateParams({ page: pagination.page - 1 })}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => updateParams({ page: pagination.page + 1 })}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Package Detail Modal */}
      {selectedModalPackage && (
        <PackageDetailModal
          pkg={selectedModalPackage}
          onClose={() => setSelectedModalPackage(null)}
        />
      )}
    </div>
  );
}
