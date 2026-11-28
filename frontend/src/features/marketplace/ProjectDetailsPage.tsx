import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Star,
  ShoppingBag,
  Eye,
  Download,
  CheckCircle,
  HelpCircle,
  Shield,
  LogIn,
  Check,
  AlertCircle,
  ArrowLeft,
  Loader2,
  ZoomIn,
} from 'lucide-react';
import { useProject } from './hooks/useProject';
import { useClaimFreeProject } from './hooks/useClaimFreeProject';
import { TechnicalTabs } from './components/TechnicalTabs';
import { resolveProjectImage } from './components/ProjectCard';
import { LightboxImageModal, type LightboxImageItem } from '@/components/common/LightboxImageModal';
import { CheckoutModal } from '../orders/components/CheckoutModal';
import { ProjectReviewsSection } from '../reviews/components/ProjectReviewsSection';
import { useAuth } from '@/hooks/useAuth';
import { formatAZN } from '@/i18n/currency';
import { az } from '@/i18n/az';

export const ProjectDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const { data: project, isLoading, isError } = useProject(slug || '');
  const claimMutation = useClaimFreeProject();

  const [claimSuccess, setClaimSuccess] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const category = useMemo(() => {
    if (!project) return null;
    if (typeof project.category === 'object' && project.category !== null) {
      return project.category;
    }
    if (typeof project.categoryId === 'object' && project.categoryId !== null) {
      return project.categoryId;
    }
    return null;
  }, [project]);

  const galleryImages = useMemo<LightboxImageItem[]>(() => {
    if (!project) return [];
    const seen = new Set<string>();
    const items: LightboxImageItem[] = [];

    const addImage = (src?: string | null, caption?: string) => {
      const trimmed = src?.trim();
      if (!trimmed || seen.has(trimmed)) return;
      seen.add(trimmed);
      items.push({
        src: trimmed,
        alt: caption ? `${project.title} — ${caption}` : project.title,
        caption: caption || project.title,
      });
    };

    if (project.thumbnailUrl) addImage(project.thumbnailUrl, project.title);
    project.images?.forEach((imgUrl, idx) => addImage(imgUrl, `${project.title} (${idx + 1})`));
    project.publicFiles?.forEach((file) => {
      if (file.url && file.fileType?.startsWith('image/')) {
        addImage(file.url, file.originalName);
      }
    });

    if (items.length === 0) {
      addImage(resolveProjectImage(project, category), project.title);
    }

    return items;
  }, [project, category]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="h-10 bg-slate-200 rounded w-3/4" />
          <div className="h-40 bg-slate-200 rounded" />
          <div className="h-96 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {az.projectDetails.notFoundTitle}
        </h2>
        <p className="text-slate-500 mb-6">{az.projectDetails.notFoundDesc}</p>
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{az.projectDetails.backToCatalog}</span>
        </Link>
      </div>
    );
  }

  const isFree = project.price === 0;
  const author =
    typeof project.author === 'object' && project.author !== null
      ? project.author
      : typeof project.authorId === 'object' && project.authorId !== null
        ? project.authorId
        : null;
  const resolvedAuthorId =
    author?._id ||
    author?.id ||
    (typeof project.authorId === 'string' ? project.authorId : undefined);
  const resolvedRating =
    typeof project.rating === 'number' && Number.isFinite(project.rating)
      ? project.rating.toFixed(1)
      : '0.0';
  const difficultyLabel = project.difficulty
    ? az.marketplace.difficulties[project.difficulty]
    : null;

  const handleClaimFree = async () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    try {
      await claimMutation.mutateAsync(project._id || project.id || '');
      setClaimSuccess(true);
    } catch {
      // Error handled by mutation state
    }
  };

  const handleBuyNow = () => {
    setIsCheckoutOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <nav aria-label="Naviqasiya yolu" className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-slate-800 transition-colors">
          {az.projectDetails.breadcrumbs.home}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to="/catalog" className="hover:text-slate-800 transition-colors">
          {az.projectDetails.breadcrumbs.catalog}
        </Link>
        {category && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link
              to={`/catalog?category=${category.slug}`}
              className="hover:text-slate-800 transition-colors"
            >
              {category.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-800 font-medium truncate max-w-xs">{project.title}</span>
      </nav>

      {/* Hero Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {category && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              {category.name}
            </span>
          )}
          {difficultyLabel && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {difficultyLabel}
            </span>
          )}
          {project.domains?.map((domain) => (
            <Link
              key={domain}
              to={`/catalog?domain=${encodeURIComponent(domain)}`}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              {domain}
            </Link>
          ))}
          {project.technologies?.map((tech) => (
            <span
              key={tech._id || tech.slug}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700"
            >
              {tech.name}
            </span>
          ))}
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
          {project.title}
        </h1>

        <p className="text-base text-slate-600 max-w-4xl leading-relaxed">
          {project.shortDescription}
        </p>

        {/* Stats & Author Bar */}
        <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
              {author?.fullName ? author.fullName.charAt(0).toUpperCase() : 'M'}
            </div>
            <span className="text-slate-700 font-medium">
              {author?.fullName || 'Feed Lab Müəllifi'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-amber-500 font-semibold">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{resolvedRating}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-slate-400" />
            <span>{project.salesCount || 0} {az.marketplace.sales}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-slate-400" />
            <span>{project.viewsCount || 0} baxış</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Technical Tabs (Left) & Purchase Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Preview Gallery, Technical Tabs & Reviews */}
        <div className="lg:col-span-2 space-y-8">
          {galleryImages.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
              <div className="relative group aspect-[16/9] w-full overflow-hidden rounded-xl bg-slate-100">
                <img
                  src={galleryImages[0].src}
                  alt={galleryImages[0].alt}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                <button
                  type="button"
                  onClick={() => setLightboxIndex(0)}
                  aria-label="Şəkli böyüt"
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold border border-slate-200 shadow-sm transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-[#147DF5]" />
                  <span>Böyüt</span>
                </button>
              </div>

              {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={img.src}
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      aria-label={`Şəkil ${idx + 1} böyüt`}
                      className="relative w-20 h-14 rounded-lg overflow-hidden border border-slate-200 hover:border-[#147DF5] flex-shrink-0 transition-colors"
                    >
                      <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <TechnicalTabs project={project} />
          <ProjectReviewsSection
            projectId={project._id || project.id || ''}
            authorId={resolvedAuthorId}
          />
        </div>

        {/* Right Column: Pricing & Purchase Card */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            {/* Price Header */}
            <div className="pb-4 border-b border-slate-100">
              <div className="text-xs text-slate-500 mb-1">{az.currency.price}</div>
              {isFree ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-600">
                    {az.common.free}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    0 AZN
                  </span>
                </div>
              ) : (
                <div className="text-3xl font-extrabold text-slate-900">
                  {formatAZN(project.price, { useCode: true })}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isFree ? (
              <div className="space-y-3">
                {claimSuccess ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <Check className="w-5 h-5 text-emerald-600" />
                      <span>{az.projectDetails.actions.claimedSuccess}</span>
                    </div>
                    <Link
                      to="/orders/my"
                      className="block text-center w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      {az.projectDetails.actions.viewInOrders}
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleClaimFree}
                    disabled={claimMutation.isPending}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {claimMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{az.projectDetails.actions.claiming}</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>{az.projectDetails.actions.claimFree}</span>
                      </>
                    )}
                  </button>
                )}

                {/* Login Prompt Warning if Unauthenticated */}
                {showLoginPrompt && !isAuthenticated && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                    <div className="font-bold text-amber-900">
                      {az.projectDetails.actions.loginRequiredTitle}
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      {az.projectDetails.actions.loginRequiredDesc}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/login?redirect=/projects/${project.slug}`)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{az.projectDetails.actions.loginAction}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{az.projectDetails.actions.buyNow}</span>
                </button>
              </div>
            )}

            {/* Guarantees Checklist */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{az.projectDetails.guarantee.instantDownload}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-brand-600 flex-shrink-0" />
                <span>{az.projectDetails.guarantee.verifiedFiles}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-[#147DF5] flex-shrink-0" />
                <span>{az.projectDetails.guarantee.authorSupport}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{az.projectDetails.guarantee.license}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        project={project}
      />

      {/* Lightbox Image Modal */}
      {lightboxIndex !== null && galleryImages.length > 0 && (
        <LightboxImageModal
          isOpen={true}
          onClose={() => setLightboxIndex(null)}
          src={galleryImages[lightboxIndex]?.src || galleryImages[0].src}
          alt={galleryImages[lightboxIndex]?.alt || project.title}
          caption={galleryImages[lightboxIndex]?.caption}
          images={galleryImages}
          initialIndex={lightboxIndex}
        />
      )}
    </div>
  );
};
