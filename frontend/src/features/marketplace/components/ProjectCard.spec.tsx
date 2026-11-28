import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectCard } from './ProjectCard';
import type { Project } from '../types';

describe('ProjectCard Component', () => {
  const samplePaidProject: Project = {
    _id: 'proj-1',
    title: 'Ağıllı İstixana Sistemi (ESP32)',
    slug: 'agilli-istixana-sistemi-esp32',
    shortDescription: 'ESP32 əsaslı avtomatlaşdırılmış istixana monitorinqi və idarəetməsi.',
    price: 25.0,
    currency: 'AZN',
    category: { _id: 'cat-1', name: 'IoT / Ağıllı Ev', slug: 'smart-home' },
    technologies: [
      { _id: 'tech-1', name: 'ESP32', slug: 'esp32' },
      { _id: 'tech-2', name: 'MQTT', slug: 'mqtt' },
    ],
    author: { _id: 'author-1', fullName: 'Əli Məmmədov' },
    status: 'APPROVED',
    featured: true,
    rating: 4.8,
    salesCount: 14,
    createdAt: '2026-11-24T00:00:00.000Z',
  };

  const sampleFreeProject: Project = {
    ...samplePaidProject,
    _id: 'proj-2',
    title: 'Avtonom Bitki Suvarma Sistemi',
    slug: 'avtonom-bitki-suvarma-ve-torpaq-rutubeti',
    price: 0,
    featured: false,
  };

  it('renders title, description, category and technology tags', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={samplePaidProject} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Ağıllı İstixana Sistemi (ESP32)')).toBeDefined();
    expect(
      screen.getByText('ESP32 əsaslı avtomatlaşdırılmış istixana monitorinqi və idarəetməsi.'),
    ).toBeDefined();
    expect(screen.getByText('IoT / Ağıllı Ev')).toBeDefined();
    expect(screen.getByText('ESP32')).toBeDefined();
    expect(screen.getByText('MQTT')).toBeDefined();
  });

  it('renders formatted AZN price when price > 0', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={samplePaidProject} />
      </MemoryRouter>,
    );

    expect(screen.getByText('25.00 AZN')).toBeDefined();
  });

  it('renders "Pulsuz" badge when price === 0', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={sampleFreeProject} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Pulsuz')).toBeDefined();
  });

  it('renders author name, rating, and sales count', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={samplePaidProject} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Əli Məmmədov')).toBeDefined();
    expect(screen.getByText('4.8')).toBeDefined();
    expect(screen.getByText('14')).toBeDefined();
  });

  it('links to project details page by slug', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={samplePaidProject} />
      </MemoryRouter>,
    );

    const titleLink = screen.getByRole('link', { name: 'Ağıllı İstixana Sistemi (ESP32)' });
    expect(titleLink.getAttribute('href')).toBe('/projects/agilli-istixana-sistemi-esp32');
  });

  it('maps plant-watering project slug to /images/project-plant-watering.jpg and falls back on error', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={sampleFreeProject} />
      </MemoryRouter>,
    );

    const img = screen.getByAltText('Avtonom Bitki Suvarma Sistemi') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/images/project-plant-watering.jpg');

    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe('/images/project-default-electronics.svg');
  });

  it('handles live backend serialization where category is a string slug and categoryId/authorId are objects', () => {
    const liveSerializedProject: Project = {
      ...samplePaidProject,
      category: 'sensors' as unknown as Project['category'],
      categoryId: { _id: 'cat-2', name: 'Sensorlar', slug: 'sensors' },
      author: undefined,
      authorId: { _id: 'auth-2', fullName: 'Nigar Hüseynova' },
    };

    render(
      <MemoryRouter>
        <ProjectCard project={liveSerializedProject} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Sensorlar')).toBeDefined();
    expect(screen.getByText('Nigar Hüseynova')).toBeDefined();
  });

  it('renders "0.0" (not "5.0") when rating is 0 or missing', () => {
    const unratedProject: Project = {
      ...samplePaidProject,
      rating: 0,
    };

    const { rerender } = render(
      <MemoryRouter>
        <ProjectCard project={unratedProject} />
      </MemoryRouter>,
    );

    expect(screen.getByText('0.0')).toBeDefined();
    expect(screen.queryByText('5.0')).toBeNull();

    rerender(
      <MemoryRouter>
        <ProjectCard project={{ ...samplePaidProject, rating: undefined as unknown as number }} />
      </MemoryRouter>,
    );

    expect(screen.getByText('0.0')).toBeDefined();
    expect(screen.queryByText('5.0')).toBeNull();
  });

  it('safely ignores unpopulated or partial technology entries without throwing', () => {
    const partialTechProject: Project = {
      ...samplePaidProject,
      technologies: [
        '6744f001aabbccddeeff0011' as unknown as NonNullable<Project['technologies']>[number],
        null as unknown as NonNullable<Project['technologies']>[number],
        { _id: 'tech-empty', name: '   ', slug: 'empty' },
        { _id: 'tech-valid', name: 'Arduino', slug: 'arduino' },
      ],
    };

    render(
      <MemoryRouter>
        <ProjectCard project={partialTechProject} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Arduino')).toBeDefined();
    expect(screen.getByText('IoT / Ağıllı Ev')).toBeDefined();
  });
});
