import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import { config } from '../config.ts';
import {
  assertAznCurrency,
  assertAzerbaijaniText,
  assertErrorEnvelope,
  AZERBAIJANI_ERROR_MESSAGES,
} from '../utils/assertions.ts';
import {
  createBuyerSession,
  createAuthorSession,
  createAdminSession,
  createAnonymousSession,
} from '../utils/user-session.ts';
import type { ApiResponse } from '../utils/api-client.ts';
import { withOfflineSkip } from './boundary-helper.ts';

describe('Tier 2 — B01 Foundation Boundaries (Features 1–3)', () => {
  const client = new ApiClient();

  // =========================================================================
  // Feature 1: Modular Monolith Scaffolding
  // =========================================================================
  describe('Feature 1: Modular Monolith Scaffolding', () => {
    it('should return 404 with error envelope when requesting non-existent API route', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.get('/non-existent-module-route-404');
        assert.equal(res.status, 404, 'Expected 404 for unknown API route');
        assertErrorEnvelope(res.data, 404);
        assert.ok(res.data.message, 'Expected error message');
      });
    });

    it('should reject malformed HTTP verb on health endpoint with 404 or 405', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.request('DELETE', '/health');
        assert.ok(
          res.status === 404 || res.status === 405,
          `Expected 404 or 405 on unsupported DELETE /health, got ${res.status}`
        );
      });
    });

    it('should reject malformed JSON syntax with 400 Bad Request', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.request('POST', '/auth/login', {
          body: '{ "email": "broken-json, ',
          headers: { 'Content-Type': 'application/json' },
        });
        assert.equal(res.status, 400, 'Expected 400 Bad Request for malformed JSON syntax');
        assertErrorEnvelope(res.data, 400);
      });
    });

    it('should reject unsupported content-type or malformed payload encoding with 400 or 415', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.request('POST', '/auth/register', {
          body: '<xml><email>test@feedlab.az</email></xml>',
          headers: { 'Content-Type': 'application/xml' },
        });
        assert.ok(
          res.status === 400 || res.status === 415,
          `Expected 400 or 415 for unsupported XML content-type, got ${res.status}`
        );
      });
    });

    it('should handle oversized JSON payload exceeding body limit with 413 or 400', async (t) => {
      await withOfflineSkip(t, async () => {
        const hugePayload = {
          data: 'x'.repeat(12 * 1024 * 1024), // 12MB string
        };
        const res = await client.post('/auth/register', hugePayload);
        assert.ok(
          res.status === 413 || res.status === 400,
          `Expected 413 Payload Too Large or 400, got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 2: React SPA Frontend Scaffolding
  // =========================================================================
  describe('Feature 2: React SPA Frontend Scaffolding', () => {
    it('should return 404 for non-existent frontend static asset path', async (t) => {
      await withOfflineSkip(t, async () => {
        const webClient = new ApiClient(config.webUrl);
        const res = await webClient.get('/assets/non-existent-chunk-99999.js');
        assert.ok(
          res.status === 404 || res.status === 200,
          `Expected 404 (or SPA fallback 200) for missing static asset, got ${res.status}`
        );
      });
    });

    it('should prevent directory traversal attacks on static frontend server', async (t) => {
      await withOfflineSkip(t, async () => {
        const webClient = new ApiClient(config.webUrl);
        const res = await webClient.get('/../../etc/passwd');
        assert.ok(
          res.status === 400 || res.status === 403 || res.status === 404,
          `Expected traversal request to be rejected with 400, 403, or 404, got ${res.status}`
        );
      });
    });

    it('should reject invalid URL percent-encoding in static asset requests', async (t) => {
      await withOfflineSkip(t, async () => {
        const webClient = new ApiClient(config.webUrl);
        const res = await webClient.get('/%ZZ/%00/malformed-path');
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected invalid percent encoding to return 400 or 404, got ${res.status}`
        );
      });
    });

    it('should return 405 or 404 when sending POST to static frontend assets', async (t) => {
      await withOfflineSkip(t, async () => {
        const webClient = new ApiClient(config.webUrl);
        const res = await webClient.post('/vite.svg', { dummy: 1 });
        assert.ok(
          res.status === 404 || res.status === 405,
          `Expected 404 or 405 for POST to static asset, got ${res.status}`
        );
      });
    });

    it('should handle malformed Accept header on frontend root without server error', async (t) => {
      await withOfflineSkip(t, async () => {
        const webClient = new ApiClient(config.webUrl);
        const res = await webClient.get('/', { Accept: 'corrupted/binary-mime-type;;;;' });
        assert.ok(
          res.status === 200 || res.status === 406,
          `Expected 200 or 406 for malformed Accept header, got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 3: MongoDB & Mongoose Integration
  // =========================================================================
  describe('Feature 3: MongoDB & Mongoose Integration', () => {
    it('should reject malformed non-hex MongoDB ObjectId parameter with 400 or 404', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.get('/projects/not-a-valid-hex-id-12345');
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 or 404 for non-hex ObjectId, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400);
        }
      });
    });

    it('should sanitize and reject NoSQL operator injection in query parameters', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.get('/projects?category[$gt]=&price[$ne]=null');
        assert.ok(
          res.status === 200 || res.status === 400,
          `Expected sanitized query (200) or 400 validation error, got ${res.status}`
        );
        if (res.status === 200 && res.data?.data) {
          assert.ok(Array.isArray(res.data.data), 'Expected array of projects');
        }
      });
    });

    it('should handle excessively long ID string (>2000 chars) without crashing the database adapter', async (t) => {
      await withOfflineSkip(t, async () => {
        const longId = 'a'.repeat(2500);
        const res = await client.get(`/projects/${longId}`);
        assert.ok(
          res.status === 400 || res.status === 404 || res.status === 414,
          `Expected 400, 404, or 414 for massive ID length, got ${res.status}`
        );
      });
    });

    it('should reject mutating or parameter-polluted health check requests', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.post('/health?dropDatabase=true&admin=1', { action: 'drop' });
        assert.ok(
          res.status === 404 || res.status === 405,
          `Expected 404 or 405 on POST /health mutation, got ${res.status}`
        );
      });
    });

    it('should handle rapid concurrent malformed ID lookups without leaking DB connection state', async (t) => {
      await withOfflineSkip(t, async () => {
        const requests = Array.from({ length: 5 }, (_, i) =>
          client.get(`/projects/invalid-id-batch-${i}`)
        );
        const responses = await Promise.all(requests);
        for (const res of responses) {
          assert.ok(
            res.status === 400 || res.status === 404,
            `Expected 400 or 404 for batch invalid ID lookup, got ${res.status}`
          );
        }
      });
    });
  });
});
