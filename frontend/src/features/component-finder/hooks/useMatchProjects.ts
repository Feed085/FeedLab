import { useQuery } from '@tanstack/react-query';
import { componentFinderApi, sanitizeMatchPayload } from '../componentFinder.api';
import type { MatchComponentsPayload, MatchComponentsResponse } from '../types';

export interface UseMatchProjectsOptions {
  hasValidationError?: boolean;
}

export const useMatchProjects = (
  payload: MatchComponentsPayload,
  options: UseMatchProjectsOptions = {},
) => {
  const cleanPayload = sanitizeMatchPayload(payload);
  const isRangeValid =
    cleanPayload.minPrice === undefined ||
    cleanPayload.maxPrice === undefined ||
    cleanPayload.minPrice <= cleanPayload.maxPrice;

  const isEnabled =
    cleanPayload.components.length > 0 && isRangeValid && !options.hasValidationError;

  return useQuery<MatchComponentsResponse>({
    queryKey: ['component-finder', 'match', cleanPayload],
    queryFn: () => componentFinderApi.matchComponents(cleanPayload),
    enabled: isEnabled,
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
  });
};
