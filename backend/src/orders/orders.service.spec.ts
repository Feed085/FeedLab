import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrdersService } from './orders.service';
import { Order } from './schemas/order.schema';
import { Project } from '../projects/schemas/project.schema';
import { AuthorBalance } from '../authors/schemas/author-balance.schema';
import { Refund } from '../refunds/schemas/refund.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { AZERBAIJANI_ERROR_MESSAGES } from '../common/i18n/az.messages';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockOrderModel: any;
  let mockProjectModel: any;
  let mockAuthorBalanceModel: any;
  let mockRefundModel: any;
  let mockNotificationsService: any;

  const mockBuyerId = new Types.ObjectId();
  const mockAuthorId = new Types.ObjectId();
  const mockProjectId = new Types.ObjectId();
  const mockOrderId = new Types.ObjectId();

  beforeEach(async () => {
    mockOrderModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: mockOrderId,
      save: jest.fn().mockResolvedValue({ ...dto, _id: mockOrderId }),
    }));
    mockOrderModel.findById = jest.fn();
    mockOrderModel.findOne = jest.fn();
    mockOrderModel.find = jest.fn();
    mockOrderModel.countDocuments = jest.fn();

    mockProjectModel = {
      findById: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    mockAuthorBalanceModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue(dto),
    }));
    mockAuthorBalanceModel.findOne = jest.fn();

    mockRefundModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue({ ...dto, _id: new Types.ObjectId() }),
    }));
    mockRefundModel.findById = jest.fn();
    mockRefundModel.findOne = jest.fn();
    mockRefundModel.find = jest.fn();
    mockRefundModel.countDocuments = jest.fn();

    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(Project.name), useValue: mockProjectModel },
        { provide: getModelToken(AuthorBalance.name), useValue: mockAuthorBalanceModel },
        { provide: getModelToken(Refund.name), useValue: mockRefundModel },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('checkout', () => {
    it('creates a pending order with exact 80/20 split in AZN', async () => {
      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockProjectId,
          authorId: mockAuthorId,
          price: 50,
          currency: 'AZN',
        }),
      });
      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.checkout(mockBuyerId, {
        projectId: mockProjectId.toString(),
        paymentMethod: 'CARD',
      });

      expect(result.amount).toBe(50);
      expect(result.price).toBe(50);
      expect(result.authorEarnings).toBe(40);
      expect(result.platformCommission).toBe(10);
      expect(result.currency).toBe('AZN');
      expect(result.status).toBe('PENDING');
      expect(result.orderNumber).toMatch(/^ORD-/);
    });

    it('rejects self-purchase with ORD_SELF_PURCHASE', async () => {
      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockProjectId,
          authorId: mockBuyerId,
          price: 50,
        }),
      });

      await expect(
        service.checkout(mockBuyerId, { projectId: mockProjectId.toString() }),
      ).rejects.toThrow(new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.ORD_SELF_PURCHASE));
    });

    it('rejects duplicate purchase when order is already PAID with ORD_ALREADY_OWNED', async () => {
      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockProjectId,
          authorId: mockAuthorId,
          price: 50,
        }),
      });
      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ status: 'PAID' }),
      });

      await expect(
        service.checkout(mockBuyerId, { projectId: mockProjectId.toString() }),
      ).rejects.toThrow(new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.ORD_ALREADY_OWNED));
    });
  });

  describe('claimFreeProject', () => {
    it('instantly grants PAID order for 0 AZN project', async () => {
      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockProjectId,
          authorId: mockAuthorId,
          title: 'Pulsuz İcma Sxemi',
          price: 0,
        }),
      });
      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.claimFreeProject(mockBuyerId, mockProjectId.toString());
      expect(result.status).toBe('PAID');
      expect(result.price).toBe(0);
      expect(result.paymentMethod).toBe('FREE_CLAIM');
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });

    it('rejects paid project on claim-free endpoint with ORD_PAID_AS_FREE', async () => {
      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockProjectId,
          authorId: mockAuthorId,
          price: 25,
        }),
      });

      await expect(
        service.claimFreeProject(mockBuyerId, mockProjectId.toString()),
      ).rejects.toThrow(new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.ORD_PAID_AS_FREE));
    });
  });

  describe('confirmPayment', () => {
    it('marks order PAID, credits author balance, and notifies users', async () => {
      const pendingOrder = {
        _id: mockOrderId,
        orderNumber: 'ORD-1234',
        buyerId: mockBuyerId,
        authorId: mockAuthorId,
        projectId: mockProjectId,
        price: 100,
        amount: 100,
        authorEarnings: 80,
        status: 'PENDING',
        save: jest.fn().mockResolvedValue({ status: 'PAID' }),
      };

      mockOrderModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(pendingOrder),
      });

      const balanceDoc = {
        authorId: mockAuthorId,
        balance: 20,
        totalEarningsAzn: 20,
        totalRevenueAzn: 25,
        totalSalesCount: 1,
        save: jest.fn().mockResolvedValue({}),
      };
      mockAuthorBalanceModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(balanceDoc),
      });

      mockProjectModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ title: 'Robot Kolu', slug: 'robot-kolu' }),
        }),
      });

      const result = await service.confirmPayment(mockOrderId.toString(), {
        transactionId: 'TXN-9988',
        status: 'SUCCESS',
      });

      expect(result.status).toBe('PAID');
      expect(pendingOrder.status).toBe('PAID');
      expect(balanceDoc.balance).toBe(100); // 20 + 80
      expect(balanceDoc.totalSalesCount).toBe(2);
      expect(mockProjectModel.updateOne).toHaveBeenCalledWith(
        { _id: mockProjectId },
        { $inc: { salesCount: 1 } },
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(2);
    });

    it('rejects already paid order with ORD_ALREADY_PAID', async () => {
      mockOrderModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ status: 'PAID' }),
      });

      await expect(
        service.confirmPayment(mockOrderId.toString(), { transactionId: 'TXN-000' }),
      ).rejects.toThrow(new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.ORD_ALREADY_PAID));
    });
  });
});
