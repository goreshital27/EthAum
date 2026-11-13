import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { formatCentsToUSD } from '../../utils/currency';
import AIDisclaimer from '../../components/AIDisclaimer';
import {
  HeartPulse,
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  DollarSign,
  Calendar,
  FileText,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Treatment', desc: 'Choose procedure' },
  { id: 2, title: 'Destination & Budget', desc: 'Location & costs' },
  { id: 3, title: 'Condition Details', desc: 'Medical description' },
  { id: 4, title: 'Review & Submit', desc: 'Confirm inquiry' },
];

export default function NewCase() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    treatment: '',
    destination: '',
    budgetCents: 500000, // $5,000 USD default in cents
    preferredTimeline: 'Within 1-3 months',
    description: '',
    travelPartySize: 1,
    hasInsurance: false,
  });

  const [validationError, setValidationError] = useState('');

  // Fetch treatments for dropdown
  const { data: treatmentsData } = useQuery({
    queryKey: ['treatmentsCaseForm'],
    queryFn: async () => {
      const res = await api.get('/treatments');
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const treatments = treatmentsData || [];

  // Fetch destinations for dropdown
  const { data: destinationsData } = useQuery({
    queryKey: ['destinationsCaseForm'],
    queryFn: async () => {
      const res = await api.get('/destinations');
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const destinations = destinationsData || [];

  // Mutation to create case
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/cases', payload);
      return res.data?.data;
    },
    onSuccess: (newCase) => {
      queryClient.invalidateQueries(['patientCases']);
      navigate(`/patient/cases/${newCase.id}`);
    },
    onError: (err) => {
      setValidationError(err.response?.data?.message || 'Failed to create case. Please check your inputs.');
    },
  });

  // Step Validation logic
  const handleNext = () => {
    setValidationError('');

    if (currentStep === 1) {
      if (!formData.treatment.trim()) {
        setValidationError('Please select or enter the required medical treatment or procedure.');
        return;
      }
    } else if (currentStep === 2) {
      if (formData.budgetCents < 0) {
        setValidationError('Budget must be a valid positive amount.');
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.description.trim() || formData.description.trim().length < 10) {
        setValidationError('Please provide a short description of your symptoms or condition (at least 10 characters).');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setValidationError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!formData.treatment.trim() || !formData.description.trim()) {
      setValidationError('Please complete all required fields before submitting.');
      return;
    }

    createMutation.mutate({
      treatment: formData.treatment,
      destination: formData.destination || undefined,
      budgetCents: parseInt(formData.budgetCents, 10),
      preferredTimeline: formData.preferredTimeline,
      description: formData.description,
      travelPartySize: parseInt(formData.travelPartySize, 10) || 1,
      hasInsurance: Boolean(formData.hasInsurance),
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/patient" className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <AIDisclaimer />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Progress Bar & Steps Indicator */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Start New Medical Case Inquiry
            </h1>
            <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
              Step {currentStep} of 4
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {STEPS.map((s) => (
              <div key={s.id} className="space-y-1">
                <div
                  className={`h-1.5 rounded-full ${
                    s.id < currentStep
                      ? 'bg-teal-700'
                      : s.id === currentStep
                      ? 'bg-rose-500'
                      : 'bg-slate-200'
                  }`}
                ></div>
                <p className={`text-[11px] font-bold hidden sm:block ${s.id === currentStep ? 'text-slate-900' : 'text-slate-400'}`}>
                  {s.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Validation Alert */}
          {validationError && (
            <div className="flex items-center space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* STEP 1: Treatment Procedure */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Step 1: Select Your Treatment or Procedure</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose from accredited medical procedures or type your specific procedure need.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Target Procedure *
                </label>
                <select
                  value={formData.treatment}
                  onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                  className="w-full py-2.5 px-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">-- Choose from catalog procedures --</option>
                  {treatments.map((t) => (
                    <option key={t.id} value={t.slug}>
                      {t.name} ({t.specialty})
                    </option>
                  ))}
                </select>

                <div className="pt-2 text-xs text-slate-500">
                  <span>Or enter a custom procedure if not listed above:</span>
                  <input
                    type="text"
                    placeholder="e.g. Minimally Invasive Spinal Fusion"
                    value={formData.treatment}
                    onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                    className="w-full mt-1.5 py-2 px-3 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Destination & Budget */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Step 2: Destination Preference &amp; Budget</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Let us know where you prefer to receive treatment and your estimated budget.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Preferred Destination
                  </label>
                  <select
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Any Accredited Destination (Recommended)</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.country}>
                        {d.country} ({d.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Estimated Budget (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      value={formData.budgetCents / 100}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          budgetCents: Math.max(0, Math.round(Number(e.target.value) * 100)),
                        })
                      }
                      className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Stored accurately as integer cents ({formData.budgetCents} cents)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Preferred Timeline
                  </label>
                  <select
                    value={formData.preferredTimeline}
                    onChange={(e) => setFormData({ ...formData, preferredTimeline: e.target.value })}
                    className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Urgent (Next 2-4 weeks)">Urgent (Next 2-4 weeks)</option>
                    <option value="Within 1-3 months">Within 1-3 months</option>
                    <option value="Within 3-6 months">Within 3-6 months</option>
                    <option value="Flexible planning">Flexible planning</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Travel Party Size
                  </label>
                  <select
                    value={formData.travelPartySize}
                    onChange={(e) => setFormData({ ...formData, travelPartySize: e.target.value })}
                    className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="1">Patient traveling alone (1)</option>
                    <option value="2">Patient + 1 Companion (2)</option>
                    <option value="3">Family group (3+)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Medical Description */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Step 3: Medical Condition &amp; Symptoms</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Describe your current condition, diagnosis history, and primary symptoms in plain everyday words.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Condition Description *
                </label>
                <textarea
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what symptoms you have, how long you have experienced them, and any previous treatments or surgical recommendations..."
                  className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed"
                />
                <span className="text-[11px] text-slate-400">
                  Minimum 10 characters. You can securely upload reports and scans in the next step.
                </span>
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasInsurance}
                    onChange={(e) => setFormData({ ...formData, hasInsurance: e.target.checked })}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-500 h-4 w-4"
                  />
                  <span>I have international / travel medical insurance coverage</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Step 4: Review Your Inquiry</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify your inquiry details. Once created, you will be taken to your case dashboard to upload medical records.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Treatment:</span>
                  <span className="font-bold text-slate-900">{formData.treatment}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Destination Preference:</span>
                  <span className="font-semibold text-slate-900">{formData.destination || 'Flexible (All accredited hubs)'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Target Budget:</span>
                  <span className="font-extrabold text-slate-900">{formatCentsToUSD(formData.budgetCents)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Travel Timeline:</span>
                  <span className="font-semibold text-slate-900">{formData.preferredTimeline}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Travel Party:</span>
                  <span className="font-semibold text-slate-900">{formData.travelPartySize} person(s)</span>
                </div>
                <div className="space-y-1 pt-1">
                  <span className="text-slate-500 block">Condition Description:</span>
                  <p className="text-slate-800 bg-white p-3 rounded-lg border border-slate-200 text-xs leading-relaxed">
                    {formData.description}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-1.5 text-xs text-teal-900">
                <div className="flex items-center space-x-1.5 font-bold">
                  <ShieldCheck className="h-4 w-4 text-teal-700" />
                  <span>Encrypted Patient Privacy Protected</span>
                </div>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  Your case starts in the <strong>NEW</strong> stage. Only partner hospitals you explicitly grant consent to will be able to view your records and provide clinical quotes.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center space-x-1 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div></div>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center space-x-1 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 shadow-sm transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={createMutation.isLoading}
                className="inline-flex items-center space-x-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 active:bg-rose-700 shadow-sm transition-colors disabled:opacity-50"
              >
                {createMutation.isLoading ? (
                  <span>Submitting Inquiry...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm &amp; Create Case</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
