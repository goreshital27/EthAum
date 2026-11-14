import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { formatCentsToUSD } from '../../utils/currency';
import AIDisclaimer from '../../components/AIDisclaimer';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Building2,
  Calendar,
  DollarSign,
  Award,
  PhoneCall,
  Star,
  Check,
  RefreshCw,
  ShieldCheck,
  HelpCircle,
  UserCheck,
  Layers,
  X,
} from 'lucide-react';

export default function QuoteComparison() {
  const { id: caseId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Selected hospitals for shortlist (Set of hospitalIds)
  const [selectedHospitalIds, setSelectedHospitalIds] = useState([]);
  const [callRequestedMap, setCallRequestedMap] = useState({});
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Booking Modal State
  const [bookingModalQuote, setBookingModalQuote] = useState(null);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [bookingError, setBookingError] = useState(null);

  // AI polling state
  const [aiJobId, setAiJobId] = useState(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);

  // 1. Fetch Case Details
  const { data: caseItem, isLoading: isCaseLoading } = useQuery({
    queryKey: ['caseDetail', caseId],
    queryFn: async () => {
      const res = await api.get(`/cases/${caseId}`);
      return res.data?.data;
    },
  });

  // 2. Fetch Received Quotes for Case
  const {
    data: quotesData,
    isLoading: isQuotesLoading,
    isError: isQuotesError,
    error: quotesFetchError,
    refetch: refetchQuotes,
  } = useQuery({
    queryKey: ['caseQuotes', caseId],
    queryFn: async () => {
      const res = await api.get(`/cases/${caseId}/quotes`);
      return res.data?.data || [];
    },
  });

  // 3. Fetch Existing Shortlist
  const { data: shortlistData, refetch: refetchShortlist } = useQuery({
    queryKey: ['caseShortlist', caseId],
    queryFn: async () => {
      const res = await api.get(`/cases/${caseId}/shortlist`);
      return res.data?.data || [];
    },
  });

  // 4. Fetch Existing AI summaries
  const { data: aiSummariesData } = useQuery({
    queryKey: ['caseAiSummaries', caseId],
    queryFn: async () => {
      const res = await api.get(`/ai/cases/${caseId}/summaries`);
      return res.data?.data;
    },
    staleTime: 60 * 1000,
  });

  // Synchronize shortlisted IDs on initial load
  useEffect(() => {
    if (shortlistData && shortlistData.length > 0) {
      setSelectedHospitalIds(shortlistData.map((item) => item.hospitalId));
    }
  }, [shortlistData]);

  // Synchronize existing AI quote comparison if available
  useEffect(() => {
    if (aiSummariesData?.quoteComparison?.outputJson && !aiResult) {
      setAiResult(aiSummariesData.quoteComparison.outputJson);
    }
  }, [aiSummariesData, aiResult]);

  // AI Job Polling Effect
  useEffect(() => {
    if (!aiJobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/ai/cases/${caseId}/quote-comparison/${aiJobId}`);
        const job = res.data?.data;
        if (job?.status === 'COMPLETED') {
          setAiResult(job.outputJson);
          setIsGeneratingAi(false);
          setAiJobId(null);
          clearInterval(interval);
        } else if (job?.status === 'FAILED') {
          setAiError(job.errorMessage || 'AI comparison generation encountered an issue');
          setIsGeneratingAi(false);
          setAiJobId(null);
          clearInterval(interval);
        }
      } catch (err) {
        setAiError(err.response?.data?.message || 'Error checking AI job status');
        setIsGeneratingAi(false);
        setAiJobId(null);
        clearInterval(interval);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [aiJobId, caseId]);

  // Mutation: Save Shortlist
  const shortlistMutation = useMutation({
    mutationFn: async (hospitalIds) => {
      const res = await api.post(`/cases/${caseId}/shortlist`, { hospitalIds });
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['caseShortlist', caseId]);
      setActionMessage('Shortlist updated successfully! You can now request exploratory calls.');
      setActionError(null);
      setTimeout(() => setActionMessage(null), 6000);
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || 'Failed to update shortlist');
      setActionMessage(null);
    },
  });

  // Mutation: Request Exploratory Call
  const requestCallMutation = useMutation({
    mutationFn: async (hospitalId) => {
      const res = await api.post(`/cases/${caseId}/shortlist/${hospitalId}/request-call`);
      return { hospitalId, data: res.data };
    },
    onSuccess: ({ hospitalId, data }) => {
      setCallRequestedMap((prev) => ({ ...prev, [hospitalId]: true }));
      setActionMessage(data?.message || 'Exploratory call requested successfully!');
      setActionError(null);
      setTimeout(() => setActionMessage(null), 6000);
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || 'Failed to request exploratory call');
      setActionMessage(null);
    },
  });

  // Mutation: Trigger AI Quote Comparison
  const triggerAiMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/ai/cases/${caseId}/quote-comparison`);
      return res.data;
    },
    onSuccess: (resData) => {
      if (resData?.cached && resData?.data) {
        setAiResult(resData.data);
        setIsGeneratingAi(false);
      } else if (resData?.jobId) {
        setAiJobId(resData.jobId);
        setIsGeneratingAi(true);
      }
    },
    onError: (err) => {
      setIsGeneratingAi(false);
      setAiError(err.response?.data?.message || 'Failed to start AI quote comparison');
    },
  });

  // Mutation: Create Booking from Quotation
  const createBookingMutation = useMutation({
    mutationFn: async ({ quotationId, referralCode }) => {
      setBookingError(null);
      const res = await api.post('/bookings', {
        quotationId,
        referralCode: referralCode || undefined,
      });
      return res.data?.data;
    },
    onSuccess: (booking) => {
      setBookingModalQuote(null);
      navigate(`/patient/bookings/${booking.id}/pay`);
    },
    onError: (err) => {
      setBookingError(err.response?.data?.message || 'Failed to create booking');
    },
  });

  const quotes = quotesData || [];
  // Sort: Non-expired first, then lowest total cents
  const sortedQuotes = [...quotes].slice(0, 5);

  const toggleSelectHospital = (hospitalId) => {
    setSelectedHospitalIds((prev) => {
      if (prev.includes(hospitalId)) {
        return prev.filter((id) => id !== hospitalId);
      } else {
        if (prev.length >= 3) {
          setActionError('You can shortlist a maximum of 3 hospitals.');
          setTimeout(() => setActionError(null), 4000);
          return prev;
        }
        return [...prev, hospitalId];
      }
    });
  };

  const handleSaveShortlist = () => {
    if (selectedHospitalIds.length < 2 || selectedHospitalIds.length > 3) {
      setActionError('Please select 2 or 3 hospitals to finalize your shortlist.');
      return;
    }
    shortlistMutation.mutate(selectedHospitalIds);
  };

  const handleTriggerAI = () => {
    setAiError(null);
    setIsGeneratingAi(true);
    triggerAiMutation.mutate();
  };

  if (isCaseLoading || isQuotesLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link
              to={`/patient/cases/${caseId}`}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Case</span>
            </Link>
            <AIDisclaimer />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
          <div className="h-28 bg-slate-200 rounded-2xl animate-pulse"></div>
          <div className="h-96 bg-slate-200 rounded-2xl animate-pulse"></div>
        </main>
      </div>
    );
  }

  if (isQuotesError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Failed to Load Quotes</h1>
          <p className="text-xs text-slate-500">
            {quotesFetchError?.response?.data?.message || 'Could not retrieve quotation data.'}
          </p>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={() => refetchQuotes()}
              className="px-4 py-2 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800"
            >
              Retry
            </button>
            <Link
              to={`/patient/cases/${caseId}`}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
            >
              Return to Case
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isShortlistActive = shortlistData && shortlistData.length >= 2;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to={`/patient/cases/${caseId}`}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Case #{caseId.slice(0, 8)}</span>
          </Link>
          <AIDisclaimer />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* Banner Section */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">
                Side-by-Side Comparison
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Hospital Treatment Quotes
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Comparing formal itemized proposals for:{' '}
                <strong className="text-slate-800">
                  {caseItem?.treatment?.name || caseItem?.treatmentNeed}
                </strong>
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                {quotes.length} {quotes.length === 1 ? 'Quote Received' : 'Quotes Received'}
              </span>
            </div>
          </div>

          {/* Action Notifications */}
          {actionMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs font-medium text-emerald-800 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}

          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs font-medium text-rose-800 animate-fadeIn">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
        </section>

        {/* Empty State when no quotes exist */}
        {sortedQuotes.length === 0 ? (
          <section className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4 shadow-xs">
            <div className="h-12 w-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Clock className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">No Quotes Issued Yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Your inquiry has been submitted to partner hospitals. Their international medical teams
              are currently reviewing your case records to formulate itemized treatment plans and all-in costs.
            </p>
            <div className="pt-2">
              <Link
                to={`/patient/cases/${caseId}`}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Return to Case Overview</span>
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* Shortlist Progress Bar & Instructions */}
            <div className="bg-teal-900 text-white rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-200">
                    Step 7: Shortlist 2-3 Top Hospitals
                  </span>
                </div>
                <p className="text-xs text-teal-100 max-w-xl">
                  Select 2 to 3 preferred hospitals to shortlist. Shortlisting enables tele-coordination
                  exploratory video calls with hospital surgical directors before your booking deposit.
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-800 border border-teal-700">
                  {selectedHospitalIds.length} of 3 Selected
                </span>
                <button
                  type="button"
                  disabled={
                    selectedHospitalIds.length < 2 ||
                    selectedHospitalIds.length > 3 ||
                    shortlistMutation.isLoading
                  }
                  onClick={handleSaveShortlist}
                  className="px-4 py-2 bg-white text-teal-900 text-xs font-bold rounded-lg hover:bg-teal-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                >
                  {shortlistMutation.isLoading ? 'Saving...' : 'Confirm Shortlist'}
                </button>
              </div>
            </div>

            {/* Side-by-Side Horizontal Comparison Table */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Transparent Itemized Quote Comparison
                  </h2>
                  <p className="text-xs text-slate-500">
                    Side-by-side breakdown of all-in costs, physician assignments, and recovery stay.
                  </p>
                </div>
              </div>

              {/* Horizontal Scroll Table container - works at 393px */}
              <div className="overflow-x-auto w-full">
                <div className="inline-flex min-w-full divide-x divide-slate-200 bg-slate-50/50">
                  {sortedQuotes.map((quote) => {
                    const hospital = quote.hospital || {};
                    const isSelected = selectedHospitalIds.includes(hospital.id);
                    const isShortlisted = shortlistData?.some((s) => s.hospitalId === hospital.id);
                    const isCallRequested = callRequestedMap[hospital.id];
                    const doctor = quote.doctor;

                    return (
                      <div
                        key={quote.id}
                        className={`w-72 sm:w-80 md:w-96 shrink-0 flex flex-col justify-between p-5 sm:p-6 transition-colors ${
                          quote.isExpired
                            ? 'bg-slate-100/70 opacity-75'
                            : isSelected
                            ? 'bg-teal-50/30 ring-2 ring-inset ring-teal-600/30'
                            : 'bg-white'
                        }`}
                      >
                        <div className="space-y-5">
                          {/* Top Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 min-h-6">
                            {quote.isLowestAllIn && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <DollarSign className="h-3 w-3" />
                                <span>Lowest All-In</span>
                              </span>
                            )}
                            {quote.isShortestStay && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-teal-100 text-teal-800 border border-teal-300">
                                <Clock className="h-3 w-3" />
                                <span>Shortest Stay</span>
                              </span>
                            )}
                            {quote.isExpired && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                <span>Expired Quote</span>
                              </span>
                            )}
                            {isShortlisted && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <Check className="h-3 w-3 text-amber-700" />
                                <span>Shortlisted</span>
                              </span>
                            )}
                          </div>

                          {/* Hospital Header */}
                          <div className="space-y-1">
                            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                              {hospital.name || 'Accredited Hospital'}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {hospital.city}, {hospital.country}
                            </p>
                            <div className="flex items-center space-x-1 pt-1">
                              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                              <span className="text-xs font-bold text-slate-800">
                                {hospital.rating || 4.8}
                              </span>
                              <span className="text-2xs text-slate-400">/ 5.0</span>
                            </div>
                          </div>

                          {/* Accreditations */}
                          <div className="space-y-1">
                            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
                              Accreditations
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {hospital.accreditations?.length > 0 ? (
                                hospital.accreditations.map((acc, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-md text-2xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                                  >
                                    {acc}
                                  </span>
                                ))
                              ) : (
                                <span className="text-2xs text-slate-400">Accredited Partner</span>
                              )}
                            </div>
                          </div>

                          {/* Doctor Assignment */}
                          <div className="space-y-1 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
                              Assigned Specialist
                            </span>
                            {doctor ? (
                              <div>
                                <p className="text-xs font-bold text-slate-900">{doctor.name}</p>
                                <p className="text-2xs text-teal-700 font-medium">
                                  {doctor.specialty}
                                </p>
                                {doctor.yearsExperience && (
                                  <p className="text-2xs text-slate-400">
                                    {doctor.yearsExperience} yrs experience
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 italic">
                                Assigned upon formal intake
                              </p>
                            )}
                          </div>

                          {/* All-in Total Price */}
                          <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1">
                            <span className="text-2xs font-bold text-teal-800 uppercase tracking-wider block">
                              All-In Estimated Total
                            </span>
                            <div className="text-2xl font-black text-slate-900 tracking-tight">
                              {formatCentsToUSD(quote.totalCents)}
                            </div>
                            <div className="flex justify-between text-2xs text-slate-500 pt-1 border-t border-teal-200/60">
                              <span>Subtotal: {formatCentsToUSD(quote.subtotalCents)}</span>
                              <span>Taxes: {formatCentsToUSD(quote.taxCents || 0)}</span>
                            </div>
                          </div>

                          {/* Itemized Line Items Table */}
                          <div className="space-y-2">
                            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
                              Itemized Inclusions
                            </span>
                            <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                              {Array.isArray(quote.lineItems) && quote.lineItems.length > 0 ? (
                                quote.lineItems.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-slate-50 border border-slate-100"
                                  >
                                    <span className="text-slate-700 truncate pr-2 font-medium">
                                      {item.category || item.name || 'Treatment Fee'}
                                    </span>
                                    <span className="text-slate-900 font-bold shrink-0">
                                      {formatCentsToUSD(item.amountCents)}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-slate-400">Package pricing bundled</p>
                              )}
                            </div>
                          </div>

                          {/* Recovery Stay & Validity */}
                          <div className="grid grid-cols-2 gap-2 text-2xs pt-2 border-t border-slate-100">
                            <div>
                              <span className="text-slate-400 block font-medium">
                                Recovery Stay:
                              </span>
                              <span className="text-slate-800 font-bold">
                                {quote.estimatedStayDays || 5} days in-country
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Valid Until:</span>
                              <span
                                className={`font-bold ${
                                  quote.isExpired ? 'text-rose-600' : 'text-slate-800'
                                }`}
                              >
                                {quote.validUntil
                                  ? new Date(quote.validUntil).toLocaleDateString()
                                  : '30 days'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom: Selection & Call Actions */}
                        <div className="pt-6 space-y-2 border-t border-slate-100 mt-6">
                          {/* Shortlist Checkbox */}
                          <label
                            className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                              quote.isExpired
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                : isSelected
                                ? 'bg-teal-50 border-teal-300 text-teal-900'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={quote.isExpired}
                              checked={isSelected}
                              onChange={() => toggleSelectHospital(hospital.id)}
                              className="h-4 w-4 rounded-sm text-teal-600 focus:ring-teal-500 border-slate-300 disabled:opacity-50"
                            />
                            <span>{isSelected ? 'Shortlisted' : 'Add to Shortlist'}</span>
                          </label>

                          {/* Exploratory Call Button (Active if hospital is shortlisted) */}
                          {isShortlisted && (
                            <button
                              type="button"
                              disabled={isCallRequested || requestCallMutation.isLoading}
                              onClick={() => requestCallMutation.mutate(hospital.id)}
                              className={`w-full inline-flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                                isCallRequested
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                              }`}
                            >
                              <PhoneCall className="h-3.5 w-3.5" />
                              <span>
                                {isCallRequested ? 'Call Requested' : 'Request Exploratory Call'}
                              </span>
                            </button>
                          )}

                          {/* Book this hospital Button */}
                          {!quote.isExpired && (
                            <button
                              type="button"
                              onClick={() => {
                                setBookingModalQuote(quote);
                                setBookingError(null);
                              }}
                              className="w-full inline-flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-2xs"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Book this hospital</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* AI Quote Comparison Analysis Section */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      AI Coordination Summary
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Objective Differences & Questions to Ask
                  </h3>
                  <p className="text-xs text-slate-500">
                    Neutral comparison of package inclusions and key questions for hospital coordinators.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <AIDisclaimer />
                  <button
                    type="button"
                    disabled={isGeneratingAi || quotes.length === 0}
                    onClick={handleTriggerAI}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    {isGeneratingAi ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Analyzing Quotes...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        <span>{aiResult ? 'Regenerate Analysis' : 'Generate AI Summary'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {aiError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {isGeneratingAi && !aiResult && (
                <div className="py-10 text-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto" />
                  <p className="text-xs font-medium text-slate-600">
                    AI is reviewing itemized quotes, line items, and stay durations...
                  </p>
                  <p className="text-2xs text-slate-400">
                    Comparing neutral logistical differences and drafting questions.
                  </p>
                </div>
              )}

              {aiResult ? (
                <div className="space-y-6">
                  {/* Factual Inclusions Differences */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Key Objective Differences
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiResult.differences?.map((diff, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed flex items-start space-x-2.5"
                        >
                          <span className="h-5 w-5 rounded-full bg-teal-100 text-teal-800 font-bold text-2xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{diff}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Questions Per Hospital */}
                  {aiResult.questionsPerHospital?.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Recommended Questions for Hospital Coordinators
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {aiResult.questionsPerHospital.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2"
                          >
                            <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                              <Building2 className="h-3.5 w-3.5 text-teal-700" />
                              <span>{item.hospitalName}</span>
                            </div>
                            <ul className="space-y-1.5 text-xs text-slate-600">
                              {item.questions?.map((q, qIdx) => (
                                <li key={qIdx} className="flex items-start space-x-2">
                                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                  <span>{q}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mandatory AI Medical Disclaimer Box */}
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center space-x-2.5 text-2xs font-medium text-amber-900">
                    <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Notice:</strong> {aiResult.disclaimer || 'AI-assisted coordination, not medical advice'}.
                      Cost comparisons and questions are administrative aids to assist your decision making.
                    </span>
                  </div>
                </div>
              ) : (
                !isGeneratingAi && (
                  <div className="py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                    <p className="text-xs text-slate-500">
                      Click &ldquo;Generate AI Summary&rdquo; to analyze pricing variances, stay timelines,
                      and receive recommended questions to ask each hospital coordinator.
                    </p>
                  </div>
                )
              )}
            </section>
          </>
        )}

        {/* Final Selection Booking Confirm Dialog */}
        {bookingModalQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <span className="text-2xs font-bold text-teal-700 uppercase tracking-wider block">
                    Final Selection &bull; Booking Confirmation
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Book {bookingModalQuote.hospital?.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingModalQuote(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {bookingError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-2xs text-rose-800 flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Financial Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">All-in Quotation Total:</span>
                  <span className="font-bold text-slate-900">
                    {formatCentsToUSD(bookingModalQuote.totalCents)}
                  </span>
                </div>
                <div className="flex justify-between text-teal-800 font-extrabold text-sm pt-2 border-t border-slate-200">
                  <span>20% Escrow Deposit Required:</span>
                  <span>
                    {formatCentsToUSD(Math.round(bookingModalQuote.totalCents * 0.2))}
                  </span>
                </div>
                <div className="flex justify-between text-2xs text-slate-500 pt-1">
                  <span>Remaining 80% (upon hospital admission):</span>
                  <span>
                    {formatCentsToUSD(
                      bookingModalQuote.totalCents -
                        Math.round(bookingModalQuote.totalCents * 0.2)
                    )}
                  </span>
                </div>
              </div>

              {/* Optional Referral Code */}
              <div className="space-y-1">
                <label className="text-2xs font-bold text-slate-600 uppercase tracking-wider block">
                  Affiliate Referral Code (Optional)
                </label>
                <input
                  type="text"
                  value={referralCodeInput}
                  onChange={(e) => setReferralCodeInput(e.target.value)}
                  placeholder="e.g. REF-MARCUS-500"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-3xs text-slate-400">
                  If referred by another patient, enter their code to qualify their 5% referral commission.
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingModalQuote(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={createBookingMutation.isLoading}
                  onClick={() =>
                    createBookingMutation.mutate({
                      quotationId: bookingModalQuote.id,
                      referralCode: referralCodeInput.trim() || undefined,
                    })
                  }
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {createBookingMutation.isLoading ? 'Reserving...' : 'Proceed to Escrow Deposit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
