import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Search, Wrench } from 'lucide-react';

export const HeroBanner: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    if (trimmed) {
      navigate(`/catalog?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/catalog');
    }
  };

  return (
    <section className="relative overflow-x-clip bg-[linear-gradient(135deg,#EEF4FB_0%,#F3F7FC_55%,#F8FAFC_100%)] border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Heading, Search & CTAs */}
          <div className="lg:col-span-6">
            <h1
              className="animate-fade-up text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#0F172A] tracking-tight leading-[1.15]"
              style={{ animationDelay: '0ms' }}
            >
              Öz Elektronika Cihazını Özün Yığ və Öyrən
            </h1>

            <p
              className="animate-fade-up text-base sm:text-lg text-[#475569] mt-4 mb-7 leading-relaxed max-w-xl"
              style={{ animationDelay: '80ms' }}
            >
              Sxemini, kodunu və materiallarını əldə et, sıfırdan hazırla.
            </p>

            {/* Search Input Card */}
            <form
              onSubmit={handleSearchSubmit}
              className="animate-fade-up bg-white rounded-xl shadow-floating border border-slate-200 p-1.5 flex items-center gap-2 max-w-xl"
              style={{ animationDelay: '160ms' }}
            >
              <div className="flex-1 flex items-center pl-3 min-w-0">
                <Search className="w-4 h-4 text-slate-400 mr-2.5 flex-shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Layihə adı, açar söz və ya texnologiya axtarın..."
                  aria-label="Layihə axtarışı"
                  className="w-full py-2 text-sm sm:text-[15px] text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
                />
              </div>
              <button
                type="submit"
                aria-label="Axtar"
                className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 bg-[#147DF5] hover:bg-[#0C64E1] text-white rounded-lg shadow-sm transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Primary & Secondary Action CTAs */}
            <div
              className="animate-fade-up flex flex-wrap items-center gap-3 mt-6"
              style={{ animationDelay: '240ms' }}
            >
              <button
                type="button"
                onClick={() => navigate('/catalog')}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#147DF5] hover:bg-[#0C64E1] text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
              >
                <Compass className="w-4 h-4" />
                <span>Layihələri Kəşf Et</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/component-finder')}
                className="inline-flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold rounded-xl border border-slate-300 shadow-sm transition-colors"
              >
                <Wrench className="w-4 h-4 text-[#147DF5]" />
                <span>Komponentlərimlə Tap</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hero ESP32 Photo + Floating Mini Schematic & BOM Cards */}
          <div className="lg:col-span-6">
            <div className="relative max-w-lg mx-auto lg:ml-auto pt-4 pb-6 px-2 sm:px-0">
              <img
                src="/images/hero-esp32.jpg"
                alt="ESP32 mikrokontroller və elektronika komponentləri"
                className="animate-scatter-main w-full aspect-[4/3] object-cover rounded-2xl shadow-lg border border-white/80"
              />

              {/* Top-Left Floating Mini Schematic SVG Card */}
              <div
                aria-hidden="true"
                className="animate-scatter-tl animate-float-slow absolute -top-1 left-0 sm:-left-6 bg-white rounded-xl shadow-floating border border-slate-100 p-2.5 w-36 sm:w-44"
              >
                <svg
                  viewBox="0 0 180 110"
                  className="w-full h-auto"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="180" height="110" rx="6" fill="#F8FAFC" />
                  {/* Grid dots */}
                  <g fill="#E2E8F0">
                    <circle cx="20" cy="20" r="1.2" /><circle cx="40" cy="20" r="1.2" /><circle cx="60" cy="20" r="1.2" />
                    <circle cx="120" cy="20" r="1.2" /><circle cx="140" cy="20" r="1.2" /><circle cx="160" cy="20" r="1.2" />
                    <circle cx="20" cy="90" r="1.2" /><circle cx="40" cy="90" r="1.2" /><circle cx="140" cy="90" r="1.2" />
                  </g>
                  {/* Colored schematic traces */}
                  <path d="M36 32 H64 V40" stroke="#EF4444" strokeWidth="1.75" strokeLinecap="round" />
                  <path d="M32 52 H64" stroke="#F59E0B" strokeWidth="1.75" strokeLinecap="round" />
                  <path d="M36 72 H64" stroke="#147DF5" strokeWidth="1.75" strokeLinecap="round" />
                  <path d="M116 42 H146 V28" stroke="#10B981" strokeWidth="1.75" strokeLinecap="round" />
                  <path d="M116 56 H148" stroke="#147DF5" strokeWidth="1.75" strokeLinecap="round" />
                  <path d="M116 70 H142 V86" stroke="#64748B" strokeWidth="1.75" strokeLinecap="round" />
                  {/* Central IC chip */}
                  <rect x="64" y="30" width="52" height="50" rx="4" fill="#FFFFFF" stroke="#475569" strokeWidth="1.75" />
                  <rect x="72" y="38" width="36" height="34" rx="2" fill="#EEF4FB" stroke="#CBD5E1" strokeWidth="1" />
                  <circle cx="72" cy="36" r="2" fill="#147DF5" />
                  {/* IC Pins */}
                  <g stroke="#64748B" strokeWidth="1.5">
                    <path d="M58 38 H64 M58 46 H64 M58 54 H64 M58 62 H64 M58 70 H64" />
                    <path d="M116 38 H122 M116 46 H122 M116 54 H122 M116 62 H122 M116 70 H122" />
                  </g>
                  {/* Small peripheral sensor block */}
                  <rect x="132" y="14" width="30" height="14" rx="2.5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.25" />
                  <rect x="18" y="46" width="14" height="12" rx="2" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.25" />
                </svg>
              </div>

              {/* Bottom-Right Floating Mini BOM Checklist Card */}
              <div
                aria-hidden="true"
                className="animate-scatter-br absolute bottom-0 right-0 sm:-right-4 bg-white rounded-xl shadow-floating border border-slate-100 p-3 w-44 sm:w-52"
              >
                <div className="text-xs font-extrabold tracking-wide text-slate-900 mb-2.5">
                  BOM
                </div>
                <div className="space-y-2">
                  {[
                    { checked: true, width: 'w-24' },
                    { checked: true, width: 'w-28' },
                    { checked: true, width: 'w-20' },
                    { checked: false, width: 'w-24' },
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${
                          row.checked
                            ? 'bg-[#147DF5] text-white'
                            : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {row.checked && (
                          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none">
                            <path
                              d="M2.5 6L5 8.5L9.5 3.5"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span
                        className={`h-2 rounded-full ${row.width} ${
                          row.checked ? 'bg-slate-200' : 'bg-slate-100'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
