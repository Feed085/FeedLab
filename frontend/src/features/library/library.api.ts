import { apiClient } from '@/lib/api';
import type {
  ComponentDetailResponse,
  ComponentListParams,
  ComponentListResponse,
  ComponentProjectsResponse,
} from './types';

export const libraryApi = {
  getComponents: async (params: ComponentListParams = {}): Promise<ComponentListResponse> => {
    const cleanParams: Record<string, string | number> = {};

    const trimmedQuery = params.q?.trim();
    if (trimmedQuery) {
      cleanParams.q = trimmedQuery;
    }

    const trimmedCategory = params.category?.trim();
    if (trimmedCategory && trimmedCategory.toLowerCase() !== 'all') {
      cleanParams.category = trimmedCategory;
    }

    if (params.page !== undefined) {
      cleanParams.page = Math.max(1, Math.floor(params.page));
    }

    if (params.limit !== undefined) {
      cleanParams.limit = Math.min(100, Math.max(1, Math.floor(params.limit)));
    }

    const response = await apiClient.get<ComponentListResponse>('/components', {
      params: cleanParams,
    });
    return response.data;
  },

  getComponentBySlug: async (slug: string): Promise<ComponentDetailResponse> => {
    const cleanSlug = encodeURIComponent(slug.trim());
    const response = await apiClient.get<ComponentDetailResponse>(`/components/${cleanSlug}`);
    return response.data;
  },

  getComponentProjects: async (
    slug: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<ComponentProjectsResponse> => {
    const cleanSlug = encodeURIComponent(slug.trim());
    const cleanParams: Record<string, number> = {};

    if (params.page !== undefined) {
      cleanParams.page = Math.max(1, Math.floor(params.page));
    }

    if (params.limit !== undefined) {
      cleanParams.limit = Math.min(100, Math.max(1, Math.floor(params.limit)));
    }

    const response = await apiClient.get<ComponentProjectsResponse>(
      `/components/${cleanSlug}/projects`,
      { params: cleanParams },
    );
    return response.data;
  },
};
