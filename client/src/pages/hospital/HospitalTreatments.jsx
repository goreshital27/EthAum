import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { formatCentsToUSD } from '../../utils/currency';
import {
  Stethoscope,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Info,
  X,
  Search,
} from 'lucide-react';

export default function HospitalTreatments() {
  const queryClient = useQueryClient();

  // 1. Fetch Hospital Profile (contains current offered treatments)
  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['hospitalProfile'],
    queryFn: async () => {
      const res = await api.get('/hospital/profile');
      return res.data?.data;
    },
  });

  // 2. Fetch Marketplace Treatments Catalog for dropdown
  const { data: marketplaceTreatments = [] } = useQuery({
    queryKey: ['marketplaceTreatments'],
    queryFn: async () => {
      const res = await api.get('/treatments');
      return res.data?.data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const offeredTreatments = profile?.treatments || [];

  // Add Treatment Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
  const [minPriceDollars, setMinPriceDollars] = useState(2500);
  const [maxPriceDollars, setMaxPriceDollars] = useState(6000);
  const [modalError, setModalError] = useState('');
  const [notification, setNotification] = useState('');

  // Edit Price Range Modal State
  const [editingTreatment, setEditingTreatment] = useState(null);
  const [editMinDollars, setEditMinDollars] = useState(0);
  const [editMaxDollars, setEditMaxDollars] = useState(0);

  // 3. Add Treatment Mutation
  const addTreatmentMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/hospital/treatments', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hospitalProfile']);
      setShowAddModal(false);
      setSelectedTreatmentId('');
      setNotification('Treatment offering added successfully (Provider-reported).');
      setTimeout(() => setNotification(''), 4000);
    },
    onError: (err) => {
      setModalError(err.response?.data?.message || 'Failed to add treatment offering.');
    },
  });

  // 4. Update Treatment Mutation
  const updateTreatmentMutation = useMutation({
    mutationFn: async ({ treatmentId, payload }) => {
      const res = await api.patch(`/hospital/treatments/${treatmentId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hospitalProfile']);
      setEditingTreatment(null);
      setNotification('Treatment pricing updated successfully.');
      setTimeout(() => setNotification(''), 4000);
    },
    onError: (err) => {
      setModalError(err.response?.data?.message || 'Failed to update pricing.');
    },
  });

  // 5. Remove Treatment Mutation
  const removeTreatmentMutation = useMutation({
    mutationFn: async (treatmentId) => {
      const res = await api.delete(`/hospital/treatments/${treatmentId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hospitalProfile']);
      setNotification('Treatment offering removed from your facility.');
      setTimeout(() => setNotification(''), 4000);
    },
    onError: (err) => {
      setNotification(err.response?.data?.message || 'Failed to remove treatment offering.');
    },
  });

  // Submit Add
  const handleAddSubmit = (e) => {
    e.preventDefault();
    setModalError('');

    if (!selectedTreatmentId) {
      setModalError('Please select a procedure from the catalog.');
      return;
    }

    const minCents = Math.round(parseFloat(minPriceDollars) * 100);
    const maxCents = Math.round(parseFloat(maxPriceDollars) * 100);

    if (isNaN(minCents) || isNaN(maxCents) || minCents < 0 || maxCents < 0) {
      setModalError('Please enter valid non-negative dollar amounts.');
      return;
    }

    if (minCents > maxCents) {
      setModalError('Minimum price cannot exceed maximum price.');
      return;
    }

    addTreatmentMutation.mutate({
      treatmentId: selectedTreatmentId,
      minPriceCents: minCents,
      maxPriceCents: maxCents,
      currency: 'USD',
    });
  };

  // Submit Edit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    setModalError('');

    const minCents = Math.round(parseFloat(editMinDollars) * 100);
    const maxCents = Math.round(parseFloat(editMaxDollars) * 100);

    if (isNaN(minCents) || isNaN(maxCents) || minCents < 0 || maxCents < 0) {
      setModalError('Please enter valid non-negative dollar amounts.');
      return;
    }

    if (minCents > maxCents) {
      setModalError('Minimum price cannot exceed maximum price.');
      return;
    }

    updateTreatmentMutation.mutate({
      treatmentId: editingTreatment.treatmentId,
      payload: {
        minPriceCents: minCents,
        maxPriceCents: maxCents,
      },
    });
  };

  const openEditModal = (t) => {
    setEditingTreatment(t);
    setEditMinDollars(t.minPriceCents ? t.minPriceCents / 100 : 0);
    setEditMaxDollars(t.maxPriceCents ? t.maxPriceCents / 100 : 0);
    setModalError('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Stethoscope className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Treatments &amp; Pricing Directory
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure the clinical procedures your hospital performs, with expected cost ranges.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddModal(true);
            setModalError('');
          }}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Procedure Offering</span>
        </button>
      </div>

      {/* Provider-reported Notice */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-start space-x-2.5">
        <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900">Provider-Reported Pricing Standard:</span> Estimated
          treatment price ranges are reported directly by your hospital. Final binding pricing is determined by
          the patient's specific case history and individual itemized quotations.
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Treatments List Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isProfileLoading ? (
          <div className="py-20 text-center space-y-2 text-xs text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2" />
            <p>Loading offered treatments...</p>
          </div>
        ) : isProfileError ? (
          <div className="p-8 text-center text-xs text-rose-600 space-y-2">
            <p>
              Failed to load treatments: {profileError?.response?.data?.message || profileError?.message || 'Unable to retrieve treatment offerings.'}
            </p>
            <button
              type="button"
              onClick={() => refetchProfile()}
              className="px-4 py-1.5 bg-rose-50 text-rose-700 rounded-lg font-semibold"
            >
              Retry
            </button>
          </div>
        ) : offeredTreatments.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <Stethoscope className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No treatments configured yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add the surgeries and treatments your accredited hospital specializes in to start matching international patient inquiries.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Your First Procedure</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50">
                  <th className="py-3 px-4 font-semibold">Procedure Name</th>
                  <th className="py-3 px-4 font-semibold">Specialty</th>
                  <th className="py-3 px-4 font-semibold">Estimated Price Range (USD)</th>
                  <th className="py-3 px-4 font-semibold">Standard</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {offeredTreatments.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {t.treatmentName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {t.specialty}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {t.minPriceCents && t.maxPriceCents
                        ? `${formatCentsToUSD(t.minPriceCents)} – ${formatCentsToUSD(t.maxPriceCents)}`
                        : 'Contact for estimate'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Provider-reported
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(t)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit Range</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove ${t.treatmentName} from your hospital's offerings?`)) {
                            removeTreatmentMutation.mutate(t.treatmentId);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remove procedure"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Treatment Offering Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                <span>Add Procedure Offering</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select Medical Procedure from Catalog
                </label>
                <select
                  value={selectedTreatmentId}
                  onChange={(e) => setSelectedTreatmentId(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Choose a recognized procedure --</option>
                  {marketplaceTreatments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.specialty})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  All treatments follow standardized international taxonomy
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Minimum Price ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={minPriceDollars}
                    onChange={(e) => setMinPriceDollars(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Maximum Price ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={maxPriceDollars}
                    onChange={(e) => setMaxPriceDollars(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                <strong>Provider-reported Notice:</strong> Price ranges will be shown as estimates on your public hospital profile.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addTreatmentMutation.isLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                >
                  {addTreatmentMutation.isLoading ? 'Adding...' : 'Add Offering'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Price Range Modal */}
      {editingTreatment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Update Pricing: {editingTreatment.treatmentName}
              </h2>
              <button
                type="button"
                onClick={() => setEditingTreatment(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Minimum Price ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={editMinDollars}
                    onChange={(e) => setEditMinDollars(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Maximum Price ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={editMaxDollars}
                    onChange={(e) => setEditMaxDollars(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTreatment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateTreatmentMutation.isLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                >
                  {updateTreatmentMutation.isLoading ? 'Updating...' : 'Save Pricing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
