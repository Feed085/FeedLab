import { apiClient } from '@/lib/api';
import { COMPONENT_FINDER_COPY } from './constants';
import type {
  ComponentListResponse,
  ComponentSummary,
  FinderFilters,
  GetComponentsParams,
  MatchComponentsPayload,
  MatchComponentsResponse,
  PriceType,
  ProjectDifficulty,
} from './types';

const VALID_DIFFICULTIES: ReadonlySet<ProjectDifficulty> = new Set([
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
]);

const VALID_PRICE_TYPES: ReadonlySet<PriceType> = new Set(['all', 'free', 'paid']);

export function normalizeComponentKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function sanitizeGetComponentsParams(
  params: GetComponentsParams = {},
): Record<string, string | number> {
  const clean: Record<string, string | number> = {};

  const trimmedQ = typeof params.q === 'string' ? params.q.trim() : '';
  if (trimmedQ.length > 0) {
    clean.q = trimmedQ;
  }

  const trimmedCategory =
    typeof params.category === 'string' ? params.category.trim().toLowerCase() : '';
  if (trimmedCategory.length > 0 && trimmedCategory !== 'all') {
    clean.category = trimmedCategory;
  }

  if (typeof params.page === 'number' && Number.isFinite(params.page) && params.page >= 1) {
    clean.page = Math.floor(params.page);
  } else {
    clean.page = 1;
  }

  const rawLimit =
    typeof params.limit === 'number' && Number.isFinite(params.limit)
      ? Math.floor(params.limit)
      : 100;
  clean.limit = Math.min(100, Math.max(1, rawLimit));

  return clean;
}

export function parseOptionalPrice(value: number | string | null | undefined): {
  parsed?: number;
  isInvalid: boolean;
} {
  if (value === undefined || value === null) {
    return { parsed: undefined, isInvalid: false };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return { parsed: undefined, isInvalid: false };
    }
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num < 0) {
      return { parsed: undefined, isInvalid: true };
    }
    return { parsed: num, isInvalid: false };
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      return { parsed: undefined, isInvalid: true };
    }
    return { parsed: value, isInvalid: false };
  }

  return { parsed: undefined, isInvalid: true };
}

export function validatePriceRange(
  minPrice?: number | string | null,
  maxPrice?: number | string | null,
): { min?: number; max?: number; error: string | null } {
  const minParsed = parseOptionalPrice(minPrice);
  const maxParsed = parseOptionalPrice(maxPrice);

  if (minParsed.isInvalid || maxParsed.isInvalid) {
    return {
      min: minParsed.parsed,
      max: maxParsed.parsed,
      error: COMPONENT_FINDER_COPY.priceNegativeError,
    };
  }

  if (
    minParsed.parsed !== undefined &&
    maxParsed.parsed !== undefined &&
    minParsed.parsed > maxParsed.parsed
  ) {
    return {
      min: minParsed.parsed,
      max: maxParsed.parsed,
      error: COMPONENT_FINDER_COPY.priceRangeInvertedError,
    };
  }

  return {
    min: minParsed.parsed,
    max: maxParsed.parsed,
    error: null,
  };
}

export function sanitizeMatchPayload(payload: MatchComponentsPayload): MatchComponentsPayload {
  const seen = new Set<string>();
  const cleanComponents: string[] = [];

  for (const rawItem of payload.components || []) {
    if (typeof rawItem !== 'string') continue;
    const trimmed = rawItem.trim();
    if (!trimmed) continue;
    const dedupKey = normalizeComponentKey(trimmed);
    if (!seen.has(dedupKey)) {
      seen.add(dedupKey);
      cleanComponents.push(trimmed);
    }
  }

  const sanitized: MatchComponentsPayload = {
    components: cleanComponents,
  };

  const trimmedDomain = typeof payload.domain === 'string' ? payload.domain.trim() : '';
  if (trimmedDomain.length > 0 && trimmedDomain.toLowerCase() !== 'all') {
    sanitized.domain = trimmedDomain;
  }

  if (payload.priceType && VALID_PRICE_TYPES.has(payload.priceType)) {
    sanitized.priceType = payload.priceType;
  }

  if (sanitized.priceType !== 'free') {
    if (
      typeof payload.minPrice === 'number' &&
      Number.isFinite(payload.minPrice) &&
      payload.minPrice >= 0
    ) {
      sanitized.minPrice = payload.minPrice;
    }

    if (
      typeof payload.maxPrice === 'number' &&
      Number.isFinite(payload.maxPrice) &&
      payload.maxPrice >= 0
    ) {
      sanitized.maxPrice = payload.maxPrice;
    }
  }

  if (payload.difficulty && VALID_DIFFICULTIES.has(payload.difficulty)) {
    sanitized.difficulty = payload.difficulty;
  }

  return sanitized;
}

export function buildMatchPayloadFromFilters(
  components: string[],
  filters: FinderFilters,
): { payload: MatchComponentsPayload; priceError: string | null } {
  const priceValidation =
    filters.priceType === 'free'
      ? { min: undefined, max: undefined, error: null }
      : validatePriceRange(filters.minPrice, filters.maxPrice);

  const payload = sanitizeMatchPayload({
    components,
    domain: filters.domain || undefined,
    priceType: filters.priceType,
    minPrice: priceValidation.min,
    maxPrice: priceValidation.max,
    difficulty: filters.difficulty || undefined,
  });

  return {
    payload,
    priceError: priceValidation.error,
  };
}

export const componentFinderApi = {
  getComponents: async (params: GetComponentsParams = {}): Promise<ComponentListResponse> => {
    const cleanParams = sanitizeGetComponentsParams(params);
    const response = await apiClient.get<ComponentListResponse>('/components', {
      params: cleanParams,
    });
    return response.data;
  },

  getAllComponents: async (
    params: Omit<GetComponentsParams, 'page' | 'limit'> = {},
  ): Promise<ComponentListResponse> => {
    const firstPage = await componentFinderApi.getComponents({
      ...params,
      page: 1,
      limit: 100,
    });

    if (!firstPage.totalPages || firstPage.totalPages <= 1) {
      return firstPage;
    }

    const seenSlugs = new Set<string>();
    const allItems: ComponentSummary[] = [];

    for (const item of firstPage.items || []) {
      const key = normalizeComponentKey(item.slug || item.name);
      if (!seenSlugs.has(key)) {
        seenSlugs.add(key);
        allItems.push(item);
      }
    }

    const remainingPages: number[] = [];
    for (let page = 2; page <= firstPage.totalPages; page += 1) {
      remainingPages.push(page);
    }

    const extraResponses = await Promise.all(
      remainingPages.map((page) =>
        componentFinderApi.getComponents({
          ...params,
          page,
          limit: 100,
        }),
      ),
    );

    for (const res of extraResponses) {
      for (const item of res.items || []) {
        const key = normalizeComponentKey(item.slug || item.name);
        if (!seenSlugs.has(key)) {
          seenSlugs.add(key);
          allItems.push(item);
        }
      }
    }

    return {
      ...firstPage,
      items: allItems,
    };
  },

  matchComponents: async (payload: MatchComponentsPayload): Promise<MatchComponentsResponse> => {
    const cleanPayload = sanitizeMatchPayload(payload);

    if (
      cleanPayload.minPrice !== undefined &&
      cleanPayload.maxPrice !== undefined &&
      cleanPayload.minPrice > cleanPayload.maxPrice
    ) {
      throw new Error(COMPONENT_FINDER_COPY.priceRangeInvertedError);
    }

    const response = await apiClient.post<MatchComponentsResponse>(
      '/projects/match-components',
      cleanPayload,
    );
    return response.data;
  },
};
