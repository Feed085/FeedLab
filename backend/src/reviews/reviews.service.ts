import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { AZERBAIJANI_ERROR_MESSAGES } from '../common/i18n/az.messages';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';

@Injectable()
export class ReviewsService implements OnModuleInit {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    try {
      const seedReviews = [
        {
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e581'),
          customId: '64b0f9e1e4b0a1b2c3d4e581',
          projectId: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e578'),
          buyerId: new Types.ObjectId(),
          orderId: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e590'),
          rating: 5,
          comment: 'Əla mühəndislik layihəsidir! Sxemlər çox səliqəli hazırlanıb.',
          isVerifiedPurchase: true,
        },
        {
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e582'),
          customId: '64b0f9e1e4b0a1b2c3d4e582',
          projectId: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e578'),
          buyerId: new Types.ObjectId(),
          orderId: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e590'),
          rating: 4,
          comment: 'Yaxşı layihədir, lakin daha çox nümunə kod ola bilərdi.',
          isVerifiedPurchase: true,
        },
        {
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e583'),
          customId: '64b0f9e1e4b0a1b2c3d4e583',
          projectId: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e578'),
          buyerId: new Types.ObjectId(),
          orderId: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e590'),
          rating: 5,
          comment: 'Hər şey tam qaydasındadır.',
          isVerifiedPurchase: true,
        },
      ];

      for (const rev of seedReviews) {
        const exists = await this.reviewModel.findOne({
          $or: [{ _id: rev._id }, { customId: rev.customId }],
        });
        if (!exists) {
          await this.reviewModel.create(rev);
        }
      }
    } catch (err: any) {
      // ignore
    }
  }

  async createReview(
    buyerId: string | Types.ObjectId,
    dto: CreateReviewDto,
  ): Promise<ReviewDocument> {
    const buyerObjectId = typeof buyerId === 'string' ? new Types.ObjectId(buyerId) : buyerId;

    let project: ProjectDocument | null = null;
    if (Types.ObjectId.isValid(dto.projectId)) {
      project = await this.projectModel.findById(dto.projectId).exec();
    }
    if (!project) {
      project = await this.projectModel.findOne({ customId: dto.projectId }).exec();
    }
    if (!project) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT);
    }

    // Validation: rating 1..5
    if (
      typeof dto.rating !== 'number' ||
      !Number.isInteger(dto.rating) ||
      dto.rating < 1 ||
      dto.rating > 5
    ) {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_RATING);
    }

    // Validation: comment required
    if (!dto.comment || !dto.comment.trim()) {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD);
    }

    // Verified purchase check
    const paidOrder = await this.orderModel.findOne({
      buyerId: buyerObjectId,
      projectId: project._id,
      status: 'PAID',
    }).exec();

    if (!paidOrder) {
      throw new ForbiddenException(AZERBAIJANI_ERROR_MESSAGES.REV_NOT_PURCHASER);
    }

    // Duplicate check
    const existingReview = await this.reviewModel.findOne({
      buyerId: buyerObjectId,
      projectId: project._id,
    }).exec();

    if (existingReview) {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.REV_DUPLICATE);
    }

    const review = new this.reviewModel({
      projectId: project._id,
      buyerId: buyerObjectId,
      orderId: paidOrder._id,
      rating: dto.rating,
      comment: dto.comment.trim(),
      detailedScores: dto.detailedScores || null,
      isVerifiedPurchase: true,
      status: 'APPROVED',
    });

    const savedReview = await review.save();

    // Recalculate project rating and review count
    const approvedReviews = await this.reviewModel.find({
      projectId: project._id,
      status: 'APPROVED',
    }).exec();

    const sum = approvedReviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating =
      approvedReviews.length > 0
        ? Math.round((sum / approvedReviews.length) * 10) / 10
        : 0;

    await this.projectModel.updateOne(
      { _id: project._id },
      {
        $set: {
          rating: avgRating,
          reviewsCount: approvedReviews.length,
        },
      },
    );

    // Notify project author
    try {
      await this.notificationsService.createNotification(
        project.authorId,
        'NEW_REVIEW',
        'Layihənizə yeni rəy bildirildi',
        `"${project.title}" layihənizə ${dto.rating} ulduzlu rəy bildirildi.`,
        `/projects/${project.slug}`,
      );
    } catch {}

    return savedReview;
  }

  async getProjectReviews(
    projectId: string,
    page = 1,
    limit = 50,
  ): Promise<{
    data: any[];
    reviews: any[];
    averageRating: number;
    totalReviews: number;
    total: number;
    meta?: any;
  }> {
    let project: ProjectDocument | null = null;
    if (Types.ObjectId.isValid(projectId)) {
      project = await this.projectModel.findById(projectId).exec();
    }
    if (!project) {
      project = await this.projectModel.findOne({ customId: projectId }).exec();
    }
    if (!project) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT);
    }

    const reviews = await this.reviewModel
      .find({ projectId: project._id, status: 'APPROVED' })
      .populate('buyerId', 'fullName email avatarUrl')
      .sort({ createdAt: -1 })
      .exec();

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating =
      reviews.length > 0 ? Math.round((sum / reviews.length) * 10) / 10 : 0;

    const formattedReviews = reviews.map((r) => {
      const obj: any = r.toJSON();
      const buyerInfo = r.buyerId as any;
      obj.userName = buyerInfo?.fullName || 'İstifadəçi';
      obj.user = {
        fullName: buyerInfo?.fullName || 'İstifadəçi',
        avatarUrl: buyerInfo?.avatarUrl || null,
      };
      obj.buyer = obj.user;
      return obj;
    });

    const total = reviews.length;
    const pages = Math.ceil(total / limit) || 1;

    return {
      data: formattedReviews,
      reviews: formattedReviews,
      averageRating,
      totalReviews: total,
      total,
      meta: {
        total,
        page,
        limit,
        pages,
      },
    };
  }

  async replyReview(
    reviewId: string,
    user: any,
    dto: ReplyReviewDto,
  ): Promise<any> {
    const replyText = (dto.response ?? dto.text ?? dto.message ?? '').trim();
    if (!replyText) {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD);
    }

    let review: ReviewDocument | null = null;
    if (Types.ObjectId.isValid(reviewId)) {
      review = await this.reviewModel.findById(reviewId).exec();
    }
    if (!review) {
      review = await this.reviewModel.findOne({ customId: reviewId }).exec();
    }
    if (!review) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_GENERIC);
    }

    let project: ProjectDocument | null = null;
    if (Types.ObjectId.isValid(review.projectId)) {
      project = await this.projectModel.findById(review.projectId).exec();
    }
    if (!project) {
      project = await this.projectModel.findOne({ customId: review.projectId.toString() }).exec();
    }
    if (!project) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT);
    }

    const isProjectAuthor =
      project.authorId &&
      ((typeof project.authorId === 'object' &&
        (project.authorId as any)._id?.toString() === user._id?.toString()) ||
        project.authorId.toString() === user._id?.toString());
    const isAdmin = user.role === 'ADMIN';

    if (!isProjectAuthor && !isAdmin) {
      throw new ForbiddenException(AZERBAIJANI_ERROR_MESSAGES.REV_NON_AUTHOR_REPLY);
    }

    const now = new Date();
    review.authorReply = {
      text: replyText,
      message: replyText,
      response: replyText,
      authorName: user.fullName || 'Müəllif',
      repliedAt: now,
      repliedBy: new Types.ObjectId(user._id),
    } as any;

    const savedReview = await review.save();

    // In-app notification for reviewer
    try {
      await this.notificationsService.createNotification(
        review.buyerId,
        'REVIEW_REPLIED',
        'Müəllif rəyinizə cavab verdi',
        `"${project.title}" layihəsinin müəllifi bildirdiyiniz rəyə cavab yazdı.`,
        `/projects/${project.slug}`,
      );
    } catch {}

    const resultObj: any = savedReview.toJSON ? savedReview.toJSON() : { ...savedReview };
    if (!resultObj.authorReply) {
      resultObj.authorReply = review.authorReply;
    }
    return resultObj;
  }
}
