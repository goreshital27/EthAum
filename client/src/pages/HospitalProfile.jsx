import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { formatCentsToUSD } from '../utils/currency';
import {
  MapPin,
  Star,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Video,
  User,
  Clock,
  Globe2,
  Calendar,
  AlertCircle,
  Building2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
} from 'lucide-react';

export default function HospitalProfile() {
  const { slug } = useParams();
  const [reviewPage, setReviewPage] = useState(1);

  // 1. Fetch Hospital Profile
  const {
    data: profileResponse,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
  } = useQuery({
    queryKey: ['hospitalProfile', slug],
    queryFn: async () => {
      const res = await api.get(`/hospitals/${slug}`);
      return res.data?.data;
    },
    retry: 1,
  });

  // 2. Fetch Hospital Reviews (paginated)
  const {
    data: reviewsResponse,
    isLoading: isReviewsLoading,
  } = useQuery({
    queryKey: ['hospitalReviews', slug, reviewPage],
    queryFn: async () => {
      const res = await api.get(`/hospitals/${slug}/reviews?page=${reviewPage}&limit=5`);
      return res.data;
    },
    enabled: Boolean(profileResponse?.id),
    keepPreviousData: true,
  });

  const hospital = profileResponse;
  const reviews = reviewsResponse?.data || [];
  const reviewsPagination = reviewsResponse?.pagination || { total: 0, page: 1, limit: 5, totalPages: 1 };

  // Loading skeleton
  if (isProfileLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-28"></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="h-8 bg-slate-200 rounded w-2/3"></div>
          <div className="h-4 bg-slate-100 rounded w-1/3"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-56 bg-slate-100 rounded-xl"></div>
          <div className="h-56 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  // Error / 404 state
  if (isProfileError || !hospital) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
          <Building2 className="h-8 w-8 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Hospital Not Found</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          The healthcare facility you are looking for does not exist or has not yet passed EthAum's strict international accreditation review.
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

  const { verified, providerReported, doctors, treatments, packages, averageRating, reviewCount, ratingBreakdown } = hospital;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Back Link */}
      <div>
        <Link
          to="/hospitals"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to all hospitals</span>
        </Link>
      </div>

      {/* Hospital Header Banner */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {verified?.verificationStatus === 'APPROVED' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  Verified Facility
                  {verified.verifiedAt && (
                    <span className="ml-1 text-emerald-700 font-normal">
                      &bull; Audited {new Date(verified.verifiedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                    </span>
                  )}
                </span>
              )}
              {providerReported.offersVirtualConsult && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                  <Video className="h-3.5 w-3.5 mr-1 text-teal-600" />
                  Telehealth Available
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {hospital.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4 text-teal-600 shrink-0" />
                <span className="font-medium text-slate-800">{hospital.city}, {hospital.country}</span>
              </div>

              {reviewCount > 0 ? (
                <div className="flex items-center space-x-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-slate-900 text-sm">{averageRating}</span>
                  <span className="text-slate-500">({reviewCount} patient reviews)</span>
                </div>
              ) : (
                <span className="text-slate-400">Newly accredited facility</span>
              )}
            </div>
          </div>

          {/* ONE Coral Get a Quote Button */}
          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2 items-stretch md:items-end">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 active:bg-rose-700 shadow-sm transition-colors text-center"
            >
              Get a Quote
            </Link>
            <span className="text-[11px] text-slate-400 text-center md:text-right">
              Free case evaluation &bull; No obligation
            </span>
          </div>
        </div>
      </section>

      {/* Two Comparison Panels: Verified Facts vs. Provider-Reported Claims */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Panel 1: Verified Facts */}
        <div className="bg-teal-50/50 rounded-2xl border-2 border-teal-200 p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-teal-800 border-b border-teal-200 pb-3">
              <ShieldCheck className="h-5 w-5 text-teal-700 shrink-0" />
              <div>
                <h2 className="text-sm font-bold tracking-tight">Verified Facts</h2>
                <p className="text-[11px] text-teal-700 font-medium">Checked &amp; authenticated directly by EthAum</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium block mb-1">Accreditation Credentials:</span>
                <div className="flex flex-wrap gap-1.5">
                  {verified.accreditations && verified.accreditations.length > 0 ? (
                    verified.accreditations.map((acc) => (
                      <span
                        key={acc}
                        className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-teal-300 font-bold text-teal-900 text-xs shadow-2xs"
                      >
                        <Award className="h-3.5 w-3.5 mr-1 text-teal-700" />
                        {acc}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">Accreditation pending review</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Verification Status:</span>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full font-bold text-emerald-800 bg-emerald-100 text-[11px]">
                  {verified.verificationStatus}
                </span>
              </div>

              {verified.verifiedAt && (
                <div>
                  <span className="text-slate-500 font-medium block">Approval / Audit Date:</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {new Date(verified.verifiedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-teal-100 text-[11px] text-teal-700 flex items-center space-x-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>EthAum validates hospital licenses, clinical audits, and doctor registry records.</span>
          </div>
        </div>

        {/* Panel 2: Provider-Reported Claims */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 border-b border-slate-200 pb-3">
              <FileText className="h-5 w-5 text-slate-600 shrink-0" />
              <div>
                <h2 className="text-sm font-bold tracking-tight">Provider-Reported Claims</h2>
                <p className="text-[11px] text-slate-500 font-medium">Information self-reported by the hospital administration</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium block mb-1">Facility Overview:</span>
                <p className="text-slate-700 leading-relaxed text-xs">
                  {providerReported.description || 'No description provided by hospital.'}
                </p>
              </div>

              {providerReported.specialties && providerReported.specialties.length > 0 && (
                <div>
                  <span className="text-slate-500 font-medium block mb-1">Specialties &amp; Focus Areas:</span>
                  <div className="flex flex-wrap gap-1">
                    {providerReported.specialties.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {providerReported.languages && providerReported.languages.length > 0 && (
                <div>
                  <span className="text-slate-500 font-medium block mb-0.5">Languages Spoken:</span>
                  <span className="font-semibold text-slate-800">
                    {providerReported.languages.join(', ')}
                  </span>
                </div>
              )}

              {providerReported.internationalServices && providerReported.internationalServices.length > 0 && (
                <div>
                  <span className="text-slate-500 font-medium block mb-1">International Patient Services:</span>
                  <div className="flex flex-wrap gap-1">
                    {providerReported.internationalServices.map((svc) => (
                      <span key={svc} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[11px]">
                        &bull; {svc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 italic">
            Self-reported hospital claims are subject to exploratory consultation review.
          </div>
        </div>
      </section>

      {/* Specialist Doctors Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Specialist Doctors</h2>
            <p className="text-xs text-slate-500">Board-certified clinical teams practicing at this facility</p>
          </div>
          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
            {doctors.length} Specialist{doctors.length === 1 ? '' : 's'}
          </span>
        </div>

        {doctors.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Doctor profiles are being updated for this hospital.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 hover:border-teal-300 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        <Link to={`/doctors/${doc.id}`} className="hover:text-teal-700 transition-colors">
                          {doc.name}
                        </Link>
                      </h3>
                      <p className="text-xs font-semibold text-teal-700">{doc.specialty}</p>
                    </div>
                    <div className="p-2 rounded-full bg-slate-50 text-slate-400">
                      <User className="h-5 w-5" />
                    </div>
                  </div>

                  {doc.yearsExperience && (
                    <div className="flex items-center text-xs text-slate-500 space-x-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{doc.yearsExperience} years clinical experience</span>
                    </div>
                  )}

                  {doc.qualifications && (
                    <p className="text-xs text-slate-600 line-clamp-2">
                      <span className="font-semibold text-slate-700">Credentials: </span>
                      {doc.qualifications}
                    </p>
                  )}

                  {doc.languages && doc.languages.length > 0 && (
                    <div className="flex items-center text-[11px] text-slate-500 space-x-1">
                      <Globe2 className="h-3 w-3 text-slate-400" />
                      <span>{doc.languages.join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/doctors/${doc.id}`}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                  >
                    View Doctor Profile &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Treatments & Price Ranges Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Available Treatments &amp; Cost Estimates</h2>
          <p className="text-xs text-slate-500">Transparent price ranges in USD cents for procedures performed at this facility</p>
        </div>

        {treatments.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Custom procedure pricing provided on inquiry.</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="divide-y divide-slate-100">
              {treatments.map((t) => (
                <div key={t.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">{t.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                        {t.specialty}
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-xs text-slate-500 max-w-xl line-clamp-2">{t.description}</p>
                    )}
                    {t.expectedStayDays && (
                      <span className="inline-flex items-center text-[11px] text-slate-400">
                        <Clock className="h-3 w-3 mr-1" />
                        Expected stay: {t.expectedStayDays} days
                      </span>
                    )}
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">Estimated Price</p>
                    <p className="text-sm sm:text-base font-extrabold text-slate-900">
                      {formatCentsToUSD(t.minPriceCents)} &ndash; {formatCentsToUSD(t.maxPriceCents)}
                    </p>
                    <Link
                      to="/register"
                      className="mt-1 inline-block text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Request Quote &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Curated Packages Section */}
      {packages && packages.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Curated Treatment Packages</h2>
              <p className="text-xs text-slate-500">All-inclusive medical travel packages designed for international patients</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 flex flex-col justify-between shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-base leading-snug">{pkg.title}</h3>
                    <span className="text-base font-extrabold text-slate-900 shrink-0">
                      {formatCentsToUSD(pkg.priceCents)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                      {pkg.treatment?.name}
                    </span>
                    {pkg.nights && (
                      <span className="inline-flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {pkg.nights} night(s) stay
                      </span>
                    )}
                  </div>

                  {pkg.inclusions && pkg.inclusions.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        What's Included:
                      </p>
                      <ul className="space-y-1">
                        {pkg.inclusions.slice(0, 4).map((inc, idx) => (
                          <li key={idx} className="text-xs text-slate-600 flex items-start space-x-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">All taxes &amp; coordinator included</span>
                  <Link
                    to="/register"
                    className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 shadow-2xs"
                  >
                    Inquire Package
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Patient Reviews & Rating Breakdown Section */}
      <section className="space-y-6 pt-4 border-t border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Patient Reviews &amp; Ratings</h2>
          <p className="text-xs text-slate-500">Authentic feedback from verified international patients</p>
        </div>

        {/* Rating Breakdown Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="text-center md:border-r md:border-slate-100 md:pr-6 space-y-1">
            <p className="text-4xl font-extrabold text-slate-900">{averageRating}</p>
            <div className="flex items-center justify-center space-x-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${
                    s <= Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500">{reviewCount} total verified reviews</p>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingBreakdown?.[stars] || 0;
              const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
              return (
                <div key={stars} className="flex items-center space-x-3 text-xs">
                  <span className="w-12 font-medium text-slate-600">{stars} stars</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <span className="w-8 text-right text-slate-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews List */}
        {isReviewsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
            No patient reviews published yet for this facility.
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{rev.reviewerFirstName}</span>
                    <span className="text-xs text-slate-400">&bull;</span>
                    <span className="text-xs text-slate-500">{rev.country}</span>
                    {rev.isVerified && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Verified patient
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3.5 w-3.5 ${
                        s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>

                {rev.hospitalReply && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg border-l-2 border-teal-600 space-y-1">
                    <span className="text-[11px] font-bold text-teal-800">Response from {hospital.name}:</span>
                    <p className="text-xs text-slate-600 italic">{rev.hospitalReply}</p>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination Controls */}
            {reviewsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Page {reviewsPagination.page} of {reviewsPagination.totalPages}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={reviewsPagination.page <= 1}
                    onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    disabled={reviewsPagination.page >= reviewsPagination.totalPages}
                    onClick={() => setReviewPage((p) => p + 1)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
