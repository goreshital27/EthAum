import React, { useState } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getFullFileUrl } from '../../api/axios';
import { formatCentsToUSD } from '../../utils/currency';
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
            <span>Save as Draft</span>
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
    </div>
  );
}
