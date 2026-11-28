import { apiClient } from '@/lib/api';
import { Project, ProjectListResponse } from '@/features/marketplace/types';
import {
  AuthorApplicationPayload,
  AuthorApplicationResponse,
  AuthorDashboardData,
  AuthorProjectsQueryParams,
} from '../types';

export const authorApi = {
  apply: async (payload: AuthorApplicationPayload): Promise<AuthorApplicationResponse> => {
    const response = await apiClient.post<AuthorApplicationResponse>('/authors/apply', payload);
    return response.data;
  },

  getDashboard: async (): Promise<AuthorDashboardData> => {
    const response = await apiClient.get<AuthorDashboardData>('/authors/dashboard');
    return response.data;
  },

  getMyProjects: async (params: AuthorProjectsQueryParams = {}): Promise<ProjectListResponse> => {
    const response = await apiClient.get<ProjectListResponse>('/authors/my-projects', {
      params,
    });
    return response.data;
  },

  createProjectDraft: async (payload: Partial<Project>): Promise<Project> => {
    const response = await apiClient.post<Project>('/projects', payload);
    return response.data;
  },

  updateProject: async (id: string, payload: Partial<Project>): Promise<Project> => {
    const response = await apiClient.put<Project>(`/projects/${id}`, payload);
    return response.data;
  },

  getProjectById: async (id: string): Promise<Project> => {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  },

  uploadProjectFile: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/projects/${projectId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteProjectFile: async (projectId: string, fileId: string) => {
    const response = await apiClient.delete(`/projects/${projectId}/files/${fileId}`);
    return response.data;
  },

  submitProject: async (projectId: string): Promise<Project> => {
    const response = await apiClient.post<Project>(`/projects/${projectId}/submit`);
    return response.data;
  },
};
