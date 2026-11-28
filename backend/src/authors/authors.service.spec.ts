import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthorsService } from './authors.service';
import { AuthorApplication } from './schemas/author-application.schema';
import { AuthorBalance } from './schemas/author-balance.schema';
import { Project } from '../projects/schemas/project.schema';
import { Order } from '../orders/schemas/order.schema';
import { User } from '../users/schemas/user.schema';

describe('AuthorsService', () => {
  let service: AuthorsService;
  let applicationModel: any;
  let balanceModel: any;
  let projectModel: any;
  let orderModel: any;
  let userModel: any;

  const userId = new Types.ObjectId();
  const mockUser = {
    _id: userId,
    email: 'user@feedlab.az',
    fullName: 'Test User',
    role: 'USER',
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    applicationModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn(),
    };

    balanceModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    projectModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
    };

    orderModel = {
      find: jest.fn(),
    };

    userModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorsService,
        {
          provide: getModelToken(AuthorApplication.name),
          useValue: applicationModel,
        },
        {
          provide: getModelToken(AuthorBalance.name),
          useValue: balanceModel,
        },
        {
          provide: getModelToken(Project.name),
          useValue: projectModel,
        },
        {
          provide: getModelToken(Order.name),
          useValue: orderModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    }).compile();

    service = module.get<AuthorsService>(AuthorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('apply', () => {
    it('should successfully submit an author application when valid', async () => {
      userModel.findById.mockResolvedValue(mockUser);
      applicationModel.findOne.mockResolvedValue(null);
      const createdApp = {
        _id: new Types.ObjectId(),
        userId,
        bio: 'Mənim 5 illik IoT və mikrokontroller təcrübəm var.',
        skills: ['Arduino', 'ESP32'],
        status: 'PENDING',
      };
      applicationModel.create.mockResolvedValue(createdApp);

      const res = await service.apply(userId.toString(), {
        bio: 'Mənim 5 illik IoT və mikrokontroller təcrübəm var.',
        skills: ['Arduino', 'ESP32'],
      });

      expect(res.status).toBe('PENDING');
      expect(applicationModel.create).toHaveBeenCalled();
    });

    it('should reject application if user is already an author', async () => {
      userModel.findById.mockResolvedValue({ ...mockUser, role: 'AUTHOR' });

      await expect(
        service.apply(userId.toString(), {
          bio: 'Təcrübəli mühəndisəm',
          skills: ['Arduino'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate application if user already has a pending application', async () => {
      userModel.findById.mockResolvedValue(mockUser);
      applicationModel.findOne.mockResolvedValue({ _id: new Types.ObjectId(), status: 'PENDING' });

      await expect(
        service.apply(userId.toString(), {
          bio: 'Təcrübəli mühəndisəm',
          skills: ['Arduino'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject application if skills are empty', async () => {
      userModel.findById.mockResolvedValue(mockUser);
      applicationModel.findOne.mockResolvedValue(null);

      await expect(
        service.apply(userId.toString(), {
          bio: 'Təcrübəli mühəndisəm',
          skills: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reviewApplication', () => {
    it('should approve application and promote user to AUTHOR', async () => {
      const appId = new Types.ObjectId().toString();
      const applicantUser = {
        _id: userId,
        role: 'USER',
        save: jest.fn().mockResolvedValue(true),
      };
      const appDoc = {
        _id: new Types.ObjectId(appId),
        userId,
        status: 'PENDING',
        save: jest.fn().mockResolvedValue(true),
      };

      applicationModel.findById.mockResolvedValue(appDoc);
      userModel.findById.mockResolvedValue(applicantUser);
      balanceModel.findOneAndUpdate.mockResolvedValue({});

      const res = await service.reviewApplication(appId, new Types.ObjectId().toString(), {
        action: 'APPROVE',
        adminNotes: 'Müəllif təsdiqləndi',
      });

      expect(appDoc.status).toBe('APPROVED');
      expect(applicantUser.role).toBe('AUTHOR');
      expect(applicantUser.save).toHaveBeenCalled();
      expect(balanceModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should reject application with reason', async () => {
      const appId = new Types.ObjectId().toString();
      const appDoc = {
        _id: new Types.ObjectId(appId),
        userId,
        status: 'PENDING',
        save: jest.fn().mockResolvedValue(true),
      };

      applicationModel.findById.mockResolvedValue(appDoc);
      userModel.findById.mockResolvedValue(mockUser);

      await service.reviewApplication(appId, new Types.ObjectId().toString(), {
        action: 'REJECT',
        rejectionReason: 'Portfel qeyri-kafi',
      });

      expect(appDoc.status).toBe('REJECTED');
      expect((appDoc as any).rejectionReason).toBe('Portfel qeyri-kafi');
    });

    it('should throw NotFoundException if application does not exist', async () => {
      applicationModel.findById.mockResolvedValue(null);

      await expect(
        service.reviewApplication(new Types.ObjectId().toString(), new Types.ObjectId().toString(), {
          action: 'APPROVE',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDashboard', () => {
    it('should return balance in AZN and project statistics', async () => {
      balanceModel.findOne.mockResolvedValue({
        balance: 160.0,
        totalSalesCount: 8,
        totalRevenueAzn: 200.0,
        totalEarningsAzn: 160.0,
      });

      const execMock = (val: any) => ({
        sort: () => ({ limit: () => ({ populate: () => ({ exec: () => Promise.resolve(val) }) }) }),
        select: () => ({ exec: () => Promise.resolve(val) }),
        exec: () => Promise.resolve(val),
      });

      orderModel.find.mockReturnValue(execMock([]));
      projectModel.countDocuments.mockResolvedValue(2);
      projectModel.find.mockReturnValue(execMock([{ rating: 4.8 }]));

      const res = await service.getDashboard(userId.toString());

      expect(res.balance.currency).toBe('AZN');
      expect(res.balance.availableBalance).toBe(160.0);
      expect(res.stats.totalProjects).toBe(2);
    });
  });
});
