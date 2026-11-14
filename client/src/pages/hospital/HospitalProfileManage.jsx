import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  Building2,
  ShieldCheck,
  AlertTriangle,
  Save,
  CheckCircle2,
  Info,
  Globe,
  Languages,
  Video,
  MapPin,
  Sparkles,
} from 'lucide-react';

export default function HospitalProfileManage() {
  const queryClient = useQueryClient();

  // 1. Fetch Hospital Profile
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['hospitalProfile'],
    queryFn: async () => {
      const res = await api.get('/hospital/profile');
      return res.data?.data;
    },
  });

  // Form State
  const [description, setDescription] = useState('');
  const [languagesStr, setLanguagesStr] = useState('');
  const [accreditationsStr, setAccreditationsStr] = useState('');
  const [internationalServicesStr, setInternationalServicesStr] = useState('');
  const [offersVirtualConsult, setOffersVirtualConsult] = useState(false);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Sync state when data is loaded
  useEffect(() => {
    if (profile) {
      setDescription(profile.providerReported?.description || '');
      setLanguagesStr(profile.providerReported?.languages?.join(', ') || '');
      setAccreditationsStr(profile.providerReported?.accreditations?.join(', ') || '');
      setInternationalServicesStr(
        profile.providerReported?.internationalServices?.join(', ') || ''
      );
      setOffersVirtualConsult(Boolean(profile.providerReported?.offersVirtualConsult));
      setCity(profile.city || '');
      setCountry(profile.country || '');
    }
  }, [profile]);

  // 2. Update Profile Mutation
  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.patch('/hospital/profile', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hospitalProfile']);
      setFormSuccess('Facility profile updated successfully. Marked as provider-reported.');
      setTimeout(() => setFormSuccess(''), 4000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || 'Failed to update profile.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormSuccess('');
    setFormError('');

    // Parse comma-separated strings to clean arrays
    const languages = languagesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const accreditations = accreditationsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const internationalServices = internationalServicesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      description,
      languages,
      accreditations,
      internationalServices,
      offersVirtualConsult,
      city: city.trim(),
      country: country.trim(),
    };

    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-2 text-xs text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2" />
        <p>Loading hospital profile details...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto" />
        <p className="text-sm font-bold text-slate-900">Failed to load profile</p>
        <p className="text-xs text-slate-500">{error?.message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Hospital Profile Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Maintain your facility details, international patient concierge services, and medical accreditations.
          </p>
        </div>

        {/* Verification Status Badge */}
        <div className="self-start sm:self-auto">
          {profile?.verificationStatus === 'APPROVED' ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              Verified Facility
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 mr-1 text-amber-600" />
              Pending Admin Verification
            </span>
          )}
        </div>
      </div>

      {/* Mandatory Regulatory / Data Standard Alert */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-start space-x-2.5">
        <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900">Provider-Reported Data Standard:</span> All self-edited
          descriptions, languages, amenities, and accreditations are explicitly labeled as{' '}
          <strong className="text-amber-800 font-semibold">"Provider-reported"</strong> on public pages.
          They are separated from independently verified registry accreditations to protect patient trust.
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {formSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        {formError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Read-only Verified System Identifiers */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            System &amp; Verification Attributes (Audited)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Registered Facility Name:</span>
              <p className="font-bold text-slate-900 mt-0.5">{profile?.name}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Public URL Slug:</span>
              <p className="font-mono text-slate-700 mt-0.5">/hospitals/{profile?.slug}</p>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              City <span className="text-amber-700 text-[10px] font-normal">(Provider-reported)</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Mumbai, Bangkok, Istanbul"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Country <span className="text-amber-700 text-[10px] font-normal">(Provider-reported)</span>
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. India, Thailand, Turkey"
            />
          </div>
        </div>

        {/* Facility Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Facility Overview &amp; Clinical Background{' '}
            <span className="text-amber-700 text-[10px] font-normal">(Provider-reported)</span>
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
            placeholder="Describe your surgical departments, patient amenities, intensive care capacity, and experience handling international medical tourists..."
          />
        </div>

        {/* Languages & Accreditations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Languages className="h-3.5 w-3.5 text-slate-400" />
              <span>Languages Spoken by Staff</span>
              <span className="text-amber-700 text-[10px] font-normal">(Provider-reported)</span>
            </label>
            <input
              type="text"
              value={languagesStr}
              onChange={(e) => setLanguagesStr(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. English, Arabic, Russian, French (comma-separated)"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Enter languages separated by commas
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
              <span>Accreditations Claimed</span>
              <span className="text-amber-700 text-[10px] font-normal">(Provider-reported)</span>
            </label>
            <input
              type="text"
              value={accreditationsStr}
              onChange={(e) => setAccreditationsStr(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. JCI Accredited, NABH, ISO 9001 (comma-separated)"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Reported facility accreditations
            </span>
          </div>
        </div>

        {/* International Services */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <span>International Patient Concierge Services</span>
            <span className="text-amber-700 text-[10px] font-normal">(Provider-reported)</span>
          </label>
          <input
            type="text"
            value={internationalServicesStr}
            onChange={(e) => setInternationalServicesStr(e.target.value)}
            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Airport Pickup, Medical Visa Assistance, Translator Services, Halal/Kosher Meals (comma-separated)"
          />
        </div>

        {/* Virtual Consult Toggle */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5">
              <Video className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-900">
                Offers Tele-Health Exploratory Consultations
              </span>
              <span className="text-amber-700 text-[10px] font-normal">(Provider-reported)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Allow international patients to request video intake coordination prior to traveling.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={offersVirtualConsult}
              onChange={(e) => setOffersVirtualConsult(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={updateMutation.isLoading}
            className="inline-flex items-center space-x-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{updateMutation.isLoading ? 'Saving Changes...' : 'Save Profile (Provider-reported)'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
