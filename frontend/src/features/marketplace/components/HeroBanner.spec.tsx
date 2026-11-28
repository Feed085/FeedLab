import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HeroBanner } from './HeroBanner';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('HeroBanner Component', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders Azerbaijani heading, subtitle, hero image, and floating cards', () => {
    render(
      <MemoryRouter>
        <HeroBanner />
      </MemoryRouter>,
    );

    expect(screen.getByText('Öz Elektronika Cihazını Özün Yığ və Öyrən')).toBeDefined();
    expect(
      screen.getByText('Sxemini, kodunu və materiallarını əldə et, sıfırdan hazırla.'),
    ).toBeDefined();
    expect(screen.getByText('BOM')).toBeDefined();

    const img = screen.getByAltText(/ESP32 mikrokontroller/i);
    expect(img.getAttribute('src')).toBe('/images/hero-esp32.jpg');
  });

  it('navigates to /catalog?q=... on non-empty search and /catalog on empty search', () => {
    render(
      <MemoryRouter>
        <HeroBanner />
      </MemoryRouter>,
    );

    const submitBtn = screen.getByRole('button', { name: 'Axtar' });
    fireEvent.click(submitBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/catalog');

    const input = screen.getByPlaceholderText(/Layihə adı, açar söz/i);
    fireEvent.change(input, { target: { value: 'ESP32 + Wi-Fi' } });
    fireEvent.click(submitBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/catalog?q=ESP32%20%2B%20Wi-Fi');
  });

  it('navigates on primary and secondary CTA button clicks', () => {
    render(
      <MemoryRouter>
        <HeroBanner />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Layihələri Kəşf Et/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/catalog');

    fireEvent.click(screen.getByRole('button', { name: /Komponentlərimlə Tap/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/component-finder');
  });
});
