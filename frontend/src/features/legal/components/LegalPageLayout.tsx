import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { az } from '@/i18n/az';

interface LegalPageLayoutProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  title,
  subtitle,
  icon,
  children,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Naviqasiya yolu" className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-slate-900 transition-colors">
          {az.nav.home}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-800 font-medium">{title}</span>
      </nav>

      {/* Main White Card */}
      <article className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
        <header className="pb-6 border-b border-slate-200 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-[#147DF5] border border-brand-200 text-xs font-semibold">
            {icon}
            <span>Feed Lab Hüquq və Məlumat Mərkəzi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">{subtitle}</p>
          <div className="text-xs text-slate-400">{az.legal.lastUpdated}</div>
        </header>

        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">{children}</div>

        <footer className="pt-6 border-t border-slate-200">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#147DF5] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{az.legal.backHome}</span>
          </Link>
        </footer>
      </article>
    </div>
  );
};
