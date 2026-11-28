import { useQuery } from '@tanstack/react-query';
import { marketplaceApi } from '../marketplace.api';
import type { ProjectQueryParams, ProjectListResponse } from '../types';

export const useProjects = (params: ProjectQueryParams = {}) => {
  return useQuery<ProjectListResponse>({
    queryKey: ['projects', params],
    queryFn: () => marketplaceApi.getProjects(params),
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
  });
};
