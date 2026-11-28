import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { Notification } from './schemas/notification.schema';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockNotificationModel: any;

  const mockUserId = new Types.ObjectId();
  const mockNotificationId = new Types.ObjectId();

  beforeEach(async () => {
    mockNotificationModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: mockNotificationId,
      save: jest.fn().mockResolvedValue({ ...dto, _id: mockNotificationId }),
    }));
    mockNotificationModel.find = jest.fn();
    mockNotificationModel.findOne = jest.fn();
    mockNotificationModel.countDocuments = jest.fn();
    mockNotificationModel.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 3 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getModelToken(Notification.name), useValue: mockNotificationModel },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('creates an in-app notification', async () => {
    const result = await service.createNotification(
      mockUserId,
      'ORDER_SUCCESS',
      'Sifarişiniz təsdiqləndi',
      'Faylları yükləyə bilərsiniz',
      '/orders/my',
    );

    expect(result.type).toBe('ORDER_SUCCESS');
    expect(result.title).toBe('Sifarişiniz təsdiqləndi');
    expect(result.isRead).toBe(false);
  });

  it('marks single notification as read', async () => {
    const doc = {
      _id: mockNotificationId,
      userId: mockUserId,
      isRead: false,
      readAt: null,
      save: jest.fn().mockResolvedValue({ isRead: true }),
    };

    mockNotificationModel.findOne.mockReturnValue(doc);

    const result = await service.markAsRead(mockNotificationId.toString(), mockUserId);
    expect(doc.isRead).toBe(true);
    expect(doc.readAt).toBeDefined();
  });

  it('marks all user notifications as read and resets unreadCount to 0', async () => {
    const result = await service.markAllAsRead(mockUserId);
    expect(result.success).toBe(true);
    expect(result.unreadCount).toBe(0);
    expect(mockNotificationModel.updateMany).toHaveBeenCalledWith(
      { userId: mockUserId, isRead: false },
      expect.objectContaining({ $set: expect.any(Object) }),
    );
  });
});
