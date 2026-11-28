import React from 'react';
import { Link } from 'react-router-dom';
import { az } from '@/i18n/az';
import { Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#F4F7FA] border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
          {/* Brand Column */}
          <div className="md:col-span-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-bold text-lg text-[#147DF5] mb-3"
            >
              <div className="w-8 h-8 rounded-lg bg-[#147DF5] flex items-center justify-center text-white shadow-sm">
                <Cpu className="w-4 h-4" />
              </div>
              <span>{az.brand.name}</span>
            </Link>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              {az.footer.platformInfo}
            </p>
          </div>

          {/* Useful Links */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              {az.footer.quickLinks}
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/catalog" className="hover:text-[#147DF5] transition-colors">
                  {az.nav.catalog}
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-[#147DF5] transition-colors">
                  {az.nav.categories}
                </Link>
              </li>
              <li>
                <Link
                  to="/catalog?freeOnly=true"
                  className="hover:text-[#147DF5] transition-colors"
                >
                  Pulsuz Layihələr
                </Link>
              </li>
              <li>
                <Link to="/component-finder" className="hover:text-[#147DF5] transition-colors">
                  Komponentlərimlə Tap
                </Link>
              </li>
              <li>
                <Link to="/library" className="hover:text-[#147DF5] transition-colors">
                  Kitabxana
                </Link>
              </li>
              <li>
                <Link to="/authors" className="hover:text-[#147DF5] transition-colors">
                  {az.nav.authors}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              {az.footer.legal}
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/terms" className="hover:text-[#147DF5] transition-colors">
                  {az.footer.termsOfService}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-[#147DF5] transition-colors">
                  {az.footer.privacyPolicy}
                </Link>
              </li>
              <li>
                <Link to="/license" className="hover:text-[#147DF5] transition-colors">
                  {az.footer.licenseTerms}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-[#147DF5] transition-colors">
                  {az.footer.faq}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Feed Lab</p>
          <div className="flex items-center gap-2 text-slate-600">
            <span>
              Valyuta: <strong className="font-semibold text-slate-900">AZN (₼)</strong>
            </span>
            <span aria-hidden="true">•</span>
            <span>
              Dil: <strong className="font-semibold text-slate-900">Azərbaycan</strong>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
