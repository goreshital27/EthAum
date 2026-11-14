import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  Info,
  X,
  Languages,
  Award,
  Clock,
} from 'lucide-react';

export default function HospitalDoctors() {
  const queryClient = useQueryClient();

  // 1. Fetch Hospital Profile (contains doctors)
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['hospitalProfile'],
    queryFn: async () => {
      const res = await api.get('/hospital/profile');
      return res.data?.data;
    },
  });

  const doctors = profile?.doctors || [];

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [yearsExperience, setYearsExperience] = useState(10);
  const [languagesStr, setLanguagesStr] = useState('English');
  const [bio, setBio] = useState('');

  const [modalError, setModalError] = useState('');
  const [notification, setNotification] = useState('');

  // 2. Add Doctor Mutation
  const addDoctorMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/hospital/doctors', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hospitalProfile']);
      closeModal();
      setNotification('Specialist doctor added to your facility directory.');
      setTimeout(() => setNotification(''), 4000);
    },
    onError: (err) => {
      setModalError(err.response?.data?.message || 'Failed to add doctor profile.');
    },
  });

  // 3. Update Doctor Mutation
  const updateDoctorMutation = useMutation({
    mutationFn: async ({ doctorId, payload }) => {
      const res = await api.patch(`/hospital/doctors/${doctorId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hospitalProfile']);
      closeModal();
      setNotification('Doctor profile updated successfully.');
      setTimeout(() => setNotification(''), 4000);
    },
    onError: (err) => {
      setModalError(err.response?.data?.message || 'Failed to update doctor profile.');
    },
  });

  // 4. Remove Doctor Mutation
  const removeDoctorMutation = useMutation({
    mutationFn: async (doctorId) => {
      const res = await api.delete(`/hospital/doctors/${doctorId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hospitalProfile']);
      setNotification('Doctor profile removed from your hospital directory.');
      setTimeout(() => setNotification(''), 4000);
    },
    onError: (err) => {
      setNotification(err.response?.data?.message || 'Failed to remove doctor profile.');
    },
  });

  const openAddModal = () => {
    setEditingDoctor(null);
    setName('');
    setSpecialty('');
    setQualifications('');
    setYearsExperience(10);
    setLanguagesStr('English');
    setBio('');
    setModalError('');
    setShowModal(true);
  };

  const openEditModal = (doc) => {
    setEditingDoctor(doc);
    setName(doc.name);
    setSpecialty(doc.specialty);
    setQualifications(doc.qualifications || '');
    setYearsExperience(doc.yearsExperience ?? 10);
    setLanguagesStr(doc.languages?.join(', ') || 'English');
    setBio(doc.bio || '');
    setModalError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDoctor(null);
    setModalError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setModalError('');

    if (!name.trim()) {
      setModalError('Doctor full name is required.');
      return;
    }
    if (!specialty.trim()) {
      setModalError('Clinical specialty is required.');
      return;
    }

    const languages = languagesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: name.trim(),
      specialty: specialty.trim(),
      qualifications: qualifications.trim() || null,
      yearsExperience: parseInt(yearsExperience, 10) || 0,
      languages: languages.length > 0 ? languages : ['English'],
      bio: bio.trim() || null,
    };

    if (editingDoctor) {
      updateDoctorMutation.mutate({ doctorId: editingDoctor.id, payload });
    } else {
      addDoctorMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Specialist Doctors Directory
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage the consultants, lead surgeons, and medical department specialists affiliated with your hospital.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Specialist Doctor</span>
        </button>
      </div>

      {/* Architecture & Role Rule Notice */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-start space-x-2.5">
        <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900">Hospital Staff Architecture:</span> Specialist doctors are
          managed directly by hospital administrators and do not possess independent user login accounts.
          All credentials, clinical bio notes, and languages are <strong className="text-amber-800 font-semibold">"Provider-reported"</strong>.
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Doctors Grid / Directory Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-2 text-xs text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2" />
            <p>Loading specialist doctors...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <Users className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No doctors added yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add your chief surgeons and consulting specialists so patients can review medical credentials in itemized quotes.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Your First Doctor</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-2 max-w-2xl">
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">{doc.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {doc.specialty}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Provider-reported
                      </span>
                    </div>

                    {doc.qualifications && (
                      <p className="text-slate-500 font-medium text-xs mt-0.5 flex items-center space-x-1">
                        <Award className="h-3 w-3 text-slate-400" />
                        <span>{doc.qualifications}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-slate-600 text-[11px]">
                    {doc.yearsExperience !== null && (
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{doc.yearsExperience} Years Experience</span>
                      </span>
                    )}

                    {doc.languages?.length > 0 && (
                      <span className="flex items-center space-x-1">
                        <Languages className="h-3.5 w-3.5 text-slate-400" />
                        <span>{doc.languages.join(', ')}</span>
                      </span>
                    )}
                  </div>

                  {doc.bio && (
                    <p className="text-slate-600 line-clamp-2 mt-1 text-xs">{doc.bio}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => openEditModal(doc)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Remove Dr. ${doc.name} from your hospital directory?`)) {
                        removeDoctorMutation.mutate(doc.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Remove doctor"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Doctor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <span>{editingDoctor ? 'Edit Doctor Profile' : 'Add Specialist Doctor'}</span>
              </h2>
              <button
                type="button"
                onClick={closeModal}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Doctor Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Dr. Rajesh Sharma"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Specialty / Department *
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Orthopedic Surgery, Cardiology"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Qualifications &amp; Fellowships
                  </label>
                  <input
                    type="text"
                    value={qualifications}
                    onChange={(e) => setQualifications(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. MBBS, MS, FRCS (Edin)"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="70"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(parseInt(e.target.value, 10) || 0)}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Languages Spoken
                </label>
                <input
                  type="text"
                  value={languagesStr}
                  onChange={(e) => setLanguagesStr(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. English, Hindi, Arabic (comma-separated)"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Clinical Bio &amp; Expertise (Optional)
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe key surgical expertise, robotic precision procedures, publications..."
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                <strong>Provider-reported Notice:</strong> Doctor profiles are displayed on your hospital page as provider-managed clinical staff.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addDoctorMutation.isLoading || updateDoctorMutation.isLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                >
                  {addDoctorMutation.isLoading || updateDoctorMutation.isLoading
                    ? 'Saving...'
                    : editingDoctor
                    ? 'Update Doctor'
                    : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
