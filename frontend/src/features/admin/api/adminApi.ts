import { apiClient } from '@/lib/api';
import {
  AdminMetrics,
  AdminUser,
  ProjectQueueResponse,
  ReviewProjectPayload,
  ReviewAuthorAppPayload,
  UserListResponse,
  AuthorApplicationListResponse,
  AdminComponentPayload,
  AdminComponentItem,
  AdminComponentsListResponse,
} from '../types';
import { Project } from '@/features/marketplace/types';

export const adminApi = {
  getMetrics: async (): Promise<AdminMetrics> => {
    const response = await apiClient.get<AdminMetrics>('/admin/metrics');
    return response.data;
  },

  getReviewQueue: async (params: { page?: number; limit?: number; category?: string; author?: string } = {}): Promise<ProjectQueueResponse> => {
    const response = await apiClient.get<ProjectQueueResponse>('/admin/projects/queue', { params });
    return response.data;
  },

  reviewProject: async (projectId: string, payload: ReviewProjectPayload): Promise<Project> => {
    const response = await apiClient.post<Project>(`/admin/projects/${projectId}/review`, payload);
    return response.data;
  },

  getAuthorApplications: async (params: { page?: number; limit?: number; status?: string } = {}): Promise<AuthorApplicationListResponse> => {
    const response = await apiClient.get<AuthorApplicationListResponse>('/admin/author-applications', { params });
    return response.data;
  },

  reviewAuthorApplication: async (id: string, payload: ReviewAuthorAppPayload) => {
    const response = await apiClient.post(`/admin/author-applications/${id}/review`, payload);
    return response.data;
  },

  getUsers: async (params: { search?: string; role?: string; isActive?: boolean; page?: number; limit?: number } = {}): Promise<UserListResponse> => {
    const response = await apiClient.get<UserListResponse>('/admin/users', { params });
    return response.data;
  },

  updateUserRole: async (userId: string, role: string): Promise<AdminUser> => {
    const response = await apiClient.patch<AdminUser>(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  updateUserStatus: async (userId: string, isActive: boolean): Promise<AdminUser> => {
    const response = await apiClient.patch<AdminUser>(`/admin/users/${userId}/status`, { isActive });
    return response.data;
  },

  getComponents: async (
    params: { q?: string; category?: string; page?: number; limit?: number } = {},
  ): Promise<AdminComponentsListResponse> => {
    const response = await apiClient.get<AdminComponentsListResponse>('/components', { params });
    return response.data;
  },

  getComponentBySlug: async (slug: string): Promise<AdminComponentItem> => {
    const response = await apiClient.get<AdminComponentItem>(`/components/${slug}`);
    return response.data;
  },

  createComponent: async (payload: AdminComponentPayload): Promise<AdminComponentItem> => {
    const response = await apiClient.post<AdminComponentItem>('/components', payload);
    return response.data;
  },

  updateComponent: async (
    id: string,
    payload: Partial<AdminComponentPayload>,
  ): Promise<AdminComponentItem> => {
    const response = await apiClient.patch<AdminComponentItem>(`/components/${id}`, payload);
    return response.data;
  },

  deleteComponent: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/components/${id}`);
    return response.data;
  },
};
