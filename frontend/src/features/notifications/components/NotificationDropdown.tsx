import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  QueryClientContext,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCircle,
  Star,
  LifeBuoy,
  RotateCcw,
  ShoppingBag,
  Info,
  Loader2,
} from 'lucide-react';
import { notificationsApi, NotificationItem } from '../notifications.api';
import { useAuth } from '../../auth/AuthContext';
import { az } from '../../../i18n/az';

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

export const NotificationDropdown: React.FC = () => {
  const existingClient = useContext(QueryClientContext);
  if (!existingClient) {
    return (
      <QueryClientProvider client={fallbackQueryClient}>
        <NotificationDropdownInner />
      </QueryClientProvider>
    );
  }
  return <NotificationDropdownInner />;
};

const NotificationDropdownInner: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getNotifications(1, 20),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30s
  });

  const notifications = data?.data || data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (!isAuthenticated) return null;

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markReadMutation.mutate(item._id);
    }
    setIsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDER_SUCCESS':
      case 'PURCHASE':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'NEW_SALE':
        return <ShoppingBag className="w-4 h-4 text-brand-600" />;
      case 'REVIEW':
      case 'REVIEW_RECEIVED':
      case 'REVIEW_REPLIED':
        return <Star className="w-4 h-4 text-amber-500 fill-amber-500" />;
      case 'TICKET':
      case 'TICKET_UPDATE':
        return <LifeBuoy className="w-4 h-4 text-indigo-600" />;
      case 'REFUND':
      case 'REFUND_UPDATE':
        return <RotateCcw className="w-4 h-4 text-rose-500" />;
      default:
        return <Info className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
        aria-label="Bildirişlər"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-rose-500 rounded-full border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-800 text-xs">{az.notifications.title}</h4>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                  {unreadCount} yeni
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>{az.notifications.markAllRead}</span>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="py-8 flex justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {az.notifications.empty}
              </div>
            ) : (
              notifications.map((n: NotificationItem) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                    !n.isRead ? 'bg-brand-50/30' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white border border-slate-100 shadow-2xs flex-shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {n.title}
                      </span>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-slate-400 block pt-0.5">
                      {new Date(n.createdAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })},{' '}
                      {new Date(n.createdAt).toLocaleDateString('az-AZ')}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
