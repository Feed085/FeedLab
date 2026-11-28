import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ReviewsService } from './reviews.service';
import { Review } from './schemas/review.schema';
import { Project } from '../projects/schemas/project.schema';
import { Order } from '../orders/schemas/order.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { AZERBAIJANI_ERROR_MESSAGES } from '../common/i18n/az.messages';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let mockReviewModel: any;
  let mockProjectModel: any;
  let mockOrderModel: any;
  let mockNotificationsService: any;

  const mockBuyerId = new Types.ObjectId();
  const mockAuthorId = new Types.ObjectId();
  const mockProjectId = new Types.ObjectId();
  const mockReviewId = new Types.ObjectId();

  beforeEach(async () => {
    mockReviewModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: mockReviewId,
      save: jest.fn().mockResolvedValue({ ...dto, _id: mockReviewId }),
    }));
    mockReviewModel.findById = jest.fn();
    mockReviewModel.findOne = jest.fn();
    mockReviewModel.find = jest.fn();

    mockProjectModel = {
      findById: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    mockOrderModel = {
      findOne: jest.fn(),
    };

    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getModelToken(Review.name), useValue: mockReviewModel },
        { provide: getModelToken(Project.name), useValue: mockProjectModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  describe('createReview', () => {
    it('allows verified purchaser to submit review and recalculates project rating', async () => {
      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockProjectId,
          authorId: mockAuthorId,
          title: 'ESP32 Layihəsi',
          slug: 'esp32-layihesi',
        }),
      });

      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), status: 'PAID' }),
      });

      mockReviewModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      mockReviewModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { rating: 5 },
          { rating: 4 },
        ]),
      });

      const result = await service.createReview(mockBuyerId, {
        projectId: mockProjectId.toString(),
        rating: 5,
        comment: 'Əla sxem və kodlar, hər şey problemsiz işə düşdü!',
      });

      expect(result.rating).toBe(5);
      expect(result.isVerifiedPurchase).toBe(true);
      expect(mockProjectModel.updateOne).toHaveBeenCalledWith(
        { _id: mockProjectId },
        { $set: { rating: 4.5, reviewsCount: 2 } },
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });

    it('rejects non-purchaser with REV_NOT_PURCHASER', async () => {
      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockProjectId,
          authorId: mockAuthorId,
        }),
      });

      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.createReview(mockBuyerId, {
          projectId: mockProjectId.toString(),
          rating: 4,
          comment: 'Test rəy',
        }),
      ).rejects.toThrow(new ForbiddenException(AZERBAIJANI_ERROR_MESSAGES.REV_NOT_PURCHASER));
    });

    it('rejects duplicate review with REV_DUPLICATE', async () => {
      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockProjectId,
          authorId: mockAuthorId,
        }),
      });

      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ status: 'PAID' }),
      });

      mockReviewModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      });

      await expect(
        service.createReview(mockBuyerId, {
          projectId: mockProjectId.toString(),
          rating: 4,
          comment: 'Təkrar rəy',
        }),
      ).rejects.toThrow(new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.REV_DUPLICATE));
    });
  });

  describe('replyReview', () => {
    it('allows author to reply to review', async () => {
      const mockReviewDoc = {
        _id: mockReviewId,
        projectId: mockProjectId,
        buyerId: mockBuyerId,
        save: jest.fn().mockResolvedValue({}),
      };

      mockReviewModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReviewDoc),
      });

      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockProjectId,
          authorId: mockAuthorId,
          title: 'ESP32 Layihəsi',
          slug: 'esp32-layihesi',
        }),
      });

      const user = { _id: mockAuthorId.toString(), role: 'AUTHOR' };
      await service.replyReview(mockReviewId.toString(), user, {
        response: 'Təşəkkür edirik!',
      });

      expect(mockReviewDoc.save).toHaveBeenCalled();
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });

    it('rejects non-author reply with REV_NON_AUTHOR_REPLY', async () => {
      const mockReviewDoc = {
        _id: mockReviewId,
        projectId: mockProjectId,
        buyerId: mockBuyerId,
      };

      mockReviewModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReviewDoc),
      });

      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockProjectId,
          authorId: mockAuthorId,
        }),
      });

      const otherUser = { _id: new Types.ObjectId().toString(), role: 'USER' };
      await expect(
        service.replyReview(mockReviewId.toString(), otherUser, {
          response: 'Kənar cavab',
        }),
      ).rejects.toThrow(new ForbiddenException(AZERBAIJANI_ERROR_MESSAGES.REV_NON_AUTHOR_REPLY));
    });
  });
});
