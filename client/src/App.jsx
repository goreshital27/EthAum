import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CompareProvider } from './context/CompareContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './components/PublicLayout';
import Home from './pages/Home';
import Treatments from './pages/Treatments';
import Destinations from './pages/Destinations';
import Hospitals from './pages/Hospitals';
import HospitalProfile from './pages/HospitalProfile';
import DoctorProfile from './pages/DoctorProfile';
import Packages from './pages/Packages';
import Compare from './pages/Compare';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import NewCase from './pages/patient/NewCase';
import CaseDetail from './pages/patient/CaseDetail';
import HospitalDashboard from './pages/HospitalDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <CompareProvider>
        <Routes>
          {/* Public Browse Routes Wrapped in PublicLayout */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/treatments" element={<Treatments />} />
            <Route path="/destinations" element={<Destinations />} />
            <Route path="/hospitals" element={<Hospitals />} />
            <Route path="/hospitals/:slug" element={<HospitalProfile />} />
            <Route path="/doctors/:id" element={<DoctorProfile />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/compare" element={<Compare />} />
          </Route>

          {/* Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Patient Routes */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/cases/new"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <NewCase />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/cases/:id"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <CaseDetail />
              </ProtectedRoute>
            }
          />

          {/* Other Protected Dashboard Routes */}
          <Route
            path="/hospital"
            element={
              <ProtectedRoute allowedRoles={['HOSPITAL']}>
                <HospitalDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CompareProvider>
    </AuthProvider>
  );
}
