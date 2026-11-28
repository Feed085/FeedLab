import { useQuery } from '@tanstack/react-query';
import { marketplaceApi } from '../marketplace.api';
import type { Technology } from '../types';

export const useTechnologies = () => {
  return useQuery<Technology[]>({
    queryKey: ['technologies'],
    queryFn: () => marketplaceApi.getTechnologies(),
    staleTime: 5 * 60 * 1000,
  });
};
