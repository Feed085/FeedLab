import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LightboxImageModal } from './LightboxImageModal';

describe('LightboxImageModal Component', () => {
  it('renders nothing when closed', () => {
    render(
      <LightboxImageModal
        isOpen={false}
        onClose={vi.fn()}
        src="/images/hero-esp32.jpg"
        alt="ESP32"
      />,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens, supports zoom toggle with scrollable container layout, and closes on Escape key', () => {
    const onClose = vi.fn();
    render(
      <LightboxImageModal
        isOpen={true}
        onClose={onClose}
        src="/images/hero-esp32.jpg"
        alt="ESP32 Sxem"
        caption="ESP32 Pinout"
      />,
    );

    expect(screen.getByRole('dialog', { name: 'ESP32 Sxem' })).toBeDefined();
    expect(screen.getByText('ESP32 Pinout')).toBeDefined();

    const img = screen.getByAltText('ESP32 Sxem') as HTMLImageElement;
    const scrollContainer = img.parentElement as HTMLElement;
    expect(scrollContainer.className).toContain('overflow-auto');
    expect(scrollContainer.className).not.toContain('items-center');
    expect(scrollContainer.className).not.toContain('justify-center');
    expect(img.className).toContain('m-auto');

    const zoomBtn = screen.getByRole('button', { name: 'Yaxınlaşdırma dərəcəsi' });
    expect(zoomBtn.textContent).toBe('1x');
    fireEvent.click(zoomBtn);
    expect(zoomBtn.textContent).toBe('1.5x');
    expect(img.style.transformOrigin).not.toBe('center center');
    fireEvent.click(zoomBtn);
    expect(zoomBtn.textContent).toBe('2x');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cycles gallery images with ArrowRight / ArrowLeft and shows broken image fallback', () => {
    const onClose = vi.fn();
    render(
      <LightboxImageModal
        isOpen={true}
        onClose={onClose}
        src="/images/hero-esp32.jpg"
        alt="Birinci şəkil"
        images={[
          { src: '/images/hero-esp32.jpg', alt: 'Birinci şəkil' },
          { src: '/images/missing.jpg', alt: 'İkinci şəkil' },
        ]}
      />,
    );

    expect(screen.getByText('1 / 2')).toBeDefined();

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByText('2 / 2')).toBeDefined();

    const img = screen.getByAltText('İkinci şəkil');
    fireEvent.error(img);
    expect(screen.getByText('Şəkil yüklənə bilmədi')).toBeDefined();
  });

  it('preserves focus across parent re-renders with inline onClose and invokes latest onClose on Escape', () => {
    vi.useFakeTimers();
    const firstClose = vi.fn();
    const latestClose = vi.fn();

    const { rerender } = render(
      <LightboxImageModal
        isOpen={true}
        onClose={() => firstClose()}
        src="/images/hero-esp32.jpg"
        alt="ESP32 Sxem"
      />,
    );

    act(() => {
      vi.runAllTimers();
    });

    const zoomBtn = screen.getByRole('button', { name: 'Yaxınlaşdırma dərəcəsi' });
    zoomBtn.focus();
    expect(document.activeElement).toBe(zoomBtn);

    rerender(
      <LightboxImageModal
        isOpen={true}
        onClose={() => latestClose()}
        src="/images/hero-esp32.jpg"
        alt="ESP32 Sxem"
      />,
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(document.activeElement).toBe(zoomBtn);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(firstClose).not.toHaveBeenCalled();
    expect(latestClose).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
