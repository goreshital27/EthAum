import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { formatCentsToUSD } from '../../utils/currency';
import { STAGE_META } from '../../components/StageTracker';
import {
  FolderOpen,
  Filter,
  Search,
  Eye,
  Lock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Calendar,
  MapPin,
  FileText,
  User,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

const STAGES = [
  'NEW',
  'QUALIFIED',
  'MEDICAL_REVIEW',
  'QUOTE_REQUESTED',
  'QUOTE_SENT',
  'CONSULTATION',
  'BOOKED',
  'TREATMENT',
  'AFTERCARE',
  'CLOSED',
];

export default function AdminCases() {
  const queryClient = useQueryClient();

  // Filters State
  const [stageFilter, setStageFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [treatmentFilter, setTreatmentFilter] = useState('');
  const [page, setPage] = useState(1);

  // Detail Modal State
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [targetStage, setTargetStage] = useState('');
  const [stageReason, setStageReason] = useState('');
  const [stageError, setStageError] = useState('');
  const [stageSuccess, setStageSuccess] = useState('');

  // 1. Fetch Cases with Filters & Pagination
  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminCases', stageFilter, countryFilter, treatmentFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (stageFilter && stageFilter !== 'ALL') params.set('stage', stageFilter);
      if (countryFilter.trim()) params.set('country', countryFilter.trim());
      if (treatmentFilter.trim()) params.set('treatment', treatmentFilter.trim());
      params.set('page', page);
      params.set('limit', 15);

      const res = await api.get(`/admin/cases?${params.toString()}`);
      return res.data;
    },
    keepPreviousData: true,
  });

  const cases = response?.data || [];
  const pagination = response?.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 };

  // 2. Fetch Selected Case Detail for Modal
  const {
    data: caseDetailResponse,
    isLoading: isDetailLoading,
  } = useQuery({
    queryKey: ['adminCaseDetail', selectedCaseId],
    queryFn: async () => {
      const res = await api.get(`/admin/cases/${selectedCaseId}`);
      return res.data?.data;
    },
    enabled: Boolean(selectedCaseId),
  });

  const caseDetail = caseDetailResponse;

  // 3. Stage Transition Mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage, reason }) => {
      const res = await api.patch(`/admin/cases/${id}/stage`, { stage, reason });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['adminCases']);
      queryClient.invalidateQueries(['adminCaseDetail', selectedCaseId]);
      queryClient.invalidateQueries(['adminAnalytics']);
      setStageSuccess(`Case stage transitioned to ${data.data?.stage}`);
      setStageError('');
      setTargetStage('');
      setStageReason('');
      setTimeout(() => setStageSuccess(''), 4000);
    },
    onError: (err) => {
      setStageError(err.response?.data?.message || 'Failed to update case stage');
      setStageSuccess('');
    },
  });

  // 4. Document Access Handler (Enforces Consent + AccessLog)
  const handleViewDocument = async (docId) => {
    try {
      const res = await api.get(`/admin/cases/${selectedCaseId}/documents/${docId}/access`);
      const accessUrl = res.data?.data?.accessUrl;
      if (accessUrl) {
        window.open(accessUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate document access link');
    }
  };

  const handleStageSubmit = (e) => {
    e.preventDefault();
    setStageError('');
    if (!targetStage) {
      setStageError('Please select a target stage.');
      return;
    }
    updateStageMutation.mutate({
      id: selectedCaseId,
      stage: targetStage,
      reason: stageReason.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
              <FolderOpen className="h-6 w-6 text-rose-600 shrink-0" />
              <span>Medical Case Coordination</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review case metadata, audit consent sovereignty, and transition case pipeline stages.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
            {pagination.total} Total Case{pagination.total === 1 ? '' : 's'}
          </span>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Stage Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Stage
            </label>
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
            >
              <option value="">All Stages</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Country Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Destination Country
            </label>
            <input
              type="text"
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. India, Thailand"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Treatment Search */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Procedure / Need
            </label>
            <input
              type="text"
              value={treatmentFilter}
              onChange={(e) => {
                setTreatmentFilter(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. Knee Replacement, IVF"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 space-y-3 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-48"></div>
          <div className="h-40 bg-slate-100 rounded-xl"></div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-white p-8 rounded-2xl border border-rose-200 text-center space-y-3 shadow-xs">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-slate-900">Failed to load medical cases</p>
          <p className="text-xs text-slate-500">
            {error?.response?.data?.message || error?.message || 'Unable to retrieve cases directory. Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && cases.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
          <FolderOpen className="h-8 w-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Cases Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No medical cases match your current filter parameters. Try clearing the filters.
          </p>
        </div>
      )}

      {/* Cases Table */}
      {!isLoading && !isError && cases.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Case / Patient</th>
                  <th className="py-3 px-4">Procedure Need</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Budget</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Consent Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Case ID & Patient */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{c.patientName}</div>
                      <div className="text-[11px] text-slate-400">
                        #{c.id.slice(0, 8)} &bull; {c.patientCountry}
                      </div>
                    </td>

                    {/* Procedure Need */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-[180px] truncate">
                      {c.treatmentName}
                    </td>

                    {/* Destination */}
                    <td className="py-3.5 px-4 text-slate-600">
                      {c.destinationCountry}
                    </td>

                    {/* Budget */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {c.budgetCents ? formatCentsToUSD(c.budgetCents) : 'Flexible'}
                    </td>

                    {/* Stage Badge */}
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                        {c.stage}
                      </span>
                    </td>

                    {/* Consent Sovereignty Badge */}
                    <td className="py-3.5 px-4">
                      {c.hasValidConsent ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck className="h-3 w-3 mr-1 text-emerald-600" />
                          Consent Active ({c.activeConsentsCount})
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          <Lock className="h-3 w-3 mr-1 text-slate-400" />
                          No Consent
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>

                    {/* Manage Link */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCaseId(c.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Case Inspection & Stage Transition Modal */}
      {selectedCaseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 my-8">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">
                  Admin Case Inspector
                </span>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Case #{selectedCaseId.slice(0, 8)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCaseId(null);
                  setStageError('');
                  setStageSuccess('');
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {isDetailLoading || !caseDetail ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                Loading case metadata and consent verification...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status Banners */}
                {stageSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{stageSuccess}</span>
                  </div>
                )}

                {stageError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                    <span>{stageError}</span>
                  </div>
                )}

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block font-medium">Patient</span>
                    <strong className="text-slate-800">{caseDetail.patient.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Patient Contact</span>
                    <span className="text-slate-700">{caseDetail.patient.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Current Stage</span>
                    <strong className="text-teal-700">{caseDetail.stage}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Procedure Need</span>
                    <span className="text-slate-800">{caseDetail.treatment?.name || caseDetail.treatmentNeed}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Target Destination</span>
                    <span className="text-slate-800">
                      {caseDetail.destination?.country ? `${caseDetail.destination.country} (${caseDetail.destination.city})` : 'Flexible'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Budget</span>
                    <span className="text-slate-800 font-semibold">
                      {caseDetail.budgetCents ? formatCentsToUSD(caseDetail.budgetCents) : 'Flexible'}
                    </span>
                  </div>
                </div>

                {/* Patient Notes */}
                {caseDetail.diagnosisSummary && (
                  <div className="space-y-1 text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      Patient Clinical Summary:
                    </span>
                    <p className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
                      {caseDetail.diagnosisSummary}
                    </p>
                  </div>
                )}

                {/* Stage Pipeline Controller */}
                <form
                  onSubmit={handleStageSubmit}
                  className="bg-rose-50/40 p-4 rounded-xl border border-rose-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Stage Pipeline Control (enforceStageTransition)
                    </h3>
                    <span className="text-[11px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                      Current: {caseDetail.stage}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Advance to Stage *
                      </label>
                      <select
                        value={targetStage}
                        onChange={(e) => setTargetStage(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="">-- Select Next Stage --</option>
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Audit Note / Reason (Optional)
                      </label>
                      <input
                        type="text"
                        value={stageReason}
                        onChange={(e) => setStageReason(e.target.value)}
                        placeholder="e.g. Intake verified; records validated"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updateStageMutation.isLoading || !targetStage}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
                  >
                    <span>Execute Stage Transition</span>
                  </button>
                </form>

                {/* Consent & Documents Section (Strict Sovereignty) */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <ShieldCheck className="h-4 w-4 text-teal-700" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Medical Records &amp; Consent Sovereignty
                      </h3>
                    </div>
                    {caseDetail.hasValidConsent ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Consent Active
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Consent Required
                      </span>
                    )}
                  </div>

                  {/* Consent Notice */}
                  <div className={`p-3 rounded-xl border text-xs ${
                    caseDetail.hasValidConsent
                      ? 'bg-teal-50 border-teal-200 text-teal-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <p className="font-medium leading-relaxed">
                      {caseDetail.documentAccessNotice}
                    </p>
                    {caseDetail.consents && caseDetail.consents.length > 0 && (
                      <div className="mt-2 text-[11px] text-teal-700">
                        Authorized Hospital(s):{' '}
                        {caseDetail.consents.map((c) => c.hospital?.name).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Documents List */}
                  {caseDetail.hasValidConsent ? (
                    caseDetail.documents.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No medical files uploaded for this case yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {caseDetail.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                              <div>
                                <p className="font-bold text-slate-900 text-xs truncate max-w-[240px]">
                                  {doc.originalName}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {doc.category} &bull; {(doc.sizeBytes / 1024).toFixed(1)} KB &bull;{' '}
                                  {new Date(doc.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleViewDocument(doc.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-md text-xs font-bold transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>View (Logged)</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="p-4 bg-slate-100 rounded-xl text-center text-xs text-slate-500 space-y-1">
                      <Lock className="h-5 w-5 mx-auto text-slate-400" />
                      <p className="font-semibold text-slate-700">Protected Health Information Encrypted</p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Under EthAum data rules, medical records cannot be decrypted or streamed without active patient consent.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
