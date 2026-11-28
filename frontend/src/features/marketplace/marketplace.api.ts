import { apiClient } from '@/lib/api';
import type {
  Category,
  Technology,
  Project,
  ProjectQueryParams,
  ProjectListResponse,
  ClaimFreeResponse,
} from './types';

export const marketplaceApi = {
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get<Category[]>('/categories');
    return response.data;
  },

  getTechnologies: async (): Promise<Technology[]> => {
    const response = await apiClient.get<Technology[]>('/technologies');
    return response.data;
  },

  getProjects: async (params: ProjectQueryParams = {}): Promise<ProjectListResponse> => {
    const cleanParams: Record<string, any> = {};

    if (params.q) cleanParams.q = params.q;
    if (params.category) cleanParams.category = params.category;
    if (params.tech) cleanParams.tech = params.tech;
    if (params.domain) cleanParams.domain = params.domain;
    if (params.difficulty) cleanParams.difficulty = params.difficulty;
    if (params.component) cleanParams.component = params.component;
    if (params.sort) cleanParams.sort = params.sort;
    if (params.page) cleanParams.page = params.page;
    if (params.limit) cleanParams.limit = params.limit;

    if (params.freeOnly) {
      cleanParams.minPrice = 0;
      cleanParams.maxPrice = 0;
    } else {
      if (params.minPrice !== undefined) cleanParams.minPrice = params.minPrice;
      if (params.maxPrice !== undefined) cleanParams.maxPrice = params.maxPrice;
    }

    const response = await apiClient.get<ProjectListResponse>('/projects', {
      params: cleanParams,
    });
    return response.data;
  },

  getProjectBySlug: async (slug: string): Promise<Project> => {
    const response = await apiClient.get<Project>(`/projects/${slug}`);
    return response.data;
  },

  claimFreeProject: async (projectId: string): Promise<ClaimFreeResponse> => {
    const response = await apiClient.post<ClaimFreeResponse>(`/projects/${projectId}/claim-free`);
    return response.data;
  },
};
