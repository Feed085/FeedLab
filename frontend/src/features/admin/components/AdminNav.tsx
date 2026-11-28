import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  GraduationCap,
  Users,
  Cpu,
  RotateCcw,
} from 'lucide-react';
import { az } from '@/i18n/az';

export const AdminNav: React.FC = () => {
  const navItems = [
    { to: '/admin/dashboard', label: az.admin.nav.dashboard, icon: LayoutDashboard },
    { to: '/admin/projects/review', label: az.admin.nav.reviewQueue, icon: ClipboardCheck },
    { to: '/admin/author-applications', label: az.admin.nav.authorApplications, icon: GraduationCap },
    { to: '/admin/users', label: az.admin.nav.users, icon: Users },
    { to: '/admin/components', label: az.admin.nav.components, icon: Cpu },
    { to: '/admin/refunds', label: az.admin.nav.refunds, icon: RotateCcw },
  ];

  return (
    <nav className="flex space-x-1 sm:space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto my-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0 text-brand-600" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
