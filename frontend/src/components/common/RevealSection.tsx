import React, { useEffect, useRef, useState } from 'react';

export interface RevealSectionProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  threshold?: number;
  once?: boolean;
  as?: 'div' | 'section' | 'article';
}

function shouldRevealImmediately(): boolean {
  if (typeof window === 'undefined') return true;
  if (typeof IntersectionObserver === 'undefined') return true;
  if (
    typeof window.matchMedia === 'function' &&
    Boolean(window.matchMedia('(prefers-reduced-motion: reduce)')?.matches)
  ) {
    return true;
  }
  return false;
}

export const RevealSection: React.FC<RevealSectionProps> = ({
  children,
  className = '',
  delayMs = 0,
  threshold = 0.05,
  once = true,
  as = 'div',
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(() => shouldRevealImmediately());

  useEffect(() => {
    if (shouldRevealImmediately()) {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once) {
            setIsVisible(false);
          }
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -20px 0px',
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, once]);

  const Component = as;
  const delayStyle: React.CSSProperties | undefined =
    isVisible && delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined;

  return (
    <Component
      ref={ref as React.RefObject<HTMLDivElement>}
      style={delayStyle}
      data-reveal={isVisible ? 'visible' : 'hidden'}
      className={`reveal-base ${isVisible ? 'reveal-visible' : ''} ${className}`.trim()}
    >
      {children}
    </Component>
  );
};
