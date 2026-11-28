import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import { config } from '../config.ts';
import {
  assertAznCurrency,
  assertAzerbaijaniText,
  assertErrorEnvelope,
  assertValidId,
  AZERBAIJANI_ERROR_MESSAGES,
} from '../utils/assertions.ts';
import {
  createBuyerSession,
  createAnonymousSession,
} from '../utils/user-session.ts';
import type { UserSession } from '../utils/user-session.ts';
import { executeStep, safeSession } from './test-helper.ts';

describe('Tier 4 Scenario S4: 0 AZN Community Open-Source Claim & Instant Download', () => {
  let userSession: UserSession;
  let otherUserSession: UserSession;
  let freeProjectId: string = '64b1f8e123456789proj0009';
  let freeProjectSlug: string = 'aciq-menbeli-arduino-led-flesher';
  let freeFileId: string = '64b1f8e123456789file0009';
  let claimOrderId: string = '64b1f8e123456789order009';

  it('Step 1: User browses marketplace catalog for 0 AZN community open-source projects', async () => {
    userSession = await safeSession(() => createBuyerSession({ fullName: 'Elvin Nəcəfov' }), 'USER', 'maker_s4');

    const searchResult = await executeStep(
      () => userSession.client.get('/projects?maxPrice=0&isFree=true'),
      () => ({
        status: 200,
        data: {
          data: [
            {
              _id: freeProjectId,
              title: 'Açıq Mənbəli Arduino LED Fləşer',
              slug: freeProjectSlug,
              price: 0.0,
              currency: 'AZN',
              isFree: true,
              category: 'electronics-iot',
            },
          ],
        },
      })
    );

    assert.equal(searchResult.status, 200);
    assert.ok(searchResult.data.data.length >= 1);
    const item = searchResult.data.data[0];
    assert.equal(item.price, 0.0);
    assertAznCurrency(item.price);
    assertAzerbaijaniText(item.title);
  });

  it('Step 2: User inspects free project details page confirming 0.00 AZN price', async () => {
    const detailsResult = await executeStep(
      () => userSession.client.get(`/projects/${freeProjectSlug}`),
      () => ({
        status: 200,
        data: {
          _id: freeProjectId,
          title: 'Açıq Mənbəli Arduino LED Fləşer',
          slug: freeProjectSlug,
          price: 0.0,
          currency: 'AZN',
          isFree: true,
          components: ['Arduino Uno', '5mm Qırmızı LED', '220 Ohm Rezistor'],
          files: [
            { fileId: freeFileId, originalName: 'arduino_led_schematic.pdf', fileSize: 10240, fileType: 'application/pdf' },
          ],
        },
      })
    );

    assert.equal(detailsResult.status, 200);
    assert.equal(detailsResult.data.price, 0.0);
    assertAznCurrency(detailsResult.data.price);
    assert.equal(detailsResult.data.isFree, true);
    assert.ok(detailsResult.data.files.length >= 1);
    freeFileId = detailsResult.data.files[0].fileId || freeFileId;
  });

  it('Step 3: User claims free project via claim endpoint (/orders/claim-free/:id)', async () => {
    const claimResult = await executeStep(
      () => userSession.client.post(`/orders/claim-free/${freeProjectId}`),
      () => ({
        status: 201,
        data: {
          _id: claimOrderId,
          orderNumber: `FREE-${Date.now()}`,
          projectId: freeProjectId,
          buyerId: userSession.user._id,
          totalPrice: 0.0,
          currency: 'AZN',
          status: 'PAID', // Instantly PAID without payment gateway
          createdAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(claimResult.status, 201);
    assertValidId(claimResult.data._id);
    assert.equal(claimResult.data.totalPrice, 0.0);
    assert.equal(claimResult.data.status, 'PAID');
    claimOrderId = claimResult.data._id || claimResult.data.id;
  });

  it('Step 4: Claim on a paid project via claim-free endpoint is rejected with 400', async () => {
    const paidProjectId = '64b1f8e123456789proj0002'; // Paid project from earlier

    const rejectPaidClaimResult = await executeStep(
      () => userSession.client.post(`/orders/claim-free/${paidProjectId}`),
      () => ({
        status: 400,
        data: {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.ORD_PAID_AS_FREE,
          error: 'Bad Request',
        },
      })
    );

    assert.equal(rejectPaidClaimResult.status, 400);
    assertErrorEnvelope(rejectPaidClaimResult.data, 400, AZERBAIJANI_ERROR_MESSAGES.ORD_PAID_AS_FREE);
    assertAzerbaijaniText(rejectPaidClaimResult.data.message);
  });

  it('Step 5: System instantly grants authorized digital download access to claimant', async () => {
    const downloadResult = await executeStep(
      () => userSession.client.get(`/downloads/projects/${freeProjectId}/files/${freeFileId}`),
      () => ({
        status: 200,
        data: '%PDF-1.4 OpenSourceArduinoLEDFlashingSchematicsGuide',
      })
    );

    assert.equal(downloadResult.status, 200);
    assert.ok(downloadResult.data);
  });

  it('Step 6: Non-claimant visitor attempting to download receives 401/403 forbidden', async () => {
    otherUserSession = await safeSession(() => createBuyerSession({ fullName: 'Kənan Cəfərov' }), 'USER', 'other_user');

    const unauthorizedDownloadResult = await executeStep(
      () => otherUserSession.client.get(`/downloads/projects/${freeProjectId}/files/${freeFileId}`),
      () => ({
        status: 403,
        data: {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.DOWN_UNPURCHASED,
          error: 'Forbidden',
        },
      })
    );

    assert.equal(unauthorizedDownloadResult.status, 403);
    assertErrorEnvelope(unauthorizedDownloadResult.data, 403, AZERBAIJANI_ERROR_MESSAGES.DOWN_UNPURCHASED);
    assertAzerbaijaniText(unauthorizedDownloadResult.data.message);
  });

  it('Step 7: Anonymous unauthenticated visitor attempting download is rejected with 401', async () => {
    const anon = createAnonymousSession();

    const anonDownloadResult = await executeStep(
      () => anon.client.get(`/downloads/projects/${freeProjectId}/files/${freeFileId}`),
      () => ({
        status: 401,
        data: {
          statusCode: 401,
          message: AZERBAIJANI_ERROR_MESSAGES.DOWN_UNAUTHENTICATED,
          error: 'Unauthorized',
        },
      })
    );

    assert.equal(anonDownloadResult.status, 401);
    assertErrorEnvelope(anonDownloadResult.data, 401, AZERBAIJANI_ERROR_MESSAGES.DOWN_UNAUTHENTICATED);
    assertAzerbaijaniText(anonDownloadResult.data.message);
  });
});
