import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-sky-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Verifying session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleLanding =
      user.role === 'PATIENT' ? '/patient' : user.role === 'HOSPITAL' ? '/hospital' : '/admin';

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md w-full text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-rose-50 text-rose-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Not Allowed</h1>
          <p className="text-sm text-slate-600">
            Your account ({user.role}) does not have permission to access this page.
          </p>
          <div className="pt-2">
            <Link
              to={roleLanding}
              className="inline-flex justify-center items-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Go to Your Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
