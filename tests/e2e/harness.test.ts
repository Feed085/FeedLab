import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { config } from './config.ts';
import type { TestConfig } from './config.ts';
import { ApiClient } from './utils/api-client.ts';
import type { ApiResponse } from './utils/api-client.ts';
import {
  assertAznCurrency,
  assertAzerbaijaniText,
  assertErrorEnvelope,
  assertCommissionSplit,
  assertValidId,
  assertIsoDate,
  AZERBAIJANI_ERROR_MESSAGES,
} from './utils/assertions.ts';
import {
  generateUniqueEmail,
  generateUniqueUser,
  createAnonymousSession,
} from './utils/user-session.ts';
import type { UserProfile, UserRole } from './utils/user-session.ts';

describe('FeedLab E2E Harness Self-Verification', () => {
  describe('Node 24 TypeScript Type Stripping', () => {
    it('should correctly strip interfaces and type annotations', () => {
      interface TestHarnessData {
        id: string;
        name: string;
        count: number;
      }

      const sample: TestHarnessData = {
        id: 'harness_01',
        name: 'FeedLab Test Suite',
        count: 42,
      };

      assert.equal(sample.id, 'harness_01');
      assert.equal(sample.name, 'FeedLab Test Suite');
      assert.equal(sample.count, 42);
    });
  });

  describe('Configuration Defaults', () => {
    it('should load default configuration values', () => {
      const cfg: TestConfig = config;
      assert.ok(cfg.apiUrl.length > 0, 'apiUrl must be defined');
      assert.ok(cfg.webUrl.length > 0, 'webUrl must be defined');
      assert.ok(cfg.adminEmail.includes('@'), 'adminEmail must be a valid email');
      assert.ok(cfg.adminPassword.length > 0, 'adminPassword must be defined');
      assert.ok(cfg.timeoutMs > 0, 'timeoutMs must be positive');
      assert.ok(cfg.reportPath.endsWith('.json'), 'reportPath must end with .json');
    });
  });

  describe('ApiClient Utility', () => {
    it('should initialize with default base URL', () => {
      const client = new ApiClient();
      assert.equal(client.baseUrl, config.apiUrl.replace(/\/+$/, ''));
      assert.equal(client.getToken(), null);
    });

    it('should manage auth token correctly', () => {
      const client = new ApiClient();
      client.setToken('test-jwt-token-xyz');
      assert.equal(client.getToken(), 'test-jwt-token-xyz');
      client.setToken(null);
      assert.equal(client.getToken(), null);
    });

    it('should handle custom base URL without trailing slashes', () => {
      const client = new ApiClient('http://example.com/api///');
      assert.equal(client.baseUrl, 'http://example.com/api');
    });
  });

  describe('Assertion Helpers: AZN Currency', () => {
    it('should accept valid numeric AZN values', () => {
      assertAznCurrency(0);
      assertAznCurrency(15.0);
      assertAznCurrency(99.99);
      assertAznCurrency(1250);
    });

    it('should accept valid formatted AZN string values', () => {
      assertAznCurrency('15.00 ₼');
      assertAznCurrency('25.50 AZN');
      assertAznCurrency('AZN 50.00');
      assertAznCurrency('₼ 100');
      assertAznCurrency('15.00');
    });

    it('should reject negative numbers or non-AZN currencies', () => {
      assert.throws(() => assertAznCurrency(-10));
      assert.throws(() => assertAznCurrency(15.999));
      assert.throws(() => assertAznCurrency('25.00 USD'));
      assert.throws(() => assertAznCurrency('50.00 EUR'));
    });
  });

  describe('Assertion Helpers: Azerbaijani Localization', () => {
    it('should accept strings with Azerbaijani specific characters', () => {
      assertAzerbaijaniText('Salam, xoş gəlmisiniz!');
      assertAzerbaijaniText('Layihə uğurla yaradıldı');
      assertAzerbaijaniText('Ödəniş qəbul olundu');
      assertAzerbaijaniText('İstifadəçi hüququ təsdiqləndi');
    });

    it('should accept canonical error messages from dictionary', () => {
      assertAzerbaijaniText(AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD);
      assertAzerbaijaniText(AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
      assertAzerbaijaniText(AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
      assertAzerbaijaniText(AZERBAIJANI_ERROR_MESSAGES.ORD_SELF_PURCHASE);
    });

    it('should reject pure ASCII English strings without Azerbaijani characters or dictionary match', () => {
      assert.throws(() => assertAzerbaijaniText('Unauthorized access denied'));
      assert.throws(() => assertAzerbaijaniText(''));
    });
  });

  describe('Assertion Helpers: Error Envelope', () => {
    it('should validate valid NestJS error envelope with string message', () => {
      const errorObj = {
        statusCode: 400,
        message: 'Bu xana mütləq doldurulmalıdır',
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path: '/api/v1/projects',
      };

      assertErrorEnvelope(errorObj, 400, 'Bu xana mütləq doldurulmalıdır');
    });

    it('should validate NestJS error envelope with array of validation messages', () => {
      const errorObj = {
        statusCode: 400,
        message: [
          'Düzgün e-poçt ünvanı daxil edin',
          'Şifrə ən azı 8 simvol olmalıdır',
        ],
        error: 'Bad Request',
      };

      assertErrorEnvelope(errorObj, 400, 'Düzgün e-poçt ünvanı daxil edin');
      assertErrorEnvelope(errorObj, 400, 'Şifrə ən azı 8 simvol olmalıdır');
    });

    it('should fail on status code mismatch', () => {
      const errorObj = { statusCode: 404, message: 'Layihə tapılmadı' };
      assert.throws(() => assertErrorEnvelope(errorObj, 400));
    });
  });

  describe('Assertion Helpers: 80/20 Commission Split', () => {
    it('should validate exact 80/20 calculation across multiple price points', () => {
      // 100 AZN -> Author: 80, Platform: 20
      assertCommissionSplit(100, 80, 20);

      // 50 AZN -> Author: 40, Platform: 10
      assertCommissionSplit(50, 40, 10);

      // 15.50 AZN -> Author: 12.40, Platform: 3.10
      assertCommissionSplit(15.5, 12.4, 3.1);

      // 29.90 AZN -> Author: 23.92, Platform: 5.98
      assertCommissionSplit(29.9, 23.92, 5.98);

      // 0 AZN (Free project) -> Author: 0, Platform: 0
      assertCommissionSplit(0, 0, 0);
    });

    it('should reject tampered or unequal commission splits', () => {
      assert.throws(() => assertCommissionSplit(100, 75, 25));
      assert.throws(() => assertCommissionSplit(100, 80, 19));
      assert.throws(() => assertCommissionSplit(50, 30, 20));
    });
  });

  describe('Assertion Helpers: Identifier & Date Formats', () => {
    it('should validate MongoDB ObjectId and UUIDs', () => {
      assertValidId('507f1f77bcf86cd799439011');
      assertValidId('c0a80101-0000-0000-0000-000000000001');
    });

    it('should reject empty or invalid IDs', () => {
      assert.throws(() => assertValidId(''));
      assert.throws(() => assertValidId(null));
    });

    it('should validate ISO 8601 timestamps', () => {
      assertIsoDate('2026-11-24T03:00:00.000Z');
      assertIsoDate(new Date().toISOString());
    });

    it('should reject invalid date strings', () => {
      assert.throws(() => assertIsoDate('not-a-date'));
    });
  });

  describe('User Session & Persona Utilities', () => {
    it('should generate distinct emails under @feedlab.az', () => {
      const email1 = generateUniqueEmail('buyer');
      const email2 = generateUniqueEmail('buyer');

      assert.ok(email1.endsWith('@feedlab.az'));
      assert.ok(email2.endsWith('@feedlab.az'));
      assert.notEqual(email1, email2);
    });

    it('should generate unique user credentials', () => {
      const role: UserRole = 'AUTHOR';
      const user = generateUniqueUser(role);

      assert.equal(user.role, 'AUTHOR');
      assert.ok(user.email.includes('author'));
      assert.ok(user.password.length >= 8);
    });

    it('should create an anonymous session with ApiClient', () => {
      const session = createAnonymousSession();
      assert.ok(session.client instanceof ApiClient);
      assert.equal(session.client.getToken(), null);
    });
  });
});
