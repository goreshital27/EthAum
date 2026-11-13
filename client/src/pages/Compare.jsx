import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useCompare } from '../context/CompareContext';
import { formatCentsToUSD } from '../utils/currency';
import {
  Scale,
  Building2,
  MapPin,
  Star,
  ShieldCheck,
  Video,
  X,
  Plus,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Users,
  Globe2,
} from 'lucide-react';

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedHospitals, removeHospital, setFromSlugs } = useCompare();

  const urlSlugs = searchParams.get('slugs') || '';
  const treatment = searchParams.get('treatment') || '';

  // Synchronize state with URL search params
  const slugsArray = urlSlugs
    ? urlSlugs.split(',').map((s) => s.trim()).filter(Boolean)
    : selectedHospitals.map((h) => h.slug);

  // When URL changes, update CompareContext
  useEffect(() => {
    if (urlSlugs && selectedHospitals.length === 0) {
      const items = slugsArray.map((s) => ({ slug: s, name: s.replace(/-/g, ' ') }));
      setFromSlugs(items);
    }
  }, [urlSlugs]);

  // Keep URL in sync with selectedHospitals if URL was empty
  useEffect(() => {
    if (!urlSlugs && selectedHospitals.length >= 2) {
      setSearchParams({ slugs: selectedHospitals.map((h) => h.slug).join(',') });
    }
  }, [selectedHospitals, urlSlugs]);

  // Fetch treatments list for procedure-specific comparison dropdown
  const { data: treatmentsData } = useQuery({
    queryKey: ['treatmentsCompareList'],
    queryFn: async () => {
      const res = await api.get('/treatments');
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const treatments = treatmentsData || [];

  // Query comparison attributes
  const {
    data: compareResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['compareHospitals', slugsArray.join(','), treatment],
    queryFn: async () => {
      if (slugsArray.length < 2 || slugsArray.length > 3) return null;
      const params = {
        slugs: slugsArray.join(','),
      };
      if (treatment) params.treatment = treatment;
      const res = await api.get('/compare', { params });
      return res.data?.data || [];
    },
    enabled: slugsArray.length >= 2 && slugsArray.length <= 3,
    retry: 1,
  });

  const hospitals = compareResponse || [];

  const handleRemove = (slug) => {
    removeHospital(slug);
    const updated = slugsArray.filter((s) => s !== slug);
    if (updated.length > 0) {
      const next = new URLSearchParams(searchParams);
      next.set('slugs', updated.join(','));
      setSearchParams(next);
    } else {
      setSearchParams({});
    }
  };

  const handleTreatmentChange = (tSlug) => {
    const next = new URLSearchParams(searchParams);
    if (tSlug) {
      next.set('treatment', tSlug);
    } else {
      next.delete('treatment');
    }
    setSearchParams(next);
  };

  // State: Fewer than 2 hospitals selected
  if (slugsArray.length < 2) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="p-4 bg-teal-50 rounded-full w-16 h-16 mx-auto flex items-center justify-center text-teal-700 border border-teal-200">
          <Scale className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Compare Accredited Hospitals</h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            You need to select at least 2 hospitals (up to 3) to view a side-by-side comparison of accreditations, specialties, starting prices, and services.
          </p>
        </div>

        {selectedHospitals.length === 1 && (
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-700">
            <span>Currently selected: </span>
            <span className="font-bold text-slate-900">{selectedHospitals[0].name}</span>
          </div>
        )}

        <div>
          <Link
            to="/hospitals"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 shadow-sm transition-colors"
          >
            <span>Browse &amp; Add Hospitals</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-teal-700">
            <Scale className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Hospital Comparison Matrix</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Side-by-Side Facility Evaluation
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Comparing {slugsArray.length} accredited facilities across verified credentials, pricing, and care capabilities.
          </p>
        </div>

        {/* Treatment filter dropdown for price comparison */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-700 shrink-0">
            Compare Pricing For:
          </label>
          <select
            value={treatment}
            onChange={(e) => handleTreatmentChange(e.target.value)}
            className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 shadow-2xs"
          >
            <option value="">Lowest Starting Price (All Procedures)</option>
            {treatments.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-64 bg-slate-100 rounded"></div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="bg-white p-8 rounded-xl border border-rose-200 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">
            {error?.response?.data?.message || 'Unable to load comparison matrix.'}
          </p>
          <Link
            to="/hospitals"
            className="inline-block px-4 py-2 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100"
          >
            Select Approved Hospitals
          </Link>
        </div>
      )}

      {/* Comparison Matrix Table */}
      {!isLoading && !isError && hospitals.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            {/* Table Header: Hospital Summary Cards */}
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <th className="p-4 sm:p-5 w-48 sm:w-56 text-xs font-bold text-slate-400 uppercase tracking-wider align-bottom">
                  Hospital Attribute
                </th>
                {hospitals.map((h) => (
                  <th key={h.id} className="p-4 sm:p-5 align-top min-w-[220px]">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base leading-snug">
                            <Link to={`/hospitals/${h.slug}`} className="hover:text-teal-700 transition-colors">
                              {h.name}
                            </Link>
                          </h3>
                          <div className="flex items-center text-xs text-slate-500 mt-1 space-x-1">
                            <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                            <span>{h.city}, {h.country}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemove(h.slug)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                          title="Remove from comparison"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-2 pt-1">
                        <Link
                          to="/register"
                          className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 shadow-2xs transition-colors"
                        >
                          Get a Quote
                        </Link>
                        <Link
                          to={`/hospitals/${h.slug}`}
                          className="w-full inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          Full Profile
                        </Link>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Rows: Identical Attribute Keys */}
            <tbody className="divide-y divide-slate-100 text-xs">
              {/* Row 1: Accreditations */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 font-bold text-slate-800 bg-slate-50/30">
                  Accreditations
                </td>
                {hospitals.map((h) => (
                  <td key={h.id} className="p-4 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      {h.accreditations?.length > 0 ? (
                        h.accreditations.map((acc) => (
                          <span
                            key={acc}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-teal-50 text-teal-900 border border-teal-200"
                          >
                            <ShieldCheck className="h-3 w-3 mr-1 text-teal-600" />
                            {acc}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">None listed</span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row 2: Patient Rating & Review Count */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 font-bold text-slate-800 bg-slate-50/30">
                  Patient Rating
                </td>
                {hospitals.map((h) => (
                  <td key={h.id} className="p-4 align-top">
                    {h.reviewCount > 0 ? (
                      <div className="flex items-center space-x-1.5">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-slate-900 text-sm">{h.averageRating}</span>
                        <span className="text-slate-500">({h.reviewCount} reviews)</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">New facility</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row 3: Starting Price */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 font-bold text-slate-800 bg-slate-50/30">
                  {treatment ? 'Selected Procedure Cost' : 'Starting Price (From)'}
                </td>
                {hospitals.map((h) => (
                  <td key={h.id} className="p-4 align-top">
                    {h.fromPriceCents ? (
                      <div>
                        <span className="text-base font-extrabold text-slate-900">
                          {formatCentsToUSD(h.fromPriceCents)}
                        </span>
                        <p className="text-[10px] text-slate-400">Estimated procedure cost</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Procedure not offered</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row 4: Number of Specialist Doctors */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 font-bold text-slate-800 bg-slate-50/30">
                  Specialist Doctors
                </td>
                {hospitals.map((h) => (
                  <td key={h.id} className="p-4 align-top font-semibold text-slate-800">
                    <div className="flex items-center space-x-1.5">
                      <Users className="h-4 w-4 text-teal-600" />
                      <span>{h.doctorCount} verified specialists</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row 5: Telehealth / Virtual Consult */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 font-bold text-slate-800 bg-slate-50/30">
                  Virtual Consultation
                </td>
                {hospitals.map((h) => (
                  <td key={h.id} className="p-4 align-top">
                    {h.telehealthAvailable ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-teal-600" />
                        Available (Video / Telehealth)
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-slate-400 text-xs">
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        In-person only
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row 6: Languages Spoken */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 font-bold text-slate-800 bg-slate-50/30">
                  Languages Spoken
                </td>
                {hospitals.map((h) => (
                  <td key={h.id} className="p-4 align-top text-slate-700">
                    <div className="flex items-start space-x-1.5">
                      <Globe2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{h.languages?.join(', ') || 'English'}</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row 7: Clinical Specialties */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 font-bold text-slate-800 bg-slate-50/30">
                  Specialties
                </td>
                {hospitals.map((h) => (
                  <td key={h.id} className="p-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {h.specialties?.slice(0, 4).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row 8: International Patient Services */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 font-bold text-slate-800 bg-slate-50/30">
                  International Services
                </td>
                {hospitals.map((h) => (
                  <td key={h.id} className="p-4 align-top">
                    <ul className="space-y-1 text-slate-600">
                      {h.internationalServices?.length > 0 ? (
                        h.internationalServices.map((svc, i) => (
                          <li key={i} className="flex items-start space-x-1">
                            <span className="text-teal-600 font-bold">&bull;</span>
                            <span>{svc}</span>
                          </li>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">Standard coordination</span>
                      )}
                    </ul>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
