import React, { useState } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getFullFileUrl } from '../../api/axios';
import { formatCentsToUSD } from '../../utils/currency';
import ChatPanel from '../../components/ChatPanel';
import {
  ArrowLeft,
  Inbox,
  FileText,
  ShieldCheck,
  Lock,
  Eye,
  Plus,
  Trash2,
  Calendar,
  CalendarCheck,
  Clock,
  Building2,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Send,
  Save,
  DollarSign,
  HelpCircle,
  Sparkles,
  Video,
  ExternalLink,
  MessageSquare,
  X,
  HeartHandshake,
  CheckSquare,
  Square,
  Star,
} from 'lucide-react';

export default function HospitalLeadDetail() {
  const { enquiryId } = useParams();
  const queryClient = useQueryClient();
  const { isPending } = useOutletContext() || {};

  // 1. Fetch Enquiry & Case Details
  const {
    data: leadData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['leadCaseDetail', enquiryId],
    queryFn: async () => {
      const res = await api.get(`/hospital/leads/${enquiryId}`);
      return res.data?.data;
    },
    enabled: Boolean(enquiryId) && !isPending,
  });

  // 2. Fetch Hospital Profile for Doctor list
  const { data: profileData } = useQuery({
    queryKey: ['hospitalProfile'],
    queryFn: async () => {
      const res = await api.get('/hospital/profile');
      return res.data?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const doctors = profileData?.doctors || [];

  // 2b. Fetch appointments for this case
  const { data: caseAppointments = [], refetch: refetchAppts } = useQuery({
    queryKey: ['leadCaseAppointments', leadData?.caseId],
    queryFn: async () => {
      const res = await api.get(`/appointments?caseId=${leadData.caseId}`);
      return res.data?.data || [];
    },
    enabled: Boolean(leadData?.caseId),
  });

  // Appointment Proposal State
  const [showApptModal, setShowApptModal] = useState(false);
  const [apptType, setApptType] = useState('EXPLORATORY');
  const [apptSlot1, setApptSlot1] = useState('');
  const [apptSlot2, setApptSlot2] = useState('');
  const [apptSlot3, setApptSlot3] = useState('');
  const [apptDoctorId, setApptDoctorId] = useState('');
  const [apptError, setApptError] = useState('');
  const [apptSuccess, setApptSuccess] = useState('');

  const proposeApptMutation = useMutation({
    mutationFn: async (payload) => {
      setApptError('');
      const res = await api.post('/appointments/propose', payload);
      return res.data;
    },
    onSuccess: () => {
      refetchAppts();
      setShowApptModal(false);
      setApptSlot1('');
      setApptSlot2('');
      setApptSlot3('');
      setApptSuccess('Consultation time slots successfully proposed to the patient.');
      setTimeout(() => setApptSuccess(''), 5000);
    },
    onError: (err) => {
      setApptError(err.response?.data?.message || err.message || 'Failed to propose appointment');
    },
  });

  const handleProposeApptSubmit = (e) => {
    e.preventDefault();
    setApptError('');
    const rawSlots = [apptSlot1, apptSlot2, apptSlot3].filter(Boolean);
    if (rawSlots.length === 0) {
      setApptError('Please provide at least 1 proposed time slot.');
      return;
    }
    const isoSlots = rawSlots.map((s) => new Date(s).toISOString());
    const now = new Date();
    if (isoSlots.some((s) => new Date(s) <= now)) {
      setApptError('All appointment slots must be scheduled in the future.');
      return;
    }

    proposeApptMutation.mutate({
      caseId: leadData.caseId,
      doctorId: apptDoctorId || null,
      type: apptType,
      slots: isoSlots,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    });
  };

  // Aftercare & Treatment Completion State & Queries
  const [completeTreatmentError, setCompleteTreatmentError] = useState('');
  const [completeTreatmentSuccess, setCompleteTreatmentSuccess] = useState('');

  const {
    data: aftercareData,
    isLoading: isAftercareLoading,
  } = useQuery({
    queryKey: ['leadAftercare', leadData?.caseId],
    queryFn: async () => {
      const res = await api.get(`/aftercare/cases/${leadData.caseId}/tasks`);
      return res.data?.data;
    },
    enabled: Boolean(leadData?.caseId),
  });

  const aftercareTasks = aftercareData?.tasks || [];
  const aftercareBooking = aftercareData?.booking;

  const completeTreatmentMutation = useMutation({
    mutationFn: async () => {
      setCompleteTreatmentError('');
      const res = await api.post(`/aftercare/cases/${leadData.caseId}/complete-treatment`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leadCaseDetail', enquiryId]);
      queryClient.invalidateQueries(['leadAftercare', leadData?.caseId]);
      setCompleteTreatmentSuccess('Treatment marked complete! Case transitioned to AFTERCARE with standard coordination tasks.');
      setTimeout(() => setCompleteTreatmentSuccess(''), 6000);
    },
    onError: (err) => {
      setCompleteTreatmentError(err.response?.data?.message || 'Failed to mark treatment complete');
    },
  });

  // Review & Reply State & Queries
  const {
    data: reviewData,
  } = useQuery({
    queryKey: ['leadReview', aftercareBooking?.id],
    queryFn: async () => {
      if (!aftercareBooking?.id) return null;
      const res = await api.get(`/reviews/booking/${aftercareBooking.id}`);
      return res.data?.data;
    },
    enabled: Boolean(aftercareBooking?.id),
  });

  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replySuccess, setReplySuccess] = useState('');

  const replyMutation = useMutation({
    mutationFn: async ({ reviewId, hospitalReply }) => {
      setReplyError('');
      const res = await api.post(`/reviews/${reviewId}/reply`, { hospitalReply });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leadReview', aftercareBooking?.id]);
      setReplyText('');
      setReplySuccess('Your official public response has been published.');
      setTimeout(() => setReplySuccess(''), 5000);
    },
    onError: (err) => {
      setReplyError(err.response?.data?.message || 'Failed to submit response');
    },
  });

  // Quote Builder State
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [estimatedStayDays, setEstimatedStayDays] = useState(5);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [inclusions, setInclusions] = useState(
    'Hospital admission & private room, surgeon & anesthesia fees, routine pre-op labs, airport transfers'
  );
  const [exclusions, setExclusions] = useState(
    'International roundtrip flights, companion meals, medications after discharge, extended ICU stay'
  );
  const [cancellationTerms, setCancellationTerms] = useState(
    'Full deposit refund if cancelled at least 7 days prior to scheduled admission.'
  );
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Line items: amount entered in DOLLARS in the UI
  const [lineItems, setLineItems] = useState([
    {
      description: 'Primary Surgical Procedure & Operating Room Fees',
      category: 'PROCEDURE',
      amountDollars: 4500,
    },
    {
      description: 'Private Inpatient Room & Nursing (3 Nights)',
      category: 'ACCOMMODATION',
      amountDollars: 750,
    },
    {
      description: 'Airport & Local Ground Transfers',
      category: 'TRANSPORT',
      amountDollars: 150,
    },
  ]);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [viewingDocId, setViewingDocId] = useState(null);

  // Helper to add line item
  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: '',
        category: 'PROCEDURE',
        amountDollars: 0,
      },
    ]);
  };

  // Helper to remove line item
  const handleRemoveLineItem = (index) => {
    if (lineItems.length <= 1) {
      setFormError('At least one line item is required.');
      return;
    }
    const updated = [...lineItems];
    updated.splice(index, 1);
    setLineItems(updated);
  };

  // Helper to update line item
  const handleUpdateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    setLineItems(updated);
  };

  // Live client estimated subtotal in Dollars
  const estimatedSubtotalDollars = lineItems.reduce((acc, item) => {
    const amt = parseFloat(item.amountDollars) || 0;
    return acc + (amt > 0 ? amt : 0);
  }, 0);

  // 3. Create Quotation Mutation (DRAFT or SENT)
  const createQuoteMutation = useMutation({
    mutationFn: async ({ status }) => {
      setFormError('');
      setFormSuccess('');

      // Validation
      if (lineItems.length === 0) {
        throw new Error('At least one line item is required');
      }

      for (const item of lineItems) {
        if (!item.description || !item.description.trim()) {
          throw new Error('All line items must have a description');
        }
        if (item.amountDollars === undefined || item.amountDollars === '' || Number(item.amountDollars) < 0) {
          throw new Error('All line item amounts must be valid non-negative numbers');
        }
      }

      // Convert line items amount from DOLLARS to integer CENTS
      const formattedLineItems = lineItems.map((item) => ({
        description: item.description.trim(),
        category: item.category || 'PROCEDURE',
        amountCents: Math.round(parseFloat(item.amountDollars) * 100),
      }));

      // Combined notes
      const structuredNotes = [
        additionalNotes.trim(),
        `Estimated Stay: ${estimatedStayDays} days`,
        `Inclusions: ${inclusions.trim()}`,
        `Exclusions: ${exclusions.trim()}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const payload = {
        doctorId: selectedDoctorId || null,
        lineItems: formattedLineItems,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        cancellationTerms: cancellationTerms.trim() || null,
        notes: structuredNotes,
        currency: 'USD',
        status, // 'DRAFT' or 'SENT'
      };

      const res = await api.post(`/hospital/enquiries/${enquiryId}/quotes`, payload);
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['leadCaseDetail', enquiryId]);
      queryClient.invalidateQueries(['hospitalLeads']);
      queryClient.invalidateQueries(['hospitalQuotesCount']);
      const totalFormatted = formatCentsToUSD(data.data?.totalCents || 0);
      setFormSuccess(
        variables.status === 'SENT'
          ? `Quotation officially sent to patient! Server-computed Total: ${totalFormatted}. Case stage advanced.`
          : `Quotation draft saved! Server-computed Total: ${totalFormatted}.`
      );
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || err.message || 'Failed to submit quotation');
    },
  });

  // 4. Send Existing Draft Quote Mutation
  const sendExistingQuoteMutation = useMutation({
    mutationFn: async (quoteId) => {
      const res = await api.post(`/hospital/quotes/${quoteId}/send`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leadCaseDetail', enquiryId]);
      queryClient.invalidateQueries(['hospitalLeads']);
      queryClient.invalidateQueries(['hospitalQuotesCount']);
      setFormSuccess('Draft quotation has been successfully sent to the patient!');
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || err.message || 'Failed to send quotation');
    },
  });

  // 5. Secure Document Access View
  const handleViewDocument = async (docId) => {
    try {
      setViewingDocId(docId);
      const res = await api.get(`/documents/${docId}/access`);
      const accessUrl = res.data?.data?.accessUrl;
      if (accessUrl) {
        const fullUrl = getFullFileUrl(accessUrl);
        window.open(fullUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Access denied: Unable to access medical file.');
    } finally {
      setViewingDocId(null);
    }
  };

  if (isPending) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-3">
        <AlertTriangle className="h-10 w-10 text-amber-600 mx-auto" />
        <h2 className="text-base font-bold text-amber-900">Your hospital is awaiting admin approval</h2>
        <p className="text-xs text-amber-800 max-w-md mx-auto">
          Case review and quote creation are disabled until administrative accreditation verification is complete.
        </p>
        <Link
          to="/hospital/leads"
          className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-700 underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Leads</span>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-2 text-xs text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2" />
        <p>Loading case and medical inquiry details...</p>
      </div>
    );
  }

  if (isError || !leadData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Inquiry not found or access restricted</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          {error?.response?.data?.message || 'Unable to retrieve this patient enquiry.'}
        </p>
        <Link
          to="/hospital/leads"
          className="inline-flex items-center space-x-1 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Leads</span>
        </Link>
      </div>
    );
  }

  const { case: medicalCase, documents = [], hasConsent, recordsNotice, quotations = [] } = leadData;
  const isQuoteSent = leadData.status === 'RESPONDED';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/hospital/leads"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Leads Inbox</span>
        </Link>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">Enquiry Status:</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {leadData.status}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            Stage: {medicalCase.stage}
          </span>
        </div>
      </div>

      {/* Case Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900">
                {medicalCase.treatment?.name || medicalCase.treatmentNeed || 'General Medical Inquiry'}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-indigo-50 text-indigo-700">
                {medicalCase.treatment?.specialty || 'General'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Case Ref: <code className="font-mono text-slate-700">{medicalCase.id.slice(0, 8)}</code> &bull;
              Inquiry submitted on {new Date(leadData.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Patient Stated Budget
            </span>
            <span className="text-lg font-bold text-slate-900">
              {medicalCase.budgetCents ? formatCentsToUSD(medicalCase.budgetCents) : 'Flexible / Unspecified'}
            </span>
          </div>
        </div>

        {/* Patient Details & Privacy Disclosure */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
              Patient Origin
            </span>
            <p className="text-sm font-bold text-slate-800 mt-1">{medicalCase.patientCountry}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">International Traveling Patient</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
              Target Travel Window
            </span>
            <p className="text-sm font-bold text-slate-800 mt-1">
              {medicalCase.travelDateFrom
                ? `${new Date(medicalCase.travelDateFrom).toLocaleDateString()} – ${
                    medicalCase.travelDateTo
                      ? new Date(medicalCase.travelDateTo).toLocaleDateString()
                      : 'Open'
                  }`
                : 'Flexible Timeline'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Estimated coordination timeline</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
              Patient Identity
            </span>
            {isQuoteSent ? (
              <div className="mt-1 space-y-0.5">
                <p className="text-sm font-bold text-emerald-700 flex items-center space-x-1">
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>{medicalCase.patient?.name}</span>
                </p>
                <p className="text-slate-600 truncate">{medicalCase.patient?.email}</p>
              </div>
            ) : (
              <div className="mt-1 space-y-0.5">
                <p className="text-sm font-bold text-slate-600 flex items-center space-x-1">
                  <Lock className="h-3 w-3 text-slate-400" />
                  <span>Confidential Patient</span>
                </p>
                <p className="text-[10px] text-slate-400 italic">
                  Contact details unlock upon sending quote
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Patient Notes */}
        {leadData.notes && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 block mb-1">Inquiry / Intake Notes:</span>
            <p className="text-slate-600 whitespace-pre-wrap">{leadData.notes}</p>
          </div>
        )}
      </div>

      {/* Medical Records & Consent Section (Requirement 5) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <span>Patient Medical Records &amp; Clinical Scans</span>
            </h2>
            <p className="text-xs text-slate-500">
              Only accessible under sovereign patient consent. Every document view generates an audited access log.
            </p>
          </div>

          {hasConsent ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
              <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              Active Patient Consent
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 self-start sm:self-auto">
              <Lock className="h-3 w-3 mr-1 text-slate-500" />
              No Active Consent
            </span>
          )}
        </div>

        {/* Consent Condition Rendering */}
        {!hasConsent ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
            <Lock className="h-8 w-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Patient has not shared records</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {recordsNotice ||
                'The patient has not granted your facility record review consent yet. You may issue an exploratory or estimated quote based on the treatment intake.'}
            </p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <FileText className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">No documents uploaded</p>
            <p className="text-[11px] text-slate-400">The patient has not uploaded files for this case yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50">
                  <th className="py-2.5 px-3 font-semibold">Document</th>
                  <th className="py-2.5 px-3 font-semibold">Category</th>
                  <th className="py-2.5 px-3 font-semibold">File Size</th>
                  <th className="py-2.5 px-3 font-semibold">Uploaded</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Access Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span className="truncate max-w-xs">{doc.originalName}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {doc.sizeBytes ? `${Math.round(doc.sizeBytes / 1024)} KB` : '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        disabled={viewingDocId === doc.id}
                        onClick={() => handleViewDocument(doc.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{viewingDocId === doc.id ? 'Loading...' : 'View Record'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Existing Issued Quotes for this Enquiry */}
      {quotations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Issued Quotations for this Inquiry</h2>
          <div className="space-y-3">
            {quotations.map((q) => {
              const isDraft = q.status === 'DRAFT';
              const statusColors = {
                DRAFT: 'bg-amber-50 text-amber-800 border-amber-200',
                SENT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                ACCEPTED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
              };

              return (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">
                        Total: {formatCentsToUSD(q.totalCents)} {q.currency}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                          statusColors[q.status] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {q.status}
                      </span>
                      {q.doctor?.name && (
                        <span className="text-slate-500 font-medium">
                          &bull; Assigned Specialist: {q.doctor.name}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Created: {new Date(q.createdAt).toLocaleDateString()}
                      {q.validUntil && ` &bull; Valid Until: ${new Date(q.validUntil).toLocaleDateString()}`}
                    </p>
                  </div>

                  {isDraft && (
                    <button
                      type="button"
                      disabled={sendExistingQuoteMutation.isLoading}
                      onClick={() => sendExistingQuoteMutation.mutate(q.id)}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 self-start sm:self-auto shadow-sm transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{sendExistingQuoteMutation.isLoading ? 'Sending...' : 'Send Draft to Patient'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quote Builder Form (Requirement 6) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-indigo-600" />
            <span>Standardized Itemized Treatment Quote Builder</span>
          </h2>
          <p className="text-xs text-slate-500">
            Provide transparent pricing covering surgical procedures, hospital stay, transfers, and post-op care.
          </p>
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        {/* Doctor and Validity Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Assigned Specialist Doctor
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- No doctor assigned / Facility Team --</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.specialty})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Specialist managed directly by your hospital
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Estimated Inpatient Stay (Days)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={estimatedStayDays}
              onChange={(e) => setEstimatedStayDays(parseInt(e.target.value, 10) || 1)}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Anticipated hospital recovery duration
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quote Validity Date
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Default: 30 days price guarantee
            </span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Itemized Line Items (USD)
            </label>
            <button
              type="button"
              onClick={handleAddLineItem}
              className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Line Item</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {lineItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-xs"
              >
                {/* Category Selector */}
                <select
                  value={item.category}
                  onChange={(e) => handleUpdateLineItem(idx, 'category', e.target.value)}
                  className="sm:w-44 py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                >
                  <option value="PROCEDURE">Procedure / Surgery</option>
                  <option value="ACCOMMODATION">Accommodation</option>
                  <option value="TRANSPORT">Transfers / Logistics</option>
                  <option value="AFTERCARE">Aftercare / Recovery</option>
                  <option value="OTHER">Other Clinical Fee</option>
                </select>

                {/* Description */}
                <input
                  type="text"
                  placeholder="Line item description (e.g. Unilateral Knee Replacement with Stryker implant)"
                  value={item.description}
                  onChange={(e) => handleUpdateLineItem(idx, 'description', e.target.value)}
                  className="flex-1 py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />

                {/* Amount in Dollars */}
                <div className="flex items-center space-x-1.5 sm:w-36">
                  <span className="text-xs font-bold text-slate-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={item.amountDollars}
                    onChange={(e) => handleUpdateLineItem(idx, 'amountDollars', e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 text-right focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-slate-400">USD</span>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveLineItem(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors self-end sm:self-center"
                  title="Remove this line item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Subtotal & Server Note Banner */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-indigo-900 block">
                Estimated Line Items Subtotal:
              </span>
              <p className="text-[11px] text-indigo-700">
                Server authoritatively computes and verifies the exact total upon saving.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-indigo-950">
                ${estimatedSubtotalDollars.toLocaleString('en-US')} USD
              </span>
            </div>
          </div>
        </div>

        {/* Inclusions and Exclusions Textareas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Package Inclusions
            </label>
            <textarea
              rows={3}
              value={inclusions}
              onChange={(e) => setInclusions(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
              placeholder="What is covered in this quote (e.g. 3 hospital nights, medications, surgeon fees)..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Package Exclusions
            </label>
            <textarea
              rows={3}
              value={exclusions}
              onChange={(e) => setExclusions(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
              placeholder="What is not covered (e.g. international airfare, hotel stay, companion costs)..."
            />
          </div>
        </div>

        {/* Cancellation Terms & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Cancellation &amp; Refund Terms
            </label>
            <textarea
              rows={2}
              value={cancellationTerms}
              onChange={(e) => setCancellationTerms(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
              placeholder="Refund policy and cancellation deadlines..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Additional Clinical Notes for Patient (Optional)
            </label>
            <textarea
              rows={2}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
              placeholder="Special instructions or clinical prerequisites..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            disabled={createQuoteMutation.isLoading}
            onClick={() => createQuoteMutation.mutate({ status: 'DRAFT' })}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{createQuoteMutation.isLoading ? 'Saving...' : 'Save as Draft'}</span>
          </button>

          <button
            type="button"
            disabled={createQuoteMutation.isLoading}
            onClick={() => createQuoteMutation.mutate({ status: 'SENT' })}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>
              {createQuoteMutation.isLoading
                ? 'Processing Quotation...'
                : 'Send Official Quote to Patient'}
            </span>
          </button>
        </div>
      </div>

      {/* Video Consultations Section (Requirement 1 & 2) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <CalendarCheck className="h-5 w-5 text-indigo-600" />
              <span>Tele-Consultations &amp; Video Coordination</span>
            </h2>
            <p className="text-xs text-slate-500">
              Propose exploratory calls or formal pre-travel medical reviews with secure Jitsi video links.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowApptModal(true);
              setApptError('');
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Propose Appointment</span>
          </button>
        </div>

        {apptSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{apptSuccess}</span>
          </div>
        )}

        {caseAppointments.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
            <Video className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No consultations scheduled for this case</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Propose 1 to 3 time slots for an exploratory call to discuss clinical prerequisites and travel timing with the patient.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {caseAppointments.map((appt) => {
              const isConfirmed = appt.status === 'CONFIRMED';
              const isRequested = appt.status === 'REQUESTED';

              const statusBadge = {
                REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200',
                CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
                CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
              }[appt.status] || 'bg-slate-100 text-slate-600';

              return (
                <div
                  key={appt.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span className="font-bold text-slate-900 text-sm">
                        {new Date(appt.scheduledAt).toLocaleDateString([], {
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {appt.type}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}
                      >
                        {appt.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {appt.doctor?.name ? `Specialist: ${appt.doctor.name}` : 'Facility Medical Team'}
                    </p>
                  </div>

                  {isConfirmed && appt.videoLink ? (
                    <a
                      href={appt.videoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors self-start sm:self-auto"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>Join Call</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : isRequested ? (
                    <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 self-start sm:self-auto">
                      Awaiting Patient Slot Selection
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Treatment Completion & Aftercare Management Section (Requirement Part A & B) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <HeartHandshake className="h-5 w-5 text-indigo-600" />
              <span>Treatment Completion &amp; Aftercare Oversight</span>
            </h2>
            <p className="text-xs text-slate-500">
              Mark procedure complete upon patient discharge to initiate post-procedure coordination tasks and verified feedback.
            </p>
          </div>

          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full self-start sm:self-auto">
            Stage: {leadData.case?.stage}
          </span>
        </div>

        {completeTreatmentSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{completeTreatmentSuccess}</span>
          </div>
        )}
        {completeTreatmentError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{completeTreatmentError}</span>
          </div>
        )}

        {/* Mark Treatment Complete Action */}
        {(leadData.case?.stage === 'BOOKED' || leadData.case?.stage === 'TREATMENT') && (
          <div className="p-5 rounded-xl bg-indigo-50/60 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <h3 className="font-bold text-indigo-950 text-sm">
                Has patient's medical procedure concluded?
              </h3>
              <p className="text-indigo-800 leading-relaxed max-w-xl">
                Marking treatment complete sequentially advances the journey through <strong>TREATMENT &rarr; AFTERCARE</strong> via system pipeline enforcement, marks booking as <strong>COMPLETED</strong>, and generates post-treatment recovery milestones.
              </p>
            </div>

            <button
              type="button"
              disabled={completeTreatmentMutation.isLoading}
              onClick={() => completeTreatmentMutation.mutate()}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              {completeTreatmentMutation.isLoading
                ? 'Processing...'
                : 'Mark Treatment Complete'}
            </button>
          </div>
        )}

        {/* Aftercare Task Monitoring */}
        {aftercareTasks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Post-Procedure Milestones ({aftercareData?.completedCount || 0} of {aftercareData?.totalCount || 4} Completed)
              </h3>
              {aftercareData?.allCompleted && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  All Milestones Finished &bull; Case Closed
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
              {aftercareTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    task.completedAt ? 'bg-emerald-50/30' : 'bg-white'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold ${task.completedAt ? 'text-slate-700 line-through' : 'text-slate-900'}`}>
                        {task.title}
                      </span>
                      {task.dueDate && (
                        <span className="text-[11px] text-slate-400">
                          (Target: {new Date(task.dueDate).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px]">{task.description}</p>
                  </div>

                  <div className="self-end sm:self-center shrink-0">
                    {task.completedAt ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Completed on {new Date(task.completedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Pending Patient Check-off
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patient Review & Hospital Reply */}
        {reviewData && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span>Verified Patient Review</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Submitted {new Date(reviewData.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center space-x-1">
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
                <span className="ml-1.5 font-bold text-slate-900">{reviewData.rating} / 5 Stars</span>
                <span className="ml-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Verified patient
                </span>
              </div>

              {reviewData.comment && (
                <p className="text-slate-700 italic">"{reviewData.comment}"</p>
              )}

              {/* Hospital Reply Display or Form */}
              {reviewData.hospitalReply ? (
                <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-900">
                    Your Official Public Response:
                  </span>
                  <p className="text-slate-600 text-xs italic">{reviewData.hospitalReply}</p>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Post an Official Public Reply to this Review
                  </label>
                  {replySuccess && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px]">
                      {replySuccess}
                    </div>
                  )}
                  {replyError && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                      {replyError}
                    </div>
                  )}
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    maxLength={1000}
                    placeholder="Thank the patient and address their feedback (plain text only, max 1000 characters)..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{replyText.length}/1000 chars</span>
                    <button
                      type="button"
                      disabled={!replyText.trim() || replyMutation.isLoading}
                      onClick={() =>
                        replyMutation.mutate({
                          reviewId: reviewData.id,
                          hospitalReply: replyText.trim(),
                        })
                      }
                      className="px-4 py-1.5 rounded-lg font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-2xs"
                    >
                      {replyMutation.isLoading ? 'Posting...' : 'Post Public Reply'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Direct Coordination Chat Thread (Requirement 3) */}
      <ChatPanel
        caseId={leadData.caseId}
        hospitalId={profileData?.id}
        hospitalName={profileData?.name}
      />

      {/* Propose Appointment Modal */}
      {showApptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <CalendarCheck className="h-5 w-5 text-indigo-600" />
                <span>Propose Tele-Consultation</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowApptModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {apptError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{apptError}</span>
              </div>
            )}

            <form onSubmit={handleProposeApptSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Consultation Type
                </label>
                <select
                  value={apptType}
                  onChange={(e) => setApptType(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="EXPLORATORY">EXPLORATORY (Preliminary Case Review &amp; Intake)</option>
                  <option value="FORMAL">FORMAL (Pre-admission Clinical Review - Requires Booking)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  EXPLORATORY calls move case to CONSULTATION upon patient acceptance.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assigned Specialist Doctor (Optional)
                </label>
                <select
                  value={apptDoctorId}
                  onChange={(e) => setApptDoctorId(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Facility Medical Coordination Team --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">
                  Proposed Time Slots (1 to 3 slots in the future) *
                </label>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">Slot 1 (Primary):</span>
                  <input
                    type="datetime-local"
                    value={apptSlot1}
                    onChange={(e) => setApptSlot1(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">Slot 2 (Alternative - Optional):</span>
                  <input
                    type="datetime-local"
                    value={apptSlot2}
                    onChange={(e) => setApptSlot2(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">Slot 3 (Alternative - Optional):</span>
                  <input
                    type="datetime-local"
                    value={apptSlot3}
                    onChange={(e) => setApptSlot3(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-900">
                A secure end-to-end encrypted Jitsi video conference link will be automatically generated.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApptModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={proposeApptMutation.isLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                >
                  {proposeApptMutation.isLoading ? 'Proposing...' : 'Propose Slots'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
