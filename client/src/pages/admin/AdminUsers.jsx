import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  Users,
  Search,
  Shield,
  User,
  Building2,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export default function AdminUsers() {
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // 1. Fetch Users
  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminUsers', roleFilter, searchTerm, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter && roleFilter !== 'ALL') params.set('role', roleFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      params.set('page', page);
      params.set('limit', 20);

      const res = await api.get(`/admin/users?${params.toString()}`);
      return res.data;
    },
    keepPreviousData: true,
  });

  const users = response?.data || [];
  const pagination = response?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Title & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
              <Users className="h-6 w-6 text-rose-600 shrink-0" />
              <span>User Directory</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              View-only registry of registered patients, hospital coordinators, and platform administrators.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
            {pagination.total} Registered User{pagination.total === 1 ? '' : 's'}
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-100">
          {/* Role Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['', 'PATIENT', 'HOSPITAL', 'ADMIN'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRoleFilter(r);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  roleFilter === r
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r === '' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search by email..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center space-x-2">
        <ShieldAlert className="h-4 w-4 text-slate-500 shrink-0" />
        <span>
          <strong>Data Security Enforcement:</strong> Passwords, password hashes, and tokens are strictly excluded from all database queries and responses.
        </span>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-white p-8 rounded-2xl border border-rose-200 text-center space-y-3 shadow-xs">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-slate-900">Failed to load user directory</p>
          <p className="text-xs text-slate-500">{error?.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && users.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
          <Users className="h-8 w-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Users Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No user accounts match your search parameters.
          </p>
        </div>
      )}

      {/* Users Table */}
      {!isLoading && !isError && users.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">User / Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isPatient = u.role === 'PATIENT';
                  const isHospital = u.role === 'HOSPITAL';
                  const isAdmin = u.role === 'ADMIN';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name with Icon */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-lg shrink-0 ${
                            isPatient
                              ? 'bg-teal-50 text-teal-700'
                              : isHospital
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {isPatient ? (
                              <User className="h-3.5 w-3.5" />
                            ) : isHospital ? (
                              <Building2 className="h-3.5 w-3.5" />
                            ) : (
                              <Shield className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span className="truncate max-w-[180px]">{u.name}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {u.email}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            isPatient
                              ? 'bg-teal-50 text-teal-800 border-teal-200'
                              : isHospital
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 text-slate-500">
                        {u.details}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-right text-slate-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
