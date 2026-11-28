import { useQuery } from '@tanstack/react-query';
import { libraryApi } from '../library.api';
import type {
  ComponentDetailResponse,
  ComponentListParams,
  ComponentListResponse,
  ComponentProjectsResponse,
} from '../types';

export const useComponents = (params: ComponentListParams = {}) => {
  return useQuery<ComponentListResponse>({
    queryKey: ['library-components', params],
    queryFn: () => libraryApi.getComponents(params),
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
  });
};

export const useComponent = (slug: string) => {
  const trimmedSlug = slug.trim();
  return useQuery<ComponentDetailResponse>({
    queryKey: ['library-component', trimmedSlug],
    queryFn: () => libraryApi.getComponentBySlug(trimmedSlug),
    enabled: Boolean(trimmedSlug),
    staleTime: 60 * 1000,
  });
};

export const useComponentProjects = (
  slug: string,
  params: { page?: number; limit?: number } = {},
  enabled = true,
) => {
  const trimmedSlug = slug.trim();
  return useQuery<ComponentProjectsResponse>({
    queryKey: ['library-component-projects', trimmedSlug, params],
    queryFn: () => libraryApi.getComponentProjects(trimmedSlug, params),
    enabled: Boolean(trimmedSlug) && enabled,
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
  });
};
