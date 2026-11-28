import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { User, UserRole } from '@/features/auth/types';
import { az } from '@/i18n/az';
import {
  User as UserIcon,
  LogOut,
  Package,
  LayoutDashboard,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  LifeBuoy,
} from 'lucide-react';

interface UserMenuProps {
  user: User;
  onLogout: () => void;
}

const getInitials = (name: string): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getRoleBadge = (role: UserRole) => {
  switch (role) {
    case 'ADMIN':
      return {
        label: az.auth.roles.ADMIN,
        className: 'bg-rose-100 text-rose-700 border-rose-200',
      };
    case 'MODERATOR':
      return {
        label: az.auth.roles.MODERATOR,
        className: 'bg-purple-100 text-purple-700 border-purple-200',
      };
    case 'AUTHOR':
      return {
        label: az.auth.roles.AUTHOR,
        className: 'bg-teal-100 text-teal-700 border-teal-200',
      };
    case 'USER':
    default:
      return {
        label: az.auth.roles.USER,
        className: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
};

export const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const roleBadge = getRoleBadge(user.role);
  const initials = getInitials(user.fullName);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        <div className="w-8 h-8 rounded-full bg-brand-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm">
          {initials}
        </div>
        <div className="hidden sm:flex flex-col items-start text-left">
          <span className="text-xs font-semibold text-slate-800 leading-tight">
            {user.fullName}
          </span>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${roleBadge.className}`}
          >
            {roleBadge.label}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
        >
          {/* User Info Header */}
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {user.fullName}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>

          <div className="py-1 text-xs">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors"
            >
              <UserIcon className="w-4 h-4 text-slate-400" />
              <span>{az.nav.profile}</span>
            </Link>

            <Link
              to="/orders/my"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors"
            >
              <Package className="w-4 h-4 text-slate-400" />
              <span>{az.nav.myOrders}</span>
            </Link>

            <Link
              to="/tickets"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors"
            >
              <LifeBuoy className="w-4 h-4 text-slate-400" />
              <span>Dəstək Biletləri</span>
            </Link>

            {(user.role === 'AUTHOR' || user.role === 'ADMIN') && (
              <Link
                to="/author/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-teal-700 hover:bg-teal-50 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-teal-500" />
                <span>{az.nav.authorDashboard}</span>
              </Link>
            )}

            {user.role === 'ADMIN' && (
              <Link
                to="/admin/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-rose-700 hover:bg-rose-50 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-rose-500" />
                <span>{az.nav.adminDashboard}</span>
              </Link>
            )}

            {user.role === 'USER' && (
              <Link
                to="/become-author"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-brand-700 hover:bg-brand-50 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-brand-500" />
                <span>{az.nav.becomeAuthor}</span>
              </Link>
            )}
          </div>

          <div className="border-t border-slate-100 pt-1 mt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>{az.nav.logout}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
