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
import QuoteComparison from './pages/patient/QuoteComparison';
import BookingPayment from './pages/patient/BookingPayment';
import BookingConfirmation from './pages/patient/BookingConfirmation';
import PatientReferrals from './pages/patient/PatientReferrals';
import HospitalLayout from './pages/hospital/HospitalLayout';
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import HospitalLeads from './pages/hospital/HospitalLeads';
import HospitalLeadDetail from './pages/hospital/HospitalLeadDetail';
import HospitalAppointments from './pages/hospital/HospitalAppointments';
import HospitalBookings from './pages/hospital/HospitalBookings';
import HospitalProfileManage from './pages/hospital/HospitalProfileManage';
import HospitalTreatments from './pages/hospital/HospitalTreatments';
import HospitalDoctors from './pages/hospital/HospitalDoctors';
import AdminDashboard from './pages/AdminDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminApprovals from './pages/admin/AdminApprovals';
import AdminCases from './pages/admin/AdminCases';
import AdminReferrals from './pages/admin/AdminReferrals';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminUsers from './pages/admin/AdminUsers';

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
          <Route
            path="/patient/cases/:id/quotes"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <QuoteComparison />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/bookings/:id/pay"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <BookingPayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/bookings/:id/confirmation"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <BookingConfirmation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/referrals"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <PatientReferrals />
              </ProtectedRoute>
            }
          />

          {/* Protected Hospital Portal Routes */}
          <Route
            path="/hospital"
            element={
              <ProtectedRoute allowedRoles={['HOSPITAL']}>
                <HospitalLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HospitalDashboard />} />
            <Route path="leads" element={<HospitalLeads />} />
            <Route path="leads/:enquiryId" element={<HospitalLeadDetail />} />
            <Route path="bookings" element={<HospitalBookings />} />
            <Route path="appointments" element={<HospitalAppointments />} />
            <Route path="profile" element={<HospitalProfileManage />} />
            <Route path="treatments" element={<HospitalTreatments />} />
            <Route path="doctors" element={<HospitalDoctors />} />
          </Route>
          {/* Protected Admin Portal Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminApprovals />} />
            <Route path="approvals" element={<AdminApprovals />} />
            <Route path="cases" element={<AdminCases />} />
            <Route path="referrals" element={<AdminReferrals />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CompareProvider>
    </AuthProvider>
  );
}
