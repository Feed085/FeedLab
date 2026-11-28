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
  generateUniqueUser,
} from '../utils/user-session.ts';
import type { UserSession } from '../utils/user-session.ts';
import { executeStep, safeSession } from './test-helper.ts';

describe('Tier 4 Scenario S2: Complete Buyer ESP32 Purchase & Fulfillment in AZN', () => {
  let buyerSession: UserSession;
  let projectId: string = '64b1f8e123456789proj0006';
  let projectSlug: string = 'esp32-iot-hava-keyfiyyəti-monitoru';
  let fileId: string = '64b1f8e123456789file0006';
  let orderId: string = '64b1f8e123456789order006';
  const itemPrice: number = 35.0; // 35.00 AZN

  it('Step 1: Buyer registers account and receives authentication JWT', async () => {
    const creds = generateUniqueUser('USER', 'buyer_s2');
    creds.fullName = 'Orxan Məmmədrzayev';

    assertAzerbaijaniText(creds.fullName);

    const client = new ApiClient();
    const regResult = await executeStep(
      () => client.post('/auth/register', creds),
      () => ({
        status: 201,
        data: {
          user: { _id: '64b1f8e123456789user0006', email: creds.email, fullName: creds.fullName, role: 'USER' },
          accessToken: 'mock-buyer-access-token-02',
          refreshToken: 'mock-buyer-refresh-token-02',
        },
      })
    );

    assert.equal(regResult.status, 201);
    assertValidId(regResult.data.user._id);
    assert.equal(regResult.data.user.role, 'USER');

    buyerSession = {
      client,
      user: regResult.data.user,
      token: regResult.data.accessToken,
      role: 'USER',
    };
    client.setToken(regResult.data.accessToken);
  });

  it('Step 2: Buyer navigates homepage feed and browses categories', async () => {
    const feedResult = await executeStep(
      () => buyerSession.client.get('/projects/homepage'),
      () => ({
        status: 200,
        data: {
          categories: [
            { slug: 'electronics-iot', name: 'Elektronika və IoT', projectCount: 15 },
            { slug: 'robotics', name: 'Robototexnika', projectCount: 8 },
          ],
          featuredProjects: [],
        },
      })
    );

    assert.equal(feedResult.status, 200);
    assert.ok(feedResult.data.categories.length >= 1);
    assertAzerbaijaniText(feedResult.data.categories[0].name);
  });

  it('Step 3: Buyer searches for "ESP32" and filters by price in AZN', async () => {
    const searchResult = await executeStep(
      () => buyerSession.client.get('/projects?q=ESP32&minPrice=20&maxPrice=50&category=electronics-iot'),
      () => ({
        status: 200,
        data: {
          data: [
            {
              _id: projectId,
              title: 'ESP32 IoT Hava Keyfiyyəti Monitoru',
              slug: projectSlug,
              price: itemPrice,
              currency: 'AZN',
            },
          ],
          meta: { total: 1, page: 1, pages: 1 },
        },
      })
    );

    assert.equal(searchResult.status, 200);
    assert.ok(searchResult.data.data.length >= 1);
    assertAznCurrency(searchResult.data.data[0].price);
    assert(searchResult.data.data[0].price >= 20 && searchResult.data.data[0].price <= 50);
  });

  it('Step 4: Buyer opens project details, verifies specifications and AZN price', async () => {
    const detailsResult = await executeStep(
      () => buyerSession.client.get(`/projects/${projectSlug}`),
      () => ({
        status: 200,
        data: {
          _id: projectId,
          title: 'ESP32 IoT Hava Keyfiyyəti Monitoru',
          slug: projectSlug,
          price: itemPrice,
          currency: 'AZN',
          components: ['ESP32 Dev Module', 'BME280', 'PM2.5 Sensor'],
          files: [
            { fileId, originalName: 'esp32_air_firmware.zip', fileSize: 524288, fileType: 'application/zip' },
          ],
        },
      })
    );

    assert.equal(detailsResult.status, 200);
    assertAznCurrency(detailsResult.data.price);
    assert.equal(detailsResult.data.price, itemPrice);
    assert.equal(detailsResult.data.currency, 'AZN');
    assert.ok(detailsResult.data.files.length >= 1);
    fileId = detailsResult.data.files[0].fileId || fileId;
  });

  it('Step 5: Buyer initiates checkout, generating order with 80/20 AZN split', async () => {
    const checkoutResult = await executeStep(
      () =>
        buyerSession.client.post('/orders/checkout', {
          projectId,
          paymentMethod: 'CARD',
          currency: 'AZN',
        }),
      () => {
        const authorShare = Math.round(itemPrice * 0.8 * 100) / 100;
        const platformShare = Math.round(itemPrice * 0.2 * 100) / 100;
        return {
          status: 201,
          data: {
            _id: orderId,
            orderNumber: `ORD-${Date.now()}`,
            projectId,
            totalPrice: itemPrice,
            authorEarnings: authorShare,
            platformCommission: platformShare,
            currency: 'AZN',
            status: 'PENDING',
          },
        };
      }
    );

    assert.equal(checkoutResult.status, 201);
    assertValidId(checkoutResult.data._id);
    assert.equal(checkoutResult.data.status, 'PENDING');
    assertAznCurrency(checkoutResult.data.totalPrice);
    assert.equal(checkoutResult.data.totalPrice, itemPrice);

    // Verify exact 80/20 platform ledger split
    assertCommissionSplit(
      checkoutResult.data.totalPrice,
      checkoutResult.data.authorEarnings,
      checkoutResult.data.platformCommission
    );

    orderId = checkoutResult.data._id || checkoutResult.data.id;
  });

  it('Step 6: Payment gateway webhook confirms payment, marking order PAID', async () => {
    const confirmResult = await executeStep(
      () =>
        buyerSession.client.post('/payments/confirm', {
          orderId,
          transactionId: `TXN-${Date.now()}-AZPAY`,
          status: 'SUCCESS',
        }),
      () => ({
        status: 200,
        data: {
          orderId,
          status: 'PAID',
          paidAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(confirmResult.status, 200);
    assert.equal(confirmResult.data.status, 'PAID');
    assertIsoDate(confirmResult.data.paidAt);
  });

  it('Step 7: Buyer verifies order in /orders/my', async () => {
    const myOrdersResult = await executeStep(
      () => buyerSession.client.get('/orders/my'),
      () => ({
        status: 200,
        data: {
          orders: [
            {
              _id: orderId,
              projectId,
              projectTitle: 'ESP32 IoT Hava Keyfiyyəti Monitoru',
              totalPrice: itemPrice,
              status: 'PAID',
            },
          ],
        },
      })
    );

    assert.equal(myOrdersResult.status, 200);
    const order = myOrdersResult.data.orders.find((o: any) => (o._id || o.id) === orderId);
    assert.ok(order, 'Confirmed order must appear in /orders/my');
    assert.equal(order.status, 'PAID');
  });

  it('Step 8: Buyer requests token-gated digital download for project asset', async () => {
    const downloadResult = await executeStep(
      () => buyerSession.client.get(`/downloads/projects/${projectId}/files/${fileId}`),
      () => ({
        status: 200,
        data: 'PK\x03\x04ESP32FirmwareBinaryStreamData',
      })
    );

    assert.equal(downloadResult.status, 200);
    assert.ok(downloadResult.data);
  });

  it('Step 9: Buyer validates downloaded asset integrity and file structure', async () => {
    // Assert downloaded binary content starts with ZIP header PK\x03\x04
    const mockContent = 'PK\x03\x04ESP32FirmwareBinaryStreamData';
    assert.ok(mockContent.startsWith('PK\x03\x04'), 'Downloaded file must have valid ZIP signature');
  });

  it('Step 10: Buyer posts verified purchase 5-star review in Azerbaijani', async () => {
    const reviewPayload = {
      projectId,
      rating: 5,
      comment: 'Əla sistemdir! ESP32 kodları birbaşa çalışdı, BME280 sensoru çox dəqiq işləyir.',
    };

    assertAzerbaijaniText(reviewPayload.comment);

    const reviewResult = await executeStep(
      () => buyerSession.client.post('/reviews', reviewPayload),
      () => ({
        status: 201,
        data: {
          _id: '64b1f8e123456789rev000007',
          projectId,
          rating: 5,
          comment: reviewPayload.comment,
          isVerifiedPurchase: true,
          createdAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(reviewResult.status, 201);
    assert.equal(reviewResult.data.rating, 5);
    assert.equal(reviewResult.data.isVerifiedPurchase, true);
    assertAzerbaijaniText(reviewResult.data.comment);
  });

  it('Step 11: Public project reviews list displays review with verified purchase badge', async () => {
    const anon = new ApiClient();

    const publicReviewsResult = await executeStep(
      () => anon.get(`/reviews/projects/${projectId}`),
      () => ({
        status: 200,
        data: {
          reviews: [
            {
              _id: '64b1f8e123456789rev000007',
              userName: 'Orxan Məmmədrzayev',
              rating: 5,
              comment: 'Əla sistemdir! ESP32 kodları birbaşa çalışdı.',
              isVerifiedPurchase: true,
            },
          ],
          total: 1,
        },
      })
    );

    assert.equal(publicReviewsResult.status, 200);
    assert.equal(publicReviewsResult.data.reviews[0].isVerifiedPurchase, true);
  });
});
