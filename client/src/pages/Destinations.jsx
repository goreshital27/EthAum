import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { MapPin, Plane, FileText, Building2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

export default function Destinations() {
  const {
    data: destinationsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const res = await api.get('/destinations');
      return res.data;
    },
  });

  const destinations = destinationsResponse?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-teal-700 uppercase tracking-widest">
          Accredited Hubs
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Global Medical Destinations
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl">
          Discover accredited international healthcare destinations offering state-of-the-art surgical facilities, dedicated medical visa protocols, and tailored recovery environments.
        </p>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 animate-pulse"
            >
              <div className="h-6 bg-slate-200 rounded w-1/2"></div>
              <div className="h-16 bg-slate-100 rounded w-full"></div>
              <div className="h-12 bg-slate-50 rounded w-full"></div>
              <div className="pt-4 border-t border-slate-100 flex justify-between">
                <div className="h-4 bg-slate-200 rounded w-24"></div>
                <div className="h-4 bg-slate-200 rounded w-20"></div>
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
            Failed to load destinations directory.
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

      {/* Destinations Cards Grid */}
      {!isLoading && !isError && destinations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((dest) => (
            <div
              key={dest.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                {/* Header: Country, City & Hospital Count Badge */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 flex items-center space-x-1.5">
                      <MapPin className="h-5 w-5 text-teal-600 shrink-0" />
                      <span>{dest.country}</span>
                    </h3>
                    <p className="text-xs font-medium text-slate-500 pl-6.5">
                      Hub City: {dest.city}
                    </p>
                  </div>

                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                    <Building2 className="h-3 w-3 mr-1" />
                    {dest.hospitalCount} {dest.hospitalCount === 1 ? 'Hospital' : 'Hospitals'}
                  </span>
                </div>

                {/* Overview */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  {dest.overview}
                </p>

                {/* Travel & Visa Accordion / Blocks */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  {dest.travelInfo && (
                    <div className="flex items-start space-x-2 text-slate-600">
                      <Plane className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-700">Transit: </span>
                        <span>{dest.travelInfo}</span>
                      </div>
                    </div>
                  )}

                  {dest.visaInfo && (
                    <div className="flex items-start space-x-2 text-slate-600">
                      <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-700">Visa: </span>
                        <span>{dest.visaInfo}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-100">
                <Link
                  to={`/hospitals?destination=${encodeURIComponent(dest.country)}`}
                  className="w-full inline-flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
                >
                  <span>Explore Hospitals in {dest.country}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
