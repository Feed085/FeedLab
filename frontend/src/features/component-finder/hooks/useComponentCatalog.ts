import { useQuery } from '@tanstack/react-query';
import { componentFinderApi } from '../componentFinder.api';
import type { ComponentListResponse, GetComponentsParams } from '../types';

export interface UseComponentCatalogOptions extends Omit<GetComponentsParams, 'page' | 'limit'> {
  fetchAll?: boolean;
}

export const useComponentCatalog = (options: UseComponentCatalogOptions = {}) => {
  const { q, category, fetchAll = true } = options;
  const normalizedQ = typeof q === 'string' ? q.trim() : '';
  const normalizedCategory =
    typeof category === 'string' && category.trim().toLowerCase() !== 'all'
      ? category.trim().toLowerCase()
      : '';

  return useQuery<ComponentListResponse>({
    queryKey: [
      'component-finder',
      'components',
      { q: normalizedQ, category: normalizedCategory, fetchAll },
    ],
    queryFn: () =>
      fetchAll
        ? componentFinderApi.getAllComponents({
            q: normalizedQ || undefined,
            category: normalizedCategory || undefined,
          })
        : componentFinderApi.getComponents({
            q: normalizedQ || undefined,
            category: normalizedCategory || undefined,
            page: 1,
            limit: 100,
          }),
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000,
  });
};
