import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, Building2, User, Loader2, AlertCircle } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('PATIENT'); // 'PATIENT' | 'HOSPITAL'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    hospitalName: '',
    country: '',
    city: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (role === 'HOSPITAL') {
      if (!formData.hospitalName.trim() || !formData.country.trim() || !formData.city.trim()) {
        setError('Hospital name, country, and city are required for hospital accounts');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        role,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        ...(role === 'HOSPITAL' && {
          hospitalName: formData.hospitalName,
          country: formData.country,
          city: formData.city,
        }),
      };

      const user = await register(payload);
      if (user.role === 'HOSPITAL') {
        navigate('/hospital', { replace: true });
      } else {
        navigate('/patient', { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.details?.[0]?.message ||
        err.message ||
        'Failed to register account'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-2">
          <HeartPulse className="h-8 w-8 text-sky-600" />
          <span className="text-2xl font-bold text-slate-900 tracking-tight">EthAum</span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Create an account
        </h2>
        <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 inline-block px-2.5 py-1 rounded-full font-medium">
          AI-assisted coordination, not medical advice
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {/* Role Selection Tabs */}
          <div className="grid grid-cols-2 gap-3 mb-6 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setRole('PATIENT');
                setError('');
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-md text-sm font-semibold transition-all ${
                role === 'PATIENT'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Patient</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole('HOSPITAL');
                setError('');
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-md text-sm font-semibold transition-all ${
                role === 'HOSPITAL'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Hospital</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-700 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                {role === 'PATIENT' ? 'Full Name' : 'Contact Person Name'}
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder={role === 'PATIENT' ? 'Jane Doe' : 'Dr. Alexander Vance'}
                />
              </div>
            </div>

            {/* Extra Hospital Fields */}
            {role === 'HOSPITAL' && (
              <>
                <div>
                  <label htmlFor="hospitalName" className="block text-sm font-medium text-slate-700">
                    Hospital / Clinic Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="hospitalName"
                      name="hospitalName"
                      type="text"
                      required
                      value={formData.hospitalName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      placeholder="e.g. Bangkok International Hospital"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-slate-700">
                      Country
                    </label>
                    <div className="mt-1">
                      <input
                        id="country"
                        name="country"
                        type="text"
                        required
                        value={formData.country}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        placeholder="Thailand"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-slate-700">
                      City
                    </label>
                    <div className="mt-1">
                      <input
                        id="city"
                        name="city"
                        type="text"
                        required
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        placeholder="Bangkok"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password (min 8 characters)
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Creating account...
                  </>
                ) : (
                  `Register as ${role === 'PATIENT' ? 'Patient' : 'Hospital'}`
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-4 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-sky-600 hover:text-sky-500">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
