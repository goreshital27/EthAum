import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Mail,
  MapPin,
  ShieldCheck,
  Award,
  AlertCircle,
  Calendar,
  Filter,
} from 'lucide-react';

export default function AdminApprovals() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');

  // Modal State for Reject with Reason
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedHospitalForReject, setSelectedHospitalForReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // 1. Fetch Hospitals for Approval Review
  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminHospitalApprovals', statusFilter],
    queryFn: async () => {
      const res = await api.get(`/admin/hospitals?status=${statusFilter}&limit=50`);
      return res.data;
    },
  });

  const hospitals = response?.data || [];
  const pagination = response?.pagination;

  // 2. Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/admin/hospitals/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminHospitalApprovals']);
      queryClient.invalidateQueries(['adminAnalytics']);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to approve hospital');
    },
  });

  // 3. Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const res = await api.post(`/admin/hospitals/${id}/reject`, { reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminHospitalApprovals']);
      queryClient.invalidateQueries(['adminAnalytics']);
      setRejectModalOpen(false);
      setSelectedHospitalForReject(null);
      setRejectReason('');
      setRejectError('');
    },
    onError: (err) => {
      setRejectError(err.response?.data?.message || 'Failed to decline hospital');
    },
  });

  const handleOpenRejectModal = (hospital) => {
    setSelectedHospitalForReject(hospital);
    setRejectReason('');
    setRejectError('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = (e) => {
    e.preventDefault();
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setRejectError('Please provide a specific reason for rejection (at least 5 characters).');
      return;
    }
    rejectMutation.mutate({
      id: selectedHospitalForReject.id,
      reason: rejectReason.trim(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Title & Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-rose-600 shrink-0" />
            <span>Hospital Verification Queue</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Authenticate hospital licenses, clinical accreditations, and contact credentials before public listing.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'ALL' ? 'All Hospitals' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-44 bg-slate-200 rounded-2xl"></div>
          <div className="h-44 bg-slate-200 rounded-2xl"></div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-white p-8 rounded-2xl border border-rose-200 text-center space-y-3 shadow-xs">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-slate-900">Failed to load hospital verification queue</p>
          <p className="text-xs text-slate-500">
            {error?.response?.data?.message || error?.message || 'Unable to retrieve hospital approvals. Please try again.'}
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
      {!isLoading && !isError && hospitals.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Queue is Clear</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {statusFilter === 'PENDING'
              ? 'No hospitals currently pending verification review.'
              : `No hospitals matching status '${statusFilter}'.`}
          </p>
        </div>
      )}

      {/* Hospitals List */}
      {!isLoading && !isError && hospitals.length > 0 && (
        <div className="space-y-4">
          {hospitals.map((hospital) => {
            const isPending = hospital.verificationStatus === 'PENDING';
            const isApproved = hospital.verificationStatus === 'APPROVED';
            const isRejected = hospital.verificationStatus === 'REJECTED';

            return (
              <div
                key={hospital.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  {/* Top line with badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                        isPending
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : isApproved
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {hospital.verificationStatus}
                    </span>

                    <span className="text-xs text-slate-400">&bull;</span>
                    <span className="text-xs text-slate-500 font-medium">
                      Slug: <code className="bg-slate-100 px-1 py-0.5 rounded">{hospital.slug}</code>
                    </span>
                  </div>

                  {/* Hospital Name & Location */}
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                      {hospital.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-700">{hospital.city}, {hospital.country}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-600 font-medium">{hospital.contact}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>Submitted {new Date(hospital.submittedDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Accreditations */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Claimed Accreditations:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {hospital.accreditations && hospital.accreditations.length > 0 ? (
                        hospital.accreditations.map((acc) => (
                          <span
                            key={acc}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200"
                          >
                            <Award className="h-3 w-3 mr-1 text-teal-600" />
                            {acc}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No accreditations submitted</span>
                      )}
                    </div>
                  </div>

                  {/* Verified Date note if approved */}
                  {hospital.verifiedAt && (
                    <div className="text-xs text-emerald-700 font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Verified &amp; Published on {new Date(hospital.verifiedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="shrink-0 flex flex-row lg:flex-col gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  {isPending && (
                    <>
                      <button
                        type="button"
                        disabled={approveMutation.isLoading}
                        onClick={() => {
                          if (window.confirm(`Approve and verify ${hospital.name}? This will publish the hospital to the public international marketplace.`)) {
                            approveMutation.mutate(hospital.id);
                          }
                        }}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Approve Facility</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenRejectModal(hospital)}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Reject Application</span>
                      </button>
                    </>
                  )}

                  {isApproved && (
                    <div className="text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                        Live in Public Directory
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenRejectModal(hospital)}
                        className="block mt-2 text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Revoke Approval
                      </button>
                    </div>
                  )}

                  {isRejected && (
                    <div>
                      <button
                        type="button"
                        disabled={approveMutation.isLoading}
                        onClick={() => {
                          if (window.confirm(`Re-approve ${hospital.name}?`)) {
                            approveMutation.mutate(hospital.id);
                          }
                        }}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Re-evaluate &amp; Approve</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal with Mandatory Reason */}
      {rejectModalOpen && selectedHospitalForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2 text-rose-600">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <h3 className="text-base font-extrabold text-slate-900">Decline Hospital Application</h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Rejecting <strong className="text-slate-900">{selectedHospitalForReject.name}</strong> will keep it unlisted from the public portal. Please provide an explicit reason sent to the hospital administrator.
            </p>

            {rejectError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{rejectError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rejection Reason (Required) *
                </label>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g., Hospital accreditation certificate expired; unverified clinical license registry number."
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectMutation.isLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {rejectMutation.isLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
