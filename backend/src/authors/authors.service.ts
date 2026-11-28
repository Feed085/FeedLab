import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AuthorApplication,
  AuthorApplicationDocument,
} from './schemas/author-application.schema';
import {
  AuthorBalance,
  AuthorBalanceDocument,
} from './schemas/author-balance.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateAuthorApplicationDto } from './dto/create-author-application.dto';
import { QueryAuthorProjectsDto } from './dto/query-author-projects.dto';
import { ReviewAuthorApplicationDto } from '../admin/dto/review-author-application.dto';

@Injectable()
export class AuthorsService implements OnModuleInit {
  constructor(
    @InjectModel(AuthorApplication.name)
    private readonly authorApplicationModel: Model<AuthorApplicationDocument>,
    @InjectModel(AuthorBalance.name)
    private readonly authorBalanceModel: Model<AuthorBalanceDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    try {
      const seedApps = [
        {
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e516'),
          userId: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e515'),
          fullName: 'Tələbə Mühəndis',
          bio: 'Robototexnika və IoT üzrə təcrübə',
          skills: ['Arduino', 'ESP32', 'C++'],
          status: 'PENDING',
        },
        {
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e517'),
          userId: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e518'),
          fullName: 'Rədd Edilən Müraciətçi',
          bio: 'Elektronika təcrübəsi',
          skills: ['Basic C'],
          status: 'PENDING',
        },
      ];

      for (const app of seedApps) {
        const exists = await this.authorApplicationModel.findById(app._id);
        if (!exists) {
          await this.authorApplicationModel.create(app);
        }
      }
    } catch (err: any) {
      // ignore
    }
  }

  async apply(
    userId: string | Types.ObjectId,
    dto: CreateAuthorApplicationDto,
  ): Promise<AuthorApplicationDocument> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const user = await this.userModel.findById(userObjectId);

    if (user?.role === 'AUTHOR') {
      throw new BadRequestException('Siz artıq təsdiqlənmiş müəllifsiniz');
    }

    const existingPending = await this.authorApplicationModel.findOne({
      userId: userObjectId,
      status: 'PENDING',
    });

    if (existingPending) {
      throw new BadRequestException('Sizin artıq baxılmaqda olan müraciətiniz var');
    }

    const skills =
      dto.skills && dto.skills.length > 0
        ? dto.skills
        : dto.technicalSkills && dto.technicalSkills.length > 0
          ? dto.technicalSkills
          : [];

    if (!skills || skills.length === 0) {
      throw new BadRequestException('Bu xana mütləq doldurulmalıdır');
    }

    const application = await this.authorApplicationModel.create({
      userId: userObjectId,
      fullName: dto.fullName || user?.fullName || 'Müəllif Müraciətçisi',
      bio: dto.bio,
      skills,
      technicalSkills: skills,
      portfolioUrl: dto.portfolioUrl || (dto.portfolioLinks?.[0] ?? null),
      portfolioLinks: dto.portfolioLinks || (dto.portfolioUrl ? [dto.portfolioUrl] : []),
      githubUrl: dto.githubUrl,
      linkedinUrl: dto.linkedinUrl,
      experienceYears: dto.experienceYears || 0,
      motivation: dto.motivation,
      status: 'PENDING',
    });

    return application;
  }

  async getDashboard(authorId: string | Types.ObjectId) {
    const authorObjectId = new Types.ObjectId(authorId.toString());

    let authorBalance = await this.authorBalanceModel.findOne({
      authorId: authorObjectId,
    });

    if (!authorBalance) {
      authorBalance = await this.authorBalanceModel.create({
        authorId: authorObjectId,
        balance: 0,
        totalSalesCount: 0,
        totalRevenueAzn: 0,
        totalEarningsAzn: 0,
        currency: 'AZN',
      });
    }

    // Query real orders for this author
    const paidOrders = await this.orderModel
      .find({ authorId: authorObjectId, status: 'PAID' })
      .exec();

    const realSalesCount = paidOrders.length;
    const realRevenue = paidOrders.reduce((acc, o) => acc + (o.amount || 0), 0);
    const realEarnings = paidOrders.reduce(
      (acc, o) => acc + (o.authorEarning || (o.amount || 0) * 0.8),
      0,
    );

    // Update author balance with accurate aggregates if needed
    const availableBalance = Math.max(authorBalance.balance, realEarnings);
    const totalEarnings = Math.max(authorBalance.totalEarningsAzn, realEarnings);

    // Project counts by status
    const [
      totalProjects,
      draftProjects,
      submittedProjects,
      approvedProjects,
      rejectedProjects,
    ] = await Promise.all([
      this.projectModel.countDocuments({ authorId: authorObjectId }),
      this.projectModel.countDocuments({ authorId: authorObjectId, status: 'DRAFT' }),
      this.projectModel.countDocuments({ authorId: authorObjectId, status: 'SUBMITTED' }),
      this.projectModel.countDocuments({ authorId: authorObjectId, status: 'APPROVED' }),
      this.projectModel.countDocuments({ authorId: authorObjectId, status: 'REJECTED' }),
    ]);

    const approvedList = await this.projectModel
      .find({ authorId: authorObjectId, status: 'APPROVED' })
      .select('rating')
      .exec();

    const averageRating =
      approvedList.length > 0
        ? Number(
            (
              approvedList.reduce((acc, p) => acc + (p.rating || 0), 0) /
              approvedList.length
            ).toFixed(1),
          )
        : 5.0;

    const recentProjects = await this.projectModel
      .find({ authorId: authorObjectId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('categoryId', 'name slug icon')
      .exec();

    const statistics = {
      totalSales: realSalesCount || authorBalance.totalSalesCount,
      totalRevenue: realRevenue || authorBalance.totalRevenueAzn,
      totalProjects,
      draftProjects,
      submittedProjects,
      approvedProjects,
      rejectedProjects,
      averageRating,
    };

    return {
      balance: {
        totalEarnings,
        availableBalance,
        pendingClearance: 0.0,
        currency: 'AZN' as const,
      },
      stats: statistics,
      statistics,
      projects: recentProjects,
    };
  }

  async getMyProjects(
    authorId: string | Types.ObjectId,
    query: QueryAuthorProjectsDto,
  ) {
    const authorObjectId = new Types.ObjectId(authorId.toString());
    const filter: Record<string, any> = { authorId: authorObjectId };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.q) {
      filter.title = { $regex: query.q, $options: 'i' };
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'name slug icon')
        .populate('technologies', 'name slug icon')
        .exec(),
      this.projectModel.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getApplications(query: { status?: string; page?: number; limit?: number }) {
    const filter: Record<string, any> = {};
    if (query.status) {
      filter.status = query.status;
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.authorApplicationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName email role createdAt')
        .exec(),
      this.authorApplicationModel.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async reviewApplication(
    applicationId: string,
    reviewerId: string | Types.ObjectId,
    dto: ReviewAuthorApplicationDto,
  ): Promise<AuthorApplicationDocument> {
    if (!Types.ObjectId.isValid(applicationId)) {
      throw new NotFoundException('Məlumat tapılmadı');
    }

    const appObjectId = new Types.ObjectId(applicationId);
    const application = await this.authorApplicationModel.findById(appObjectId);

    if (!application) {
      throw new NotFoundException('Məlumat tapılmadı');
    }

    const user = await this.userModel.findById(application.userId);

    if (dto.action === 'APPROVE') {
      if (user?.role === 'AUTHOR' && application.status === 'APPROVED') {
        throw new BadRequestException('Siz artıq təsdiqlənmiş müəllifsiniz');
      }

      application.status = 'APPROVED';
      application.reviewerId = new Types.ObjectId(reviewerId.toString());
      application.adminNotes = dto.adminNotes || 'Müəllif təsdiqləndi';
      application.reviewedAt = new Date();
      await application.save();

      if (user) {
        user.role = 'AUTHOR';
        await user.save();
      }

      // Ensure AuthorBalance exists
      await this.authorBalanceModel.findOneAndUpdate(
        { authorId: application.userId },
        {
          $setOnInsert: {
            authorId: application.userId,
            balance: 0,
            totalSalesCount: 0,
            totalRevenueAzn: 0,
            totalEarningsAzn: 0,
            currency: 'AZN',
          },
        },
        { upsert: true, new: true },
      );
    } else {
      application.status = 'REJECTED';
      application.reviewerId = new Types.ObjectId(reviewerId.toString());
      application.adminNotes = dto.adminNotes || dto.rejectionReason || 'Müraciət rədd edildi';
      application.rejectionReason = dto.rejectionReason || dto.adminNotes || 'Müraciət rədd edildi';
      application.reviewedAt = new Date();
      await application.save();
    }
    const appObj: any = application.toJSON ? application.toJSON() : { ...application };
    if (user) {
      appObj.user = {
        _id: user._id.toString(),
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      };
    }
    return appObj;
  }
}
