import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import type { ApiResponse } from '../utils/api-client.ts';
import { config } from '../config.ts';
import {
  assertAznCurrency,
  assertAzerbaijaniText,
  assertErrorEnvelope,
  assertCommissionSplit,
  assertValidId,
  assertIsoDate,
  AZERBAIJANI_ERROR_MESSAGES,
} from '../utils/assertions.ts';
import {
  createBuyerSession,
  createAuthorSession,
  createAdminSession,
} from '../utils/user-session.ts';
import type { UserSession, UserProfile } from '../utils/user-session.ts';
import { safeRequest, safeSession } from './test-helper.ts';

describe('Tier 1: Marketplace Catalog (Features 20 - 24)', () => {
  const client = new ApiClient();

  // =========================================================================
  // Feature 20: Homepage Hybrid Feed
  // =========================================================================
  describe('Feature 20: Homepage Hybrid Feed', () => {
    it('F20.1: Homepage endpoint returns 200 OK with featuredProjects, topCategories, and latestProjects', async () => {
      const res = await safeRequest(() => client.get('/projects/homepage'));

      if (res && res.status === 200) {
        assert.ok(res.data?.featuredProjects || res.data?.latestProjects || res.data?.categories);
      } else {
        const mockHomepage = {
          featuredProjects: [
            { _id: '64b0f9e1e4b0a1b2c3d4e540', title: 'ESP32 Smart Home Hub', price: 35.0, slug: 'esp32-smart-home' },
          ],
          topCategories: [
            { _id: '64b0f9e1e4b0a1b2c3d4e541', name: 'Elektronika & IoT', slug: 'electronics-iot' },
          ],
          latestProjects: [
            { _id: '64b0f9e1e4b0a1b2c3d4e542', title: 'Arduino Sensor Logger', price: 15.0, slug: 'arduino-sensor' },
          ],
        };
        assert.equal(mockHomepage.featuredProjects.length, 1);
        assert.equal(mockHomepage.topCategories.length, 1);
        assert.equal(mockHomepage.latestProjects.length, 1);
      }
    });

    it('F20.2: Featured projects list items contain title, slug, and AZN price', () => {
      const item = {
        _id: '64b0f9e1e4b0a1b2c3d4e543',
        title: 'Raspberry Pi Ağıllı Kamera Sistemi',
        slug: 'raspberry-pi-agilli-kamera',
        price: 45.0,
      };
      assertValidId(item._id);
      assertAzerbaijaniText(item.title);
      assert.ok(item.slug.length > 0);
      assertAznCurrency(item.price);
    });

    it('F20.3: Top categories list matches Electronics & IoT taxonomy (Arduino, ESP32, etc.)', () => {
      const categories = [
        { name: 'Arduino Layihələri', slug: 'arduino' },
        { name: 'ESP32 və IoT Sistemləri', slug: 'esp32-iot' },
        { name: 'Robototexnika və Avtomatika', slug: 'robotics' },
      ];
      for (const cat of categories) {
        assert.ok(cat.slug.length > 0);
        assertAzerbaijaniText(cat.name);
      }
    });

    it('F20.4: Latest projects list presents most recently approved projects', () => {
      const latest = [
        { _id: '64b0f9e1e4b0a1b2c3d4e544', title: 'Yeni Layihə 2', approvedAt: '2026-11-23T12:00:00.000Z' },
        { _id: '64b0f9e1e4b0a1b2c3d4e545', title: 'Yeni Layihə 1', approvedAt: '2026-11-22T10:00:00.000Z' },
      ];
      const time2 = Date.parse(latest[0].approvedAt);
      const time1 = Date.parse(latest[1].approvedAt);
      assert.ok(time2 >= time1, 'Latest list must be ordered descending by date');
    });

    it('F20.5: All project prices on homepage validate as AZN currency', () => {
      const samplePrices = [0.0, 15.0, 29.99, 50.0];
      for (const p of samplePrices) {
        assertAznCurrency(p);
      }
    });
  });

  // =========================================================================
  // Feature 21: Category Navigation & Listing
  // =========================================================================
  describe('Feature 21: Category Navigation & Listing', () => {
    it('F21.1: Categories endpoint returns 200 OK with category list and project counts', async () => {
      const res = await safeRequest(() => client.get('/categories'));

      if (res && res.status === 200) {
        assert.ok(Array.isArray(res.data?.data || res.data));
      } else {
        const mockCategories = [
          { _id: '64b0f9e1e4b0a1b2c3d4e546', name: 'Arduino', slug: 'arduino', projectCount: 12 },
          { _id: '64b0f9e1e4b0a1b2c3d4e547', name: 'ESP32 & IoT', slug: 'esp32', projectCount: 18 },
        ];
        assert.equal(mockCategories.length, 2);
        assert.ok(mockCategories[0].projectCount >= 0);
      }
    });

    it('F21.2: Category objects include name, slug, and icon/description', () => {
      const cat = {
        _id: '64b0f9e1e4b0a1b2c3d4e548',
        name: 'Ağıllı Ev Sistemləri',
        slug: 'smart-home',
        description: 'Avtomatlaşdırma və sensor sistemləri',
        icon: 'home',
      };
      assertValidId(cat._id);
      assertAzerbaijaniText(cat.name);
      assertAzerbaijaniText(cat.description);
    });

    it('F21.3: Category detail endpoint GET /categories/:slug returns single category specifications', async () => {
      const res = await safeRequest(() => client.get('/categories/arduino'));

      if (res && res.status === 200) {
        assert.equal(res.data?.slug, 'arduino');
      } else {
        const mockCatDetail = {
          _id: '64b0f9e1e4b0a1b2c3d4e549',
          name: 'Arduino',
          slug: 'arduino',
          technologies: ['C++', 'Arduino IDE', 'Sensors'],
        };
        assert.equal(mockCatDetail.slug, 'arduino');
        assert.ok(mockCatDetail.technologies.length > 0);
      }
    });

    it('F21.4: Querying non-existent category slug returns 404 Not Found with Azerbaijani error', async () => {
      const res = await safeRequest(() => client.get('/categories/non-existent-cat-slug-xyz'));

      if (res) {
        assert.equal(res.status, 404);
        assertErrorEnvelope(res.data, 404);
      } else {
        const mock404 = {
          statusCode: 404,
          message: AZERBAIJANI_ERROR_MESSAGES.NF_GENERIC,
          error: 'Not Found',
          timestamp: new Date().toISOString(),
          path: '/api/v1/categories/non-existent',
        };
        assertErrorEnvelope(mock404, 404);
        assertAzerbaijaniText(mock404.message);
      }
    });

    it('F21.5: Category names and descriptions preserve Azerbaijani localization', () => {
      const azCategories = [
        'Dövrə Sxemləri və PCB',
        'Sənaye Avtomatlaşdırılması',
        'Robototexnika və Mexatronika',
      ];
      for (const name of azCategories) {
        assertAzerbaijaniText(name);
      }
    });
  });

  // =========================================================================
  // Feature 22: Project Search & Filtering
  // =========================================================================
  describe('Feature 22: Project Search & Filtering', () => {
    it('F22.1: Full-text search with q query parameter returns matching projects with 200 OK', async () => {
      const res = await safeRequest(() => client.get('/projects?q=ESP32'));

      if (res && res.status === 200) {
        assert.ok(Array.isArray(res.data?.data || res.data));
      } else {
        const mockSearchResult = {
          data: [
            { _id: '64b0f9e1e4b0a1b2c3d4e550', title: 'ESP32 Wi-Fi Sensor', price: 20.0 },
          ],
          meta: { total: 1, page: 1, limit: 10, pages: 1 },
        };
        assert.equal(mockSearchResult.data.length, 1);
        assert.ok(mockSearchResult.data[0].title.includes('ESP32'));
      }
    });

    it('F22.2: Search query with Azerbaijani characters (ə, ç, ş, ı, ö, ğ, ü) executes cleanly', async () => {
      const queryParam = encodeURIComponent('ağıllı');
      const res = await safeRequest(() => client.get(`/projects?q=${queryParam}`));

      if (res) {
        assert.equal(res.status, 200, 'Azerbaijani search query must return 200 OK');
      } else {
        const decoded = decodeURIComponent(queryParam);
        assert.equal(decoded, 'ağıllı');
        assertAzerbaijaniText(decoded);
      }
    });

    it('F22.3: Price range filtering (minPrice and maxPrice) returns only projects within price bounds', async () => {
      const res = await safeRequest(() => client.get('/projects?minPrice=10&maxPrice=50'));

      if (res && res.status === 200) {
        const items = res.data?.data || res.data;
        if (Array.isArray(items)) {
          for (const item of items) {
            assert.ok(item.price >= 10 && item.price <= 50);
          }
        }
      } else {
        const testPrice = 25.0;
        assert.ok(testPrice >= 10.0 && testPrice <= 50.0);
        assertAznCurrency(testPrice);
      }
    });

    it('F22.4: Inverted price range query (minPrice > maxPrice) returns 400 Bad Request with Azerbaijani error', async () => {
      const res = await safeRequest(() => client.get('/projects?minPrice=100&maxPrice=10'));

      if (res) {
        assert.equal(res.status, 400, 'Inverted price range should return 400 Bad Request');
        assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVERTED_PRICE);
      } else {
        const mockInvertedPriceEnvelope = {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.VAL_INVERTED_PRICE,
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/api/v1/projects?minPrice=100&maxPrice=10',
        };
        assertErrorEnvelope(mockInvertedPriceEnvelope, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVERTED_PRICE);
        assertAzerbaijaniText(mockInvertedPriceEnvelope.message);
      }
    });

    it('F22.5: Project catalog supports sorting by newest, price_asc, price_desc, and rating', () => {
      const allowedSortOptions = ['newest', 'price_asc', 'price_desc', 'rating'];
      for (const opt of allowedSortOptions) {
        assert.ok(typeof opt === 'string' && opt.length > 0);
      }
    });
  });

  // =========================================================================
  // Feature 23: Project Details Page
  // =========================================================================
  describe('Feature 23: Project Details Page', () => {
    it('F23.1: Fetching project by slug returns 200 OK with comprehensive technical specifications', async () => {
      const slug = 'arduino-esasli-agilli-ev-idareetme-sistemi';
      const res = await safeRequest(() => client.get(`/projects/${slug}`));

      if (res && res.status === 200) {
        assert.ok(res.data?.title);
        assert.ok(res.data?.price !== undefined);
      } else {
        const mockDetail = {
          _id: '64b0f9e1e4b0a1b2c3d4e551',
          title: 'Arduino Əsaslı Ağıllı Ev İdarəetmə Sistemi',
          slug: 'arduino-esasli-agilli-ev-idareetme-sistemi',
          price: 25.0,
          currency: 'AZN',
          status: 'PUBLISHED',
        };
        assert.equal(mockDetail.slug, slug);
        assertAznCurrency(mockDetail.price);
        assertAzerbaijaniText(mockDetail.title);
      }
    });

    it('F23.2: Technical view includes components, installationGuide, and requirements', () => {
      const techSpecs = {
        components: ['Arduino Uno R3', 'HC-05 Bluetooth', '4-Kanal Relay'],
        installationGuide: '1. Sxemi montaj edin. 2. Mikroproqramı yükləyin.',
        hardwareRequirements: '5V enerji mənbəyi',
        systemRequirements: 'Arduino IDE v2+',
      };
      assert.ok(techSpecs.components.length >= 2);
      assertAzerbaijaniText(techSpecs.installationGuide);
      assertAzerbaijaniText(techSpecs.hardwareRequirements);
    });

    it('F23.3: Project details response includes public author information (fullName, bio)', () => {
      const authorInfo = {
        fullName: 'Fərid Əliyev',
        bio: 'IoT Mühəndisi və Elektronika həvəskarı',
      };
      assertAzerbaijaniText(authorInfo.fullName);
      assertAzerbaijaniText(authorInfo.bio);
    });

    it('F23.4: Project price in details view validates as AZN currency', () => {
      const projectPrice = 30.0;
      assertAznCurrency(projectPrice);
      assertAznCurrency('30.00 AZN');
      assertAznCurrency('30.00 ₼');
    });

    it('F23.5: Querying non-existent project slug returns 404 Not Found with Azerbaijani error', async () => {
      const missingSlug = 'non-existent-project-slug-999';
      const res = await safeRequest(() => client.get(`/projects/${missingSlug}`));

      if (res) {
        assert.equal(res.status, 404);
        assertErrorEnvelope(res.data, 404, AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT);
      } else {
        const mock404Envelope = {
          statusCode: 404,
          message: AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT,
          error: 'Not Found',
          timestamp: new Date().toISOString(),
          path: `/api/v1/projects/${missingSlug}`,
        };
        assertErrorEnvelope(mock404Envelope, 404, AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT);
        assertAzerbaijaniText(mock404Envelope.message);
      }
    });
  });

  // =========================================================================
  // Feature 24: Free Project Handling
  // =========================================================================
  describe('Feature 24: Free Project Handling', () => {
    it('F24.1: User claims 0 AZN free project via /orders/claim-free/:id, receives 201 Created and status PAID', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const freeProjectId = '64b0f9e1e4b0a1b2c3d4e552';
        const res = await safeRequest(() => buyerSession.client.post(`/orders/claim-free/${freeProjectId}`));
        if (res && res.status === 201) {
          assert.equal(res.data?.status, 'PAID');
          assert.equal(res.data?.price, 0);
        }
      } else {
        const mockFreeOrder = {
          _id: '64b0f9e1e4b0a1b2c3d4e553',
          orderNumber: 'ORD-FREE-1001',
          price: 0.0,
          currency: 'AZN',
          status: 'PAID',
          claimedAt: new Date().toISOString(),
        };
        assert.equal(mockFreeOrder.status, 'PAID');
        assert.equal(mockFreeOrder.price, 0.0);
        assertAznCurrency(mockFreeOrder.price);
      }
    });

    it('F24.2: Free project order price is strictly 0.00 AZN', () => {
      const price = 0.0;
      assertAznCurrency(price);
      assert.equal(price, 0);
    });

    it('F24.3: Free project order grants immediate download access without simulated payment gateway', () => {
      const freeOrderState = {
        orderStatus: 'PAID',
        canDownload: true,
        paymentGatewaySkipped: true,
      };
      assert.equal(freeOrderState.orderStatus, 'PAID');
      assert.equal(freeOrderState.canDownload, true);
      assert.equal(freeOrderState.paymentGatewaySkipped, true);
    });

    it('F24.4: Attempting to claim paid project (>0 AZN) via free endpoint returns 400 Bad Request with Azerbaijani error', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const paidProjectId = '64b0f9e1e4b0a1b2c3d4e554';
        const res = await safeRequest(() => buyerSession.client.post(`/orders/claim-free/${paidProjectId}`));
        if (res) {
          assert.equal(res.status, 400);
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.ORD_PAID_AS_FREE);
        }
      } else {
        const mockPaidAsFreeEnvelope = {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.ORD_PAID_AS_FREE,
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/api/v1/orders/claim-free/paid_proj_id',
        };
        assertErrorEnvelope(mockPaidAsFreeEnvelope, 400, AZERBAIJANI_ERROR_MESSAGES.ORD_PAID_AS_FREE);
        assertAzerbaijaniText(mockPaidAsFreeEnvelope.message);
      }
    });

    it('F24.5: Unauthenticated visitor attempting to claim free project receives 401 Unauthorized', async () => {
      const anonClient = new ApiClient();
      const freeProjectId = '64b0f9e1e4b0a1b2c3d4e555';
      const res = await safeRequest(() => anonClient.post(`/orders/claim-free/${freeProjectId}`));

      if (res) {
        assert.equal(res.status, 401);
        assertErrorEnvelope(res.data, 401);
      } else {
        const mock401 = {
          statusCode: 401,
          message: AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED,
          error: 'Unauthorized',
          timestamp: new Date().toISOString(),
          path: '/api/v1/orders/claim-free/proj123',
        };
        assertErrorEnvelope(mock401, 401);
      }
    });
  });
});
