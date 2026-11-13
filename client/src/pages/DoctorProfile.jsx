import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import {
  User,
  Clock,
  Globe2,
  Building2,
  MapPin,
  ShieldCheck,
  Video,
  ArrowLeft,
  GraduationCap,
  FileCheck2,
} from 'lucide-react';

export default function DoctorProfile() {
  const { id } = useParams();

  const {
    data: doctorResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['doctorProfile', id],
    queryFn: async () => {
      const res = await api.get(`/doctors/${id}`);
      return res.data?.data;
    },
    retry: 1,
  });

  const doctor = doctorResponse;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-28"></div>
        <div className="bg-white p-8 rounded-2xl border border-slate-200 space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/2"></div>
          <div className="h-4 bg-slate-100 rounded w-1/3"></div>
          <div className="h-24 bg-slate-50 rounded"></div>
        </div>
      </div>
    );
  }

  if (isError || !doctor) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
          <User className="h-8 w-8 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Doctor Profile Not Found</h1>
        <p className="text-sm text-slate-600">
          The requested doctor profile could not be located or is not affiliated with an approved hospital.
        </p>
        <Link
          to="/hospitals"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Browse Accredited Hospitals</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to={`/hospitals/${doctor.hospital.slug}`}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to {doctor.hospital.name}</span>
        </Link>
      </div>

      {/* Main Profile Header Card */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="p-4 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
              <User className="h-10 w-10" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                {doctor.specialty}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {doctor.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                {doctor.yearsExperience && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{doctor.yearsExperience} years clinical practice</span>
                  </div>
                )}
                {doctor.languages && doctor.languages.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Globe2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>{doctor.languages.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ONE Coral Get a Quote CTA */}
          <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-1.5">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 shadow-sm transition-colors text-center"
            >
              Request Consultation
            </Link>
            <span className="text-[11px] text-slate-400 text-center sm:text-right">
              Case review by medical team
            </span>
          </div>
        </div>

        {/* Bio Section */}
        {doctor.bio && (
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Clinical Bio &amp; Background
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {doctor.bio}
            </p>
          </div>
        )}

        {/* Qualifications Section */}
        {doctor.qualifications && (
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <GraduationCap className="h-4 w-4 text-teal-600" />
              <span>Medical Board Qualifications &amp; Fellowships</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700">
              {doctor.qualifications}
            </p>
          </div>
        )}
      </section>

      {/* Hospital Summary Card */}
      <section className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-teal-700" />
            <h2 className="text-sm font-bold text-slate-900">Affiliated Hospital Facility</h2>
          </div>
          <Link
            to={`/hospitals/${doctor.hospital.slug}`}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            View Full Hospital Profile &rarr;
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-base">
              {doctor.hospital.name}
            </h3>
            <div className="flex items-center text-xs text-slate-600 space-x-1">
              <MapPin className="h-3.5 w-3.5 text-teal-600" />
              <span>{doctor.hospital.city}, {doctor.hospital.country}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {doctor.hospital.offersVirtualConsult && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-teal-100 text-teal-800">
                <Video className="h-3 w-3 mr-1" />
                Telehealth Enabled
              </span>
            )}
            {doctor.hospital.accreditations?.map((acc) => (
              <span
                key={acc}
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-slate-200 text-slate-700"
              >
                <ShieldCheck className="h-3 w-3 mr-1 text-teal-600" />
                {acc}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
