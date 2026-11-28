import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  LogOut,
  ShoppingBag,
  LifeBuoy,
  Wrench,
  BookOpen,
  UserPlus,
  LayoutDashboard,
  Shield,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { authApi } from '@/features/auth/auth.api';
import { ordersApi, type OrderItem } from '@/features/orders/orders.api';
import { ticketsApi, type TicketItem } from '@/features/tickets/tickets.api';
import { az } from '@/i18n/az';
import { formatAznPrice } from '@/i18n/currency';
import type { User } from '@/features/auth/types';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState<User | null>(user);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadProfileData = async () => {
      setIsLoading(true);
      const [meRes, ordersRes, ticketsRes] = await Promise.allSettled([
        authApi.getMe(),
        ordersApi.getMyOrders(1, 5),
        ticketsApi.getUserTickets(1, 5),
      ]);

      if (!active) return;

      if (meRes.status === 'fulfilled' && meRes.value?.user) {
        setProfileUser(meRes.value.user);
      }

      if (ordersRes.status === 'fulfilled' && ordersRes.value) {
        const list = ordersRes.value.data || ordersRes.value.orders || [];
        setOrders(list);
        setOrdersTotal(ordersRes.value.total ?? list.length);
      }

      if (ticketsRes.status === 'fulfilled' && ticketsRes.value) {
        const list = ticketsRes.value.data || ticketsRes.value.tickets || [];
        setTickets(list);
        setTicketsTotal(ticketsRes.value.total ?? list.length);
      }

      setIsLoading(false);
    };

    loadProfileData();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayUser = profileUser || user;
  const initials = (displayUser?.fullName || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <UserIcon className="w-7 h-7 text-[#147DF5]" />
          <span>{az.profile.title}</span>
        </h1>
        <p className="text-sm text-slate-500">{az.profile.subtitle}</p>
      </div>

      {isLoading && !displayUser ? (
        <div className="py-16 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#147DF5]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Card: Account Details */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#147DF5] text-white font-extrabold text-xl flex items-center justify-center shadow-sm flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  {displayUser?.fullName || 'İstifadəçi'}
                </h2>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{displayUser?.email}</span>
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">{az.admin.users.colRole}</span>
                <span className="px-2.5 py-1 rounded-full font-bold bg-brand-50 text-[#147DF5] border border-brand-200">
                  {displayUser?.role ? az.auth.roles[displayUser.role] : az.auth.roles.USER}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">{az.common.status}</span>
                {displayUser?.isEmailVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{az.profile.emailVerified}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{az.profile.emailUnverified}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-slate-100">
              <Link
                to="/forgot-password"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                <KeyRound className="w-4 h-4 text-[#147DF5]" />
                <span>{az.profile.resetPassword}</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{az.profile.logout}</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Summaries & Quick Links */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to="/orders/my"
                className="bg-white border border-slate-200 hover:border-[#147DF5] rounded-2xl p-5 shadow-sm transition-colors flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500">{az.profile.ordersSummary}</div>
                  <div className="text-2xl font-extrabold text-slate-900" data-testid="profile-orders-count">
                    {ordersTotal}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-brand-50 text-[#147DF5]">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </Link>

              <Link
                to="/tickets"
                className="bg-white border border-slate-200 hover:border-[#147DF5] rounded-2xl p-5 shadow-sm transition-colors flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500">{az.profile.ticketsSummary}</div>
                  <div className="text-2xl font-extrabold text-slate-900" data-testid="profile-tickets-count">
                    {ticketsTotal}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                  <LifeBuoy className="w-6 h-6" />
                </div>
              </Link>
            </div>

            {/* Recent Orders & Tickets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{az.profile.recentOrders}</h3>
                  <Link to="/orders/my" className="text-xs font-semibold text-[#147DF5] hover:underline">
                    {az.marketplace.viewAll}
                  </Link>
                </div>
                {orders.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">{az.profile.noRecentOrders}</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-xs">
                    {orders.slice(0, 3).map((ord) => (
                      <li key={ord._id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate">
                            {ord.projectId?.title || ord.orderNumber}
                          </div>
                          <div className="text-[11px] text-slate-400">{ord.orderNumber}</div>
                        </div>
                        <span className="font-bold text-[#147DF5] flex-shrink-0">
                          {formatAznPrice(ord.price ?? ord.amount ?? 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{az.profile.recentTickets}</h3>
                  <Link to="/tickets" className="text-xs font-semibold text-[#147DF5] hover:underline">
                    {az.marketplace.viewAll}
                  </Link>
                </div>
                {tickets.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">{az.profile.noRecentTickets}</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-xs">
                    {tickets.slice(0, 3).map((t) => (
                      <li key={t._id} className="py-2.5 flex items-center justify-between gap-2">
                        <Link
                          to={`/tickets/${t._id}`}
                          className="font-semibold text-slate-800 hover:text-[#147DF5] truncate"
                        >
                          {t.subject}
                        </Link>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">
                          {az.status[t.status] || t.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Quick Access & Role CTA */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">{az.profile.quickAccess}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  to="/component-finder"
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#147DF5] hover:bg-brand-50/30 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-[#147DF5]" />
                    <span className="text-xs font-semibold text-slate-800">
                      Komponentlərimlə Tap
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  to="/library"
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#147DF5] hover:bg-brand-50/30 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-[#147DF5]" />
                    <span className="text-xs font-semibold text-slate-800">
                      Elektronika Kitabxanası
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>

                {displayUser?.role === 'USER' && (
                  <Link
                    to="/become-author"
                    className="sm:col-span-2 p-4 rounded-xl bg-brand-50/70 border border-brand-200 hover:bg-brand-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <UserPlus className="w-5 h-5 text-[#147DF5]" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {az.profile.becomeAuthorTitle}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {az.profile.becomeAuthorDesc}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#147DF5]" />
                  </Link>
                )}

                {(displayUser?.role === 'AUTHOR' || displayUser?.role === 'ADMIN') && (
                  <Link
                    to="/author/dashboard"
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-[#147DF5] hover:bg-brand-50/30 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <LayoutDashboard className="w-5 h-5 text-[#147DF5]" />
                      <span className="text-xs font-semibold text-slate-800">
                        {az.nav.authorDashboard}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}

                {displayUser?.role === 'ADMIN' && (
                  <Link
                    to="/admin/dashboard"
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-[#147DF5] hover:bg-brand-50/30 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-[#147DF5]" />
                      <span className="text-xs font-semibold text-slate-800">
                        {az.nav.adminDashboard}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
