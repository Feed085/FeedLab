import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Cable,
  CheckCircle2,
  ChevronRight,
  Code2,
  Compass,
  Cpu,
  FolderOpen,
  Layers,
  Lightbulb,
  Repeat,
  Settings2,
  Sliders,
  ZoomIn,
} from 'lucide-react';
import { RevealSection } from '@/components/common/RevealSection';
import {
  LightboxImageModal,
  type LightboxImageItem,
} from '@/components/common/LightboxImageModal';
import { CodeBlockWithCopy } from '@/components/common/CodeBlockWithCopy';
import { ProjectCard } from '@/features/marketplace/components/ProjectCard';
import { useComponent } from './hooks/useLibrary';
import {
  ComponentCategoryVisual,
  getCategoryVisualMeta,
} from './components/ComponentCategoryVisual';
import {
  PinoutVisualDiagram,
  buildPinoutSvgDataUrl,
  getPinTypeStyle,
} from './components/PinoutVisualDiagram';
import { AllComponentProjectsModal } from './components/AllComponentProjectsModal';

export const ComponentDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: component, isLoading, isError } = useComponent(slug || '');

  const [headerImgFailed, setHeaderImgFailed] = useState(false);
  const [pinoutImgFailed, setPinoutImgFailed] = useState(false);
  const [wiringImgFailed, setWiringImgFailed] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    images: LightboxImageItem[];
    initialIndex: number;
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0,
  });

  useEffect(() => {
    setHeaderImgFailed(false);
    setPinoutImgFailed(false);
    setWiringImgFailed(false);
    setIsProjectsModalOpen(false);
    setLightboxState({ isOpen: false, images: [], initialIndex: 0 });
  }, [slug]);

  const galleryItems = useMemo<LightboxImageItem[]>(() => {
    if (!component) return [];
    const items: LightboxImageItem[] = [];

    if (component.imageUrl?.trim()) {
      items.push({
        src: component.imageUrl.trim(),
        alt: `${component.name} — Ümumi görünüş`,
        caption: `${component.name} — Ümumi görünüş`,
      });
    }

    if (component.pinoutImageUrl?.trim()) {
      items.push({
        src: component.pinoutImageUrl.trim(),
        alt: `${component.name} — Pinout diaqramı`,
        caption: `${component.name} — Pinout diaqramı`,
      });
    } else if (Array.isArray(component.pinout) && component.pinout.length > 0) {
      items.push({
        src: buildPinoutSvgDataUrl(component.name, component.pinout),
        alt: `${component.name} — Pinout diaqramı`,
        caption: `${component.name} — Pinout diaqramı`,
      });
    }

    if (component.wiringImageUrl?.trim()) {
      items.push({
        src: component.wiringImageUrl.trim(),
        alt: `${component.name} — Qoşulma sxemi`,
        caption: `${component.name} — Qoşulma sxemi`,
      });
    }

    return items;
  }, [component]);

  const openLightboxBySrc = (targetSrc: string, fallbackAlt: string) => {
    const idx = galleryItems.findIndex((item) => item.src === targetSrc);
    if (idx >= 0) {
      setLightboxState({
        isOpen: true,
        images: galleryItems,
        initialIndex: idx,
      });
      return;
    }

    setLightboxState({
      isOpen: true,
      images: [{ src: targetSrc, alt: fallbackAlt, caption: fallbackAlt }],
      initialIndex: 0,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-[#F8FAFC] min-h-[calc(100vh-12rem)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-56 bg-white border border-slate-200 rounded-2xl" />
          <div className="h-44 bg-white border border-slate-200 rounded-2xl" />
          <div className="h-44 bg-white border border-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !component) {
    return (
      <div className="bg-[#F8FAFC] min-h-[calc(100vh-12rem)]">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Komponent tapılmadı</h1>
          <p className="text-sm sm:text-base text-slate-500 mb-6">
            Axtardığınız komponent kitabxanada mövcud deyil və ya silinib.
          </p>
          <Link
            to="/library"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#147DF5] text-white rounded-xl font-semibold text-sm hover:bg-[#0C64E1] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kitabxanaya qayıt</span>
          </Link>
        </div>
      </div>
    );
  }

  const categoryMeta = getCategoryVisualMeta(component.category);
  const aliases = Array.isArray(component.aliases) ? component.aliases.filter(Boolean) : [];
  const applications = Array.isArray(component.applications) ? component.applications : [];
  const specs = Array.isArray(component.specs) ? component.specs : [];
  const pinout = Array.isArray(component.pinout) ? component.pinout : [];
  const pros = Array.isArray(component.pros) ? component.pros : [];
  const limitations = Array.isArray(component.limitations) ? component.limitations : [];
  const alternatives = Array.isArray(component.alternatives) ? component.alternatives : [];
  const featuredProjects = Array.isArray(component.featuredProjects)
    ? component.featuredProjects
    : [];
  const totalProjectsCount = component.totalProjectsCount ?? featuredProjects.length;

  const hasHeaderImage = Boolean(component.imageUrl?.trim() && !headerImgFailed);
  const hasPinoutImage = Boolean(component.pinoutImageUrl?.trim() && !pinoutImgFailed);
  const hasWiringImage = Boolean(component.wiringImageUrl?.trim() && !wiringImgFailed);
  const hasCodeExample = Boolean(component.codeExample?.code && component.codeExample.code.trim());

  const generatedPinoutUrl =
    !hasPinoutImage && pinout.length > 0 ? buildPinoutSvgDataUrl(component.name, pinout) : '';

  return (
    <div className="bg-[#F8FAFC] min-h-[calc(100vh-12rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-xs text-slate-500"
        >
          <Link to="/" className="hover:text-slate-900 transition-colors">
            Ana səhifə
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to="/library" className="hover:text-slate-900 transition-colors">
            Kitabxana
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link
            to={`/library?category=${encodeURIComponent(component.category)}`}
            className="hover:text-slate-900 transition-colors"
          >
            {component.categoryLabel || component.category}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold truncate max-w-xs">
            {component.name}
          </span>
        </nav>

        {/* Component Overview Header Card */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-card">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Visual / Image */}
            <div className="lg:col-span-4">
              <div className="aspect-[16/11] w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 relative group">
                {hasHeaderImage ? (
                  <button
                    type="button"
                    onClick={() =>
                      openLightboxBySrc(
                        component.imageUrl as string,
                        `${component.name} — Ümumi görünüş`,
                      )
                    }
                    aria-label={`${component.name} şəklini böyüt`}
                    className="w-full h-full block text-left focus:outline-none"
                  >
                    <img
                      src={component.imageUrl as string}
                      alt={component.name}
                      onError={() => setHeaderImgFailed(true)}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
                      <ZoomIn className="w-3.5 h-3.5 text-[#147DF5]" />
                      <span>Böyüt</span>
                    </span>
                  </button>
                ) : (
                  <ComponentCategoryVisual
                    category={component.category}
                    categoryLabel={component.categoryLabel}
                    name={component.name}
                  />
                )}
              </div>
            </div>

            {/* Summary Details */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full border ${categoryMeta.badgeClass}`}
                >
                  {component.categoryLabel || component.category}
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {specs.length} texniki göstərici
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {pinout.length} pin izahı
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-[#0C64E1]">
                  {totalProjectsCount} layihə
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {component.name}
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {component.shortDescription}
              </p>

              {aliases.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs font-semibold text-slate-500 mr-1">
                    Alternativ adlar:
                  </span>
                  {aliases.map((alias) => (
                    <span
                      key={alias}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/70"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              )}

              {/* Quick Section Navigation */}
              <div className="pt-2 flex flex-wrap gap-2">
                <a
                  href="#section-definition"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#147DF5] border border-slate-200 transition-colors"
                >
                  Tərif
                </a>
                <a
                  href="#section-specs"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#147DF5] border border-slate-200 transition-colors"
                >
                  Texniki göstəricilər
                </a>
                <a
                  href="#section-pinout"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#147DF5] border border-slate-200 transition-colors"
                >
                  Pinout
                </a>
                <a
                  href="#section-wiring"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#147DF5] border border-slate-200 transition-colors"
                >
                  Qoşulma və kod
                </a>
                <a
                  href="#section-projects"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#147DF5] border border-slate-200 transition-colors"
                >
                  Layihələr ({totalProjectsCount})
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 1. Nədir və nə işə yarayır? + 2. İş prinsipi */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevealSection
            as="section"
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-3"
          >
            <div id="section-definition" className="flex items-center gap-2.5 scroll-mt-24">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#147DF5] flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                1. Nədir və nə işə yarayır?
              </h2>
            </div>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {component.definition || component.shortDescription}
            </p>
          </RevealSection>

          <RevealSection
            as="section"
            delayMs={60}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Settings2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">2. İş prinsipi</h2>
            </div>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {component.workingPrinciple ||
                'Bu komponent üçün iş prinsipi izahı tezliklə əlavə ediləcək.'}
            </p>
          </RevealSection>
        </div>

        {/* 3. İstifadə sahələri və real tətbiqlər */}
        <RevealSection
          as="section"
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              3. İstifadə sahələri və real tətbiqlər
            </h2>
          </div>

          {applications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {applications.map((appItem, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80"
                >
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-700 leading-relaxed">{appItem}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Bu komponent üçün tətbiq sahələri siyahısı əlavə edilməyib.
            </p>
          )}
        </RevealSection>

        {/* 4. Texniki göstəricilər */}
        <RevealSection
          as="section"
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4"
        >
          <div id="section-specs" className="flex items-center gap-2.5 scroll-mt-24">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#147DF5] flex items-center justify-center flex-shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              4. Texniki göstəricilər
            </h2>
          </div>

          {specs.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <th className="px-4 py-3 w-1/3">Göstərici</th>
                    <th className="px-4 py-3">Dəyər / Xüsusiyyət</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {specs.map((spec, idx) => (
                    <tr key={`${spec.label}-${idx}`} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-800">{spec.label}</td>
                      <td className="px-4 py-3 text-slate-600">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Bu komponent üçün əlavə texniki göstərici cədvəli qeyd edilməyib.
            </p>
          )}
        </RevealSection>

        {/* 5. Pinout və pinlərin funksiyası */}
        <RevealSection
          as="section"
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-5"
        >
          <div
            id="section-pinout"
            className="flex flex-wrap items-center justify-between gap-3 scroll-mt-24"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                5. Pinout və pinlərin funksiyası
              </h2>
            </div>

            {hasPinoutImage && (
              <button
                type="button"
                onClick={() =>
                  openLightboxBySrc(
                    component.pinoutImageUrl as string,
                    `${component.name} — Pinout diaqramı`,
                  )
                }
                aria-label="Pinout şəklini böyüt"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-[#0C64E1] border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Sxemi böyüt</span>
              </button>
            )}
          </div>

          {hasPinoutImage && (
            <button
              type="button"
              onClick={() =>
                openLightboxBySrc(
                  component.pinoutImageUrl as string,
                  `${component.name} — Pinout diaqramı`,
                )
              }
              aria-label="Pinout diaqramı şəklini aç"
              className="relative group block w-full max-w-2xl rounded-xl overflow-hidden border border-slate-200 bg-slate-50 focus:outline-none"
            >
              <img
                src={component.pinoutImageUrl as string}
                alt={`${component.name} pinout diaqramı`}
                onError={() => setPinoutImgFailed(true)}
                className="w-full max-h-80 object-contain mx-auto p-3"
              />
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 border border-slate-200 text-xs font-semibold text-slate-800 shadow-sm group-hover:border-[#147DF5]">
                <ZoomIn className="w-3.5 h-3.5 text-[#147DF5]" />
                <span>Yaxınlaşdır</span>
              </span>
            </button>
          )}

          {!hasPinoutImage && pinout.length > 0 && (
            <PinoutVisualDiagram
              componentName={component.name}
              pinout={pinout}
              onZoom={() =>
                openLightboxBySrc(
                  generatedPinoutUrl,
                  `${component.name} — Pinout diaqramı`,
                )
              }
            />
          )}

          {pinout.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <th className="px-4 py-3">Pin</th>
                    <th className="px-4 py-3">Ad</th>
                    <th className="px-4 py-3">Növ</th>
                    <th className="px-4 py-3">Funksiya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {pinout.map((item, idx) => {
                    const style = getPinTypeStyle(item.type);
                    return (
                      <tr key={`${item.pin}-${idx}`} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {item.pin}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${style.badgeClass}`}
                          >
                            {style.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.function}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Bu komponent üçün pinout cədvəli əlavə edilməyib.
            </p>
          )}
        </RevealSection>

        {/* 6. Qoşulma qaydası və nümunə kodu */}
        <RevealSection
          as="section"
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-5"
        >
          <div
            id="section-wiring"
            className="flex flex-wrap items-center justify-between gap-3 scroll-mt-24"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#147DF5] flex items-center justify-center flex-shrink-0">
                <Cable className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                6. Qoşulma qaydası və nümunə kodu
              </h2>
            </div>

            {hasWiringImage && (
              <button
                type="button"
                onClick={() =>
                  openLightboxBySrc(
                    component.wiringImageUrl as string,
                    `${component.name} — Qoşulma sxemi`,
                  )
                }
                aria-label="Qoşulma sxemini böyüt"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-[#0C64E1] border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Qoşulma sxemini böyüt</span>
              </button>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
            {component.wiringGuide ||
              'Bu komponent üçün qoşulma təlimatı tezliklə əlavə ediləcək.'}
          </div>

          {hasWiringImage && (
            <button
              type="button"
              onClick={() =>
                openLightboxBySrc(
                  component.wiringImageUrl as string,
                  `${component.name} — Qoşulma sxemi`,
                )
              }
              aria-label="Qoşulma sxemi şəklini aç"
              className="relative group block w-full max-w-2xl rounded-xl overflow-hidden border border-slate-200 bg-slate-50 focus:outline-none"
            >
              <img
                src={component.wiringImageUrl as string}
                alt={`${component.name} qoşulma sxemi`}
                onError={() => setWiringImgFailed(true)}
                className="w-full max-h-80 object-contain mx-auto p-3"
              />
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 border border-slate-200 text-xs font-semibold text-slate-800 shadow-sm group-hover:border-[#147DF5]">
                <ZoomIn className="w-3.5 h-3.5 text-[#147DF5]" />
                <span>Yaxınlaşdır</span>
              </span>
            </button>
          )}

          {hasCodeExample && component.codeExample ? (
            <CodeBlockWithCopy
              code={component.codeExample.code}
              language={component.codeExample.language}
              title={component.codeExample.title || `${component.name} — Nümunə Kodu`}
              showLineNumbers
            />
          ) : (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-sm text-slate-600">
              <Code2 className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-800">Proqramlaşdırma kodu tələb olunmur</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Bu passiv/mexaniki komponent üçün proqramlaşdırma kodu tələb olunmur. Yuxarıdakı
                  qoşulma qaydası və texniki göstəricilərə uyğun dövrəyə qoşulur.
                </p>
              </div>
            </div>
          )}
        </RevealSection>

        {/* 7. Üstünlükləri, məhdudiyyətləri və alternativləri */}
        <RevealSection
          as="section"
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-6"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              7. Üstünlükləri, məhdudiyyətləri və alternativləri
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pros */}
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
              <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Üstünlükləri</span>
              </h3>
              {pros.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-700">
                  {pros.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">Üstünlüklər qeyd edilməyib.</p>
              )}
            </div>

            {/* Limitations */}
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Məhdudiyyətləri</span>
              </h3>
              {limitations.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-700">
                  {limitations.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">Məhdudiyyətlər qeyd edilməyib.</p>
              )}
            </div>
          </div>

          {/* Alternatives */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Repeat className="w-4 h-4 text-[#147DF5]" />
              <span>Alternativ komponentlər</span>
            </h3>
            {alternatives.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {alternatives.map((alt, idx) => {
                  const cleanAltSlug = alt.slug?.trim();
                  if (cleanAltSlug) {
                    return (
                      <Link
                        key={`${cleanAltSlug}-${idx}`}
                        to={`/library/${cleanAltSlug}`}
                        className="group p-4 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-[#147DF5] transition-all flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm text-slate-900 group-hover:text-[#147DF5] transition-colors">
                            {alt.name}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#147DF5] flex-shrink-0 transition-colors" />
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{alt.reason}</p>
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={`${alt.name}-${idx}`}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5"
                    >
                      <span className="font-bold text-sm text-slate-900 block">{alt.name}</span>
                      <p className="text-xs text-slate-600 leading-relaxed">{alt.reason}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Alternativ komponent qeyd edilməyib.</p>
            )}
          </div>
        </RevealSection>

        {/* 8. Bu komponentlə hazırlanan seçilmiş layihələr */}
        <RevealSection
          as="section"
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-5"
        >
          <div
            id="section-projects"
            className="flex flex-wrap items-center justify-between gap-3 scroll-mt-24"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#147DF5] flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  8. Bu komponentlə hazırlanan seçilmiş layihələr
                </h2>
                <p className="text-xs text-slate-500">
                  {totalProjectsCount > 0
                    ? `Ümumilikdə ${totalProjectsCount} layihədə istifadə olunur`
                    : 'Hələ əlaqəli layihə yoxdur'}
                </p>
              </div>
            </div>

            {totalProjectsCount > 0 && (
              <button
                type="button"
                onClick={() => setIsProjectsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#147DF5] hover:bg-[#0C64E1] text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"
              >
                <span>Bütün layihələri gör ({totalProjectsCount})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {totalProjectsCount === 0 || featuredProjects.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <FolderOpen className="w-9 h-9 text-slate-400 mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-slate-700">
                Bu komponentlə hələ layihə əlavə edilməyib
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Digər elektronika layihələrinə baxmaq üçün kataloqa keçə bilərsiniz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredProjects.map((project) => (
                <ProjectCard key={project._id || project.id || project.slug} project={project} />
              ))}
            </div>
          )}
        </RevealSection>
      </div>

      {/* Lightbox Image / Schematic Modal */}
      <LightboxImageModal
        isOpen={lightboxState.isOpen}
        onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
        src={lightboxState.images[lightboxState.initialIndex]?.src || ''}
        alt={lightboxState.images[lightboxState.initialIndex]?.alt || component.name}
        caption={lightboxState.images[lightboxState.initialIndex]?.caption}
        images={lightboxState.images}
        initialIndex={lightboxState.initialIndex}
      />

      {/* All Component Projects Paginated Modal */}
      <AllComponentProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        componentSlug={component.slug}
        componentName={component.name}
      />
    </div>
  );
};

export default ComponentDetailPage;
