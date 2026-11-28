import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { AdminUser } from '../types';
import { AdminNav } from '../components/AdminNav';
import { useAuth } from '@/features/auth/AuthContext';
import { az } from '@/i18n/az';

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getUsers({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
      });
      const list = res.data || res.users || (Array.isArray(res) ? res : []);
      setUsers(list);
    } catch (err: any) {
      setError(err.response?.data?.message || 'İstifadəçiləri yükləmək mümkün olmadı');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      setSuccessToast('İstifadəçi rolu uğurla dəyişdirildi!');
      setTimeout(() => setSuccessToast(null), 3000);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId || (u as any).id === userId ? { ...u, role: newRole as any } : u)),
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rol dəyişdirilərkən xəta baş verdi');
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const updatedStatus = !currentStatus;
      await adminApi.updateUserStatus(userId, updatedStatus);
      setSuccessToast(`İstifadəçi statusu ${updatedStatus ? 'aktiv' : 'deaktiv'} edildi!`);
      setTimeout(() => setSuccessToast(null), 3000);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId || (u as any).id === userId ? { ...u, isActive: updatedStatus } : u)),
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Status dəyişdirilərkən xəta baş verdi');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{az.admin.users.title}</h1>
        <p className="text-sm text-slate-500 mt-1">İstifadəçi rollarının idarə edilməsi və hesab statusları</p>
      </div>

      {/* Admin Subnav */}
      <AdminNav />

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          {successToast}
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-50">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={az.admin.users.searchPlaceholder}
              className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {az.common.search}
            </button>
          </form>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">{az.admin.users.roleFilter}</option>
              <option value="USER">USER</option>
              <option value="AUTHOR">AUTHOR</option>
              <option value="MODERATOR">MODERATOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">
            <div className="animate-spin text-2xl mb-2">⚙️</div>
            <p>İstifadəçilər yüklənir...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <p className="font-semibold text-slate-700">{az.admin.users.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">{az.admin.users.colUser}</th>
                  <th className="px-6 py-3">{az.admin.users.colRole}</th>
                  <th className="px-6 py-3">{az.admin.users.colStatus}</th>
                  <th className="px-6 py-3">{az.admin.users.colDate}</th>
                  <th className="px-6 py-3 text-right">{az.admin.users.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((targetUser) => {
                  const targetId = targetUser._id || targetUser.id || '';
                  const isCurrent =
                    Boolean(currentUser) &&
                    (targetId === currentUser?._id || targetId === (currentUser as any)?.id);

                  return (
                    <tr key={targetId} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{targetUser.fullName}</div>
                        <div className="text-xs text-slate-500">{targetUser.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={targetUser.role}
                          disabled={isCurrent}
                          onChange={(e) => handleRoleChange(targetId, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                            targetUser.role === 'ADMIN'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : targetUser.role === 'AUTHOR'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : targetUser.role === 'MODERATOR'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                          } disabled:opacity-50`}
                        >
                          <option value="USER">USER</option>
                          <option value="AUTHOR">AUTHOR</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            targetUser.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {targetUser.isActive ? az.admin.users.active : az.admin.users.inactive}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {targetUser.createdAt
                          ? new Date(targetUser.createdAt).toLocaleDateString('az-AZ')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          disabled={isCurrent}
                          onClick={() => handleStatusToggle(targetId, targetUser.isActive)}
                          title={isCurrent ? az.admin.users.selfLockoutWarning : undefined}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                            targetUser.isActive
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          {targetUser.isActive ? 'Deaktiv et' : 'Aktivləşdir'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
