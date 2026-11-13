import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import AIDisclaimer from './AIDisclaimer';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Building2,
  MapPin,
  ExternalLink,
  Check,
  Loader2,
  Info,
  X,
} from 'lucide-react';

export default function AICoordinationPanel({
  caseId,
  caseStage,
  approvedHospitals = [],
}) {
  const queryClient = useQueryClient();
  const isClosed = caseStage === 'CLOSED';

  // Selection state for matching cards
  const [selectedHospitalIds, setSelectedHospitalIds] = useState([]);
  const [rateLimitMessage, setRateLimitMessage] = useState('');

  // 1. Fetch Hospital Directory for quick slug and metadata resolution
  const { data: allHospitals = [] } = useQuery({
    queryKey: ['hospitalsDirectoryForAI'],
    queryFn: async () => {
      const res = await api.get('/hospitals?limit=50');
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    initialData: approvedHospitals.length > 0 ? approvedHospitals : undefined,
  });

  const hospitalsMap = new Map(
    allHospitals.map((h) => [h.id, h])
  );

  // 2. Fetch AI Summaries with automatic polling while jobs are pending
  const {
    data: summariesData,
    isLoading: isSummariesLoading,
    isError: isSummariesError,
    error: summariesError,
    refetch: refetchSummaries,
  } = useQuery({
    queryKey: ['aiSummaries', caseId],
    queryFn: async () => {
      const res = await api.get(`/ai/cases/${caseId}/summaries`);
      return res.data?.data;
    },
    enabled: Boolean(caseId),
    refetchInterval: (queryOrData) => {
      const data = queryOrData?.state ? queryOrData.state.data : queryOrData;
      const qStatus = data?.qualification?.status;
      const mStatus = data?.providerMatching?.status;

      const isPending =
        qStatus === 'QUEUED' ||
        qStatus === 'PROCESSING' ||
        mStatus === 'QUEUED' ||
        mStatus === 'PROCESSING';

      // Poll every 2 seconds while any AI job is running
      return isPending ? 2000 : false;
    },
  });

  const qualification = summariesData?.qualification;
  const providerMatching = summariesData?.providerMatching;

  const isReadinessPending =
    qualification?.status === 'QUEUED' || qualification?.status === 'PROCESSING';
  const isMatchingPending =
    providerMatching?.status === 'QUEUED' || providerMatching?.status === 'PROCESSING';

  // 3. Trigger Readiness Mutation
  const readinessMutation = useMutation({
    mutationFn: async () => {
      setRateLimitMessage('');
      const res = await api.post(`/ai/cases/${caseId}/readiness`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['aiSummaries', caseId]);
    },
    onError: (err) => {
      if (err.response?.status === 429) {
        setRateLimitMessage(
          'AI request limit reached (max 10 requests per hour). Please try again later.'
        );
      } else {
        setRateLimitMessage(
          err.response?.data?.message || 'Failed to initiate readiness evaluation.'
        );
      }
    },
  });

  // 4. Trigger Matching Mutation
  const matchingMutation = useMutation({
    mutationFn: async () => {
      setRateLimitMessage('');
      const res = await api.post(`/ai/cases/${caseId}/matching`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['aiSummaries', caseId]);
    },
    onError: (err) => {
      if (err.response?.status === 429) {
        setRateLimitMessage(
          'AI request limit reached (max 10 requests per hour). Please try again later.'
        );
      } else {
        setRateLimitMessage(
          err.response?.data?.message || 'Failed to initiate hospital matching.'
        );
      }
    },
  });

  // Toggle hospital selection for quote request (state only)
  const toggleHospitalSelection = (hospitalId) => {
    setSelectedHospitalIds((prev) =>
      prev.includes(hospitalId)
        ? prev.filter((id) => id !== hospitalId)
        : [...prev, hospitalId]
    );
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 lg:p-8 shadow-sm space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-teal-700 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              AI Coordination &amp; Provider Matching
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Automated intake readiness analysis and objective accredited hospital recommendations.
          </p>
        </div>

        {/* Mandatory Header Disclaimer */}
        <div className="self-start sm:self-center">
          <AIDisclaimer />
        </div>
      </div>

      {/* Case Closed Warning */}
      {isClosed && (
        <div className="flex items-center space-x-2 p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-slate-500 shrink-0" />
          <span>This case is closed. New AI evaluations and matching actions are disabled.</span>
        </div>
      )}

      {/* Rate Limit / Error Banner */}
      {rateLimitMessage && (
        <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{rateLimitMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setRateLimitMessage('')}
            className="text-rose-600 hover:text-rose-800 p-1"
            title="Dismiss notice"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Button 1: Readiness */}
        <button
          type="button"
          disabled={
            isClosed ||
            readinessMutation.isPending ||
            isReadinessPending
          }
          onClick={() => readinessMutation.mutate()}
          className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 transition-colors shadow-2xs"
        >
          {readinessMutation.isPending || isReadinessPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-teal-200" />
              <span>Analyzing Case Readiness...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Check my case readiness</span>
            </>
          )}
        </button>

        {/* Button 2: Matching */}
        <button
          type="button"
          disabled={
            isClosed ||
            matchingMutation.isPending ||
            isMatchingPending
          }
          onClick={() => matchingMutation.mutate()}
          className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 disabled:opacity-50 transition-colors shadow-2xs"
        >
          {matchingMutation.isPending || isMatchingPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
              <span>Matching Accredited Hospitals...</span>
            </>
          ) : (
            <>
              <Building2 className="h-4 w-4 text-teal-700" />
              <span>Find matching hospitals</span>
            </>
          )}
        </button>
      </div>

      {/* Global Summaries Loading Indicator */}
      {isSummariesLoading && !qualification && !providerMatching && (
        <div className="p-8 text-center text-xs text-slate-400 space-y-2">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-teal-700" />
          <p>Loading case coordination summaries...</p>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. READINESS RESULT SECTION                              */}
      {/* ======================================================== */}
      {qualification && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-teal-700 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">
                Case Intake Readiness
              </h3>
            </div>
            {/* Disclaimer on result surface */}
            <AIDisclaimer className="text-[11px]" />
          </div>

          {/* Pending State */}
          {isReadinessPending && (
            <div className="flex items-center space-x-3 p-4 bg-teal-50/70 border border-teal-100 rounded-xl text-xs text-teal-900 font-medium">
              <Loader2 className="h-5 w-5 animate-spin text-teal-700 shrink-0" />
              <span>
                Evaluating your intake completeness, travel preferences, and diagnostic file readiness...
              </span>
            </div>
          )}

          {/* Failed State */}
          {qualification.status === 'FAILED' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>
                  {qualification.errorMessage ||
                    'Readiness check encountered an error. Please retry.'}
                </span>
              </div>
              <button
                type="button"
                disabled={readinessMutation.isPending}
                onClick={() => readinessMutation.mutate()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg self-start sm:self-auto shrink-0 shadow-2xs"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry Check</span>
              </button>
            </div>
          )}

          {/* Completed State */}
          {qualification.status === 'COMPLETED' && qualification.outputJson && (
            <div className="space-y-4">
              {/* Readiness Badge */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-600">Readiness Score:</span>
                {qualification.outputJson.readinessLevel === 'HIGH' && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                    <span>HIGH READINESS &bull; Intake Ready</span>
                  </span>
                )}
                {qualification.outputJson.readinessLevel === 'MEDIUM' && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                    <span>MODERATE READINESS &bull; Minor Details Needed</span>
                  </span>
                )}
                {qualification.outputJson.readinessLevel === 'LOW' && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-700" />
                    <span>ADDITIONAL INFO NEEDED</span>
                  </span>
                )}
              </div>

              {/* Grid: Missing Info & Next Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Missing Info Box */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                    <Info className="h-3.5 w-3.5 text-amber-600" />
                    <span>Missing Information to Finalize</span>
                  </h4>

                  {qualification.outputJson.missingInfo?.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {qualification.outputJson.missingInfo.map((item, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-amber-500 font-bold shrink-0">&bull;</span>
                          <span className="leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-emerald-700 font-medium flex items-center space-x-1">
                      <Check className="h-3.5 w-3.5" />
                      <span>All key intake information has been provided!</span>
                    </p>
                  )}
                </div>

                {/* Suggested Next Steps Box */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                    <span>Suggested Next Steps</span>
                  </h4>

                  {qualification.outputJson.suggestedNextSteps?.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {qualification.outputJson.suggestedNextSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-snug">{step}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No specific steps suggested at this time.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MATCHING RESULTS SECTION                              */}
      {/* ======================================================== */}
      {providerMatching && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-teal-700 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">
                Matched Accredited Hospitals
              </h3>
            </div>
            {/* Disclaimer on result surface */}
            <AIDisclaimer className="text-[11px]" />
          </div>

          {/* Pending State */}
          {isMatchingPending && (
            <div className="flex items-center space-x-3 p-4 bg-teal-50/70 border border-teal-100 rounded-xl text-xs text-teal-900 font-medium">
              <Loader2 className="h-5 w-5 animate-spin text-teal-700 shrink-0" />
              <span>
                Matching your case against accredited international medical centers by specialty, destination, and accreditation standards...
              </span>
            </div>
          )}

          {/* Failed State */}
          {providerMatching.status === 'FAILED' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>
                  {providerMatching.errorMessage ||
                    'Hospital matching encountered an error. Please retry.'}
                </span>
              </div>
              <button
                type="button"
                disabled={matchingMutation.isPending}
                onClick={() => matchingMutation.mutate()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg self-start sm:self-auto shrink-0 shadow-2xs"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry Matching</span>
              </button>
            </div>
          )}

          {/* Completed State */}
          {providerMatching.status === 'COMPLETED' && providerMatching.outputJson && (
            <div className="space-y-4">
              {providerMatching.outputJson.matches?.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                  No verified partner hospitals matched your exact inquiry criteria. Our international intake team will manually evaluate options for your procedure.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                    <span>
                      Showing top{' '}
                      <strong className="text-slate-900">
                        {providerMatching.outputJson.matches.length}
                      </strong>{' '}
                      accredited hospital matches:
                    </span>
                    {selectedHospitalIds.length > 0 && (
                      <span className="font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                        {selectedHospitalIds.length} hospital{selectedHospitalIds.length === 1 ? '' : 's'} selected
                      </span>
                    )}
                  </div>

                  {/* Up to 5 Hospital Cards */}
                  <div className="space-y-3">
                    {providerMatching.outputJson.matches.map((match) => {
                      const hospital = hospitalsMap.get(match.hospitalId);
                      const isSelected = selectedHospitalIds.includes(match.hospitalId);
                      const hospitalName =
                        hospital?.name || 'Accredited Medical Center';
                      const hospitalLocation = hospital
                        ? `${hospital.city}, ${hospital.country}`
                        : 'International Destination';
                      const slug = hospital?.slug || match.hospitalId;

                      return (
                        <div
                          key={match.hospitalId}
                          className={`bg-white rounded-xl border transition-all p-4 sm:p-5 space-y-3.5 ${
                            isSelected
                              ? 'border-teal-600 ring-2 ring-teal-100 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* Card Top: Name, Location, Score */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="space-y-1">
                              <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                                {hospitalName}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span className="inline-flex items-center space-x-1">
                                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span>{hospitalLocation}</span>
                                </span>
                                {hospital?.accreditations?.length > 0 && (
                                  <span className="inline-flex items-center space-x-1 font-semibold text-teal-800 bg-teal-50 px-2 py-0.2 rounded border border-teal-200 text-[10px]">
                                    {hospital.accreditations.join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Match Score */}
                            <div className="shrink-0 self-start sm:self-auto">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-teal-100 text-teal-800 border border-teal-200">
                                {match.score}% Match
                              </span>
                            </div>
                          </div>

                          {/* "Why this hospital" Reasons */}
                          {match.reasons?.length > 0 && (
                            <div className="space-y-1.5 pt-1 border-t border-slate-100">
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                                Why this hospital:
                              </span>
                              <ul className="space-y-1 text-xs text-slate-700">
                                {match.reasons.map((reason, idx) => (
                                  <li key={idx} className="flex items-start space-x-2">
                                    <Check className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                                    <span className="leading-snug">{reason}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Card Bottom: Selection Checkbox & Profile Link */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                            {/* Checkbox state only */}
                            <label className="flex items-center space-x-2 font-semibold text-slate-700 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleHospitalSelection(match.hospitalId)}
                                className="rounded border-slate-300 text-teal-700 focus:ring-teal-500 h-4 w-4"
                              />
                              <span>Select for quote request</span>
                            </label>

                            {/* Profile Link */}
                            <Link
                              to={`/hospitals/${slug}`}
                              className="inline-flex items-center space-x-1 font-bold text-teal-700 hover:text-teal-800 self-start sm:self-auto"
                            >
                              <span>View Hospital Profile</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State when no AI action has been run yet */}
      {!qualification && !providerMatching && !isSummariesLoading && (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-1">
          <p className="font-medium text-slate-600">
            No AI coordination evaluations performed yet.
          </p>
          <p>
            Click <strong className="text-slate-700">"Check my case readiness"</strong> to analyze your intake file, or <strong className="text-slate-700">"Find matching hospitals"</strong> to discover qualified partner clinics.
          </p>
        </div>
      )}
    </section>
  );
}
