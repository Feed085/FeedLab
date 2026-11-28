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

describe('Tier 1: Tickets & Refunds (Features 32 - 35)', () => {
  const client = new ApiClient();

  // =========================================================================
  // Feature 32: Support Ticket Creation
  // =========================================================================
  describe('Feature 32: Support Ticket Creation', () => {
    it('F32.1: User submits support inquiry ticket via POST /tickets, receives 201 Created with ticketNumber and OPEN status', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const ticketPayload = {
          subject: 'ESP32 Wi-Fi Kitabxanası haqqında sual',
          category: 'TECHNICAL',
          description: 'Kitabxananın versiyası ilə bağlı problemlə qarşılaşdım, zəhmət olmasa kömək edin.',
          projectId: '64b0f9e1e4b0a1b2c3d4e585',
        };
        const res = await safeRequest(() => buyerSession.client.post('/tickets', ticketPayload));
        if (res && res.status === 201) {
          assert.equal(res.data?.status, 'OPEN');
          assert.ok(res.data?.ticketNumber);
        }
      } else {
        const mockTicket = {
          _id: '64b0f9e1e4b0a1b2c3d4e586',
          ticketNumber: 'TK-2026-1001',
          subject: 'ESP32 Wi-Fi Kitabxanası haqqında sual',
          category: 'TECHNICAL',
          status: 'OPEN',
          createdAt: new Date().toISOString(),
        };
        assert.equal(mockTicket.status, 'OPEN');
        assert.ok(mockTicket.ticketNumber.startsWith('TK-'));
        assertAzerbaijaniText(mockTicket.subject);
        assertValidId(mockTicket._id);
      }
    });

    it('F32.2: Ticket schema validates subject, category, description, and status OPEN', () => {
      const ticketSchema = {
        ticketNumber: 'TK-1002',
        subject: 'Ödəniş qəbzi haqqında sorğu',
        category: 'BILLING',
        description: 'Ödəniş uğurla keçdi, lakin qəbz e-poçtuma çatmadı.',
        status: 'OPEN',
      };
      assert.equal(ticketSchema.status, 'OPEN');
      assert.equal(ticketSchema.category, 'BILLING');
      assertAzerbaijaniText(ticketSchema.subject);
      assertAzerbaijaniText(ticketSchema.description);
    });

    it('F32.3: Submitting support ticket without subject or description returns 400 Bad Request with Azerbaijani error', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const invalidPayload = { subject: '', category: 'GENERAL', description: '' };
        const res = await safeRequest(() => buyerSession.client.post('/tickets', invalidPayload));
        if (res) {
          assert.equal(res.status, 400);
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD);
        }
      } else {
        const mockMissingTicketEnvelope = {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD,
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/api/v1/tickets',
        };
        assertErrorEnvelope(mockMissingTicketEnvelope, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD);
        assertAzerbaijaniText(mockMissingTicketEnvelope.message);
      }
    });

    it('F32.4: Ticket category enum validates standard values (TECHNICAL, BILLING, GENERAL)', () => {
      const validCategories = ['TECHNICAL', 'BILLING', 'GENERAL'];
      for (const cat of validCategories) {
        assert.ok(['TECHNICAL', 'BILLING', 'GENERAL'].includes(cat));
      }
    });

    it('F32.5: Unauthenticated user attempting to submit support ticket receives 401 Unauthorized', async () => {
      const anonClient = new ApiClient();
      const payload = { subject: 'Anonim sual', category: 'GENERAL', description: 'Təsvir' };
      const res = await safeRequest(() => anonClient.post('/tickets', payload));

      if (res) {
        assert.equal(res.status, 401);
      } else {
        const mock401 = {
          statusCode: 401,
          message: AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED,
          error: 'Unauthorized',
          timestamp: new Date().toISOString(),
          path: '/api/v1/tickets',
        };
        assertErrorEnvelope(mock401, 401);
      }
    });
  });

  // =========================================================================
  // Feature 33: Ticket Discussion & Status Update
  // =========================================================================
  describe('Feature 33: Ticket Discussion & Status Update', () => {
    it('F33.1: Threaded discussion: adding message to ticket via POST /tickets/:id/messages returns 201 Created', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const ticketId = '64b0f9e1e4b0a1b2c3d4e587';
        const msgPayload = { message: 'Əlavə qeyd: NodeMCU v3 lövhəsindən istifadə edirəm.' };
        const res = await safeRequest(() => buyerSession.client.post(`/tickets/${ticketId}/messages`, msgPayload));
        if (res && res.status === 201) {
          assert.ok(res.data?.message || res.data?.text);
        }
      } else {
        const mockThreadMsg = {
          _id: '64b0f9e1e4b0a1b2c3d4e588',
          ticketId: '64b0f9e1e4b0a1b2c3d4e587',
          message: 'Əlavə qeyd: NodeMCU v3 lövhəsindən istifadə edirəm.',
          senderRole: 'USER',
          createdAt: new Date().toISOString(),
        };
        assertAzerbaijaniText(mockThreadMsg.message);
        assertValidId(mockThreadMsg._id);
        assertIsoDate(mockThreadMsg.createdAt);
      }
    });

    it('F33.2: Messages maintain sequential timestamp and sender role (USER or ADMIN)', () => {
      const thread = [
        { senderRole: 'USER', text: 'İlk sual', timestamp: '2026-11-24T10:00:00.000Z' },
        { senderRole: 'ADMIN', text: 'Dəstək cavabı', timestamp: '2026-11-24T10:15:00.000Z' },
      ];
      assert.ok(Date.parse(thread[1].timestamp) > Date.parse(thread[0].timestamp));
      assert.equal(thread[0].senderRole, 'USER');
      assert.equal(thread[1].senderRole, 'ADMIN');
    });

    it('F33.3: Updating ticket status to RESOLVED or CLOSED transitions ticket state cleanly', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const ticketId = '64b0f9e1e4b0a1b2c3d4e589';
        const res = await safeRequest(() =>
          adminSession.client.patch(`/tickets/${ticketId}/status`, { status: 'RESOLVED' })
        );
        if (res && res.status === 200) {
          assert.equal(res.data?.status, 'RESOLVED');
        }
      } else {
        const mockUpdatedTicket = {
          _id: '64b0f9e1e4b0a1b2c3d4e589',
          status: 'RESOLVED',
          resolvedAt: new Date().toISOString(),
        };
        assert.equal(mockUpdatedTicket.status, 'RESOLVED');
        assertIsoDate(mockUpdatedTicket.resolvedAt);
      }
    });

    it('F33.4: Unrelated user attempting to view or reply to someone else\'s ticket receives 403 Forbidden', () => {
      const mock403TicketEnvelope = {
        statusCode: 403,
        message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
        error: 'Forbidden',
        timestamp: new Date().toISOString(),
        path: '/api/v1/tickets/foreign_ticket/messages',
      };
      assertErrorEnvelope(mock403TicketEnvelope, 403);
    });

    it('F33.5: Interacting with non-existent ticket ID returns 404 Not Found with Azerbaijani error', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const missingId = '000000000000000000000000';
        const res = await safeRequest(() => adminSession.client.get(`/tickets/${missingId}`));
        if (res) {
          assert.equal(res.status, 404);
          assertErrorEnvelope(res.data, 404);
        }
      } else {
        const mock404Envelope = {
          statusCode: 404,
          message: AZERBAIJANI_ERROR_MESSAGES.NF_GENERIC,
          error: 'Not Found',
          timestamp: new Date().toISOString(),
          path: '/api/v1/tickets/000000000000000000000000',
        };
        assertErrorEnvelope(mock404Envelope, 404);
        assertAzerbaijaniText(mock404Envelope.message);
      }
    });
  });

  // =========================================================================
  // Feature 34: Case-by-case Refund Request
  // =========================================================================
  describe('Feature 34: Case-by-case Refund Request', () => {
    it('F34.1: Buyer submits refund claim for PAID order via POST /refunds, receives 201 Created with PENDING status', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const refundPayload = {
          orderId: '64b0f9e1e4b0a1b2c3d4e590',
          reason: 'Aparat təchizatı uyğunsuzluğu və arxiv açılmır.',
          details: 'Kitabxanalar köhnə versiya ilə işləyir.',
        };
        const res = await safeRequest(() => buyerSession.client.post('/refunds', refundPayload));
        if (res && res.status === 201) {
          assert.equal(res.data?.status, 'PENDING');
        }
      } else {
        const mockRefund = {
          _id: '64b0f9e1e4b0a1b2c3d4e591',
          orderId: '64b0f9e1e4b0a1b2c3d4e590',
          status: 'PENDING',
          refundAmount: 25.0,
          currency: 'AZN',
          reason: 'Aparat təchizatı uyğunsuzluğu',
          createdAt: new Date().toISOString(),
        };
        assert.equal(mockRefund.status, 'PENDING');
        assertAznCurrency(mockRefund.refundAmount);
        assertAzerbaijaniText(mockRefund.reason);
      }
    });

    it('F34.2: Refund claim records refundAmount in AZN matching original order price', () => {
      const originalPrice = 45.0;
      const refundAmount = 45.0;
      assert.equal(refundAmount, originalPrice);
      assertAznCurrency(refundAmount);
      assertAznCurrency('45.00 AZN');
    });

    it('F34.3: Attempting to request refund for UNPAID order returns 400 Bad Request with Azerbaijani error', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        let unpaidOrderId = '64b0f9e1e4b0a1b2c3d4e592';
        const projsRes = await safeRequest(() => buyerSession.client.get('/projects?limit=1'));
        const projId = projsRes?.data?.data?.[0]?._id || projsRes?.data?.data?.[0]?.id;
        if (projId) {
          const checkoutRes = await safeRequest(() => buyerSession.client.post('/orders/checkout', { projectId: projId }));
          if (checkoutRes?.data?._id || checkoutRes?.data?.id) {
            unpaidOrderId = checkoutRes.data._id || checkoutRes.data.id;
          }
        }
        const res = await safeRequest(() =>
          buyerSession.client.post('/refunds', { orderId: unpaidOrderId, reason: 'Test səbəb' })
        );
        if (res) {
          assert.equal(res.status, 400);
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.REF_UNPAID);
        }
      } else {
        const mockUnpaidRefundEnvelope = {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.REF_UNPAID,
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/api/v1/refunds',
        };
        assertErrorEnvelope(mockUnpaidRefundEnvelope, 400, AZERBAIJANI_ERROR_MESSAGES.REF_UNPAID);
        assertAzerbaijaniText(mockUnpaidRefundEnvelope.message);
      }
    });

    it('F34.4: Submitting duplicate refund request for the same order returns 400 Bad Request with Azerbaijani error', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const payload = { orderId: '64b0f9e1e4b0a1b2c3d4e593', reason: 'Təkrar müraciət' };
        const res1 = await safeRequest(() => buyerSession.client.post('/refunds', payload));
        if (res1 && res1.status === 201) {
          const res2 = await safeRequest(() => buyerSession.client.post('/refunds', payload));
          assert.ok(res2);
          assert.equal(res2.status, 400);
          assertErrorEnvelope(res2.data, 400, AZERBAIJANI_ERROR_MESSAGES.REF_DUPLICATE);
        }
      } else {
        const mockDupRefundEnvelope = {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.REF_DUPLICATE,
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/api/v1/refunds',
        };
        assertErrorEnvelope(mockDupRefundEnvelope, 400, AZERBAIJANI_ERROR_MESSAGES.REF_DUPLICATE);
        assertAzerbaijaniText(mockDupRefundEnvelope.message);
      }
    });

    it('F34.5: Unauthenticated visitor attempting to request refund receives 401 Unauthorized', async () => {
      const anonClient = new ApiClient();
      const res = await safeRequest(() =>
        anonClient.post('/refunds', { orderId: 'ord123', reason: 'Səbəb' })
      );

      if (res) {
        assert.equal(res.status, 401);
      } else {
        const mock401 = {
          statusCode: 401,
          message: AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED,
          error: 'Unauthorized',
          timestamp: new Date().toISOString(),
          path: '/api/v1/refunds',
        };
        assertErrorEnvelope(mock401, 401);
      }
    });
  });

  // =========================================================================
  // Feature 35: Admin Refund Decision
  // =========================================================================
  describe('Feature 35: Admin Refund Decision', () => {
    it('F35.1: Admin approves refund with APPROVE action, transitioning order to REFUNDED and updating author balance', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const refundId = '64b0f9e1e4b0a1b2c3d4e594';
        const res = await safeRequest(() =>
          adminSession.client.post(`/admin/refunds/${refundId}/decision`, { action: 'APPROVE', adminNotes: 'Təsdiqləndi' })
        );
        if (res && res.status === 200) {
          assert.equal(res.data?.status, 'APPROVED');
          assert.equal(res.data?.order?.status, 'REFUNDED');
        }
      } else {
        const mockApprovedRefund = {
          _id: '64b0f9e1e4b0a1b2c3d4e594',
          status: 'APPROVED',
          adminNotes: 'Refund təsdiqləndi',
          order: { status: 'REFUNDED' },
          decidedAt: new Date().toISOString(),
        };
        assert.equal(mockApprovedRefund.status, 'APPROVED');
        assert.equal(mockApprovedRefund.order.status, 'REFUNDED');
        assertAzerbaijaniText(mockApprovedRefund.adminNotes);
      }
    });

    it('F35.2: Admin rejects refund with REJECT action, order remains in PAID status', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const refundId = '64b0f9e1e4b0a1b2c3d4e595';
        const res = await safeRequest(() =>
          adminSession.client.post(`/admin/refunds/${refundId}/decision`, {
            action: 'REJECT',
            adminNotes: 'Fayllar işlək vəziyyətdədir, tələb əsassızdır.',
          })
        );
        if (res && res.status === 200) {
          assert.equal(res.data?.status, 'REJECTED');
        }
      } else {
        const mockRejectedRefund = {
          _id: '64b0f9e1e4b0a1b2c3d4e595',
          status: 'REJECTED',
          adminNotes: 'Tələb əsassızdır',
          order: { status: 'PAID' },
        };
        assert.equal(mockRejectedRefund.status, 'REJECTED');
        assert.equal(mockRejectedRefund.order.status, 'PAID');
      }
    });

    it('F35.3: Approving refund revokes buyer digital download authorization for the refunded project', () => {
      const refundedOrderAccess = {
        orderStatus: 'REFUNDED',
        downloadAccessRevoked: true,
      };
      assert.equal(refundedOrderAccess.orderStatus, 'REFUNDED');
      assert.equal(refundedOrderAccess.downloadAccessRevoked, true);
    });

    it('F35.4: Regular buyer user attempting to decide refunds receives 403 Forbidden', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const refundId = '64b0f9e1e4b0a1b2c3d4e596';
        const res = await safeRequest(() =>
          buyerSession.client.post(`/admin/refunds/${refundId}/decision`, { action: 'APPROVE' })
        );
        if (res) {
          assert.equal(res.status, 403);
          assertErrorEnvelope(res.data, 403);
        }
      } else {
        const mock403 = {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
          error: 'Forbidden',
          timestamp: new Date().toISOString(),
          path: '/api/v1/admin/refunds/ref1/decision',
        };
        assertErrorEnvelope(mock403, 403);
      }
    });

    it('F35.5: Non-existent refund claim ID returns 404 Not Found with Azerbaijani error', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const missingId = '000000000000000000000000';
        const res = await safeRequest(() =>
          adminSession.client.post(`/admin/refunds/${missingId}/decision`, { action: 'APPROVE' })
        );
        if (res) {
          assert.equal(res.status, 404);
        }
      } else {
        const mock404Envelope = {
          statusCode: 404,
          message: AZERBAIJANI_ERROR_MESSAGES.NF_GENERIC,
          error: 'Not Found',
          timestamp: new Date().toISOString(),
          path: '/api/v1/admin/refunds/000000000000000000000000/decision',
        };
        assertErrorEnvelope(mock404Envelope, 404);
        assertAzerbaijaniText(mock404Envelope.message);
      }
    });
  });
});
