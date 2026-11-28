import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from './Footer';

describe('Footer Component', () => {
  it('renders brand info, useful links, legal links, and localized metadata', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByText('Feed Lab')).toBeDefined();
    expect(screen.getByText(/FEED Agency ekosisteminin mühəndislik layihələri/i)).toBeDefined();

    expect(screen.getByRole('link', { name: 'Kataloq' }).getAttribute('href')).toBe('/catalog');
    expect(screen.getByRole('link', { name: 'Kateqoriyalar' }).getAttribute('href')).toBe(
      '/categories',
    );
    expect(screen.getByRole('link', { name: 'Pulsuz Layihələr' }).getAttribute('href')).toBe(
      '/catalog?freeOnly=true',
    );
    expect(
      screen.getByRole('link', { name: 'Komponentlərimlə Tap' }).getAttribute('href'),
    ).toBe('/component-finder');
    expect(screen.getByRole('link', { name: 'Kitabxana' }).getAttribute('href')).toBe('/library');
    expect(screen.getByRole('link', { name: 'Müəlliflər' }).getAttribute('href')).toBe('/authors');

    expect(screen.getByRole('link', { name: 'İstifadəçi şərtləri' }).getAttribute('href')).toBe(
      '/terms',
    );
    expect(screen.getByRole('link', { name: 'Məxfilik siyasəti' }).getAttribute('href')).toBe(
      '/privacy',
    );
    expect(
      screen.getByRole('link', { name: 'Şəxsi İstifadə Lisenziyası' }).getAttribute('href'),
    ).toBe('/license');
    expect(screen.getByRole('link', { name: 'Tez-tez verilən suallar' }).getAttribute('href')).toBe(
      '/faq',
    );

    expect(screen.getByText('© 2026 Feed Lab')).toBeDefined();
    expect(screen.getByText('AZN (₼)')).toBeDefined();
    expect(screen.getByText('Azərbaycan')).toBeDefined();
  });
});
