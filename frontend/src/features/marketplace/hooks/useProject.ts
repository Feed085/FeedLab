import { useQuery } from '@tanstack/react-query';
import { marketplaceApi } from '../marketplace.api';
import type { Project } from '../types';

export const useProject = (slug: string) => {
  return useQuery<Project>({
    queryKey: ['project', slug],
    queryFn: () => marketplaceApi.getProjectBySlug(slug),
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
};
