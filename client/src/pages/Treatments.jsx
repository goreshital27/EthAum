import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { formatCentsToUSD } from '../utils/currency';
import { Search, Clock, Building2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

export default function Treatments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');

  const {
    data: treatmentsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['treatments'],
    queryFn: async () => {
      const res = await api.get('/treatments');
      return res.data;
    },
  });

  const treatments = treatmentsResponse?.data || [];

  // Extract unique specialties for filtering
  const specialties = useMemo(() => {
    const list = [...new Set(treatments.map((t) => t.specialty).filter(Boolean))];
    list.sort();
    return ['ALL', ...list];
  }, [treatments]);

  // Filtered treatments
  const filteredTreatments = useMemo(() => {
    return treatments.filter((t) => {
      const matchesSearch =
        !searchTerm.trim() ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase().trim());

      const matchesSpecialty =
        selectedSpecialty === 'ALL' || t.specialty === selectedSpecialty;

      return matchesSearch && matchesSpecialty;
    });
  }, [treatments, searchTerm, selectedSpecialty]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-teal-700 uppercase tracking-widest">
          Medical Catalog
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Treatments & Procedures
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl">
          Browse verified surgical procedures, estimated hospital stay durations, and starting package prices across our network of accredited international hospitals.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter treatments by name or keyword..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div className="sm:w-64">
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              {specialties.map((spec) => (
                <option key={spec} value={spec}>
                  {spec === 'ALL' ? 'All Specialties' : spec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick specialty pills */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
          {specialties.slice(0, 8).map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialty(spec)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedSpecialty === spec
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {spec === 'ALL' ? 'All' : spec}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-6 bg-slate-200 rounded w-3/4"></div>
              <div className="h-16 bg-slate-100 rounded w-full"></div>
              <div className="pt-4 border-t border-slate-100 flex justify-between">
                <div className="h-4 bg-slate-200 rounded w-20"></div>
                <div className="h-4 bg-slate-200 rounded w-24"></div>
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
            Failed to load treatments catalog.
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

      {/* Empty State */}
      {!isLoading && !isError && filteredTreatments.length === 0 && (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3 max-w-md mx-auto">
          <p className="text-base font-semibold text-slate-800">No treatments found</p>
          <p className="text-xs text-slate-500">
            No procedures match your current search and filter selections. Try clearing your filters.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedSpecialty('ALL');
            }}
            className="text-xs font-semibold text-teal-700 hover:underline pt-2 inline-block"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Treatments Cards Grid */}
      {!isLoading && !isError && filteredTreatments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTreatments.map((t) => {
            const formattedPrice = formatCentsToUSD(t.fromPriceCents);

            return (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                      {t.specialty}
                    </span>
                    {t.expectedStayDays && (
                      <span className="inline-flex items-center text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                        {t.expectedStayDays} days stay
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {t.name}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {t.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center text-xs text-slate-500 space-x-1">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span>{t.hospitalCount} approved hospitals</span>
                    </div>

                    <div className="mt-0.5">
                      {formattedPrice ? (
                        <span className="text-xs text-slate-600">
                          From <span className="font-bold text-slate-900 text-sm">{formattedPrice}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Custom pricing</span>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/hospitals?treatment=${encodeURIComponent(t.slug)}`}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                  >
                    <span>View Hospitals</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
