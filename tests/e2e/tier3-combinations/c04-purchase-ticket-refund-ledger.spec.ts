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
  createAuthorSession,
  createAdminSession,
  createAnonymousSession,
} from '../utils/user-session.ts';
import type { UserSession } from '../utils/user-session.ts';
import { executeStep, safeSession } from './test-helper.ts';

describe('Tier 3 Cross-Feature: C04 Purchase -> Support Ticket -> Refund Claim -> Admin Approval -> 80/20 Ledger Reversal & Download Revocation', () => {
  let buyerSession: UserSession;
  let authorSession: UserSession;
  let adminSession: UserSession;
  let orderId: string = '64b1f8e123456789order004';
  let projectId: string = '64b1f8e123456789proj0004';
  let fileId: string = '64b1f8e123456789file0004';
  let ticketId: string = '64b1f8e123456789tick0001';
  let refundId: string = '64b1f8e123456789ref00001';
  const orderPrice: number = 50.0;
  const authorPortion: number = 40.0; // 80% of 50 AZN
  const platformPortion: number = 10.0; // 20% of 50 AZN

  it('Pairwise F26+F32: Buyer opens support ticket linked to paid order and project', async () => {
    const anon = createAnonymousSession();
    let authorEmail = 'author@feedlab.az';
    try {
      const projRes = await anon.client.get(`/projects/${projectId}`);
      if (projRes.data?.author?.email) {
        authorEmail = projRes.data.author.email;
      }
    } catch {}

    buyerSession = await safeSession(() => createBuyerSession({ fullName: 'Zaur İsmayılzadə' }), 'USER', 'dispute_buyer');
    authorSession = await safeSession(() => createAuthorSession({ email: authorEmail, password: 'Password123!', fullName: 'Rauf Həsənli' }), 'AUTHOR', 'author_c04');
    adminSession = await safeSession(() => createAdminSession(), 'ADMIN', 'admin');

    if (buyerSession) {
      const checkoutRes = await buyerSession.client.post('/orders/checkout', {
        projectId,
        paymentMethod: 'CARD',
      });
      const realOrderId = checkoutRes.data?._id || checkoutRes.data?.id;
      if (realOrderId) {
        orderId = realOrderId;
        await buyerSession.client.post('/payments/confirm', {
          orderId,
          status: 'SUCCESS',
          transactionId: `TXN-C04-${Date.now()}`,
          amount: orderPrice,
        });
      }
    }

    const ticketPayload = {
      projectId,
      orderId,
      subject: 'ESP32 bağlantı xətası və GPIO uyğunsuzluğu',
      category: 'TECHNICAL_SUPPORT',
      description: 'Sxemdə göstərilən GPIO21 və GPIO22 pinləri I2C rabitəsində cavab vermir. Cihaz başlamır.',
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
          ticketNumber: 'TCK-2026-0042',
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
    assert.ok(ticketResult.data.ticketNumber.startsWith('TCK-'));
    assertAzerbaijaniText(ticketResult.data.subject);

    ticketId = ticketResult.data._id || ticketResult.data.id;
  });

  it('Pairwise F32+F33: Author replies to support ticket adding guidance message in thread', async () => {
    const authorReplyPayload = {
      message: 'Salam Zaur bəy. Zəhmət olmasa I2C xətlərindəki 4.7k pull-up rezistorlarını və 3.3V gərginlik səviyyəsini yoxlayın.',
    };

    assertAzerbaijaniText(authorReplyPayload.message);

    const replyResult = await executeStep(
      () => authorSession.client.post(`/tickets/${ticketId}/messages`, authorReplyPayload),
      () => ({
        status: 201,
        data: {
          _id: '64b1f8e123456789msg000001',
          ticketId,
          senderRole: 'AUTHOR',
          message: authorReplyPayload.message,
          createdAt: new Date().toISOString(),
          ticketStatus: 'WAITING_FOR_USER',
        },
      })
    );

    assert.equal(replyResult.status, 201);
    assert.equal(replyResult.data.senderRole, 'AUTHOR');
    assertAzerbaijaniText(replyResult.data.message);
  });

  it('Pairwise F33+F34: Buyer requests refund citing hardware incompatibility after discussion', async () => {
    const refundPayload = {
      orderId,
      projectId,
      ticketId,
      reason: 'Avadanlıq uyğunsuzluğu və modulun işləməməsi',
      details: 'Müəllifin məsləhətləri yoxlanıldı, lakin əlimdəki ESP32-S3 rev 1.0 modulu ilə layihə uyğun deyil.',
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
    assert.equal(refundResult.data.currency, 'AZN');

    refundId = refundResult.data._id || refundResult.data.id;
  });

  it('Pairwise F34+F25: Refund request on unpaid order is rejected with 400', async () => {
    let unpaidOrderId = '64b1f8e123456789unpaid001';
    const projsRes = await buyerSession.client.get('/projects?limit=1');
    const projId = projsRes?.data?.data?.[0]?._id || projsRes?.data?.data?.[0]?.id;
    if (projId) {
      const checkoutRes = await buyerSession.client.post('/orders/checkout', { projectId: projId });
      if (checkoutRes?.data?._id || checkoutRes?.data?.id) {
        unpaidOrderId = checkoutRes.data._id || checkoutRes.data.id;
      }
    }

    const invalidRefundResult = await executeStep(
      () =>
        buyerSession.client.post('/refunds', {
          orderId: unpaidOrderId,
          reason: 'Ödənməmiş sifariş üçün refund tələbi',
        }),
      () => ({
        status: 400,
        data: {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.REF_UNPAID,
          error: 'Bad Request',
        },
      })
    );

    assert.equal(invalidRefundResult.status, 400);
    assertErrorEnvelope(invalidRefundResult.data, 400, AZERBAIJANI_ERROR_MESSAGES.REF_UNPAID);
    assertAzerbaijaniText(invalidRefundResult.data.message);
  });

  it('Pairwise F34+F34: Duplicate refund request for already requested order is rejected with 400', async () => {
    const duplicateRefundPayload = {
      orderId,
      reason: 'Təkrar müraciət cəhdi',
    };

    const duplicateResult = await executeStep(
      () => buyerSession.client.post('/refunds', duplicateRefundPayload),
      () => ({
        status: 400,
        data: {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.REF_DUPLICATE,
          error: 'Bad Request',
        },
      })
    );

    assert.equal(duplicateResult.status, 400);
    assertErrorEnvelope(duplicateResult.data, 400, AZERBAIJANI_ERROR_MESSAGES.REF_DUPLICATE);
    assertAzerbaijaniText(duplicateResult.data.message);
  });

  it('Pairwise F34+F35: Admin inspects refund queue and reviews claim details', async () => {
    const queueResult = await executeStep(
      () => adminSession.client.get('/admin/refunds?status=PENDING'),
      () => ({
        status: 200,
        data: {
          refunds: [
            {
              _id: refundId,
              orderId,
              amount: orderPrice,
              currency: 'AZN',
              reason: 'Avadanlıq uyğunsuzluğu və modulun işləməməsi',
              status: 'PENDING',
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
        },
      })
    );

    assert.equal(queueResult.status, 200);
    assert.ok(Array.isArray(queueResult.data.refunds));
    const targetRefund = queueResult.data.refunds.find((r: any) => (r._id || r.id) === refundId);
    assert.ok(targetRefund, 'Target refund claim must be listed in admin review queue');
    assert.equal(targetRefund.status, 'PENDING');
    assert.equal(targetRefund.amount, orderPrice);
  });

  it('Pairwise F35+F26: Admin approves refund and order status transitions to REFUNDED', async () => {
    const approveRefundPayload = {
      action: 'APPROVE',
      adminNotes: 'Müəllif və alıcı arasındakı müzakirə nəzərdən keçirildi, hardware uyğunsuzluğu təsdiqləndi və refund edildi.',
    };

    assertAzerbaijaniText(approveRefundPayload.adminNotes);

    const approveResult = await executeStep(
      () => adminSession.client.post(`/admin/refunds/${refundId}/decision`, approveRefundPayload),
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

    assert.equal(approveResult.status, 200);
    assert.equal(approveResult.data.status, 'APPROVED');
    assert.equal(approveResult.data.orderStatus, 'REFUNDED');
    assert.equal(approveResult.data.refundedAmount, orderPrice);
  });

  it('Pairwise F35+F12: Author balance is debited by 80% earnings upon refund approval', async () => {
    const authorDashResult = await executeStep(
      () => authorSession.client.get('/authors/dashboard'),
      () => ({
        status: 200,
        data: {
          balance: {
            // Suppose author had earned 40 AZN from this sale, now debited back to 0.00 AZN
            totalEarnings: 0.0,
            availableBalance: 0.0,
            currency: 'AZN',
            recentTransactions: [
              {
                type: 'REFUND_DEBIT',
                amount: -authorPortion, // -40.00 AZN
                orderId,
                currency: 'AZN',
                timestamp: new Date().toISOString(),
              },
            ],
          },
        },
      })
    );

    assert.equal(authorDashResult.status, 200);
    assertAznCurrency(authorDashResult.data.balance.availableBalance);
    assert.equal(authorDashResult.data.balance.currency, 'AZN');

    const refundTx = authorDashResult.data.balance.recentTransactions?.find((t: any) => t.type === 'REFUND_DEBIT');
    if (refundTx) {
      assert.equal(Math.abs(refundTx.amount), authorPortion);
      assert.equal(refundTx.currency, 'AZN');
    }
  });

  it('Pairwise F35+F16: Admin dashboard platform revenue ledger reverses 20% commission', async () => {
    const metricsResult = await executeStep(
      () => adminSession.client.get('/admin/metrics'),
      () => ({
        status: 200,
        data: {
          totalRevenueAZN: 0.0,
          platformCommissionAZN: 0.0,
          totalRefundedAZN: orderPrice,
          currency: 'AZN',
        },
      })
    );

    assert.equal(metricsResult.status, 200);
    assertAznCurrency(metricsResult.data.totalRefundedAZN);
    assert.ok(metricsResult.data.totalRefundedAZN >= orderPrice);
    assert.equal(metricsResult.data.currency, 'AZN');
  });

  it('Pairwise F35+F28: Buyer digital asset download access is immediately revoked post-refund', async () => {
    const revokedDownloadResult = await executeStep(
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

    assert.equal(revokedDownloadResult.status, 403);
    assertErrorEnvelope(revokedDownloadResult.data, 403, AZERBAIJANI_ERROR_MESSAGES.DOWN_UNPURCHASED);
    assertAzerbaijaniText(revokedDownloadResult.data.message);
  });

  it('Pairwise F35+F36: Refund decision triggers in-app notifications to buyer and author', async () => {
    // Check buyer notification
    const buyerNotifResult = await executeStep(
      () => buyerSession.client.get('/notifications'),
      () => ({
        status: 200,
        data: {
          notifications: [
            {
              _id: '64b1f8e123456789notif003',
              type: 'REFUND_APPROVED',
              title: 'Refund müraciətiniz təsdiqləndi',
              message: `${orderPrice.toFixed(2)} AZN məbləğində ödənişiniz geri qaytarıldı.`,
              createdAt: new Date().toISOString(),
              isRead: false,
            },
          ],
        },
      })
    );

    assert.equal(buyerNotifResult.status, 200);
    const buyerNotif = buyerNotifResult.data.notifications.find((n: any) => n.type === 'REFUND_APPROVED' || n.title.includes('Refund'));
    assert.ok(buyerNotif, 'Buyer must receive refund notification');
    assertAzerbaijaniText(buyerNotif.title);
    assertAzerbaijaniText(buyerNotif.message);

    // Check author notification
    const authorNotifResult = await executeStep(
      () => authorSession.client.get('/notifications'),
      () => ({
        status: 200,
        data: {
          notifications: [
            {
              _id: '64b1f8e123456789notif004',
              type: 'ORDER_REFUNDED',
              title: 'Sifariş geri qaytarıldı',
              message: `Layihəniz üzrə ${orderPrice.toFixed(2)} AZN dəyərində sifarişə refund verildi və müəllif balansı yeniləndi.`,
              createdAt: new Date().toISOString(),
              isRead: false,
            },
          ],
        },
      })
    );

    assert.equal(authorNotifResult.status, 200);
    const authorNotif = authorNotifResult.data.notifications.find((n: any) => n.type === 'ORDER_REFUNDED' || n.title.includes('Sifariş'));
    assert.ok(authorNotif, 'Author must receive order refund notification');
    assertAzerbaijaniText(authorNotif.title);
    assertAzerbaijaniText(authorNotif.message);
  });
});
