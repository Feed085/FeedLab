import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole, USER_ROLES } from '../users/schemas/user.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import {
  AuthorApplication,
  AuthorApplicationDocument,
} from '../authors/schemas/author-application.schema';
import {
  AuthorBalance,
  AuthorBalanceDocument,
} from '../authors/schemas/author-balance.schema';
import { QueryUsersDto } from './dto/query-users.dto';
import { AuthorsService } from '../authors/authors.service';
import { ReviewAuthorApplicationDto } from './dto/review-author-application.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(AuthorApplication.name)
    private readonly authorApplicationModel: Model<AuthorApplicationDocument>,
    @InjectModel(AuthorBalance.name)
    private readonly authorBalanceModel: Model<AuthorBalanceDocument>,
    private readonly authorsService: AuthorsService,
  ) {}

  async getMetrics() {
    const [
      totalUsers,
      totalAuthors,
      totalProjects,
      totalOrders,
      pendingProjectsCount,
      pendingApplicationsCount,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ role: 'AUTHOR' }),
      this.projectModel.countDocuments(),
      this.orderModel.countDocuments({ status: 'PAID' }),
      this.projectModel.countDocuments({ status: 'SUBMITTED' }),
      this.authorApplicationModel.countDocuments({ status: 'PENDING' }),
    ]);

    const [revenueAgg, refundedAgg] = await Promise.all([
      this.orderModel.aggregate([
        { $match: { status: 'PAID' } },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: { $ifNull: ['$amount', { $ifNull: ['$price', 0] }] },
            },
            totalCommission: {
              $sum: {
                $ifNull: [
                  '$platformCommission',
                  {
                    $ifNull: [
                      '$platformFee',
                      {
                        $multiply: [
                          { $ifNull: ['$amount', { $ifNull: ['$price', 0] }] },
                          0.2,
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      ]),
      this.orderModel.aggregate([
        { $match: { status: 'REFUNDED' } },
        {
          $group: {
            _id: null,
            totalRefunded: {
              $sum: { $ifNull: ['$amount', { $ifNull: ['$price', 0] }] },
            },
          },
        },
      ]),
    ]);

    const totalRevenueAZN = Math.round((revenueAgg[0]?.totalRevenue || 0) * 100) / 100;
    const platformCommissionAZN =
      revenueAgg[0]?.totalCommission !== undefined && revenueAgg[0]?.totalCommission !== null
        ? Math.round(revenueAgg[0].totalCommission * 100) / 100
        : Math.round(totalRevenueAZN * 0.2 * 100) / 100;
    const totalRefundedAZN = Math.round((refundedAgg[0]?.totalRefunded || 0) * 100) / 100;

    return {
      totalUsers,
      totalAuthors,
      totalProjects,
      totalOrders,
      totalRevenueAZN,
      platformCommissionAZN,
      totalRefundedAZN,
      currency: 'AZN',
      pendingProjectsCount,
      pendingApplicationsCount,
    };
  }

  async getProjectsQueue(query: {
    category?: string;
    author?: string;
    page?: number;
    limit?: number;
  }) {
    const filter: Record<string, any> = { status: 'SUBMITTED' };

    if (query.category) {
      if (Types.ObjectId.isValid(query.category)) {
        filter.categoryId = new Types.ObjectId(query.category);
      }
    }

    if (query.author) {
      if (Types.ObjectId.isValid(query.author)) {
        filter.authorId = new Types.ObjectId(query.author);
      }
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .sort({ updatedAt: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'name slug icon')
        .populate('technologies', 'name slug icon')
        .populate('authorId', 'fullName email role createdAt')
        .exec(),
      this.projectModel.countDocuments(filter),
    ]);

    return {
      data,
      queue: data,
      projects: data,
      total,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getUsers(query: QueryUsersDto) {
    const filter: Record<string, any> = {};

    if (query.search) {
      const searchRegex = { $regex: query.search.trim(), $options: 'i' };
      filter.$or = [{ fullName: searchRegex }, { email: searchRegex }];
    }

    if (query.role) {
      filter.role = query.role;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-passwordHash -refreshTokenHash -resetPasswordToken')
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      data,
      users: data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateUserRole(
    userId: string,
    role: UserRole,
    currentAdminId?: string | Types.ObjectId,
  ): Promise<UserDocument> {
    if (!USER_ROLES.includes(role)) {
      throw new BadRequestException('Düzgün istifadəçi rolu daxil edin');
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    const userObjectId = new Types.ObjectId(userId);

    if (
      currentAdminId &&
      userObjectId.toString() === currentAdminId.toString() &&
      role !== 'ADMIN'
    ) {
      throw new BadRequestException('Öz rolunuzu dəyişə bilməzsiniz');
    }

    const user = await this.userModel.findById(userObjectId);
    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    user.role = role;
    await user.save();

    if (role === 'AUTHOR') {
      await this.authorBalanceModel.findOneAndUpdate(
        { authorId: user._id },
        {
          $setOnInsert: {
            authorId: user._id,
            balance: 0,
            totalSalesCount: 0,
            totalRevenueAzn: 0,
            totalEarningsAzn: 0,
            currency: 'AZN',
          },
        },
        { upsert: true, new: true },
      );
    }

    return user;
  }

  async updateUserStatus(
    userId: string,
    isActive: boolean,
    currentAdminId?: string | Types.ObjectId,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    const userObjectId = new Types.ObjectId(userId);

    if (
      currentAdminId &&
      userObjectId.toString() === currentAdminId.toString() &&
      !isActive
    ) {
      throw new BadRequestException('Öz hesabınızı deaktiv edə bilməzsiniz');
    }

    const user = await this.userModel.findById(userObjectId);
    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    user.isActive = isActive;
    await user.save();

    return user;
  }

  async getAuthorApplications(query: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return this.authorsService.getApplications(query);
  }

  async reviewAuthorApplication(
    id: string,
    reviewerId: string | Types.ObjectId,
    dto: ReviewAuthorApplicationDto,
  ) {
    return this.authorsService.reviewApplication(id, reviewerId, dto);
  }
}
