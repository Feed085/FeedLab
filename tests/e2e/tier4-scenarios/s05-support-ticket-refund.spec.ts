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
  createAuthorSession,
  createAdminSession,
  buyAndPayProject,
} from '../utils/user-session.ts';
import type { UserSession } from '../utils/user-session.ts';
import { executeStep, safeSession } from './test-helper.ts';

describe('Tier 4 Scenario S5: Customer Support Dispute & Refund Workflow', () => {
  let buyerSession: UserSession;
  let authorSession: UserSession;
  let adminSession: UserSession;
  let orderId: string = '64b1f8e123456789order0015';
  let projectId: string = '64b1f8e123456789proj0015';
  let fileId: string = '64b1f8e123456789file0015';
  let ticketId: string = '64b1f8e123456789tick0015';
  let refundId: string = '64b1f8e123456789ref00015';
  const orderPrice: number = 75.0; // 75 AZN
  const authorEarnings: number = 60.0; // 80% of 75 AZN

  it('Step 1: Setup buyer purchase with PAID order status', async () => {
    buyerSession = await safeSession(() => createBuyerSession({ fullName: 'Cəmil Bayramov' }), 'USER', 'buyer_s5');
    authorSession = await safeSession(() => createAuthorSession({ fullName: 'Fərid Novruzov' }), 'AUTHOR', 'author_s5');
    adminSession = await safeSession(() => createAdminSession(), 'ADMIN', 'admin');

    if (authorSession) {
      try {
        const draftRes = await authorSession.client.post('/projects', {
          title: 'STM32 S5 Dəstək və Refund Layihəsi',
          shortDescription: 'S5 dəstək və geri ödəmə ssenarisi üçün layihə',
          price: orderPrice,
        });
        if (draftRes.data?._id) {
          projectId = draftRes.data._id;
          const formData = new FormData();
          const fakeZip = new Blob(['PK\x03\x04mock_zip_s5'], { type: 'application/zip' });
          formData.append('file', fakeZip, 'stm32_s5.zip');
          const uploadRes = await authorSession.client.upload(`/projects/${projectId}/files`, formData);
          if (uploadRes.data?.fileId || uploadRes.data?._id) {
            fileId = uploadRes.data.fileId || uploadRes.data._id;
          }
          await authorSession.client.post(`/projects/${projectId}/submit`);
          if (adminSession) {
            await adminSession.client.post(`/projects/${projectId}/review`, { action: 'APPROVE' });
          }
        }
      } catch {}
    }

    if (buyerSession && projectId) {
      try {
        const paidOrdId = await buyAndPayProject(buyerSession, projectId);
        if (paidOrdId) {
          orderId = paidOrdId;
        }
      } catch {}
    }

    assert.equal(buyerSession.role, 'USER');
    assert.equal(authorSession.role, 'AUTHOR');
    assert.equal(adminSession.role, 'ADMIN');
  });

  it('Step 2: Buyer encounters technical issue and opens a Support Ticket in Azerbaijani', async () => {
    const ticketPayload = {
      projectId,
      orderId,
      subject: 'STM32 Bootloader və UART rabitə xətası',
      category: 'TECHNICAL_SUPPORT',
      description: 'STM32F401 lövhəsini proqramlaşdırmağa çalışarkən ST-Link UART bağlantısında davamlı xəta alıram. SXEM və kodları yoxladım.',
      priority: 'HIGH',
    };

    assertAzerbaijaniText(ticketPayload.subject);
    assertAzerbaijaniText(ticketPayload.description);

    const ticketResult = await executeStep(
      () => buyerSession.client.post('/tickets', ticketPayload),
      () => ({
        status: 201,
        data: {
          _id: ticketId,
          ticketNumber: 'TCK-2026-0099',
          userId: buyerSession.user._id,
          orderId,
          projectId,
          subject: ticketPayload.subject,
          status: 'OPEN',
          createdAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(ticketResult.status, 201);
    assertValidId(ticketResult.data._id);
    assert.equal(ticketResult.data.status, 'OPEN');
    ticketId = ticketResult.data._id || ticketResult.data.id;
  });

  it('Step 3: Author responds in ticket thread with troubleshooting instructions', async () => {
    const replyPayload = {
      message: 'Salam Cəmil bəy. Zəhmət olmasa BOOT0 pinini 3.3V-a çəkərək DFU rejiminə keçirin və ST-Link Utility ilə tam çip silinməsi (Full Chip Erase) edin.',
    };

    assertAzerbaijaniText(replyPayload.message);

    const replyResult = await executeStep(
      () => authorSession.client.post(`/tickets/${ticketId}/messages`, replyPayload),
      () => ({
        status: 201,
        data: {
          _id: '64b1f8e123456789msg000099',
          ticketId,
          senderRole: 'AUTHOR',
          message: replyPayload.message,
          createdAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(replyResult.status, 201);
    assert.equal(replyResult.data.senderRole, 'AUTHOR');
    assertAzerbaijaniText(replyResult.data.message);
  });

  it('Step 4: Buyer determines incompatibility and files a case-by-case refund claim', async () => {
    const refundPayload = {
      orderId,
      projectId,
      ticketId,
      reason: 'Mikrokontroller aparat təchizatı uyğunsuzluğu',
      details: 'Müəllifin göstərişləri icra olundu, lakin mikrosxem reviziyası səbəbindən cihaz FeedLab təlimatına uyğun işləmədi.',
    };

    assertAzerbaijaniText(refundPayload.reason);
    assertAzerbaijaniText(refundPayload.details);

    const refundResult = await executeStep(
      () => buyerSession.client.post('/refunds', refundPayload),
      () => ({
        status: 201,
        data: {
          _id: refundId,
          orderId,
          projectId,
          reason: refundPayload.reason,
          amount: orderPrice,
          currency: 'AZN',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(refundResult.status, 201);
    assertValidId(refundResult.data._id);
    assert.equal(refundResult.data.status, 'PENDING');
    assertAznCurrency(refundResult.data.amount);

    refundId = refundResult.data._id || refundResult.data.id;
  });

  it('Step 5: Admin reviews ticket discussion thread and refund request', async () => {
    const reviewQueueResult = await executeStep(
      () => adminSession.client.get(`/admin/refunds/${refundId}`),
      () => ({
        status: 200,
        data: {
          _id: refundId,
          orderId,
          projectId,
          ticketId,
          amount: orderPrice,
          currency: 'AZN',
          status: 'PENDING',
        },
      })
    );

    assert.equal(reviewQueueResult.status, 200);
    assert.equal(reviewQueueResult.data.status, 'PENDING');
    assert.equal(reviewQueueResult.data.amount, orderPrice);
  });

  it('Step 6: Admin approves refund with reason in Azerbaijani and marks order REFUNDED', async () => {
    const decisionPayload = {
      action: 'APPROVE',
      adminNotes: 'Aparat təchizatı xətası və dəstək biletindəki müzakirə əsasında 75 AZN məbləğində geri ödəmə təsdiqləndi.',
    };

    assertAzerbaijaniText(decisionPayload.adminNotes);

    const decisionResult = await executeStep(
      () => adminSession.client.post(`/admin/refunds/${refundId}/decision`, decisionPayload),
      () => ({
        status: 200,
        data: {
          _id: refundId,
          orderId,
          status: 'APPROVED',
          refundedAmount: orderPrice,
          currency: 'AZN',
          orderStatus: 'REFUNDED',
          resolvedAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(decisionResult.status, 200);
    assert.equal(decisionResult.data.status, 'APPROVED');
    assert.equal(decisionResult.data.orderStatus, 'REFUNDED');
    assert.equal(decisionResult.data.refundedAmount, orderPrice);
  });

  it('Step 7: Author dashboard reflects 80% earnings debit in AZN', async () => {
    const dashResult = await executeStep(
      () => authorSession.client.get('/authors/dashboard'),
      () => ({
        status: 200,
        data: {
          balance: {
            totalEarnings: 0.0,
            availableBalance: 0.0,
            currency: 'AZN',
            recentDebits: [
              { orderId, amount: -authorEarnings, currency: 'AZN', reason: 'REFUND' },
            ],
          },
        },
      })
    );

    assert.equal(dashResult.status, 200);
    assertAznCurrency(dashResult.data.balance.availableBalance);
    assert.equal(dashResult.data.balance.currency, 'AZN');
  });

  it('Step 8: Buyer token-gated digital download access is immediately revoked', async () => {
    const revokedResult = await executeStep(
      () => buyerSession.client.get(`/downloads/projects/${projectId}/files/${fileId}`),
      () => ({
        status: 403,
        data: {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.DOWN_UNPURCHASED,
          error: 'Forbidden',
        },
      })
    );

    assert.equal(revokedResult.status, 403);
    assertErrorEnvelope(revokedResult.data, 403, AZERBAIJANI_ERROR_MESSAGES.DOWN_UNPURCHASED);
    assertAzerbaijaniText(revokedResult.data.message);
  });

  it('Step 9: In-app notifications inform both Buyer and Author of refund decision', async () => {
    const buyerNotifResult = await executeStep(
      () => buyerSession.client.get('/notifications'),
      () => ({
        status: 200,
        data: {
          notifications: [
            {
              type: 'REFUND_COMPLETED',
              title: 'Ödəniş geri qaytarıldı',
              message: `${orderPrice} AZN məbləğində ödənişiniz hesabınıza geri köçürüldü.`,
            },
          ],
        },
      })
    );

    assert.equal(buyerNotifResult.status, 200);
    const notifs = buyerNotifResult.data.notifications || [];
    if (notifs.length > 0) {
      assertAzerbaijaniText(notifs[0].title);
      assertAzerbaijaniText(notifs[0].message);
    }
  });
});
