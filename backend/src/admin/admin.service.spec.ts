import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminService } from './admin.service';
import { User } from '../users/schemas/user.schema';
import { Project } from '../projects/schemas/project.schema';
import { Order } from '../orders/schemas/order.schema';
import { AuthorApplication } from '../authors/schemas/author-application.schema';
import { AuthorBalance } from '../authors/schemas/author-balance.schema';
import { AuthorsService } from '../authors/authors.service';

describe('AdminService', () => {
  let service: AdminService;
  let userModel: any;
  let projectModel: any;
  let orderModel: any;
  let authorApplicationModel: any;
  let authorBalanceModel: any;
  let authorsService: any;

  beforeEach(async () => {
    userModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
    };

    projectModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
    };

    orderModel = {
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    };

    authorApplicationModel = {
      countDocuments: jest.fn(),
    };

    authorBalanceModel = {
      findOneAndUpdate: jest.fn(),
    };

    authorsService = {
      getApplications: jest.fn(),
      reviewApplication: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: getModelToken(AuthorApplication.name), useValue: authorApplicationModel },
        { provide: getModelToken(AuthorBalance.name), useValue: authorBalanceModel },
        { provide: AuthorsService, useValue: authorsService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should aggregate platform totals with 20% platform commission', async () => {
      userModel.countDocuments.mockImplementation((filter?: any) => {
        if (filter?.role === 'AUTHOR') return Promise.resolve(10);
        return Promise.resolve(50);
      });
      projectModel.countDocuments.mockImplementation((filter?: any) => {
        if (filter?.status === 'SUBMITTED') return Promise.resolve(3);
        return Promise.resolve(20);
      });
      orderModel.countDocuments.mockResolvedValue(15);
      authorApplicationModel.countDocuments.mockResolvedValue(2);

      orderModel.aggregate.mockImplementation((pipeline: any[]) => {
        if (pipeline[0]?.$match?.status === 'PAID') {
          return Promise.resolve([{ _id: null, totalRevenue: 1000, totalCommission: 200 }]);
        }
        if (pipeline[0]?.$match?.status === 'REFUNDED') {
          return Promise.resolve([{ _id: null, totalRefunded: 0 }]);
        }
        return Promise.resolve([]);
      });

      const metrics = await service.getMetrics();

      expect(metrics.totalUsers).toBe(50);
      expect(metrics.totalAuthors).toBe(10);
      expect(metrics.totalProjects).toBe(20);
      expect(metrics.totalOrders).toBe(15);
      expect(metrics.totalRevenueAZN).toBe(1000);
      expect(metrics.platformCommissionAZN).toBe(200);
      expect(metrics.pendingProjectsCount).toBe(3);
      expect(metrics.pendingApplicationsCount).toBe(2);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role and initialize AuthorBalance if promoted to AUTHOR', async () => {
      const targetUserId = new Types.ObjectId();
      const mockTargetUser = {
        _id: targetUserId,
        role: 'USER',
        save: jest.fn().mockResolvedValue(true),
      };

      userModel.findById.mockResolvedValue(mockTargetUser);

      const res = await service.updateUserRole(targetUserId.toString(), 'AUTHOR');

      expect(res.role).toBe('AUTHOR');
      expect(mockTargetUser.save).toHaveBeenCalled();
      expect(authorBalanceModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should prevent admin from self-demoting', async () => {
      const adminId = new Types.ObjectId().toString();

      await expect(
        service.updateUserRole(adminId, 'USER', adminId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateUserStatus', () => {
    it('should toggle user active status', async () => {
      const targetUserId = new Types.ObjectId();
      const mockTargetUser = {
        _id: targetUserId,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      userModel.findById.mockResolvedValue(mockTargetUser);

      const res = await service.updateUserStatus(targetUserId.toString(), false);

      expect(res.isActive).toBe(false);
      expect(mockTargetUser.save).toHaveBeenCalled();
    });

    it('should prevent admin from deactivating their own account', async () => {
      const adminId = new Types.ObjectId().toString();

      await expect(
        service.updateUserStatus(adminId, false, adminId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
