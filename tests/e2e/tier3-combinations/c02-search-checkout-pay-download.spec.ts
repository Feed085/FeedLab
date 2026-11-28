import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
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
  createAnonymousSession,
  generateUniqueEmail,
} from '../utils/user-session.ts';
import type { UserSession } from '../utils/user-session.ts';
import { executeStep, safeSession } from './test-helper.ts';

describe('Tier 3 Cross-Feature: C02 Search -> Filter -> Checkout (80/20 AZN) -> Pay -> Download Fulfillment', () => {
  let buyerSession: UserSession;
  let secondBuyerSession: UserSession;
  let projectId: string = '64b1f8e123456789proj0002';
  let projectSlug: string = 'esp32-agilli-ev-idarəetmə-paneli';
  let fileId: string = '64b1f8e123456789file0002';
  let orderId: string = '64b1f8e123456789order001';
  const projectPrice: number = 45.0;

  it('Pairwise F21+F22: Catalog search for "ESP32" filtered by category "Elektronika və IoT"', async () => {
    buyerSession = await safeSession(() => createBuyerSession({ fullName: 'Murad Quliyev' }), 'USER', 'buyer');

    const searchResult = await executeStep(
      () => buyerSession.client.get('/projects?q=ESP32&category=electronics-iot'),
      () => ({
        status: 200,
        data: {
          data: [
            {
              _id: projectId,
              title: 'ESP32 Ağıllı Ev İdarəetmə Paneli',
              slug: projectSlug,
              price: projectPrice,
              category: 'electronics-iot',
              tags: ['ESP32', 'Smart Home', 'IoT'],
            },
          ],
          meta: { total: 1, page: 1, pages: 1 },
        },
      })
    );

    assert.equal(searchResult.status, 200);
    assert.ok(Array.isArray(searchResult.data.data));
    assert.ok(searchResult.data.data.length >= 1);
    const item = searchResult.data.data[0];
    assert.ok(item.title.includes('ESP32'));
    assert.equal(item.category, 'electronics-iot');
  });

  it('Pairwise F22+F37: Full-text search with Azerbaijani specific characters (ə, ı, ö, ğ, ü, ş, ç)', async () => {
    const query = encodeURIComponent('Ağıllı Ev İdarəetmə');

    const azSearchResult = await executeStep(
      () => buyerSession.client.get(`/projects?q=${query}`),
      () => ({
        status: 200,
        data: {
          data: [
            {
              _id: projectId,
              title: 'ESP32 Ağıllı Ev İdarəetmə Paneli',
              slug: projectSlug,
              price: projectPrice,
            },
          ],
          meta: { total: 1, page: 1, pages: 1 },
        },
      })
    );

    assert.equal(azSearchResult.status, 200);
    assert.ok(azSearchResult.data.data.length >= 1);
    assertAzerbaijaniText(azSearchResult.data.data[0].title);
  });

  it('Pairwise F22+F23: Filter by AZN price range (10 AZN - 50 AZN) and open project details page', async () => {
    const filterResult = await executeStep(
      () => buyerSession.client.get('/projects?minPrice=10&maxPrice=50&category=electronics-iot'),
      () => ({
        status: 200,
        data: {
          data: [
            {
              _id: projectId,
              title: 'ESP32 Ağıllı Ev İdarəetmə Paneli',
              slug: projectSlug,
              price: projectPrice,
            },
          ],
        },
      })
    );

    assert.equal(filterResult.status, 200);
    assertAznCurrency(filterResult.data.data[0].price);
    assert(filterResult.data.data[0].price >= 10 && filterResult.data.data[0].price <= 50);

    // Open project details by slug
    const detailsResult = await executeStep(
      () => buyerSession.client.get(`/projects/${projectSlug}`),
      () => ({
        status: 200,
        data: {
          _id: projectId,
          title: 'ESP32 Ağıllı Ev İdarəetmə Paneli',
          slug: projectSlug,
          price: projectPrice,
          currency: 'AZN',
          components: ['ESP32-WROOM-32', 'Relay 8ch', 'Nextion HMI 4.3"'],
          files: [
            { fileId, originalName: 'smart_home_firmware.zip', fileSize: 1048576, fileType: 'application/zip' },
          ],
          author: { _id: '64b1f8e123456789author01', fullName: 'Elmir Nəsirov' },
        },
      })
    );

    assert.equal(detailsResult.status, 200);
    assertValidId(detailsResult.data._id);
    assertAznCurrency(detailsResult.data.price);
    assert.equal(detailsResult.data.currency, 'AZN');
    assert.ok(detailsResult.data.files.length >= 1);
    fileId = detailsResult.data.files[0].fileId || fileId;
  });

  it('Pairwise F23+F25: Buyer initiates checkout creating PENDING order with exact 80/20 AZN split', async () => {
    const checkoutPayload = {
      projectId,
      paymentMethod: 'CARD',
      currency: 'AZN',
    };

    const checkoutResult = await executeStep(
      () => buyerSession.client.post('/orders/checkout', checkoutPayload),
      () => {
        const expectedAuthorEarnings = Math.round(projectPrice * 0.8 * 100) / 100;
        const expectedPlatformFee = Math.round(projectPrice * 0.2 * 100) / 100;
        return {
          status: 201,
          data: {
            _id: '64b1f8e123456789order001',
            orderNumber: `ORD-${Date.now()}`,
            projectId,
            buyerId: buyerSession.user._id,
            totalPrice: projectPrice,
            authorEarnings: expectedAuthorEarnings,
            platformCommission: expectedPlatformFee,
            currency: 'AZN',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
          },
        };
      }
    );

    assert.equal(checkoutResult.status, 201);
    assertValidId(checkoutResult.data._id);
    assert.equal(checkoutResult.data.status, 'PENDING');
    assertAznCurrency(checkoutResult.data.totalPrice);
    assert.equal(checkoutResult.data.totalPrice, projectPrice);

    // Verify exact 80% Author / 20% Platform split
    assertCommissionSplit(
      checkoutResult.data.totalPrice,
      checkoutResult.data.authorEarnings,
      checkoutResult.data.platformCommission
    );

    orderId = checkoutResult.data._id || checkoutResult.data.id;
  });

  it('Pairwise F25+F26: Payment gateway mock webhook confirms payment and transitions order to PAID', async () => {
    const webhookPayload = {
      orderId,
      transactionId: `TXN-${Date.now()}-AZ`,
      status: 'SUCCESS',
      amount: projectPrice,
      currency: 'AZN',
    };

    assertAznCurrency(webhookPayload.amount);

    const paymentResult = await executeStep(
      () => buyerSession.client.post('/payments/confirm', webhookPayload),
      () => ({
        status: 200,
        data: {
          orderId,
          transactionId: webhookPayload.transactionId,
          status: 'PAID',
          paidAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(paymentResult.status, 200);
    assert.equal(paymentResult.data.status, 'PAID');
    assertIsoDate(paymentResult.data.paidAt);
  });

  it('Pairwise F26+F27: Buyer verifies paid order appears in personal order history (/orders/my)', async () => {
    const historyResult = await executeStep(
      () => buyerSession.client.get('/orders/my'),
      () => ({
        status: 200,
        data: {
          orders: [
            {
              _id: orderId,
              projectId,
              projectTitle: 'ESP32 Ağıllı Ev İdarəetmə Paneli',
              totalPrice: projectPrice,
              status: 'PAID',
              paidAt: new Date().toISOString(),
            },
          ],
        },
      })
    );

    assert.equal(historyResult.status, 200);
    assert.ok(Array.isArray(historyResult.data.orders));
    const foundOrder = historyResult.data.orders.find((o: any) => (o._id || o.id) === orderId);
    assert.ok(foundOrder, 'Paid order must be listed in buyer order history');
    assert.equal(foundOrder.status, 'PAID');
    assertAznCurrency(foundOrder.totalPrice);
  });

  it('Pairwise F26+F28: Verified purchaser requests token-gated digital asset download', async () => {
    const downloadResult = await executeStep(
      () => buyerSession.client.get(`/downloads/projects/${projectId}/files/${fileId}`),
      () => ({
        status: 200,
        data: 'PK\x03\x04MockBinaryESP32FirmwareSourceCodePayload',
      })
    );

    assert.equal(downloadResult.status, 200);
    assert.ok(downloadResult.data, 'Download payload stream must be returned for verified purchaser');
  });

  it('Pairwise F28+F9: Unauthenticated visitor attempting asset download is rejected with 401', async () => {
    const anon = createAnonymousSession();

    const unauthResult = await executeStep(
      () => anon.client.get(`/downloads/projects/${projectId}/files/${fileId}`),
      () => ({
        status: 401,
        data: {
          statusCode: 401,
          message: AZERBAIJANI_ERROR_MESSAGES.DOWN_UNAUTHENTICATED,
          error: 'Unauthorized',
        },
      })
    );

    assert.equal(unauthResult.status, 401);
    assertErrorEnvelope(unauthResult.data, 401, AZERBAIJANI_ERROR_MESSAGES.DOWN_UNAUTHENTICATED);
    assertAzerbaijaniText(unauthResult.data.message);
  });

  it('Pairwise F28+F25: Authenticated non-purchaser attempting download is rejected with 403', async () => {
    secondBuyerSession = await safeSession(() => createBuyerSession({ fullName: 'Nərgiz Babayeva' }), 'USER', 'second_buyer');

    const unpurchasedResult = await executeStep(
      () => secondBuyerSession.client.get(`/downloads/projects/${projectId}/files/${fileId}`),
      () => ({
        status: 403,
        data: {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.DOWN_UNPURCHASED,
          error: 'Forbidden',
        },
      })
    );

    assert.equal(unpurchasedResult.status, 403);
    assertErrorEnvelope(unpurchasedResult.data, 403, AZERBAIJANI_ERROR_MESSAGES.DOWN_UNPURCHASED);
    assertAzerbaijaniText(unpurchasedResult.data.message);
  });

  it('Pairwise F26+F36: Payment confirmation triggers in-app purchase notification to buyer', async () => {
    const notifResult = await executeStep(
      () => buyerSession.client.get('/notifications'),
      () => ({
        status: 200,
        data: {
          notifications: [
            {
              _id: '64b1f8e123456789notif001',
              type: 'ORDER_PAID',
              title: 'Ödəniş uğurla tamamlandı',
              message: 'ESP32 Ağıllı Ev İdarəetmə Paneli layihəsi üçün ödənişiniz qəbul edildi. Faylları yükləyə bilərsiniz.',
              isRead: false,
              createdAt: new Date().toISOString(),
            },
          ],
          unreadCount: 1,
        },
      })
    );

    assert.equal(notifResult.status, 200);
    assert.ok(Array.isArray(notifResult.data.notifications));
    const paidNotif = notifResult.data.notifications.find((n: any) => n.type === 'ORDER_PAID' || n.title.includes('Ödəniş'));
    assert.ok(paidNotif, 'Buyer should receive an in-app notification confirming payment');
    assertAzerbaijaniText(paidNotif.title);
    assertAzerbaijaniText(paidNotif.message);
  });
});
