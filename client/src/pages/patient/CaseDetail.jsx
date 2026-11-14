import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getFullFileUrl } from '../../api/axios';
import { formatCentsToUSD } from '../../utils/currency';
import StageTracker from '../../components/StageTracker';
import AIDisclaimer from '../../components/AIDisclaimer';
import AICoordinationPanel from '../../components/AICoordinationPanel';
import NotificationBell from '../../components/NotificationBell';
import ChatPanel from '../../components/ChatPanel';
import {
  ArrowLeft,
  FileText,
  UploadCloud,
  ShieldCheck,
  Lock,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  Calendar,
  XCircle,
  Plus,
  Video,
  ExternalLink,
  MessageSquare,
  CalendarCheck,
  Star,
  CheckSquare,
  Square,
  HeartHandshake,
} from 'lucide-react';

export default function CaseDetail() {
  const { id: caseId } = useParams();
  const queryClient = useQueryClient();

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [category, setCategory] = useState('REPORT');
  const [consentChecked, setConsentChecked] = useState(false);
  const [selectedHospitalForUpload, setSelectedHospitalForUpload] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Grant Consent State
  const [hospitalToGrant, setHospitalToGrant] = useState('');
  const [consentNotice, setConsentNotice] = useState('');

  // 1. Fetch Case Details
  const {
    data: caseResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['caseDetail', caseId],
    queryFn: async () => {
      const res = await api.get(`/cases/${caseId}`);
      return res.data?.data;
    },
  });

  const caseItem = caseResponse;

  // 2. Fetch Approved Hospitals for Consent dropdown
  const { data: approvedHospitalsData } = useQuery({
    queryKey: ['approvedHospitalsForConsent'],
    queryFn: async () => {
      const res = await api.get('/hospitals?limit=24');
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const approvedHospitals = approvedHospitalsData || [];

  // 3. Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post(`/cases/${caseId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['caseDetail', caseId]);
      setSelectedFile(null);
      setConsentChecked(false);
      setUploadError('');
      setUploadSuccess('Document securely uploaded and encrypted.');
      setTimeout(() => setUploadSuccess(''), 4000);
    },
    onError: (err) => {
      setUploadError(err.response?.data?.message || 'Upload failed. Please ensure file is valid.');
    },
  });

  // 4. Grant Consent Mutation
  const grantConsentMutation = useMutation({
    mutationFn: async ({ hospitalId }) => {
      const res = await api.post(`/cases/${caseId}/consents`, { hospitalId });
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['caseDetail', caseId]);
      setHospitalToGrant('');
      setConsentNotice(`Access successfully granted to ${data.hospital?.name}.`);
      setTimeout(() => setConsentNotice(''), 4000);
    },
    onError: (err) => {
      setConsentNotice(err.response?.data?.message || 'Failed to grant consent.');
    },
  });

  // 5. Revoke Consent Mutation
  const revokeConsentMutation = useMutation({
    mutationFn: async (consentId) => {
      const res = await api.delete(`/consents/${consentId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['caseDetail', caseId]);
      setConsentNotice('Access revoked successfully.');
      setTimeout(() => setConsentNotice(''), 4000);
    },
    onError: (err) => {
      setConsentNotice(err.response?.data?.message || 'Failed to revoke access.');
    },
  });

  // 6. Fetch Live Case Appointments
  const {
    data: appointments = [],
    isLoading: isApptsLoading,
  } = useQuery({
    queryKey: ['caseAppointments', caseId],
    queryFn: async () => {
      const res = await api.get(`/appointments?caseId=${caseId}`);
      return res.data?.data || [];
    },
    enabled: Boolean(caseId),
  });

  const [apptActionFeedback, setApptActionFeedback] = useState('');
  const [selectedChatHospitalId, setSelectedChatHospitalId] = useState('');

  // 7. Accept Appointment Mutation
  const acceptApptMutation = useMutation({
    mutationFn: async (appointmentId) => {
      const res = await api.post(`/appointments/${appointmentId}/accept`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['caseDetail', caseId]);
      queryClient.invalidateQueries(['caseAppointments', caseId]);
      queryClient.invalidateQueries(['myNotifications']);
      setApptActionFeedback('Consultation slot confirmed! You can now join the call at the scheduled time.');
      setTimeout(() => setApptActionFeedback(''), 5000);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to accept consultation slot');
    },
  });

  // 8. Decline Appointment Mutation
  const declineApptMutation = useMutation({
    mutationFn: async (appointmentId) => {
      const res = await api.post(`/appointments/${appointmentId}/decline`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['caseDetail', caseId]);
      queryClient.invalidateQueries(['caseAppointments', caseId]);
      queryClient.invalidateQueries(['myNotifications']);
      setApptActionFeedback('Consultation declined.');
      setTimeout(() => setApptActionFeedback(''), 5000);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to decline consultation');
    },
  });

  // Participating hospitals for chat
  const participatingHospitals = (caseItem?.enquiries || [])
    .map((e) => e.hospital)
    .filter(Boolean);

  const activeChatHospitalId =
    selectedChatHospitalId || (participatingHospitals.length > 0 ? participatingHospitals[0].id : null);
  const activeChatHospital =
    participatingHospitals.find((h) => h.id === activeChatHospitalId) || participatingHospitals[0];

  // 9. Fetch Aftercare Tasks
  const {
    data: aftercareData,
    isLoading: isAftercareLoading,
  } = useQuery({
    queryKey: ['caseAftercareTasks', caseId],
    queryFn: async () => {
      const res = await api.get(`/aftercare/cases/${caseId}/tasks`);
      return res.data?.data;
    },
    enabled: Boolean(caseId),
  });

  const aftercareTasks = aftercareData?.tasks || [];
  const aftercareBooking = aftercareData?.booking || (caseItem?.bookings?.[0] || null);

  // Toggle Aftercare Task mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }) => {
      const res = await api.patch(`/aftercare/tasks/${taskId}`, { completed });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['caseDetail', caseId]);
      queryClient.invalidateQueries(['caseAftercareTasks', caseId]);
      if (data?.data?.caseClosed) {
        queryClient.invalidateQueries(['bookingReview']);
      }
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to update aftercare task');
    },
  });

  // 10. Fetch Review for Booking
  const {
    data: reviewData,
    isLoading: isReviewLoading,
  } = useQuery({
    queryKey: ['bookingReview', aftercareBooking?.id],
    queryFn: async () => {
      if (!aftercareBooking?.id) return null;
      const res = await api.get(`/reviews/booking/${aftercareBooking.id}`);
      return res.data?.data;
    },
    enabled: Boolean(aftercareBooking?.id),
  });

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Submit Review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async ({ bookingId, rating, comment }) => {
      setReviewError('');
      const res = await api.post('/reviews', { bookingId, rating, comment });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookingReview', aftercareBooking?.id]);
      queryClient.invalidateQueries(['caseDetail', caseId]);
      setReviewSuccess('Thank you! Your verified patient review has been published.');
      setTimeout(() => setReviewSuccess(''), 5000);
    },
    onError: (err) => {
      setReviewError(err.response?.data?.message || 'Failed to submit review');
    },
  });

  // Handle Document View (fetches signed URL and opens in new window)
  const handleViewDocument = async (docId) => {
    try {
      const res = await api.get(`/documents/${docId}/access`);
      const accessUrl = res.data?.data?.accessUrl;
      if (accessUrl) {
        const fullUrl = getFullFileUrl(accessUrl);
        window.open(fullUrl, '_blank', 'noopener');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate access link for document.');
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    setUploadError('');

    if (caseItem?.stage === 'CLOSED') {
      setUploadError('This case is closed. New documents cannot be added.');
      return;
    }

    if (!selectedFile) {
      setUploadError('Please select a file to upload (PDF, JPG, or PNG up to 10MB).');
      return;
    }

    if (!consentChecked) {
      setUploadError('You must check the patient consent box to upload medical records.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', category);
    formData.append('consent', 'true');
    if (selectedHospitalForUpload) {
      formData.append('hospitalId', selectedHospitalForUpload);
    }

    uploadMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-32"></div>
        <div className="h-40 bg-slate-200 rounded-2xl"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (isError || !caseItem) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">Medical Case Not Found</h1>
        <p className="text-xs text-slate-500">
          {error?.response?.data?.message || 'The requested case could not be retrieved.'}
        </p>
        <Link
          to="/patient"
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-700 text-white text-xs font-semibold rounded-lg"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/patient"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          <div className="flex items-center space-x-3">
            <NotificationBell />
            <AIDisclaimer />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* Case Banner */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">
                Case Inquiry #{caseItem.id.slice(0, 8)}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {caseItem.treatment?.name || caseItem.treatmentNeed}
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <Link
                to={`/patient/cases/${caseId}/quotes`}
                className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-2xs"
              >
                <span>Compare Quotes</span>
              </Link>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                Stage: {caseItem.stage}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium">Destination Preference:</span>
              <p className="font-bold text-slate-800">
                {caseItem.destination?.country ? `${caseItem.destination.country} (${caseItem.destination.city})` : 'Flexible (All accredited hubs)'}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium">Target Budget:</span>
              <p className="font-bold text-slate-800">
                {caseItem.budgetCents ? formatCentsToUSD(caseItem.budgetCents) : 'Flexible'}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium">Date Created:</span>
              <p className="font-semibold text-slate-800">
                {new Date(caseItem.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {caseItem.diagnosisSummary && (
            <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
              <span className="text-slate-400 font-medium block">Patient Medical Notes:</span>
              <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                {caseItem.diagnosisSummary}
              </p>
            </div>
          )}
        </section>

        {/* Stage Tracker Pipeline */}
        <StageTracker currentStage={caseItem.stage} />

        {/* AI Coordination & Provider Matching Panel */}
        <AICoordinationPanel
          caseId={caseItem.id}
          caseStage={caseItem.stage}
          approvedHospitals={approvedHospitals}
        />

        {/* Video Consultations & Exploratory Calls Section */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <Video className="h-5 w-5 text-teal-700" />
                <span>Tele-Consultations &amp; Video Coordination</span>
              </h2>
              <p className="text-xs text-slate-500">
                Join exploratory intake calls or pre-admission clinical reviews with hospital specialists via secure video.
              </p>
            </div>
            <span className="text-xs font-semibold bg-teal-50 text-teal-800 px-3 py-1 rounded-full border border-teal-200 self-start sm:self-auto">
              {appointments.filter((a) => a.status === 'CONFIRMED').length} Confirmed
            </span>
          </div>

          {apptActionFeedback && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{apptActionFeedback}</span>
            </div>
          )}

          {isApptsLoading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Loading consultations...</div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center space-y-2 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
              <Video className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No Consultations Scheduled Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Accredited partner hospitals will propose 1 to 3 time slots for exploratory video calls after evaluating your case inquiry.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => {
                const isConfirmed = appt.status === 'CONFIRMED';
                const isRequested = appt.status === 'REQUESTED';
                const isCancelled = appt.status === 'CANCELLED';
                const isCompleted = appt.status === 'COMPLETED';

                const statusBadge = {
                  REQUESTED: 'bg-amber-50 text-amber-800 border-amber-200',
                  CONFIRMED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                  COMPLETED: 'bg-blue-50 text-blue-800 border-blue-200',
                  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
                }[appt.status] || 'bg-slate-100 text-slate-600';

                return (
                  <div
                    key={appt.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs transition-colors hover:bg-slate-50/90"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className="font-bold text-slate-900 text-sm">
                          {new Date(appt.scheduledAt).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          at{' '}
                          {new Date(appt.scheduledAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          ({appt.timezone || 'UTC'})
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          {appt.type}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                          {appt.status}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-slate-600 flex-wrap gap-y-1">
                        <span className="inline-flex items-center space-x-1 font-semibold text-slate-800">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>{appt.hospital?.name}</span>
                        </span>
                        {appt.doctor?.name && (
                          <span>&bull; Specialist: Dr. {appt.doctor.name} ({appt.doctor.specialty})</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 self-start md:self-center shrink-0">
                      {isConfirmed && appt.videoLink && (
                        <a
                          href={appt.videoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span>Join Video Call</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}

                      {isRequested && (
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            disabled={acceptApptMutation.isLoading || declineApptMutation.isLoading}
                            onClick={() => acceptApptMutation.mutate(appt.id)}
                            className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 shadow-sm transition-colors disabled:opacity-50"
                          >
                            <CalendarCheck className="h-3.5 w-3.5" />
                            <span>Accept Slot</span>
                          </button>
                          <button
                            type="button"
                            disabled={acceptApptMutation.isLoading || declineApptMutation.isLoading}
                            onClick={() => declineApptMutation.mutate(appt.id)}
                            className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Decline</span>
                          </button>
                        </div>
                      )}

                      {(isCancelled || isCompleted) && (
                        <span className="text-slate-400 text-xs italic">
                          {isCancelled ? 'Slot cancelled' : 'Call completed'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Direct Coordination Messages Thread */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-teal-700" />
                <span>Hospital Coordination Messaging</span>
              </h2>
              <p className="text-xs text-slate-500">
                Direct messaging with accredited partner hospitals regarding logistics, records, and treatment details.
              </p>
            </div>
          </div>

          {participatingHospitals.length === 0 ? (
            <div className="p-8 text-center space-y-2 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
              <MessageSquare className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No Active Hospital Threads</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Request quotations from partner hospitals above to open direct messaging threads.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Hospital Selection Tabs if multiple */}
              {participatingHospitals.length > 1 && (
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-semibold border-b border-slate-100">
                  <span className="text-slate-400 text-[11px] uppercase tracking-wider mr-1">Select Hospital:</span>
                  {participatingHospitals.map((h) => {
                    const isSelected = activeChatHospital?.id === h.id;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setSelectedChatHospitalId(h.id)}
                        className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                          isSelected
                            ? 'bg-teal-700 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Building2 className="h-3 w-3" />
                        <span>{h.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeChatHospital && (
                <ChatPanel
                  caseId={caseId}
                  hospitalId={activeChatHospital.id}
                  hospitalName={activeChatHospital.name}
                />
              )}
            </div>
          )}
        </section>

        {/* Post-Treatment Recovery & Aftercare Section (Requirement Part A) */}
        {(caseItem.stage === 'AFTERCARE' || caseItem.stage === 'CLOSED' || aftercareTasks.length > 0) && (
          <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                  <HeartHandshake className="h-5 w-5 text-teal-700" />
                  <span>Post-Procedure Recovery &amp; Aftercare Tasks</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Coordination reminders only, not medical advice. Check off milestones as you complete them with your healthcare team.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold bg-teal-50 text-teal-800 px-3 py-1 rounded-full border border-teal-200">
                  {aftercareData?.completedCount || 0} of {aftercareData?.totalCount || 4} Completed
                </span>
                {caseItem.stage === 'CLOSED' && (
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-300">
                    Case Closed
                  </span>
                )}
              </div>
            </div>

            {/* Progress indicator */}
            {aftercareData?.totalCount > 0 && (
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(
                      ((aftercareData?.completedCount || 0) / aftercareData.totalCount) * 100
                    )}%`,
                  }}
                />
              </div>
            )}

            {isAftercareLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading aftercare checklist...</div>
            ) : aftercareTasks.length === 0 ? (
              <div className="p-8 text-center space-y-2 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                <HeartHandshake className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No Aftercare Tasks Yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Aftercare tasks will be initialized automatically as soon as your treating hospital marks your procedure complete.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {aftercareTasks.map((task) => {
                  const isDone = Boolean(task.completedAt);

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isDone
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-slate-50/80 border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3 flex-1">
                        <button
                          type="button"
                          disabled={toggleTaskMutation.isLoading}
                          onClick={() =>
                            toggleTaskMutation.mutate({
                              taskId: task.id,
                              completed: !isDone,
                            })
                          }
                          className="mt-0.5 text-slate-400 hover:text-teal-700 transition-colors focus:outline-hidden"
                          title={isDone ? 'Mark as pending' : 'Mark as completed'}
                        >
                          {isDone ? (
                            <CheckSquare className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-400 hover:text-teal-600" />
                          )}
                        </button>

                        <div className="space-y-1">
                          <h4
                            className={`font-bold text-sm ${
                              isDone ? 'text-slate-600 line-through' : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {task.description}
                          </p>

                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-0.5">
                            {task.dueDate && (
                              <span className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                <span>
                                  Target: {new Date(task.dueDate).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </span>
                            )}
                            {isDone && (
                              <>
                                <span>&bull;</span>
                                <span className="text-emerald-700 font-semibold">
                                  Completed {new Date(task.completedAt).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="self-end sm:self-center shrink-0">
                        {isDone ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Completed
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={toggleTaskMutation.isLoading}
                            onClick={() =>
                              toggleTaskMutation.mutate({
                                taskId: task.id,
                                completed: true,
                              })
                            }
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-2xs"
                          >
                            Mark Done
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-[11px] text-teal-800 flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                  <span>
                    When all aftercare recovery tasks are marked complete, this medical case will transition to <strong>CLOSED</strong>, unlocking your verified review.
                  </span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Verified Patient Review Section (Requirement Part B) */}
        {(caseItem.stage === 'CLOSED' || aftercareBooking?.status === 'COMPLETED') && (
          <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  <span>Verified Patient Hospital Review</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Share your authentic healthcare journey. Published reviews display your first name and country with a Verified patient badge.
                </p>
              </div>

              {reviewData && (
                <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Verified Review Published
                </span>
              )}
            </div>

            {/* Error & Success Alerts */}
            {reviewSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{reviewSuccess}</span>
              </div>
            )}
            {reviewError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {isReviewLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading review status...</div>
            ) : reviewData ? (
              /* Already Reviewed: Display the Review and Hospital Reply */
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${
                            s <= reviewData.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-slate-900 text-sm">
                      {reviewData.rating} out of 5 Stars
                    </span>
                    <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Verified patient
                    </span>
                  </div>

                  <span className="text-slate-400 text-[11px]">
                    Reviewed on {new Date(reviewData.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {reviewData.comment ? (
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    "{reviewData.comment}"
                  </p>
                ) : (
                  <p className="text-slate-400 italic">No written comment provided.</p>
                )}

                {/* Hospital Public Reply */}
                {reviewData.hospitalReply && (
                  <div className="mt-3 p-4 bg-teal-50/60 rounded-xl border-l-4 border-teal-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-900 text-xs">
                        Official Response from {reviewData.hospital?.name || 'Hospital'}:
                      </span>
                    </div>
                    <p className="text-slate-700 italic text-xs leading-relaxed">
                      "{reviewData.hospitalReply}"
                    </p>
                  </div>
                )}
              </div>
            ) : !aftercareBooking ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                A completed hospital booking is required to submit a verified patient review.
              </div>
            ) : (
              /* Review Form */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!aftercareBooking?.id) return;
                  submitReviewMutation.mutate({
                    bookingId: aftercareBooking.id,
                    rating: reviewRating,
                    comment: reviewComment.trim(),
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Your Overall Rating *
                  </label>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setReviewHoverRating(star)}
                        onMouseLeave={() => setReviewHoverRating(0)}
                        onClick={() => setReviewRating(star)}
                        className="p-1 text-slate-300 hover:scale-110 transition-transform focus:outline-hidden"
                      >
                        <Star
                          className={`h-7 w-7 ${
                            star <= (reviewHoverRating || reviewRating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 font-bold text-slate-700">
                      {reviewHoverRating || reviewRating} / 5 Stars
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-800">
                      Review Comments &amp; Treatment Experience
                    </label>
                    <span
                      className={`text-[11px] ${
                        reviewComment.length > 900 ? 'text-amber-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {reviewComment.length}/1000 characters
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    maxLength={1000}
                    placeholder="Describe your care experience, clinical facilities, doctor attentiveness, and recovery support (plain text only, max 1000 characters)..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Privacy Protection: Your full name, email, and user identity are never revealed. Reviews display as e.g. "John (United States)" with a Verified patient badge.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitReviewMutation.isLoading}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 shadow-sm transition-colors"
                  >
                    {submitReviewMutation.isLoading ? 'Publishing Review...' : 'Submit Verified Review'}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* Document Records & Upload Section */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <FileText className="h-5 w-5 text-teal-700" />
                <span>Medical Records &amp; Diagnostic Scans</span>
              </h2>
              <p className="text-xs text-slate-500">
                Encrypted storage &bull; Accessible strictly via short-lived signed links under explicit patient consent.
              </p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
              {caseItem.documents?.length || 0} File{caseItem.documents?.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Upload Success Alert */}
          {uploadSuccess && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Upload Error Alert */}
          {uploadError && (
            <div className="flex items-center space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Upload Form Box */}
          {caseItem.stage === 'CLOSED' ? (
            <div className="p-4 bg-slate-100/90 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="font-medium">This case is closed. New documents cannot be added.</span>
            </div>
          ) : (
            <form
              onSubmit={handleUploadSubmit}
              className="p-5 bg-teal-50/40 rounded-xl border border-teal-200/80 space-y-4"
            >
            <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center space-x-1.5">
              <UploadCloud className="h-4 w-4 text-teal-700" />
              <span>Upload New Medical Document</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* File Input */}
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700">Select File (PDF, JPG, PNG &le; 10MB) *</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-700 file:text-white hover:file:bg-teal-800 cursor-pointer"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full py-2 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="REPORT">Clinical Report</option>
                  <option value="SCAN">Imaging Scan (MRI / X-Ray / CT)</option>
                  <option value="PRESCRIPTION">Prescription / Medication</option>
                  <option value="IDENTITY">Patient Identity Document</option>
                  <option value="OTHER">Other Clinical Record</option>
                </select>
              </div>
            </div>

            {/* Optional immediate hospital consent */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Grant immediate access to a partner hospital (Optional)
              </label>
              <select
                value={selectedHospitalForUpload}
                onChange={(e) => setSelectedHospitalForUpload(e.target.value)}
                className="w-full py-2 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- Do not grant to a specific hospital yet --</option>
                {approvedHospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.city}, {h.country})
                  </option>
                ))}
              </select>
            </div>

            {/* Mandatory Consent Checkbox */}
            <div className="pt-1">
              <label className="flex items-start space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-700 focus:ring-teal-500 h-4 w-4"
                />
                <span className="leading-tight">
                  <strong className="text-slate-900">Mandatory Consent: </strong>
                  I explicitly consent to storing this medical record and permitting authorized healthcare providers to evaluate my treatment feasibility.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={uploadMutation.isLoading}
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 shadow-sm transition-colors disabled:opacity-50"
            >
              {uploadMutation.isLoading ? (
                <span>Uploading &amp; Encrypting...</span>
              ) : (
                <>
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Upload Record</span>
                </>
              )}
            </button>
          </form>
          )}

          {/* Documents Table */}
          {caseItem.documents?.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No medical files uploaded yet. Upload MRI scans, discharge summaries, or blood tests to proceed to qualification.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="pb-3">File Name</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3">Uploaded</th>
                    <th className="pb-3 text-right">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {caseItem.documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70">
                      <td className="py-3 font-semibold text-slate-900 max-w-[240px] truncate">
                        {doc.originalName}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {doc.category}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">
                        {doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(1)} KB` : '10 KB'}
                      </td>
                      <td className="py-3 text-slate-500">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleViewDocument(doc.id)}
                          className="inline-flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Link</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Privacy Panel & Consent Management */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-teal-700" />
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Medical Record Access &amp; Consent Controls
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                You retain complete sovereignty over your Protected Health Information. Only hospitals listed below with an active consent can view your files.
              </p>
            </div>
          </div>

          {/* Consent Notice */}
          {consentNotice && (
            <div className="flex items-center space-x-2 p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
              <span>{consentNotice}</span>
            </div>
          )}

          {/* Active Consents List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Hospitals with Authorized Record Access
            </h3>

            {caseItem.consents?.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-200">
                No hospitals currently have consent to view this case's medical records. You can grant access below.
              </p>
            ) : (
              <div className="space-y-2">
                {caseItem.consents.map((consent) => {
                  const isRevoked = Boolean(consent.revokedAt);

                  return (
                    <div
                      key={consent.id}
                      className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {consent.hospital?.name}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({consent.hospital?.city}, {consent.hospital?.country})
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                          <span>Granted: {new Date(consent.grantedAt).toLocaleDateString()}</span>
                          <span>&bull;</span>
                          <span>Scope: {consent.scope}</span>
                          {isRevoked && (
                            <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.2 rounded border border-rose-200">
                              Access Revoked on {new Date(consent.revokedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {!isRevoked ? (
                        <button
                          type="button"
                          disabled={revokeConsentMutation.isLoading}
                          onClick={() => revokeConsentMutation.mutate(consent.id)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors self-start sm:self-auto"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>Revoke Access</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No access</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grant New Consent Section */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Grant Access to Partner Hospital
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={hospitalToGrant}
                onChange={(e) => setHospitalToGrant(e.target.value)}
                className="flex-1 py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- Select an accredited partner hospital --</option>
                {approvedHospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.city}, {h.country})
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!hospitalToGrant || grantConsentMutation.isLoading}
                onClick={() => grantConsentMutation.mutate({ hospitalId: hospitalToGrant })}
                className="inline-flex items-center justify-center space-x-1 px-4 py-2 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Grant Consent</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
