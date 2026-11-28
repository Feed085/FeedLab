import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { az } from '@/i18n/az';
import { UserMenu } from './UserMenu';
import { NotificationDropdown } from '@/features/notifications/components/NotificationDropdown';
import { useAuth } from '@/features/auth/AuthContext';
import { Cpu, LogIn, Menu, PlusCircle, UserPlus, X } from 'lucide-react';

interface NavItem {
  label: string;
  to: string;
  isActive: (pathname: string, search: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: az.nav.catalog,
    to: '/catalog',
    isActive: (pathname, search) =>
      (pathname === '/catalog' || pathname === '/projects' || pathname === '/categories') &&
      new URLSearchParams(search).get('freeOnly') !== 'true',
  },
  {
    label: 'Pulsuz Layihələr',
    to: '/catalog?freeOnly=true',
    isActive: (pathname, search) =>
      pathname === '/catalog' && new URLSearchParams(search).get('freeOnly') === 'true',
  },
  {
    label: 'Komponentlərimlə Tap',
    to: '/component-finder',
    isActive: (pathname) => pathname.startsWith('/component-finder'),
  },
  {
    label: 'Kitabxana',
    to: '/library',
    isActive: (pathname) => pathname.startsWith('/library'),
  },
  {
    label: az.nav.authors,
    to: '/authors',
    isActive: (pathname) => pathname.startsWith('/authors'),
  },
];

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-4">
        {/* Brand Logo (stacked 2-line mark matching reference UI) */}
        <Link
          to="/"
          aria-label={az.brand.name}
          className="inline-flex items-center gap-2.5 flex-shrink-0 group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#147DF5] group-hover:bg-[#0C64E1] flex items-center justify-center text-white shadow-sm transition-colors">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="flex flex-col font-extrabold text-[15px] leading-[1.05] tracking-tight text-[#147DF5]">
            <span>Feed</span>
            <span>Lab</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Əsas naviqasiya"
          className="hidden lg:flex items-center gap-6 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(location.pathname, location.search);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`whitespace-nowrap transition-colors ${
                  active
                    ? 'text-[#147DF5] font-semibold'
                    : 'text-slate-600 hover:text-[#147DF5]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {isAuthenticated && user ? (
            <>
              {(user.role === 'AUTHOR' || user.role === 'ADMIN') && (
                <Link
                  to="/author/projects/new"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#147DF5] hover:bg-[#0C64E1] rounded-lg shadow-sm transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Layihə Yarat</span>
                </Link>
              )}
              <NotificationDropdown />
              <UserMenu user={user} onLogout={logout} />
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2.5">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4 text-slate-500" />
                <span>{az.nav.login}</span>
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-[#147DF5] hover:bg-[#0C64E1] rounded-lg shadow-sm transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>{az.nav.register}</span>
              </Link>
            </div>
          )}

          {/* Mobile Drawer Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={mobileOpen ? 'Menyunu bağla' : 'Menyunu aç'}
            className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          id="mobile-navigation-drawer"
          className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 shadow-lg animate-in fade-in slide-in-from-top-1"
        >
          <nav aria-label="Mobil naviqasiya" className="flex flex-col space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = item.isActive(location.pathname, location.search);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#EEF4FB] text-[#147DF5] font-semibold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#147DF5]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {isAuthenticated && user ? (
            (user.role === 'AUTHOR' || user.role === 'ADMIN') && (
              <div className="pt-3 mt-3 border-t border-slate-100 sm:hidden">
                <Link
                  to="/author/projects/new"
                  onClick={() => setMobileOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-[#147DF5] hover:bg-[#0C64E1] rounded-lg shadow-sm transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Layihə Yarat</span>
                </Link>
              </div>
            )
          ) : (
            <div className="pt-3 mt-3 border-t border-slate-100 grid grid-cols-2 gap-2 sm:hidden">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4 text-slate-500" />
                <span>{az.nav.login}</span>
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold text-white bg-[#147DF5] hover:bg-[#0C64E1] rounded-lg shadow-sm transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>{az.nav.register}</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
