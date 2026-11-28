import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RevealSection } from './RevealSection';

describe('RevealSection Component', () => {
  const originalIntersectionObserver = globalThis.IntersectionObserver;
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver;
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('defaults to visible when IntersectionObserver is unavailable (jsdom)', () => {
    // @ts-expect-error testing missing global
    delete globalThis.IntersectionObserver;

    const { container } = render(
      <RevealSection>
        <p>Görünən bölmə</p>
      </RevealSection>,
    );

    expect(screen.getByText('Görünən bölmə')).toBeDefined();
    expect(container.firstElementChild?.getAttribute('data-reveal')).toBe('visible');
    expect(container.firstElementChild?.className).toContain('reveal-visible');
  });

  it('reveals immediately when prefers-reduced-motion is reduce', () => {
    globalThis.IntersectionObserver = vi.fn() as unknown as typeof IntersectionObserver;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(
      <RevealSection>
        <p>Azaldılmış hərəkət</p>
      </RevealSection>,
    );

    expect(container.firstElementChild?.getAttribute('data-reveal')).toBe('visible');
  });

  it('observes element and reveals when IntersectionObserver reports intersection', () => {
    let observerCallback: IntersectionObserverCallback | null = null;
    const observeMock = vi.fn();
    const unobserveMock = vi.fn();
    const disconnectMock = vi.fn();

    globalThis.IntersectionObserver = vi.fn((cb: IntersectionObserverCallback) => {
      observerCallback = cb;
      return {
        observe: observeMock,
        unobserve: unobserveMock,
        disconnect: disconnectMock,
        root: null,
        rootMargin: '',
        thresholds: [],
        takeRecords: () => [],
      } as IntersectionObserver;
    }) as unknown as typeof IntersectionObserver;

    const { container, unmount } = render(
      <RevealSection delayMs={100} as="section">
        <p>Scroll bölməsi</p>
      </RevealSection>,
    );

    const section = container.firstElementChild as HTMLElement;
    expect(section.tagName).toBe('SECTION');
    expect(section.getAttribute('data-reveal')).toBe('hidden');
    expect(observeMock).toHaveBeenCalledWith(section);

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true, target: section } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(section.getAttribute('data-reveal')).toBe('visible');
    expect(section.style.transitionDelay).toBe('100ms');
    expect(unobserveMock).toHaveBeenCalledWith(section);

    unmount();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('preserves transitionDelay when revealed and clears it when hidden if once=false', () => {
    let observerCallback: IntersectionObserverCallback | null = null;
    globalThis.IntersectionObserver = vi.fn((cb: IntersectionObserverCallback) => {
      observerCallback = cb;
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
        root: null,
        rootMargin: '',
        thresholds: [],
        takeRecords: () => [],
      } as IntersectionObserver;
    }) as unknown as typeof IntersectionObserver;

    const { container } = render(
      <RevealSection delayMs={150} once={false}>
        <p>Gecikməli bölmə</p>
      </RevealSection>,
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute('data-reveal')).toBe('hidden');
    expect(wrapper.style.transitionDelay).toBe('');

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true, target: wrapper } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(wrapper.getAttribute('data-reveal')).toBe('visible');
    expect(wrapper.style.transitionDelay).toBe('150ms');
  });

  it('handles partial window.matchMedia returning undefined without throwing', () => {
    let observerCallback: IntersectionObserverCallback | null = null;
    globalThis.IntersectionObserver = vi.fn((cb: IntersectionObserverCallback) => {
      observerCallback = cb;
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
        root: null,
        rootMargin: '',
        thresholds: [],
        takeRecords: () => [],
      } as IntersectionObserver;
    }) as unknown as typeof IntersectionObserver;

    window.matchMedia = vi.fn().mockReturnValue(undefined) as unknown as typeof window.matchMedia;

    const { container } = render(
      <RevealSection>
        <p>Təhlükəsiz matchMedia</p>
      </RevealSection>,
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute('data-reveal')).toBe('hidden');

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true, target: wrapper } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(wrapper.getAttribute('data-reveal')).toBe('visible');
  });
});
