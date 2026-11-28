import { Injectable, OnModuleInit, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { hashPassword } from '../auth/utils/crypto.util';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    try {
      const adminEmail = process.env.FEEDLAB_ADMIN_EMAIL || 'admin@feedlab.az';
      const adminPassword = process.env.FEEDLAB_ADMIN_PASSWORD || 'Admin123!';
      const existingAdmin = await this.findByEmail(adminEmail);
      if (!existingAdmin) {
        const passwordHash = await hashPassword(adminPassword);
        await this.userModel.create({
          email: adminEmail,
          passwordHash,
          fullName: 'Platform Admin',
          role: 'ADMIN',
          isActive: true,
          isEmailVerified: true,
        });
        this.logger.log(`Initialized default platform admin (${adminEmail})`);
      }

      const authorEmail = process.env.FEEDLAB_AUTHOR_EMAIL || 'author@feedlab.az';
      const authorPassword = process.env.FEEDLAB_AUTHOR_PASSWORD || 'Author123!';
      const existingAuthor = await this.findByEmail(authorEmail);
      if (!existingAuthor) {
        const authorPasswordHash = await hashPassword(authorPassword);
        await this.userModel.create({
          email: authorEmail,
          passwordHash: authorPasswordHash,
          fullName: 'Fuad Əhmədov',
          role: 'AUTHOR',
          isActive: true,
          isEmailVerified: true,
        });
        this.logger.log(`Initialized default platform author (${authorEmail})`);
      }
    } catch (err: any) {
      this.logger.warn(`Admin initialization check skipped: ${err?.message || err}`);
    }
  }

  async create(userData: {
    email: string;
    passwordHash: string;
    fullName: string;
    role?: UserRole;
  }): Promise<UserDocument> {
    return this.userModel.create(userData);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async updateRefreshToken(
    userId: string | Types.ObjectId,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshTokenHash }).exec();
  }

  async updateResetPasswordToken(
    userId: string | Types.ObjectId,
    resetPasswordToken: string | null,
    resetPasswordExpires: Date | null,
  ): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        resetPasswordToken,
        resetPasswordExpires,
      })
      .exec();
  }

  async updatePassword(
    userId: string | Types.ObjectId,
    passwordHash: string,
  ): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        refreshTokenHash: null,
      })
      .exec();
  }

  async findByResetToken(tokenHash: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        resetPasswordToken: tokenHash,
        resetPasswordExpires: { $gt: new Date() },
      })
      .exec();
  }

  async findAll(query: { search?: string; role?: UserRole; isActive?: boolean; page?: number; limit?: number }) {
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
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateRole(userId: string | Types.ObjectId, role: UserRole): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }
    user.role = role;
    await user.save();
    return user;
  }

  async updateStatus(userId: string | Types.ObjectId, isActive: boolean): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }
    user.isActive = isActive;
    await user.save();
    return user;
  }
}
