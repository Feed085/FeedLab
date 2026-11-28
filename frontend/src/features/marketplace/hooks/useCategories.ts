import { useQuery } from '@tanstack/react-query';
import { marketplaceApi } from '../marketplace.api';
import type { Category } from '../types';

export const useCategories = () => {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => marketplaceApi.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
};
