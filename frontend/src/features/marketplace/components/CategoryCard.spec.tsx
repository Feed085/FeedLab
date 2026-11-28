import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CategoryCard } from './CategoryCard';

describe('CategoryCard Component', () => {
  it('renders category title and links to filtered catalog', () => {
    render(
      <MemoryRouter>
        <CategoryCard
          category={{
            _id: 'cat-1',
            name: 'Ağıllı Ev',
            slug: 'smart-home',
            icon: 'home',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Ağıllı Ev' });
    expect(link.getAttribute('href')).toBe('/catalog?category=smart-home');
  });

  it('renders 8th category slugs without error', () => {
    render(
      <MemoryRouter>
        <CategoryCard
          category={{
            _id: 'cat-8',
            name: 'Məktəbli',
            slug: 'mektebli',
            icon: 'graduation-cap',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Məktəbli' });
    expect(link.getAttribute('href')).toBe('/catalog?category=mektebli');
  });
});
