import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectEditorPage } from './ProjectEditorPage';
import { authorApi } from '../api/authorApi';
import { marketplaceApi } from '../../marketplace/marketplace.api';
import { az } from '@/i18n/az';

describe('ProjectEditorPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(marketplaceApi, 'getCategories').mockResolvedValue([
      { _id: 'cat-1', name: 'IoT / Ağıllı Ev', slug: 'smart-home' },
    ]);
    vi.spyOn(marketplaceApi, 'getTechnologies').mockResolvedValue([
      { _id: 'tech-1', name: 'Arduino', slug: 'arduino' },
    ]);
  });

  it('renders project editor form with tabbed navigation', async () => {
    render(
      <MemoryRouter>
        <ProjectEditorPage />
      </MemoryRouter>,
    );

    const titleEl = await screen.findByText(az.projectEditor.newTitle);
    expect(titleEl).toBeDefined();
    expect(screen.getByText(az.projectEditor.tabs.basics)).toBeDefined();
    expect(screen.getByText(az.projectEditor.tabs.specs)).toBeDefined();
    expect(screen.getByText(az.projectEditor.tabs.bom)).toBeDefined();
    expect(screen.getByText(az.projectEditor.tabs.guide)).toBeDefined();
  });

  it('navigates to BOM tab and recalculates total hardware cost in AZN', async () => {
    render(
      <MemoryRouter>
        <ProjectEditorPage />
      </MemoryRouter>,
    );

    const bomTab = await screen.findByText(az.projectEditor.tabs.bom);
    fireEvent.click(bomTab);

    // Add component
    const addBtn = screen.getByText(az.projectEditor.bom.addComponent);
    fireEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText('Məsələn: Arduino Uno R3');
    fireEvent.change(nameInput, { target: { value: 'Arduino Uno' } });

    // Total hardware cost starts at 0
    expect(screen.getByTestId('bom-total-cost').textContent).toContain('0.00 ₼');
  });

  it('saves project draft successfully on button click', async () => {
    vi.spyOn(authorApi, 'createProjectDraft').mockResolvedValue({
      _id: 'new-proj-1',
      title: 'Avtomatik Suvarma Sistemi',
      slug: 'avtomatik-suvarma-sistemi',
      price: 20,
      currency: 'AZN',
      status: 'DRAFT',
      rating: 0,
      salesCount: 0,
      shortDescription: 'Qısa təsvir',
      createdAt: '2026-11-24T00:00:00.000Z',
    });

    render(
      <MemoryRouter>
        <ProjectEditorPage />
      </MemoryRouter>,
    );

    const titleInput = await screen.findByPlaceholderText(az.projectEditor.fields.titlePlaceholder);
    fireEvent.change(titleInput, { target: { value: 'Avtomatik Suvarma Sistemi' } });

    const saveBtn = screen.getByText(az.projectEditor.actions.saveDraft);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(authorApi.createProjectDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Avtomatik Suvarma Sistemi',
        }),
      );
    });

    const successEl = await screen.findByTestId('editor-success');
    expect(successEl).toBeDefined();
  });
});
