import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

export interface LightboxImageItem {
  src: string;
  alt: string;
  caption?: string;
}

export interface LightboxImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt: string;
  caption?: string;
  images?: LightboxImageItem[];
  initialIndex?: number;
}

const ZOOM_LEVELS = [1, 1.5, 2] as const;

export const LightboxImageModal: React.FC<LightboxImageModalProps> = ({
  isOpen,
  onClose,
  src,
  alt,
  caption,
  images,
  initialIndex = 0,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const imgRef = useRef<HTMLImageElement>(null);

  const hasGallery = Boolean(images && images.length > 1);
  const galleryItems: LightboxImageItem[] =
    images && images.length > 0 ? images : [{ src, alt, caption }];

  const [activeIndex, setActiveIndex] = useState<number>(() =>
    Math.min(Math.max(0, initialIndex), galleryItems.length - 1),
  );
  const [zoomIndex, setZoomIndex] = useState<number>(0);
  const [baseSize, setBaseSize] = useState<{ width: number; height: number } | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);

  const activeItem = galleryItems[activeIndex] || { src, alt, caption };
  const zoomScale = ZOOM_LEVELS[zoomIndex];

  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex(Math.min(Math.max(0, initialIndex), galleryItems.length - 1));
    setZoomIndex(0);
    setBaseSize(null);
    setHasError(false);
  }, [isOpen, initialIndex, src, galleryItems.length]);

  useEffect(() => {
    setHasError(false);
    setZoomIndex(0);
    setBaseSize(null);
  }, [activeIndex, activeItem.src]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      } else if (hasGallery && event.key === 'ArrowRight') {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % galleryItems.length);
      } else if (hasGallery && event.key === 'ArrowLeft') {
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, hasGallery, galleryItems.length]);

  if (!isOpen) return null;

  const captureBaseSize = () => {
    if (zoomIndex === 0 && imgRef.current) {
      const { clientWidth, clientHeight } = imgRef.current;
      if (clientWidth > 0 && clientHeight > 0) {
        setBaseSize({ width: clientWidth, height: clientHeight });
      }
    }
  };

  const handleZoomIn = () => {
    captureBaseSize();
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  };

  const handleZoomOut = () => {
    setZoomIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      if (next === 0) setBaseSize(null);
      return next;
    });
  };

  const handleZoomCycle = () => {
    const next = (zoomIndex + 1) % ZOOM_LEVELS.length;
    if (next === 0) {
      setBaseSize(null);
    } else {
      captureBaseSize();
    }
    setZoomIndex(next);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={activeItem.alt || 'Böyüdülmüş şəkil'}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in"
    >
      {/* Top Toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between gap-3 bg-white/95 border border-slate-200 rounded-xl px-4 py-2.5 shadow-lg mb-3 max-w-5xl w-full mx-auto"
      >
        <div className="min-w-0 flex items-center gap-3">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {activeItem.caption || activeItem.alt}
          </p>
          {hasGallery && (
            <span className="text-xs font-medium text-slate-500 flex-shrink-0">
              {activeIndex + 1} / {galleryItems.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomIndex === 0}
            aria-label="Kiçilt"
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomCycle}
            aria-label="Yaxınlaşdırma dərəcəsi"
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors min-w-[3rem]"
          >
            {zoomScale}x
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            aria-label="Böyüt"
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {zoomIndex > 0 && (
            <button
              type="button"
              onClick={() => {
                setZoomIndex(0);
                setBaseSize(null);
              }}
              aria-label="Ölçünü sıfırla"
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Bağla"
            className="ml-1 p-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image Viewport */}
      <div className="relative flex-1 flex items-center justify-center min-h-0 max-w-6xl w-full mx-auto">
        {hasGallery && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
            }}
            aria-label="Əvvəlki şəkil"
            className="z-10 mr-2 p-2.5 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-lg border border-slate-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-full max-h-full overflow-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-2 sm:p-4 flex"
        >
          {hasError ? (
            <div className="m-auto flex flex-col items-center justify-center py-16 px-10 text-center">
              <ImageOff className="w-10 h-10 text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-700">Şəkil yüklənə bilmədi</p>
            </div>
          ) : (
            <img
              ref={imgRef}
              src={activeItem.src}
              alt={activeItem.alt}
              onError={() => setHasError(true)}
              style={
                zoomScale === 1
                  ? undefined
                  : baseSize
                    ? {
                        width: `${Math.round(baseSize.width * zoomScale)}px`,
                        height: `${Math.round(baseSize.height * zoomScale)}px`,
                        maxWidth: 'none',
                        maxHeight: 'none',
                      }
                    : {
                        transform: `scale(${zoomScale})`,
                        transformOrigin: 'top left',
                      }
              }
              className={`m-auto block object-contain rounded-lg transition-all duration-200 select-none ${
                zoomScale === 1 ? 'max-w-[88vw] max-h-[76vh]' : ''
              }`.trim()}
            />
          )}
        </div>

        {hasGallery && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex((prev) => (prev + 1) % galleryItems.length);
            }}
            aria-label="Növbəti şəkil"
            className="z-10 ml-2 p-2.5 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-lg border border-slate-200 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
