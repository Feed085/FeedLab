import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/lib/api';
import {
  componentFinderApi,
  sanitizeGetComponentsParams,
  sanitizeMatchPayload,
  validatePriceRange,
} from './componentFinder.api';
import { COMPONENT_FINDER_COPY } from './constants';

describe('componentFinder.api', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('sanitizeGetComponentsParams & getComponents', () => {
    it('omits blank q and category="all", defaults limit=100, and unwraps response.data', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
        categories: [],
      };
      const getSpy = vi
        .spyOn(apiClient, 'get')
        .mockResolvedValue({ data: mockResponse } as any);

      const result = await componentFinderApi.getComponents({
        q: '   ',
        category: 'all',
      });

      expect(getSpy).toHaveBeenCalledWith('/components', {
        params: { page: 1, limit: 100 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('clamps limit to [1, 100] and preserves trimmed q and category', () => {
      expect(
        sanitizeGetComponentsParams({
          q: '  esp32  ',
          category: ' Microcontrollers ',
          page: 2,
          limit: 500,
        }),
      ).toEqual({
        q: 'esp32',
        category: 'microcontrollers',
        page: 2,
        limit: 100,
      });

      expect(sanitizeGetComponentsParams({ limit: 0, page: -3 })).toEqual({
        page: 1,
        limit: 1,
      });
    });

    it('getAllComponents fetches all remaining pages when totalPages > 1', async () => {
      const getSpy = vi
        .spyOn(apiClient, 'get')
        .mockResolvedValueOnce({
          data: {
            items: [{ _id: '1', slug: 'esp32', name: 'ESP32', aliases: [], category: 'microcontrollers', categoryLabel: 'Mikrokontrollerlər', shortDescription: 'Wi-Fi MCU' }],
            total: 2,
            page: 1,
            limit: 100,
            totalPages: 2,
            categories: [{ key: 'microcontrollers', label: 'Mikrokontrollerlər', count: 2 }],
          },
        } as any)
        .mockResolvedValueOnce({
          data: {
            items: [
              { _id: '1', slug: 'esp32', name: 'ESP32', aliases: [], category: 'microcontrollers', categoryLabel: 'Mikrokontrollerlər', shortDescription: 'Wi-Fi MCU' },
              { _id: '2', slug: 'dht22', name: 'DHT22', aliases: [], category: 'sensors', categoryLabel: 'Sensorlar', shortDescription: 'Temp sensor' },
            ],
            total: 2,
            page: 2,
            limit: 100,
            totalPages: 2,
            categories: [{ key: 'microcontrollers', label: 'Mikrokontrollerlər', count: 2 }],
          },
        } as any);

      const res = await componentFinderApi.getAllComponents();
      expect(getSpy).toHaveBeenCalledTimes(2);
      expect(res.items).toHaveLength(2);
      expect(res.items.map((i) => i.slug)).toEqual(['esp32', 'dht22']);
    });
  });

  describe('sanitizeMatchPayload, validatePriceRange & matchComponents', () => {
    it('strips empty, null, undefined, and NaN optional fields and deduplicates components', () => {
      const sanitized = sanitizeMatchPayload({
        components: [' esp32 ', 'ESP32', 'dht22', '   '],
        domain: '   ',
        priceType: 'paid',
        minPrice: Number.NaN,
        maxPrice: 120,
        difficulty: '' as any,
      });

      expect(sanitized).toEqual({
        components: ['esp32', 'dht22'],
        priceType: 'paid',
        maxPrice: 120,
      });
      expect('domain' in sanitized).toBe(false);
      expect('difficulty' in sanitized).toBe(false);
      expect('minPrice' in sanitized).toBe(false);
    });

    it('omits minPrice and maxPrice when priceType is free', () => {
      const sanitized = sanitizeMatchPayload({
        components: ['esp32'],
        priceType: 'free',
        minPrice: 10,
        maxPrice: 50,
      });

      expect(sanitized).toEqual({
        components: ['esp32'],
        priceType: 'free',
      });
    });

    it('validates inverted and negative price ranges cleanly', () => {
      expect(validatePriceRange('100', '50')).toEqual({
        min: 100,
        max: 50,
        error: COMPONENT_FINDER_COPY.priceRangeInvertedError,
      });
      expect(validatePriceRange('-5', '50').error).toBe(
        COMPONENT_FINDER_COPY.priceNegativeError,
      );
      expect(validatePriceRange('', '').error).toBeNull();
      expect(validatePriceRange('10', '50')).toEqual({
        min: 10,
        max: 50,
        error: null,
      });
    });

    it('does not call POST /projects/match-components when minPrice > maxPrice', async () => {
      const postSpy = vi.spyOn(apiClient, 'post');

      await expect(
        componentFinderApi.matchComponents({
          components: ['esp32'],
          minPrice: 80,
          maxPrice: 20,
        }),
      ).rejects.toThrow(COMPONENT_FINDER_COPY.priceRangeInvertedError);

      expect(postSpy).not.toHaveBeenCalled();
    });

    it('posts sanitized payload to /projects/match-components and unwraps response.data', async () => {
      const mockMatchResponse = {
        selectedComponents: ['esp32'],
        fullMatches: [],
        partialMatches: [],
        totalFull: 0,
        totalPartial: 0,
      };
      const postSpy = vi
        .spyOn(apiClient, 'post')
        .mockResolvedValue({ data: mockMatchResponse } as any);

      const response = await componentFinderApi.matchComponents({
        components: ['esp32'],
        domain: 'Energetika',
        priceType: 'paid',
        minPrice: 15,
        difficulty: 'INTERMEDIATE',
      });

      expect(postSpy).toHaveBeenCalledWith('/projects/match-components', {
        components: ['esp32'],
        domain: 'Energetika',
        priceType: 'paid',
        minPrice: 15,
        difficulty: 'INTERMEDIATE',
      });
      expect(response).toEqual(mockMatchResponse);
    });
  });
});
